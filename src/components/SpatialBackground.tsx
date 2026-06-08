import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../hooks/useTheme';

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
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshPhysicalMaterial 
          transparent
          transmission={0.95}
          thickness={1}
          roughness={0.05}
          ior={1.5}
          color={color}
          metalness={0.05}
        />
      </mesh>
    </Float>
  );
}

function Scene({ theme }: { theme: 'light' | 'dark' }) {
  const accentColor = '#E79A6B';
  const nodeColor = theme === 'light' ? '#E3DBC7' : '#2A2A2A'; 

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
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, state.mouse.x * 1.5, 0.03);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, state.mouse.y * 1.5, 0.03);
    state.camera.lookAt(0, 0, -10);
  });

  return (
    <>
      <Environment preset={theme === 'light' ? 'studio' : 'night'} />
      <ambientLight intensity={theme === 'light' ? 1.0 : 0.5} />
      <pointLight position={[10, 10, 10]} intensity={2.0} color={accentColor} />
      <pointLight position={[-10, -10, -10]} intensity={1.5} color={nodeColor} />
      {nodes.map((node, i) => (
        <MemoryNode key={i} index={i} {...node} />
      ))}
      <gridHelper args={[100, 40, accentColor, theme === 'light' ? '#E3DBC7' : '#2A2A2A']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -15]} />
    </>
  );
}

export function SpatialBackground() {
  const { theme } = useTheme();

  return (
    <div className="fixed inset-0 z-0 opacity-100 pointer-events-none transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
          <Scene theme={theme} />
        </Suspense>
      </Canvas>
    </div>
  );
}
