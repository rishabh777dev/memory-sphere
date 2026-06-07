/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useMemo, useEffect, Suspense, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture, Html } from '@react-three/drei';
import { Memory } from '../types';
import { cacheService } from '../services/cache';
import { Results } from '@mediapipe/hands';

interface MemorySphereProps {
  memories: Memory[];
  resultsRef: React.RefObject<Results | null>;
  sensitivity: number;
  onGestureMode?: (mode: 'idle' | 'rotate' | 'zoom') => void;
  invertControls?: boolean;
}

const RADIUS_EXPANDED = 18;
const RADIUS_CONTRACTED = 4.5;
const SCALE_CONTRACTED = 0.22;
const SCALE_EXPANDED = 1.0;
const CAM_Z_CONTRACTED = 18;
const CAM_Z_EXPANDED = 0.1;
const CAM_Z_SUPER = 15.5;
const FOV_NORMAL = 75;
const FOV_SUPER = 18;
const AUTO_ROTATE_SPEED = 0.0007;
const HAND_VEL_DAMPEN = 0.88;
const HAND_DEAD_ZONE = 0.004;
const HAND_VEL_GAIN = 10;
const ZOOM_VEL_GAIN = 7;
const ZOOM_DEAD_ZONE = 0.007;

const _tempVec = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _lerpScale = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

interface MemoryItemProps {
  memory: Memory;
  index: number;
  meshRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  onHover: (id: string | null) => void;
  hoveredId: string | null;
}

function MemoryItem({ memory, index, meshRefs, onHover, hoveredId }: MemoryItemProps) {
  const [cachedUrl, setCachedUrl] = useState(memory.url);
  
  useEffect(() => {
    cacheService.cacheImage(memory.url).then(setCachedUrl);
  }, [memory.url]);

  const texture = useTexture(cachedUrl) as THREE.Texture;
  const isHovered = hoveredId === memory.id;

  return (
    <mesh 
      ref={(el) => (meshRefs.current[index] = el)}
      onPointerOver={() => onHover(memory.id)}
      onPointerOut={() => onHover(null)}
    >
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        side={THREE.DoubleSide} 
        toneMapped={false}
      />
      {isHovered && memory.title && (
        <Html distanceFactor={10} position={[0, -2, 0]} center>
          <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white pointer-events-none whitespace-nowrap">
            <p className="text-xs font-black uppercase tracking-[0.2em]">{memory.title}</p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

function buildSpherePoints(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    points.push(
      new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius)
    );
  }
  return points;
}

export function MemorySphere({ memories, resultsRef, sensitivity, onGestureMode, invertControls = false }: MemorySphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const { camera, size } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const smoothRotation = useRef({ x: 0, y: 0 });
  const zoomT = useRef(1);
  const mousePos = useRef({ x: 0, y: 0 });
  const rotVel = useRef({ x: 0, y: 0 });
  const prevHandPos = useRef<{ x: number; y: number } | null>(null);
  const handActive = useRef(false);
  const autoRotBlend = useRef(1);
  const lastMouseMoveTime = useRef(0);
  const prevTwoHandDist = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / size.width - 0.5) * Math.PI * 2;
      mousePos.current.y = (e.clientY / size.height - 0.5) * Math.PI * 2;
      lastMouseMoveTime.current = Date.now();
    };

    const handleWheel = (e: WheelEvent) => {
      const delta = -e.deltaY * 0.0008;
      zoomT.current = THREE.MathUtils.clamp(zoomT.current + delta, 0, 2);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [size.width, size.height]);

  useEffect(() => {
    meshRefs.current = meshRefs.current.slice(0, memories.length);
  }, [memories.length]);

  const count = useMemo(() => Math.max(memories.length, 30), [memories.length]);
  const expandedPositions = useMemo(() => buildSpherePoints(count, RADIUS_EXPANDED), [count]);
  const contractedPositions = useMemo(() => buildSpherePoints(count, RADIUS_CONTRACTED), [count]);
  const smoothZoomT = useRef(1);
  const _inverseGroupQuat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    if (!groupRef.current) return;

    _inverseGroupQuat.copy(groupRef.current.quaternion).invert();

    const results = resultsRef.current;
    const handCount = results?.multiHandLandmarks?.length ?? 0;
    const hasHands = handCount >= 1;
    const PINCH_THRESHOLD = 0.05;
    const activeHands = [];

    if (hasHands) {
      for (let i = 0; i < handCount; i++) {
        const hand = results.multiHandLandmarks[i];
        const thumb = hand[4];
        const index = hand[8];
        const pinchDist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
        if (pinchDist < PINCH_THRESHOLD) activeHands.push(hand);
      }
    }

    if (activeHands.length >= 2) {
      const h0 = activeHands[0][9];
      const h1 = activeHands[1][9];
      const dist = Math.sqrt(Math.pow(h0.x - h1.x, 2) + Math.pow(h0.y - h1.y, 2));
      if (prevTwoHandDist.current !== null) {
        const delta = dist - prevTwoHandDist.current;
        if (Math.abs(delta) > ZOOM_DEAD_ZONE) zoomT.current = THREE.MathUtils.clamp(zoomT.current + delta * ZOOM_VEL_GAIN, 0, 2);
      }
      prevTwoHandDist.current = dist;
      prevHandPos.current = null;
      handActive.current = true;
      onGestureMode?.('zoom');
    } else if (activeHands.length === 1) {
      const hx = activeHands[0][9].x;
      const hy = activeHands[0][9].y;
      if (prevHandPos.current !== null) {
        const dx = hx - prevHandPos.current.x;
        const dy = hy - prevHandPos.current.y;
        const dir = invertControls ? -1 : 1;
        if (Math.abs(dx) > HAND_DEAD_ZONE) rotVel.current.y += dx * sensitivity * HAND_VEL_GAIN * dir;
        if (Math.abs(dy) > HAND_DEAD_ZONE) rotVel.current.x += dy * sensitivity * HAND_VEL_GAIN * dir;
      }
      prevHandPos.current = { x: hx, y: hy };
      prevTwoHandDist.current = null;
      handActive.current = true;
      onGestureMode?.('rotate');
    } else {
      prevHandPos.current = null;
      prevTwoHandDist.current = null;
      handActive.current = false;
      onGestureMode?.('idle');
    }

    rotVel.current.x *= HAND_VEL_DAMPEN;
    rotVel.current.y *= HAND_VEL_DAMPEN;

    const mouseIdle = (Date.now() - lastMouseMoveTime.current) > 1500;
    const isIdle = !hasHands && mouseIdle;

    autoRotBlend.current = THREE.MathUtils.lerp(autoRotBlend.current, isIdle ? 1 : 0, 0.03);
    smoothZoomT.current = THREE.MathUtils.lerp(smoothZoomT.current, zoomT.current, 0.06);
    const t = smoothZoomT.current;
    const tBase = THREE.MathUtils.clamp(t, 0, 1);
    const tSuper = THREE.MathUtils.clamp(t - 1, 0, 1);

    if (hasHands) {
      groupRef.current.rotation.y += rotVel.current.y * 0.11;
      groupRef.current.rotation.x = THREE.MathUtils.clamp(groupRef.current.rotation.x + rotVel.current.x * 0.11, -Math.PI * 0.45, Math.PI * 0.45);
    } else if (!mouseIdle) {
      smoothRotation.current.x = THREE.MathUtils.lerp(smoothRotation.current.x, mousePos.current.x, 0.06);
      smoothRotation.current.y = THREE.MathUtils.lerp(smoothRotation.current.y, mousePos.current.y, 0.06);
      const dir = invertControls ? -1 : 1;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, smoothRotation.current.x * sensitivity * dir, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -smoothRotation.current.y * sensitivity * dir, 0.05);
    }
    groupRef.current.rotation.y += AUTO_ROTATE_SPEED * autoRotBlend.current;

    const targetCamZ = tSuper > 0 ? THREE.MathUtils.lerp(CAM_Z_EXPANDED, CAM_Z_SUPER, tSuper) : THREE.MathUtils.lerp(CAM_Z_CONTRACTED, CAM_Z_EXPANDED, tBase);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06);

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      const targetFov = THREE.MathUtils.lerp(FOV_NORMAL, FOV_SUPER, tSuper);
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFov, 0.08);
      pCam.updateProjectionMatrix();
    }

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const cPos = contractedPositions[i];
      const ePos = expandedPositions[i];
      if (!cPos || !ePos) return;
      _targetPos.set(THREE.MathUtils.lerp(cPos.x, ePos.x, tBase), THREE.MathUtils.lerp(cPos.y, ePos.y, tBase), THREE.MathUtils.lerp(cPos.z, ePos.z, tBase));
      mesh.position.lerp(_targetPos, 0.08);

      mesh.getWorldPosition(_tempVec);
      _screenPos.copy(_tempVec).project(camera);
      const distToCenter = Math.sqrt(_screenPos.x * _screenPos.x + _screenPos.y * _screenPos.y);

      const expandedScale = THREE.MathUtils.lerp(1.8, 0.7, THREE.MathUtils.clamp(distToCenter * 2.5, 0, 1));
      const phase1Scale = THREE.MathUtils.lerp(SCALE_CONTRACTED, SCALE_EXPANDED * expandedScale, tBase);
      const superScale = THREE.MathUtils.lerp(phase1Scale, phase1Scale * THREE.MathUtils.lerp(2.8, 0.1, THREE.MathUtils.clamp(distToCenter * 1.2, 0, 1)), tSuper);

      _lerpScale.set(superScale, superScale, 1);
      mesh.scale.lerp(_lerpScale, 0.12);

      const expandedOpacity = THREE.MathUtils.lerp(1, 0.2, THREE.MathUtils.clamp(distToCenter * 1.5, 0, 1));
      const superOpacity = THREE.MathUtils.lerp(expandedOpacity, THREE.MathUtils.lerp(1, 0.02, THREE.MathUtils.clamp(distToCenter * 1.1, 0, 1)), tSuper);
      const targetOpacity = THREE.MathUtils.lerp(0.95, superOpacity, tBase);

      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material) material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
      mesh.quaternion.copy(_inverseGroupQuat).multiply(camera.quaternion);
    });
  });

  const backgroundDots = useMemo(() => Array.from({ length: 20 }).map((_, i) => (
    <mesh key={i} position={[(Math.random() - 0.5) * 45, (Math.random() - 0.5) * 45, (Math.random() - 0.5) * 45]}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshBasicMaterial color="#00FF94" transparent opacity={0.15} />
    </mesh>
  )), []);

  return (
    <group ref={groupRef}>
      {memories.map((memory, i) => (
        <Suspense key={memory.id} fallback={null}>
          <MemoryItem 
            memory={memory} 
            index={i} 
            meshRefs={meshRefs} 
            onHover={setHoveredId} 
            hoveredId={hoveredId} 
          />
        </Suspense>
      ))}
      <group>{backgroundDots}</group>
    </group>
  );
}
