# Bong Bari — Down Page Game Plan **v2 (FINAL)**
**Codename: "Chai Toofan"** ☕🌪️
*Inspired by Google's T-Rex offline game — but Bengali, 3D, and gorgeous.*

---

## 🎮 The Game (One Sentence)
> **You are a glowing chai-cup spaceship. Asteroids fly at you forever. Dodge them with your mouse. Collect floating chai cups for points. The longer you survive, the faster everything goes. Site comes back → game ends.**

That's it. Like T-Rex dino: simple, addictive, infinite, gets harder, has a high score.

---

## 🕹️ How People Play

### The Screen
```
┌─────────────────────────────────────────────┐
│  🔴 Bong Bari is updating · Reconnecting... │ ← Top status (always visible)
│                                             │
│         ⚠️                  🍵              │ ← Asteroids + chai flying in
│                                             │
│              ⚠️                             │
│                                             │
│                  🟡  ← YOU (glowing ball)   │
│                                             │
│         🍵           ⚠️                     │
│                                             │
│  Score: 240  ·  Best: 1,250  ·  ❤️❤️❤️       │ ← Bottom HUD
│         Site retry in 14s ↻                 │
└─────────────────────────────────────────────┘
```

### Controls
| Device | How |
|--------|-----|
| **Mouse** | Move mouse → ball follows your cursor |
| **Phone** | Drag finger → ball follows your finger |
| **Keyboard** | Arrow keys / WASD (accessibility) |
| **Gamepad** | Joystick supported |

### Rules
- **Dodge asteroids** (purple/grey rocks flying toward you) → hit one = lose ❤️
- **Catch chai cups** (golden steaming cups) → +10 score
- **3 lives** (❤️❤️❤️) — lose all = "Game Over → Try Again" button
- **Speed increases** every 100 points (asteroids faster, more frequent)
- **Best score** saved locally (only on YOUR device, never sent anywhere)
- **No login, no share buttons, no social pressure**

---

## 📊 The 30-Phase Roadmap (6 Batches × 5 Phases)

### 🟡 BATCH A — "Game Foundation" (Phases 1–5)
> Get the basic playable game working. T-Rex style minimum-viable.

| # | Phrase | What It Means |
|---|--------|---------------|
| **1** | *"Player Ball"* | Yellow glow ball follows mouse/finger smoothly with easing. Already exists — reuse it. |
| **2** | *"Asteroid Spawn"* | Grey/purple rocks spawn at random Z-distance, fly toward camera at constant speed. |
| **3** | *"Chai Spawn"* | Golden steaming chai cups spawn the same way, slightly slower, glow softly. |
| **4** | *"Hit Detection"* | Sphere collision: ball ↔ asteroid (lose life), ball ↔ chai (collect, +10). |
| **5** | *"Score & Lives HUD"* | Bottom pill shows `Score: 0  ·  Best: 0  ·  ❤️❤️❤️`. Updates in real time. |

---

### 🟠 BATCH B — "Game Feel & Juice" (Phases 6–10)
> Make every action feel satisfying — the secret sauce of T-Rex's addictiveness.

| # | Phrase | What It Means |
|---|--------|---------------|
| **6** | *"Sip Sound"* | Tiny *slurp* sound when chai collected. Procedural via Tone.js (no audio file needed). |
| **7** | *"Asteroid Crunch"* | Camera shakes 80ms + red flash + low *thud* on hit. Player feels the damage. |
| **8** | *"Chai Sparkle Burst"* | Particle explosion (10 sparkles, 0.4s) when chai collected. Pure dopamine. |
| **9** | *"Near-Miss Glow"* | Asteroid passes within 0.5 units → player ball briefly glows brighter. Rewards skill. |
| **10** | *"Score Pop Animation"* | When +10 added, "+10" floats up from chai cup, fades. Tactile feedback. |

---

### 🔴 BATCH C — "Infinity & Difficulty" (Phases 11–15)
> The reason T-Rex is addictive: it slowly gets harder forever.

| # | Phrase | What It Means |
|---|--------|---------------|
| **11** | *"Speed Ramp"* | Every 100 score → spawn rate +5%, asteroid speed +3%. Soft curve, never punishing. |
| **12** | *"Wave Patterns"* | At 500 score → asteroids start flying in patterns (lines, V-shapes), not random. |
| **13** | *"Boss Bug"* | Every 1000 score → one giant slow asteroid shaped like a "404 error" cube. Survive 5s = +200. |
| **14** | *"Combo Multiplier"* | Catch 5 chais in a row without missing → next 10s = 2x score. |
| **15** | *"Endless"* | No win state. Just keep going. Best score saved to localStorage as `bb_chai_best`. |

---

### 🟣 BATCH D — "Bong Bari Soul" (Phases 16–20)
> Make it unmistakably ours — not a generic asteroid game.

| # | Phrase | What It Means |
|---|--------|---------------|
| **16** | *"Boltu Voice"* | At game start: tiny "চল!" ("Chal!" = "Go!") in soft Bengali male voice (Web Speech API). |
| **17** | *"Bengali Quips"* | Every 200 score → faint phrase fades in/out: "বাহ!", "চা টা গরম!", "এই তো!" Random rotation. |
| **18** | *"Mascot Cameo"* | Every 1500 score → a low-poly Bong Bari mascot head silently floats by in the background. |
| **19** | *"Tea Stain Aesthetic"* | Subtle warm tea-color overlay when score > 500 (like the page is steeped in chai). |
| **20** | *"Game Over Card"* | Glassmorphism card: "চা শেষ! Score: 240" + "Best: 1,250" + "Try Again" button. |

---

### 🔵 BATCH E — "Down-State Clarity" (Phases 21–25)
> Make sure NOBODY confuses this with the real homepage. Site-down message is loud and constant.

| # | Phrase | What It Means |
|---|--------|---------------|
| **21** | *"Status Banner"* | Top center: 🔴 `Bong Bari is updating · Back soon` — pulsing red dot, always visible. |
| **22** | *"Live Countdown"* | Below HUD: `Site retry in 18s ↻` — counts down, then silently checks if site is back. |
| **23** | *"Smart Reconnect"* | Background `fetch('/healthcheck')` every 20s. If site responds → smooth reload to homepage. |
| **24** | *"Game Pause On Reconnect"* | When site comes back mid-game: gentle pause + "Bong Bari is back! 🎉 Continue?" or "Go Home" |
| **25** | *"Why Am I Here?" Help"* | Tiny `?` icon top-right → opens 1-line tooltip: "Our site is updating. Play while you wait." |

---

### 🟢 BATCH F — "Power Tech Stack" (Phases 26–30)
> The agentic / advanced tech that makes this elite-tier and easy to extend.

| # | Phrase | What It Means | Why |
|---|--------|---------------|-----|
| **26** | *"Service Worker Cache"* | Cache game JS/assets in SW so game **works fully offline** even if CDN is down too. | True bulletproof down-page |
| **27** | *"Tone.js Procedural Audio"* | All sounds generated in browser (no MP3 files). Sip, thud, voice — all synthesized. | Zero load weight, infinite variety |
| **28** | *"Three.js Postprocessing"* | UnrealBloom + FXAA passes → chai cups *actually* glow, asteroids have soft anti-aliased edges. | Apple-grade visual quality |
| **29** | *"Gemini Nano On-Device"* | If Chrome's built-in AI available → generate fresh Bengali quips on-the-fly (no API call). | Each session feels alive & unique |
| **30** | *"Stats Telemetry (Local)"* | Game logs FPS, hit rate, avg session time to localStorage only. Dev can read via `localStorage.bb_stats` to tune difficulty. | Data-driven balancing, zero privacy cost |

---

## 🛠️ Tech Stack (Final)

| Layer | Tool | Why |
|-------|------|-----|
| **3D Engine** | Three.js v0.160 | Already loaded, lightweight |
| **Audio** | Tone.js (12KB) | Procedural sound, no MP3 weight |
| **Voice** | Web Speech API | Free, native, Bengali-capable |
| **Postprocessing** | three/examples/jsm/postprocessing | Bloom, FXAA |
| **Storage** | localStorage | High score, stats — local only |
| **Network** | fetch + Service Worker | Healthcheck + offline cache |
| **AI (optional)** | window.ai (Gemini Nano) | On-device Bengali quip generation |
| **Input** | mouse / touch / Gamepad API / keyboard | Universal access |
| **Performance** | requestAnimationFrame + adaptive pixel ratio | 60 FPS on mid-range Android |

**Total bundle target:** ≤ 60 KB (excluding Three.js CDN)

---

## 🤖 Agentic Build Workflow (How We Make It Fast)

| Tool / Agent | Use For |
|--------------|---------|
| **OpenClaude (you have it)** | Autonomous coding loops — implement Batch A end-to-end |
| **Cursor / Copilot Agent Mode** | Refactor passes, multi-file edits |
| **Stitch (Google)** | UI mockups for HUD, game-over card |
| **Three.js Editor** | Scene tuning, lighting calibration without code |
| **Meshy.ai** | Generate low-poly Bong Bari mascot for Phase 18 |
| **ChatGPT/Claude** | Generate Bengali quip rotation list (Phase 17) |
| **Vitest + Puppeteer** | Auto-test that game loads + first frame renders |

---

## 🛡️ Hard Rules (Never Break)

1. ✅ **Total bundle ≤ 60KB** (game logic + audio + postprocessing)
2. ✅ **60 FPS on $200 Android** — auto-downgrade pixelRatio if below 50 FPS
3. ✅ **Zero external API calls during gameplay** — must work even if our backend is dead
4. ✅ **Auto-reload silently checks site every 20s** — never interrupts game without permission
5. ❌ **No social share buttons, no signup, no leaderboard upload, no tracking**
6. ✅ **Reduced-motion respected** — game becomes static "Press SPACE to play" if user prefers
7. ✅ **Preview mode (`?__bb_preview=down`) never auto-reloads** — for testing only
8. ✅ **High score is per-device only** — never synced, never shared

---

## 🎨 Visual Direction

- **Palette:** Yellow `#f4c430` (player + chai) · Purple `#8b5cf6` (asteroids) · Red `#ef4444` (status/damage) · BG `#050505`
- **Typography:** Inter + Hind Siliguri (Bengali) — already loaded
- **Motion language:** Snappy 0.2s transitions, easing `cubic-bezier(0.22, 1, 0.36, 1)`
- **Sound:** Procedural, all mutable. Default ON desktop, OFF mobile. Volume slider in pause menu.

---

## 📅 Build Order (Recommended)

**Day 1:** Batch A (5 phases) → playable MVP
**Day 2:** Batch B + C (juice + difficulty) → addictive
**Day 3:** Batch D + E (brand + clarity) → on-brand
**Day 4:** Batch F (tech polish) → bulletproof

---

## ✅ Success Metric

> **"User stays on the down page for >30 seconds and leaves with a smile."**

If we hit that → downtime becomes a brand asset, not a liability.

---

*Plan only. Zero implementation yet. Awaiting green light to build Batch A.* 🚀
