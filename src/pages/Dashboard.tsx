import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
      navigate(`/sphere/${newId}`);
    } catch (err) {
      console.error('Failed to create album in Supabase:', err);
      // Fallback navigation if DB is not set up
      navigate(`/sphere/${newId}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (!user && loading) return <div className="min-h-screen bg-black" />; // Prevent flash of dashboard before redirect

  return (
    <div className="min-h-screen bg-art-bg text-white font-sans p-10 md:p-20">
      
      <header className="mb-20 flex justify-between items-end border-b border-art-line pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-[0.2em]">Your Vault</h1>
          <p className="text-art-text-dim text-xs tracking-widest uppercase mt-2">Manage your Spatial Spheres</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <button onClick={handleLogout} className="text-[10px] text-art-text-dim hover:text-white uppercase tracking-widest transition-colors">
            Log Out
          </button>
          {dbError && (
            <div className="flex items-center gap-2 text-yellow-500 text-[10px] uppercase tracking-widest bg-yellow-500/10 px-4 py-2 rounded">
              <Database size={12} />
              <span>Supabase Not Connected (Showing Demo Data)</span>
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-art-accent w-10 h-10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          
          {/* Create New Card */}
          <button 
            onClick={createNewSphere}
            disabled={isCreating}
            className="group flex flex-col items-center justify-center h-64 border border-dashed border-art-line hover:border-art-accent hover:bg-art-accent/5 transition-all text-art-text-dim hover:text-art-accent"
          >
            {isCreating ? (
              <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
              <>
                <Plus className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Create New Sphere</span>
              </>
            )}
          </button>

          {/* Existing Albums */}
          {albums.map((album) => (
            <Link 
              key={album.id} 
              to={`/sphere/${album.id}`}
              className="group relative h-64 bg-black border border-art-line p-6 flex flex-col justify-between hover:border-white transition-all overflow-hidden"
            >
              {/* Background gradient hint */}
              <div className="absolute inset-0 bg-gradient-to-br from-art-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="z-10">
                <div className="w-8 h-8 rounded-full border border-art-text flex items-center justify-center mb-6 text-art-text">
                  <Database size={14} />
                </div>
                <h3 className="text-lg font-bold tracking-wide">{album.name}</h3>
                <p className="text-[10px] text-art-text-dim uppercase tracking-widest mt-2">
                  {new Date(album.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="z-10 flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-art-accent group-hover:translate-x-2 transition-transform">
                Enter Sphere <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
