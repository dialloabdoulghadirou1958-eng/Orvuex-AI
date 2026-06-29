import { useState, useRef, useEffect } from 'react';
import { Menu, Settings, SquarePen, Plus, ArrowUp, Copy, ThumbsUp, ThumbsDown, Share, ChevronDown } from 'lucide-react';
import { ApiKeys, ProviderId, Message, Conversation } from '../types';
import { AI_PROVIDERS } from '../lib/providers';
import { MessageContent } from './MessageContent';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchModels() {
      if (!activeProviderId) {
        setAvailableModels([]);
        setSelectedModel('');
        return;
      }
      const provider = AI_PROVIDERS.find(p => p.id === activeProviderId);
      const apiKey = apiKeys[activeProviderId];
      if (!provider || !apiKey) return;

      setIsFetchingModels(true);
      try {
        if (provider.id === 'gemini') {
          const res = await nativeFetch(`${provider.baseUrl}/models?key=${apiKey}`);
          if (res.ok) {
            const data = await res.json();
            const models = (data.models || []).map((m: any) => ({
              id: m.name.replace('models/', ''),
              name: m.displayName || m.name.replace('models/', '')
            }));
            setAvailableModels(models);
            if (models.length > 0) setSelectedModel(models[0].id);
          }
        } else {
          const res = await nativeFetch(`${provider.baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          if (res.ok) {
            const data = await res.json();
            const models = (data.data || []).map((m: any) => ({
              id: m.id,
              name: m.id
            }));
            setAvailableModels(models);
            if (models.length > 0) setSelectedModel(models[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch models", err);
        setAvailableModels([]);
        setSelectedModel(provider.defaultModel);
      } finally {
        setIsFetchingModels(false);
      }
    }
    fetchModels();
  }, [activeProviderId, apiKeys]);

  // Sync messages when current conversation changes
  useEffect(() => {
    async function loadMessages() {
      if (currentConversation) {
        if (currentConversation.messages.length === 0 && isSupabaseConfigured) {
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

    let session = null;
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      session = data.session;
    }
    const isGuest = !session?.user;
    const userId = session?.user?.id;

    // Create or get conversation ID
    const title = inputValue.trim().slice(0, 40) + '...';
    let convId = currentConversation?.id;
    let isNewConv = false;
    
    if (!convId) {
      convId = Date.now().toString();
      isNewConv = true;
      if (!isGuest && userId && isSupabaseConfigured) {
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
       if (!isGuest && userId && isSupabaseConfigured) {
         await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId!);
       }
    } else {
       onUpdateConversation({
         ...currentConversation!,
         messages: initialMessages,
         updatedAt: Date.now()
       });
    }

    if (!isGuest && userId && isSupabaseConfigured) {
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
      const modelToUse = selectedModel || activeProvider.defaultModel;
      if (activeProvider.id === 'gemini') {
        const res = await nativeFetch(`${activeProvider.baseUrl}/models/${modelToUse}:streamGenerateContent?alt=sse&key=${apiKey}`, {
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
            model: modelToUse,
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
      
      // Save final state to update parent
      if (!isGuest && userId && isSupabaseConfigured) {
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
      
      if (!isGuest && userId && isSupabaseConfigured) {
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

  const modelSelectionUI = (
    <div className="flex flex-wrap justify-center items-center gap-1">
      {configuredProviders.length > 0 ? (
        <>
          <div className="relative flex items-center group cursor-pointer hover:bg-zinc-900 pl-2 pr-3 py-1 rounded-lg transition-colors border border-transparent hover:border-zinc-800/50">
            {activeProvider && (
              <div className="w-5 h-5 mr-2 flex items-center justify-center bg-zinc-950 rounded-full border border-zinc-800 p-0.5 shrink-0">
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
              className="bg-transparent text-zinc-200 text-sm font-medium focus:outline-none cursor-pointer appearance-none pr-5 z-10"
              value={activeProviderId || ''}
              onChange={(e) => setActiveProviderId(e.target.value as ProviderId)}
            >
              {configuredProviders.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-1 pointer-events-none" />
          </div>

          <div className="relative flex items-center group cursor-pointer hover:bg-zinc-900 pl-2 pr-3 py-1 rounded-lg transition-colors border border-transparent hover:border-zinc-800/50">
            <select 
              className="bg-transparent text-zinc-400 text-sm font-medium focus:outline-none cursor-pointer appearance-none pr-5 z-10 max-w-[150px] sm:max-w-[200px] truncate"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isFetchingModels || availableModels.length === 0}
            >
              {isFetchingModels ? (
                <option value={selectedModel}>Chargement...</option>
              ) : availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>
                ))
              ) : (
                <option value={selectedModel || activeProvider?.defaultModel}>
                  {selectedModel || activeProvider?.defaultModel || 'Modèle par défaut'}
                </option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-600 absolute right-1 pointer-events-none" />
          </div>
        </>
      ) : (
        <button 
          onClick={onOpenSettings}
          className="text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-900 border border-zinc-800 flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Aucun modèle (Ajouter une clé)
        </button>
      )}
    </div>
  );

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
          {messages.length > 0 && modelSelectionUI}
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
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
              <h2 className="text-3xl font-semibold text-zinc-200 tracking-tight">orvuex ai</h2>
              {modelSelectionUI}
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-zinc-800 text-zinc-100 px-5 py-3 rounded-3xl max-w-[85%] text-[15px] leading-relaxed break-words">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-zinc-100 w-full max-w-3xl space-y-2 min-w-0 overflow-hidden">
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
