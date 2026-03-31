# 🤖 Bong Bot — Full Capability Map & Power Audit

> Created by Antigravity Vibe Coder after DOM audit of bot-demo.
> Status: V2 SVG has critical visual bugs. V3 (Three.js) is ready to build.

---

## ❌ What Was WRONG in the SVG Bot (Blunders Found)

| Bug | What happened |
|-----|--------------|
| **Chai cup invisible** | The cup was `translate(208, 230)` — way off-canvas right edge at SVG viewBox 300px wide. Cup was literally clipped out of the visible area. |
| **Arms look wrong** | Using cubic bezier paths (`Q`) for arms gives flat, cardboard cutout look. No 3D depth, no joints. |
| **Cup handle doesn't show** | `stroke-width:3` on a path that was already clipped — invisible. |
| **Steam opacity=0** | Steam `<path>` elements had literal `opacity="0"` hardcoded. They never animate because the CSS keyframe `#steam path` selector can't reach them through React's scoped rendering. |
| **Wave animation broken** | `transform-origin: 90px 200px` / `210px 200px` — CSS `transform-origin` with SVG coordinate syntax doesn't work in modern browsers for SVG elements the same way. Arms don't rotate around the shoulder. |
| **Blink broken** | `scaleY(0.1)` on a `<circle>` via CSS `transform` attribute doesn't work natively in SVG — needs `transform-box: fill-box` AND `transform-origin: center` which requires inline styles, not class names. |
| **Missing real proportions** | Chibi body (big head, small body) described in V3 spec was NOT built. Head and body are same size — unhuman proportions. |
| **Wrong layer order** | Arms rendered AFTER body — they appear on top of body instead of coming OUT from behind the body naturally. |

---

## 💪 Full Power: What We CAN Build

### Approach 1: Pure SVG (Current — Fixed) ★★★☆☆
- Lightweight (~5KB)
- Full DOM access for eye tracking
- But: flat, no depth, no real joints, looks "2D cartoon"
- CSS animations have SVG quirks that need JS workarounds
- **Chai cup visibility:** Fully fixable by correcting translate coordinates

### Approach 2: React Three Fiber (3D — Premium) ★★★★★
- **Already installed:** `three@0.171.0`, `@react-three/fiber@8.17.14`, `@react-three/drei@9.121.3`
- We can build the ENTIRE robot from scratch using primitive 3D shapes (spheres, cylinders, boxes)
- **No `.glb` file needed at all** — we code every part in JSX
- Capabilities:
  - Real 3D depth with lighting and shadow
  - Per-bone rotation (shoulder, elbow, wrist) — real arm joints
  - Eye tracking: rotate the eyeball mesh's X/Y toward cursor
  - Chai cup: a proper 3D mug with a visible handle and steam particles
  - Hand: 3D fist/grip holding the cup from *inside* the cup handle
  - Smooth lerp interpolation every frame via `useFrame`
  - Physically Based Rendering (PBR) materials with metalness/roughness
  - Point lights that make gold glow realistically
  - ContactShadows for a grounded feel

### Approach 3: Rive Animation (.riv) ★★★★☆
- `@rive-app/react-canvas` is **already installed**
- Requires a Rive file (`.riv`) — needs to be created on rive.app or downloaded
- We have `robot.riv` in `/public/` but it's a random community file with no state machine
- **Best for:** Interactive states (idle/hover/excited) triggered by JS
- **Problem:** We'd need to design the bot in the Rive design tool (external work)

---

## 🧱 Three.js Bot: What We Can Build (Geometry Breakdown)

All these shapes come from Three.js primitives — zero external files:

```
HEAD
├── SphereGeometry (dome skull)
├── BoxGeometry (face visor/plate)
├── SphereGeometry × 2 (eye sockets — dark)
├── SphereGeometry × 2 (pupils — gold, THESE ROTATE toward cursor)
├── CylinderGeometry (antenna shaft)
└── SphereGeometry (antenna tip — gold glow with PointLight)

BODY
├── CapsuleGeometry (main torso — chibi round)
└── BoxGeometry × 3 (chest accent lines — gold emissive)

LEFT ARM (Waving)
├── CylinderGeometry (upper arm — shoulder to elbow)
├── CylinderGeometry (lower arm — elbow to wrist)
└── SphereGeometry (hand fist)

RIGHT ARM (Holding Chai Cup)
├── CylinderGeometry (upper arm)
├── CylinderGeometry (lower arm — bent at elbow at ~90°)
├── SphereGeometry (hand grip)
├── CylinderGeometry (cup body — tapered = ConeGeometry trick)
├── TorusGeometry (cup handle — a partial ring!)
└── PlaneGeometry × 3 (steam particles as billboards)

LEGS/BASE
├── CylinderGeometry × 2 (stubby legs)
└── SphereGeometry × 2 (feet)
```

---

## 🎬 Animations We Can Build in Three.js

| Animation | How | Technical |
|-----------|-----|-----------|
| **Eye tracking** | Rotate eyeball meshes in `useFrame` toward cursor | `mesh.lookAt(targetVector)` per frame |
| **Body float** | Translate parent group Y via `Math.sin(time)` | `group.position.y = sin(t) * 0.15` |
| **Arm wave (left)** | Rotate shoulder mesh around Z axis | `shoulderMesh.rotation.z = sin(t) * 0.5` |
| **Arm drink (right)** | Rotate upper arm around X, then Z | Two separate rotation targets with lerp |
| **Blink** | Scale eye socket mesh Y to 0 then back | `eyeL.scale.y = lerp(curr, target, 0.15)` |
| **Chai steam** | Move 3 PlaneGeometry particles upward + fade opacity | `material.opacity = sin(t+offset)` |
| **Antenna pulse** | Scale antenna tip sphere + modulate PointLight intensity | `light.intensity = 0.5 + 0.5 * sin(t * 2)` |
| **Hover card reaction** | Tilt parent body on Z toward hovered card | `body.rotation.z = lerp(curr, target, 0.05)` |

---

## 📱 Mobile Experience

| Feature | How it works |
|---------|-------------|
| **Eye tracking on mobile** | Listen to `touchmove` — use `touches[0].clientX/Y` as cursor position |
| **Idle animations auto-play** | All CSS/R3F animations run regardless of interaction |
| **Auto-sip on mobile too** | The drink animation is time-based, not cursor-based — works on all devices |
| **Performance** | R3F uses WebGL (GPU) — runs at 60fps even on mid-range phones |
| **Canvas size** | Responsive: fills container, `dpr={[1, 2]}` for retina support |

---

## 🔑 Decision: Which Approach to Use?

**USE React Three Fiber (Approach 2)**

Reasons:
1. All dependencies are already installed (zero npm installs needed)
2. Chai cup with handle is trivially easy in 3D — `TorusGeometry` for handle, `CylinderGeometry` for cup body
3. Eye tracking works PERFECTLY — rotate a 3D sphere toward a 3D target point
4. The arm holding the cup looks REAL — we can position the hand *inside* the cup handle geometry
5. The drinking animation is natural — just rotate the whole forearm group up toward the face
6. We get real lighting, shadows, metallic materials — 10x more premium than flat SVG
7. Steam particles are trivial — animated `PlaneGeometry` billboards with transparent PNG or opacity animation

---

## ✅ Acceptance Criteria for V3 Three.js Bot

- [ ] Robot shaped like chibi (big round head, smaller body)
- [ ] Two gold eyes (sphere meshes) that track cursor/touch with lerp delay
- [ ] Body floats gently (sin wave Y translation)
- [ ] Left arm waves on load + repeating idle sway
- [ ] Right arm holds chai cup (visible mug with handle via TorusGeometry)
- [ ] Right arm periodically raises cup to faceplate (drink animation, 10s interval)
- [ ] Antenna tip glows with pulsing PointLight
- [ ] Chest has 3 gold emissive bar details
- [ ] Steam rises from cup (animated opacity particles)
- [ ] Bot blinks every 3-5 seconds
- [ ] Mobile: touchmove tracked for eyes, all idle anims play
- [ ] No `.glb` or external asset files required
