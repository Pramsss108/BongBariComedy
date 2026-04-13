# Homepage Premium Scroll Animation Plan v3
## 40 Phases — Rockstar-Tier Scroll Experience (Every Device)

> **Philosophy:** Every scroll pixel should feel intentional. The user is not "reading a website" — they're **experiencing a cinematic story**. Each section reveals itself like a scene in a film.
> 
> **Device Philosophy:** If it doesn't look perfect on a ₹8,000 Android phone AND a 4K iMac, it's not done. We build **mobile-first, enhance for desktop** — never the other way around.

---

## 🚨 BUG FIX FIRST (Priority 0)

### Bug: Section titles ("Latest Comedy", "Most Loved") are invisible/disappearing

**Root Cause:** Nested `whileInView` problem. The parent `<motion.section>` and the child `<motion.div>` header BOTH use `whileInView`. When the parent section's `initial={{ opacity: 0 }}` is active, ALL children (including the header) are invisible. Even though the header has its own `whileInView`, the parent's `opacity: 0` masks it. Then once the parent animates in, the child header's `whileInView` may have already passed its trigger threshold — meaning it never fires.

**Fix:** Remove `whileInView` from the nested header `motion.div`. Instead, use `variants` as **children of the parent's stagger** — so when the parent enters view and triggers `visible`, the header animates as a child via inherited variant propagation. This guarantees the header animates IN SYNC with the parent section, never getting "missed" by the IntersectionObserver.

**Alternative Fix (simpler):** Change the header from `whileInView` to just `variants` that inherit from the parent motion.section. The parent already uses `whileInView`, so children with `variants` auto-animate when the parent transitions to `visible`.

---

## 🏗️ Architecture Decision: What to Use

| Technique | Library | When to Use | Performance |
|---|---|---|---|
| **Scroll-triggered reveal** | Framer Motion `whileInView` | Sections entering viewport | ⚡ Excellent |
| **Scroll-linked parallax** | Framer Motion `useScroll` + `useTransform` | Background depth layers | ⚡ Good (GPU) |
| **Stagger children** | Framer Motion `variants` + `staggerChildren` | Card grids, lists | ⚡ Excellent |
| **Sticky pinning** | CSS `position: sticky` | Section headers, hero | ⚡ Native CSS |
| **Smooth scrolling** | Lenis (lightweight) OR CSS `scroll-behavior` | Global page feel | ⚡ Minimal overhead |
| **Counter animation** | Framer Motion `useMotionValue` + `animate` | Stats/numbers | ⚡ Excellent |

**NOT using:** GSAP (heavy bundle), ScrollMagic (deprecated), Locomotive Scroll (conflicts with React). **Framer Motion is already installed** and handles 95% of what we need.

**Optional add:** [`lenis`](https://github.com/darkroomengineering/lenis) (3KB gzipped) for buttery-smooth inertia scrolling — the single biggest "premium feel" upgrade. Every high-end site (Apple, Linear, Vercel) uses smooth scroll inertia.

---

## 📐 30 Phases — Grouped by Section

### GLOBAL (Phases 1–4)

| # | Phase | Technique | Description |
|---|---|---|---|
| 1 | **Lenis Smooth Scroll** | `lenis` library | Install `lenis`, wrap app in `<ReactLenis>`. Adds momentum/inertia to scroll — feels like butter. 3KB. This alone makes any site feel $10K. |
| 2 | **Scroll Progress Bar** | `useScroll` + CSS | Thin gold progress bar at top of viewport (like Medium/Linear). Shows reading progress. `position: fixed`, `scaleX` linked to `scrollYProgress`. |
| 3 | **Background Glow Parallax** | `useScroll` + `useTransform` | The two fixed background glow blobs (yellow + indigo) move at 0.3x scroll speed instead of being static. Creates subtle depth. Pure `transform: translateY()` — zero layout cost. |
| 4 | **Navbar Morph on Scroll** | `useScroll` + state | Navbar gets `backdrop-blur` + border-bottom + shrinks height after scrolling 50px. Smooth CSS transition. Already common on premium sites. |

### HERO SECTION (Phases 5–10)

| # | Phase | Technique | Description |
|---|---|---|---|
| 5 | **Hero Sticky Pin** | CSS `position: sticky` | Hero video stays pinned while CTA text scrolls up and over it. Creates "peeling away" effect like Apple product pages. The video stays visible until the next section overlaps. |
| 6 | **Hero Video Scale-Down on Scroll** | `useScroll` + `useTransform` | As user scrolls past hero, the video container scales from `1.0` → `0.92` and opacity drops to `0.6`. Creates cinematic "leaving the scene" feel. |
| 7 | **Hero Title Parallax Split** | `useScroll` + `useTransform` | "Authentic" moves up at 0.8x, "Bengali" at 1.0x, "Comedy" at 1.2x — creates depth layering on scroll. Words separate slightly as you leave the hero. |
| 8 | **Hero CTA Fade-Out on Scroll** | `useScroll` + `useTransform` | Buttons fade to 0 and translate down as user scrolls past hero. They "sink" below the fold gracefully. |
| 9 | **Bengali Underline Glow Pulse** | CSS `@keyframes` | The gold SVG underline under "Bengali" does a single gentle glow pulse 2s after page load. Draws attention without being distracting. |
| 10 | **Hero → Section Transition Blur** | `useScroll` + `useTransform` | A 100px tall gradient blur zone between hero and first content section. Scroll-linked: starts invisible, peaks at the transition point, fades out. Creates cinematic scene change. |

### LATEST COMEDY SECTION (Phases 11–15)

| # | Phase | Technique | Description |
|---|---|---|---|
| 11 | **Section Title Slide-Reveal** | Parent `variants` (NOT separate `whileInView`) | "Latest Comedy" slides from left, Bengali subtitle fades in 0.1s later, "View All" slides from right. All as **child variants** of parent section — no nested `whileInView`. |
| 12 | **Card Grid Cascade** | `staggerChildren: 0.1` | Cards appear one by one: left-to-right, top-to-bottom. Each card rises `y: 24→0` with 100ms stagger. Clean, satisfying cascade. |
| 13 | **Card Tilt on Scroll** | `useScroll` + `useTransform` per card | As cards scroll through viewport, they have a very subtle `rotateX(-2deg → 0deg → 2deg)` tilt. Creates 2.5D depth illusion. Threshold: only visible on desktop. |
| 14 | **Card Thumbnail Parallax** | CSS `transform: translateY(-5%)` on scroll | The thumbnail image inside each card moves at 0.95x scroll speed vs the card frame. Creates subtle inner-parallax. Pure CSS with `will-change: transform`. |
| 15 | **Gold Divider Draw-On** | `scaleX: 0→1` with `whileInView` | The gold divider line "draws" from center outward. Already implemented — just validate it works with the bug fix. |

### MOST LOVED SECTION (Phases 16–20)

| # | Phase | Technique | Description |
|---|---|---|---|
| 16 | **Section Title — Mirror of #11** | Parent `variants` | Same slide-from-left/right pattern as Latest Comedy. "Most Loved" + Bengali + "View All". |
| 17 | **Card Grid Cascade (Reverse)** | `staggerChildren: 0.1` | Same as Phase 12 but cards enter from right-to-left (reversed stagger). Distinguishes this section visually from Latest Comedy. |
| 18 | **Rank Badge Pop-In** | `scalePop` variant | The rank number badges (1, 2, 3, 4) pop in with spring physics AFTER the card has fully appeared. `delay: 0.3` after card entrance. Adds playfulness. |
| 19 | **Card Hover Magnetic Tilt** | `onMouseMove` + `rotateX/rotateY` | On hover, cards tilt toward the cursor position (like Apple's hover cards). 3D perspective tilt. Mobile: disabled. |
| 20 | **Second Divider Draw-On** | `scaleX: 0→1` | Same as Phase 15, second divider between Most Loved → Work with Us. |

### WORK WITH US SECTION (Phases 21–26)

| # | Phase | Technique | Description |
|---|---|---|---|
| 21 | **Heading Stagger Text Reveal** | `variants` + `staggerChildren` | "Work with Us" title, Bengali subtitle, and description paragraph stagger in vertically. Already implemented — validate with bug fix. |
| 22 | **Form Card Cinematic Entrance** | `whileInView` with `y: 30` | Form card fades up from below with a slight upward travel. Spring easing. Already partly implemented. |
| 23 | **Form Fields Sequential Reveal** | CSS `animation-delay` | Each form field group (Name/Email → Phone → Company → Message → Button) fades in sequentially with 80ms stagger. Pure CSS `@keyframes` triggered when parent is in view. Avoids heavy JS. |
| 24 | **Submit Button Glow Entrance** | `whileInView` + CSS glow | Submit button enters last with a brief red glow pulse (`box-shadow` animation). Single pulse, then static. Draws eye to the CTA. |
| 25 | **Form Card Glass Shimmer** | CSS `@keyframes` | After the card fully enters view, a single diagonal light sweep crosses the card (like a lens flare). CSS only, `animation-iteration-count: 1`, triggered by IntersectionObserver adding a class. |
| 26 | **Background Radial Glow Pulse** | `useScroll` + `useTransform` | The `.bg-radial-glow` behind Work with Us section pulses opacity from `0.2→0.35→0.2` as user scrolls through it. Subtle breathing that makes the section feel alive. |

### FOOTER TRANSITION (Phases 27–30)

| # | Phase | Technique | Description |
|---|---|---|---|
| 27 | **Footer Curtain Reveal** | CSS `clip-path` or sticky overlap | The footer is revealed as the Work with Us section scrolls up and away — like pulling a curtain. The footer appears to "exist behind" the content. Uses CSS `position: sticky` on the main content + `z-index` layering. |
| 28 | **BONG BARI Brand Blur-In** | Already exists in `BrandReveal` | The scroll-linked opacity + blur text reveal. Already implemented and working. Just ensure it's compatible with Lenis smooth scroll. |
| 29 | **Footer Grid Stagger** | Already exists via `variants` + `stagger` | The link columns and social icons stagger in. Already working. Ensure `once: false` so it replays if user scrolls back up (current behavior). |
| 30 | **Marquee Speed Sync** | `useScroll` + CSS variable | The footer marquee speed subtly increases when the user is actively scrolling (scroll velocity > 0). When scroll stops, marquee returns to normal speed. Creates a "living" footer that responds to user movement. |

---

## 📱 RESPONSIVE & DEVICE COMPATIBILITY (Phases 31–40)

> **Rule:** Every phase above MUST work on all devices. These 10 extra phases handle device-specific edge cases, adaptive behavior, and automated testing to guarantee zero regressions on any screen.

### Device Tiers We Support

| Tier | Screens | Examples | Animation Budget |
|---|---|---|---|
| **Tier 1 — Small phone** | 320px–374px | iPhone SE, Galaxy A03 | Minimal: only fade + translate. NO parallax, NO sticky, NO tilt |
| **Tier 2 — Standard phone** | 375px–430px | iPhone 14, Pixel 7, Galaxy S23 | Medium: fade + translate + stagger. NO parallax, NO tilt |
| **Tier 3 — Large phone / small tablet** | 431px–768px | iPhone Plus, iPad Mini, Galaxy Tab | Medium+: all scroll reveals + stagger. Parallax ON but reduced |
| **Tier 4 — Tablet** | 769px–1024px | iPad, Surface Go | Full: everything ON but tilt range reduced 50% |
| **Tier 5 — Desktop** | 1025px+ | Laptops, monitors, 4K | Full: every effect at max intensity |

### Adaptive Animation Rules (Applied to ALL 30 Phases)

```
Mobile (<768px):
  - Lenis: DISABLED (native scroll feels better on touch)
  - Parallax (Phases 3, 7, 14): DISABLED (causes jank on low-end GPUs)
  - Sticky pin (Phase 5): DISABLED (breaks mobile scroll behavior)
  - Card tilt (Phase 13): DISABLED (no hover on touch)
  - Magnetic tilt (Phase 19): DISABLED (no hover on touch)
  - Hero scale-down (Phase 6): simplified to opacity-only fade
  - Stagger delays: HALVED (0.08→0.04s — mobile users scroll faster)
  - All transforms use will-change:transform only during animation
  - Touch-action: NEVER block vertical scroll
  - Animation distances: HALVED (y:30→y:15, x:20→x:10)
  
Tablet (768px–1024px):
  - Lenis: ON (tablets handle it well)
  - Parallax: ON but at 50% intensity
  - Sticky pin: ON
  - Card tilt: DISABLED (touch-first)
  - Magnetic tilt: DISABLED
  - All distances at 75% of desktop values

Desktop (1025px+):
  - Everything ON at full intensity
```

### Phase 31–40: Device-Specific Phases

| # | Phase | Technique | Description |
|---|---|---|---|
| 31 | **`useDeviceTier()` Hook** | Custom React hook | Central hook that returns `{ tier: 1-5, isMobile, isTablet, isDesktop, isTouch, prefersReducedMotion, isLowEnd }`. Uses `window.matchMedia` for breakpoints, `navigator.hardwareConcurrency` + `deviceMemory` for performance tier, and `prefers-reduced-motion` media query. Every animation phase reads from this hook. Single source of truth. |
| 32 | **`prefers-reduced-motion` Global Kill Switch** | CSS + JS | If user's OS has "Reduce Motion" enabled: ALL scroll animations become instant (duration: 0). Only simple opacity fades remain. CSS: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` + Framer Motion: set `initial={false}` globally. |
| 33 | **Mobile Touch Scroll Safety** | CSS | Ensure `touch-action: pan-y` on ALL animated elements. Prevent any animation from accidentally capturing/blocking vertical swipe. Add `overscroll-behavior: contain` on main scroll container to prevent pull-to-refresh interference. |
| 34 | **Safe Area Padding (Notch/Dynamic Island/Home Bar)** | CSS `env()` | All fixed/sticky elements (navbar, scroll progress bar, mobile nav) respect `env(safe-area-inset-*)`. Already partially done in `mobile-overrides.css` — extend to new fixed elements (progress bar, sticky hero). |
| 35 | **Viewport Height Fix (`100svh` / `dvh`)** | CSS | Hero section uses `min-height: 100svh` (already done) — verify all new sticky/pinned sections also use `svh`/`dvh` instead of `vh` to handle mobile browser chrome (address bar) correctly. Samsung Internet + Chrome mobile address bar collapses/expands — `svh` handles this. |
| 36 | **Card Grid Responsive Reflow** | CSS + animation adjustment | At `<768px`: cards switch to 2-column grid (already done). Stagger direction changes from left-to-right to top-to-bottom (2 cards per row). At `<375px`: consider 1-column with larger cards if thumbnails get too small. Animation `y` distance reduces to `12px` on small screens. |
| 37 | **Form Responsiveness Guard** | CSS | Work with Us form: at `<640px`, all fields force single-column (already done in `mobile-overrides.css`). Phone country-code selector stays `90px` min-width. Form card border-radius shrinks from `2.5rem` to `1.25rem` on mobile. Sequential field reveal (Phase 23) stagger reduces to `50ms` on mobile. |
| 38 | **Landscape Mode Lock** | CSS `@media (orientation: landscape) and (max-height: 500px)` | When phone is rotated landscape with tiny height (<500px): hero section shrinks `min-height` to `auto`, video reduces to `max-height: 280px`, CTA buttons wrap tighter. Prevents the hero from consuming the entire tiny viewport. |
| 39 | **Automated Responsive Audit (Build-Time)** | Playwright / manual checklist | Before shipping, run visual checks at these exact sizes: `375×667` (iPhone SE), `390×844` (iPhone 14), `412×915` (Pixel 7), `768×1024` (iPad), `1280×800` (laptop), `1920×1080` (desktop), `2560×1440` (QHD). Checklist: no horizontal overflow, no clipped text, all animations play, no jank. |
| 40 | **Performance Throttle Test** | Chrome DevTools | Test every phase with Chrome "Performance" panel at **4x CPU slowdown** + **Fast 3G** network. If ANY animation drops below 50fps on throttled desktop = it'll jank on real phones. Fix: reduce complexity or disable that phase on mobile tier. |

---

## 🔒 Device-Specific Rules Per Phase (Quick Reference)

| Phase | Mobile (<768px) | Tablet (768–1024px) | Desktop (1025px+) |
|---|---|---|---|
| 1. Lenis | ❌ OFF | ✅ ON | ✅ ON |
| 2. Progress Bar | ✅ height: 2px | ✅ height: 2px | ✅ height: 3px |
| 3. Background Parallax | ❌ OFF (static) | ✅ 50% intensity | ✅ 100% |
| 4. Navbar Morph | ✅ (simpler — just blur + border) | ✅ full | ✅ full |
| 5. Hero Sticky Pin | ❌ OFF (normal scroll) | ✅ ON | ✅ ON |
| 6. Hero Scale-Down | ⚡ Opacity-only | ✅ scale 0.95 | ✅ scale 0.92 |
| 7. Title Parallax Split | ❌ OFF | ⚡ 50% split | ✅ full split |
| 8. CTA Fade-Out | ✅ fade only | ✅ fade + translate | ✅ fade + translate |
| 9. Bengali Glow Pulse | ✅ (CSS only, no cost) | ✅ | ✅ |
| 10. Transition Blur | ❌ OFF (blur is GPU-heavy on mobile) | ⚡ 50px zone | ✅ 100px zone |
| 11. Title Slide-Reveal | ✅ y-only (no x slide) | ✅ x slide | ✅ x slide |
| 12. Card Cascade | ✅ stagger 0.04s, y:12 | ✅ stagger 0.08s, y:18 | ✅ stagger 0.1s, y:24 |
| 13. Card Tilt | ❌ OFF | ❌ OFF (touch) | ✅ ON |
| 14. Thumbnail Parallax | ❌ OFF | ⚡ 2% shift | ✅ 5% shift |
| 15. Gold Divider | ✅ (lightweight CSS) | ✅ | ✅ |
| 16. Title Mirror | Same as 11 | Same as 11 | Same as 11 |
| 17. Reverse Cascade | ✅ stagger 0.04s | ✅ stagger 0.08s | ✅ stagger 0.1s |
| 18. Rank Badge Pop | ✅ (spring is GPU-friendly) | ✅ | ✅ |
| 19. Magnetic Tilt | ❌ OFF | ❌ OFF | ✅ ON |
| 20. Second Divider | ✅ | ✅ | ✅ |
| 21. Heading Stagger | ✅ reduced delay | ✅ | ✅ |
| 22. Form Card Entrance | ✅ y:15 | ✅ y:24 | ✅ y:30 |
| 23. Form Fields Reveal | ✅ stagger 50ms | ✅ 80ms | ✅ 80ms |
| 24. Submit Glow | ✅ (CSS only) | ✅ | ✅ |
| 25. Glass Shimmer | ❌ OFF (GPU-heavy) | ✅ | ✅ |
| 26. Radial Glow Pulse | ❌ OFF | ⚡ subtle | ✅ full |
| 27. Footer Curtain | ❌ OFF (sticky breaks mobile) | ✅ | ✅ |
| 28. Brand Blur-In | ✅ (already scroll-linked, works) | ✅ | ✅ |
| 29. Footer Stagger | ✅ | ✅ | ✅ |
| 30. Marquee Speed Sync | ❌ OFF (constant speed) | ✅ | ✅ |

**Legend:** ✅ = Full effect | ⚡ = Reduced intensity | ❌ = Disabled on this tier

---

## 🧪 Responsive Testing Matrix (Mandatory Before Ship)

### Viewports to Test (Automated + Manual)

| Device | Width × Height | OS/Browser | Priority |
|---|---|---|---|
| iPhone SE (3rd gen) | 375 × 667 | iOS Safari | 🔴 Critical |
| iPhone 14 | 390 × 844 | iOS Safari | 🔴 Critical |
| iPhone 14 Pro Max | 430 × 932 | iOS Safari | 🟡 Important |
| Pixel 7 | 412 × 915 | Chrome Android | 🔴 Critical |
| Galaxy S23 | 360 × 780 | Samsung Internet | 🟡 Important |
| Galaxy A03 (budget) | 360 × 800 | Chrome Android | 🟡 Important |
| iPad Mini | 744 × 1133 | iOS Safari | 🟡 Important |
| iPad Air | 820 × 1180 | iOS Safari | 🟡 Important |
| iPad Pro 12.9" | 1024 × 1366 | iOS Safari | 🟢 Nice-to-have |
| Laptop (13") | 1280 × 800 | Chrome | 🔴 Critical |
| Desktop (1080p) | 1920 × 1080 | Chrome/Firefox | 🔴 Critical |
| Ultrawide (QHD) | 2560 × 1440 | Chrome | 🟢 Nice-to-have |
| Phone Landscape | 667 × 375 | Safari/Chrome | 🟡 Important |

### What to Check at Each Viewport

```
✅ No horizontal scroll (overflow-x) — scroll right should do nothing
✅ No text clipping (Bengali text especially — test with ব, ঘ, etc.)
✅ All section titles visible after scroll reveal (bug fix verified)
✅ Card thumbnails not blurry or stretched
✅ Card grid reflows correctly (4→2→1 columns)
✅ Hero video aspect ratio maintained (no letterbox or crop)
✅ Hero video not taller than viewport on phone landscape
✅ CTA buttons not overflowing or wrapping awkwardly
✅ Form fields usable (input focus doesn't zoom in on iOS)
✅ Form select dropdown appears correctly (z-index, position)
✅ Footer not cut off by mobile nav bar
✅ Mobile bottom nav bar doesn't overlap content
✅ Scroll animations play at correct speed (not too slow on mobile)
✅ No animation triggers twice on fast scroll
✅ Progress bar visible and correct width
✅ Touch targets ≥ 44px × 44px on all interactive elements
✅ No layout shift (CLS < 0.1) during animations
✅ Font sizes readable (min 14px body, 12px captions)
✅ Safe areas (notch, dynamic island, home bar) don't clip content
✅ Dark mode: all text has sufficient contrast
```

### Automated Testing Approach

```typescript
// In future: Playwright viewport loop
const viewports = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'Laptop', width: 1280, height: 800 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

for (const vp of viewports) {
  // Set viewport → scroll to bottom → screenshot each section
  // Check: no horizontal overflow, all sections rendered, no clipping
}
```

For now (until Playwright is set up): Use **Chrome DevTools Device Toolbar** (`Ctrl+Shift+M`) and manually cycle through the 6 critical viewports above AFTER implementing each phase group.

---

## 📱 Mobile-Specific CSS Rules (Added During Implementation)

These CSS rules will be added to `mobile-overrides.css` as we implement:

```css
/* Phase 33: Touch scroll safety */
@media (max-width: 768px) {
  [data-animated] {
    touch-action: pan-y !important;
  }
}

/* Phase 35: Viewport height fix */
@media (max-width: 768px) {
  [data-testid="hero-section"] {
    min-height: 100svh;
    min-height: 100dvh; /* fallback chain */
  }
}

/* Phase 38: Landscape mode */
@media (orientation: landscape) and (max-height: 500px) {
  [data-testid="hero-section"] {
    min-height: auto !important;
    padding-top: 4rem !important;
    padding-bottom: 1rem !important;
  }
  [data-testid="hero-section"] .aspect-video {
    max-height: 280px !important;
  }
}

/* Phase 32: Reduced motion kill switch */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 🎯 Priority Order (Implementation Sequence)

### Phase A — Bug Fix + Foundation + Device Hook (DO FIRST)
1. **Bug Fix:** Fix disappearing titles (Phase 11, 16 — remove nested `whileInView`)
2. **Phase 31:** Create `useDeviceTier()` hook (every phase depends on this)
3. **Phase 32:** `prefers-reduced-motion` global kill switch
4. **Phase 33:** Mobile touch scroll safety CSS
5. **Phase 1:** Install Lenis smooth scroll (desktop/tablet only, disabled on mobile)
6. **Phase 2:** Scroll progress bar (adaptive height per tier)
7. **Phase 4:** Navbar morph

### Phase B — Hero Cinematic (Device-Adaptive)
8. **Phase 6:** Hero video scale-down (opacity-only on mobile)
9. **Phase 8:** Hero CTA fade-out
10. **Phase 35:** Viewport height fix (`svh`/`dvh`)
11. **Phase 38:** Landscape mode lock
12. **Phase 5:** Hero sticky pin (desktop/tablet only)
13. **Phase 10:** Hero → section blur transition (desktop only)

### Phase C — Content Sections Polish
14. **Phase 12:** Card grid cascade Latest (stagger adapts to tier)
15. **Phase 17:** Card grid cascade reverse Most Loved
16. **Phase 36:** Card grid responsive reflow validation
17. **Phase 13:** Card tilt on scroll (desktop only)
18. **Phase 18:** Rank badge pop-in (all devices)
19. **Phase 23:** Form fields sequential reveal (reduced stagger on mobile)
20. **Phase 24:** Submit button glow entrance
21. **Phase 37:** Form responsiveness guard

### Phase D — Depth & Parallax (Desktop-Heavy)
22. **Phase 3:** Background glow parallax (desktop only, static on mobile)
23. **Phase 7:** Hero title parallax split (desktop only)
24. **Phase 14:** Card thumbnail parallax (desktop only)
25. **Phase 26:** Background radial glow pulse (desktop/tablet)

### Phase E — Premium Polish
26. **Phase 19:** Card hover magnetic tilt (desktop only)
27. **Phase 25:** Form card glass shimmer (desktop/tablet only)
28. **Phase 27:** Footer curtain reveal (desktop/tablet only)
29. **Phase 30:** Marquee speed sync (desktop/tablet)
30. **Phase 9:** Bengali underline glow
31. **Phase 34:** Safe area padding for new fixed elements
32. Remaining already-done phases (15, 16, 20, 21, 22, 28, 29)

### Phase F — Testing & Validation (MANDATORY BEFORE SHIP)
33. **Phase 39:** Responsive audit at all 13 viewports
34. **Phase 40:** Performance throttle test (4x CPU slowdown)
35. Lighthouse check (target >90 on mobile + desktop)
36. Final TypeScript/build check

---

## ⚡ Performance Budget

| Metric | Mobile Budget | Desktop Budget | How We Stay Under |
|---|---|---|---|
| **Total JS added** | < 3KB gzip (no Lenis) | < 5KB gzip | Lenis ~3KB desktop only, rest is Framer Motion (already loaded) |
| **Concurrent animations** | Max 3 on screen | Max 6 on screen | `once: true` on all sections, `will-change` only during animation |
| **Layout thrashing** | Zero | Zero | Only `transform` + `opacity`. No `width/height/margin` animations |
| **Paint triggers** | Zero | Zero | No `box-shadow` animations. No `filter` animations on scroll |
| **GPU layers** | Max 4 promoted | Max 8 promoted | `contain: layout style paint` on cards, `translateZ(0)` only when active |
| **FPS target** | 55fps sustained | 60fps sustained | Test with 4x CPU slowdown. Remove any phase that drops below threshold |
| **CLS score** | < 0.1 | < 0.05 | Reserve exact space for animated elements. No content shifting |
| **LCP** | < 2.5s | < 1.5s | Hero video thumbnail uses `fetchPriority="high"`, no animation delays LCP |
| **Touch responsiveness** | < 100ms input delay | N/A | `touch-action: pan-y` on all animated elements, no scroll hijacking |

---

## 🏆 Reference Sites (What We're Matching)

| Site | Key Effect We're Taking |
|---|---|
| **apple.com/iphone** | Sticky hero + scroll-linked video scale-down + section fade transitions |
| **linear.app** | Lenis smooth scroll + scroll progress bar + staggered grid entrances |
| **vercel.com** | Navbar morph + card hover tilt + clean reveal animations |
| **stripe.com** | Background glow parallax + form card glass effects |
| **rockstargames.com** | Full-bleed cinematic sections + heavy use of scroll-triggered reveals |
| **bong bari footer** | Our own footer's `BrandReveal` blur-in + stagger grid already sets the bar |

---

## 📦 Dependencies to Add

```bash
npm install lenis    # 3KB - smooth scroll inertia (the #1 premium upgrade)
```

That's it. Everything else uses **Framer Motion** (already installed) and **native CSS**.

---

## ✅ Acceptance Criteria

### Functionality
- [ ] All section titles ALWAYS visible when scrolled to (bug fix)
- [ ] Smooth scroll feels buttery on desktop/tablet (Lenis)
- [ ] Native scroll on mobile (no Lenis interference)
- [ ] Hero video scales down on scroll exit (desktop) / fades on mobile
- [ ] Card grids stagger in on reveal (adaptive speed per device)
- [ ] Zero TypeScript errors
- [ ] Total added bundle < 5KB gzipped (desktop), <3KB (mobile — no Lenis)

### Responsive — Must Pass ALL
- [ ] iPhone SE (375px) — no overflow, readable text, animations play
- [ ] iPhone 14 (390px) — full experience, smooth scroll
- [ ] Pixel 7 (412px) — Android Chrome smooth, no jank
- [ ] iPad (768px) — tablet layout correct, animations at medium tier
- [ ] Laptop 13" (1280px) — full animations, correct grid
- [ ] Desktop 1080p (1920px) — max premium effect
- [ ] Phone landscape (667×375) — hero not full-screen, content accessible
- [ ] Samsung Internet browser — no scroll-related bugs

### Performance — Must Pass ALL
- [ ] Desktop Lighthouse Performance > 90
- [ ] Mobile Lighthouse Performance > 85
- [ ] CLS < 0.1 (mobile), < 0.05 (desktop)
- [ ] No animation drops below 55fps at 4x CPU throttle
- [ ] No horizontal scrollbar at ANY viewport
- [ ] `prefers-reduced-motion` kills all animations correctly

### Accessibility
- [ ] Touch targets ≥ 44px on mobile
- [ ] All animated content still accessible with animations disabled
- [ ] No content hidden permanently by animation failure
- [ ] Font sizes ≥ 14px body, ≥ 12px captions on mobile
- [ ] Safe areas (notch/home bar) never clip interactive elements
