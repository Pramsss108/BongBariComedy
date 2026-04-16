# 🔥 BLAZING 60–120 FPS: 30-Phase Performance Masterplan

> **Goal**: Cap FPS at solid 60fps minimum, targeting 120fps on high-refresh displays.
> **Research**: How Netflix, Apple, Stripe, Linear, Vercel, and CapCut achieve buttery scrolling.

---

## 🧠 CORE PRINCIPLE: The Pixel Pipeline

Modern browsers render frames in 5 steps:
**JS → Style → Layout → Paint → Composite**

To hit **120fps**, you must keep each frame under **8.3ms** (1000ms / 120).
To hit **60fps**, the budget is **16.6ms**.

**The #1 rule**: Only use properties in the **Composite** layer (`transform`, `opacity`).
Everything else (`width`, `height`, `top`, `left`, `filter`, `box-shadow`, `backdrop-filter`, `blur()`) triggers Layout or Paint — which are 10-100x slower.

---

## PHASE 1 — Compositor-Only Animations ⚡
**What**: Every CSS transition and animation must ONLY use `transform` and `opacity`.
**Why**: These two properties skip Layout and Paint entirely — the GPU handles them on the compositor thread without touching the main thread at all.
**Current Problem**: We use `filter: blur()`, `backdrop-filter`, `box-shadow` transitions in several places — each one triggers Paint on every frame.
**Action**:
- Audit every `transition-*` and `animation` in `index.css` and `mobile-overrides.css`
- Replace any `filter` / `backdrop-filter` / `box-shadow` animations with static values
- Card hover effects must use `transform: scale()` only, not `box-shadow` transitions

---

## PHASE 2 — Kill `will-change` Abuse 🔪
**What**: Remove most `will-change` declarations. Only keep them on elements that are actively animating RIGHT NOW.
**Why**: Every `will-change: transform` creates a new GPU compositor layer. Too many layers = GPU memory pressure = frame drops. We currently have 20+ `will-change` rules.
**How modern sites do it**: Apply `will-change` via JS 100ms before animation starts, remove it after animation ends. Netflix uses this pattern for all card hovers.
**Action**:
- Strip all static `will-change` from CSS
- Add `will-change` dynamically only during active animation (via `onMouseEnter`/`onAnimationStart`)
- Keep `will-change: auto !important` for forced resets

---

## PHASE 3 — CSS `contain` Property 📦
**What**: Add `contain: layout style paint` on all major sections.
**Why**: This tells the browser "nothing inside this box affects anything outside" — allows the browser to skip recalculating the entire page when something inside changes. Linear.app uses this everywhere.
**Action**:
- Add `contain: layout style paint` to every `<section>` in the grid
- Add `contain: strict` on background glow blobs (already done on some)
- Add `contain: content` on each card container

---

## PHASE 4 — `content-visibility: auto` for Off-Screen Sections 👻
**What**: Apply `content-visibility: auto` + `contain-intrinsic-size` so sections below the fold are not rendered at all until they scroll into view.
**Why**: The browser skips Layout+Paint+Composite for off-screen sections entirely. Stripe uses this to render pages with 50+ sections at 120fps.
**Current state**: We have one usage (line 3429). Need to expand to ALL sections.
**Action**:
- Add `content-visibility: auto` with `contain-intrinsic-size: 0 500px` to:
  - Latest Comedy section
  - Most Loved section
  - Work With Us section
  - Footer

---

## PHASE 5 — Replace Framer Motion `whileInView` with Intersection Observer + CSS 🎯
**What**: Remove Framer Motion's `whileInView` from scroll-triggered animations and use native `IntersectionObserver` + CSS class toggles instead.
**Why**: Framer Motion's `whileInView` creates an IntersectionObserver per element AND wraps all animations in JavaScript `requestAnimationFrame`. CSS transitions driven by class toggles are 100% off-main-thread — zero JS per frame. This is how Apple.com achieves 120fps product reveals.
**Action**:
- Create a `useInViewClass` hook that adds/removes a `.in-view` class
- Define entrance animations purely in CSS: `.in-view { opacity: 1; transform: translateY(0); }`
- Replace `SectionRevealTitle` whileInView motion.divs with this pattern

---

## PHASE 6 — `transform: translateZ(0)` (GPU Promotion) on Scroll Containers 🖥️
**What**: Force GPU layer promotion on the main scrollable container.
**Why**: When the scroll container is on its own compositor layer, scroll events are handled entirely by the GPU compositor thread — the main thread is never involved. This is how Chrome achieves native-like scrolling. Netflix's browse page uses this.
**Action**:
- Add `transform: translateZ(0)` to `.home-content-wrapper`
- Ensure `overflow-x: hidden` is set (already done)

---

## PHASE 7 — Passive Event Listeners ✋
**What**: Make all scroll/touch event listeners `{ passive: true }`.
**Why**: Non-passive listeners can block the compositor from scrolling until the JS handler finishes. With `passive: true`, the browser scrolls immediately while JS runs in parallel.
**Action**:
- Audit all `addEventListener('scroll', ...)` and `addEventListener('touchmove', ...)`
- Ensure React's `onScroll` is not used (React already handles this, but custom ones need checking)
- Framer Motion's `useScroll` is already passive — verified

---

## PHASE 8 — Reduce Framer Motion `useScroll` + `useTransform` Count 📉
**What**: Minimize the number of active `useScroll` listeners and `useTransform` chains.
**Why**: Each `useScroll` creates an IntersectionObserver + scroll listener. Each `useTransform` computes a new value on every scroll frame in JS. We currently have 1 useScroll + 7 useTransform for the hero alone.
**Current state**: Hero section still has all 7 transforms on desktop.
**Action**:
- Option A: Replace hero scroll transforms with CSS `@scroll-timeline` (native)
- Option B: Merge multiple transforms into a single `useTransform` that returns a composite style object
- Option C: Accept hero scroll cost on desktop but ensure it's zero on mobile (already partially done)

---

## PHASE 9 — Debounce/Throttle `resize` and `scroll` Handlers 🔄
**What**: Any custom scroll or resize handlers must be throttled to once per frame.
**Why**: Without throttling, handlers fire 6-8x per frame during fast scrolling, queueing redundant work.
**Action**:
- Replace `addEventListener('scroll', handler)` with `requestAnimationFrame`-gated version
- Use `ResizeObserver` instead of `window.resize` where possible

---

## PHASE 10 — Image & Video Optimization 🖼️
**What**: Serve WebP/AVIF thumbnails, lazy-load all off-screen images, use `decoding="async"`, add explicit `width`/`height`.
**Why**: Large unoptimized images cause main-thread jank during decode. Explicit dimensions prevent Layout shifts during load. Apple.com serves different image sizes per device.
**Action**:
- Convert reel thumbnails to WebP (API-side or build-time)
- Add `loading="lazy"` to all images below the fold (already on most)
- Add explicit `width` and `height` attributes to prevent layout shifts
- Use `fetchpriority="high"` only on above-fold images (already done for first 2)

---

## PHASE 11 — Reduce `backdrop-filter` Usage 💎
**What**: Minimize or eliminate `backdrop-filter: blur()` on mobile.
**Why**: `backdrop-filter` is one of the most expensive CSS properties. Each instance requires the browser to: snapshot the area behind the element, apply a Gaussian blur, composite. On mobile GPUs, a single `backdrop-filter: blur(12px)` can take 4-6ms per frame.
**Current problem**: Used in navbar, card flash indicators, hero stats badges, language toggle.
**Action**:
- Replace `backdrop-filter: blur()` with solid semi-transparent backgrounds on mobile
- Desktop: keep for premium glass effect but audit total count (max 3-4 active at once)

---

## PHASE 12 — Reduce DOM Node Count 🌳
**What**: Minimize total DOM elements, especially in repeated card components.
**Why**: More DOM nodes = more Style + Layout time per frame. Netflix keeps their browse row DOM lean by virtualizing off-screen elements. Each reel card has ~30+ DOM nodes; with 8 cards visible, that's 240+ nodes just for cards.
**Action**:
- Audit `InstagramReel` component — collapse redundant wrapper divs
- Remove hidden elements (e.g., `!playing` divs that are conditionally rendered already)
- Consider removing gradient overlays that are barely visible

---

## PHASE 13 — CSS Animation Composition with `animation-composition` 🎨
**What**: Use `animation-composition: add` for layered CSS animations instead of stacking multiple transforms.
**Why**: Multiple transforms on one element (e.g., `@keyframes` + `hover transform`) can conflict and force recalculation. `animation-composition: add` composes them efficiently.
**Action**:
- Apply to hero border rotation + hover effects
- Apply to card entrance + hover scale

---

## PHASE 14 — `@media (prefers-reduced-motion: reduce)` 🦽
**What**: Respect user OS-level "reduce motion" preference by killing all animations.
**Why**: Performance benefit AND accessibility compliance. Already partially done via `device.prefersReducedMotion` in JSX.
**Action**:
- Add global CSS rule: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`

---

## PHASE 15 — Font Loading Optimization 🔤
**What**: Use `font-display: swap`, preload critical fonts, subset Bengali font.
**Why**: Font loading blocks text rendering. A large Bengali font file causes layout shifts and render-blocking.
**Action**:
- Preload the primary font with `<link rel="preload" as="font" crossorigin>`
- Subset Bengali font to only characters used on the site
- Ensure `font-display: swap` on all `@font-face` rules

---

## PHASE 16 — Virtual Scrolling for Card Grids (Future) 📜
**What**: Only render cards that are actually visible in the viewport.
**Why**: React re-rendering 8 complex card components on every scroll or state change is expensive. Netflix uses virtual scrolling for their browse rows. TanStack Virtual or `react-window` can render only 2-4 visible cards.
**Action**:
- Evaluate if our 8-card grid benefits (probably not now, but essential if we go to 20+ cards)
- If total card count exceeds 12, implement virtual rows

---

## PHASE 17 — React.memo + useMemo for Card Props 🧊
**What**: Ensure cards never re-render unless their data changes.
**Why**: React re-renders children when parent state changes. Each card re-render triggers Style+Layout. `InstagramReel` is already `memo()`-wrapped.
**Action**:
- Verify `React.memo` is working (check that reel data objects have stable references)
- Memoize `latestReelData` and `safePopularReelData` with `useMemo`
- Ensure no new objects/arrays are created in render that break memo

---

## PHASE 18 — Remove Unused JavaScript Imports 📦
**What**: Tree-shake unused Framer Motion features, Lucide icons, and component imports.
**Why**: Less JS = faster parse + compile = less main-thread blocking on page load. Framer Motion ships 40KB+ even tree-shaken.
**Action**:
- Audit imports: `useMotionValue`, `useSpring`, `AnimatePresence` — are all used?
- Import only needed Lucide icons (already done)
- Consider `motion/react` lightweight import path

---

## PHASE 19 — Eliminate Layout Thrashing 🔨
**What**: Never read DOM geometry (getBoundingClientRect, offsetWidth) immediately after writing styles.
**Why**: Reading geometry after writing forces a synchronous layout recalculation ("forced reflow") — the #1 cause of jank. Each forced reflow can take 5-20ms.
**Action**:
- Audit all `getBoundingClientRect` and `offsetWidth/Height` calls in components
- Batch reads before writes (read-all-then-write-all pattern)
- The `TiltCard` component's `onMouseMove` reads rect on every move — should cache `rect` via `ResizeObserver`

---

## PHASE 20 — CSS Layers (`@layer`) for Specificity Control 🏗️
**What**: Use `@layer` to control CSS cascade order without `!important` chains.
**Why**: `!important` forces the browser to recalculate specificity more frequently. `@layer` gives clean cascade control. Linear.app and modern design systems use this.
**Action**:
- Define layers: `@layer base, components, overrides, mobile;`
- Move `mobile-overrides.css` into the `mobile` layer

---

## PHASE 21 — Hardware-Accelerated Scrollbar 📊
**What**: Use `scrollbar-gutter: stable` and thin custom scrollbar.
**Why**: The default system scrollbar appearance/disappearance causes layout shifts. A stable gutter prevents this.
**Action**:
- Add `scrollbar-gutter: stable` to main scroll container
- Keep the thin custom scrollbar already defined in CSS

---

## PHASE 22 — Web Workers for Heavy Computation 🔧
**What**: Move non-rendering work (analytics, data sorting, animation math) off the main thread.
**Why**: Main thread time is the most precious resource. Everything that isn't directly painting a frame should be offloaded.
**Action**:
- Move analytics (GA4, Meta Pixel event firing) callbacks to `requestIdleCallback`
- If view count animations are heavy, compute them in a Web Worker
- Use `scheduler.yield()` after heavy data processing

---

## PHASE 23 — `requestIdleCallback` for Non-Critical Work ⏳
**What**: Defer non-visual work (analytics, prefetching, telemetry) to idle periods.
**Why**: `requestIdleCallback` runs work only when the browser has spare time (no frames in progress). Vercel uses this for their analytics SDK.
**Action**:
- Wrap `sendAnalytics()`, preload hints, and lazy data fetching in `requestIdleCallback`
- Wrap hero video preload link insertion in `requestIdleCallback`

---

## PHASE 24 — CSS `@starting-style` for Entry Animations 🆕
**What**: Use the new `@starting-style` rule (CSS-native entry animations) instead of JS-driven initial states.
**Why**: `@starting-style` + CSS transitions = zero JS involvement for entrance animations. The browser handles everything on the compositor. This is the newest CSS feature (2024) and the gold standard for entry animations.
**Browser support**: Chrome 117+, Safari 17.5+, Firefox 129+.
**Action**:
- For section titles, cards, and badges: define `@starting-style` with opacity: 0 and transform: translateY(20px)
- Remove Framer Motion `initial={{ opacity: 0 }}` for those elements

---

## PHASE 25 — `Scroll-Driven Animations` (CSS Native) 🎬
**What**: Replace JS-based scroll-linked animations with CSS `animation-timeline: scroll()`.
**Why**: CSS Scroll-Driven Animations run entirely on the compositor thread — zero main thread involvement, zero JS per frame. This is how modern sites achieve 120fps parallax. Chrome 115+, Safari 18+.
**Current problem**: Hero parallax uses `useScroll` + `useTransform` in JS → fires on every frame on main thread.
**Action**:
- Replace hero `heroVideoScale`, `heroVideoOpacity` with CSS `view-timeline` animations
- Replace title parallax (`titleAuthenticY`, `titleComedyY`) with CSS scroll-driven animations
- Fallback: keep JS version for unsupported browsers

---

## PHASE 26 — Reduce CSS Selector Complexity 🎯
**What**: Simplify complex CSS selectors.
**Why**: Complex selectors (e.g., `.yt-card-container [class*="rounded-full"][class*="font-black"]`) are expensive for the browser's Style calculation phase. The more elements match broad selectors, the slower each frame.
**Action**:
- Replace attribute selectors (`[class*="..."]`) with specific class names
- Reduce nesting depth in mobile-overrides to max 2 levels

---

## PHASE 27 — Optimize Video Playback ▶️
**What**: Use `preload="none"` for off-screen videos, `poster` for instant visual, hardware-decoded codec hints.
**Why**: Video decode competes with rendering for GPU resources. Multiple videos decoding simultaneously destroy frame rates.
**Current state**: Only one video plays at a time (single-player pattern). Good.
**Action**:
- Ensure `preload="metadata"` (already set for cards) — NOT `preload="auto"`
- Add `disableRemotePlayback` attribute
- Test if `playsinline` is on all video elements (already set)

---

## PHASE 28 — Enable `OffscreenCanvas` for Background Effects (Future) 🎨
**What**: Render decorative background effects (glow blobs, particles) in an OffscreenCanvas on a Web Worker.
**Why**: Canvas rendering on a Worker thread is completely off the main thread. Vercel's dot grid, Stripe's animated gradients — all rendered this way.
**Action**:
- If we add particle effects or animated backgrounds, use OffscreenCanvas
- Current glow blobs are CSS-only (good) — keep them that way

---

## PHASE 29 — Bundle Size Reduction 📉
**What**: Reduce total JS shipped to the client.
**Why**: Less JS = faster parse + compile = less main-thread blocking = higher fps during initial load. Every 50KB of JS costs ~50ms of parse time on mobile.
**Action**:
- Run `npx vite-bundle-analyzer` to identify large chunks
- Lazy-import Framer Motion where possible (already tree-shaken by Vite)
- Code-split the collaboration form (only loads when scrolled to)
- Consider `React.lazy()` for Footer component

---

## PHASE 30 — Performance Monitoring & Budget 📊
**What**: Add automated performance budgets and monitoring.
**Why**: "What gets measured gets managed." Without monitoring, regressions creep in silently. Linear.app has automated perf checks on every PR.
**Action**:
- Add Lighthouse CI to GitHub Actions with frame rate thresholds
- Set performance budgets: main JS < 200KB gzipped, FPS > 55 (measured via `PerformanceObserver`)
- Add a dev-mode FPS counter overlay (already have one) — make it always-on during development
- Use Chrome DevTools Performance panel before every deploy

---

## 📊 PRIORITY MATRIX (Impact × Effort)

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 1 Compositor-Only Animations | 🔥🔥🔥🔥🔥 | Low | **DO FIRST** |
| 2 Kill will-change Abuse | 🔥🔥🔥🔥 | Low | **DO FIRST** |
| 3 CSS contain | 🔥🔥🔥🔥 | Low | **DO FIRST** |
| 4 content-visibility: auto | 🔥🔥🔥🔥🔥 | Low | **DO FIRST** |
| 5 Replace whileInView with CSS | 🔥🔥🔥🔥🔥 | Medium | **BATCH 2** |
| 6 GPU Promotion on Scroll Container | 🔥🔥🔥 | Low | **DO FIRST** |
| 7 Passive Event Listeners | 🔥🔥🔥 | Low | **DO FIRST** |
| 8 Reduce useScroll/useTransform | 🔥🔥🔥🔥 | Medium | **BATCH 2** |
| 9 Throttle Resize/Scroll | 🔥🔥🔥 | Low | **BATCH 2** |
| 10 Image/Video Optimization | 🔥🔥🔥 | Medium | **BATCH 2** |
| 11 Reduce backdrop-filter | 🔥🔥🔥🔥🔥 | Medium | **BATCH 2** |
| 12 Reduce DOM Count | 🔥🔥🔥 | Medium | **BATCH 3** |
| 13 animation-composition | 🔥🔥 | Low | **BATCH 3** |
| 14 prefers-reduced-motion | 🔥🔥🔥 | Low | **DO FIRST** |
| 15 Font Loading | 🔥🔥🔥 | Low | **BATCH 2** |
| 16 Virtual Scrolling | 🔥🔥 | High | **FUTURE** |
| 17 React.memo Verification | 🔥🔥🔥 | Low | **BATCH 2** |
| 18 Tree-shake Imports | 🔥🔥 | Low | **BATCH 3** |
| 19 Layout Thrashing Fix | 🔥🔥🔥🔥 | Medium | **BATCH 2** |
| 20 CSS @layer | 🔥🔥 | Medium | **BATCH 3** |
| 21 scrollbar-gutter | 🔥 | Low | **BATCH 3** |
| 22 Web Workers | 🔥🔥🔥 | High | **FUTURE** |
| 23 requestIdleCallback | 🔥🔥🔥 | Low | **BATCH 2** |
| 24 @starting-style | 🔥🔥🔥🔥 | Medium | **BATCH 3** |
| 25 Scroll-Driven Animations | 🔥🔥🔥🔥🔥 | High | **BATCH 3** |
| 26 Selector Complexity | 🔥🔥 | Low | **BATCH 3** |
| 27 Video Playback Optimization | 🔥🔥🔥 | Low | **BATCH 2** |
| 28 OffscreenCanvas | 🔥🔥 | High | **FUTURE** |
| 29 Bundle Size Reduction | 🔥🔥🔥 | Medium | **BATCH 3** |
| 30 Performance Monitoring | 🔥🔥🔥🔥 | Medium | **BATCH 2** |

---

## 🚀 EXECUTION BATCHES

### BATCH 1 — "Zero JS Per Frame" (Phases 1, 2, 3, 4, 6, 7, 14)
**Time**: ~1 session | **Expected FPS gain**: +15-25fps
- All CSS-only changes, no React code touched
- Massive impact from `content-visibility: auto` and `contain`
- Kills GPU memory pressure from `will-change` abuse

### BATCH 2 — "Compositor Champion" (Phases 5, 8, 9, 10, 11, 15, 17, 19, 23, 27, 30)
**Time**: ~2 sessions | **Expected FPS gain**: +10-15fps
- Replace Framer Motion `whileInView` with CSS-driven animations
- Reduce backdrop-filter on mobile
- Fix layout thrashing in TiltCard
- Add performance monitoring

### BATCH 3 — "Cutting Edge CSS" (Phases 12, 13, 18, 20, 21, 24, 25, 26, 29)
**Time**: ~2 sessions | **Expected FPS gain**: +5-10fps
- Modern CSS features (`@starting-style`, `scroll-driven animations`, `@layer`)
- Bundle optimization
- DOM reduction

### FUTURE (Phases 16, 22, 28)
- Virtual scrolling, Web Workers, OffscreenCanvas — only when needed

---

## 🎯 TARGET METRICS

| Metric | Current | Target |
|--------|---------|--------|
| Desktop FPS (scroll) | ~52 | 60-120 (stable) |
| Mobile FPS (scroll) | ~31 | 55-60 (stable) |
| Largest Contentful Paint | ~2s | <1.5s |
| Total JS Bundle | ~300KB | <200KB gzipped |
| GPU Layers | 30+ | <15 |
| Main thread per-frame JS | ~12ms | <4ms |

---

*Research sources: web.dev/rendering-performance, developer.chrome.com/docs/devtools/performance, Linear.app architecture, Netflix Frontend blog, Apple.com performance patterns, CSS Working Group scroll-driven animations spec.*
