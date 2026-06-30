import { ArrowLeft, Key, Trash2, CheckCircle2, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { AI_PROVIDERS } from '../lib/providers';
import { ProviderId, ApiKeys } from '../types';
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';

interface SettingsViewProps {
  apiKeys: ApiKeys;
  setApiKey: (providerId: ProviderId, key: string) => void;
  removeApiKey: (providerId: ProviderId) => void;
  onClose: () => void;
}

export function SettingsView({ apiKeys, setApiKey, removeApiKey, onClose }: SettingsViewProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('openai');
  const [inputValue, setInputValue] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState<string>('');

  const currentProviderInfo = AI_PROVIDERS.find(p => p.id === selectedProvider);
  const hasKey = !!apiKeys[selectedProvider];

  useEffect(() => {
    setValidationStatus('idle');
    setValidationMessage('');
  }, [selectedProvider, hasKey]);

  const runImmediateValidation = async (key: string) => {
    if (!key) return;
    setValidationStatus('validating');
    setValidationMessage('');
    
    try {
      const trimmedKey = key.trim();
      if (selectedProvider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: trimmedKey });
        
        try {
          // Primary validation method: Test content generation with gemini-2.0-flash
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Hello'
          });
          if (response && response.text) {
            setValidationStatus('success');
            setValidationMessage(`Google AI Studio a validé la clé d'API avec succès via le SDK officiel @google/genai (Test de génération OK avec gemini-2.0-flash).`);
            return;
          }
        } catch (err20) {
          console.warn("Validation with gemini-2.0-flash failed, trying gemini-1.5-flash...", err20);
        }

        try {
          // Secondary validation method: Test content generation with gemini-1.5-flash
          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: 'Hello'
          });
          if (response && response.text) {
            setValidationStatus('success');
            setValidationMessage(`Google AI Studio a validé la clé d'API avec succès via le SDK officiel @google/genai (Test de génération OK avec gemini-1.5-flash).`);
            return;
          }
        } catch (err15) {
          console.warn("Validation with gemini-1.5-flash failed, trying models.list...", err15);
        }

        // Final fallback method: Try to list models
        try {
          const pager = await ai.models.list();
          const models = pager.page;
          if (models && models.length > 0) {
            setValidationStatus('success');
            setValidationMessage(`Google AI Studio a validé la clé d'API avec succès via le SDK officiel @google/genai (${models.length} modèles détectés via list).`);
          } else {
            setValidationStatus('error');
            setValidationMessage('La clé d\'API a été acceptée par Google, mais aucun modèle n\'a pu être répertorié.');
          }
        } catch (listErr: any) {
          // All methods failed, throw the initial error
          throw new Error(`Échec de validation de la clé. Assurez-vous qu'elle est valide et active. Détails de l'erreur : ${listErr.message || listErr}`);
        }
      } else {
        const provider = AI_PROVIDERS.find(p => p.id === selectedProvider);
        if (!provider) return;
        
        const res = await fetch(`${provider.baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${trimmedKey}` }
        });
        
        if (res.ok) {
          setValidationStatus('success');
          setValidationMessage('Connexion réussie avec le fournisseur.');
        } else {
          const errText = await res.text();
          setValidationStatus('error');
          setValidationMessage(`Erreur de connexion (${res.status}): ${errText.slice(0, 100)}`);
        }
      }
    } catch (err: any) {
      setValidationStatus('error');
      setValidationMessage(`Erreur réseau: ${err.message || err}`);
    }
  };

  const handleSave = () => {
    if (inputValue.trim()) {
      const key = inputValue.trim();
      setApiKey(selectedProvider, key);
      setInputValue('');
      setTimeout(() => {
        runImmediateValidation(key);
      }, 100);
    }
  };

  const handleTestExisting = () => {
    const key = apiKeys[selectedProvider];
    if (key) {
      runImmediateValidation(key);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

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
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-zinc-100 text-sm">Clé configurée et active</p>
                      <p className="text-xs text-zinc-400 leading-normal">Votre clé d'API pour {currentProviderInfo?.name} est enregistrée localement et active.</p>
                    </div>
                  </div>

                  {/* Validation status widget */}
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {validationStatus === 'idle' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 animate-pulse" />
                        )}
                        {validationStatus === 'validating' && (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                        {validationStatus === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {validationStatus === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-zinc-300">
                          {validationStatus === 'idle' && 'Statut: Non testé'}
                          {validationStatus === 'validating' && 'Validation de la clé...'}
                          {validationStatus === 'success' && 'Connexion réussie !'}
                          {validationStatus === 'error' && 'Échec de connexion'}
                        </span>
                      </div>

                      {validationStatus !== 'validating' && (
                        <button
                          onClick={handleTestExisting}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                        >
                          Tester la clé
                        </button>
                      )}
                    </div>

                    {validationMessage && (
                      <div className={`text-xs p-3 rounded-lg border font-mono ${
                        validationStatus === 'success' 
                          ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                          : 'bg-red-500/5 border-red-500/10 text-red-400 break-words'
                      }`}>
                        {validationMessage}
                      </div>
                    )}
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
                <div className="space-y-4">
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
                    className="bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors w-full flex items-center justify-center gap-2"
                  >
                    Enregistrer et Valider la clé
                  </button>

                  {/* Validation status widget for newly entered key */}
                  {validationStatus !== 'idle' && (
                    <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 space-y-3">
                      <div className="flex items-center gap-2">
                        {validationStatus === 'validating' && (
                          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        )}
                        {validationStatus === 'success' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {validationStatus === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-zinc-300">
                          {validationStatus === 'validating' && 'Validation en cours...'}
                          {validationStatus === 'success' && 'Clé validée avec succès !'}
                          {validationStatus === 'error' && 'La clé d\'API semble invalide'}
                        </span>
                      </div>

                      {validationMessage && (
                        <div className={`text-xs p-3 rounded-lg border font-mono ${
                          validationStatus === 'success' 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/5 border-red-500/10 text-red-400 break-words'
                        }`}>
                          {validationMessage}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
