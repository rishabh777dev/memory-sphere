import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Mail } from 'lucide-react';
import * as FramerMotion from 'motion/react';
const { motion } = FramerMotion;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase might require email verification depending on settings, 
        // but by default in local dev/new projects it auto-confirms or sends an email.
        alert('Success! If you see a confirmation email, please verify it. Otherwise, you can now log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-art-accent/5 rounded-full blur-[150px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-10 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black uppercase tracking-[0.3em] mb-2">
            {isLogin ? 'Enter Vault' : 'Initialize Account'}
          </h1>
          <p className="text-[10px] text-art-text-dim uppercase tracking-widest">
            {isLogin ? 'Authenticate to access your memory spheres' : 'Create a secure spatial container'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim">Email Classification</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-colors"
                placeholder="user@system.net"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-art-accent text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (isLogin ? 'Authenticate' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] text-art-text-dim hover:text-white uppercase tracking-widest transition-colors"
          >
            {isLogin ? 'Request New Clearance (Sign Up)' : 'Existing Agent? (Log In)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
