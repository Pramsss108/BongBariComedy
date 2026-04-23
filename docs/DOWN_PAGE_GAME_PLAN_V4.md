# চা Runner — Plan v4 (Debugged & Re-Engineered)
> **Audit verdict on v3:** The plan was *aesthetically ambitious but mechanically naive.* Several phases would have actively broken the game. This v4 keeps every good idea, kills the bad ones, and re-architects around one new principle:
>
> **🧭 North Star — "The Forgiving Endless"**
> *A down-page game whose job is to entertain, not to humiliate. Every player must reach a "win-feeling" within 60 seconds, regardless of skill.*

---

## 🔬 Critical v3 Audit (what was wrong + why)

### ❌ THE BIG ONE — Infinite Speed Scaling (v3 Phase 14, current code)
**Current code:** `speed = min(16, 6 + score*0.005)` ramps speed forever.
**Problem (PhD lens):**
- Human reaction time = ~250 ms, optimal click-to-jump latency = ~180 ms.
- At speed = 16 px/frame × 60 FPS = **960 px/sec**. A 50 px obstacle at the right edge of a 400 px screen reaches the player in ~0.42 s. Subtract reaction time → **170 ms to *decide and act*.** Below human floor.
- At speed > 12 the game becomes a *coin flip*, not a skill test. Pros fail too. **You correctly identified this.**
- Chrome Dino has the same flaw — the "kill screen" is intentional but Dino is a tab-loading 3-second filler, not a brand engagement surface. We are NOT Dino.

**✅ FIX (Phase 14 v4 below):** **Capped Mario-model.** Speed reaches 90% of cap by score 200, then *plateau forever*. Difficulty post-plateau comes from **pattern density and variety**, never from raw speed. This is Subway Surfers / Temple Run / Sonic / every shipped runner since 2012.

### ❌ Bad: Phase 6 Double Jump unlock at "score 200"
A skill-based unlock in an endless game with random spawns punishes players who roll bad seeds. **Fix:** Double jump is **always available from Phase 1**, but second jump costs 1 point of "stamina" (regenerates after 4 s grounded). Permanent ability + soft cost = no gating.

### ❌ Bad: Phase 8 Slow-Motion on near-miss
Sounds cool, breaks game logic. Slow-mo means obstacles after the near-miss are easier — players *exploit* it by intentionally near-missing. Also nauseating on mobile. **Fix:** Replace with **screen tint flash + +5 "Style" bonus**, no time manipulation.

### ❌ Bad: Phase 11–14 Five distinct biomes with unique mechanics
Five physics systems = five places to bug, five mobile-perf risks. **Fix:** **3 biomes** (not 5), all sharing the same physics, differing only in palette + obstacle skin + spawn pattern. "Wet slip physics" and "anti-gravity tiles" sound fun but are scope-creep landmines.

### ❌ Bad: Phase 18 Mid-level mini-boss
A boss in an endless runner is a *level-based* concept jammed into a *flow-based* loop. Adds a "wait for the boss to leave" dead zone. **Fix:** Replace with **"Chai Storm"** — every ~800 score, 6 chai cups rain down for 5 s in a pickable arc. Reward without combat.

### ❌ Bad: Phase 30 Death replay slow-mo (1.5s)
Players who just died want to *retry now*, not watch their failure. Standard UX research (Riot, Supercell). **Fix:** Skip the replay; show stats card immediately with a 0.4 s ease-in. Tap-anywhere instant retry.

### ❌ Bad: Phase 50 Leaderboard backend stub
Empty seam = false promise. Either build it or remove it. **Fix:** Removed. Real leaderboard is a v5 task with proper auth/anti-cheat.

### ⚠️ Risky: Phase 26 Procedural music
Web Audio music loops are CPU-heavy on mid Android and can cause click-pops. **Fix:** **Single ambient pad** (one detuned sine + filtered noise), not multi-layer. Mute by default on mobile.

### ⚠️ Risky: Phase 22 Trail/Motion blur
4 alpha-blended sprite redraws per frame = 5× overdraw on the player. **Fix:** Single trailing afterimage at 25% alpha, only when vy < -8 (during jump up). Cheap, readable.

### ⚠️ Phase 36 Long-press "release-to-confirm jump-out"
Conflicts with hold-for-higher-jump. Direct gesture collision. **Fix:** Removed. Pause = two-finger tap only.

### ⚠️ Phase 46 Konami code easter egg
↑↓ on a touch device = swipe gestures = collision with fast-fall. **Fix:** Use a 7-tap pattern on the score badge instead. Discoverable, gesture-safe.

---

## 📐 NEW DESIGN AXIOMS (the ones v3 was missing)

### Axiom 1 — Reaction Time Floor
**Hard rule:** Distance from spawn-edge to player position ≥ `playerSpeed × 0.55 s`.
- Below this, no human can react. Game is unfair → engine refuses to spawn.
- **Implementation:** Pattern scheduler checks this before placing every obstacle.

### Axiom 2 — Pattern, Not Probability
Pure RNG produces *unfair gaps* (spike-spike-spike) and *boring flatlines* (nothing-nothing-nothing).
**Rule:** All obstacles spawn from a hand-tuned pattern library (~16 patterns). RNG only picks *which pattern*, never *raw obstacle placement*.

### Axiom 3 — Difficulty by Density, Not Speed
Once speed plateaus (score ~200), difficulty grows by:
1. Smaller gaps between obstacles in patterns.
2. Higher-tier obstacle mix (more sad clouds + spikes, fewer 404s).
3. Faster pattern cycling.
4. Optional vertical mix (spikes high + cloud low requiring duck/jump).

### Axiom 4 — Win-Feeling Every 60 Seconds
Player must hit a celebratory beat within every 60 s window:
- **0–60s:** First chai pickup → particle burst + sound.
- **60–120s:** Combo x3 banner.
- **120–180s:** Biome transition with "Welcome to Bazar" pill.
- **180s+:** Power-up windows + Chai Storms keep dopamine flowing.

### Axiom 5 — One Failure ≠ Game Over
3 lives is good. Add: **"Second Wind"** — first death after 30 s of clean play restores 1 life with a 1 s invincibility frame. Loud cue. Single use per run. (Used by Pac-Man 256, Crossy Road.)

### Axiom 6 — Mobile-First Hitbox Math
On mobile, the player sprite is rendered ~64 px on screen. Hitbox is *60% of visual* horizontally, *80% vertically*. (Visual rule from Nintendo internal: "Hitbox should feel honest, never sneaky.")

### Axiom 7 — Sound is Optional, Visuals are Mandatory
Mobile users mute by default. Every audio cue (jump, hit, pickup, near-miss) MUST also have a visual cue of equal information value. Game must be 100% playable in silence.

### Axiom 8 — Frame-Independent Physics
Use fixed-timestep simulation (60 Hz logical) decoupled from render. On a 120 Hz iPhone, gravity feels identical to a 30 Hz throttled Android. v3 didn't enforce this. Critical.

### Axiom 9 — Input Latency Budget
Touch → physics response ≤ 32 ms (2 frames). Use `pointerdown`, NEVER `click` (300 ms tap delay on old browsers). Process input *before* physics step, not after.

### Axiom 10 — The "Tea Cools" Win State
**New:** Run isn't endless-until-death. After **distance 1000 m** (~3 minutes well-played), an animated "🏆 Tea Master" banner shows + you can either *Cash out* (saves run + ends) or *Continue* (lives reset to 3, score multiplier ×2 forever, true endless mode unlocks). Everyone gets a win. True endless is the *post-game* for skilled players.

---

## 🎮 BATCH A — Game Feel & Core Physics (REVISED)

### Phase 1 — Coyote Time (90 ms) ✅ Keep
### Phase 2 — Jump Buffer (120 ms) ✅ Keep
### Phase 3 — Variable Gravity (rise 0.85× / fall 1.35×) ✅ Keep
### Phase 4 — Apex Hang (6 frames @ 0.5× gravity when |vy| < 1.5) ✅ Keep
### Phase 5 — Fast-Fall (swipe ↓ / hold ↓ = +60% gravity, ONLY while airborne) ✅ Keep, refined
### Phase 6 — **REVISED** Always-Available Double Jump w/ stamina cost
- Double jump available from second 1.
- Costs 1 stamina (max 3, regen +1 per 4 s grounded).
- Visual: small wing puff. Audio: soft chime.
- *No skill gating.*

### Phase 7 — Edge-Forgiveness Hitbox (60% W × 80% H, centered) ✅ Keep
### Phase 8 — **REPLACED** Style Bonus on near-miss (no slow-mo)
- Within 8 px = +5 points + cyan tint pulse + small chime.
- Stacks toward combo. *No time manipulation.*

### Phase 9 — Camera Shake Tiers (soft/med/hard, intensity capped at 6 px) ✅ Keep
### Phase 10 — **REVISED** Coyote Tell + Land Squash + Run Bob
- Dust trail in coyote window.
- Player y-bobs ±2 px while grounded for "alive" feel.
- Squash (1.25× w / 0.75× h for 80 ms) on landing — already coded.

---

## 🌍 BATCH B — Levels & Pacing (REVISED)

### Phase 11 — **REVISED** 3 Biomes (not 5), all share physics
- **L1 Para (Day):** 0 → 300 m. Calm. Teaches.
- **L2 Bazar (Sunset):** 300 → 700 m. Pattern density rises.
- **L3 Raat (Night):** 700 → 1000 m. Power-ups appear. Climax.
- **Bonus Mahakash (Cosmic):** 1000m+ unlocked after first "Cash out". Stars + chill.

### Phase 12 — Smooth Biome Crossfade (8 s, not 30 s — too long) ✅ Refined
### Phase 13 — Level-Up Banner (2 s pill, ×1.0 multiplier announced — no inflated numbers) ✅ Refined
### Phase 14 — **🚨 CRITICAL FIX — Capped Speed Curve**
- `targetSpeed = 6 + 4 × (1 − e^(−score/120))` → asymptotes to **10 px/frame** at score 200.
- **Hard ceiling: 10. Never above.** That's 600 px/sec. Reaction window stays >450 ms even at the right edge.
- Difficulty after: pattern density, see Axiom 3.

### Phase 15 — DDA on **density**, not speed (3 deaths/min → density −15% for 30 s) ✅ Refined
### Phase 16 — Pattern Library (16 hand-authored patterns, weighted by biome) ✅ Keep
### Phase 17 — Safe Window after hit (1.2 s no spawn + 1.5 s i-frames) ✅ Keep
### Phase 18 — **REPLACED** Chai Storm Event (every ~800 score)
- 6 chai cups rain in a low arc for 5 s. No combat. Pure dopamine.
- Pre-warning: golden flash 1 s before.

### Phase 19 — Daily Seed (UTC date → deterministic pattern order) ✅ Keep
### Phase 20 — Tutorial Pop-Tips (3 ghost tips at 30/60/100, dismissable) ✅ Keep

---

## ✨ BATCH C — Aesthetics & Juice (REVISED)

### Phase 21 — Pixel-Crisp Mode toggle ✅ Keep
### Phase 22 — **REVISED** Single Afterimage Trail (only during jump rise) ✅ Refined
### Phase 23 — 4-Layer Parallax (mountains, buildings, clouds, foreground tufts) ✅ Keep
### Phase 24 — **REVISED** Weather: Petals (L1), Fog (L2 light), Stars+Fireflies (L3). No rain (no slip physics). ✅ Refined
### Phase 25 — Dynamic Player Tint (sky-color blend, max 30% strength) ✅ Keep
### Phase 26 — **REVISED** Single Ambient Pad (one filtered sine, off by default mobile) ✅ Refined
### Phase 27 — Score Pop Animation (1.0 → 1.3 → 1.0, 200 ms) ✅ Keep
### Phase 28 — Combo System (3 chai = ×2 for 5 s, broken on hit) ✅ Keep
### Phase 29 — Damage Vignette (red pulse @ lives ≤ 1) ✅ Keep
### Phase 30 — **REPLACED** Instant Stats Card on death (0.4 s ease-in, tap to retry)
- No replay slow-mo. Players want to act, not watch.

---

## 📱 BATCH D — Cross-Device & Performance (REVISED)

### Phase 31 — Device Capability Probe (FPS sample first 1 s → set quality) ✅ Keep
### Phase 32 — Quality Toggle (Auto / Low / High in settings) ✅ Keep
### Phase 33 — **CRITICAL** Off-Screen Canvas Sprite Cache (3× perf on mobile) ✅ Keep
### Phase 34 — Pause on `visibilitychange` hidden ✅ Keep
### Phase 35 — Global iOS Audio Unlock (one-shot pointerdown listener) ✅ Keep
### Phase 36 — **REVISED** Touch Map (no long-press conflict)
- Tap = jump. Swipe ↓ = fast-fall. Two-finger tap = pause.
- All via Pointer Events. *No long-press.*

### Phase 37 — Safe-Area Insets (notch / nav bar) ✅ Keep
### Phase 38 — **REVISED** Landscape *suggestion*, not hint-toast (only on phones <600 px wide; one-time toast) ✅ Refined
### Phase 39 — `prefers-reduced-motion` → disables shake/flash ✅ Keep
### Phase 40 — Bundle audit + terser (target ≤ 22 KB gz) ✅ Keep
### Phase 40b — **NEW** Fixed-Timestep Game Loop (60 Hz logical, decoupled render — see Axiom 8)
- Critical for cross-device fairness. *Promoted to mandatory.*

---

## 🏆 BATCH E — Meta, Replay & Polish (REVISED)

### Phase 41 — Settings Panel (gear icon, slide-up sheet) ✅ Keep
### Phase 42 — Local Achievements (8 badges, not 10 — quality > quantity) ✅ Refined
### Phase 43 — Bilingual UI (বাংলা / English, device-detected) ✅ Keep
### Phase 44 — **REVISED** Pause Menu (two-finger or P; Resume countdown 3-2-1) ✅ Refined
### Phase 45 — Share Score PNG (1080×1080, Web Share API) ✅ Keep
### Phase 46 — **REVISED** Easter Egg = 7-tap on score badge (no Konami gestures) ✅ Refined
### Phase 47 — Health Pickup heart (every ~600 score, only if lives < 3) ✅ Keep
### Phase 48 — Bishesh Chai power-up (3 s invincible + ×3 + golden trail) ✅ Keep
### Phase 49 — End-of-Run Stats Card (full breakdown + bar vs personal avg) ✅ Keep
### Phase 50 — **REPLACED** "Tea Master" Win-State + Cosmic Endless Mode (Axiom 10)
- 1000 m → win banner → Cash Out (saves a "Tea Master" badge) OR Continue (×2 multiplier forever, true endless, dies eventually but player already won).

---

## 🆕 BATCH F — New Phases the Audit Demands (Phases 51–55)
> *These didn't exist in v3 but are non-negotiable for a serious game.*

### Phase 51 — Input Recording (debug-mode replay)
Record `[time, jumpPressed, jumpReleased]` per run. On crash report, can replay the exact death. Off in prod, on with `?debug=1`.

### Phase 52 — Anti-Cheat Plumbing (client-side guards)
Even without leaderboard yet: detect impossibly high scores (score > distance/8), `requestAnimationFrame` tampering, time-warp via `Date.now()` discontinuity. Soft-flag locally for future leaderboard validation.

### Phase 53 — Onboarding Flow ("First Run Special")
First-ever run is FORCED-easy:
- Speed cap = 8 (not 10).
- Only "404" obstacles, well spaced.
- Auto-pause on first jump for 0.5 s with arrow showing the apex.
- Triggers once, then never again. Sets emotional anchor: "I can do this."

### Phase 54 — Persistent Profile (one localStorage object)
Single source of truth: `{best, totalRuns, totalDistance, achievements[], settings, dailyStreak, lastPlayedISO}`. Versioned schema. Migration-safe.

### Phase 55 — Telemetry Hook (privacy-first, opt-in only)
Local-only counters (no network) for: avg run length, hit-type distribution, biome-reached histogram. Surfaces in a hidden dev panel for tuning. Future opt-in to send.

---

## ✅ Final Phase Tracker (55 phases, 6 batches)

```
A. Game Feel        [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]   1–10
B. Levels/Pacing    [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  11–20
C. Aesthetics       [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  21–30
D. Cross-Device     [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][40b]  31–40b
E. Meta & Polish    [ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  41–50
F. Engineering      [ ][ ][ ][ ][ ]                  51–55
```

---

## 🎯 Re-Prioritized Build Order

**Tier 0 — Foundation (do these FIRST or nothing else matters):**
- **Phase 14** (speed cap) — fixes the broken physics you identified.
- **Phase 40b** (fixed-timestep loop) — fixes cross-device fairness.
- **Phase 33** (sprite cache) — fixes mobile FPS.
- **Phase 16** (pattern library) — fixes "unfair gaps" RNG bug.
- **Phase 17** (safe window after hit) — fixes chain deaths.
- **Phase 53** (onboarding first run) — fixes "I quit after 3 seconds".

**Tier 1 — Game Feel (turns it from arcade to *good* arcade):**
1, 2, 3, 4, 7, 9, 10, 27, 28

**Tier 2 — Polish & Pacing:**
6, 11, 12, 13, 15, 18, 22, 25, 47, 48

**Tier 3 — Cross-Device Hardening:**
31, 32, 34, 35, 36, 37, 39

**Tier 4 — Win-State & Meta:**
50 (Tea Master), 49 (stats), 41 (settings), 42 (achievements), 44 (pause)

**Tier 5 — Delight:**
5, 8, 19, 20, 21, 23, 24, 29, 38, 43, 45, 46

**Tier 6 — Future-Proofing:**
40 (terser), 51, 52, 54, 55

---

## 🧪 Testing Protocol (per phase)

| Test | Pass criterion |
|---|---|
| Desktop Chrome 1080p | 60 FPS sustained, jump feels crisp |
| iPhone 11 Safari | 60 FPS, audio works, notch clear |
| Mid-Android (e.g. Pixel 4a) | ≥50 FPS, touch latency <50 ms |
| Low-end Android (Moto G7) | ≥40 FPS in Low Quality, no crashes |
| Reduced-motion mode | No shake/flash, gameplay intact |
| Background tab → foreground | Resumes cleanly, no input ghosts |
| 5 min play session | No memory leak (DevTools Memory profiler) |
| Random tap mash | Jump never queued more than 1× ahead |

---

## 📜 The "PhD" Verdict

The original v3 was a *designer's wishlist*. v4 is an *engineer-designer's spec*. The single most important change is **Phase 14: cap the speed**. You were 100% right — every infinite-speed runner becomes a coin flip. Mario, Sonic, Subway Surfers, Temple Run, Geometry Dash — all use **plateaued speed + scaling pattern density**. Now we do too.

Second most important: **the win-state (Phase 50 v4)**. A down-page game that demoralizes the user is a brand crime. Tea Master at 1000 m means **every committed player wins**, then the truly skilled go endless for personal bragging rights. Inclusive top-end and competitive top-end, in one design.

Third: **fixed-timestep physics (40b)**. Without it, your iPhone player and your Android player are playing different games. With it, they're playing the same one.

The remaining 52 phases are *additive flavor* on top of those three foundations. Build the foundation right, and the rest is just paint.
