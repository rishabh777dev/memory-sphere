import { Link } from 'react-router-dom';
import * as FramerMotion from 'motion/react';
const { motion } = FramerMotion;

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000_100%)]"></div>
      
      {/* Floating Orbs for Premium Feel */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-art-accent/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="z-10 text-center space-y-8 max-w-3xl px-6"
      >
        <h1 className="text-5xl md:text-7xl font-black uppercase tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500">
          Spatial<br />Memories
        </h1>
        
        <p className="text-art-text-dim text-lg md:text-xl font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          A futuristic, touchless 3D vault for your albums. Navigate your photos using hand gestures in a fully immersive mathematical sphere.
        </p>

        <div className="pt-10 flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link 
            to="/dashboard"
            className="px-10 py-5 bg-art-accent text-black text-xs font-black uppercase tracking-[0.3em] hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,255,148,0.3)]"
          >
            Enter the Vault
          </Link>
          <a 
            href="https://github.com/your-repo" 
            target="_blank" 
            rel="noreferrer"
            className="px-10 py-5 border border-art-line text-white text-xs font-bold uppercase tracking-[0.3em] hover:bg-white/5 transition-all"
          >
            Documentation
          </a>
        </div>
      </motion.div>

      {/* Footer / Decorative */}
      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-[10px] text-art-text-dim uppercase tracking-[0.4em] font-mono">
          Powered by React Three Fiber & MediaPipe
        </p>
      </div>
    </div>
  );
}
