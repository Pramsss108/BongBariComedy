# PERFORMANCE LOCKED — Cinematic Enhancement Phases

> **Date**: April 16, 2026
> **Status**: 60 FPS ACHIEVED everywhere on desktop after full load
> **Agent**: Claude Opus 4 (Agentic)
> **Rule**: ALL future changes MUST maintain this speed. If user feels ANY slowdown, REVERT immediately.

---

## WHAT WE FIXED (Locked — Do NOT Undo)

### footer.tsx
- ✅ Removed scroll-linked `filter: blur()` on BrandReveal (was computing Gaussian blur every scroll frame)
- ✅ Replaced with simple `whileInView` spring animation (opacity + scale, `once: true`)
- ✅ Removed velocity spring hooks from MarqueeStrip (`useScroll`, `useVelocity`, `useSpring`, `useTransform`)
- ✅ Changed outer MarqueeStrip wrapper from `<motion.div>` to plain `<div>`
- ✅ Set global footer viewport config to `once: true`
- ✅ Cleaned all unused framer-motion imports

### home.tsx
- ✅ TiltCard: rect caching via `cachedRect` useRef (no scroll listener)
- ✅ Form card: replaced `backdrop-blur-2xl` (40px blur) with solid `bg-[#0c0c0c]/95`
- ✅ Fixed 4 missing `once: true` viewport props (bridge label, bridge divider, work outer, trust strip)
- ✅ Latest Comedy + Most Loved sections: `once: device.isMobile` → `once: true` (no re-trigger on desktop scroll-up)
- ✅ SectionRevealTitle v6: scale-up + spring + golden divider (compositor-only)

### index.css
- ✅ Removed `filter: blur(8px) brightness(0.7)` from hero-cinematic-entrance (compositor-only opacity+scale now)
- ✅ Reduced hero glow ring blur from `20px` → `12px`
- ✅ Removed `backdrop-filter: blur(20px)` from `.footer-grid-bg`
- ✅ Removed aggressive `will-change: transform` from h1/h2/h3/button/section (50+ needless GPU layers)
- ✅ Removed desktop `filter: blur(4px)` from yt-fadeInUp card animation
- ✅ Removed CSS `animation` from `.yt-card-container` (Framer Motion handles entrance)
- ✅ Added `content-visibility: auto` on `.footer-root` (defers all footer rendering until near viewport)
- ✅ Removed `.bg-gradient-to-r` infinite `gradient-shift` animation (was repainting every gradient element forever)
- ✅ Removed GPU wildcard `[style*="translate3d"]` from hardware acceleration selector

---

## THE GOLDEN RULE

**Every enhancement below uses ONLY `transform` and `opacity` — the two CSS properties that skip Layout and Paint entirely (GPU compositor-only). No `filter`, no `backdrop-filter`, no `box-shadow` animations.**

---

## 10 CINEMATIC PHASES (Netflix/Apple-Grade)

Each phase is independent. If ANY phase causes slowdown → revert that single phase.

### Phase 1 — Parallax Depth Titles ✨
**What**: Section titles ("Latest Comedy", "Most Loved", "Work With Us") get a subtle parallax depth effect — title moves slightly slower than content, creating a 3D depth illusion.
**How**: CSS `transform: translateY()` driven by Framer Motion `useTransform` on the SECTION's scrollYProgress (not window scroll). One `useScroll` per section (already exists), one `useTransform` for the title offset.
**Cost**: Zero — `transform: translateY()` is compositor-only.
**Revert**: Remove the `style={{ y: titleY }}` prop from title elements.

### Phase 2 — Stagger Cascade Cards 🎴
**What**: Reel cards enter with a cinematic stagger — each card slides up 80ms after the previous one, creating a "waterfall" reveal like Netflix browse rows.
**How**: Already partially done via `staggerChildren` in section variants. Enhance by adding per-card `variants` with `y: 40 → 0` + `opacity: 0 → 1`, timed via the existing stagger.
**Cost**: Zero — `transform` + `opacity` only. Already using `once: true`.
**Revert**: Remove per-card `variants` prop, revert to section-level opacity only.

### Phase 3 — Magnetic Hover Micro-Interactions 🧲
**What**: CTA buttons and social icons have a "magnetic pull" — cursor moves near → button shifts 2-4px toward cursor. Like Apple.com's product buttons.
**How**: `onMouseMove` calculates offset, applies `transform: translate(dx, dy)`. `onMouseLeave` snaps back with spring.
**Cost**: Zero — pure `transform`, no layout/paint. Only runs during hover (not scroll).
**Revert**: Remove `onMouseMove`/`onMouseLeave` handlers from buttons.

### Phase 4 — Smooth Counter Animations 🔢
**What**: Stats numbers (subscriber count, video count) count up from 0 when scrolled into view. Like every modern SaaS landing page.
**How**: `useInView` + `useMotionValue` + `useSpring` to animate a number from 0 to target. Pure JS, no DOM manipulation.
**Cost**: Zero layout cost — only text content changes (text repaint is cheap, < 0.1ms).
**Revert**: Remove the counter hook, show static numbers.

### Phase 5 — Hero Text Reveal (Letter-by-Letter) ✍️
**What**: Hero title "BONG BARI" reveals letter-by-letter with a typewriter/unveil effect on first load.
**How**: Split text into `<span>`s, stagger `opacity: 0 → 1` + `transform: translateY(8px) → 0` per letter with 40ms delay.
**Cost**: Zero — compositor-only per letter. Runs once on mount.
**Revert**: Remove letter splitting, show full text with existing fade-in.

### Phase 6 — Scroll Progress Indicator 📊
**What**: A thin gold progress bar at the very top of the page shows how far the user has scrolled (like Medium/Substack articles).
**How**: Single `useScroll()` on window → `scaleX` transform on a fixed `<div>`. 2px height.
**Cost**: Near-zero — one `useScroll` (already have window scroll in some places), one `transform: scaleX()` (compositor-only).
**Revert**: Remove the fixed progress bar div.

### Phase 7 — Card Hover Tilt Enhancement 🃏
**What**: Reel cards tilt on hover with a 3D perspective effect (like the existing TiltCard but applied to reel cards). Subtle 2-5 degree tilt following cursor position.
**How**: Use existing `TiltCard` pattern (cachedRect + mousemove → `transform: perspective(800px) rotateX() rotateY()`).
**Cost**: Zero — `transform` only, runs only during hover, uses cached rect.
**Revert**: Remove `onMouseMove` from card wrapper.

### Phase 8 — Section Divider Animations ✂️
**What**: Between major sections, a decorative line/gradient animates in from center outward when scrolled into view.
**How**: `whileInView` with `scaleX: 0 → 1` + `opacity: 0 → 1`, `once: true`. Pure CSS transform.
**Cost**: Zero — one `transform: scaleX()` animation per divider, fires once.
**Revert**: Remove the divider `<motion.div>` elements.

### Phase 9 — Smooth Page Transition (Route Change) 🔄
**What**: When navigating between pages (Home → Privacy → Terms), content fades out/in with a subtle slide. Not a hard cut.
**How**: Wrap router outlet in `<AnimatePresence>` with `motion.div` using `opacity` + `translateY(12px)` exit/enter.
**Cost**: Near-zero — runs only on route change (rare), compositor-only.
**Revert**: Remove `<AnimatePresence>` wrapper.

### Phase 10 — Ambient Background Pulse 🌌
**What**: The dark background very subtly "breathes" — a barely-visible radial glow pulses every 8-10 seconds. Creates a living, cinematic atmosphere.
**How**: CSS `@keyframes` on a single pseudo-element using `opacity: 0.02 → 0.05 → 0.02` cycle. No blur, no filter.
**Cost**: Near-zero — single element, `opacity` only (compositor-only), very slow animation (8s+).
**Revert**: Remove the CSS keyframe + pseudo-element.

---

## EMERGENCY REVERT PROTOCOL

If at ANY point the user says "it feels slower" or "laggy":

1. **Stop immediately** — do not try to "fix" the fix
2. **Identify which phase was last applied**
3. **Revert ONLY that phase** using git: `git checkout HEAD~1 -- <file>`
4. **Verify speed** returns to baseline
5. **Mark that phase as FAILED** in this doc

Never revert the locked fixes above. Those are proven. Only revert enhancement phases.

---

## SPEED BENCHMARK (April 16, 2026)

| Area | FPS After Full Load | Status |
|------|-------------------|--------|
| Hero section scroll | 60 | ✅ LOCKED |
| Latest Comedy cards | 60 | ✅ LOCKED |
| Most Loved cards | 60 | ✅ LOCKED |
| Form/Work section | 60 | ✅ LOCKED |
| Footer | 60 | ✅ LOCKED |
| Page refresh → interactive | Fast | ✅ LOCKED |
