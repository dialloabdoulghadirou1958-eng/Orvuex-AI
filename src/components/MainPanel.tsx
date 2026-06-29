import { useState, useRef, useEffect } from 'react';
import { Menu, Settings, SquarePen, Plus, ArrowUp, Copy, ThumbsUp, ThumbsDown, Share, ChevronDown } from 'lucide-react';
import { ApiKeys, ProviderId, Message, Conversation } from '../types';
import { AI_PROVIDERS } from '../lib/providers';
import { MessageContent } from './MessageContent';
import { supabase } from '../lib/supabase';
import { nativeFetch } from '../lib/nativeFetch';

interface MainPanelProps {
  apiKeys: ApiKeys;
  onOpenSettings: () => void;
  onOpenSidebar: () => void;
  currentConversation: Conversation | null;
  onUpdateConversation: (conv: Conversation) => void;
  onNewChat: () => void;
}

export function MainPanel({ 
  apiKeys, 
  onOpenSettings, 
  onOpenSidebar, 
  currentConversation,
  onUpdateConversation,
  onNewChat
}: MainPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  
  const configuredProviders = AI_PROVIDERS.filter(p => !!apiKeys[p.id]);
  const [activeProviderId, setActiveProviderId] = useState<ProviderId | null>(
    configuredProviders.length > 0 ? configuredProviders[0].id : null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages when current conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (currentConversation) {
        if (currentConversation.messages.length === 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setIsFetchingMessages(true);
            const { data, error } = await supabase
              .from('messages')
              .select('id, role, content, created_at')
              .eq('conversation_id', currentConversation.id)
              .order('created_at', { ascending: true });
              
            if (!error && data) {
              const fetchedMessages: Message[] = data.map(m => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content
              }));
              setMessages(fetchedMessages);
              onUpdateConversation({
                ...currentConversation,
                messages: fetchedMessages
              });
            }
            setIsFetchingMessages(false);
          } else {
            setMessages([]);
          }
        } else {
          setMessages(currentConversation.messages);
        }
      } else {
        setMessages([]);
      }
    }
    loadMessages();
  }, [currentConversation?.id]);

  useEffect(() => {
    if (!activeProviderId && configuredProviders.length > 0) {
      setActiveProviderId(configuredProviders[0].id);
    } else if (activeProviderId && !configuredProviders.find(p => p.id === activeProviderId)) {
      setActiveProviderId(configuredProviders.length > 0 ? configuredProviders[0].id : null);
    }
  }, [apiKeys, activeProviderId, configuredProviders]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeProvider = AI_PROVIDERS.find(p => p.id === activeProviderId);

  const updateConversationState = (newMessages: Message[]) => {
    setMessages(newMessages);
    
    // Auto-save to conversation
    const title = newMessages.find(m => m.role === 'user')?.content.slice(0, 40) + '...' || 'Nouvelle discussion';
    const convId = currentConversation?.id || Date.now().toString();
    
    onUpdateConversation({
      id: convId,
      title: currentConversation?.title && currentConversation.title !== 'Nouvelle discussion' ? currentConversation.title : title,
      messages: newMessages,
      updatedAt: Date.now()
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !activeProvider) return;
    const apiKey = apiKeys[activeProvider.id];
    if (!apiKey) return;

    const { data: { session } } = await supabase.auth.getSession();
    const isGuest = !session?.user;
    const userId = session?.user?.id;

    // Create or get conversation ID
    const title = inputValue.trim().slice(0, 40) + '...';
    let convId = currentConversation?.id;
    let isNewConv = false;
    
    if (!convId) {
      convId = Date.now().toString();
      isNewConv = true;
      if (!isGuest && userId) {
        // Insert new conversation in DB
        await supabase.from('conversations').insert({
          id: convId,
          user_id: userId,
          title: title,
          updated_at: new Date().toISOString()
        });
      }
    }

    const userMsgId = Date.now().toString();
    const userContent = inputValue.trim();
    const userMsg: Message = { id: userMsgId, role: 'user', content: userContent };
    const initialMessages = [...messages, userMsg];
    
    // Update local state and input
    setMessages(initialMessages);
    setInputValue('');
    setIsLoading(true);

    if (isNewConv) {
       onUpdateConversation({
         id: convId!,
         title: title,
         messages: initialMessages,
         updatedAt: Date.now()
       });
    } else {
       onUpdateConversation({
         ...currentConversation!,
         messages: initialMessages,
         updatedAt: Date.now()
       });
       if (!isGuest && userId) {
         await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId!);
       }
    }

    if (!isGuest && userId) {
      // Insert user message to DB
      await supabase.from('messages').insert({
        id: userMsgId,
        conversation_id: convId!,
        user_id: userId,
        role: 'user',
        content: userContent
      });
    }

    const aiMsgId = (Date.now() + 1).toString();
    let currentMessages = [...initialMessages, { id: aiMsgId, role: 'assistant' as const, content: '' }];
    setMessages(currentMessages);

    try {
      let finalAiContent = '';
      if (activeProvider.id === 'gemini') {
        const res = await nativeFetch(`${activeProvider.baseUrl}/models/${activeProvider.defaultModel}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: initialMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          })
        });

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Erreur API Gemini (${res.status}): ${errText}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (!reader) throw new Error("Flux introuvable");

        let aiContent = '';
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const chunk = JSON.parse(trimmedLine.slice(6));
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  aiContent += text;
                  currentMessages = currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m);
                  setMessages(currentMessages);
                }
              } catch (e) {
                console.warn("Erreur de parsing JSON sur le stream Gemini:", e, trimmedLine);
              }
            }
          }
        }
        finalAiContent = aiContent;
      } else {
        const res = await nativeFetch(`${activeProvider.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: activeProvider.defaultModel,
            messages: initialMessages.map(m => ({ role: m.role, content: m.content })),
            stream: true
          })
        });

        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Erreur API (${res.status}): ${errText}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (!reader) throw new Error("Flux introuvable");

        let aiContent = '';
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const text = data.choices[0]?.delta?.content || '';
                if (text) {
                  aiContent += text;
                  currentMessages = currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m);
                  setMessages(currentMessages);
                }
              } catch (e) {
                console.warn("Erreur de parsing JSON sur le stream:", e, trimmedLine);
              }
            }
          }
        }
        finalAiContent = aiContent;
      }
      
      // Save final state to DB and update parent
      if (!isGuest && userId) {
        await supabase.from('messages').insert({
          id: aiMsgId,
          conversation_id: convId!,
          user_id: userId,
          role: 'assistant',
          content: finalAiContent
        });
      }

      onUpdateConversation({
        id: convId!,
        title: isNewConv ? title : currentConversation!.title,
        messages: currentMessages,
        updatedAt: Date.now()
      });
      
    } catch (error: any) {
      console.error(error);
      const errorText = `Erreur: ${error.message}`;
      currentMessages = currentMessages.map(m => m.id === aiMsgId ? { ...m, content: errorText } : m);
      setMessages(currentMessages);
      
      if (!isGuest && userId) {
        await supabase.from('messages').insert({
          id: aiMsgId,
          conversation_id: convId!,
          user_id: userId,
          role: 'assistant',
          content: errorText
        });
      }

      onUpdateConversation({
        id: convId!,
        title: isNewConv ? title : currentConversation!.title,
        messages: currentMessages,
        updatedAt: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-black relative text-zinc-100">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-zinc-900/50">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex justify-center">
          {configuredProviders.length > 0 ? (
            <div className="relative flex items-center group cursor-pointer hover:bg-zinc-900 pl-2 pr-3 py-1.5 rounded-lg transition-colors">
              {activeProvider && (
                <div className="w-5 h-5 mr-2 flex items-center justify-center bg-zinc-950 rounded-full border border-zinc-800 p-0.5">
                  <img 
                    src={`/icons/${activeProvider.id}.png`} 
                    alt={activeProvider.name} 
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <select 
                className="bg-transparent text-zinc-200 text-sm font-medium focus:outline-none cursor-pointer appearance-none pr-6 z-10"
                value={activeProviderId || ''}
                onChange={(e) => setActiveProviderId(e.target.value as ProviderId)}
              >
                {configuredProviders.map(p => (
                  <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-zinc-500 text-sm font-medium">Aucun modèle</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={onNewChat}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors"
            title="Nouvelle discussion"
          >
            <SquarePen className="w-5 h-5" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors"
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-3xl mx-auto space-y-8 pb-4">
          {isFetchingMessages ? (
            <div className="flex justify-center py-10">
               <span className="animate-pulse text-zinc-500">Chargement des messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <h2 className="text-2xl font-semibold text-zinc-300 tracking-tight">orvuex ai</h2>
              <p className="text-zinc-500 text-sm max-w-sm">
                {configuredProviders.length === 0 
                  ? "Veuillez configurer au moins une clé API dans les paramètres pour commencer."
                  : "Prêt à discuter. Sélectionnez un modèle et posez votre question."}
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-zinc-800 text-zinc-100 px-5 py-3 rounded-3xl max-w-[85%] text-[15px] leading-relaxed break-words">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-zinc-100 w-full max-w-3xl space-y-2">
                    {msg.content ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <span className="animate-pulse">● ● ●</span>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-zinc-500">
                      <button className="hover:text-zinc-300 transition-colors p-1"><Copy className="w-4 h-4" /></button>
                      <button className="hover:text-zinc-300 transition-colors p-1"><ThumbsUp className="w-4 h-4" /></button>
                      <button className="hover:text-zinc-300 transition-colors p-1"><ThumbsDown className="w-4 h-4" /></button>
                      <button className="hover:text-zinc-300 transition-colors p-1"><Share className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black w-full pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="max-w-3xl mx-auto flex items-end gap-3 bg-zinc-900 rounded-[28px] pl-3 pr-2 py-2 border border-zinc-800/50">
          <button className="p-2 mb-0.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-full transition-colors shrink-0">
            <Plus className="w-5 h-5" />
          </button>
          
          <div className="flex-1 flex items-center min-h-[44px]">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={activeProvider ? `Répondre à ${activeProvider.name}` : "Configurez une clé API d'abord..."}
              className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-[15px] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={!activeProvider || isLoading}
            />
          </div>

          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !activeProvider || isLoading}
            className={`p-2.5 mb-0.5 rounded-full transition-colors flex items-center justify-center shrink-0 ${
              inputValue.trim() && !isLoading 
                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </main>
  );
}
