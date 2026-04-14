# 🎯 Mobile Dock & Yellow Bleed — Complete Fix Plan

**Author:** Vibe Coder Architect  
**Date:** April 14, 2026  
**Goal:** Permanently eliminate yellow body bleed, fix floating pill dock, bulletproof scroll across ALL devices (iOS Safari, Android Chrome, Samsung Internet, Firefox, desktop responsive).  
**Method:** 25 Phases → 5 Batches × 5 Phases each. Execute batch-by-batch, verify after each.

---

## 📦 BATCH 1 — Nuclear Yellow Kill (Remove the root cause)

### Phase 1: Trace & Document Every Yellow Source
- **File:** `client/src/index.css` (~line 589-598)
- **What:** The `body` has `background-color: var(--brand-yellow)` AND a `linear-gradient(135deg, hsl(48,100%,80%) ...)` with `background-attachment: fixed`
- **Action:** Document which pages/sections actually USE the yellow background (hero banner area only? or global?)
- **Why:** We must know what breaks before removing it

### Phase 2: Replace Body Yellow With Neutral Dark
- **File:** `client/src/index.css`
- **What:** Change body background from yellow gradient to `#0a0a0a` (near-black) globally
- **Action:** Replace `background-color: var(--brand-yellow)` and the gradient with `background-color: #0a0a0a`
- **Why:** Yellow body = root cause of ALL bleed on every device. Dark body means zero bleed anywhere, ever
- **Risk:** Desktop pages that relied on body yellow will lose their background → solved in Phase 3

### Phase 3: Move Yellow to Page-Level Wrapper (Desktop Only)
- **File:** `client/src/pages/home.tsx` (and any other pages that need yellow BG)
- **What:** Wrap the desktop page content in a div that has the yellow gradient background
- **Action:** Add a wrapper `<div style={{ background: 'linear-gradient(...)' }}>` around content ABOVE the footer, only on desktop (`!device.isMobile`)
- **Why:** Keeps desktop looking identical, but body is always dark → no bleed possible

### Phase 4: Remove Mobile-Override Body Hack
- **File:** `client/src/mobile-overrides.css`
- **What:** Remove the `background: #050505 !important` override added on body for mobile
- **Action:** Delete the 3 forced background lines since body is now dark globally (Phase 2 fixed it at source)
- **Why:** Overrides with `!important` are fragile hacks. Fix the source, delete the hack

### Phase 5: Verify Zero Yellow on All Viewports
- **Test:** Open localhost:5173 in Chrome DevTools responsive mode
- **Check at:** 320px (iPhone SE), 375px (iPhone 12), 390px (iPhone 14), 412px (Pixel 7), 768px (iPad), 1024px+ (desktop)
- **Verify:** Scroll to absolute bottom → no yellow anywhere. Scroll past bottom (bounce) → no yellow. Body background in DevTools Computed tab = `#0a0a0a`
- **Verify desktop:** Yellow gradient still visible on homepage content area (from Phase 3 wrapper)

---

## 📦 BATCH 2 — Scroll & Overscroll Bulletproofing

### Phase 6: Audit Current Scroll Setup
- **Files:** `client/src/index.css`, `client/src/mobile-overrides.css`, any Lenis scroll setup
- **What:** Document every `overflow`, `overscroll-behavior`, `scroll-behavior`, `-webkit-overflow-scrolling` rule
- **Action:** List all scroll-related CSS rules and which elements they target
- **Why:** Previous overscroll-behavior: none broke scrolling entirely. Need to understand the full scroll chain

### Phase 7: Safe Overscroll Prevention (iOS Bounce)
- **File:** `client/src/mobile-overrides.css`
- **What:** Add `overscroll-behavior-y: contain` (NOT `none`) on `html` only
- **Action:** `html { overscroll-behavior-y: contain; }` inside the `@media (max-width: 768px)` block
- **Why:** `contain` prevents bounce from revealing body background BUT still allows normal scrolling. `none` blocks everything (that's what broke scroll before)

### Phase 8: iOS Safari Rubber-Band Defense
- **File:** `client/src/mobile-overrides.css`
- **What:** Ensure `#root` or main content wrapper has `min-height: 100dvh` and `overflow-y: auto`
- **Action:** Add to mobile media query: `#root { min-height: 100dvh; position: relative; }`
- **Why:** iOS Safari rubber-bands from the viewport edge. If #root fills the viewport, the bounce happens inside #root (dark) not on body

### Phase 9: Android Chrome Edge Glow Fix
- **File:** `client/src/mobile-overrides.css`
- **What:** Android shows an "edge glow" effect on overscroll in some versions
- **Action:** Add `html, body { overscroll-behavior-x: none; }` (X axis only, doesn't affect Y scroll)
- **Why:** Horizontal overscroll glow can flash body color. Block horizontal overscroll only

### Phase 10: Cross-Browser Scroll Verification
- **Test:** Open on actual phone OR Chrome DevTools with touch simulation enabled
- **Check:** Smooth scroll works on all pages (Home, FAQ, Work With Us, About, Blog)
- **Check:** Pull-to-refresh / bounce scrolling at top and bottom → dark background only, no yellow flash
- **Check:** Lenis smooth scroll still functional (not conflicting with native scroll)
- **Check:** Footer fully scrollable into view, pill dock doesn't block content

---

## 📦 BATCH 3 — Floating Pill Dock Polish

### Phase 11: Pill Position & Safe Area
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Verify pill clears the system home indicator bar on all phones
- **Action:** Ensure `paddingBottom: calc(10px + env(safe-area-inset-bottom))` works on iPhone X+ and Android gesture nav
- **Test on:** iOS notch devices (iPhone X/11/12/13/14/15), Android gesture nav (Pixel, Samsung)

### Phase 12: Pill Touch Target Accessibility
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Each icon button is 52×42px — Apple HIG minimum is 44×44px ✅ but WCAG recommends 48×48px
- **Action:** Increase hit area to 54×46px if needed, add `touch-action: manipulation` to prevent 300ms delay
- **Why:** Users with large fingers or accessibility needs must be able to tap reliably

### Phase 13: Active State Visual Feedback
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Current active page shows full opacity + dot indicator
- **Action:** Add a subtle radial glow behind the active icon (4px white radial at 10% opacity) for stronger visual hierarchy
- **Why:** On dark glass, the difference between 0.4 and 1.0 opacity can be subtle in bright sunlight

### Phase 14: Context Menu Positioning
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Context menu is `fixed bottom-[68px] right-4` — needs to stay above pill on all devices
- **Action:** Calculate dynamically: `bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 10px)`
- **Why:** On iPhone 15 Pro Max with large safe area, the menu might overlap the pill. Dynamic calc prevents this

### Phase 15: Dock Hide-on-Scroll (Optional Enhancement)
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Many modern apps hide the dock when scrolling down, show on scroll up
- **Action:** Add scroll direction detection → `translateY(100%)` with spring animation on scroll down, `translateY(0)` on scroll up or idle
- **Why:** Gives maximum content viewing area while scrolling. User gets full screen for reading content, dock appears when they need it

---

## 📦 BATCH 4 — Footer & Page Bottom Coordination

### Phase 16: Footer Bottom Padding Calibration
- **File:** `client/src/components/footer.tsx`
- **What:** Mobile footer has `paddingBottom: calc(52px + env(safe-area-inset-bottom))`
- **Action:** Verify this matches the pill position exactly. The floating pill is 46px tall positioned 10px from bottom. Footer padding should be `calc(66px + env(safe-area-inset-bottom))` → `46px pill + 10px gap + 10px breathing room`
- **Why:** Last footer content must be fully visible above the pill, never hidden behind it

### Phase 17: Footer-to-Body Seam Elimination
- **File:** `client/src/components/footer.tsx` + `client/src/mobile-overrides.css`
- **What:** The "seam" between footer dark (#050505) and body dark (#0a0a0a) can sometimes show as a hairline
- **Action:** Match colors exactly — both footer AND body should use identical `#050505`. Or footer uses `margin-bottom: -1px` to overlap
- **Why:** Sub-pixel rendering on Retina displays can show a 0.5px line between two adjacent dark colors if they're slightly different

### Phase 18: Dark Safety Strip Audit
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** There's a `z-[9998]` dark strip behind the pill (`height: calc(8px + safe-area)`, `background: #050505`)
- **Action:** After Phase 2 makes body dark globally, this strip becomes redundant. Remove it to simplify DOM
- **Why:** Less DOM = less rendering work. Body is dark, footer is dark, no strip needed

### Phase 19: BongBot Panel Clearance
- **File:** `client/src/components/BongBot.tsx`
- **What:** BongBot panel is `fixed bottom-20 right-4 z-[10001]`
- **Action:** Ensure BongBot panel bottom position clears the pill dock. Should be `bottom: calc(66px + env(safe-area-inset-bottom))`
- **Why:** If BongBot opens and overlaps the pill, user can't navigate. Must sit above it

### Phase 20: Full Page Scroll-to-Bottom Test
- **Test on:** Home page (longest page), FAQ (accordion expands), Work With Us (form page), About, Blog
- **Check per page:**
  - ✅ Can scroll to absolute bottom
  - ✅ All footer content visible above pill
  - ✅ No yellow anywhere at any scroll position
  - ✅ Pill always visible and tappable
  - ✅ BongBot doesn't overlap pill when open
  - ✅ Context menu doesn't clip off screen

---

## 📦 BATCH 5 — Cross-Device Hardening & Ship

### Phase 21: iOS Safari-Specific Fixes
- **Files:** `client/src/mobile-overrides.css`, `client/index.html`
- **What:** iOS Safari has unique behaviors: URL bar collapse changes viewport height, `100vh` ≠ `100dvh`, touch delay, rubber-band bounce
- **Action:**
  - Ensure all height calculations use `dvh` not `vh`
  - Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` if not present
  - Test with iOS Safari "Add to Home Screen" (standalone mode) — no browser chrome
- **Why:** 40%+ mobile traffic is iOS Safari. It has the most quirks

### Phase 22: Samsung Internet & Firefox Mobile Audit
- **Test:** Open site in Samsung Internet browser and Firefox Mobile
- **Check:** Pill renders correctly (backdrop-filter support), no yellow bleed, scroll works
- **Action:** If Samsung Internet doesn't support `backdrop-filter`, add fallback `background: rgba(18,18,18,0.95)` (higher opacity, no blur)
- **Why:** Samsung Internet is ~5% global mobile traffic. Firefox Mobile occasionally renders things differently

### Phase 23: Dark Mode / Light Mode Consistency
- **Files:** `client/src/index.css`, `client/src/mobile-overrides.css`
- **What:** Some phones have system-level dark mode that can affect `prefers-color-scheme`
- **Action:** Add `@media (prefers-color-scheme: light)` and `@media (prefers-color-scheme: dark)` guards to ensure our forced dark body works regardless of system preference
- **Why:** Some Android phones in light mode might try to override dark backgrounds

### Phase 24: Performance Audit (Dock + Footer)
- **File:** `client/src/components/mobile-navbar.tsx`
- **What:** Framer Motion spring animations + backdrop-filter blur are GPU-heavy
- **Action:**
  - Add `will-change: transform` only on animated elements
  - Ensure `contain: layout style` on pill container
  - Test FPS in Chrome DevTools Performance tab during scroll — target 60fps
  - If blur causes frame drops on low-end devices, reduce to `blur(20px)` or remove
- **Why:** If the dock causes jank during scroll, the whole site feels slow

### Phase 25: Final Ship — Build, Test, Deploy
- **Commands:**
  ```
  npm run check          # TypeScript validation
  npm run build:client   # Vite production build + 404.html
  npm run deploy:safe    # Preflight + commit + push
  ```
- **Post-deploy verification (2 min after push):**
  - ✅ `www.bongbari.com` loads — no blank screen
  - ✅ Mobile: scroll works, pill visible, no yellow
  - ✅ Desktop: yellow gradient visible on content area (not body)
  - ✅ All 5 dock icons tappable and functional
  - ✅ Context menu opens/closes correctly
  - ✅ BongBot opens above pill
  - ✅ Deep links work (`/faq`, `/work-with-us`, `/about`)
  - ✅ `robots.txt` and `sitemap.xml` return correct content

---

## 📊 Execution Tracker

| Batch | Phases | Status | Commit |
|-------|--------|--------|--------|
| **1 — Nuclear Yellow Kill** | 1-5 | ✅ COMPLETE | pending commit |
| **2 — Scroll Bulletproofing** | 6-10 | ✅ COMPLETE | pending commit |
| **3 — Pill Dock Polish** | 11-15 | ✅ COMPLETE | pending commit |
| **4 — Footer & Clearance** | 16-20 | ✅ COMPLETE | pending commit |
| **5 — Cross-Device & Ship** | 21-25 | ✅ COMPLETE | pending commit |

---

## ⚡ Key Rules
1. **One batch at a time** — verify all 5 phases before starting next batch
2. **Batch 1 is CRITICAL** — removes root cause. All other batches build on it
3. **Never use `!important` on scroll properties** — breaks everything
4. **Body must be dark globally** — yellow only on page-level wrappers where needed
5. **Test on real device after each batch** — DevTools responsive ≠ real phone
