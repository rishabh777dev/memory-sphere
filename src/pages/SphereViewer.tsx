import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as FramerMotion from 'motion/react';
import { Camera, Maximize2, Minimize2, Loader2, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useHandTracking } from '../hooks/useHandTracking';
import { MemorySphere } from '../components/MemorySphere';
import { Memory } from '../types';
import { supabase } from '../lib/supabase';

const { motion, AnimatePresence } = FramerMotion;

export default function SphereViewer() {
  const { id: albumId } = useParams();
  const navigate = useNavigate();
  
  const [hasError, setHasError] = useState(false);
  
  // Initial fallback memories
  const initialMemRef = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    id: uuidv4(),
    url: `https://picsum.photos/seed/mem${i}/800/800`,
    title: `Memory #${i + 1}`
  })), []);

  const [memories, setMemories] = useState<Memory[]>(initialMemRef);
  const [sensitivity, setSensitivity] = useState(4);
  const [debugHands, setDebugHands] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [gestureMode, setGestureMode] = useState<'idle' | 'rotate' | 'zoom'>('idle');
  const [invertControls, setInvertControls] = useState(true); // Default to Look mode

  // Check WebGL support on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch (e) {
      setWebglSupported(false);
    }
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { resultsRef, isCameraDenied } = useHandTracking(videoRef, cameraStarted);

  const requestCamera = async () => {
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach(t => t.stop());
    } catch {
      // Permission denied
    } finally {
      setCameraStarted(true);
    }
  };

  // Load photos for this specific album
  useEffect(() => {
    async function load() {
      if (!albumId) return;

      try {
        const { data, error } = await supabase.from('photos').select('*').eq('album_id', albumId);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setMemories(data.map(p => ({
            id: p.id,
            url: p.image_url,
            title: 'Memory'
          })));
        } else {
          setMemories([]); // Empty album
        }
      } catch (err) {
        console.error('Supabase fetch failed', err);
      }
    }
    load();
  }, [albumId]);

  if (hasError) return <div className="text-white">System Error</div>;

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans text-white">
      
      {/* Full-bleed Canvas Area */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000_100%)]">
        <Suspense fallback={<div className="absolute inset-0 flex justify-center items-center"><Loader2 className="animate-spin text-art-accent w-12 h-12" /></div>}>
          <Canvas gl={{ antialias: false }}>
            <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} near={0.01} far={1000} />
            <ambientLight intensity={0.9} />
            <pointLight position={[5, 5, 5]} intensity={1.5} />
            <MemorySphere memories={memories} resultsRef={resultsRef} sensitivity={sensitivity} onGestureMode={setGestureMode} invertControls={invertControls} />
          </Canvas>
        </Suspense>
      </div>

      {/* Floating Top Left: Navigation & Branding */}
      <div className="absolute top-8 left-8 z-10 flex flex-col gap-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-art-text-dim hover:text-white transition-all transform hover:-translate-x-2">
          <ArrowLeft size={14} /> Vault
        </button>
        <div className="text-2xl font-black tracking-[0.3em] uppercase leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-600">
          Spatial<br/>Memories
        </div>
      </div>

      {/* Floating Top Right: Status HUD */}
      <div className="absolute top-8 right-8 z-10 flex flex-col items-end gap-3">
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-[9px] uppercase tracking-widest font-bold">
          <div className={`w-2 h-2 rounded-full ${!cameraStarted ? 'bg-gray-500' : isCameraDenied ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-[#00FF94] shadow-[0_0_10px_#00FF94]'}`}></div>
          <span className={!cameraStarted ? 'text-gray-400' : isCameraDenied ? 'text-red-400' : 'text-[#00FF94]'}>
            {cameraStarted ? (isCameraDenied ? 'Camera Blocked' : 'Tracking Active') : 'Tracking Standby'}
          </span>
        </div>

        {cameraStarted && !isCameraDenied && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl text-[9px] uppercase tracking-widest font-bold">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              gestureMode === 'rotate' ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' :
              gestureMode === 'zoom'   ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' :
                                         'bg-gray-600'
            }`} />
            <span className="text-white">
              {gestureMode === 'rotate' ? 'Rotate Mode' :
               gestureMode === 'zoom'   ? 'Zoom Mode' :
                                         'Hovering (Safe)'}
            </span>
          </div>
        )}
      </div>

      {/* Floating Bottom Center: The Glass Dock */}
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

      {/* Floating Bottom Right: PIP Camera Feed */}
      <div className="absolute bottom-10 right-10 z-10 flex flex-col items-end gap-4">
        <button onClick={() => setDebugHands(!debugHands)} className="text-[9px] uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors font-bold">
          {debugHands ? 'Hide Feed' : 'Show Camera Feed'}
        </button>
        <div className={`w-56 aspect-video bg-black/80 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 origin-bottom-right ${debugHands ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}>
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] pointer-events-none"></div>
          <div className="absolute bottom-3 left-3 text-[8px] uppercase tracking-widest text-[#00FF94] bg-black/50 px-2 py-1 rounded backdrop-blur-md">Local Processing</div>
        </div>
      </div>

      {/* Camera Error Overlays */}
      <AnimatePresence>
        {!webglSupported && (
          <motion.div className="absolute inset-0 z-50 bg-black flex items-center justify-center p-12 text-center">
            <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-white">WebGL Error</h3>
          </motion.div>
        )}
        {isCameraDenied && (
          <motion.div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-12 text-center">
            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white">Camera Access Denied</h3>
            <p className="text-gray-400 mt-4 tracking-widest text-sm">Please allow camera permissions to use spatial gestures.</p>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
