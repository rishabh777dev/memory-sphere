import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as FramerMotion from 'motion/react';
import { Camera, Maximize2, Minimize2, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useHandTracking } from '../hooks/useHandTracking';
import { MemorySphere } from '../components/MemorySphere';
import { Memory } from '../types';
import { getAllMemories, saveMemory, clearAllMemories } from '../lib/db';
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
        // Try fetching from Supabase
        const { data, error } = await supabase.from('photos').select('*').eq('album_id', albumId);
        
        if (!error && data && data.length > 0) {
          setMemories(data.map(p => ({
            id: p.id,
            url: p.image_url,
            title: 'Cloud Photo'
          })));
          return; // Success, skip local fallback
        }
      } catch (err) {
        console.warn('Supabase fetch failed, trying local fallback...');
      }

      // Fallback to local IndexedDB (for demo before Supabase is fully configured)
      const saved = await getAllMemories();
      if (saved.length > 0) {
        setMemories(prev => {
          const combined = [...saved, ...prev];
          const uniqueMap = new Map();
          combined.forEach(m => uniqueMap.set(m.id, m));
          return Array.from(uniqueMap.values());
        });
      }
    }
    load();
  }, [albumId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && albumId) {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${albumId}/${fileName}`;

        try {
          // Attempt Supabase Upload
          const { error: uploadError } = await supabase.storage.from('memory-sphere-images').upload(filePath, file);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('memory-sphere-images').getPublicUrl(filePath);
          
          const newPhotoRecord = {
             id: uuidv4(),
             album_id: albumId,
             image_url: publicUrlData.publicUrl
          };

          await supabase.from('photos').insert([newPhotoRecord]);

          setMemories(prev => [{ id: newPhotoRecord.id, url: newPhotoRecord.image_url, title: file.name }, ...prev]);
        } catch (err) {
          console.error("Supabase Upload failed, saving locally instead", err);
          
          // Local fallback
          const url = URL.createObjectURL(file);
          const newMemory = {
            id: uuidv4(),
            url,
            title: file.name.split('.')[0]
          };
          await saveMemory(newMemory, file);
          setMemories(prev => [newMemory, ...prev]);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  };

  if (hasError) return <div className="text-white">System Error</div>;

  return (
    <div className="grid grid-cols-[80px_240px_1fr_60px] grid-rows-[60px_1fr_100px] w-full h-screen bg-art-bg font-sans selection:bg-art-accent/30 overflow-hidden">
      
      {/* Rail Left */}
      <div className="row-start-1 row-end-4 col-start-1 border-r border-art-line flex flex-col items-center py-8 gap-8">
        <button onClick={() => navigate('/dashboard')} className="p-4 bg-art-accent/10 text-art-accent rounded-full hover:bg-art-accent hover:text-black transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="vertical-label">X_SYSTEM_OVERRIDE</div>
        <div className="w-[1px] h-24 bg-art-line"></div>
        <div className="vertical-label underline underline-offset-4">ALBUM_{albumId?.slice(0,4)}</div>
      </div>

      {/* Header */}
      <header className="col-start-2 col-end-4 row-start-1 border-b border-art-line flex items-center justify-between px-10">
        <div className="text-[14px] font-[900] tracking-[0.2em] uppercase">SPATIAL.MEMORIES</div>
        <div className="flex items-center gap-6">
          {cameraStarted && !isCameraDenied && (
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                gestureMode === 'rotate' ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' :
                gestureMode === 'zoom'   ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' :
                                           'bg-art-text-dim'
              }`} />
              <span className={`transition-colors duration-300 ${
                gestureMode === 'rotate' ? 'text-blue-400' :
                gestureMode === 'zoom'   ? 'text-yellow-400' :
                                           'text-art-text-dim'
              }`}>
                {gestureMode === 'rotate' ? '✋ Rotate' :
                 gestureMode === 'zoom'   ? '🤲 Zoom' :
                                           'Hands: Standby'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest font-bold">
            <div className={`w-1.5 h-1.5 rounded-full ${!cameraStarted ? 'bg-art-text-dim' : isCameraDenied ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-art-accent shadow-[0_0_8px_#00FF94]'}`}></div>
            <span className={!cameraStarted ? 'text-art-text-dim' : isCameraDenied ? 'text-red-500' : 'text-art-accent'}>
              {!cameraStarted ? 'Tracking: Standby' : isCameraDenied ? 'Camera Blocked: Mouse Mode Active' : 'System Operational: Tracking Active'}
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar Controls */}
      <aside className="col-start-2 row-start-2 border-r border-art-line p-10 flex flex-col gap-10">
        <div className="space-y-4">
          <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim block">Movement Speed</label>
          <div className="text-4xl font-light leading-none">
            {sensitivity.toFixed(2)}
            <span className="text-sm text-art-text-dim ml-1">m/s</span>
          </div>
          <div className="relative h-[2px] bg-art-line w-full">
            <div className="absolute h-full bg-art-text transition-all duration-300" style={{ width: `${(sensitivity / 10) * 100}%` }}></div>
            <input type="range" min="0.5" max="10" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="absolute -top-1 left-0 w-full opacity-0 cursor-pointer h-3" />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim block">System Feedback</label>
          <div className="text-[12px] font-mono leading-relaxed text-art-text-dim">
            Hand tracking logic migrated to GPU pipeline for stability.
          </div>
          {!cameraStarted && !isCameraDenied && (
            <button onClick={requestCamera} className="w-full py-4 mt-4 bg-art-accent text-art-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:brightness-110 transition-all rounded-sm shadow-[0_0_20px_rgba(0,255,148,0.2)]">
              Initialize Camera
            </button>
          )}
        </div>

        <div className="mt-auto space-y-4">
          <button onClick={() => setDebugHands(!debugHands)} className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] border transition-all ${debugHands ? 'border-art-accent text-art-accent' : 'border-art-line text-art-text-dim'}`}>
            Debug View: {debugHands ? 'ON' : 'OFF'}
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="col-start-3 row-start-2 relative overflow-hidden bg-[radial-gradient(circle_at_center,#111_0%,#080808_100%)]">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="absolute inset-0 flex justify-center items-center"><Loader2 className="animate-spin text-art-accent w-12 h-12" /></div>}>
            <Canvas gl={{ antialias: false }}>
              <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} near={0.01} far={1000} />
              <ambientLight intensity={0.9} />
              <pointLight position={[5, 5, 5]} intensity={1.5} />
              <MemorySphere memories={memories} resultsRef={resultsRef} sensitivity={sensitivity} onGestureMode={setGestureMode} />
            </Canvas>
          </Suspense>
        </div>

        {/* Camera Error Overlays */}
        <AnimatePresence>
          {!webglSupported && (
            <motion.div className="absolute inset-0 z-50 bg-black flex items-center justify-center p-12 text-center">
              <h3 className="text-2xl font-black uppercase text-white">WebGL Error</h3>
            </motion.div>
          )}
          {isCameraDenied && (
            <motion.div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-12 text-center">
              <h3 className="text-2xl font-black uppercase text-white">Camera Access Denied</h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Webcam feed */}
        <div className={`absolute bottom-8 right-8 w-60 aspect-video art-border border bg-black rounded shadow-2xl overflow-hidden transition-all duration-300 ${debugHands ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}>
          <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
          <div className="absolute inset-0 pointer-events-none border border-art-accent/30 opacity-40" />
        </div>
      </main>

      {/* Footer */}
      <footer className="col-start-2 col-end-4 row-start-3 border-t border-art-line grid grid-cols-[240px_1fr_240px] items-center px-10">
        <label className="border border-art-text py-4 text-center text-[11px] uppercase tracking-[0.2em] cursor-pointer hover:bg-art-text hover:text-art-bg transition-all active:scale-95">
          + Upload Photo
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="text-[11px] text-art-text-dim text-center uppercase tracking-widest flex items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Maximize2 size={10} /> PINCH TO ZOOM</span>
          <span className="w-1 h-1 bg-art-text-dim rounded-full"></span>
          <span className="flex items-center gap-1"><Minimize2 size={10} /> MOVE TO ROTATE</span>
        </div>

        <div className="text-right text-[9px] text-art-text-dim uppercase tracking-[0.2em]">
          Album ID: {albumId?.slice(0, 8)}...
        </div>
      </footer>

      {/* Rail Right */}
      <div className="row-start-1 row-end-4 col-start-4 border-l border-art-line flex flex-col items-center justify-center py-8">
        <div className="vertical-label">EN_US_30FPS_STABLE</div>
      </div>
    </div>
  );
}
