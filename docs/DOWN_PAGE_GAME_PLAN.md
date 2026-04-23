# Bong Bari — Down Page Game Plan
**Codename: "Bong-verse Standby"**

## 🎯 The Big Idea (Why)
A "down page" isn't a dead-end — it's our **Brand Moment**.
Every time the site goes down (rare), users land in a beautiful, **interactive Bong Bari mini-universe** they can play with. Instead of frustration, they share screenshots. The downtime becomes free marketing, and our brand mascot/world gets imprinted in their head.

**Core promise:** "Site is updating? Cool — play with our cosmos for 60 seconds."

**Tone:** Playful, premium, distinctly Bengali — quirky humor + Apple-grade polish.
**Tech ceiling:** Pure Three.js + vanilla JS, < 50KB total. Loads instantly. Mobile-first. Mouse + touch.

---

## 🎮 The 20-Phase Roadmap (Phrase × Batch)

### 🟡 Batch A — "First Contact" (Foundation, Phases 1–4)
> Goal: Polish the existing Cosmic Energy Core into a tactile, satisfying toy. No game yet — just **feel**.

| # | Phrase | What It Means | Wow-Factor |
|---|--------|---------------|------------|
| **1** | *"Touch the Star"* | Click/tap the yellow core → it shockwave-pulses, particles burst outward, sound `*pop*` | First haptic moment — proves the scene is alive |
| **2** | *"Whisper Cursor"* | Cursor leaves a faint **glowing trail** of micro-particles behind itself in 3D space | Pure satisfaction loop |
| **3** | *"Breath of Bari"* | Core slowly pulses to a **3-second breathing rhythm** (matches calm meditation) | Cinematic mood |
| **4** | *"Bengali Hum"* | Soft ambient drone (tanpura + space pad) loops at –30dB, mute toggle bottom-right | Audio identity locked |

---

### 🟠 Batch B — "Spark of Play" (Mini-Interactions, Phases 5–8)
> Goal: Introduce light gamified moments. User discovers them organically.

| # | Phrase | What It Means | Wow-Factor |
|---|--------|---------------|------------|
| **5** | *"Catch the Moja"* | Tiny golden orbs ("moja" = fun) drift past. Tap to collect. Counter top-right: `Moja: 0` | Instant dopamine hit |
| **6** | *"100 Moja Unlock"* | At 100 moja → core EXPLODES into a Bong Bari logo that floats in space for 3s | Achievement reveal |
| **7** | *"Whispers"* | Every 8s a faint Bengali phrase fades in/out near cursor: "একটু অপেক্ষা করো", "গরম চা আনো", "আমরা আসছি" | Emotional warmth |
| **8** | *"Gravity Toggle"* | Press SPACE (or tap a moon icon) → particles fall like rain, then float again | Power user delight |

---

### 🟣 Batch C — "Mini-Game" (Real Game Loop, Phases 9–12)
> Goal: A fully playable 60-second game inside the down page. Optional, never blocks the "we're back" reload.

| # | Phrase | What It Means | Wow-Factor |
|---|--------|---------------|------------|
| **9** | *"Chai Catcher"* | Steaming chai cups fall from top of screen. Drag a saucer at bottom to catch them. +10 pts each | Classic, addictive, on-brand |
| **10** | *"Boro Bhai Boss"* | Every 30s a giant winking Bong Bari mascot floats across screen — catch 3 chais in his shadow for 5x bonus | Boss-fight rhythm |
| **11** | *"Leaderboard Vibes"* | Local high-score saved in localStorage, displayed as `Tomar Best: 240 🏆` | Replay motivation |
| **12** | *"Share Your Score"* | "Share" button → opens Web Share API or copies "I scored 240 in Bong Bari Chai Catcher 🍵 while their site was updating! bongbari.com" | Viral hook — turns downtime into marketing |

---

### 🟢 Batch D — "Cinematic Layer" (Premium Polish, Phases 13–16)
> Goal: Make every frame look like an Apple keynote.

| # | Phrase | What It Means | Wow-Factor |
|---|--------|---------------|------------|
| **13** | *"Bloom & Chromatic"* | Post-processing pass: UnrealBloom + subtle chromatic aberration. Yellow core actually glows | "How is this a website?" |
| **14** | *"Day–Night Bari"* | Background gradient shifts based on user's local time (sunrise/dusk/midnight palettes) | Personalised magic |
| **15** | *"Camera Cinematic"* | Slow autopilot drift — camera lazily orbits when mouse is idle for 5s. Returns instantly on move | Feels alive |
| **16** | *"Reduced Motion Respect"* | If `prefers-reduced-motion` → freeze particles, dim glow, show static poster. Accessibility = premium | Inclusive design |

---

### 🔵 Batch E — "Bong Identity & Virality" (Brand Multiplier, Phases 17–20)
> Goal: Every visitor remembers Bong Bari — and tells someone.

| # | Phrase | What It Means | Wow-Factor |
|---|--------|---------------|------------|
| **17** | *"Easter Konami"* | Type `B-O-N-G` → core morphs into a 3D Bong Bari mascot head (low-poly), winks once | Hidden joy for fans |
| **18** | *"Featured Joke Card"* | Bottom of overlay shows a rotating one-liner Bengali joke (5 jokes cycle every 12s) | Brand voice in 1 line |
| **19** | *"WhatsApp Auto-Notify"* | "Get pinged when we're back" → tap → opens `wa.me/<our-number>?text=ping%20me%20when%20bongbari%20is%20back` | Captures intent during downtime |
| **20** | *"Frame This Moment"* | "Save Snapshot" button → captures canvas + score + timestamp as PNG with Bong Bari watermark, downloads | Free user-generated marketing |

---

## 📊 Implementation Priority (When We Build)

**Now (Quick Win, ~2 hrs):** Phases 1, 2, 3 — instant polish on existing core
**Week 1:** Batch B (5–8) — gamified moments, no full game yet
**Week 2:** Batch C (9–12) — Chai Catcher mini-game
**Week 3:** Batch D (13–16) — cinematic post-processing
**Future:** Batch E (17–20) — identity + virality layer

---

## 🛡️ Hard Rules (Never Break)
1. **Total bundle ≤ 50KB** (excluding three.min.js CDN cache)
2. **60 FPS on mid-range mobile** (test on $200 Android)
3. **No external API calls** — must work even when our backend is dead (it IS the down page!)
4. **Auto-reload only when REAL downtime** — never in `?__bb_preview=down` mode
5. **No background video** — preview mode must kill all `<video>` and `<audio>` on load
6. **Accessible** — keyboard, screen-reader-skip, reduced-motion fallback
7. **No tracking on down page** — respect that the user is already frustrated

---

## 🎨 Visual Direction
- **Palette:** Yellow `#f4c430` · Purple `#8b5cf6` · Orange `#f97316` · BG `#050505`
- **Typography:** Inter (Latin) + Hind Siliguri (Bengali) — already loaded
- **Motion language:** Easing `cubic-bezier(0.22, 1, 0.36, 1)` (smooth-out), 0.3–0.6s durations
- **Sound:** All ambient, all looped, all mutable. Default ON desktop, OFF mobile.

---

## ✅ Success Metric (How We Know It Worked)
> "When the site goes down for 5 minutes, at least 1 person posts a screenshot of the down page on social media that week."

If yes → we've turned downtime into a brand asset. Mission accomplished.

---
*Plan only — zero implementation. Ready for your green light to build Batch A.*
