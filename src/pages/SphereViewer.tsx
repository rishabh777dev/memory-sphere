import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as FramerMotion from 'motion/react';
import { Camera, Loader2, ArrowLeft, RotateCcw, Share2, Globe, Lock, X } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';
import { MemorySphere } from '../components/MemorySphere';
import { photoService, albumService, type Photo, type Album } from '../services/supabase';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

const { motion, AnimatePresence } = FramerMotion;

function Loader() {
  const { progress, active } = useProgress();
  if (!active) return null;
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 bg-art-bg/80 backdrop-blur-xl p-8 rounded-3xl border border-art-line shadow-2xl">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle className="text-art-text-dim/10" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
            <circle 
              className="text-art-accent transition-all duration-500" 
              strokeWidth="8" 
              strokeDasharray={251.2} 
              strokeDashoffset={251.2 - (251.2 * progress) / 100} 
              strokeLinecap="round" 
              stroke="currentColor" 
              fill="transparent" 
              r="40" cx="50" cy="50" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-art-text">{Math.round(progress)}%</div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-art-accent font-black">Spatial Loading</span>
      </div>
    </Html>
  );
}

export default function SphereViewer() {
  const { id: albumId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [album, setAlbum] = useState<Album | null>(null);
  const [sensitivity, setSensitivity] = useState(4);
  const [debugHands, setDebugHands] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [gestureMode, setGestureMode] = useState<'idle' | 'rotate' | 'zoom'>('idle');
  const [invertControls, setInvertControls] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setWebglSupported(false);
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { resultsRef, isCameraDenied } = useHandTracking(videoRef, cameraStarted);

  const requestCamera = () => setCameraStarted(true);

  useEffect(() => {
    async function load() {
      if (!albumId) return;
      setPhotosLoading(true);
      try {
        const [photoData, albumData] = await Promise.all([
          photoService.fetchPhotos(albumId),
          albumService.fetchAlbum(albumId)
        ]);
        setPhotos(photoData);
        setAlbum(albumData);
      } catch (err) {
        console.error('Fetch failed', err);
        try {
          const publicAlbum = await albumService.fetchPublicAlbum(albumId);
          const publicPhotos = await photoService.fetchPhotos(albumId);
          setAlbum(publicAlbum);
          setPhotos(publicPhotos);
        } catch (e) {
          console.error('Public fetch also failed', e);
        }
      } finally {
        setPhotosLoading(false);
      }
    }
    load();
  }, [albumId]);

  const memories = useMemo(() => photos.map(p => ({
    id: p.id,
    url: p.image_url,
    title: p.title || 'Memory'
  })), [photos]);

  const togglePublic = async () => {
    if (!album) return;
    try {
      await albumService.updateAlbum(album.id, { is_public: !album.is_public });
      setAlbum({ ...album, is_public: !album.is_public });
    } catch (err) {
      console.error('Share toggle failed', err);
      alert('Failed to update sharing settings. Please ensure your Supabase "albums" table has an "is_public" boolean column.');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Public link copied to clipboard.');
  };

  return (
    <div className="relative w-full h-screen bg-art-bg overflow-hidden font-sans text-art-text selection:bg-art-accent selection:text-white transition-colors duration-500">
      
      <div className="absolute inset-0 z-0 opacity-60 md:opacity-100" style={{ background: theme === 'light' ? 'radial-gradient(circle_at_center,#fff_0%,#F5F2ED_100%)' : 'radial-gradient(circle_at_center,#1D1D1B_0%,#000_100%)' }}>
        <Suspense fallback={null}>
          <Canvas gl={{ antialias: false }}>
            <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} near={0.01} far={1000} />
            <ambientLight intensity={theme === 'light' ? 1.2 : 0.7} />
            <pointLight position={[5, 5, 5]} intensity={1.5} color={theme === 'light' ? '#fff' : '#E79A6B'} />
            <MemorySphere memories={memories} resultsRef={resultsRef} sensitivity={sensitivity} onGestureMode={setGestureMode} invertControls={invertControls} />
            <Loader />
          </Canvas>
        </Suspense>
      </div>

      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10 flex flex-col gap-6 pointer-events-none">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="pointer-events-auto flex items-center gap-3 px-6 py-3 warm-glass rounded-full text-[10px] uppercase tracking-[0.3em] text-art-text-dim hover:text-art-accent hover:scale-105 transition-all font-black shadow-sm"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Vault</span>
        </button>
        <div className="text-xl sm:text-2xl font-black tracking-[0.2em] uppercase leading-tight text-art-text/80 hidden lg:block max-w-[200px] truncate">
          {album?.name || 'Spatial memories'}
        </div>
      </div>

      <div className="absolute top-6 right-6 sm:top-10 sm:right-10 z-10 flex flex-col items-end gap-3 pointer-events-none">
        <div className="flex gap-3 pointer-events-auto items-center">
          <ThemeToggle />
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 warm-glass rounded-full shadow-sm text-[9px] uppercase tracking-widest font-black text-art-text-dim hover:text-art-accent transition-all"
          >
            <Share2 size={12} />
            <span className="hidden sm:inline">Share Sphere</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3 px-6 py-3 warm-glass rounded-full shadow-sm text-[9px] uppercase tracking-widest font-black">
          <div className={`w-2 h-2 rounded-full ${!cameraStarted ? 'bg-gray-300' : isCameraDenied ? 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.4)]' : 'bg-art-accent shadow-[0_0_10px_var(--art-accent)]'}`}></div>
          <span className={!cameraStarted ? 'text-art-text-dim/40' : isCameraDenied ? 'text-red-500' : 'text-art-accent'}>
            {cameraStarted ? (isCameraDenied ? 'Blocked' : 'Active') : 'Standby'}
          </span>
        </div>

        {cameraStarted && !isCameraDenied && gestureMode !== 'idle' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-art-accent text-white rounded-full shadow-lg text-[9px] uppercase tracking-widest font-black">
            <RotateCcw size={12} className="animate-spin" />
            <span>{gestureMode === 'rotate' ? 'Manipulating' : 'Scaling'}</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-art-text/10 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-art-bg border border-art-line p-8 sm:p-12 rounded-[3rem] max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest text-art-text">Share Vault</h3>
                  <p className="text-art-text-dim text-[10px] uppercase tracking-[0.2em] mt-2 font-bold opacity-60">Manage Access Privileges</p>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="p-3 hover:bg-black/5 rounded-full transition-all"><X size={20} className="text-art-text-dim" /></button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/50 rounded-[2rem] border border-art-line shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${album?.is_public ? 'bg-art-accent/10 text-art-accent' : 'bg-gray-100 text-gray-400'}`}>
                      {album?.is_public ? <Globe size={20} /> : <Lock size={20} />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{album?.is_public ? 'Public' : 'Private'}</p>
                      <p className="text-[9px] text-art-text-dim font-bold mt-1">{album?.is_public ? 'Linked Access' : 'Owner Only'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={togglePublic}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${album?.is_public ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-art-accent/10 text-art-accent hover:bg-art-accent hover:text-white'}`}
                  >
                    {album?.is_public ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {album?.is_public && (
                  <button 
                    onClick={copyShareLink}
                    className="w-full py-5 bg-art-text text-art-bg font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-art-accent hover:text-white transition-all shadow-xl shadow-art-text/10 flex items-center justify-center gap-3"
                  >
                    <Share2 size={14} /> Copy Public URI
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-3rem)] max-w-2xl">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 px-6 sm:px-10 py-4 sm:py-6 warm-glass rounded-[2rem] sm:rounded-full shadow-lg border-white/80">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[9px] uppercase tracking-[0.3em] text-art-text-dim font-black">Sens</span>
            <input 
              type="range" min="0.5" max="10" step="0.1" 
              value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} 
              className="w-full sm:w-32 accent-art-accent cursor-pointer h-1 bg-art-text/5 rounded-full appearance-none" 
            />
          </div>
          
          <div className="hidden sm:block w-[1px] h-8 bg-art-line"></div>

          <div className="flex items-center gap-6 w-full sm:w-auto justify-center">
            <button 
              onClick={() => setInvertControls(!invertControls)} 
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-art-text-dim hover:text-art-accent transition-all font-black"
            >
              Mode: <span className="text-art-text">{invertControls ? 'Look' : 'Drag'}</span>
            </button>

            {!isCameraDenied && (
              <>
                <div className="w-[1px] h-4 bg-art-line sm:hidden"></div>
                {cameraStarted ? (
                  <button onClick={() => setCameraStarted(false)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-red-600 transition-all font-black">
                    <Camera size={14} /> Stop
                  </button>
                ) : (
                  <button onClick={requestCamera} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-art-accent hover:text-art-accent/80 transition-all font-black">
                    <Camera size={14} /> Init
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 z-10 flex flex-col items-end gap-4">
        <button onClick={() => setDebugHands(!debugHands)} className="text-[9px] uppercase tracking-[0.3em] text-art-text-dim/40 hover:text-art-text transition-all font-black">
          {debugHands ? 'Hide Feed' : 'Diagnostics'}
        </button>
        <div className={`w-48 sm:w-64 aspect-video bg-white/50 backdrop-blur-3xl rounded-3xl border border-white shadow-2xl overflow-hidden transition-all duration-700 origin-bottom-right ${debugHands ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1] opacity-60" autoPlay muted playsInline />
          <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(255,255,255,0.8)] pointer-events-none"></div>
        </div>
      </div>

      <AnimatePresence>
        {!webglSupported && (
          <div className="absolute inset-0 z-50 bg-art-bg flex items-center justify-center p-12 text-center">
            <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-red-500">System Error: WebGL</h3>
          </div>
        )}
        {isCameraDenied && cameraStarted && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-xl flex items-center justify-center p-12 text-center">
            <div className="max-w-xs warm-glass p-10 rounded-[3rem] shadow-xl">
              <h3 className="text-xl font-black uppercase tracking-[0.2em] text-art-text">Access Required</h3>
              <p className="text-[10px] text-art-text-dim mt-4 uppercase tracking-widest font-bold leading-loose">Allow camera permissions to enable spatial navigation protocols.</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
