import { useState, useEffect } from 'react';
import { X, Upload, Trash2, ArrowRight, Loader2, Share2, Image as ImageIcon, Copy, Check, AlertCircle } from 'lucide-react';
import * as FramerMotion from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { photoService, albumService, type Photo, type Album } from '../services/supabase';
import { googleDriveService } from '../services/googleDrive';
import { QRCodeCanvas } from 'qrcode.react';

const { motion, AnimatePresence } = FramerMotion;

interface SphereManageModalProps {
  albumId: string;
  albumName: string;
  driveToken: string | null;
  onClose: () => void;
}

export function SphereManageModal({ albumId, albumName, driveToken, onClose }: SphereManageModalProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'photos' | 'sharing'>('photos');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const [photoData, albumData] = await Promise.all([
          photoService.fetchPhotos(albumId),
          albumService.fetchAlbum(albumId)
        ]);
        setPhotos(photoData);
        setAlbum(albumData);
      } catch (err) {
        console.error('Failed to initialize manager:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [albumId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    if (!driveToken || !album?.drive_folder_id) {
      alert("Error: Missing Google Drive connection or folder ID. Please ensure your drive is connected on the dashboard.");
      return;
    }

    const files = Array.from(e.target.files);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const MAX_SIZE_MB = 20; // Increased limit since we are using Drive
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const validFiles = files.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) return false;
      if (file.size > MAX_SIZE_BYTES) return false;
      return true;
    });

    if (validFiles.length === 0) return;
    setUploading(true);

    try {
      // 1. Upload to Google Drive directly
      const uploadPromises = validFiles.map(async (file) => {
        const driveData = await googleDriveService.uploadFile(driveToken, album.drive_folder_id!, file);
        
        // 2. Save the metadata and Drive webContentLink to Supabase
        const dbRecord = await photoService.saveDriveMetadata(albumId, driveData.webContentLink, file.name);
        return dbRecord;
      });

      const newPhotos = await Promise.all(uploadPromises);
      setPhotos(prev => [...newPhotos, ...prev]);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload to Google Drive. Ensure you have granted file permissions.");
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, url: string) => {
    try {
      // Note: Full Drive deletion requires a different API call. 
      // For now, we just remove it from the visual gallery (Supabase DB).
      await photoService.deletePhotoRecord(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error("Failed to remove photo from gallery", err);
    }
  };

  const toggleGuestUploads = async () => {
    if (!album) return;
    const nextValue = !album.allow_guest_uploads;
    try {
      await albumService.updateAlbum(album.id, { allow_guest_uploads: nextValue });
      setAlbum({ ...album, allow_guest_uploads: nextValue });
    } catch (err) {
      console.error('Failed to update permissions', err);
    }
  };

  const inviteUrl = `${window.location.origin}/auth?invite=${album?.invite_code}`;

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <div className="flex gap-8 items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-art-text">Vault Registry</h2>
                <p className="text-art-text-dim text-[11px] tracking-widest mt-1 font-bold">{albumName}</p>
              </div>
              
              <div className="hidden sm:flex bg-white/50 rounded-2xl p-1 border border-art-line shadow-inner">
                <button 
                  onClick={() => setActiveTab('photos')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'photos' ? 'bg-art-text text-art-bg shadow-lg' : 'text-art-text-dim hover:text-art-text'}`}
                >
                  <ImageIcon size={14} /> Assets
                </button>
                <button 
                  onClick={() => setActiveTab('sharing')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sharing' ? 'bg-art-text text-art-bg shadow-lg' : 'text-art-text-dim hover:text-art-text'}`}
                >
                  <Share2 size={14} /> Collaboration
                </button>
              </div>
            </div>
            <button onClick={onClose} className="p-3 text-art-text-dim hover:text-art-text hover:bg-white/50 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Mobile Tabs */}
          <div className="sm:hidden flex border-b border-art-line bg-white/10">
            <button onClick={() => setActiveTab('photos')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'photos' ? 'text-art-accent border-b-2 border-art-accent' : 'text-art-text-dim'}`}>Assets</button>
            <button onClick={() => setActiveTab('sharing')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${activeTab === 'sharing' ? 'text-art-accent border-b-2 border-art-accent' : 'text-art-text-dim'}`}>Collab</button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-10 h-10 animate-spin text-art-accent" />
              </div>
            ) : activeTab === 'photos' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                <label className="relative aspect-square flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-art-line bg-white/20 hover:bg-white/40 hover:border-art-accent/50 cursor-pointer transition-all group overflow-hidden shadow-sm">
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-art-accent" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-art-text-dim group-hover:text-art-accent mb-3 transition-colors" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-art-text-dim group-hover:text-art-accent">Add Photos</span>
                    </>
                  )}
                </label>

                {photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-3xl overflow-hidden group border border-art-line bg-white shadow-sm flex flex-col">
                    <img src={photo.image_url} alt="Memory" className="w-full h-full object-cover opacity-90 group-hover:opacity-30 transition-all duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-between bg-white/60 backdrop-blur-sm">
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="Title"
                          defaultValue={photo.title}
                          onBlur={(e) => photoService.updatePhotoMetadata(photo.id, { title: e.target.value })}
                          className="w-full bg-white/80 border border-art-line rounded-xl px-3 py-1.5 text-[11px] text-art-text outline-none focus:border-art-accent transition-all shadow-sm"
                        />
                        <textarea 
                          placeholder="Description"
                          defaultValue={photo.description}
                          onBlur={(e) => photoService.updatePhotoMetadata(photo.id, { description: e.target.value })}
                          className="w-full bg-white/80 border border-art-line rounded-xl px-3 py-1.5 text-[10px] text-art-text-dim outline-none focus:border-art-accent transition-all h-16 resize-none shadow-sm"
                        />
                      </div>
                      <div className="flex justify-center">
                        <button onClick={() => deletePhoto(photo.id, photo.image_url)} className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-12 py-6">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                  <div className="p-6 bg-white rounded-[2.5rem] border border-art-line shadow-2xl shadow-art-text/5 flex items-center justify-center">
                    <QRCodeCanvas 
                      value={inviteUrl} 
                      size={200}
                      level="H"
                      includeMargin={true}
                      fgColor="#1D1D1B"
                      bgColor="transparent"
                    />
                  </div>
                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-widest text-art-text">Invite Guests</h3>
                      <p className="text-[11px] text-art-text-dim mt-2 font-bold leading-relaxed uppercase tracking-wider opacity-60">
                        Share this code at your event. Guests can scan to join the spatial gallery and contribute their perspective.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-white/50 border border-art-line rounded-2xl px-6 py-4 text-xs font-mono truncate text-art-text-dim shadow-inner">
                        {inviteUrl}
                      </div>
                      <button 
                        onClick={copyInvite}
                        className={`px-8 py-4 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-art-accent text-white' : 'bg-white border border-art-line text-art-text hover:bg-gray-50 shadow-sm'}`}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Captured' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-8 warm-glass rounded-[2rem] border border-art-line flex flex-col justify-between gap-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-widest text-art-text">Global Uploads</p>
                        <p className="text-[10px] text-art-text-dim font-bold uppercase tracking-wider opacity-50">Allow anyone to contribute</p>
                      </div>
                      <button 
                        onClick={toggleGuestUploads}
                        className={`w-12 h-6 rounded-full relative transition-colors ${album?.allow_guest_uploads ? 'bg-art-accent' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${album?.allow_guest_uploads ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <p className="text-[10px] leading-relaxed text-art-text-dim/60 font-bold uppercase tracking-widest italic">
                      {album?.allow_guest_uploads ? "Guests with the invite link can upload photos." : "The vault is currently read-only for guests."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-6 md:p-8 border-t border-art-line bg-white/30 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-[11px] uppercase tracking-[0.3em] text-art-text-dim font-black hidden sm:block">
              {photos.length} Spatial Nodes Registered
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
