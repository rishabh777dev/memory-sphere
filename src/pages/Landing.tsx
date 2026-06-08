import { useRef, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as FramerMotion from 'motion/react';
import { ArrowRight, MoveDown, MousePointer2, Camera, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

const { motion } = FramerMotion;

// --- 3D Scene Elements ---

function MemoryNode({ position, color, speed, index }: { position: [number, number, number], color: string, speed: number, index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime() * speed;
    meshRef.current.position.y += Math.sin(t + index) * 0.002;
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.z = t * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh position={position} ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <MeshTransmissionMaterial 
          backside
          samples={4}
          thickness={0.5}
          roughness={0.1}
          transmission={1}
          ior={1.2}
          chromaticAberration={0.02}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.1}
          temporalDistortion={0.1}
          color={color}
          attenuationDistance={0.5}
          attenuationColor={color}
        />
      </mesh>
    </Float>
  );
}

function Scene({ theme }: { theme: 'light' | 'dark' }) {
  const accentColor = theme === 'light' ? '#D97757' : '#E69A6B';
  const nodeColor = theme === 'light' ? '#F3EFEA' : '#2A2A2A';

  const nodes = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8 - 5
      ] as [number, number, number],
      color: i % 2 === 0 ? accentColor : nodeColor,
      speed: 0.3 + Math.random() * 0.4
    }));
  }, [accentColor, nodeColor]);

  useFrame((state) => {
    // Subtle mouse tilt for depth
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 1.5, 0.03);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.mouse.y * 1.5, 0.03);
    state.camera.lookAt(0, 0, -10);
  });

  return (
    <>
      <Environment preset={theme === 'light' ? 'studio' : 'night'} />
      <ambientLight intensity={theme === 'light' ? 0.8 : 0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={accentColor} />
      <pointLight position={[-10, -10, -10]} intensity={1} color={nodeColor} />
      
      {nodes.map((node, i) => (
        <MemoryNode key={i} index={i} {...node} />
      ))}

      <gridHelper args={[100, 40, accentColor, '#2A2A2A']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -15]} />
    </>
  );
}

// --- HTML Layout Components ---

const Section = ({ children, className = "", id = "" }: { children: React.ReactNode, className?: string, id?: string }) => (
  <section id={id} className={`min-h-screen w-full flex flex-col justify-center px-6 sm:px-10 md:px-24 relative z-10 ${className}`}>
    {children}
  </section>
);

export default function Landing() {
  const { theme } = useTheme();

  return (
    <div className="relative w-full h-screen bg-art-bg text-art-text font-sans selection:bg-art-accent selection:text-white transition-colors duration-700 overflow-y-auto custom-scrollbar scroll-smooth">
      
      {/* --- Fixed 3D Background --- */}
      <div className="fixed inset-0 z-0 opacity-60 md:opacity-100 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <Suspense fallback={null}>
            <Scene theme={theme} />
          </Suspense>
        </Canvas>
      </div>

      {/* --- Aesthetic Overlays --- */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* --- Navigation --- */}
      <nav className="fixed top-0 left-0 w-full p-6 sm:p-10 flex justify-between items-center z-[100] backdrop-blur-sm sm:backdrop-blur-none bg-art-bg/10 sm:bg-transparent border-b border-art-line sm:border-none transition-all duration-500">
        <div className="text-[10px] font-black tracking-[0.5em] uppercase flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-art-accent rounded-full shadow-[0_0_15px_var(--art-accent)]" />
          <span className="hidden sm:inline">Memory.Sphere</span>
          <span className="sm:hidden">M.S</span>
        </div>
        <div className="flex gap-4 sm:gap-10 items-center text-art-text">
          <div className="hidden md:flex gap-8 text-[9px] uppercase tracking-widest font-black text-art-text-dim">
            <a href="#interaction" className="hover:text-art-accent transition-colors">Navigation</a>
            <a href="#sharing" className="hover:text-art-accent transition-colors">Connectivity</a>
          </div>
          <ThemeToggle />
          <Link to="/auth" className="px-6 py-3 warm-glass rounded-full text-[10px] font-black uppercase tracking-widest text-art-text hover:text-art-accent hover:scale-105 transition-all shadow-sm">
            Access Vault
          </Link>
        </div>
      </nav>

      {/* --- Scrollable Content --- */}
      <main className="relative z-10">
        
        {/* Hero Section */}
        <Section>
          <div className="max-w-5xl mt-20 sm:mt-0">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-6xl sm:text-8xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] text-art-text">
                Spatial <br/>
                <span className="text-transparent opacity-40" style={{ WebkitTextStroke: '2px var(--art-text)' }}>Memories.</span>
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 text-art-text-dim text-base sm:text-xl font-medium tracking-tight max-w-lg leading-relaxed ml-2 border-l-2 border-art-accent pl-8"
            >
              A professional photographic vault designed for the era of spatial computing. Archive your life through geometric beauty and gesture-driven navigation.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="mt-16 flex flex-col sm:flex-row items-center gap-8"
            >
              <Link to="/auth" className="w-full sm:w-auto px-14 py-7 bg-art-text text-art-bg rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:bg-art-accent hover:text-white transition-all shadow-2xl shadow-art-text/10 flex items-center justify-center gap-4 group">
                Establish Clearance <ArrowRight size={18} className="group-hover:translate-x-3 transition-transform" />
              </Link>
              <div className="flex items-center gap-4 text-art-text-dim/60">
                <MoveDown size={20} className="animate-bounce" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-black">Begin Transmission</span>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* Features Grid */}
        <Section id="interaction" className="bg-art-text/[0.02]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-32 items-center">
            <div className="space-y-12">
              <div className="space-y-4">
                <div className="text-art-accent text-[11px] font-black uppercase tracking-[0.4em]">Protocol 01</div>
                <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-art-text leading-none">
                  Gesture <br/>Synthesis.
                </h2>
              </div>
              <p className="text-art-text-dim text-lg leading-loose max-w-md font-medium opacity-80">
                Leveraging advanced computer vision, Memory Sphere translates physical hand movements into fluid 3D navigation. No controllers required.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-art-line">
                {[
                  { icon: <Camera size={20} />, title: "Vision Engine", desc: "Local-first webcam processing via MediaPipe." },
                  { icon: <MousePointer2 size={20} />, title: "Spatial XYZ", desc: "True depth navigation in a mathematical sphere." }
                ].map((item, i) => (
                  <div key={i} className="space-y-4 group">
                    <div className="p-4 warm-glass inline-block rounded-2xl text-art-accent group-hover:scale-110 transition-transform shadow-sm">{item.icon}</div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-art-text">{item.title}</h3>
                    <p className="text-[10px] text-art-text-dim font-bold leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-10 bg-art-accent/5 rounded-full blur-[100px] group-hover:bg-art-accent/10 transition-colors" />
              <div className="relative aspect-square rounded-[4rem] warm-glass flex items-center justify-center p-12 shadow-2xl overflow-hidden border-art-glass-border">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl text-art-accent animate-pulse">
                    <Camera size={40} />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.5em] font-black text-art-text/30">Live Spatial Feed</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Sharing Section */}
        <Section id="sharing" className="items-center text-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-art-accent/5 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="max-w-4xl relative z-10 space-y-12">
            <div className="space-y-6">
              <div className="text-art-accent text-[11px] font-black uppercase tracking-[0.4em]">Protocol 02</div>
              <h2 className="text-6xl sm:text-9xl font-black uppercase tracking-tighter text-art-text leading-none">
                Linked <br/>Existence.
              </h2>
            </div>
            <p className="text-art-text-dim text-lg sm:text-2xl leading-relaxed max-w-2xl mx-auto font-medium">
              Every spatial vault generates a unique, immutable link. Share your perspective with the world in a single click.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pt-10">
              {['Public URI', 'Zero Latency', 'Privacy First', 'Cloud Sync'].map((tag) => (
                <div key={tag} className="px-10 py-5 warm-glass rounded-2xl text-[11px] font-black uppercase tracking-widest text-art-text-dim hover:text-art-text transition-colors shadow-sm">
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* CTA Footer */}
        <Section className="pb-24">
          <div className="w-full warm-glass p-12 sm:p-32 rounded-[5rem] shadow-2xl relative overflow-hidden text-center border-art-glass-border">
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-art-accent/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-art-accent/5 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
             
             <h2 className="text-5xl sm:text-8xl font-black uppercase tracking-tighter text-art-text mb-12 relative z-10 leading-[0.85]">
               Ready to <br/>Initialize?
             </h2>
             
             <Link to="/auth" className="inline-flex items-center gap-8 px-20 py-10 bg-art-text text-art-bg rounded-[2.5rem] text-[14px] font-black uppercase tracking-[0.4em] hover:bg-art-accent hover:text-white transition-all shadow-2xl shadow-art-text/20 group relative z-10 hover:scale-105 font-black">
               Start Session <ArrowRight size={20} className="group-hover:translate-x-4 transition-transform" />
             </Link>

             <footer className="mt-32 pt-16 border-t border-art-line flex flex-col sm:flex-row justify-between items-center gap-12 opacity-60">
                <div className="text-[10px] font-black tracking-[0.5em] uppercase text-art-text-dim">Memory Sphere v2.5.0</div>
                <div className="flex gap-12 text-[9px] font-black uppercase tracking-widest text-art-text-dim items-center">
                  <a href="https://github.com/rishabh777dev/memory-sphere" className="hover:text-art-accent transition-colors underline decoration-art-accent/20">Source</a>
                  <span className="text-art-line">/</span>
                  <a href="#" className="hover:text-art-accent transition-colors underline decoration-art-accent/20">Terms</a>
                </div>
             </footer>
          </div>
        </Section>
      </main>

    </div>
  );
}
