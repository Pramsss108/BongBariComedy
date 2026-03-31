# 🤖 Bong Bot Mascot — Complete Agent Handoff & Creation Guide

> **Purpose:** This is a 100% complete handoff document for the next agent to create the Bong Bot mascot correctly.
> **Current state:** We tried two approaches (Rive + Poly.pizza 3D bunny) — BOTH FAILED to meet the vision. Starting fresh.
> **What exists in codebase:** `BotDemo.tsx`, `BongBotMascot.tsx` — can be deleted/replaced. The poly.pizza blue bunny `.glb` is NOT the right asset.

---

## ❌ WHAT WENT WRONG (Don't Repeat These Mistakes)

1. **Wrong asset:** We used `robot.glb` from poly.pizza — it's a cute blue platformer bunny, NOT a robot. Has nothing to do with BongBari brand.
2. **Wrong Rive file:** `robot.riv` is a random community file (8KB), not custom. Has no state machine, no eye tracking, no chai cup.
3. **BotDemo.tsx uses the wrong model** — it loads `robot.glb` (bunny) and tries cursor tracking via `rotation.y/x` — this rotates the WHOLE body, not just the eyes. Looks cheap.
4. **BongBotMascot.tsx** is a tiny 120x120 Rive widget in the corner — not what we need at all.

**The result looks 1% of what was planned. None of it matches the V3 vision below.**

---

## ✅ THE EXACT VISION (V3 Landing Page Hero)

### Character: "Bong Bot"

**Physical description (what the bot MUST look like):**
- **Body shape:** Round, friendly, compact — inspired by WALL-E × Baymax × Astro Bot
- **Size proportion:** Chibi-ish (big head, small body) — cute, not intimidating
- **Body color:** Dark charcoal / gunmetal grey (`#1a1a2e` to `#2d2d3d` gradient)
- **Accent color:** Gold `#f0c12c` — used for eyes, chest lines, joints, antenna tip
- **Head:** Round/dome-shaped with a slight visor/face-plate area
- **Eyes:** TWO large circular gold glowing eyes (`#f0c12c`) — these are the MAIN interactive element. They MUST follow the user's cursor smoothly.
- **Left hand:** Holding a steaming chai cup ☕ (the Bengali identity signature)
- **Right hand:** Open palm gesturing toward the right side, as if saying "pick a mode!" pointing at the 3 transfer mode cards
- **Antenna:** Small antenna on top of head with a glowing gold tip that pulses
- **Chest:** 2-3 thin gold horizontal lines (like a speaker grille or tech detail)
- **Feet/base:** Small round feet or a floating hover base (bot floats above ground)
- **Overall vibe:** Premium, warm, approachable — like a tech assistant you'd trust

### Where It Appears (Landing Page Layout)

```
┌─ Header ──────────────────────────────────────────────┐
│ ← BongShare                         🛡️ Encrypted     │
├───────────────────────────────────────────────────────┤
│                                                       │
│              🤖 BONG BOT (centered, large)            │
│         ┌───────────────────────┐                     │
│         │  [The animated robot] │                     │
│         │  Eyes follow cursor   │                     │
│         │  Gentle floating bob  │                     │
│         │  Chai steam rising    │                     │
│         │  Right hand pointing →│                     │
│         └───────────────────────┘                     │
│                                                       │
│     "Send files instantly. No signup needed."         │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 🟣 LOCAL │  │ 🔵 P2P  │  │ 🟡 LINK │            │
│  │ WiFi/    │  │ Browser  │  │ Upload & │            │
│  │ Hotspot  │  │ to       │  │ share a  │            │
│  │ Transfer │  │ Browser  │  │ link     │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                       │
│  ┌─────────────────────────────────────────┐          │
│  │ 🟢 RECEIVE A FILE — Enter code: [    ] │          │
│  └─────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────┘
```

The bot is the HERO of the landing page. It's the first thing users see. It must be large (roughly 250-350px on desktop), centered, and interactive.

---

## 🎯 ANIMATION BEHAVIORS (Must Have)

### Behavior 1: Eye Tracking (PRIMARY — this is the "wow" factor)
- The bot's two gold eyes MUST smoothly follow the user's mouse cursor
- Movement should be subtle (pupils shift 5-10px max, not the whole head)
- Use `lerp` (linear interpolation) for smooth, delayed follow — NOT snappy
- When cursor is on the left, pupils shift left. Cursor on right, pupils shift right. Same for up/down.
- Think: "The bot is watching you" — friendly, not creepy

### Behavior 2: Idle Float (Always Active)
- The entire bot gently bobs up and down (`translateY: 0 → -8px → 0`)
- Period: ~3 seconds, ease-in-out, infinite loop
- This happens regardless of cursor position

### Behavior 3: Chai Steam (Subtle Detail)
- Small wispy particles or opacity-animated wisps rising from the chai cup
- 2-3 tiny "steam" elements that fade in at cup rim, rise 15-20px, then fade out
- CSS animation or canvas particles — keep it lightweight

### Behavior 4: Blink (Every 3-4 Seconds)
- Eyes quickly squash vertically (`scaleY: 1 → 0.1 → 1`) over ~150ms
- Random interval: 3-5 seconds between blinks
- Makes the bot feel alive

### Behavior 5: Wave on Load (One-Time)
- When the page first loads, the right hand does a single wave gesture (2-3 waves)
- Then settles into the "pointing at mode cards" resting position
- This is the "welcome" moment

### Behavior 6: Hover Reaction (on Mode Cards)
- When user hovers over one of the 3 mode cards below the bot:
  - Bot's eyes glow slightly brighter
  - Bot leans slightly toward that card (2-3 degree tilt)
  - Optional: antenna tip blinks faster

---

## 🛠️ HOW TO BUILD IT CORRECTLY (Technical Implementation)

### Approach A: SVG + CSS/JS Animation (RECOMMENDED — Best Control)

This is the cleanest, most performant, most controllable approach.

**Step 1: Create the Bot as an SVG**
- Use Figma, Illustrator, or AI image → vectorize
- Structure the SVG with NAMED groups/layers:

```svg
<svg viewBox="0 0 300 400" id="bong-bot">
  <!-- Layer 1: Body (static) -->
  <g id="bot-body">
    <rect rx="40" ... fill="#1a1a2e" /> <!-- Main body -->
    <line ... stroke="#f0c12c" /> <!-- Chest accent lines -->
  </g>
  
  <!-- Layer 2: Left Arm + Chai Cup (subtle float) -->
  <g id="bot-left-arm">
    <path d="..." fill="#2d2d3d" /> <!-- Arm -->
    <g id="chai-cup">
      <rect ... fill="#f0c12c" rx="4" /> <!-- Cup -->
      <g id="steam">
        <path d="..." opacity="0.4" /> <!-- Steam wisp 1 -->
        <path d="..." opacity="0.3" /> <!-- Steam wisp 2 -->
      </g>
    </g>
  </g>
  
  <!-- Layer 3: Right Arm (wave then rest) -->
  <g id="bot-right-arm">
    <path d="..." fill="#2d2d3d" />
    <circle ... fill="#f0c12c" /> <!-- Hand/palm -->
  </g>
  
  <!-- Layer 4: Head (slight bob separate from body) -->
  <g id="bot-head">
    <ellipse ... fill="#1a1a2e" /> <!-- Dome -->
    
    <!-- Layer 5: Eyes (THE KEY INTERACTIVE PART) -->
    <g id="bot-eyes">
      <!-- Left eye socket -->
      <circle cx="120" cy="160" r="25" fill="#0c0c0e" /> <!-- Socket bg -->
      <circle id="left-pupil" cx="120" cy="160" r="12" fill="#f0c12c" /> <!-- Pupil - MOVES -->
      <circle cx="114" cy="154" r="4" fill="#fff" opacity="0.6" /> <!-- Highlight -->
      
      <!-- Right eye socket -->
      <circle cx="180" cy="160" r="25" fill="#0c0c0e" /> <!-- Socket bg -->
      <circle id="right-pupil" cx="180" cy="160" r="12" fill="#f0c12c" /> <!-- Pupil - MOVES -->
      <circle cx="174" cy="154" r="4" fill="#fff" opacity="0.6" /> <!-- Highlight -->
    </g>
    
    <!-- Layer 6: Antenna -->
    <g id="bot-antenna">
      <line x1="150" y1="100" x2="150" y2="70" stroke="#2d2d3d" stroke-width="4" />
      <circle cx="150" cy="65" r="6" fill="#f0c12c" id="antenna-glow" />
    </g>
  </g>
</svg>
```

**Step 2: React Component with Eye Tracking**

```tsx
// client/src/components/BongBotHero.tsx
import { useEffect, useRef, useCallback, useState } from 'react';

export default function BongBotHero() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);
  const [hasWaved, setHasWaved] = useState(false);

  // ── Eye Tracking ──
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!svgRef.current || !leftPupilRef.current || !rightPupilRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const svgCenterX = rect.left + rect.width / 2;
    const svgCenterY = rect.top + rect.height * 0.4; // Eyes are ~40% from top

    // Calculate angle from bot center to cursor
    const dx = e.clientX - svgCenterX;
    const dy = e.clientY - svgCenterY;

    // Clamp pupil movement to MAX_SHIFT pixels within the eye socket
    const MAX_SHIFT = 8; // pixels in SVG coordinate space
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxScreenDist = Math.max(window.innerWidth, window.innerHeight) / 2;
    const ratio = Math.min(distance / maxScreenDist, 1);

    const angle = Math.atan2(dy, dx);
    const shiftX = Math.cos(angle) * MAX_SHIFT * ratio;
    const shiftY = Math.sin(angle) * MAX_SHIFT * ratio;

    // LERP would be even smoother — use requestAnimationFrame for production
    // For now, CSS transition on the circles handles smoothing
    leftPupilRef.current.setAttribute('cx', String(120 + shiftX));
    leftPupilRef.current.setAttribute('cy', String(160 + shiftY));
    rightPupilRef.current.setAttribute('cx', String(180 + shiftX));
    rightPupilRef.current.setAttribute('cy', String(160 + shiftY));
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // ── Blink every 3-5 seconds ──
  useEffect(() => {
    const blink = () => {
      if (!leftPupilRef.current || !rightPupilRef.current) return;
      // Squash eyes vertically
      leftPupilRef.current.style.transform = 'scaleY(0.1)';
      rightPupilRef.current.style.transform = 'scaleY(0.1)';
      setTimeout(() => {
        if (leftPupilRef.current) leftPupilRef.current.style.transform = 'scaleY(1)';
        if (rightPupilRef.current) rightPupilRef.current.style.transform = 'scaleY(1)';
      }, 150);
    };
    const interval = setInterval(blink, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-64 h-80 sm:w-80 sm:h-96 mx-auto">
      <svg ref={svgRef} viewBox="0 0 300 400" className="w-full h-full animate-float">
        {/* ... Full SVG structure from Step 1 ... */}
        {/* Assign refs to the pupil circles */}
      </svg>
    </div>
  );
}
```

**Step 3: CSS Animations (in index.css)**

```css
/* Floating bob — the whole bot */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Chai steam wisps */
@keyframes steam {
  0% { opacity: 0; transform: translateY(0) scaleX(1); }
  50% { opacity: 0.4; transform: translateY(-10px) scaleX(1.2); }
  100% { opacity: 0; transform: translateY(-20px) scaleX(0.8); }
}
#steam path:nth-child(1) { animation: steam 2.5s ease-out infinite; }
#steam path:nth-child(2) { animation: steam 2.5s ease-out infinite 0.8s; }
#steam path:nth-child(3) { animation: steam 2.5s ease-out infinite 1.6s; }

/* Antenna glow pulse */
@keyframes antenna-pulse {
  0%, 100% { opacity: 0.5; filter: blur(0px); }
  50% { opacity: 1; filter: blur(2px); }
}
#antenna-glow { animation: antenna-pulse 2s ease-in-out infinite; }

/* Smooth pupil movement via CSS transition */
#left-pupil, #right-pupil {
  transition: cx 0.15s ease-out, cy 0.15s ease-out, transform 0.15s ease;
  transform-origin: center;
  transform-box: fill-box;
}

/* Wave animation (one-time on load) */
@keyframes wave-hand {
  0% { transform: rotate(0deg); }
  15% { transform: rotate(20deg); }
  30% { transform: rotate(-10deg); }
  45% { transform: rotate(15deg); }
  60% { transform: rotate(-5deg); }
  75% { transform: rotate(10deg); }
  100% { transform: rotate(0deg); }
}
#bot-right-arm {
  transform-origin: top center;
  animation: wave-hand 1.5s ease-in-out 0.5s 1; /* 0.5s delay, play once */
}
```

### Approach B: 3D Model + React Three Fiber (Alternative)

Only use this if you have a PROPER robot `.glb` model (not the bunny).

**Requirements for the .glb model:**
- Must be a robot character matching the description above
- Must have SEPARATE bone/mesh for each eye (so pupils can be independently rotated)
- Must have a "Wave" animation baked in
- Must have an "Idle" animation
- File size should be under 500KB for web performance

**Where to get a proper model:**
1. **Sketchfab** (search "cute robot character"): https://sketchfab.com/search?q=cute+robot+character&type=models
   - Filter: Downloadable, Free, Animated
   - Look for models with separate eye meshes
2. **Mixamo** (retarget animations): https://www.mixamo.com
   - Upload a static robot model → auto-rig → add "Waving" animation → download as .glb
3. **Ready Player Me** style but robot: Customize robot avatars
4. **Create in Spline**: https://spline.design — free 3D design tool with built-in animation
5. **AI Generation**: Use tools like Meshy.ai, Tripo3D, or Luma Genie to generate a 3D robot from text prompt:
   ```
   Cute friendly robot mascot, round head, big gold glowing eyes,
   dark charcoal body with gold accent lines, holding chai tea cup,
   chibi proportions, suitable for web 3D viewer
   ```

**If using R3F, the eye tracking code should:**
- Find the eye mesh bones by name (e.g., `scene.getObjectByName('leftEye')`)
- In `useFrame`, rotate ONLY the eye meshes toward the cursor (not the whole body!)
- The body should only do the gentle float bob
- The head can do a very subtle 2-3 degree tilt toward cursor (parallax effect)

---

## 🎨 ASSET CREATION PROMPT (For AI Image Generation)

Use this exact prompt in **Midjourney / DALL-E 3 / Flux / Leonardo AI / Ideogram** to generate the reference image:

### Primary Prompt:
```
Front-facing cute robot mascot character design sheet.
Round dome head with two large circular glowing gold eyes (#f0c12c).
Dark charcoal/gunmetal body (#1a1a2e) with thin gold horizontal accent lines on chest.
Small antenna on top of head with glowing gold tip.
Left hand holding a steaming chai tea cup with wispy steam.
Right hand open palm in a friendly wave/gesture pose.
Short stubby legs or floating hover base.
Chibi proportions (big head, small body). 
Style: clean flat vector illustration, suitable for SVG conversion.
Background: pure black (#0c0c0e).
No text. Character only. Centered composition.
Professional mascot design, similar to Astro Bot or Baymax aesthetic.
High detail, 1:1 aspect ratio.
```

### Variation for SVG-friendly output:
```
Simple geometric robot character, flat design, no gradients,
clean outlines, dark grey body, gold accent eyes and lines,
holding chai cup, waving right hand, front view,
designed for web SVG animation, minimal detail,
black background, character sheet style
```

### After generating the image:
1. **Remove background:** Use remove.bg or Clipdrop
2. **Trace to SVG:** Use https://vectorizer.ai (best) or Figma's image trace
3. **Separate layers in Figma:**
   - Select the traced SVG
   - Ungroup everything
   - Re-group into named layers: `body`, `head`, `left-eye-socket`, `left-pupil`, `right-eye-socket`, `right-pupil`, `left-arm`, `chai-cup`, `steam`, `right-arm`, `antenna`, `antenna-glow`
   - Export as SVG with IDs preserved
4. **Drop SVG into component:** Inline the SVG directly in the React component (NOT as `<img>` — we need DOM access to the pupils for JS eye tracking)

---

## 📐 SIZING & PLACEMENT RULES

### Desktop (≥1024px)
- Bot container: `w-80 h-96` (320×384px) — centered in hero section
- Bot SVG fills the container
- Below bot: 16px gap → tagline text → 32px gap → mode cards

### Tablet (768-1023px)
- Bot container: `w-64 h-80` (256×320px)
- Same layout, slightly smaller

### Mobile (<768px)
- Bot container: `w-48 h-60` (192×240px)
- Eye tracking still works (touch position as last known cursor)
- On mobile, also track `touchmove` events for the eye following

---

## 🎨 COLOR PALETTE (Exact Values)

| Element | Color | Hex |
|---------|-------|-----|
| Page background | Near-black | `#0c0c0e` |
| Bot body | Dark charcoal | `#1a1a2e` |
| Bot body secondary | Slightly lighter | `#2d2d3d` |
| Eyes / Gold accents | Brand gold | `#f0c12c` |
| Eye socket bg | Deep black | `#0c0c0e` |
| Eye highlight | White | `#ffffff` at 60% opacity |
| Chai cup | Gold | `#f0c12c` |
| Steam | White | `#ffffff` at 30-40% opacity |
| Antenna glow | Gold | `#f0c12c` with blur |
| Text below bot | White | `#ffffff` at 80% opacity |

---

## ⚙️ TECH STACK CONTEXT

- **Framework:** React 18.3.1 + Vite + TypeScript
- **Styling:** Tailwind CSS + index.css for custom animations
- **Routing:** Wouter (NOT react-router)
- **Existing animations lib:** Framer Motion (already installed)
- **3D libs installed (optional):** `three@0.171.0`, `@react-three/fiber@8.17.14`, `@react-three/drei@9.121.3`
- **Rive installed (optional):** `@rive-app/react-canvas`
- **Hosting:** GitHub Pages (static), Backend on Oracle Cloud VM

### Key Files to Modify:
- `client/src/components/BongBotHero.tsx` — NEW: the main bot component
- `client/src/pages/BongShareLanding.tsx` or wherever the landing page hero is
- `client/src/index.css` — add float/steam/blink/wave CSS animations
- `client/public/` — place the SVG or .glb asset here if external file

### Files to Clean Up (from previous failed attempts):
- `client/src/pages/BotDemo.tsx` — DELETE or repurpose as a test page
- `client/src/components/BongBotMascot.tsx` — DELETE (tiny Rive widget, not useful)
- `client/public/robot.glb` — DELETE (it's a blue bunny, not our robot)
- `client/public/robot.riv` — DELETE (random Rive file, no state machine)

---

## ✅ ACCEPTANCE CRITERIA (How to Know It's Done Right)

The bot is CORRECT when ALL of these are true:

- [ ] **Looks like a robot** (not a bunny, not abstract shapes) with charcoal body + gold accents
- [ ] **Has two gold eyes** that smoothly follow the mouse cursor with ~150ms delay
- [ ] **Floats/bobs** gently (3s cycle, 8px amplitude)
- [ ] **Blinks** every 3-5 seconds (quick scaleY squash on eyes)
- [ ] **Holds a chai cup** in left hand with subtle steam animation
- [ ] **Right hand waves** once on page load, then rests in "pointing" position
- [ ] **Antenna tip glows/pulses** gold
- [ ] **Centered** in the hero section of the BongShare landing page
- [ ] **Responsive** — scales down on mobile, eye tracking works with touch
- [ ] **Performance** — no jank, smooth 60fps, SVG approach preferred over heavy 3D
- [ ] **Page background** is dark `#0c0c0e` (matches V3 design philosophy)
- [ ] **Below the bot:** tagline "Send files instantly. No signup needed." + 3 mode cards

---

## 🔧 QUICK REFERENCE: SVG Approach vs 3D Approach

| Factor | SVG + CSS/JS | Three.js + R3F |
|--------|-------------|----------------|
| **File size** | ~5-20KB | 200-500KB (.glb) |
| **Eye tracking** | JS on `#pupil` `cx`/`cy` | Bone rotation in `useFrame` |
| **Performance** | Excellent (GPU-light) | Good (needs WebGL context) |
| **Mobile** | Perfect | Can lag on low-end phones |
| **Control** | Full (every pixel) | Depends on model rigging |
| **Look** | Clean vector / flat | 3D depth / lighting |
| **Recommended?** | ✅ YES for this use case | Only if you have perfect .glb |

**Verdict: Go SVG first.** It's lighter, faster, gives full control over eyes, and matches the flat/premium V3 aesthetic. Only fall back to 3D if the SVG looks too "flat" after implementation.

---

## 🚀 EXECUTION ORDER FOR NEXT AGENT

1. **Create the bot asset** (SVG) — either AI-generate → vectorize → layer, or hand-draw in Figma
2. **Build `BongBotHero.tsx`** — inline SVG component with refs on pupils, JS eye tracking, CSS animations
3. **Add CSS animations** to `index.css` — float, steam, blink, wave, antenna-pulse
4. **Integrate into landing page** — place bot in hero section above the mode cards
5. **Test** — move mouse around, verify eyes follow, verify blink/float/steam/wave all work
6. **Mobile test** — verify touch tracking, responsive sizing
7. **Clean up** — remove old BotDemo.tsx, BongBotMascot.tsx, robot.glb, robot.riv

**DO NOT skip the asset creation step.** The most important thing is getting the SVG right with properly separated layers. If the layers aren't named/grouped correctly, the JS eye tracking won't work.
