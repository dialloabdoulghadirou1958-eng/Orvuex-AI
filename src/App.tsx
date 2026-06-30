/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { MainPanel } from './components/MainPanel';
import { SettingsView } from './components/SettingsView';
import { HistorySidebar } from './components/HistorySidebar';
import { AuthScreen } from './components/AuthScreen';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { ApiKeys, ProviderId, Conversation, Message } from './types';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('orvuex_is_guest') === 'true';
  });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<'chat' | 'settings'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Handle popup window communication for OAuth completion
  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. If this is a popup window, watch auth state to close itself and notify opener
      if (window.opener) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            try {
              if (window.opener && typeof window.opener.postMessage === 'function') {
                window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => {
                window.close();
              }, 150);
            } catch (e) {
              console.error('Error in popup auth notification:', e);
            }
          }
        });

        // Check immediately in case session is already restored
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            try {
              if (window.opener && typeof window.opener.postMessage === 'function') {
                window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => {
                window.close();
              }, 150);
            } catch (e) {}
          }
        });

        return () => subscription.unsubscribe();
      }

      // 2. If this is the main window, listen for messages from the auth popup
      const handleMessage = (event: MessageEvent) => {
        const origin = event.origin;
        const currentOrigin = window.location.origin;
        // Accept messages from same origin, same run.app, vercel.app, or localhost origins
        if (
          origin !== currentOrigin &&
          !origin.endsWith('.run.app') &&
          !origin.endsWith('.vercel.app') &&
          !origin.includes('localhost') &&
          !origin.includes('127.0.0.1')
        ) {
          return;
        }

        if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              setSession(session);
              setIsGuest(false);
            }
          });
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session || null);
        if (session) {
          setIsGuest(false);
          localStorage.removeItem('orvuex_is_guest');
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session || null);
        if (session) {
          setIsGuest(false);
          localStorage.removeItem('orvuex_is_guest');
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return; // Wait until initial auth check finishes!

    if (session && isSupabaseConfigured) {
      // Load user-specific cached data from localStorage immediately for fast, robust restore
      const userConvsKey = `orvuex_convs_${session.user.id}`;
      const userKeysKey = `orvuex_keys_${session.user.id}`;
      
      const cachedKeys = localStorage.getItem(userKeysKey);
      if (cachedKeys) {
        try {
          setApiKeys(JSON.parse(cachedKeys));
        } catch (e) {}
      }
      
      let hasCachedConvs = false;
      const cachedConvs = localStorage.getItem(userConvsKey);
      if (cachedConvs) {
        try {
          const parsed = JSON.parse(cachedConvs);
          setConversations(parsed);
          if (parsed.length > 0) {
            hasCachedConvs = true;
            if (!currentConversationId) {
              setCurrentConversationId(parsed[0].id);
            }
          }
        } catch (e) {}
      }
      
      // If we successfully loaded conversations from local storage, disable the loading screen immediately
      // so the user can see their history and start writing without waiting for the slow network sync!
      if (hasCachedConvs) {
        setLoadingInitial(false);
      }
      
      // Background fetch to sync with Supabase cloud database
      fetchInitialData(session.user.id);
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

  const fetchInitialData = async (userId?: string) => {
    // If we already loaded cached local conversations, don't show full-screen loader
    setLoadingInitial(prev => prev && conversations.length === 0);
    try {
      // Fetch API Keys
      const { data: keysData, error: keysError } = await supabase
        .from('user_api_keys')
        .select('provider_id, api_key');
      
      if (keysData && !keysError) {
        const keysMap: ApiKeys = {};
        keysData.forEach((k: any) => {
          keysMap[k.provider_id as ProviderId] = k.api_key;
        });
        setApiKeys(keysMap);
        if (userId) {
          localStorage.setItem(`orvuex_keys_${userId}`, JSON.stringify(keysMap));
        }
      }

      // Fetch Conversations (without .order to avoid db crashes when column sorting fails)
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*');

      if (convError) {
        console.error('Error fetching conversations from Supabase:', convError);
      }

      if (convData && !convError) {
        setConversations(prev => {
          // Fallback to avoid race condition if local state hasn't resolved yet
          let baseConvs = prev;
          if (baseConvs.length === 0 && userId) {
            const cached = localStorage.getItem(`orvuex_convs_${userId}`);
            if (cached) {
              try {
                baseConvs = JSON.parse(cached);
              } catch (e) {}
            }
          }

          // 1. Map conversations fetched from Supabase cloud, keeping messages we already loaded locally
          const mappedCloud = convData.map((c: any) => {
            const existing = baseConvs.find(ec => ec.id === c.id);
            return {
              id: c.id,
              title: c.title,
              messages: (existing && existing.messages && existing.messages.length > 0) ? existing.messages : [],
              updatedAt: c.updated_at ? new Date(c.updated_at).getTime() : Date.now()
            };
          });

          // 2. Identify local-only conversations (exist in local cache but not in cloud data)
          // We must NEVER delete local-only conversations when syncing! This is crucial for offline-first APK/WebView usage.
          const localOnly = baseConvs.filter(local => !convData.some((c: any) => c.id === local.id));

          // 3. Combine both cloud-synced and local-only conversations
          const combined = [...mappedCloud, ...localOnly];
          
          // 4. Sort descending by updatedAt (most recent first)
          combined.sort((a, b) => b.updatedAt - a.updatedAt);
          
          if (userId) {
            localStorage.setItem(`orvuex_convs_${userId}`, JSON.stringify(combined));
          }
          
          // Auto-select first conversation if none selected
          if (combined.length > 0 && !currentConversationId) {
            setCurrentConversationId(combined[0].id);
          }
          
          return combined;
        });
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

    if (session?.user && isSupabaseConfigured) {
      localStorage.setItem(`orvuex_keys_${session.user.id}`, JSON.stringify(newKeys));
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
      } else {
        localStorage.setItem(`orvuex_keys_${session.user.id}`, JSON.stringify(newKeys));
      }
      return newKeys;
    });

    if (session?.user && isSupabaseConfigured) {
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
      } else {
        localStorage.setItem(`orvuex_convs_${session.user.id}`, JSON.stringify(filtered));
      }
      return filtered;
    });
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }

    if (session?.user && isSupabaseConfigured) {
      await supabase.from('conversations').delete().match({ id });
    }
  };

  const handleDeleteAllConversations = async () => {
    setConversations([]);
    setCurrentConversationId(null);
    if (!session?.user) {
      localStorage.removeItem('orvuex_guest_convs');
    } else {
      localStorage.setItem(`orvuex_convs_${session.user.id}`, JSON.stringify([]));
      if (isSupabaseConfigured) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from('conversations').delete().eq('user_id', userData.user.id);
        }
      }
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
      } else {
        localStorage.setItem(`orvuex_convs_${session.user.id}`, JSON.stringify(newConvs));
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
    return (
      <AuthScreen 
        onContinueAsGuest={() => {
          setIsGuest(true);
          localStorage.setItem('orvuex_is_guest', 'true');
        }} 
      />
    );
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
            onDeleteAllConversations={handleDeleteAllConversations}
            userEmail={session?.user?.email}
            userName={session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name}
            userAvatar={session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture}
            onSignUpClick={() => {
              setIsGuest(false);
              localStorage.removeItem('orvuex_is_guest');
            }}
          />
          <MainPanel 
            apiKeys={apiKeys} 
            onOpenSettings={() => setCurrentView('settings')}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            isSidebarOpen={isSidebarOpen}
            currentConversation={currentConversation}
            onUpdateConversation={handleUpdateConversation}
            onNewChat={handleNewChat}
          />
        </>
      )}
    </div>
  );
}
