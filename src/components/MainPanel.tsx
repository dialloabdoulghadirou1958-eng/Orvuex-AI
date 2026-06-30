import { useState, useRef, useEffect } from 'react';
import { Menu, Settings, SquarePen, Plus, ArrowUp, Copy, ThumbsUp, ThumbsDown, Share, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiKeys, ProviderId, Message, Conversation } from '../types';
import { AI_PROVIDERS } from '../lib/providers';
import { MessageContent } from './MessageContent';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { nativeFetch } from '../lib/nativeFetch';

function Dropdown({ options, value, onChange, placeholder, disabled, loading, icon, label, position = 'bottom', align = 'center', maxTextWidth }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o: any) => o.id === value);

  const alignClasses = 
    align === 'left' 
      ? 'left-0 origin-top-left' 
      : align === 'right' 
      ? 'right-0 origin-top-right' 
      : 'left-1/2 -translate-x-1/2 origin-top';

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-1 sm:gap-2 group cursor-pointer hover:bg-zinc-800 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all border border-zinc-800/50 hover:border-zinc-700 bg-zinc-900 shadow-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {icon && (
          <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-zinc-950 rounded-full border border-zinc-800 p-0.5 shrink-0">
             <img src={icon} alt="" className="w-full h-full object-contain rounded-full" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
          </div>
        )}
        <span 
          className="text-xs sm:text-sm font-medium text-zinc-200 truncate"
          style={maxTextWidth ? { maxWidth: `${maxTextWidth}px` } : { maxWidth: '150px' }}
        >
          {loading ? 'Chargement...' : selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? -15 : 15, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: position === 'bottom' ? -10 : 10, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${position === 'bottom' ? 'top-full mt-3' : 'bottom-full mb-3'} ${alignClasses} w-[280px] max-h-[60vh] overflow-y-auto bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl z-50 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ring-1 ring-white/5`}
          >
            {label && <div className="px-5 py-3 text-[11px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50 mb-1">{label}</div>}
            <div className="flex flex-col p-1.5 gap-0.5">
              {options.map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${value === opt.id ? 'bg-indigo-500/10 text-indigo-300' : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100'}`}
                >
                  <span className="truncate pr-4 font-medium">{opt.name}</span>
                  {value === opt.id && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
            {options.length === 0 && !loading && (
              <div className="px-4 py-8 text-sm text-zinc-500 text-center">Aucune option</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatInput({ onSend, disabled, placeholder }: { onSend: (text: string) => void, disabled: boolean, placeholder: string }) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    onSend(inputValue);
    setInputValue('');
  };

  return (
    <div className="p-4 bg-black w-full pb-6 md:pb-8">
      <div className="max-w-3xl mx-auto flex items-end gap-3 bg-zinc-900/90 backdrop-blur-md rounded-[28px] pl-3 pr-2 py-2 border border-zinc-800 shadow-xl focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition-all">
        <button className="p-2.5 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors shrink-0 mb-0.5">
          <Plus className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex items-center min-h-[44px]">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-500 text-[15px] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={disabled}
          />
        </div>

        <button 
          onClick={handleSend}
          disabled={!inputValue.trim() || disabled}
          className={`p-2.5 mb-0.5 rounded-full transition-all flex items-center justify-center shrink-0 ${
            inputValue.trim() && !disabled 
              ? 'bg-zinc-100 text-black hover:bg-white scale-100 shadow-lg shadow-white/10' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed scale-95'
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface MainPanelProps {
  apiKeys: ApiKeys;
  onOpenSettings: () => void;
  onOpenSidebar: () => void;
  isSidebarOpen?: boolean;
  currentConversation: Conversation | null;
  onUpdateConversation: (conv: Conversation) => void;
  onNewChat: () => void;
}

export function MainPanel({ 
  apiKeys, 
  onOpenSettings, 
  onOpenSidebar, 
  isSidebarOpen = false,
  currentConversation,
  onUpdateConversation,
  onNewChat
}: MainPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
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
  const headerRef = useRef<HTMLElement>(null);
  const [maxLabelWidth, setMaxLabelWidth] = useState(80);

  useEffect(() => {
    if (!headerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        // Optimal calculation for each dropdown:
        // Subtract sidebar menu button (~40px), action buttons container (~80px),
        // and outer horizontal padding/margins (~24px) -> total non-dropdown static width = ~144px.
        // Subtract dropdown padding (32px), icons/spinners, chevrons, and gaps (~116px total)
        // Divide remaining space by 2 for both dropdowns
        const calculated = (width - 144 - 116) / 2;
        // Minimum label width 45px, maximum 150px
        setMaxLabelWidth(Math.max(45, Math.min(150, calculated)));
      }
    });

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

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

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeProvider) return;
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
    const title = text.trim().slice(0, 40) + '...';
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
    const userContent = text.trim();
    const userMsg: Message = { id: userMsgId, role: 'user', content: userContent };
    const initialMessages = [...messages, userMsg];
    
    // Update local state and input
    setMessages(initialMessages);
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
        let lastRenderTime = Date.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          let contentUpdated = false;
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const chunk = JSON.parse(trimmedLine.slice(6));
                const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  aiContent += text;
                  contentUpdated = true;
                }
              } catch (e) {
                console.warn("Erreur de parsing JSON sur le stream Gemini:", e, trimmedLine);
              }
            }
          }

          if (contentUpdated) {
            currentMessages = currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m);
            const now = Date.now();
            if (now - lastRenderTime > 40) {
              setMessages(currentMessages);
              lastRenderTime = now;
            }
          }
        }
        finalAiContent = aiContent;
        // Ensure final state is rendered
        setMessages(currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m));
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
        let lastRenderTime = Date.now();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          let contentUpdated = false;
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const text = data.choices[0]?.delta?.content || '';
                if (text) {
                  aiContent += text;
                  contentUpdated = true;
                }
              } catch (e) {
                console.warn("Erreur de parsing JSON sur le stream:", e, trimmedLine);
              }
            }
          }

          if (contentUpdated) {
            currentMessages = currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m);
            const now = Date.now();
            if (now - lastRenderTime > 40) {
              setMessages(currentMessages);
              lastRenderTime = now;
            }
          }
        }
        finalAiContent = aiContent;
        // Ensure final state is rendered
        setMessages(currentMessages.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m));
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
    <div className="flex justify-center items-center gap-1 sm:gap-2">
      {configuredProviders.length > 0 ? (
        <>
          <Dropdown
            options={configuredProviders}
            value={activeProviderId}
            onChange={(id: ProviderId) => setActiveProviderId(id)}
            placeholder="Sélectionner..."
            icon={activeProvider ? `/icons/${activeProvider.id}.png` : undefined}
            label="Fournisseurs"
            position="bottom"
            align="left"
            maxTextWidth={maxLabelWidth}
          />
          <Dropdown
            options={
              availableModels.length > 0 
                ? availableModels 
                : [{ id: selectedModel || activeProvider?.defaultModel || 'default', name: selectedModel || activeProvider?.defaultModel || 'Modèle par défaut' }]
            }
            value={selectedModel || activeProvider?.defaultModel || 'default'}
            onChange={setSelectedModel}
            placeholder="Modèle"
            loading={isFetchingModels}
            disabled={isFetchingModels || availableModels.length === 0}
            label="Modèles"
            position="bottom"
            align="right"
            maxTextWidth={maxLabelWidth}
          />
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
    <main className={`flex-1 flex flex-col h-full bg-black relative text-zinc-100 min-w-0 w-full transition-all duration-300 origin-right ${isSidebarOpen ? 'opacity-40 scale-[0.97] md:opacity-100 md:scale-100 filter brightness-[0.7] md:filter-none' : ''}`}>
      {/* Header */}
      <header ref={headerRef} className="h-14 flex items-center justify-between px-2 sm:px-4 sticky top-0 bg-black/80 backdrop-blur-md z-10 border-b border-zinc-900/50">
        <button 
          onClick={onOpenSidebar}
          className="p-2 -ml-1 sm:-ml-2 text-zinc-400 hover:text-zinc-100 rounded-lg transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex justify-center min-w-0 px-1 sm:px-2">
          {messages.length > 0 && modelSelectionUI}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-3xl mx-auto space-y-8 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
              <div className="w-36 h-36 flex items-center justify-center transition-transform duration-500 hover:scale-105">
                <img
                  src="/pwa-512x512.png"
                  alt="orvuex ai logo"
                  className="w-full h-full object-contain animate-fade-in"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-3xl font-bold text-zinc-100 tracking-tight">orvuex ai</h2>
              {modelSelectionUI}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const isAssistant = msg.role === 'assistant';
                const messageContent = (
                  <>
                    {msg.role === 'user' ? (
                      <div className="bg-zinc-800 text-zinc-100 px-5 py-3 rounded-3xl max-w-[85%] text-[15px] leading-relaxed break-words">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="text-zinc-100 w-full max-w-full md:max-w-3xl space-y-2 min-w-0">
                        {msg.content ? (
                          <MessageContent content={msg.content} isLast={index === messages.length - 1} isStreaming={isLoading} />
                        ) : (
                          <div className="flex items-center gap-1 text-zinc-400 h-6">
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} className="w-1.5 h-1.5 rounded-full bg-current" />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2, ease: "easeInOut" }} className="w-1.5 h-1.5 rounded-full bg-current" />
                            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4, ease: "easeInOut" }} className="w-1.5 h-1.5 rounded-full bg-current" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-4 text-zinc-500">
                          <button className="hover:text-zinc-300 transition-colors p-1"><Copy className="w-4 h-4" /></button>
                          <button className="hover:text-zinc-300 transition-colors p-1"><ThumbsUp className="w-4 h-4" /></button>
                          <button className="hover:text-zinc-300 transition-colors p-1"><ThumbsDown className="w-4 h-4" /></button>
                          <button className="hover:text-zinc-300 transition-colors p-1"><Share className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </>
                );

                return isAssistant ? (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`flex w-full min-w-0 justify-start`}
                  >
                    {messageContent}
                  </motion.div>
                ) : (
                  <div key={msg.id} className="flex w-full min-w-0 justify-end">
                    {messageContent}
                  </div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!activeProvider || isLoading}
        placeholder={activeProvider ? `Répondre à ${activeProvider.name}` : "Configurez une clé API d'abord..."}
      />
    </main>
  );
}
