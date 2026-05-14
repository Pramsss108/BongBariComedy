# 🍵 Chai Runner — The Plan (Non-Coder Edition)

> **Mashla, forget code. This is the *vision*.** What the game IS, how it FEELS, why people will play it again and again, and how it works on every device — phone, tablet, desktop. No tech words.

---

## 🎯 1. What is Chai Runner, really?

**One sentence:** A tiny Bong Bari clay-cup runs forever, jumping over Bengali household chaos, sipping more chai, going further than yesterday.

It's the same shape as **Subway Surfers / Temple Run / Chrome Dino** — the genre everyone already understands the moment they see it. Tap to jump. Don't die. Beat your high score. That familiarity is a *feature*, not a flaw — players don't need to learn anything to start having fun in 2 seconds.

What makes it ours:
- 🇮🇳 **Bengali soul** — Pada, Bazar, Raat, Mahakash. Not generic. Every obstacle is something a Bengali household joke is made of.
- ☕ **Chai is the heartbeat** — collect it, combo it, win Bishesh chai, brag to friends.
- 🎨 **Hand-drawn premium look** — not pixel art, not generic stock. Every character has personality (the chili glares, the fly is rude, the potty smirks).
- 🏆 **Always one more run** — silent achievements, daily streaks, unlockable cup skins. The player doesn't notice they're hooked.

---

## 🎮 2. How it should FEEL when you play

```
      Tap                    Tap-Hold-Release            Tap mid-air
       │                            │                         │
       ▼                            ▼                         ▼
   Quick hop                  Higher arc                 Double jump
   (small enemy)            (longer obstacle)           (panic save)
```

**Three feelings the player should always have:**

| Feeling | When | How we deliver it |
|---|---|---|
| 😌 **"That was fair"** | After every death | Generous hitbox (visible art is bigger than the kill zone), 1.5s mercy after a hit, near-misses give bonus points |
| 🔥 **"I'm in the zone"** | After 3 chai in a row | Combo silently doubles, then triples, screen feels alive but not noisy |
| 🤯 **"Wait, what was that?!"** | First time something new appears | Storm rains chai every 800 score, weird sky in Mahakash, hidden expert obstacles unlock by score |

**Feel rules we never break:**
- Tap = jump. Always. Same on phone, mouse, keyboard.
- The first 30 seconds are EASY. Even a 5-year-old finishes the first run.
- The screen never says "Game Over". It says **"চা শেষ!"** (chai is finished!) — playful, not punishing.
- Never show a difficulty slider. The game silently adapts to the player.

---

## 🌍 3. The Journey — Same shape as every great runner

Just like Subway Surfers cycles through cities, our cup runs through 4 Bengali "vibes":

```
START                                                              ENDLESS
  │                                                                   │
  ▼                                                                   ▼
🏘️ PARA ──── 🏪 BAZAR ──── 🌙 RAAT ──── 🌌 MAHAKASH ──────────────► ∞
  পাড়া         বাজার          রাত           মহাকাশ
  
  chill        busy          spooky        psychedelic
  daytime      market        night         cosmic forever
  0–300m       300–700m      700–1000m     1000m → infinity
```

Between each vibe the colors *blend* over a few seconds, so the world feels alive — not like switching a slide.

After 1000m, the player has officially **"won"** (they get the **Tea Master** badge). But the game keeps going forever after that, with the sky slowly shifting colors so it never gets boring to look at.

---

## 📱 4. Works on EVERY device — automatically

This is non-negotiable. Most of our Instagram audience plays on a phone, on the go, with one thumb.

```
┌─────────────────────────────────────────────────────────┐
│   PHONE       TABLET       DESKTOP        TV BROWSER    │
│   📱           🪟            🖥️              📺          │
│                                                          │
│   Tap          Tap         Click/Space    Click         │
│   to jump      to jump     to jump        to jump       │
│                                                          │
│   Auto         Auto        Full quality   Full quality  │
│   detects      detects                                   │
│   slow phone                                             │
│   → drops to                                             │
│   simpler art                                            │
└─────────────────────────────────────────────────────────┘
```

**What we already do for mobile (built in, you don't have to think about it):**

- ✅ **One-finger control** — tap anywhere to jump. No buttons.
- ✅ **Notch-safe** — the score doesn't get hidden behind iPhone notches.
- ✅ **Retina sharp** — looks crisp on high-DPI screens, but capped so old phones don't melt.
- ✅ **Auto-quality** — game watches its own frame-rate for 1 second; if the phone is struggling, it silently drops to a simpler look. Player never sees a setting.
- ✅ **Battery friendly** — sprites baked once, not redrawn every frame.
- ✅ **Pause when phone screen turns off** — auto-pauses when you switch tabs or get a call.
- ✅ **Sound unlocks on first tap** — iOS requires this, we handle it invisibly.
- ✅ **Reduced motion respected** — if the user has "reduce motion" turned on in their OS, we tone down shake.
- ✅ **Swipe down** — fast-fall move (advanced players will love it).

**Devices to test before launch:**
1. iPhone (old + new)
2. Android phone (mid-range Samsung/Realme — what most viewers actually use)
3. iPad / Android tablet
4. Desktop Chrome (already done)
5. Mobile Chrome AND mobile Safari (different rendering engines)

---

## 🎨 5. Modern look — without being trendy garbage

We're following the **2025 mobile-game playbook** (Subway Surfers, Crossy Road, Alto's Odyssey style):

| Trend | What we do |
|---|---|
| **Flat illustrated characters** | ✅ Hand-drawn personalities, no generic 3D |
| **Vibrant biome palettes** | ✅ 4 zones, each a distinct color story |
| **Subtle particle effects** | ✅ Petals, fireflies, jump dust, near-miss flash |
| **Smooth physics** | ✅ Variable jump height, coyote time, jump buffer |
| **Silent progression** | ✅ Tier combos, achievements pop in without bragging |
| **Daily hook** | ✅ Daily streak counter, daily seed for fair leaderboards |
| **No pay-to-win** | ✅ All skins unlock by playing |
| **No ads in-game** | ✅ It's a brand experience, not a revenue grind |

---

## 🏆 6. The "one more run" hooks — invisible to the player

The player thinks they're just playing. Behind the scenes, 8 different things are quietly pulling them back:

```
1. ⭐  Best score ticker         "I almost beat my best!"
2. 🎯  Combo chain               "If I just don't get hit..."
3. 💎  Bishesh chai every 250m   "I want one of those gold ones"
4. 🌌  New biome at 700m        "I've never seen this purple part"
5. 🏆  Tea Master at 1000m      "Just need to hit 1km once"
6. 🎨  Cup skins unlock         "Oh, gold cup unlocked!"
7. 📅  Daily streak             "Don't break the streak"
8. 🥷  Achievements             "What unlocks at 500m?"
```

Each one alone is small. Stacked, they're addictive without being manipulative.

---

## 🛠️ 7. Built like a modern endless runner

**Same architecture every successful runner uses since 2012** — we didn't reinvent anything weird:

```
┌──────────────────────────────────────────────────────┐
│  1. Game world scrolls left-to-right at fixed speed  │
│  2. Player stays still on X, only moves up/down       │
│  3. Obstacles spawn from the right, fly past, recycle│
│  4. Hit detection = simple rectangles                 │
│  5. Score = distance + chai bonuses                   │
│  6. Difficulty curves smoothly via density not speed  │
│  7. Save game progress in browser storage             │
└──────────────────────────────────────────────────────┘
```

This is the **proven pattern** — battle-tested on hundreds of millions of phones across Subway Surfers, Temple Run, Crossy Road, Chrome Dino. We just dressed it in Bengali clothes.

**Modern touches we added:**
- 🪶 **Fixed timestep** — physics never breaks on slow phones (the game stays smooth even if FPS drops)
- 🎚️ **Auto quality probe** — game tests itself for 1 second, picks the right detail level
- 🌈 **Hue rotation in Mahakash** — keeps the late-game from feeling stale
- 💾 **Versioned save** — when we add features, old player profiles upgrade themselves
- 📊 **Local-only telemetry** — we know how players die, but their data never leaves their phone

---

## 🚀 8. What we're going to do next (the roadmap)

These are the next 3 chunks of work, ranked by impact for our audience:

### Phase A — **Polish the playable** (this week)
- ✅ Replace placeholder art with the approved characters (DONE)
- ✅ Fix the spinning chili bug (DONE)
- 🔲 Test on real phone (iPhone Safari + Android Chrome)
- 🔲 Confirm tap-to-start works on first interaction (iOS audio unlock)
- 🔲 Confirm score is readable on a 5.5" screen with notch
- 🔲 Verify no jank when the screen rotates

### Phase B — **More characters in rotation** (next)
- 🔲 Add Marie biscuit as a *new* pickup (currently only chai/heart/bishesh)
- 🔲 Add Singara + Bread as rare bonus pickups
- 🔲 Add the 11 cup skins to the skin picker UI

### Phase C — **The Bosses** (later, separate phase)
- 🔲 Build boss-fight system (engine doesn't have one yet)
- 🔲 Bhoot Jolokia boss appears at 2000m
- 🔲 Macchi Rani boss appears at 5000m
- 🔲 Toxic Potty boss appears at 10000m

### Phase D — **Social hooks** (the viral phase)
- 🔲 Share-card screenshot ("I scored 1234 in Chai Runner!")
- 🔲 Daily challenge ("Today's seed: tight gaps")
- 🔲 Embed on bongbari.com homepage as a "play while you wait" widget
- 🔲 Optional Instagram story sticker integration

---

## ✅ 9. How to verify it actually works on your phone

**Right now (without deploying):**
1. Make sure your dev server is running (`npm run dev:live`)
2. Find your computer's local IP (e.g. `192.168.1.5`)
3. On your phone (same WiFi), open `http://192.168.1.5:5173/?__bb_preview=down`
4. Tap to play. If the chili stands upright and you can jump → ✅ working

**After we deploy:**
1. Open `https://www.bongbari.com/?__bb_preview=down` on your phone
2. Same test as above

**Red flags to watch for on phone:**
- ❌ Score hidden behind notch
- ❌ Tap doesn't register first time
- ❌ Lag spikes when many particles spawn
- ❌ Game restarts when screen rotates
- ❌ Audio doesn't play after first tap

If any of these happen, screenshot it and tell me — we'll fix it.

---

## 💡 10. The big idea, one final time

> **A Bong Bari clay cup runs through Bengal forever. Every household nightmare tries to stop it. Every chai sip pushes it further. The player thinks they're just tapping. They're actually living a tiny Bengali story, on any phone, anywhere, free forever.**

That's the game. The architecture above just makes that idea reliable.

---

*Made with ❤️ for Mashla — the CEO of BongBari Media Group.*
