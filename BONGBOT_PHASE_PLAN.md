# 🤖 Bong Bot — Full Visual Physics & Interaction Plan
## 28 Stages · 5 Per Batch · Pure SVG + JS · No Backend

> **Vibe principle:** Every reaction should feel like the bot has a soul.  
> Think: *"What would a real personality do if you poked it?"*  
> Our power: SVG transform, spring physics, velocity tracking, click zones — all client-side.

---

## What We Have Now (Baseline ✅)
| Part | State |
|------|-------|
| Left arm | Raises + swings — WAVING WORKS ✅ |
| Right arm | Holds chai cup, lifts to face |
| Head tilt | Per personality |
| Eyes | Follow cursor, blink |
| Body | Floats up/down |
| Speech bubble | Personality phrases in Bengali/English |
| Sparkles | Orbit the body |

---

## 🌐 Language Toggle (Top-Right)
- **Auto-detect:** `navigator.language` → `bn / bn-BD / bn-IN` → Bengali default. All others → English.
- **Manual:** `BN 🇧🇩 | EN` pill toggle. Persists in `localStorage`.
- **Phrase hook:** Every bubble, every reaction phrase uses the active language.

---

## BATCH 1 — Stages 1–5: ARM PHYSICS
### Stage 1 — Elbow Bend During Raise
Upper arm rotates to 120°. Forearm LAGS by 30° during motion — bends naturally at elbow. Settles open at ~110° angle. Arm moves like a hinged lever, not a plank.

### Stage 2 — Wave Arc Spring Physics
Replace pure sine wave with spring oscillation: forearm overshoots peak, hesitates briefly at bottom (wrist-flick pause). Feels like real momentum, not a metronome.

### Stage 3 — Arm Gravity Droop at Rest
At rest: shoulder +8°, forearm +12° gravity droop. As body floats up/down, forearm lightly pendulum-swings ±5° with inertia.

### Stage 4 — Shoulder Socket Rotation Indicator
Gold socket ring shows a small arc/wedge that tracks arm angle — like a protractor. Rotates visibly as arm raises. Makes the mechanical joint feel *real*.

### Stage 5 — Wrist/Palm-Forward On Wave
As arm enters wave mode, hand group rotates ~45° — palm faces viewer ("hello!" position). On lower, wrist returns to neutral. One detail that makes it feel like a greeting.

---

## BATCH 2 — Stages 6–10: CHAI CUP PHYSICS
### Stage 6 — Finger Grip Wrap
Fingers visually wrap handle. Thumb on opposite side. Grip tightens slightly (finger circles compress) as arm lifts to sip.

### Stage 7 — Liquid Slosh Physics
Liquid surface tilts opposite to cup angle (`tilt = cup_angle × 0.4`). Add decaying ripple on stop. Coffee sloshes when the arm moves — feels like real weight.

### Stage 8 — Steam Detail Upgrade
5 particles, individual wind drift, random curl offsets. Steam only visible when cup at rest. Opacity doubles in Sipping personality. Small curl = real steam.

### Stage 9 — Cup Tilts 30° During Sip
When arm lifts to drink (-65°), cup itself rotates +30° toward face. Liquid adjusts (Stage 7). The cup actually *tips* like you're drinking — not just arm lifting.

### Stage 10 — Excited "Cheers" Toast
On Excited personality: cup raises +10° sharply, tiny sparkle burst at rim. Quick 0.4s toast gesture. Back to rest smoothly. Only happens once per Excited entry.

---

## BATCH 3 — Stages 11–15: HEAD & BODY PHYSICS
### Stage 11 — Body Breathing Cycle
Slow 4s inhale/exhale: body rect expands 6px, chest stripes shift down 3px. Slows in Sleepy, quickens in Excited. Makes the bot feel **alive when idle**.

### Stage 12 — Head Counter-Bob With Wave
During waving, head nudges 2–3° OPPOSITE direction every wave cycle (Newton's 3rd law). Body involved in the wave, not just the arm.

### Stage 13 — Eye Inertia Lag + Overshoot
Pupils track cursor with lag + slight overshoot when cursor stops. Eyes have weight. Head tilt causes pupils to lag behind by ~0.15s before catching up.

### Stage 14 — Antenna Spring Physics
On head tilt, antenna ball swings opposite direction, overshoots, then settles:
`ant_angle = tilt_velocity × 0.6 × e^(−damping·t) × cos(spring_freq·t)`
It's a tiny detail but incredibly satisfying.

### Stage 15 — Body Lean Into Wave
When left arm waves, whole body leans 3° LEFT into the wave. Returns to center when arm lowers. Like a person naturally leaning when waving enthusiastically.

---

## BATCH 4 — Stages 16–20: MICRO DETAIL POLISH
### Stage 16 — Blush Heartbeat Pulse
Double-pulse "lub-dub" rhythm: two quick flashes every 1.2s. Intensity max in Happy/Excited. Optional: sync with wave cadence.

### Stage 17 — Gold Stripe Light Sweep
Narrow white shimmer travels left→right across chest stripes every ~6s. Like light reflecting off the bot's chest armor. 0.4s sweep, very subtle.

### Stage 18 — Contact Shadow Breathing
Floor shadow scales with float: smallest + faintest when bot is highest, largest + darkest when lowest. Grounds the floating physically.

### Stage 19 — Sparkle Depth Field
2 near (large, bright, fast), 2 mid, 2 far (tiny, dim, slow). Parallax layering makes the bot exist in 3D space rather than on a flat plane.

### Stage 20 — Visor Cursor Reflection
Tiny specular highlight inside visor shifts with cursor position (max 3px shift, 5% opacity). Looks like a real glass surface responding to room lighting.

---

## BATCH 5 — Stages 21–25: CURSOR VELOCITY & AWARENESS
*The bot should feel the cursor like a living creature senses its environment.*

### Stage 21 — Antenna Glow = Cursor Speed Sensor ⚡
**This is the magic one.**  
Track cursor velocity every frame: `vel = sqrt(dx² + dy²) / dt`  
- **Cursor still / slow:** Antenna dim, gentle 0.3× pulse  
- **Cursor moving:** Antenna brightens proportionally to speed  
- **Cursor fast/sweep:** Antenna blazes to full glow + emits a brief light ring  
Effect: Bot's antenna is literally a radar dish that senses movement. Beautiful and interactive.

### Stage 22 — Cursor Leaves Viewport → Bot Searches
When cursor leaves the browser (or goes to edge), bot's eyes widen slightly and look toward the exit point. After 2s, the bot does a small "looking around" sweep — eyes scan left, right, then settle. Returns to normal when cursor re-enters.

### Stage 23 — Cursor Circles → Dizzy Mode
Track cursor path. If cursor makes 2+ full circles around the bot within 3s:  
- Eyes get tiny spiral pupils (3 concentric rotating circles)  
- Head wobbles ±5° rapidly  
- Speech bubble: "আরে ঘুরছে কেন?! 😵" / "Why spinning?! 😵"  
Resets after 2s. Easy to detect: measure angle change accumulation.

### Stage 24 — Cursor Hover Zone Awareness
Detect which body zone cursor is near (head, body, cup, arm) using bounding box checks:
- **Near head:** Eyes open wider (1.2× scale) — bot is watching you closely
- **Near body:** Subtle body glow, slight lean toward cursor  
- **Near cup:** Cup hand micro-tightens (grip circles shrink 2px)  
- **Near ARM:** Arm does a small extra swing — "hey, I see you!"

### Stage 25 — Cursor Fast Sweep → Wind Lean
When cursor moves very fast in one direction (high velocity threshold), the bot's body leans 4° in that direction as if caught in a breeze, then springs back. Hair/antenna blow in direction. Duration: 0.6s, then spring return. Like cartoon wind effect.

---

## BATCH 6 — Stages 26–28: TOUCH & CLICK REACTIONS
*When someone touches or clicks the bot, it should respond with personality.*

### Stage 26 — Click Zone Reactions (5 zones)
Each SVG region is a clickable/touchable zone with its own reaction:

| Zone | Click Reaction | Touch (Mobile) |
|------|---------------|----------------|
| 👁️ **Eyes** | Surprised wink: one eye closes, stays closed 0.8s, then reopens. Speech: "আউচ! 👁️" | Same |
| 🧠 **Head/top** | Head shakes "no" (rapid ±8° tilt × 3). Star burst from head. Speech: "কী করছ?! 😤" / "Hey! 😤" | Head shake |
| 🫀 **Body/chest** | Body jiggles sideways: rapid ±6° lean × 4. Stripe shimmer triggers. Speech: "হি হি! 😄" / "Hehe! 😄" | Tickle jiggle |
| ☕ **Chai cup** | Immediate sip animation + steam burst. Speech: "মম্ম! চা! ☕" / "Mmm! Chai! ☕" | Sip trigger |
| 📡 **Antenna** | Antenna ball bounces hard (spring physics × 3×). Radar ring pulse. Speech: "পিং! 📡" / "Ping! 📡" | Bounce ring |

### Stage 27 — Double-Click / Double-Tap → DANCE MODE 🕺
**The most fun interaction.**  
Double-click anywhere on the bot triggers a 3-second dance sequence:
```
Beat 1: Body rock LEFT 12°, left arm up, right arm down
Beat 2: Body rock RIGHT 12°, right arm up, left arm down (with cup!)
Beat 3: Body bounce UP (bounceV = -18), both arms wide
Beat 4: Spin effect — body rotates 360° (head stays stable via counter-rotate)
Cool-down: Settle back to neutral with spring damping
```
Speech during dance: "🎵 নাচো নাচো!" / "🎵 Let's dance!"  
Antenna blazes full gold during dance. Blush max. Sparkles orbit faster.  
Returns to current personality after 3s.

### Stage 28 — Long Press / Long Hover → Sleepy Tickle
If user holds click OR hover focused on body for 2+ seconds without moving:

**Scenario A — Hold on body:** Bot starts giggling — body micro-vibrates (±2px random x/y). After 3s of holding: "বন্ধু, ছাড়ো! 😂" / "Friend, let go! 😂" — then jumps away (bounce).

**Scenario B — Idle (no interaction for 45s):** Bot enters idle drift — eyes slowly close, head droops, emits "zzz" particles. Touch/click wakes it with a jump + "আরে! জেগে গেলাম! 😮" / "Oh! I'm awake! 😮"

---

## Full Implementation Sequence

| Batch | Stages | Focus | Priority |
|-------|--------|-------|----------|
| ✅ | 0 | Waving arm — DONE | ✅ |
| ✅ | 1–5 | Arm elbow physics — IMPLEMENTED, awaiting review | ✅ |
| 🔲 2 | 6–10 | Chai cup physics | HIGH |
| 🔲 3 | 11–15 | Head & body physics | MEDIUM |
| 🔲 4 | 16–20 | Polish details | MEDIUM |
| 🔲 5 | 21–25 | Cursor awareness & velocity | HIGH |
| 🔲 6 | 26–28 | Touch / click reactions + dance | FUN |

---

## What Makes This Hard (Honest Assessment)

| Challenge | Difficulty | Solution |
|-----------|-----------|----------|
| Elbow bend lag (Stage 1) | ⭐⭐⭐ | Two separate lerp vars with different speeds |
| Liquid slosh physics (Stage 7) | ⭐⭐⭐ | Tilt the ellipse rx/ry based on arm angle |
| Cursor circle detection (Stage 23) | ⭐⭐⭐⭐ | Accumulate angle delta, threshold at 2π×2 |
| Dance spin (Stage 27) | ⭐⭐⭐⭐ | Sequenced keyframe state machine, counter-rotate head |
| Antenna spring (Stage 14) | ⭐⭐⭐ | Damped oscillator — just math, no library |
| All of this in 60fps SVG | ⭐⭐⭐⭐⭐ | Batch DOM writes, no layout thrash, rAF only |

> **Our agentic power limit:** We can do ALL of this in pure SVG + JS.  
> No WebGL. No Three.js. No physics engine. Just math + rAF + smart DOM writes.  
> This is a harder project than it looks — but every stage is achievable.
