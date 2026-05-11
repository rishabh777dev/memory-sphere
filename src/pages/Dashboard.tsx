import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Database, Pencil, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as FramerMotion from 'motion/react';
import { SphereManageModal } from '../components/SphereManageModal';

const { motion, AnimatePresence } = FramerMotion;

interface Album {
  id: string;
  name: string;
  created_at: string;
}

export default function Dashboard() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [managingAlbum, setManagingAlbum] = useState<Album | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchAlbums(session.user.id);
      }
    };
    checkUser();
  }, [navigate]);

  const fetchAlbums = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('albums').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      
      if (error) throw error;
      setAlbums(data || []);
    } catch (err) {
      console.error('Supabase fetch error:', err);
      setDbError(true);
      // Fallback for demo purposes if DB isn't connected yet
      setAlbums([
        { id: 'demo-1', name: 'Summer Vacation', created_at: new Date().toISOString() },
        { id: 'demo-2', name: 'Design Inspiration', created_at: new Date().toISOString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const createNewSphere = async () => {
    setIsCreating(true);
    const newId = uuidv4();
    const newName = `Sphere Collection #${albums.length + 1}`;
    
    try {
      const { error } = await supabase.from('albums').insert([{ id: newId, name: newName, user_id: user.id }]);
      if (error) throw error;
      setAlbums(prev => [{ id: newId, name: newName, created_at: new Date().toISOString() }, ...prev]);
      setManagingAlbum({ id: newId, name: newName, created_at: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to create album in Supabase:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const saveAlbumName = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return setEditingId(null);

    try {
      if (!dbError) {
        const { error } = await supabase.from('albums').update({ name: editName }).eq('id', id);
        if (error) throw error;
      }
      setAlbums(prev => prev.map(a => a.id === id ? { ...a, name: editName } : a));
    } catch (err) {
      console.error('Failed to rename album', err);
    }
    setEditingId(null);
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } }
  };

  if (!user && loading) return <div className="min-h-screen bg-black" />; // Prevent flash of dashboard before redirect

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-10 md:p-20 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00FF94]/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

      <header className="mb-20 flex justify-between items-end border-b border-white/10 pb-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Your Vault</h1>
          <p className="text-gray-400 text-xs tracking-[0.2em] uppercase mt-2">Manage your Spatial Spheres</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button onClick={handleLogout} className="text-[10px] text-gray-400 hover:text-red-400 uppercase tracking-widest transition-colors font-bold">
            Log Out Session
          </button>
          {dbError && (
            <div className="flex items-center gap-2 text-yellow-500 text-[10px] uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-full">
              <Database size={12} />
              <span>Supabase Disconnected: Local Mode</span>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#00FF94] w-10 h-10" />
        </div>
      ) : (
        <motion.div variants={containerVars} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
          
          {/* Create New Card */}
          <motion.button 
            variants={itemVars}
            onClick={createNewSphere}
            disabled={isCreating}
            className="group flex flex-col items-center justify-center h-72 rounded-3xl border border-dashed border-white/20 bg-white/5 backdrop-blur-xl hover:border-[#00FF94]/50 hover:bg-[#00FF94]/5 transition-all text-gray-400 hover:text-[#00FF94]"
          >
            {isCreating ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <>
                <Plus className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Initialize Sphere</span>
              </>
            )}
          </motion.button>

          {/* Existing Albums */}
          {albums.map((album) => (
            <motion.div variants={itemVars} key={album.id}>
              <div 
                onClick={() => setManagingAlbum(album)}
                className="group relative h-72 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 flex flex-col justify-between hover:border-[#00FF94]/30 hover:shadow-[0_0_30px_rgba(0,255,148,0.1)] transition-all overflow-hidden cursor-pointer"
              >
                {/* Background glow hint */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#00FF94]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="z-10 relative">
                  <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-6 text-gray-300 group-hover:border-[#00FF94]/50 group-hover:text-[#00FF94] transition-colors">
                    <Database size={16} />
                  </div>

                  {editingId === album.id ? (
                    <div className="flex flex-col gap-2" onClick={e => e.preventDefault()}>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-black/50 border border-[#00FF94] text-white px-3 py-2 rounded text-lg font-bold outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAlbumName(e as any, album.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={(e) => saveAlbumName(e, album.id)} className="p-1.5 bg-[#00FF94]/20 text-[#00FF94] rounded hover:bg-[#00FF94]/40 transition-colors"><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition-colors"><X size={14} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold tracking-wide text-white group-hover:text-[#00FF94] transition-colors line-clamp-2">{album.name}</h3>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-2">
                          Created: {new Date(album.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setEditName(album.name);
                          setEditingId(album.id);
                        }}
                        className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="z-10 relative flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-gray-500 group-hover:text-white transition-colors">
                  Manage Sphere <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform text-[#00FF94]" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {managingAlbum && (
        <SphereManageModal 
          albumId={managingAlbum.id} 
          albumName={managingAlbum.name} 
          onClose={() => setManagingAlbum(null)} 
        />
      )}
    </div>
  );
}
