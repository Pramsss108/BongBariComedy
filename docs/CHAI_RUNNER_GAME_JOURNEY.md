# 🍵 Chai Runner — Full Game Journey (Non-Coder Walkthrough)

> **For Mashla:** This is the story of what your player sees from the moment they tap "start" until they crash. No code. Just pictures, distances, and what each character does.

---

## 🐛 First — Why was the Green Chili spinning weirdly?

**Short answer:** A leftover behavior from the old art.

**Long version:**
Before we replaced the art, the `404` obstacle was a flat **red cube with "404" text** on it. A flat cube looks boring if it just sits there, so the engine was told:

> *"Every frame, spin the cube a little bit (`o.rot`)."*

When we swapped the cube's picture for our beautiful Green Chili character, the engine kept following its old order — *"spin this thing"* — because nobody told it the new picture is a character that should stand upright. So the chili was **inheriting the cube's spin animation**, which is why it twirled like a propeller. 🌀🌶️

**The fix (just done):**
We added a tiny rule to the spin command:

> *"Only spin the obstacle if it's still the old red cube. If our character art (`window.BBModels`) is loaded, leave it alone — it has its own gentle bob/sway built in."*

```
        ┌─────────────────────────┐
BEFORE: │  obstacle = '404'?      │  →  SPIN IT 🌀  (chili twirling = bug)
        └─────────────────────────┘

         ┌──────────────────────────────────────────┐
AFTER:   │  obstacle = '404'  AND  no character art? │  →  SPIN IT  (legacy cube only)
         │  obstacle = '404'  AND  chili is loaded?  │  →  Stand upright 🌶️  (gentle bob)
         └──────────────────────────────────────────┘
```

Refresh the game (Ctrl+F5) → the chili will now stand proudly without rotating.

---

## 🗺️ The Full Game Journey — A Map

The world is divided into **4 biomes (areas)**. As the player runs, the background, music vibe, and difficulty change. Here's the entire run from 0m to ∞:

```
   START                                                           ENDLESS
     │                                                                │
     ▼                                                                ▼
┌─────────┬─────────────┬──────────┬──────────────────────────────────────┐
│  PARA   │    BAZAR    │   RAAT   │            MAHAKASH (Cosmic)         │
│ পাড়া   │   বাজার     │   রাত    │              মহাকাশ                  │
│ 0–300m  │  300–700m   │ 700–1000m│            1000m → ∞                 │
│         │             │          │                                      │
│ 🏘️ chill │ 🏪 noisy    │ 🌙 spooky │ 🌌 hue-shifting psychedelic endless  │
└─────────┴─────────────┴──────────┴──────────────────────────────────────┘
   easy        medium       harder           hardest, faster, weirder
```

Between two biomes there's a **120m crossfade** — the colors slowly bleed into each other so it never feels like a hard cut.

---

## 🎭 The Cast — Who You'll Meet (in run order)

These are the characters baked into the game right now. Drawing of each + when it appears + what it does:

### 1. 🥤 The Player — Bong Bari Cup
```
       ___
      ( o.o )    <- live blinking eyes (drawn every frame on top)
     /|cup |\    <- cup body (baked sprite)
      |____|
       / \      <- live running legs (drawn every frame on top)
      /   \
```
- **Where:** Always on screen, left side.
- **Job:** Tap / space-bar to jump over enemies, grab chai cups & hearts.
- **Special:** The *cup* is a baked picture, but the *eyes* and *legs* are drawn fresh every frame so they can blink, look around, and run. That's why we did NOT replace the cup with a character cup — it would break the live overlays.

---

### 2. 🌶️ Green Chili — Obstacle "404"
```
        🍃
        |
       (•_•)     <- white wide eyes, angry brows
      /  ▼  \    <- frowny mouth
     |  CHILI |  <- curvy green body, glossy highlight
      \      /
       \    /
        \__/
        / \
       👟 👟    <- two little feet, walking
```
- **Where:** Spawns from the very first biome (Para) and continues through the run.
- **Behavior:** Walks toward the player. **Stands upright** (after today's fix). Has a tiny built-in bob.
- **Vibe:** "Don't touch me, I'm spicy!" 🔥

---

### 3. 🪰 Housefly — Obstacle "sad"
```
      ╱╲    ╱╲     <- transparent flapping wings
     ╱  ╲  ╱  ╲
       ●●        <- big red compound eyes
      ┌──┐
      │██│         <- striped dark body
      └──┘
      ╱│╲╱│╲      <- 6 little legs
```
- **Where:** Mid-run obstacle (typically Bazar onwards).
- **Behavior:** Hovers, wings flap fast, body sways gently. Annoying like a real housefly.
- **Vibe:** Disrespect personified. 😤

---

### 4. 💩 Potty — Obstacle "spike"
```
         💨💨        <- green stink lines rising
       ╭───╮
      (👁  👁)       <- cute white eyes
       ╲ ⌣ ╱        <- happy smirk (it knows what it's done)
      ╭─────╮
     ╱       ╲       <- 3-tier brown swirl
    ╱─────────╲
```
- **Where:** Harder obstacle, more frequent in Raat biome and Mahakash.
- **Behavior:** Sits there, stinks, dares you to jump.
- **Vibe:** Bengali household horror. 🚽

> *Note:* The full **Toxic Potty boss** (the angry sludge-fist roaring monster you approved in DevModels) is **not yet spawned** — the engine has no boss-fight logic yet. That's a separate feature phase.

---

### 5. 🥤 Bhar Cha — Pickup (Chai)
```
        ☕💨💨      <- 3 puffy steam trails
       ┌─────┐
       │  o o │    <- full happy face
       │   ⌣  │    <- smiling mouth with little teeth
       │ Bhar │    <- name badge in middle of cup
       │  Cha │
       └─────┘
        / \        <- legs walking
       👟 👟
```
- **Where:** Pickups scattered throughout the run.
- **Job:** Grab to score combo / extra points.
- **Vibe:** The friendly clay cup that loves you. ❤️

---

### 6. ❤️ Heart — Pickup (Extra Life)
- **Where:** Rare pickup.
- **Job:** Restore one of your 3 lives.

---

### 7. ✨ Bishesh — Pickup (Special Power-up)
- **Where:** Very rare.
- **Job:** Triggers a special effect / shield / score multiplier (engine-defined).

---

## 🎬 The Story Beat-by-Beat — What the Player Experiences

```
TIME ─────────────────────────────────────────────────────────────────►

0m       Tap to start. Player cup appears. Para biome (পাড়া) — chill, daytime.
         First few enemies: a Chili here, a Chai pickup there.
         Player learns to jump.

300m     ✨ Crossfade begins → BAZAR (বাজার). Background gets busier, color shifts.
         Spawn rate slightly tighter. Flies start showing up alongside chilies.

700m     ✨ Crossfade → RAAT (রাত). Sky goes deep blue/purple. Spookier.
         Potties appear more often. Obstacles come faster.

1000m    🌌 MAHAKASH (মহাকাশ). Endless cosmic zone.
         The whole color palette starts slowly rotating hues to fight visual fatigue.
         Player is now in expert territory. Set-pieces splice in as milestones hit
         (1km, 2.5km, 5km, …). Silent toasts pop showing "1km", "2.5km", etc.

∞        Player eventually misses a jump → loses a life dot.
         3 misses → game over → death screen with score.
```

---

## 🧠 What's Behind the Scenes (Plain English)

| Concept | What it actually means |
|---|---|
| **Sprite** | A pre-drawn picture of a character, baked once at startup, then stamped onto the screen wherever needed. Fast. |
| **Live overlay** | Things drawn fresh every frame on top of the sprite. Used for blinking eyes & running legs on the player. |
| **Biome** | A "zone" with its own background colors and music vibe. We have 4. |
| **Crossfade** | The 120-meter blend between two biomes so the change feels smooth, not a jump-cut. |
| **DDA** | "Dynamic Difficulty Adjustment" — the game silently makes things harder/easier based on how well you're doing. |
| **Hitbox** | Invisible rectangle around an enemy/pickup that decides "did the player touch it?". The visual sprite can be bigger than the hitbox (we made the chili/fly/potty canvases ~3x hitbox so they breathe). |
| **`window.BBModels`** | The new shared file (`bb-cr-models.js`) that holds all your beautiful character drawings. The game checks: *"Is BBModels loaded? Use the pretty art. Not loaded? Use the old placeholder."* That way nothing ever crashes. |

---

## 🔮 What's Still Coming (Not in Game Yet)

You approved 21 designs in DevModels. Here's what's *live in the game right now* vs *waiting for a future phase*:

| Character | In-Game? | Notes |
|---|---|---|
| Bong Bari Cup (player) | ✅ Live | Engine paints eyes & legs on top — that's why we kept it. |
| Green Chili | ✅ Live | (now standing upright after today's fix) |
| Housefly | ✅ Live | |
| Potty (small, cute) | ✅ Live | |
| Bhar Cha (chai pickup) | ✅ Live | |
| Marie Biscuit (cute waving) | ⏳ Pending | Needs to be spawned as a new pickup type |
| Singara | ⏳ Pending | Needs new pickup slot |
| Bread | ⏳ Pending | Needs new pickup slot |
| 11 Hero Cup Skins | ⏳ Pending | Needs a "skin selector" UI + persistence layer |
| **Bhoot Jolokia (boss)** | ⏳ Pending | Engine has no boss-spawn logic yet |
| **Macchi Rani (boss)** | ⏳ Pending | Same — needs boss phase |
| **Toxic Potty (boss)** | ⏳ Pending | Same — needs boss phase |

---

## ✅ Right Now — How to See the Fix

1. Hard refresh the game tab: **Ctrl + F5** at `http://localhost:5173/?__bb_preview=down`
2. Tap to start.
3. Watch a green chili come toward you — it should now **stand upright** with a gentle bob, no more propeller spinning. 🌶️✨

---

*Made with ❤️ for Mashla — the CEO of BongBari Media Group.*
