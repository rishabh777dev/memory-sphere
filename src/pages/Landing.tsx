import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as FramerMotion from 'motion/react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';

const { motion, AnimatePresence } = FramerMotion;

// --- 3D Background Blob ---
function BackgroundBlob() {
  const meshRef = useRef<any>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={2.5}>
      <MeshDistortMaterial 
        color="#00FF94" 
        attach="material" 
        distort={0.4} 
        speed={1.5} 
        roughness={0.2}
        wireframe={true}
        transparent={true}
        opacity={0.15}
      />
    </Sphere>
  );
}

export default function Landing() {
  const [isHovering, setIsHovering] = useState(false);

  // Text reveal animation variants
  const containerVars: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVars: any = {
    hidden: { y: 100, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20 } }
  };

  return (
    <div className="relative min-h-screen bg-[#030303] text-white font-sans overflow-hidden">
      
      {/* --- Noise Overlay --- */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* --- 3D Background --- */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <BackgroundBlob />
        </Canvas>
      </div>

      {/* --- Main Content --- */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between px-10 py-12 md:px-20 md:py-16">
        
        {/* Nav */}
        <nav className="flex justify-between items-center">
          <div className="text-[10px] font-black tracking-[0.4em] uppercase flex items-center gap-3">
            <div className="w-3 h-3 bg-art-accent rounded-full animate-pulse" />
            Spatial.Memories
          </div>
          <div className="text-[9px] text-art-text-dim tracking-widest uppercase">
            v2.0.0 / WebGL / MediaPipe
          </div>
        </nav>

        {/* Hero */}
        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start max-w-5xl mt-20"
        >
          <div className="overflow-hidden">
            <motion.h1 variants={itemVars} className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.85] text-white mix-blend-difference">
              Touch The
            </motion.h1>
          </div>
          <div className="overflow-hidden mb-10">
            <motion.h1 variants={itemVars} className="text-6xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.85] text-transparent [-webkit-text-stroke:2px_#fff] md:[-webkit-text-stroke:3px_#fff]">
              Intangible.
            </motion.h1>
          </div>

          <motion.div variants={itemVars} className="flex flex-col md:flex-row gap-8 items-start md:items-center w-full mt-10">
            <p className="text-art-text-dim text-sm md:text-base font-light tracking-wide max-w-md leading-relaxed">
              A paradigm shift in digital archiving. Navigate your photographic memories using pure spatial hand gestures in a boundless mathematical sphere.
            </p>

            <Link 
              to="/auth"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative px-12 py-6 bg-transparent border border-art-line overflow-hidden ml-auto mt-10 md:mt-0"
            >
              <div className="absolute inset-0 bg-art-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]" />
              <span className="relative z-10 text-xs font-black uppercase tracking-[0.3em] group-hover:text-black transition-colors duration-500">
                Initialize Vault
              </span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-end gap-4 border-t border-white/10 pt-8 mt-20">
          <div className="text-[10px] text-art-text-dim tracking-[0.3em] uppercase max-w-sm leading-relaxed">
            Built for the future. An open-source spatial computing experiment.
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold">
            <a href="https://github.com/your-repo" className="hover:text-art-accent transition-colors">GitHub Repository</a>
            <span className="text-art-text-dim">/</span>
            <a href="#" className="hover:text-art-accent transition-colors">Architecture Doc</a>
          </div>
        </footer>
      </div>

    </div>
  );
}
