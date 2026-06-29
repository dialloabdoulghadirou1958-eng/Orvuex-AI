/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MainPanel } from './components/MainPanel';
import { SettingsView } from './components/SettingsView';
import { HistorySidebar } from './components/HistorySidebar';
import { AuthScreen } from './components/AuthScreen';
import { supabase } from './lib/supabase';
import { ApiKeys, ProviderId, Conversation, Message } from './types';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setIsGuest(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setIsGuest(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchInitialData();
    } else {
      // Load from localStorage for guests
      const localKeys = localStorage.getItem('orvuex_guest_keys');
      if (localKeys) {
        try {
          setApiKeys(JSON.parse(localKeys));
        } catch (e) {}
      }
      
      const localConvs = localStorage.getItem('orvuex_guest_convs');
      if (localConvs) {
        try {
          const parsed = JSON.parse(localConvs);
          setConversations(parsed);
          if (parsed.length > 0 && !currentConversationId) {
            setCurrentConversationId(parsed[0].id);
          }
        } catch (e) {}
      }
      
      setLoadingInitial(false);
    }
  }, [session]);

  const fetchInitialData = async () => {
    setLoadingInitial(true);
    try {
      // Fetch API Keys
      const { data: keysData } = await supabase
        .from('user_api_keys')
        .select('provider_id, api_key');
      
      if (keysData) {
        const keysMap: ApiKeys = {};
        keysData.forEach((k: any) => {
          keysMap[k.provider_id as ProviderId] = k.api_key;
        });
        setApiKeys(keysMap);
      }

      // Fetch Conversations
      const { data: convData } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (convData) {
        // Map to our Conversation type, but without messages yet
        const mappedConv = convData.map((c: any) => ({
          id: c.id,
          title: c.title,
          messages: [],
          updatedAt: new Date(c.updated_at).getTime()
        }));
        setConversations(mappedConv);

        if (mappedConv.length > 0 && !currentConversationId) {
          setCurrentConversationId(mappedConv[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching initial data', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const setApiKey = async (providerId: ProviderId, key: string) => {
    const newKeys = { ...apiKeys, [providerId]: key };
    setApiKeys(newKeys);

    if (session?.user) {
      const { error } = await supabase
        .from('user_api_keys')
        .upsert(
          { user_id: session.user.id, provider_id: providerId, api_key: key },
          { onConflict: 'user_id, provider_id' }
        );
        
      if (error) {
         console.error('Error saving API key', error);
      }
    } else {
      localStorage.setItem('orvuex_guest_keys', JSON.stringify(newKeys));
    }
  };

  const removeApiKey = async (providerId: ProviderId) => {
    setApiKeys((prev) => {
      const newKeys = { ...prev };
      delete newKeys[providerId];
      if (!session?.user) {
        localStorage.setItem('orvuex_guest_keys', JSON.stringify(newKeys));
      }
      return newKeys;
    });

    if (session?.user) {
      await supabase
        .from('user_api_keys')
        .delete()
        .match({ user_id: session.user.id, provider_id: providerId });
    }
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (!session?.user) {
        localStorage.setItem('orvuex_guest_convs', JSON.stringify(filtered));
      }
      return filtered;
    });
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
    if (session?.user) {
      await supabase.from('conversations').delete().match({ id });
    }
  };

  const handleUpdateConversation = (conversation: Conversation) => {
    setConversations(prev => {
      const exists = prev.find(c => c.id === conversation.id);
      let newConvs;
      if (exists) {
        newConvs = prev.map(c => c.id === conversation.id ? conversation : c).sort((a, b) => b.updatedAt - a.updatedAt);
      } else {
        newConvs = [conversation, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
      }
      if (!session?.user) {
        localStorage.setItem('orvuex_guest_convs', JSON.stringify(newConvs));
      }
      return newConvs;
    });
    if (currentConversationId !== conversation.id) {
      setCurrentConversationId(conversation.id);
    }
  };

  if (loadingInitial) {
    return <div className="flex h-[100dvh] w-full items-center justify-center bg-zinc-950 text-white">Chargement...</div>;
  }

  if (!session && !isGuest) {
    return <AuthScreen onContinueAsGuest={() => setIsGuest(true)} />;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {currentView === 'settings' ? (
        <SettingsView 
          apiKeys={apiKeys} 
          setApiKey={setApiKey} 
          removeApiKey={removeApiKey}
          onClose={() => setCurrentView('chat')}
        />
      ) : (
        <>
          <HistorySidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            userEmail={session?.user?.email}
            onSignUpClick={() => setIsGuest(false)}
          />
          <MainPanel 
            apiKeys={apiKeys} 
            onOpenSettings={() => setCurrentView('settings')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            currentConversation={currentConversation}
            onUpdateConversation={handleUpdateConversation}
            onNewChat={handleNewChat}
          />
        </>
      )}
    </div>
  );
}
