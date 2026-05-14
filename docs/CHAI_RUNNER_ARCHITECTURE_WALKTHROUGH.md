# 🍵 Chai Runner — Full Architecture Walkthrough

> **Mashla, this is the actual machine under the hood.** Not characters — the *systems* that decide what happens, when, and why. Every box below is a real piece in `client/public/bb-cosmic-core.js`. Read this top-to-bottom and you'll understand exactly what fires after what.

---

## 🧩 0. The Big Picture — Layers of the Game

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER / DOM                               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  index.html  →  injects 2 scripts when URL has ?__bb_preview   │  │
│  │     1. bb-cr-models.js   (character art library — BBModels)    │  │
│  │     2. bb-cosmic-core.js (the entire game engine)              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                       CANVAS LAYER                              │  │
│  │  bb-game-canvas (ctx 2D, DPR-aware, alpha:false for speed)     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                       HUD / DOM OVERLAY                         │  │
│  │  Score · Lives dots · Pause · Cards (start / death / pause)    │  │
│  │  Settings sheet, Skin picker, Achievement toasts               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    PERSISTENT PROFILE                           │  │
│  │  localStorage key: bb_chai_profile_v1                           │  │
│  │  best · totalRuns · totalChai · skins · achievements · streak  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 1. BOOT SEQUENCE — What happens before the player sees anything

```
URL has ?__bb_preview=down ?
        │ yes
        ▼
┌─────────────────────────────────┐
│ index.html injects:             │
│   bb-cr-models.js  (loads 1st)  │  ◀── exposes window.BBModels
│   bb-cosmic-core.js (loads 2nd) │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  boot() function fires          │
│  • Wipe stale canvas/HUD nodes  │
│  • Read prefers-reduced-motion  │
│  • Create <canvas id=bb-game…>  │
│  • Create HUD <div id=bb-hud>   │
│  • Detect DPR (cap at 2)        │
│  • Probe quality (low/high)     │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  Load PROFILE from localStorage │
│  (or migrate legacy → v1)       │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  buildAllSprites()              │
│   • buildPlayerSprite()         │  ◀── cup body only
│   • buildObstacleSprite('404')  │  ◀── BBModels.drawChili (or fallback)
│   • buildObstacleSprite('sad')  │  ◀── BBModels.drawFly   (or fallback)
│   • buildObstacleSprite('spike')│  ◀── BBModels.drawPotty (or fallback)
│   • buildChaiSprite()           │  ◀── BBModels.drawChai  (or fallback)
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  Show START card                │
│  "Welcome / স্বাগতম"             │
│  [Tap to begin]                 │
└─────────────────────────────────┘
```

**Why bake sprites once?** Drawing complex characters every frame at 60fps would melt phones. We draw them ONCE at boot into a hidden canvas, then just *stamp* that canvas onto the screen wherever we need. This is called a "sprite cache."

---

## ⏱️ 2. THE GAME LOOP — What runs 60 times per second

```
                    ┌──────────────────────────┐
       ┌────────────┤  requestAnimationFrame   │◀───────┐
       │            └──────────────────────────┘        │
       ▼                                                │
┌──────────────────────────────────────────────────┐    │
│  FIXED TIMESTEP — 16.67ms logic step             │    │
│  (max 5 steps per frame to prevent freeze)       │    │
└──────────────────────────────────────────────────┘    │
       │                                                │
       ▼                                                │
┌──────────────────────────────────────────────────┐    │
│  UPDATE PHASE                                    │    │
│  1. Input (jump buffer, coyote frames)           │    │
│  2. Player physics (gravity rise/fall/apex)      │    │
│  3. Speed curve (exponential to plateau)         │    │
│  4. Distance counter (px → meters)               │    │
│  5. Biome check (which zone are we in?)          │    │
│  6. Spawn scheduler (next pattern? storm?)       │    │
│  7. Obstacles move left, recycle off-screen      │    │
│  8. Pickups move left, check collection          │    │
│  9. Collision detection (AABB, hitbox 0.6×0.8)   │    │
│ 10. Combo timer, near-miss bonus                 │    │
│ 11. DDA adjust (deaths recent? ease/tighten)     │    │
│ 12. Achievement check                            │    │
│ 13. Storm state machine (warn → active → end)    │    │
└──────────────────────────────────────────────────┘    │
       │                                                │
       ▼                                                │
┌──────────────────────────────────────────────────┐    │
│  RENDER PHASE (always once per frame)            │    │
│  1. Clear (or repaint background)                │    │
│  2. Sky gradient (biome palette + crossfade)     │    │
│  3. Parallax mountains / stars / cosmic         │    │
│  4. Weather (petals, fireflies, snow)            │    │
│  5. Ground tiles                                 │    │
│  6. Pickups (chai, hearts, bishesh)              │    │
│  7. Obstacles (drawObstacle stamp)               │    │
│  8. Player trail + player sprite + live overlays │    │
│  9. Particles (jump dust, hit puff)              │    │
│ 10. Vignette / flash / shake offset              │    │
│ 11. Storm overlay (rain, dim)                    │    │
└──────────────────────────────────────────────────┘    │
       │                                                │
       └────────────────────────────────────────────────┘
```

**Two clocks:** logic ticks at a fixed 60Hz (so physics never goes weird on slow devices). Rendering happens once per browser frame (whenever the screen is ready). On a 120Hz display, you might get 2 logic ticks per render — that's fine.

---

## 🗺️ 3. THE WORLD — Biomes & Distance

```
m =  0 ──────────────── 300 ──────────────── 700 ─────── 1000 ──────────► ∞
     │                  │                    │            │
     │   PARA পাড়া      │    BAZAR বাজার      │  RAAT রাত  │   MAHAKASH মহাকাশ
     │   chill day      │    busy market     │  spooky    │   psychedelic, hue-shifts
     │                  │                    │  night     │
     │   gap × 1.0      │    gap × 0.85      │  gap × 0.72│   gap × 0.65 + log-density growth
     │                  │                    │            │
     │   pattern pool:  │    easy + medium   │  medium +  │   medium + hard × 2
     │   easy × 2 + med │    × 2             │  hard      │
     │                  │                    │            │
     └─ 120m crossfade ─┴── 120m crossfade ──┴ 120m fade ─┴ "TEA MASTER" win @1000m
                                                           continue → ENDLESS ×2 score
```

**Crossfade = the colors blend over 120 meters** so you never see a hard cut between zones.

After 1000m, the game flips into Endless mode. The Mahakash biome **slowly rotates its hue** to keep your eyes from getting fatigued by one palette.

---

## 🎯 4. SPAWN PIPELINE — How obstacles appear

```
                  ┌──────────────────────────────────┐
                  │  updateSpawnScheduler(frame)     │
                  └──────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
       postHitSafeUntil?                 storm active?
       (72-frame grace)                  (skip normal spawn)
                │ no                            │ no
                ▼                               ▼
         ┌──────────────────────────┐
         │ patternQueue empty?      │
         └──────────────────────────┘
                │ yes
                ▼
         ┌──────────────────────────┐
         │  pickPattern()           │
         │  • Pool by biome         │
         │  • Splice expert sets    │
         │    (≥300/600/1000/2000   │
         │     /5000m)              │
         │  • Pick random from pool │
         └──────────────────────────┘
                │
                ▼
         ┌──────────────────────────┐
         │  queuePattern() →        │
         │  push 3-6 obstacles      │
         │  with dx spacing         │
         └──────────────────────────┘
                │
                ▼
         ┌──────────────────────────┐
         │  Next gap (frames):      │
         │  base / (densityMult ×   │
         │   log10(dist/500)*0.55)  │
         │  × biome multiplier      │
         │  × onboard multiplier    │
         │  capped 42–∞             │
         └──────────────────────────┘
```

### Pattern pools (the actual content)

```
EASY    →  single 404, single sad, lone spike
MEDIUM  →  pairs at 130-180px spacing
HARD    →  triples — spike walls, mixed 404+sad+spike
EXPERT  →  hand-authored set-pieces unlocked by score:
            300m  → "Picket Fence" (4 spikes in tight row)
            600m  → "Cloud Trap" (sad → spike → sad → spike)
           1000m  → "404 Wall" (3 stairstep 404s + spike)
           2000m  → "Glass Floor" (rapid spike-sad-spike-sad-spike)
           5000m  → "Endgame" (6-obstacle brutal mixed wall)
```

---

## ⚡ 5. SPEED CURVE — Why it feels right

```
speed
  ▲
  │                    ╭─────────────  PLATEAU ≈ 9.5 px/frame
  │                ╭───╯
  │            ╭───╯
  │        ╭───╯              speed = BASE + GAIN × (1 - e^(-dist/180))
  │     ╭──╯
  │   ╭─╯                     90% of plateau by ~330m
  │  ╭╯
  │ ╭╯
  │╭╯
  │╯ BASE = 5.0
  └────────────────────────────────────────► distance
  0      100    200    300    400    500m
```

After speed plateaus, **difficulty keeps growing through pattern density** (gap shrinks logarithmically forever, capped at ~45% of base gap by 20km). This is "Phase 18a — TRUE INFINITE DIFFICULTY."

---

## 🎚️ 6. DDA — Dynamic Difficulty Adjustment

```
  Player dies 3+ times in 60s ?  ──► EASE  (× 0.85 spawn density)  → game gets gentler
  Player survives 60s clean    ?  ──► TIGHTEN (× 1.15 spawn density) → game tightens up

  Net effect: game silently breathes around skill level. Player never sees a "difficulty" setting.
```

---

## 💎 7. PICKUP SYSTEM — Chai, Hearts, Bishesh

| Pickup | When eligible | Spawn chance | Effect |
|---|---|---|---|
| **Chai (Bhar Cha)** | Every spawn cycle (between obstacles) | Always | +score, builds combo chain |
| **Heart** | Every 600 score AND lives < 3 | 60% | +1 life (cap 3) |
| **Bishesh (special golden)** | Every 250m | 50% | ×3 multiplier + 6s invincibility + gold vignette |

### Combo Tier Ladder (silent — no UI noise)
```
3 chai chain     →  ×2 multiplier
7 chai chain     →  ×3
12 chai chain    →  ×4
20 chai chain    →  ×5
ANY HIT          →  combo resets to 0
```

---

## ⛈️ 8. STORM SET-PIECE — Every 800 score

```
Score crosses 800/1600/2400/...

      ┌────────────┐
      │  IDLE      │
      └─────┬──────┘
            │ score milestone
            ▼
      ┌────────────┐
      │  PRE-WARN  │ 60 frames (1s) — sky darkens
      └─────┬──────┘
            ▼
      ┌────────────┐
      │  ACTIVE    │ 300 frames (5s)
      │            │ • Normal spawn paused
      │            │ • 6 chai cups rain down
      │            │ • Rain overlay
      └─────┬──────┘
            ▼
      ┌────────────┐
      │  IDLE      │ resume normal pattern flow
      └────────────┘
```

A storm is essentially a "free combo bonus zone" that breaks the spawn rhythm.

---

## 🛡️ 9. COLLISION & LIVES

```
Player AABB hitbox = 60% width × 80% height of player sprite
     (smaller than visible art = "generous" feel)

Hit detected
     │
     ▼
┌──────────────────────────────────┐
│  i-frames 1.5s active?            │
│   yes → ignore                    │
│   no  → lives -= 1                │
│         shake (hard)              │
│         post-hit safe 72 frames   │
│         combo reset               │
└──────────────────────────────────┘
     │
     ▼
  lives === 0 ? ──► GAME OVER → death card → Tap to retry
                    │
                    ▼
            telemetry.runsByEnding[type]++
            update best, totalDistance, totalChai…
            saveProfile()
            checkAchievements()
```

**Near-miss reward:** if an obstacle passes within 28px of the player without hitting, +5 bonus + tiny shake. Encourages risky play.

---

## 🏆 10. ACHIEVEMENTS — Silent unlocks

```
Triggered by checkAchievements() each tick. First time threshold met → toast pops in, save profile.

  first_chai    catch 1 chai
  chai_50       catch 50 total
  dist_500      reach 500m in one run
  tea_master    reach 1000m + win
  bishesh_1     catch 1 bishesh
  no_hit_300    300m with full lives
  streak_3      3 consecutive days
  runs_10       10 runs played
```

---

## 🎨 11. SPRITE INTEGRATION — How BBModels plugs in

```
buildObstacleSprite('404')
       │
       ▼
   ┌──────────────────────────────────┐
   │ window.BBModels.drawChili exists?│
   └──────────────────────────────────┘
        yes ◀──┘         └──► no
         │                     │
         ▼                     ▼
  ┌─────────────────┐  ┌─────────────────┐
  │ Make 2.6× hitbox│  │ Make 1× hitbox  │
  │ canvas, draw    │  │ canvas, draw    │
  │ chili at t=0.7  │  │ legacy red cube │
  │ Cache as obs_404│  │ Cache as obs_404│
  └─────────────────┘  └─────────────────┘

drawObstacle(o)        ◀── runs every frame
       │
       ▼
   ┌──────────────────────────────────────────┐
   │ ctx.translate(o.x, o.y + sin(bob)*3)     │  ← gentle bob
   │ if type === '404' AND no BBModels:        │
   │     ctx.rotate(o.rot)                    │  ← legacy cube tumble
   │ ctx.drawImage(sprites['obs_404'])        │  ← stamp cached pic
   └──────────────────────────────────────────┘
```

**This is the bug we just fixed:** the rotation used to fire for ANY `404`, including the new chili. Now it's gated behind "no BBModels" so the chili stands upright.

---

## 🎒 12. PROFILE & PERSISTENCE — What survives across runs

```
localStorage key: "bb_chai_profile_v1"

{
  version: 1,
  best: 1234,                    ← top score
  totalRuns: 47,
  totalDistanceM: 22500,
  totalChai: 312,
  totalHearts: 8,
  totalBishesh: 5,
  teaMaster: true,               ← reached 1000m+
  teaMasterCount: 3,
  achievements: ['first_chai','dist_500',…],
  unlockedSkins: ['brown','gold'],
  activeSkin: 'gold',
  settings: { lang: 'bn', muted: false, debug: false },
  dailyStreak: 5,
  lastPlayedISO: '2026-04-23',
  firstRunDone: true,
  telemetry: {
    runsByEnding: { fall:2, hit404:18, hitSad:11, hitSpike:14, win:2 },
    biomeReached: [47,42,28,9],   ← runs that touched each biome
    avgRunDistance: 478
  }
}
```

Schema is versioned — when we bump features, old profiles auto-migrate via the merge in load.

---

## 🎬 13. END-TO-END FLOW — One full run from tap to game-over

```
1. Player visits ?__bb_preview=down
2. boot() runs → sprites baked → START card shown
3. Tap → S.started = true
4. Frame loop kicks in
5. First-run? → onboarding mode (only 404s, wider gaps, slower cap)
6. Player jumps over a few chilies, grabs a chai → combo starts
7. 300m → expert "Picket Fence" pattern unlocks in pool
8. 300m → biome crossfade begins → Para fades into Bazar
9. 600m → "Cloud Trap" expert unlocks → flies enter rotation
10. 700m → biome crossfade → Bazar into Raat (sky goes purple)
11. 800 score → STORM warning → 5s chai-rain set-piece
12. 1000m → biome crossfade → Raat into Mahakash → "TEA MASTER" achievement
13. Endless ×2 multiplier engages → hue rotation begins
14. Player misses jump on Picket Fence → -1 life, hard shake, 72-frame safety
15. Combo resets, but score continues
16. 5000m → "Endgame" expert pattern unlocks → brutal walls
17. Eventually 3rd hit → S.gameOver = true
18. Death card slides in → "Tap to retry" → telemetry saved → achievements checked
```

---

## 📦 14. Where to look in the code (file map)

| File | What it owns |
|---|---|
| [client/index.html](client/index.html#L348) | Script injection (BBModels then game core) when URL has `?__bb_preview=down` |
| [client/public/bb-cr-models.js](client/public/bb-cr-models.js) | All character art (drawChili, drawFly, drawPotty, drawChai, drawCharacterCup) |
| [client/public/bb-cosmic-core.js](client/public/bb-cosmic-core.js) | The whole engine (~2700 lines): CFG, boot, profile, sprites, loop, spawn, DDA, storm, HUD, achievements |
| [client/src/pages/DevModels.tsx](client/src/pages/DevModels.tsx) | The design lab where we approved every character. Source of truth for the art. |

### Key constants you'll edit when balancing:
- `CFG.JUMP_VEL`, `CFG.GRAVITY_*` — feel of the jump
- `CFG.SPEED_BASE`, `CFG.SPEED_GAIN`, `CFG.SPEED_TAU_M` — speed curve
- `CFG.PATTERN_GAP_BASE_FRAMES`, `CFG.PATTERN_GAP_MIN_FRAMES` — obstacle density
- `CFG.BIOMES[]` — zone boundaries
- `CFG.STORM_EVERY_SCORE` — storm cadence
- `CFG.HEART_EVERY_SCORE`, `CFG.BISHESH_EVERY_DIST_M` — pickup cadence
- `CFG.COMBO_TIERS` — combo ladder

---

*Made with ❤️ for Mashla — this is your engine, end to end.*
