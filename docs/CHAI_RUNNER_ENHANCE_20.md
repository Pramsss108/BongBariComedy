🧠 MAIN DRAW FUNCTION# Chai Runner — Enhancement Plan v2 (20 Phases)
> Discussion draft. **RULE: Nothing gets coded until explicit approval per phase.**
> Last updated: April 24, 2026

---

## ✅ ALREADY IMPLEMENTED (do not re-do)
- E-1: Double-tap stale pointer fix
- E-2: Distance meter visibility + REDUCED_MOTION snap
- E-3: Skin button overflow fix
- Building scroll seamless wrap (rightmost-chain method)
- 11 drink skins (Brown Tea → Robot Cup) with milestone unlocks
- Double jump ring flash (cyan expanding ring)
- Skin preview mini-canvas in settings
- Haptic vibration on jump/hit
- Biome crossfade 120m (very slow sky blend)

---

## 🧃 PICKUPS — FINALIZED ✅ (Option B — Bonus Points Only)

| Pickup | Visual (3D model) | Effect | Spawn rate |
|---|---|---|---|
| ☕ Chai (current) | Existing tinted cup | +1 score, drives combo chain | every ~3s |
| 🍪 Biscuit / Marie | Round flat tan disc with dotted edge | **+20 instant score**, no combo | rare (~1 per 250m) |
| 🔺 Singara (samosa) | Triangular brown pyramid w/ crispy texture | **+30 instant score**, no combo | rare (~1 per 350m) |
| 🫓 Ruti (flatbread) | Round flat brown/tan disc with char spots | **+50 instant score**, no combo | rare (~1 per 500m) |

Bonus pickups never break combo (treated as neutral). They float with same sine bob as chai. On collection: +N floater + small gold sparkle. No special audio yet (uses `sfxChai` until E-16).

---

## 👹 ENEMIES — FINALIZED ROSTER ✅ (Chai Ruiners)
Theme: **Things That Ruin a Cup of Chai.** Each enemy has a normal variant **and a Boss variant** that appears at biome milestones (300m / 700m / 1000m).

### 1. 🌶️ Green Chili (Kancha Lanka)
- **Normal:** Small green chili lying on the road. Jump over it. Touching = chai becomes too spicy → 1 hit.
- **Boss — Bhoot Jolokia:** Giant glowing red chili that spits 3 fireballs in an arc. Player must double-jump between fireballs. Defeats after 3 successful jumps over it (auto-passes).

### 2. 🪰 Housefly (Machi)
- **Normal:** Small black fly buzzing at chest height. Comes in pairs. Must duck OR jump (height varies).
- **Boss — Macchi Rani (Fly Queen):** Huge fat fly that drops 3 baby flies as it flies past. Babies stay airborne ~2s before despawning. Player threads through the swarm.

### 3. 💩 Potty (Goo)
- **Normal:** Brown blob on the ground. Slip damage.
- **Boss — Green Toxic Potty:** Pulsing radioactive green blob that periodically **shoots fire** upward in a 2-tile column. Player must time pass-through during cooldown.

### Spawn Rules
- Bosses are scripted, not random. They appear once per biome at the milestone (300/700/1000m).
- Normal enemies spawn from a weighted pool: chili 40%, fly 35%, potty 25%.
- Old `404` / `sad` / `spike` are **deprecated** — replaced 1:1 by chili/fly/potty after dev-model approval.

---

## 🧪 DEV MODELS PAGE — `/dev/models` (NEW)
**Goal:** A standalone admin-gated route where every game model (player skins, pickups, enemies, bosses) is rendered live so you can approve them visually **before** they touch the game.

### Tech choice (awaiting your pick — see Q1 below)
- **Option A — Pure Canvas2D sprites** (matches current game; ~0 KB added; fastest path).
- **Option B — Three.js low-poly 3D** (rich rotating models; +~150 KB gz; slower mobile FPS).
- **Option C — CSS/SVG pseudo-3D** (lightest; limited depth feel; ~5 KB added).

### Page Structure (regardless of tech)
```
/dev/models   (admin-only, hidden from public nav)
├── Tab: Player Skins   → all 11 cup tints in a 3-col grid
├── Tab: Pickups        → Chai · Biscuit · Singara · Ruti (rotating preview)
├── Tab: Enemies        → Chili · Fly · Potty (normal variants)
├── Tab: Bosses         → Bhoot Jolokia · Macchi Rani · Toxic Potty (animated loop)
└── Approve Bar         → ✅ Approve / ❌ Reject buttons per asset, persisted in localStorage
```
Approved assets get a green badge. Only **approved** assets get pulled into the live game (gated behind a `MODELS_APPROVED` map shipped from the dev page export).

### Acceptance criteria
- Page loads behind `/admin` auth (uses existing `sessionId`).
- No game state runs here — purely a showcase/preview canvas per asset.
- Approving an asset writes to `localStorage['cr_models_approved']` and (later) to `/api/admin/cr-models` so it persists server-side.

---

## 🛠️ ADMIN PAGE UI REBUILD (NEW)
**Problem (from screenshot):** Title overlaps the global site Header, action buttons wrap into the title row, `Welcome, {username}!` shows blank, tabs feel disconnected.

**Scope:** UI-only rebuild. **Every existing endpoint, mutation, and tab stays untouched.**

### New Layout
```
┌─────────────────────────────────────────────────────────┐
│ [pt-24]  Admin Panel · অ্যাডমিন প্যানেল      [user pill] │  ← title row, breathing room below header
├─────────────────────────────────────────────────────────┤
│ Quick actions:  [Logout] [Moderation] [Community Feed]  │  ← actions row, separated
│                 [New Blog] [Add User] [Dev Models 🧪]   │
├─────────────────────────────────────────────────────────┤
│ Tabs:  Leads | Blog | Chatbot | Promotions | Proxy     │
├─────────────────────────────────────────────────────────┤
│  ...existing tab content unchanged...                   │
└─────────────────────────────────────────────────────────┘
```
- Add `pt-24` so the global Header never covers the title.
- Move action buttons to a dedicated row below title (no more wrapping into the title).
- Replace `Welcome, {user?.username}!` with a fallback chain: `user?.username ?? user?.email ?? 'Admin'` and add a subtle avatar pill.
- Add **Dev Models** button → routes to `/dev/models` (new page).
- Tabs become sticky under the action row for fast switching.
- Mobile: actions collapse into a `…` overflow menu.

### Out of scope (do NOT touch)
- Any `/api/admin/*` route, query, or mutation
- Tab content components: `AdminLeadManager`, `AdminChatbot`, Blog form, Promotions, Proxy Kitchen
- Auth flow / sessionId handling

---

## 👹 ENEMIES — LEGACY ROSTER (will be replaced)

### Current Enemies (in game now — to be removed after dev-models approval)
| Enemy | Visual | Replacement |
|---|---|---|
| **404** | Red square | → 🌶️ Green Chili (normal) |
| **Sad Cloud** | Grey blob, X eyes | → 🪰 Housefly (normal) |
| **Spike** | Purple triangle | → 💩 Potty (normal) |

### New Enemy Ideas (awaiting approval to implement)

#### 🌶️ Chili (your suggestion)
**What it is:** A red chili lying on the road or flying at mid-height.
**Story:** Spicy obstacle — too hot to touch.
**Mechanic:** Medium height, must jump. Could have a "double chili" variant (two stacked = must double-jump).
**Visual:** Red curved chili shape with green stem.

#### 🐕 Stray Dog
**What it is:** A street dog running toward you from the right.
**Story:** Every Kolkata street has one. He wants your chai.
**Mechanic:** 2-frame animated dog (run cycle). Medium height. Comes in packs of 2 sometimes.
**Visual:** Simple cartoon dog silhouette, brown/tan.

#### 🛺 Rickshaw / Auto
**What it is:** A parked or rolling rickshaw blocking the lane.
**Story:** Classic Kolkata traffic jam.
**Mechanic:** Wide + low — forces a clean jump, no double-jump needed.
**Visual:** Side-view auto-rickshaw silhouette (yellow/green).

#### 🪨 Pothole
**What it is:** A hole in the ground strip.
**Story:** Kolkata roads.
**Mechanic:** GAP obstacle — player must jump OVER a hole in the ground (falls through if they don't). New mechanic, first "gap" type.
**Visual:** Dark gap in the ground strip with rough edges.

#### 🥥 Falling Coconut
**What it is:** A coconut falling from above.
**Story:** Palm tree drops coconut on the delivery route.
**Mechanic:** Comes from TOP of screen, player must DUCK (crouch/slide). New mechanic.
**Visual:** Brown oval falling with speed lines.

#### 🐦 Angry Crow
**What it is:** A crow flying horizontally at head height.
**Story:** Crows steal food in Kolkata. This one wants your chai.
**Mechanic:** Flies at cup-head height. Must jump over or duck under (two variants).
**Visual:** Black bird silhouette, 2-frame wing flap.

#### ⚡ Load Shedding (Power Cut)
**What it is:** Screen goes 80% dark for 2 seconds.
**Story:** Kolkata load shedding — the lights go out.
**Mechanic:** NOT a physical obstacle — environmental hazard. Screen darkens, player must navigate blind briefly.
**Visual:** Quick screen-dim with "LOAD SHEDDING" Bengali text flash.

#### 📢 Political Poster
**What it is:** A giant poster falling from a building.
**Story:** Election posters fall off walls all the time.
**Mechanic:** Falls slowly from top, wide obstacle, must time jump.
**Visual:** Big rectangle falling, red/blue colour with squiggly "text" lines.

### Enemy Priority Order (recommended implementation sequence)
```
Phase N-1: Chili (easiest — new sprite, same mechanic as spike)
Phase N-2: Stray Dog (animated, same lane mechanic)
Phase N-3: Rickshaw (wide low obstacle, forces clean jump)
Phase N-4: Pothole (new GAP mechanic — needs ground gap logic)
Phase N-5: Falling Coconut (new DUCK mechanic — needs crouch input)
Phase N-6: Load Shedding (screen effect only, no sprite needed)
Phase N-7: Crow + Political Poster (airborne obstacles)
```
**→ Reply which enemies to do first and I'll implement one batch at a time.**

---

## 🟠 BACKGROUND — Complete Rebuild (3 phases)

### Phase E-4 — Pre-rendered building strips (cached canvas per biome)
**Status: AWAITING APPROVAL**
- Buildings get: silhouettes with varied rooflines (flat/dome/antenna/water-tank/billboard), window grids with warm/cool light per biome, depth shading (far = more muted), faint outlines.
- Zero per-frame path calls — single `drawImage` is compositor-fast.

### Phase E-5 — Biome-specific building art (4 styles)
**Para (0–300m):** Low 2–3 storey houses, tiled roofs, a tea stall silhouette, a tree gap every ~400px.
**Bazar (300–700m):** 4–6 storey mixed-use blocks, billboard signs (blank rect), shop awnings at ground level.
**Raat (700–1000m):** Same buildings but dark palette, lit windows orange/yellow, neon sign glow layer.
**Mahakash (1000m+):** Futuristic spires, dark teal/purple, blinking lights, star-scraper shapes.

### Phase E-6 — Layered parallax (4 depth layers)
**Current:** 3 layers (mountains @ 0.12, buildings @ 0.4, ground @ 1.0).
**New:**
- Layer 0: Sky gradient (static).
- Layer 1: Far mountains / distant haze @ speed × 0.08.
- Layer 2: Mid buildings (pre-rendered strip) @ speed × 0.35.
- Layer 3: Near buildings / foreground props @ speed × 0.65.
- Layer 4: Ground + road markings @ speed × 1.0.
This creates true depth and smooth scroll at all speeds.

---

## 🟡 GAMEPLAY FEEL (7 phases)

### Phase E-7 — Jump feel overhaul (coyote + hold + land squash)
**Current issues:** Double jump fires even mid-obstacle (feels accidental). Land squash is weak (0.18 lerp). Jump hold boost is barely felt.
**Enhancements:**
- Increase land squash to `0.72` target, `0.22` lerp.
- Post-land 3-frame invincibility window (prevents "ghost" obstacle hit right as you land).
- `JUMP_HOLD_BOOST` from `−0.55` → `−0.70` (20% more lift on hold).
- Visual: 3 speed-lines drawn behind cup during fast fall (`vy > 8`).

### Phase E-8 — Ground shadow under cup
**Current:** Cup floats with no shadow — looks unanchored.
**Fix:** Draw an ellipse shadow at `GROUND_Y + 4` when cup is above ground. Shadow `scaleY` = `1 - (GROUND_Y - player.y) / 200` (shrinks as cup rises). Alpha max 0.35. Zero perf cost (single ellipse).

### Phase E-9 — Obstacle variety (3 new types)
**Current:** `404`, `sad`, `spike`. All look the same (cached sprite).
**New:**
- `chai_spill`: sideways chai puddle (wide, low obstacle) — forces jump with no double-jump needed.
- `umbrella`: tall narrow spike — forces tight timing.
- `dog`: animated 2-frame pixel dog running at you (2 canvas draws alternating).
These use existing sprite-cache system, added in `buildObstacleSprite()`.

### Phase E-10 — Chai pickup arc (better feel)
**Current:** Chai pickups spawn at fixed Y heights.
**Enhancement:** When a chai spawns, give it a gentle sine bob (`y += sin(frame * 0.07) * 3`). On collection: cup does a tiny +4px "catch" squash. Floater text size pulses (20px → 28px → 20px over 12 frames).

### Phase E-11 — Speed ramp visual feedback
**Current:** Speed increases silently. Player has no sense of velocity.
**Fix:**
- At speed > 7: draw 2–4 horizontal speed lines behind the cup (short, fading, white). Lines scale with `(speed - 7) / 3`.
- At speed > 8.5: subtle vignette darkens screen edges (darker = faster).
- Score multiplier text (×2, ×3 etc.) shown for 1.5s on combo tier-up (already has `comboTier` — just needs a floater).

### Phase E-12 — Combo + streak visual polish
**Current:** Combo is tracked but almost invisible to player.
**Fix:**
- Each chai catch at combo ≥ 3: emit a tiny gold ring burst at cup position.
- Combo tier-up (3→7→12→20): 0.3s canvas `scale(1.04)` flash (zoom pulse) + tier label floater (`×2`, `×3`, `×4`, `×5`).
- Combo break: red "BREAK" floater at cup position.

### Phase E-13 — Onboarding "ghost" obstacle
**Current:** First run starts with no obstacles for ~3s, then sudden spike.
**Better:** First obstacle is always `chai_spill` (wide/low, easy to clear). Second is a normal spike. Player learns jump naturally without text prompts.

---

## 🟢 POLISH + PERSISTENCE (5 phases)

### Phase E-14 — Skin preview in settings (live cup render)
**Current:** Skin row shows text buttons only. Player can't see what the skin looks like.
**Fix:** Below the skin seg row, draw a 48×56px mini canvas showing the cup with the currently selected skin tint applied. Updates live as player taps skins. No new DOM — draw into an `<canvas>` element inside the sheet.

### Phase E-15 — Best score persistence glow
**Current:** Personal best is stored in `PROFILE.best` but the death screen `hookBest` line just shows a number.
**Fix:** If this run beats the previous best: death card `<p>` (score) gets a gold pulsing border (`box-shadow: 0 0 0 2px gold` animate 3×). `buildHookLine()` returns "🏆 NEW BEST!" as first priority over all other framings.

### Phase E-16 — Sound overhaul (3 new SFX)
**Current:** `sfxJump`, `sfxDouble`, `sfxHit`, `sfxChai`, `sfxLevelUp`, `sfxOver` — all Web Audio synthesis.
**New:**
- `sfxComboTier`: rising arpeggiated chord (4 quick tones) on tier-up.
- `sfxMilestone`: deep gong + shimmer on km milestone.
- `sfxNewBest`: fanfare arp (5 tones ascending) on new personal best.
All synthesised via Web Audio — zero file assets.

### Phase E-17 — Pause menu "Run stats" micro-card
**Current:** Pause menu has Resume / Settings / Quit. No stats.
**Fix:** Add a tiny stats bar under the Resume button showing: `🏃 {dist}m · ☕ {chai} · ❤️ {hits left}`. Single line, 11px, muted color. No extra DOM element needed — baked into the pause card HTML.

### Phase E-18 — Local leaderboard (top-5 per device)
**Current:** `PROFILE.best` is one number. No history.
**Fix:** Store `PROFILE.topRuns = [{score, dist, date, skin}]` (max 5 entries, sorted by score). Show in death screen as a tiny 3-column table: `#1 · 1200 · 340m`. Persists in `localStorage` via `saveProfile()`.

---

## 🔵 LONG-TERM / DISCUSS (2 phases — not coding yet)

### Phase E-19 — Biome crossfade (smooth sky + building transition)
**Current:** Biome switches abruptly (instant palette change).
**Discussion:** Alpha-blend two biome bg strips over `CFG.BIOME_CROSSFADE_M` meters. Need to benchmark perf — two `drawImage` calls per frame. Could use CSS filter on the canvas layer instead (single property transition). Need to agree on approach.

### Phase E-20 — Haptic feedback (mobile)
**Current:** No haptics.
**Discussion:** `navigator.vibrate([8])` on jump, `[20]` on hit, `[5,5,5]` on combo tier-up. iOS doesn't support `vibrate` API — would need a polyfill workaround via AudioContext click. Needs user testing before committing.

---

## 📋 Implementation Priority Order
```
MUST (bugs):      E-1, E-2, E-3
NEXT (BG):        E-4, E-5, E-6
THEN (feel):      E-7, E-8, E-10, E-11, E-12
THEN (polish):    E-14, E-15, E-16, E-17
DISCUSS FIRST:    E-9, E-13, E-18, E-19, E-20
```

## ❓ Discussion Questions for You
1. **Buildings:** Should each biome have a unique color palette, or just shape variation? (e.g. Para = warm terracotta, Bazar = blue-grey, Raat = dark + neon, Cosmic = teal/purple)
2. **Double-jump sticker:** Should "double jump used" be shown anywhere? Currently invisible to new players.
3. **Skin preview:** Mini canvas inside settings, or just color swatch circle?
4. **Local leaderboard:** Death screen table vs separate "High Scores" tap on death screen?
5. **Haptics:** Want to try it, or skip?
