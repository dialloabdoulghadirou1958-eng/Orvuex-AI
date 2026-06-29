import { ArrowLeft, Key, Trash2, CheckCircle2, LogOut } from 'lucide-react';
import { AI_PROVIDERS } from '../lib/providers';
import { ProviderId, ApiKeys } from '../types';
import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SettingsViewProps {
  apiKeys: ApiKeys;
  setApiKey: (providerId: ProviderId, key: string) => void;
  removeApiKey: (providerId: ProviderId) => void;
  onClose: () => void;
}

export function SettingsView({ apiKeys, setApiKey, removeApiKey, onClose }: SettingsViewProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('openai');
  const [inputValue, setInputValue] = useState('');

  const handleSave = () => {
    if (inputValue.trim()) {
      setApiKey(selectedProvider, inputValue.trim());
      setInputValue('');
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  const currentProviderInfo = AI_PROVIDERS.find(p => p.id === selectedProvider);
  const hasKey = !!apiKeys[selectedProvider];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 w-full overflow-y-auto">
      <header className="sticky top-0 z-10 h-14 flex items-center px-4 md:px-6 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mr-auto"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour au chat</span>
        </button>
        {isSupabaseConfigured && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        )}
      </header>

      <div className="max-w-xl mx-auto w-full p-4 md:p-6 space-y-6 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 mb-1">Paramètres des Fournisseurs d'IA</h2>
          <p className="text-sm text-zinc-400">Configurez vos clés d'API. Mode BYOK: Les clés sont stockées en toute sécurité sur votre appareil, ou synchronisées si vous êtes connecté.</p>
        </div>

        <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide snap-x w-full">
          {AI_PROVIDERS.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            const isConfigured = !!apiKeys[provider.id];
            
            return (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  setInputValue('');
                }}
                className={`flex-shrink-0 snap-center w-[140px] p-4 rounded-2xl border text-left transition-all ${
                  isSelected 
                    ? 'bg-zinc-800 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center p-1.5 border border-zinc-800 text-zinc-300">
                    <img 
                      src={`/icons/${provider.id}.png`} 
                      alt={`${provider.name} logo`} 
                      className="w-full h-full object-contain rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  {isConfigured && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
                <div className="space-y-1">
                  <div className={`font-medium text-sm ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                    {provider.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 line-clamp-2 leading-tight h-7">
                    {provider.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Key Management for Selected Provider */}
        <div className="w-full">
          {currentProviderInfo && (
            <div className="space-y-4 p-4 md:p-5 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <div>
                <h3 className="text-base font-medium text-zinc-100">{currentProviderInfo.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{currentProviderInfo.description}</p>
              </div>
              
              {hasKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Clé configurée et active</p>
                      <p className="text-xs opacity-80 mt-0.5">Prête à être utilisée pour les requêtes.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeApiKey(selectedProvider)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la clé
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="api-key-input" className="text-xs font-medium text-zinc-400 block">
                      Clé d'API
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        id="api-key-input"
                        type="password"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Collez votre clé API..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={!inputValue.trim()}
                    className="bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Enregistrer la clé
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
