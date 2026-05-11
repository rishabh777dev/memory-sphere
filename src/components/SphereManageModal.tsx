import { useState, useEffect } from 'react';
import { X, Upload, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import * as FramerMotion from 'motion/react';
import { useNavigate } from 'react-router-dom';

const { motion, AnimatePresence } = FramerMotion;

interface Photo {
  id: string;
  image_url: string;
}

interface SphereManageModalProps {
  albumId: string;
  albumName: string;
  onClose: () => void;
}

export function SphereManageModal({ albumId, albumName, onClose }: SphereManageModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPhotos();
  }, [albumId]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase.from('photos').select('*').eq('album_id', albumId);
      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Failed to fetch photos', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setUploading(true);

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${albumId}/${fileName}`;

      try {
        const { error: uploadError } = await supabase.storage.from('memory-sphere-images').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('memory-sphere-images').getPublicUrl(filePath);
        
        const newPhotoRecord = {
          id: uuidv4(),
          album_id: albumId,
          image_url: publicUrlData.publicUrl
        };

        const { error: insertError } = await supabase.from('photos').insert([newPhotoRecord]);
        if (insertError) throw insertError;

        setPhotos(prev => [newPhotoRecord, ...prev]);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setUploading(false);
  };

  const deletePhoto = async (photoId: string, url: string) => {
    try {
      // 1. Delete from DB
      await supabase.from('photos').delete().eq('id', photoId);
      
      // 2. Extract path and delete from Storage
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('memory-sphere-images') + 1).join('/');
      
      if (filePath) {
        await supabase.storage.from('memory-sphere-images').remove([filePath]);
      }

      // 3. Update UI
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error("Failed to delete photo", err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10 bg-black/80 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl h-[85vh] bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-8 border-b border-white/10 bg-white/5">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white">Manage Sphere</h2>
              <p className="text-gray-400 text-xs tracking-widest mt-1">{albumName}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-black/50 hover:bg-red-500/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-[#00FF94]" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                
                {/* Upload Card */}
                <label className="relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:bg-[#00FF94]/10 hover:border-[#00FF94]/50 cursor-pointer transition-all group overflow-hidden">
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-[#00FF94]" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#00FF94] mb-3 transition-colors" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-[#00FF94]">Add Photos</span>
                    </>
                  )}
                </label>

                {/* Photo Thumbnails */}
                {photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10 bg-black">
                    <img src={photo.image_url} alt="Memory" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    
                    {/* Delete Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <button 
                        onClick={() => deletePhoto(photo.id, photo.image_url)}
                        className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && photos.length === 0 && (
              <div className="text-center mt-12 text-gray-500 text-sm tracking-widest uppercase">
                No memories found in this sphere. Upload some photos to begin.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
            <button 
              onClick={() => navigate(`/sphere/${albumId}`)}
              className="flex items-center gap-3 px-8 py-4 bg-[#00FF94] text-black rounded-full font-black uppercase tracking-[0.2em] hover:bg-white transition-colors"
            >
              Enter Spatial Sphere <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
