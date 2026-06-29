import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function AuthScreen({ onContinueAsGuest }: { onContinueAsGuest: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMissingEnvVars = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMissingEnvVars) {
      setError('Les variables d\'environnement Supabase (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY) sont manquantes.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isMissingEnvVars) {
      setError('Les variables d\'environnement Supabase sont manquantes.');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion Google');
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center bg-black px-4 font-sans text-zinc-100 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-zinc-900/40 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-sm space-y-8 z-10"
      >
        <div className="text-center flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center mb-4"
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-white">orvuex ai</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isLogin ? 'Bon retour parmi nous' : 'Commencez votre expérience'}
          </p>
        </div>

        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          onSubmit={handleAuth} 
          className="mt-8 space-y-4"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse e-mail"
              required
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-zinc-500 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-6 py-4 text-sm text-white placeholder-zinc-500 transition-all focus:border-zinc-500 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white px-6 py-4 text-sm font-semibold text-black transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:pointer-events-none shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "Créer un compte"}
          </button>
        </motion.form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative mt-6 mb-6"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-black px-4 text-zinc-500">ou</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          onClick={handleGoogleLogin}
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-full bg-zinc-900 border border-zinc-800 px-6 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.549L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.3103 0 3.2553 2.69 1.2503 6.65L5.3103 9.8C6.2753 6.83 8.8603 4.75 12.0003 4.75Z"
              fill="#EA4335"
            />
            <path
              d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L20.14 21.25C22.505 19.075 23.49 15.93 23.49 12.275Z"
              fill="#4285F4"
            />
            <path
              d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.225 6.5549C0.455 8.0999 0 9.9699 0 11.9999C0 14.0299 0.455 15.8999 1.225 17.4449L5.26498 14.2949Z"
              fill="#FBBC05"
            />
            <path
              d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L15.8854 17.945C14.8154 18.665 13.5204 19.12 12.0004 19.12C8.8604 19.12 6.2754 17.04 5.3104 14.07L1.2504 17.22C3.2554 21.18 7.3104 24.0001 12.0004 24.0001Z"
              fill="#34A853"
            />
          </svg>
          Continuer avec Google
        </motion.button>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center text-sm text-zinc-500 pt-4"
        >
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 font-medium text-white hover:text-zinc-300 hover:underline underline-offset-4 transition-colors focus:outline-none"
          >
            {isLogin ? "S'inscrire" : 'Se connecter'}
          </button>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center pt-2"
        >
          <button
            onClick={onContinueAsGuest}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors focus:outline-none underline-offset-4 hover:underline"
          >
            Continuer sans inscription
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

