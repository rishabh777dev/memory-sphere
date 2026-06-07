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

  if (loading) return <div className="min-h-screen bg-art-bg flex items-center justify-center"><Loader2 className="animate-spin text-art-accent w-10 h-10" /></div>;

  return (
    <div className="min-h-screen bg-art-bg text-art-text font-sans p-6 sm:p-10 md:p-20 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-art-accent/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-art-accent/5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/4"></div>

      <header className="mb-12 sm:mb-20 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-art-line pb-8 relative z-10 gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[0.3em] text-art-text">Your Vault</h1>
          <p className="text-art-text-dim text-[10px] tracking-[0.2em] uppercase mt-2 font-bold">Manage your Spatial Spheres</p>
        </div>
        <button 
          onClick={handleLogout} 
          className="px-6 py-3 rounded-full warm-glass text-[10px] text-art-text-dim hover:text-art-accent uppercase tracking-widest transition-all font-black shadow-sm"
        >
          Terminate Session
        </button>
      </header>

      <motion.div variants={containerVars} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8 relative z-10">
        
        {/* Create New Card */}
        <motion.button 
          variants={itemVars}
          onClick={createNewSphere}
          disabled={isCreating}
          className="group flex flex-col items-center justify-center h-64 sm:h-72 rounded-[2.5rem] border-2 border-dashed border-art-line bg-white/20 hover:border-art-accent/50 hover:bg-white/40 transition-all text-art-text-dim hover:text-art-accent"
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
              className="group relative h-64 sm:h-72 rounded-[2.5rem] warm-glass p-8 flex flex-col justify-between hover:border-art-accent/30 hover:shadow-xl hover:shadow-art-accent/5 transition-all overflow-hidden cursor-pointer"
            >
              <div className="z-10 relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/50 border border-art-line flex items-center justify-center text-art-text-dim group-hover:border-art-accent/50 group-hover:text-art-accent transition-colors shadow-sm">
                    <Database size={18} />
                  </div>
                  <button 
                    onClick={(e) => deleteAlbum(e, album.id)}
                    className="text-art-text-dim/40 hover:text-red-500 p-2 rounded-full hover:bg-red-50/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {editingId === album.id ? (
                  <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-white/80 border border-art-accent/30 text-art-text px-4 py-2 rounded-xl text-lg font-bold outline-none w-full shadow-inner"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveAlbumName(e as any, album.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={(e) => saveAlbumName(e, album.id)} className="p-2 bg-art-accent text-white rounded-lg hover:bg-art-accent/80 transition-colors shadow-sm"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-white border border-art-line text-art-text-dim rounded-lg hover:bg-gray-50 transition-colors shadow-sm"><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-art-text group-hover:text-art-accent transition-colors line-clamp-2">{album.name}</h3>
                      <p className="text-[9px] text-art-text-dim uppercase tracking-[0.2em] mt-3 font-bold opacity-60">
                        {new Date(album.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditName(album.name);
                        setEditingId(album.id);
                      }}
                      className="text-art-text-dim/30 hover:text-art-text p-2 rounded-full hover:bg-white/50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="z-10 relative flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] font-black text-art-text-dim group-hover:text-art-text transition-colors">
                Open Space <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform text-art-accent" />
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
