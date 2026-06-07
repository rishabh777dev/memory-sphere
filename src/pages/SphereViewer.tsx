import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, useProgress } from '@react-three/drei';
import * as FramerMotion from 'motion/react';
import { Camera, Loader2, ArrowLeft, Plus, RotateCcw, Share2, Info, Check, X, Globe, Lock } from 'lucide-react';

import { useHandTracking } from '../hooks/useHandTracking';
import { MemorySphere } from '../components/MemorySphere';
import { photoService, albumService, type Photo, type Album } from '../services/supabase';

const { motion, AnimatePresence } = FramerMotion;

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4 bg-black/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle className="text-white/10" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
            <circle 
              className="text-[#00FF94] transition-all duration-500" 
              strokeWidth="8" 
              strokeDasharray={251.2} 
              strokeDashoffset={251.2 - (251.2 * progress) / 100} 
              strokeLinecap="round" 
              stroke="currentColor" 
              fill="transparent" 
              r="40" cx="50" cy="50" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{Math.round(progress)}%</div>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#00FF94] font-black">Spatial Loading</span>
      </div>
    </Html>
  );
}

// Internal Html import fix for SphereViewer
import { Html } from '@react-three/drei';

export default function SphereViewer() {
  const { id: albumId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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
          supabase.from('albums').select('*').eq('id', albumId).single().then(r => r.data)
        ]);
        setPhotos(photoData);
        setAlbum(albumData);
      } catch (err) {
        console.error('Fetch failed', err);
        // Try public fetch if auth fetch fails
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
    }
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-white">
      
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000_100%)]">
        <Suspense fallback={null}>
          <Canvas gl={{ antialias: false }}>
            <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} near={0.01} far={1000} />
            <ambientLight intensity={0.9} />
            <pointLight position={[5, 5, 5]} intensity={1.5} />
            <MemorySphere memories={memories} resultsRef={resultsRef} sensitivity={sensitivity} onGestureMode={setGestureMode} invertControls={invertControls} />
            <Loader />
          </Canvas>
        </Suspense>
      </div>

      <div className="absolute top-8 left-8 z-10 flex flex-col gap-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all transform hover:-translate-x-2">
          <ArrowLeft size={14} /> Vault
        </button>
        <div className="text-2xl font-black tracking-[0.3em] uppercase leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-600">
          {album?.name || 'Spatial memories'}
        </div>
      </div>

      <div className="absolute top-8 right-8 z-10 flex flex-col items-end gap-3">
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-[9px] uppercase tracking-widest font-bold hover:bg-white/10 transition-colors"
        >
          <Share2 size={12} className="text-[#00FF94]" />
          <span>Share Sphere</span>
        </button>
        
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-[9px] uppercase tracking-widest font-bold">
          <div className={`w-2 h-2 rounded-full ${!cameraStarted ? 'bg-gray-500' : isCameraDenied ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-[#00FF94] shadow-[0_0_10px_#00FF94]'}`}></div>
          <span className={!cameraStarted ? 'text-gray-400' : isCameraDenied ? 'text-red-400' : 'text-[#00FF94]'}>
            {cameraStarted ? (isCameraDenied ? 'Camera Blocked' : 'Tracking Active') : 'Tracking Standby'}
          </span>
        </div>

        {cameraStarted && !isCameraDenied && gestureMode !== 'idle' && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[#00FF94] backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-[9px] uppercase tracking-widest font-black text-black">
            <RotateCcw size={12} className="animate-spin" />
            <span>{gestureMode === 'rotate' ? 'Rotating Sphere' : 'Scaling Space'}</span>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 p-10 rounded-[2.5rem] max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest">Share Vault</h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] mt-2">Manage access to this sphere</p>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-4">
                    {album?.is_public ? <Globe size={20} className="text-[#00FF94]" /> : <Lock size={20} className="text-gray-500" />}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{album?.is_public ? 'Public Access' : 'Private'}</p>
                      <p className="text-[9px] text-gray-500 mt-1">{album?.is_public ? 'Anyone with the link can view' : 'Only you can view this sphere'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={togglePublic}
                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${album?.is_public ? 'bg-red-500/20 text-red-400' : 'bg-[#00FF94]/20 text-[#00FF94]'}`}
                  >
                    {album?.is_public ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {album?.is_public && (
                  <button 
                    onClick={copyShareLink}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-[#00FF94] transition-colors flex items-center justify-center gap-3"
                  >
                    <Share2 size={14} /> Copy Share Link
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-8 px-10 py-5 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-4">
            <span className="text-[9px] uppercase tracking-[0.3em] text-gray-400">Sensitivity</span>
            <input 
              type="range" min="0.5" max="10" step="0.1" 
              value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} 
              className="w-24 accent-[#00FF94] cursor-pointer" 
            />
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <button 
            onClick={() => setInvertControls(!invertControls)} 
            className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white hover:text-[#00FF94] transition-colors font-bold"
          >
            Mode: <span className="text-[#00FF94]">{invertControls ? 'Look' : 'Drag'}</span>
          </button>
          {!isCameraDenied && (
            <>
              <div className="w-[1px] h-8 bg-white/10"></div>
              {cameraStarted ? (
                <button onClick={() => setCameraStarted(false)} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-400 hover:text-white transition-colors font-bold">
                  <Camera size={14} /> Stop Camera
                </button>
              ) : (
                <button onClick={requestCamera} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#00FF94] hover:text-white transition-colors font-bold">
                  <Camera size={14} /> Init Camera
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-10 right-10 z-10 flex flex-col items-end gap-4">
        <button onClick={() => setDebugHands(!debugHands)} className="text-[9px] uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors font-bold">
          {debugHands ? 'Hide Feed' : 'Show Camera Feed'}
        </button>
        <div className={`w-56 aspect-video bg-black/80 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 origin-bottom-right ${debugHands ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}>
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none"></div>
        </div>
      </div>

      <AnimatePresence>
        {!webglSupported && (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center p-12 text-center">
            <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-white">WebGL Error</h3>
          </div>
        )}
        {isCameraDenied && cameraStarted && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-12 text-center">
            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Camera Access Denied</h3>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { supabase } from '../lib/supabase';
