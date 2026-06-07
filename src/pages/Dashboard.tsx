import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Database, Pencil, Check, X, Trash2 } from 'lucide-react';
import * as FramerMotion from 'motion/react';
import { SphereManageModal } from '../components/SphereManageModal';
import { useAuth } from '../hooks/useAuth';
import { albumService, type Album } from '../services/supabase';

const { motion } = FramerMotion;

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [managingAlbum, setManagingAlbum] = useState<Album | null>(null);
  const navigate = useNavigate();

  const fetchAlbums = useCallback(async () => {
    if (!user) return;
    try {
      const data = await albumService.fetchAlbums(user.id);
      setAlbums(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const createNewSphere = async () => {
    if (!user) return;
    setIsCreating(true);
    const newName = `Sphere Collection #${albums.length + 1}`;
    
    try {
      const newAlbum = await albumService.createAlbum(user.id, newName);
      setAlbums(prev => [newAlbum, ...prev]);
      setManagingAlbum(newAlbum);
    } catch (err) {
      console.error('Failed to create album:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const saveAlbumName = async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return setEditingId(null);

    try {
      await albumService.updateAlbumName(id, editName);
      setAlbums(prev => prev.map(a => a.id === id ? { ...a, name: editName } : a));
    } catch (err) {
      console.error('Failed to rename album', err);
    }
    setEditingId(null);
  };

  const deleteAlbum = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this sphere? All photos will be lost.')) return;

    try {
      await albumService.deleteAlbum(id);
      setAlbums(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete album', err);
    }
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVars = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#00FF94] w-10 h-10" /></div>;

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
        </div>
      </header>

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
              <div className="absolute inset-0 bg-gradient-to-br from-[#00FF94]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="z-10 relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-300 group-hover:border-[#00FF94]/50 group-hover:text-[#00FF94] transition-colors">
                    <Database size={16} />
                  </div>
                  <button 
                    onClick={(e) => deleteAlbum(e, album.id)}
                    className="text-gray-500 hover:text-red-400 p-2 rounded-full hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {editingId === album.id ? (
                  <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-black/50 border border-[#00FF94] text-white px-3 py-2 rounded text-lg font-bold outline-none w-full"
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
                        e.stopPropagation();
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
