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
    } catch (err: unknown) {
      // Map Supabase errors to safe user-facing messages — never expose raw internals
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please verify your email before logging in.');
      } else if (msg.includes('User already registered')) {
        setError('An account with this email already exists.');
      } else if (msg.includes('Password should be')) {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-art-bg text-art-text flex items-center justify-center font-sans relative overflow-hidden p-6 sm:p-10">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-art-accent/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/4 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-art-accent/5 rounded-full blur-[100px] pointer-events-none translate-y-1/4 -translate-x-1/4"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 sm:p-12 warm-glass rounded-[2.5rem] relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black uppercase tracking-[0.3em] mb-3 text-art-text">
            {isLogin ? 'Enter Vault' : 'Initialize Account'}
          </h1>
          <p className="text-[10px] text-art-text-dim uppercase tracking-widest leading-relaxed">
            {isLogin ? 'Authenticate to access your memory spheres' : 'Create a secure spatial container'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] uppercase font-bold tracking-widest text-center rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim font-black ml-1">Email Classification</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/50 border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-all rounded-2xl placeholder:text-art-text-dim/30"
                placeholder="user@system.net"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim font-black ml-1">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/50 border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-all rounded-2xl placeholder:text-art-text-dim/30"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-art-text text-art-bg text-[11px] font-black uppercase tracking-[0.3em] hover:bg-art-accent hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-2xl shadow-xl shadow-art-text/10"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (isLogin ? 'Authenticate' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] text-art-text-dim hover:text-art-accent uppercase tracking-widest transition-colors font-bold"
          >
            {isLogin ? 'Request New Clearance' : 'Existing Agent?'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
