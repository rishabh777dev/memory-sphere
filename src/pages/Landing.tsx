import { useRef, useMemo, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Float, Text, MeshTransmissionMaterial, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as FramerMotion from 'motion/react';
import { ArrowRight, MoveDown, Share2, MousePointer2, Camera, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const { motion } = FramerMotion;

function CanvasLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-art-accent w-10 h-10" />
        <span className="text-[10px] uppercase tracking-[0.3em] text-art-text-dim font-black">Initializing Scene</span>
      </div>
    </Html>
  );
}

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

function Scene() {
  const scroll = useScroll();
  const { camera } = useThree();
  const nodes = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 40 - (i * 2), // Spread vertically for scroll
        (Math.random() - 0.5) * 10 - 5
      ] as [number, number, number],
      color: i % 2 === 0 ? '#D97757' : '#F3EFEA',
      speed: 0.5 + Math.random() * 0.5
    }));
  }, []);

  useFrame((state) => {
    // Camera follow scroll
    const offset = scroll.offset;
    camera.position.y = -offset * 40;
    camera.lookAt(0, -offset * 40 - 5, -10);
    
    // Subtle mouse tilt
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 2, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, -offset * 40 + state.mouse.y * 2, 0.05);
  });

  return (
    <>
      <Environment preset="neutral" intensity={0.5} />
      <ambientLight intensity={0.8} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#D97757" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#F3EFEA" />
      
      {nodes.map((node, i) => (
        <MemoryNode key={i} index={i} {...node} />
      ))}

      {/* Abstract Grid background */}
      <gridHelper args={[100, 40, 0xD97757, 0x2A2A2A]} rotation={[Math.PI / 2, 0, 0]} position={[0, -20, -15]} opacity={0.05} transparent />
    </>
  );
}

// --- HTML Layout Components ---

const Section = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <section className={`min-h-screen w-full flex flex-col justify-center px-6 sm:px-10 md:px-20 relative ${className}`}>
    {children}
  </section>
);

export default function Landing() {
  return (
    <div className="h-screen w-full bg-art-bg text-art-text font-sans overflow-hidden">
      
      {/* Noise Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.02] mix-blend-multiply" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={<CanvasLoader />}>
          <ScrollControls pages={4} damping={0.2}>
            <Scene />
            
            <Scroll html>
              <div className="w-screen">
              
              {/* --- Hero Section --- */}
              <Section>
                <nav className="absolute top-0 left-0 w-full p-8 sm:p-12 flex justify-between items-center z-20">
                  <div className="text-[10px] font-black tracking-[0.5em] uppercase flex items-center gap-3">
                    <div className="w-2 h-2 bg-art-accent rounded-full shadow-[0_0_10px_rgba(217,119,87,0.5)]" />
                    Memory.Sphere
                  </div>
                  <div className="hidden sm:flex gap-10 text-[9px] uppercase tracking-widest font-bold text-art-text-dim items-center">
                    <a href="#about" className="hover:text-art-accent transition-colors">Philosophy</a>
                    <a href="#tech" className="hover:text-art-accent transition-colors">Technology</a>
                    <Link to="/auth" className="text-art-text hover:text-art-accent transition-colors underline underline-offset-4">Vault Access</Link>
                    <ThemeToggle />
                  </div>
                </nav>

                <div className="max-w-4xl">
                  <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
                    className="text-6xl sm:text-8xl md:text-[9rem] font-black uppercase tracking-tighter leading-[0.85] text-art-text"
                  >
                    Your Memories, <br/>
                    <span className="text-transparent [-webkit-text-stroke:1px_rgba(42,42,42,0.3)] sm:[-webkit-text-stroke:2px_rgba(42,42,42,0.3)]">Spatialized.</span>
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
                    className="mt-10 text-art-text-dim text-sm sm:text-lg font-medium tracking-tight max-w-md leading-relaxed"
                  >
                    A minimalist photographic vault designed for the future of computing. Navigate your life through mathematical beauty.
                  </motion.p>

                  <div className="mt-16 flex flex-col sm:flex-row items-center gap-8">
                    <Link to="/auth" className="w-full sm:w-auto px-12 py-6 bg-art-text text-art-bg rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-art-accent hover:text-white transition-all shadow-xl shadow-art-text/10 flex items-center justify-center gap-4 group">
                      Initialize Vault <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                    </Link>
                    <div className="flex items-center gap-4 text-art-text-dim animate-bounce sm:animate-none">
                      <MoveDown size={20} className="sm:animate-bounce" />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black">Scroll to explore</span>
                    </div>
                  </div>
                </div>
              </Section>

              {/* --- Experience Section --- */}
              <Section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                  <div className="order-2 md:order-1">
                    <div className="inline-block px-4 py-2 warm-glass rounded-full text-[9px] uppercase tracking-widest font-black text-art-accent mb-6 shadow-sm">
                      01 / The Interface
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-art-text leading-none">
                      Spatial <br/>Interaction.
                    </h2>
                    <p className="mt-8 text-art-text-dim text-sm sm:text-base leading-loose max-w-sm">
                      Forget clicking and dragging. Our gesture-engine uses computer vision to map your physical movements directly into the 3D space.
                    </p>
                    
                    <ul className="mt-10 space-y-6">
                      {[
                        { icon: <Camera size={16} />, title: "Vision Tracking", desc: "No sensors. Just your webcam and MediaPipe." },
                        { icon: <MousePointer2 size={16} />, title: "Precision Depth", desc: "True XYZ navigation in a Fibonacci cluster." }
                      ].map((item, i) => (
                        <li key={i} className="flex gap-6 items-start">
                          <div className="p-3 bg-white border border-art-line rounded-xl shadow-sm text-art-accent">{item.icon}</div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-art-text">{item.title}</p>
                            <p className="text-[10px] text-art-text-dim mt-1 font-bold">{item.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="order-1 md:order-2">
                    <div className="w-full aspect-square rounded-[3rem] warm-glass flex items-center justify-center p-10 shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-art-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="text-center relative z-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                          <Share2 size={32} className="text-art-accent" />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.4em] font-black text-art-text opacity-40">Interactive Component</p>
                      </div>
                    </div>
                  </div>
                </div>Section
              </Section>

              {/* --- Social Section --- */}
              <Section>
                <div className="text-center max-w-3xl mx-auto">
                  <div className="inline-block px-4 py-2 warm-glass rounded-full text-[9px] uppercase tracking-widest font-black text-art-accent mb-8 shadow-sm">
                    02 / Connectivity
                  </div>
                  <h2 className="text-5xl sm:text-7xl font-black uppercase tracking-tight text-art-text mb-10 leading-tight">
                    Share your <br/>Perspective.
                  </h2>
                  <p className="text-art-text-dim text-sm sm:text-lg leading-relaxed mb-12">
                    Generate unique, immutable links to your spatial vaults. Allow others to step into your world without the friction of app stores or hardware.
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-6">
                    {['Public URI', 'Zero Latency', 'Privacy First'].map((tag) => (
                      <div key={tag} className="px-8 py-4 warm-glass border-white rounded-2xl text-[10px] font-black uppercase tracking-widest text-art-text-dim">
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* --- CTA Section --- */}
              <Section className="items-center text-center">
                <div className="w-full max-w-5xl warm-glass p-12 sm:p-24 rounded-[4rem] shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-art-accent/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                   
                   <h2 className="text-4xl sm:text-7xl font-black uppercase tracking-tighter text-art-text mb-8 relative z-10">
                     Ready to <br/>Synthesize?
                   </h2>
                   <p className="text-art-text-dim text-[11px] uppercase tracking-[0.5em] mb-12 font-black opacity-60">Establish clearance to continue</p>
                   
                   <Link to="/auth" className="inline-flex items-center gap-6 px-16 py-8 bg-art-text text-art-bg rounded-3xl text-[12px] font-black uppercase tracking-[0.4em] hover:bg-art-accent hover:text-white transition-all shadow-2xl shadow-art-text/20 group relative z-10">
                     Initialize Archive <ArrowRight size={18} className="group-hover:translate-x-3 transition-transform" />
                   </Link>

                   <footer className="mt-24 pt-12 border-t border-art-line flex flex-col sm:flex-row justify-between items-center gap-8 opacity-40">
                      <div className="text-[9px] font-black tracking-[0.3em] uppercase">Memory Sphere v2.4.0</div>
                      <div className="flex gap-10 text-[9px] font-black uppercase tracking-widest">
                        <a href="https://github.com/rishabh777dev/memory-sphere" className="hover:text-art-accent">Source</a>
                        <a href="#" className="hover:text-art-accent">Licensing</a>
                      </div>
                   </footer>
                </div>
              </Section>

            </div>
          </Scroll>
        </ScrollControls>
      </Suspense>
    </Canvas>

    </div>
  );
}
