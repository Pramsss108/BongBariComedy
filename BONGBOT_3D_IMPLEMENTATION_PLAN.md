npm run dev:livenpm run dev:live# Bong Bot 3D Implementation Plan (React Three Fiber)

## The Winning Strategy
Based on AI research, standard video formats (WebM/MP4) or 2D animations (Lottie/GIF) **cannot track a user's mouse**. To achieve the "premium Awwwards vibe" where the robot looks at the cursor, we must use a **3D WebGL Canvas**.

## Tech Stack
- **Frontend Framework:** React + Vite
- **3D Engine:** `@react-three/fiber` (React wrapper for Three.js)
- **3D Helpers:** `@react-three/drei` (Simplifies loading models and environments)
- **Asset Format:** `.glb` or `.gltf` (from Sketchfab or Mixamo, pre-rigged)

## Execution Steps
1. **Asset Acquisition (User Task):**
   - Download a free, rigged robot model from Sketchfab.
   - Save the file as `client/public/robot.glb`.

2. **Dependencies (Agent Task):**
   - Run: `npm install three @react-three/fiber @react-three/drei`

3. **Component Creation (Agent Task):**
   - Create `client/src/components/BongBotTracker.tsx`.
   - Setup a `<Canvas>` that takes up `fixed inset-0 pointer-events-none z-50`.
   - Setup `alpha={true}` for total transparency so the website shows underneath.

4. **Integration (Agent Task):**
   - Use `useGLTF('/robot.glb')` to load the model.
   - Use the `useFrame((state) => { ... })` hook to mathematically map `state.pointer.x` and `state.pointer.y` to the robot object's `rotation.x` and `rotation.y`.
   - Use `MathUtils.lerp` for buttery-smooth, delayed "easing" on the rotation.

5. **Lighting:**
   - Add `<ambientLight>` and `<directionalLight>` pointing at the model.

## Why this is the "Vibe Coder" Way:
Instead of spending 40 hours manually scripting WebGL buffers or modeling in Blender, we drop in a community-made `.glb` asset and let `@react-three/fiber` abstract away the math, instantly turning our standard React page into a spatial, interactive experience without killing the Oracle VM/Hetzner server (since rendering happens entirely dynamically on the user's local GPU).