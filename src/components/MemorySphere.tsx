/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useMemo, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { Memory } from '../types';

import { Results } from '@mediapipe/hands';

interface MemorySphereProps {
  memories: Memory[];
  resultsRef: React.RefObject<Results | null>;
  sensitivity: number;
  onGestureMode?: (mode: 'idle' | 'rotate' | 'zoom') => void;
  invertControls?: boolean;
}

// ---------- constants ----------
// Radius when fully zoomed in (images spread out, immersive)
const RADIUS_EXPANDED = 18;
// Radius when fully zoomed out (images cluster into a tight sphere)
const RADIUS_CONTRACTED = 4.5;
// Image scale when contracted (small so they don't overlap)
const SCALE_CONTRACTED = 0.22;
// Image scale when expanded (match original feel)
const SCALE_EXPANDED = 1.0;

// Camera Z distance when fully contracted (pulled back to see whole sphere)
const CAM_Z_CONTRACTED = 18;
// Camera Z distance when normally expanded (inside sphere, wide angle)
const CAM_Z_EXPANDED = 0.1;
// Camera Z distance when super-zoomed in (very close to front images at radius 18)
const CAM_Z_SUPER = 15.5;
// FOV at normal expanded state
const FOV_NORMAL = 75;
// FOV at super-zoom (telephoto — makes front image fill the screen)
const FOV_SUPER = 18;

// Slow earth-like auto-rotation when no hands are present (radians/frame)
const AUTO_ROTATE_SPEED = 0.0007;
// Hand velocity decay per frame (0.88 = smooth coast-to-stop)
const HAND_VEL_DAMPEN = 0.88;
// Minimum hand delta to register (filters out micro-tremors)
const HAND_DEAD_ZONE = 0.004;
// How strongly hand movement translates to rotation velocity
const HAND_VEL_GAIN = 10;

// Two-hand zoom constants
// How strongly the change in inter-hand distance drives zoomT
const ZOOM_VEL_GAIN = 7;
// Minimum hand-distance change to register (filters tremor during zoom)
const ZOOM_DEAD_ZONE = 0.007;

// Re-using objects to avoid GC pressure
const _tempVec = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _lerpScale = new THREE.Vector3();
const _targetPos = new THREE.Vector3();

// ---------- Sub-component ----------
function MemoryItem({ memory, index, meshRefs }: any) {
  const texture = useTexture(memory.url) as THREE.Texture;
  return (
    <mesh ref={(el) => (meshRefs.current[index] = el)}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------- Fibonacci sphere point set ----------
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

  // Internal smooth state
  const smoothRotation = useRef({ x: 0, y: 0 });
  // zoomT: 0 = fully contracted (zoomed out), 1 = fully expanded (zoomed in)
  // Start at 1 so the initial view is immersive (expanded), same as before
  const zoomT = useRef(1);
  const mousePos = useRef({ x: 0, y: 0 });

  // Hand tracking — velocity-based rotation
  const rotVel = useRef({ x: 0, y: 0 });          // accumulated rotation velocity
  const prevHandPos = useRef<{ x: number; y: number } | null>(null); // last known hand pos
  const handActive = useRef(false);                 // true while a hand is tracked
  const autoRotBlend = useRef(1);                   // 1 = full auto-rotate (starts on)
  // Track last mouse activity to detect true idle state
  const lastMouseMoveTime = useRef(0);
  // Two-hand zoom tracking
  const prevTwoHandDist = useRef<number | null>(null); // distance between hands last frame
  const prevPinchDist = useRef<number | null>(null); // distance between thumb and index last frame

  // ---------- Input listeners ----------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = (e.clientX / size.width - 0.5) * Math.PI * 2;
      mousePos.current.y = (e.clientY / size.height - 0.5) * Math.PI * 2;
      lastMouseMoveTime.current = Date.now(); // stamp every real mouse movement
    };

    const handleWheel = (e: WheelEvent) => {
      // scroll down → zoom out (→ 0), scroll up → zoom in (→ 2)
      // Range: 0 = contracted sphere, 1 = immersive expanded, 2 = super close-up
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

  // Reset refs when memories change
  useEffect(() => {
    meshRefs.current = meshRefs.current.slice(0, memories.length);
  }, [memories.length]);

  // ---------- Precompute positions on both extremes ----------
  const count = useMemo(() => Math.max(memories.length, 30), [memories.length]);

  const expandedPositions = useMemo(() => buildSpherePoints(count, RADIUS_EXPANDED), [count]);
  const contractedPositions = useMemo(() => buildSpherePoints(count, RADIUS_CONTRACTED), [count]);

  // Smooth zoomT for animation
  const smoothZoomT = useRef(1);

  // ---------- Inverse quaternion for upright images ----------
  const _inverseGroupQuat = useMemo(() => new THREE.Quaternion(), []);

  // ---------- Per-frame update ----------
  useFrame(() => {
    if (!groupRef.current) return;

    _inverseGroupQuat.copy(groupRef.current.quaternion).invert();

    // --- Pinch-to-Grab Gesture Paradigm ---
    // A hand is only "active" if the thumb and index finger are pinching.
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
        
        if (pinchDist < PINCH_THRESHOLD) {
          activeHands.push(hand);
        }
      }
    }

    if (activeHands.length >= 2) {
      // ═══ TWO-HAND PINCH: Spread to Zoom ═══
      const h0 = activeHands[0][9];
      const h1 = activeHands[1][9];
      const dist = Math.sqrt(Math.pow(h0.x - h1.x, 2) + Math.pow(h0.y - h1.y, 2));

      if (prevTwoHandDist.current !== null) {
        const delta = dist - prevTwoHandDist.current;
        if (Math.abs(delta) > ZOOM_DEAD_ZONE) {
          zoomT.current = THREE.MathUtils.clamp(
            zoomT.current + delta * ZOOM_VEL_GAIN,
            0, 2
          );
        }
      }
      prevTwoHandDist.current = dist;
      prevHandPos.current = null; // Clear rotate state
      handActive.current = true;
      onGestureMode?.('zoom');

    } else if (activeHands.length === 1) {
      // ═══ ONE-HAND PINCH: Move to Rotate/Scroll ═══
      const hx = activeHands[0][9].x;
      const hy = activeHands[0][9].y;

      if (prevHandPos.current !== null) {
        const dx = hx - prevHandPos.current.x;
        const dy = hy - prevHandPos.current.y;
        
        // dir = 1 for Drag, -1 for Look
        const dir = invertControls ? -1 : 1;
        if (Math.abs(dx) > HAND_DEAD_ZONE) rotVel.current.y += dx * sensitivity * HAND_VEL_GAIN * dir;
        if (Math.abs(dy) > HAND_DEAD_ZONE) rotVel.current.x += dy * sensitivity * HAND_VEL_GAIN * dir;
      }
      prevHandPos.current = { x: hx, y: hy };
      prevTwoHandDist.current = null; // Clear zoom state
      handActive.current = true;
      onGestureMode?.('rotate');

    } else {
      // ═══ NO ACTIVE PINCH: Hovering (Letting go of the sphere) ═══
      prevHandPos.current = null;
      prevTwoHandDist.current = null;
      handActive.current = false;
      onGestureMode?.('idle');
    }

    // Decay velocity each frame (inertia / flywheel coast-to-stop)
    rotVel.current.x *= HAND_VEL_DAMPEN;
    rotVel.current.y *= HAND_VEL_DAMPEN;

    // Idle = no hands AND mouse hasn't moved for 1.5 seconds
    const mouseIdle = (Date.now() - lastMouseMoveTime.current) > 1500;
    const isIdle = !hasHands && mouseIdle;

    // Auto-rotate blends IN on idle, OUT the moment any interaction starts
    autoRotBlend.current = THREE.MathUtils.lerp(
      autoRotBlend.current,
      isIdle ? 1 : 0,
      0.03
    );

    smoothZoomT.current = THREE.MathUtils.lerp(smoothZoomT.current, zoomT.current, 0.06);
    const t = smoothZoomT.current;       // 0 = contracted, 1 = expanded, 2 = super-zoom
    const tBase = THREE.MathUtils.clamp(t, 0, 1);      // [0,1] — sphere shape phase
    const tSuper = THREE.MathUtils.clamp(t - 1, 0, 1); // [0,1] — super close-up phase

    // --- Rotation application ---
    if (hasHands) {
      // HAND MODE: apply velocity directly to rotation angle
      // Holding the hand still → zero delta → zero velocity → sphere stays still ✓
      groupRef.current.rotation.y += rotVel.current.y * 0.11;
      groupRef.current.rotation.x = THREE.MathUtils.clamp(
        groupRef.current.rotation.x + rotVel.current.x * 0.11,
        -Math.PI * 0.45,
        Math.PI * 0.45
      );
    } else if (!mouseIdle) {
      // MOUSE MODE (active): position-based targeting — only while mouse is moving
      // When mouse goes idle we stop this lerp so auto-rotation can accumulate freely
      smoothRotation.current.x = THREE.MathUtils.lerp(smoothRotation.current.x, mousePos.current.x, 0.06);
      smoothRotation.current.y = THREE.MathUtils.lerp(smoothRotation.current.y, mousePos.current.y, 0.06);
      
      const dir = invertControls ? -1 : 1;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        smoothRotation.current.x * sensitivity * dir,
        0.05
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        -smoothRotation.current.y * sensitivity * dir, // Re-added the negative sign to sync with Hand Y-axis
        0.05
      );
    }
    // IDLE: neither branch runs → rotation is free to accumulate from auto-rotate below

    // AUTO-ROTATE: slow earth-like Y spin — only active when truly idle
    // This will visibly spin since nothing is lerp-pulling the rotation back
    groupRef.current.rotation.y += AUTO_ROTATE_SPEED * autoRotBlend.current;

    // --- Camera Z: contracted (18) → expanded (0.1) → super-zoom (15.5 toward images) ---
    // Phase 1 [tBase]: pull camera from 18 down to 0.1 (enter the sphere)
    // Phase 2 [tSuper]: push camera from 0.1 forward to 15.5 (close to front images)
    const targetCamZ = tSuper > 0
      ? THREE.MathUtils.lerp(CAM_Z_EXPANDED, CAM_Z_SUPER, tSuper)
      : THREE.MathUtils.lerp(CAM_Z_CONTRACTED, CAM_Z_EXPANDED, tBase);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06);

    // --- FOV: normal during phases 0-1, narrows during super-zoom for telephoto effect ---
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pCam = camera as THREE.PerspectiveCamera;
      const targetFov = THREE.MathUtils.lerp(FOV_NORMAL, FOV_SUPER, tSuper);
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFov, 0.08);
      pCam.updateProjectionMatrix();
    }

    // --- Mesh positions, scales, and opacity ---
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;

      // Phase 1: interpolate position between contracted and expanded sphere
      const cPos = contractedPositions[i];
      const ePos = expandedPositions[i];
      if (!cPos || !ePos) return;

      // Positions stay at expanded radius during super-zoom (camera moves instead)
      _targetPos.set(
        THREE.MathUtils.lerp(cPos.x, ePos.x, tBase),
        THREE.MathUtils.lerp(cPos.y, ePos.y, tBase),
        THREE.MathUtils.lerp(cPos.z, ePos.z, tBase)
      );
      mesh.position.lerp(_targetPos, 0.08);

      // Screen-space distance for center-magnification effect
      mesh.getWorldPosition(_tempVec);
      _screenPos.copy(_tempVec).project(camera);
      const distToCenter = Math.sqrt(_screenPos.x * _screenPos.x + _screenPos.y * _screenPos.y);

      // Phase 1 scale: contracted → expanded with center-magnification
      const expandedScale = THREE.MathUtils.lerp(
        1.8,
        0.7,
        THREE.MathUtils.clamp(distToCenter * 2.5, 0, 1)
      );
      const phase1Scale = THREE.MathUtils.lerp(SCALE_CONTRACTED, SCALE_EXPANDED * expandedScale, tBase);

      // Phase 2 scale: center images grow even larger, off-center images shrink away
      // so the front image dominates the screen
      const superScale = THREE.MathUtils.lerp(
        phase1Scale,
        phase1Scale * THREE.MathUtils.lerp(2.8, 0.1, THREE.MathUtils.clamp(distToCenter * 1.2, 0, 1)),
        tSuper
      );

      _lerpScale.set(superScale, superScale, 1);
      mesh.scale.lerp(_lerpScale, 0.12);

      // Opacity
      const expandedOpacity = THREE.MathUtils.lerp(
        1,
        0.2,
        THREE.MathUtils.clamp(distToCenter * 1.5, 0, 1)
      );
      // During super-zoom: off-center images fade almost completely out
      const superOpacity = THREE.MathUtils.lerp(
        expandedOpacity,
        THREE.MathUtils.lerp(1, 0.02, THREE.MathUtils.clamp(distToCenter * 1.1, 0, 1)),
        tSuper
      );
      const targetOpacity = THREE.MathUtils.lerp(0.95, superOpacity, tBase);

      const material = mesh.material as THREE.MeshBasicMaterial;
      if (material) {
        material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);
      }

      // Keep images upright relative to screen
      mesh.quaternion.copy(_inverseGroupQuat).multiply(camera.quaternion);
    });
  });

  // Background accent dots
  const backgroundDots = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 45,
            (Math.random() - 0.5) * 45,
            (Math.random() - 0.5) * 45,
          ]}
        >
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial color="#00FF94" transparent opacity={0.15} />
        </mesh>
      )),
    []
  );

  return (
    <group ref={groupRef}>
      {memories.map((memory, i) => (
        <Suspense key={memory.id} fallback={null}>
          <MemoryItem memory={memory} index={i} meshRefs={meshRefs} />
        </Suspense>
      ))}
      <group>{backgroundDots}</group>
    </group>
  );
}
