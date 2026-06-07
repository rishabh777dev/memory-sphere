import { useState, useEffect } from 'react';
import { X, Upload, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import * as FramerMotion from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { photoService, type Photo } from '../services/supabase';

const { motion, AnimatePresence } = FramerMotion;

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
    const fetchPhotos = async () => {
      try {
        const data = await photoService.fetchPhotos(albumId);
        setPhotos(data);
      } catch (err) {
        console.error('Failed to fetch photos', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, [albumId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const MAX_SIZE_MB = 10;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const validFiles = files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) return false;
      if (file.size > MAX_SIZE_BYTES) return false;
      return true;
    });

    if (validFiles.length === 0) return;
    setUploading(true);

    try {
      // Parallel uploads for better performance
      const uploadPromises = validFiles.map(file => photoService.uploadPhoto(albumId, file));
      const newPhotos = await Promise.all(uploadPromises);
      setPhotos(prev => [...newPhotos, ...prev]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Some uploads failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, url: string) => {
    try {
      await photoService.deletePhoto(photoId, url);
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-art-text/20 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl h-[90vh] md:h-[85vh] bg-art-bg border border-art-line rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 md:p-8 border-b border-art-line bg-white/30 backdrop-blur-md">
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-art-text">Manage Sphere</h2>
              <p className="text-art-text-dim text-[10px] tracking-widest mt-1 font-bold">{albumName}</p>
            </div>
            <button onClick={onClose} className="p-3 text-art-text-dim hover:text-art-text hover:bg-white/50 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-art-accent" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                
                {/* Upload Card */}
                <label className="relative aspect-square flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-art-line bg-white/20 hover:bg-white/40 hover:border-art-accent/50 cursor-pointer transition-all group overflow-hidden shadow-sm">
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-art-accent" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-art-text-dim group-hover:text-art-accent mb-3 transition-colors" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-art-text-dim group-hover:text-art-accent">Add Photos</span>
                    </>
                  )}
                </label>

                {/* Photo Thumbnails */}
                {photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-3xl overflow-hidden group border border-art-line bg-white shadow-sm flex flex-col">
                    <img src={photo.image_url} alt="Memory" className="w-full h-full object-cover opacity-90 group-hover:opacity-30 transition-all duration-500" />
                    
                    {/* Metadata Edit Overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-between bg-white/60 backdrop-blur-sm">
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Title"
                          defaultValue={photo.title}
                          onBlur={(e) => photoService.updatePhotoMetadata(photo.id, { title: e.target.value })}
                          className="w-full bg-white/80 border border-art-line rounded-xl px-3 py-1.5 text-[10px] text-art-text outline-none focus:border-art-accent transition-all shadow-sm"
                        />
                        <textarea 
                          placeholder="Description"
                          defaultValue={photo.description}
                          onBlur={(e) => photoService.updatePhotoMetadata(photo.id, { description: e.target.value })}
                          className="w-full bg-white/80 border border-art-line rounded-xl px-3 py-1.5 text-[9px] text-art-text-dim outline-none focus:border-art-accent transition-all h-16 resize-none shadow-sm"
                        />
                      </div>
                      
                      <div className="flex justify-center">
                        <button 
                          onClick={() => deletePhoto(photo.id, photo.image_url)}
                          className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {!loading && photos.length === 0 && (
              <div className="text-center mt-20 text-art-text-dim text-[10px] tracking-[0.3em] uppercase font-black opacity-40">
                Empty Sphere Registry
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 md:p-8 border-t border-art-line bg-white/30 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[9px] uppercase tracking-[0.3em] text-art-text-dim font-black hidden sm:block">
              {photos.length} Total Nodes Synchronized
            </div>
            <button 
              onClick={() => navigate(`/sphere/${albumId}`)}
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 bg-art-text text-art-bg rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-art-accent hover:text-white transition-all shadow-xl shadow-art-text/10"
            >
              Enter Spatial Sphere <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
