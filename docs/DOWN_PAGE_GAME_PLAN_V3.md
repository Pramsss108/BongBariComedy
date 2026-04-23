# চা Runner — 50-Phase Enhancement Plan v3
> **Mission:** Transform the current Canvas 2D runner into a deeply playable, physics-rich, level-progressing arcade gem that runs flawlessly on iOS, Android, and desktop. Mario-grade *feel* without copying Mario. Every phase must be logical, additive, and reversible.

**Rules of the plan:**
- ✅ Each phase is a single PR-sized change, testable in isolation.
- ✅ No phase breaks an earlier phase (additive only).
- ✅ Every phase ends with a 30-second mobile + desktop sanity test.
- ✅ If a phase makes the game *feel worse*, revert immediately and re-think (not push harder).
- ✅ No external assets (sprites/sound files) unless Phase 40+. Stay procedural.
- ✅ Bundle stays under 50 KB gzipped through Phase 50.

---

## 🎮 BATCH A — Game Feel & Core Physics (Phases 1–10)
> *Make jumping feel **good**. Mario's secret was always physics, never graphics.*

### Phase 1 — Coyote Time (90 ms grace jump)
After leaving the ground, allow jump for 90 ms. Eliminates "I pressed it but nothing happened" rage on edges. Industry standard since *Celeste*.

### Phase 2 — Jump Buffer (120 ms input queue)
If user taps just before landing, queue the jump and execute on touchdown. Removes input-eating frustration.

### Phase 3 — Variable Gravity (rise vs fall)
Gravity = 0.85 while ascending, 1.35 while descending. Makes jumps feel **snappy at peak, weighty on landing**. (Hollow Knight / Mario use this.)

### Phase 4 — Apex Hang Frames
At the top of the jump (|vy| < 1.5), apply 0.5× gravity for ~6 frames. Tiny "hover" feel — players read the air-time as skill, not luck.

### Phase 5 — Fast-Fall (swipe down / hold down)
Swipe-down on mobile or hold ↓ on desktop = +50% gravity. Lets skilled players land faster and dodge mid-air obstacles. Adds skill ceiling.

### Phase 6 — Double Jump (unlock at score 200)
Second jump available mid-air, with reduced velocity (-12 vs -16). Spawns a "wing flap" particle. Earned, not given — telegraphs progression.

### Phase 7 — Edge Forgiveness (collision shrink)
Player hitbox = 70% of sprite at edges, 90% at center. Mario does this. Players blame themselves for fair losses, not the game.

### Phase 8 — Slow-Motion on Near-Miss
If obstacle passes within 8 px of player, trigger 200 ms of 0.6× time-scale + chromatic aberration tint. Rewards risky play. Scoring multiplier x1.5 during.

### Phase 9 — Camera Shake Tiers
Soft shake (chai pickup), medium (near-miss), hard (hit). Currently only hit shakes — variety makes every event *feel* distinct.

### Phase 10 — Coyote Buffer Visual Tell
Tiny dust trail under feet during coyote window — players subliminally learn the timing without a tutorial.

---

## 🌍 BATCH B — Level Design & Progression (Phases 11–20)
> *Endless ≠ aimless. Give the runner a journey.*

### Phase 11 — Level Concept (5 worlds, biome-based)
- **L1 Para (Neighborhood):** day, simple obstacles → 0–500
- **L2 Bazar (Market):** dusk, swinging lanterns → 500–1500
- **L3 Train Line:** night, moving trains as obstacles → 1500–3000
- **L4 Bristi (Monsoon):** rain particles, wet slip physics → 3000–5000
- **L5 Mahakash (Cosmic):** anti-gravity tile sections → 5000+
Each level = new palette, new obstacle, new music motif.

### Phase 12 — Smooth Biome Transition
30-second crossfade between palettes (sky gradient lerp + cloud color lerp + ground tone lerp). No jarring cuts.

### Phase 13 — Level-Up Banner
"Welcome to Bazar! 🏮" pill animates in for 2 s on transition. Score x1.2 multiplier announced.

### Phase 14 — Per-Level Speed Curve
Each level resets speed ramp slightly so progression doesn't become unplayable at L5. New formula: `speed = baseSpeed + log(score+1) * levelMultiplier`.

### Phase 15 — Difficulty Curve (DDA — Dynamic Difficulty Adjustment)
If player dies 3× in same minute, ease spawn rate by 15% silently for next 30 s. If player survives 60 s untouched, increase by 15%. Keeps everyone in flow.

### Phase 16 — Obstacle Pattern Library (not random)
Hand-author 12 spawn "patterns" (e.g., "low-low-high", "spike-gap-cube"). Pick weighted-random by level. Random spawning feels chaotic; patterns feel designed.

### Phase 17 — Safe Window (no spawn after hit)
1.2 s no-spawn after taking damage. Prevents unfair chain deaths.

### Phase 18 — Mid-Level Mini-Boss (every 1000 score)
A larger sprite (e.g., flying "Buffer Bug") that throws 3 small obstacles in a pattern, then leaves. Survival = +100 bonus. Adds rhythm to endless mode.

### Phase 19 — Daily Seed
Use UTC date as RNG seed for one daily "Challenge Run". Same obstacles for everyone that day → leaderboard parity (Phase 35).

### Phase 20 — Tutorial Pop-Tips
First-time players see 3 tiny ghost tips at score 30, 60, 100: "Hold for higher!", "Catch chai for +25!", "Dodge sad clouds!". Stored in localStorage.

---

## ✨ BATCH C — Aesthetics & Juice (Phases 21–30)
> *Polish is what separates "demo" from "shipped".*

### Phase 21 — Pixel-Crisp Mode Toggle
Optional `image-rendering: pixelated` + integer-snap player position for retro lovers. Settings panel option.

### Phase 22 — Trail/Motion Blur (player only)
Last 4 frames of player drawn at 30% / 20% / 10% / 5% alpha behind current position when speed > 12. Cheap, looks expensive.

### Phase 23 — Background Parallax Depth (4 layers)
Currently 2 (clouds + buildings). Add: distant mountains (slowest) + foreground grass tufts (fastest). Sells depth.

### Phase 24 — Weather System
Rain (L4), petals (L1 spring variant), snow (rare special), fog (L3). Particles auto-cull off-screen. Toggle in settings for low-end.

### Phase 25 — Dynamic Lighting on Player
Player sprite gets ambient tint matching sky color (warm dawn, cool night). Subtle but premium.

### Phase 26 — Procedural Music Loop
Layered Web Audio: bass (always) + percussion (after L2) + melody (after L4). 8-bar loop, key changes per biome. ~3 KB code.

### Phase 27 — Score Pop Animation
Score number scales 1.0 → 1.3 → 1.0 over 200 ms on every increment. Multiplier shows colored "+25 ×1.5" stacks.

### Phase 28 — Combo System
Catch 3 chai cups without taking damage = "combo!" banner + ×2 score for 5 s. Resets on hit.

### Phase 29 — Damage Vignette
Red vignette pulses on hearts ≤ 1 (low-health tension). Stardew Valley-grade tell.

### Phase 30 — Death Replay (1.5 s slow-mo)
On final death, show last 1.5 s at 0.3× speed before game-over card. Cinematic.

---

## 📱 BATCH D — Cross-Device & Performance (Phases 31–40)
> *Must run at 60 FPS on a 2019 budget Android. No exceptions.*

### Phase 31 — Device Capability Probe
On boot: measure first-second FPS. Score < 45 → set `lowQuality = true` (disable weather, halve particle counts, disable trail).

### Phase 32 — Quality Toggle in Settings
"Auto / Low / High" — overrides probe. Saved to localStorage.

### Phase 33 — Off-Screen Canvas Sprite Cache
Pre-render player & obstacle sprites once to off-screen canvases at boot. Draw cached bitmap each frame instead of re-pathing. 2–3× faster on mobile.

### Phase 34 — RAF Throttle on Background Tab
`document.visibilitychange` → pause loop entirely on hidden tab. Prevents drained mobile batteries.

### Phase 35 — iOS Safari Audio Unlock
First touch event explicitly resumes `AudioContext` (current code does on Start, but add a global one-shot listener). Fixes silent iPhones.

### Phase 36 — Touch Gesture Map (mobile)
- Tap anywhere = jump
- Swipe down = fast-fall
- Two-finger tap = pause
- Long-press = release-to-confirm jump-out / quit
Gestures use `pointer events`, not `touch` (works on stylus too).

### Phase 37 — Safe-Area Insets (iPhone notch / Android nav bar)
HUD respects `env(safe-area-inset-top/bottom/left/right)`. No score under the notch.

### Phase 38 — Landscape Lock Hint
Detect tall portrait phone → show "rotate to landscape for best play" toast (dismissable, remembered).

### Phase 39 — Reduced Motion Respect
`@media (prefers-reduced-motion: reduce)` → disable shake/flash/slow-mo. Accessibility + iOS Low Power Mode behaves correctly.

### Phase 40 — Bundle Audit + Tree-Shake
Run `terser` on `bb-cosmic-core.js`, target < 25 KB gzipped. Remove dead helpers, inline single-use vars. Ship `.min.js` for prod, raw for dev.

---

## 🏆 BATCH E — Meta, Replay & Polish (Phases 41–50)
> *Reasons to come back tomorrow.*

### Phase 41 — Settings Panel (gear icon)
Volume slider, quality toggle, language (Bangla/English), reset best score, credits.

### Phase 42 — Local Achievements (10 badges)
Stored in localStorage. e.g., "First 100", "Combo x5", "Survive 60s untouched", "Daily Run completed", "All 5 levels reached". Toast on unlock.

### Phase 43 — Bilingual UI Toggle (বাংলা / English)
All HUD strings in a `i18n` map. Default = device language detect.

### Phase 44 — Pause Menu (works mid-jump)
Two-finger tap or P key → freeze loop, dim screen, show Resume/Restart/Settings/Quit. Resume countdown 3-2-1-Go.

### Phase 45 — Share Score Card (canvas-to-PNG)
"Share my run" button → render a 1080×1080 PNG with score, level, date, BongBari logo → Web Share API on mobile, download on desktop.

### Phase 46 — Easter Egg: Konami Code
↑↑↓↓←→←→ + Space = "Mishti Doi mode" (player sprite swaps to a cute curd pot, double points for 30 s). Pure delight.

### Phase 47 — Health Pickup (rare floating heart)
Spawn rate 1 every ~600 score, only if lives < 3. Restores 1 heart + sparkle burst.

### Phase 48 — Power-Up: Bishesh Chai (golden cup, every ~800 score)
3 s of: invincibility + ×3 score + golden trail. Telegraphed by an audible swell. Risk/reward: worth chasing into danger.

### Phase 49 — End-of-Run Stats Screen
Score / Best / Distance (m) / Chai caught / Near-misses / Highest combo / Time alive. Bar chart vs personal average.

### Phase 50 — Self-Updating Leaderboard (optional, future hook)
Stub a `POST /api/chai-runner/score` endpoint shape. UI shows "Coming soon: Friends leaderboard". Don't build the backend yet — just leave the seam open for Phase 51+.

---

## 🛡️ Engineering Discipline (apply to every phase)

| Rule | Why |
|---|---|
| One phase = one commit with `chai-runner: phase N — title` | Easy bisect/revert |
| After every phase: `npm run check` + manual mobile + desktop test | Catch regressions same-day |
| Performance budget: 60 FPS @ iPhone 11, 50 FPS @ mid-range Android, 60 FPS desktop | Hard ceiling |
| Bundle budget: ≤ 25 KB gz at Phase 40, ≤ 35 KB gz at Phase 50 | Mobile-first |
| Zero new external deps through Phase 50 | Reliability |
| Every animation must be `transform`/`opacity` only | GPU-accelerated, no jank |
| Every phase reversible via `git revert` cleanly | Safety net |
| Update this file's checklist (✅) as phases ship | Visible progress |

---

## 📊 Phase Tracker

```
A. Game Feel       [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   1–10
B. Levels          [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  11–20
C. Aesthetics      [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  21–30
D. Cross-Device    [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  31–40
E. Meta & Polish   [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  41–50
```

---

## 🎯 Recommended Build Order (priority lanes)

If we don't ship all 50, ship in this order for max felt-quality-per-phase:

**Tier 1 (ship-defining, do first):** 1, 2, 3, 4, 7, 16, 31, 33, 35, 37
**Tier 2 (huge polish wins):** 6, 11–13, 21, 22, 27, 28, 41, 44
**Tier 3 (progression depth):** 14, 15, 18, 28, 42, 47, 48
**Tier 4 (delight & meta):** 9, 19, 30, 38, 45, 46, 49

---

**Verdict:** This plan turns "a cute distraction" into "the reason people *want* to be on the down-page." Every phase is justified, scoped, and reversible. No Mario clone — a Bengali-flavored runner with its own physics signature, ready for real device-to-device shipping.
