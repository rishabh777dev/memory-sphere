# 🌐 Spatial Memory Sphere

A cutting-edge 3D spatial interface for viewing memories and images, fully controllable through **hand gestures** via your webcam. 

This project explores a futuristic, touch-less way to interact with media in a 3D space, similar to sci-fi spatial interfaces. The images are mapped onto a mathematical Fibonacci sphere, which you can rotate, zoom into, and navigate using just your hands.

---

## 🛠️ Technologies Used

- **React + Vite + TypeScript**: Core framework for building the UI and managing application state.
- **Three.js & React-Three-Fiber (R3F)**: The 3D engine used to render the memories, calculate the Fibonacci sphere layout, and manage the camera mathematically.
- **Google MediaPipe Hands**: Machine Learning library used for real-time, browser-based hand tracking.
- **IndexedDB (`idb`)**: Used to persist user-uploaded memories locally in the browser so they aren't lost on refresh.
- **Tailwind CSS & Framer Motion**: For the sleek, premium UI styling and fluid animations.

---

## ✋ How the Hand Gesture Tracking Works

The application uses **Google MediaPipe**, not OpenCV. 

Unlike traditional computer vision approaches that require heavy backend processing (like OpenCV), **MediaPipe runs entirely in your browser** using WebAssembly and WebGL. This means your webcam video feed is processed locally on your machine and is **never sent to a server**, ensuring complete privacy and blazing-fast 60 FPS performance.

### The Technical Flow:
1. **Landmark Detection**: Every frame, MediaPipe scans the webcam feed and maps out **21 3D coordinates (landmarks)** on your hands.
2. **Velocity-Based Rotation**: Instead of mapping your hand's absolute position directly to the sphere's angle (which causes jitter), we calculate the *delta* (change in position) of **Landmark 9 (the center of your palm)**. This creates a "flywheel" effect—moving your hand pushes the sphere, and stopping your hand leaves it perfectly still.
3. **Pinch-to-Zoom Math**: We continuously calculate the Euclidean distance between **Landmark 4 (Thumb tip)** and **Landmark 8 (Index Finger tip)**. When this distance expands or contracts, we map it via linear interpolation (`lerp`) to our 3D camera's FOV and Z-axis position.

---

## 🎮 Interaction Guide

### 1. Two-Handed Precision Mode (Anchor + Action)
Hold up **both hands** for ultimate control:
- **Left Hand (Anchor)**: Hold it steady. This acts as a clutch to enable precision mode.
- **Right Hand (Action)**: 
  - **Scroll / Rotate**: Move your right hand in the air to spin the sphere.
  - **Zoom**: Pinch your right thumb and index finger together to zoom out. Spread them apart to zoom in (Super-Zoom).

### 2. Single-Handed Mode
Hold up **one hand**:
- Move your hand up/down/left/right to freely rotate the sphere.
- Drop your hand to let the sphere coast to a smooth stop via inertia.

### 3. Idle Mode
- If no hands are detected and the mouse hasn't moved for 1.5 seconds, the sphere will enter an **auto-rotate** state, spinning slowly on its Y-axis like the Earth.

### 4. Mouse Fallback
- If you don't grant camera permissions, the system gracefully falls back to mouse tracking. Moving your mouse across the screen will pan the camera, and your scroll wheel handles the 3-phase zoom.

---

## 🚀 Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the local development server.
4. Allow camera access when prompted by your browser.

*(Ensure you are in a well-lit environment for the hand tracking AI to perform optimally).*
