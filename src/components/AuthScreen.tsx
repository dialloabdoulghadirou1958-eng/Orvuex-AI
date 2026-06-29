import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Sparkles } from 'lucide-react';

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Base de données non configurée.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        setMessage("Inscription réussie ! Un e-mail de confirmation vous a été envoyé. Veuillez cliquer sur le lien reçu (vérifiez aussi vos spams) pour activer votre compte avant de vous connecter.");
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('Invalid login credentials') || errMsg.includes('invalid_credentials')) {
        setError("Adresse e-mail ou mot de passe incorrect. Si vous n'avez pas encore de compte, veuillez cliquer sur 'S'inscrire' ci-dessous. Si vous venez de vous inscrire, assurez-vous de confirmer votre compte par e-mail.");
      } else if (errMsg.includes('Email not confirmed') || errMsg.includes('email_not_confirmed')) {
        setError("Votre adresse e-mail n'a pas encore été confirmée. Veuillez cliquer sur le lien de confirmation reçu par e-mail (pensez à regarder dans vos spams).");
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'authentification');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      setError("Base de données non configurée.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // We skip the default browser redirect to obtain the authorization URL
      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin,
        },
      });
      if (authError) throw authError;

      if (data?.url) {
        // Open the Google authorization flow in a popup window
        const width = 550;
        const height = 680;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.url,
          'orvuex_supabase_google_auth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          throw new Error("Le bloqueur de fenêtres pop-up a empêché l'ouverture. Veuillez autoriser les pop-ups pour ce site afin de vous connecter avec Google.");
        }
      } else {
        throw new Error("Impossible de générer l'URL de connexion Google.");
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'authentification Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
      <div className="w-full max-w-sm space-y-8 relative">
        {!isSupabaseConfigured && (
          <div className="absolute -top-20 left-0 right-0 z-10 bg-amber-900/20 border border-amber-900/50 text-amber-200 p-3 rounded-xl text-xs text-center backdrop-blur-sm">
            Configuration Supabase manquante. Veuillez vérifier vos variables d'environnement.
          </div>
        )}

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">orvuex ai</h2>
            <p className="text-zinc-400 text-sm">
              {isLogin ? "Bon retour parmi nous" : "Créez votre compte"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm text-center">
              {message}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 sm:text-sm transition-all"
              placeholder="Adresse e-mail"
            />

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 sm:text-sm transition-all"
              placeholder="Mot de passe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-full shadow-sm text-sm font-semibold text-black bg-white hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-x-0 h-px bg-zinc-800" />
          <span className="relative bg-[#09090b] px-3 text-xs text-zinc-500 uppercase tracking-wider">
            ou
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-full text-sm font-medium text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuer avec Google
        </button>

        <div className="flex flex-col items-center space-y-6 pt-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {isLogin ? (
              <>Pas encore de compte ? <span className="font-semibold text-white">S'inscrire</span></>
            ) : (
              <>Déjà un compte ? <span className="font-semibold text-white">Se connecter</span></>
            )}
          </button>

          <button
            onClick={onContinueAsGuest}
            className="text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Continuer sans inscription
          </button>
        </div>


      </div>
    </div>
  );
}
