import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { albumService } from '../services/supabase';
import { Loader2, Lock, Mail } from 'lucide-react';
import * as FramerMotion from 'motion/react';
const { motion } = FramerMotion;

import { SpatialBackground } from '../components/SpatialBackground';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (inviteCode) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            try {
              const album = await albumService.joinAlbumByInviteCode(session.user.id, inviteCode);
              navigate(`/sphere/${album.id}`);
              return;
            } catch (err) {
              console.warn('Failed to join album:', err);
            }
          }
        }
        
        navigate('/dashboard');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (inviteCode) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            try {
              const album = await albumService.joinAlbumByInviteCode(session.user.id, inviteCode);
              navigate(`/sphere/${album.id}`);
              return;
            } catch (err) {
              console.warn('Failed to auto-join after signup:', err);
            }
          }
        }

        alert('Success! Welcome to Memory Sphere.');
        setIsLogin(true);
      }
    } catch (err: unknown) {
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
    <div className="min-h-screen bg-art-bg text-art-text flex items-center justify-center font-sans relative overflow-y-auto p-6 sm:p-10">
      <SpatialBackground />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 sm:p-12 warm-glass rounded-[2.5rem] relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-2xl font-black uppercase tracking-[0.3em] mb-3 text-art-text">
            {isLogin ? 'Enter Vault' : 'Initialize Account'}
          </h1>
          <p className="text-[12px] text-art-text-dim uppercase tracking-widest leading-relaxed font-bold">
            {isLogin ? 'Authenticate to access your memory spheres' : 'Create a secure spatial container'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] uppercase font-black tracking-widest text-center rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-art-text-dim font-black ml-1">Email Classification</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-art-glass-bg border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-all rounded-2xl placeholder:text-art-text-dim/30 text-art-text"
                placeholder="user@system.net"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-art-text-dim font-black ml-1">Security Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-art-text-dim" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-art-glass-bg border border-art-line focus:border-art-accent p-4 pl-12 text-sm outline-none transition-all rounded-2xl placeholder:text-art-text-dim/30 text-art-text"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-art-text text-art-bg text-[12px] font-black uppercase tracking-[0.3em] hover:bg-art-accent hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-2xl shadow-xl shadow-art-text/10"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (isLogin ? 'Authenticate' : 'Create Account')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[11px] text-art-text-dim hover:text-art-accent uppercase tracking-widest transition-colors font-black"
          >
            {isLogin ? 'Request New Clearance' : 'Existing Agent?'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
