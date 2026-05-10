/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as FramerMotion from 'motion/react';
const { motion, AnimatePresence } = FramerMotion;
import { Camera, Upload, Maximize2, Minimize2, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { useHandTracking } from './hooks/useHandTracking';
import { MemorySphere } from './components/MemorySphere';
import { Memory } from './types';
import { getAllMemories, saveMemory, clearAllMemories } from './lib/db';

export default function App() {
  const [hasError, setHasError] = useState(false);
  
  // Use useMemo for initial state to avoid uuidv4 issues at module level
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
      // Try WebGL2 first as it is more stable in modern environments
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL initialization failed during pre-check');
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
      // Trigger the browser's permission prompt, then immediately release
      // the temporary stream so the hook can open the real persistent one.
      const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      probe.getTracks().forEach(t => t.stop());
    } catch {
      // Permission denied — the hook will handle the error state
    } finally {
      // Always set started so the hook attempts its own stream (shows error if denied)
      setCameraStarted(true);
    }
  };

  // Load persistent memories on mount
  useEffect(() => {
    async function load() {
      const saved = await getAllMemories();
      if (saved.length > 0) {
        setMemories(prev => {
          // Deduplicate by ID to prevent "Duplicate Key" errors
          const combined = [...saved, ...prev];
          const uniqueMap = new Map();
          combined.forEach(m => uniqueMap.set(m.id, m));
          return Array.from(uniqueMap.values());
        });
      }
    }
    load();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const newMemory = {
          id: uuidv4(),
          url,
          title: file.name.split('.')[0]
        };
        
        // Save to IndexedDB for persistence
        await saveMemory(newMemory, file);
        
        setMemories(prev => [newMemory, ...prev]);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  };

  const clearMemories = async () => {
    await clearAllMemories();
    setMemories(initialMemRef);
  };

  if (hasError) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center p-10 text-center font-mono">
        <div className="space-y-6">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl text-white">SYSTEM_MOUNT_FAILED</h1>
          <p className="text-art-text-dim text-sm max-w-sm">
            Critical error encountered in the spatial runtime. 
            Attempting automatic restart...
          </p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest">
            Reload Interface
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[80px_240px_1fr_60px] grid-rows-[60px_1fr_100px] w-full h-screen bg-art-bg font-sans selection:bg-art-accent/30 overflow-hidden">
      
      {/* Rail Left */}
      <div className="row-start-1 row-end-4 col-start-1 border-r border-art-line flex flex-col items-center justify-between py-8">
        <div className="vertical-label">X_SYSTEM_OVERRIDE</div>
        <div className="w-[1px] h-24 bg-art-line"></div>
        <div className="vertical-label underline underline-offset-4">SPATIAL_MEM_V1</div>
      </div>

      {/* Header */}
      <header className="col-start-2 col-end-4 row-start-1 border-b border-art-line flex items-center justify-between px-10">
        <div className="text-[14px] font-[900] tracking-[0.2em] uppercase">SPATIAL.MEMORIES</div>
        <div className="flex items-center gap-6">
          {/* Gesture mode indicator — shown when camera is active */}
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
          {/* Tracking status */}
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
            <div 
              className="absolute h-full bg-art-text transition-all duration-300" 
              style={{ width: `${(sensitivity / 10) * 100}%` }}
            ></div>
            <input 
              type="range" 
              min="0.5" 
              max="10" 
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="absolute -top-1 left-0 w-full opacity-0 cursor-pointer h-3"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim block">System Feedback</label>
          <div className="text-[12px] font-mono leading-relaxed text-art-text-dim">
            Hand tracking logic migrated to GPU pipeline for stability.
          </div>
          {!cameraStarted && !isCameraDenied && (
            <button 
              onClick={requestCamera}
              className="w-full py-4 mt-4 bg-art-accent text-art-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:brightness-110 transition-all rounded-sm shadow-[0_0_20px_rgba(0,255,148,0.2)]"
            >
              Initialize Camera
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim block">Active Input</label>
          <div className="text-[13px] font-medium tracking-wide flex items-center gap-2">
            <Camera size={14} className="text-art-accent" />
            WEBCAM_01_PRIMARY
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => setDebugHands(!debugHands)}
            className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] border transition-all ${debugHands ? 'border-art-accent text-art-accent' : 'border-art-line text-art-text-dim'}`}
          >
            Debug View: {debugHands ? 'ON' : 'OFF'}
          </button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="col-start-3 row-start-2 relative overflow-hidden bg-[radial-gradient(circle_at_center,#111_0%,#080808_100%)]">
        {/* 3D Scene */}
        <div className="absolute inset-0">
          <Suspense fallback={
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/40">
              <Loader2 className="w-12 h-12 text-art-accent animate-spin" />
              <div className="space-y-2 text-center">
                <div className="text-[10px] uppercase tracking-[0.4em] text-art-accent animate-pulse">Initializing Flux_Engine</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-art-text-dim">Loading Spatial Textures...</div>
              </div>
            </div>
          }>
            <Canvas gl={{ antialias: false }}>
              <PerspectiveCamera makeDefault position={[0, 0, 0.1]} fov={75} near={0.01} far={1000} />
              <ambientLight intensity={0.9} />
              <pointLight position={[5, 5, 5]} intensity={1.5} />
              <MemorySphere 
                memories={memories} 
                resultsRef={resultsRef}
                sensitivity={sensitivity}
                onGestureMode={setGestureMode}
              />
            </Canvas>
          </Suspense>
        </div>

        {/* Camera Permission Error Overlay */}
        <AnimatePresence>
          {!webglSupported && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-black flex items-center justify-center p-12 text-center"
            >
              <div className="max-w-md space-y-10">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/30">
                  <span className="text-4xl">⚠️</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Hardware Error</h3>
                  <p className="text-art-text-dim text-sm leading-relaxed font-mono">
                    UNSUPPORTED_GRAPHICS_DEVICE<br/>
                    WebGL context could not be initialized automatically.<br/>
                    Please ensure "Hardware Acceleration" is enabled in browser settings.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setWebglSupported(true)}
                    className="w-full py-5 bg-white text-black text-[11px] uppercase tracking-[0.3em] font-black hover:bg-art-accent hover:text-art-bg transition-all transform active:scale-95"
                  >
                    Force GPU Initialization
                  </button>
                  <p className="text-[9px] uppercase tracking-widest text-art-text-dim pt-4">
                    Manual override may cause system instability
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {isCameraDenied && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-12 text-center"
            >
              <div className="max-w-md space-y-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 animate-pulse"></div>
                  <div className="relative w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/30">
                    <Camera size={40} className="text-red-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white">Access Denied</h3>
                  <p className="text-art-text-dim text-sm leading-relaxed font-mono">
                    CRITICAL: WEBCAM_PERMISSION_DENIED<br/>
                    Spatial tracking requires hardware authorization.<br/>
                    Please enable camera access in your browser settings.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-5 bg-white text-black text-[11px] uppercase tracking-[0.3em] font-black hover:bg-art-accent hover:text-art-bg transition-all transform active:scale-95"
                  >
                    Refresh Session
                  </button>
                  <p className="text-[9px] uppercase tracking-widest text-art-text-dim pt-4">
                    Automatic Switch: Mouse Precision Mode Active
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Webcam feed — ALWAYS in the DOM so videoRef is valid when the hook initialises.
            Toggled visible/hidden via CSS only; camera stream runs regardless. */}
        <div className={`absolute bottom-8 right-8 w-60 aspect-video art-border border bg-black rounded shadow-2xl overflow-hidden transition-all duration-300 ${debugHands ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}`}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            autoPlay
            muted
            playsInline
          />
          <div className="absolute inset-0 pointer-events-none border border-art-accent/30 opacity-40" />
          {debugHands && (
            <div className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-black/60 rounded text-art-accent">
              LIVE FEED
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="col-start-2 col-end-4 row-start-3 border-t border-art-line grid grid-cols-[240px_1fr_240px] items-center px-10">
        <label className="border border-art-text py-4 text-center text-[11px] uppercase tracking-[0.2em] cursor-pointer hover:bg-art-text hover:text-art-bg transition-all active:scale-95">
          + Upload Memory
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="text-[11px] text-art-text-dim text-center uppercase tracking-widest flex items-center justify-center gap-4">
          <span className="flex items-center gap-1"><Maximize2 size={10} /> PINCH TO ZOOM</span>
          <span className="w-1 h-1 bg-art-text-dim rounded-full"></span>
          <span className="flex items-center gap-1"><Minimize2 size={10} /> MOVE TO ROTATE</span>
        </div>

        <div className="text-right text-[9px] text-art-text-dim uppercase tracking-[0.2em]">
          Google AI Studio Engine
        </div>
      </footer>

      {/* Rail Right */}
      <div className="row-start-1 row-end-4 col-start-4 border-l border-art-line flex flex-col items-center justify-center py-8">
        <div className="vertical-label">EN_US_30FPS_STABLE</div>
      </div>

    </div>
  );
}
