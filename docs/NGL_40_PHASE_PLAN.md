# Bong NGL — Production Roadmap (Filtered April 2026)

> **This is the SINGLE SOURCE OF TRUTH.** Agents: read this before doing anything.
> Only remaining work is listed. Completed phases are in the archive at the bottom.
> Each phase = 1 agentic task. Do NOT combine phases. Do NOT skip phases.
> After completing a phase, update its status line to ✅ DONE with date.

---

## ⚡ STATUS DASHBOARD

| # | Phase | Status | File(s) to edit |
|---|-------|--------|-----------------|
| 10 | Mid-tutorial resume | ✅ DONE | `ShareModal.tsx` |
| 11 | Prompt card WCAG contrast | ✅ DONE | `NglDashboard.tsx` |
| 12 | WA share card → choice screen | ✅ DONE (was already implemented) | `NglDashboard.tsx` |
| 13 | OTP tooltip for new users | ✅ DONE | `NglDashboard.tsx` |
| 14 | Theme picker tooltip + audit | ✅ DONE | `NglDashboard.tsx` |
| 15 | Banish (delete) Bengali warning | ✅ DONE (was already in i18n) | `NglDashboard.tsx` |
| 16 | ShareModal theme integration | ✅ DONE | `ShareModal.tsx` |
| 17 | PhoneFrame platform glow | ✅ DONE | `ShareModal.tsx` |
| 18 | Dark bg consistency audit | ✅ DONE (audit confirmed compliant) | `ShareModal.tsx`, `NglDashboard.tsx` |
| 19 | Button color hierarchy | ✅ DONE | `ShareModal.tsx`, `NglDashboard.tsx` |
| 20 | Icon/emoji consistency sweep | ✅ DONE (all platforms use SVG) | `ShareModal.tsx` |
| 21 | GA4 share funnel events | ✅ DONE | `ShareModal.tsx` |
| 22 | Return-from-app tracking | ✅ DONE | `ShareModal.tsx` |
| 23 | Dashboard GA4 heatmap events | ✅ DONE | `NglDashboard.tsx` |
| 24 | Error tracking (onerror + API) | ✅ DONE | `client/index.html`, `queryClient.ts` |
| 25 | Performance metrics | ✅ DONE | `NglDashboard.tsx`, `ShareModal.tsx` |
| 26 | PhoneFrame responsive scaling | ✅ DONE | `ShareModal.tsx` |
| 27 | Share cards 2-col on tiny phones | ✅ DONE | `NglDashboard.tsx` |
| 28 | Modal scroll handling | ✅ DONE | `ShareModal.tsx` |
| 29 | Touch target 44px audit | ✅ DONE | `ShareModal.tsx`, `NglDashboard.tsx` |
| 30 | Keyboard a11y (tabIndex, focus) | ✅ DONE | `ShareModal.tsx`, `NglDashboard.tsx` |
| 31 | Tutorial description freshness | ✅ DONE (5 steps × 2 langs × 3 platforms) | `ShareModal.tsx` |
| 32 | Bengali translation 100% | ⬜ TODO | `ShareModal.tsx`, `NglDashboard.tsx` |
| 33 | Share templates 6+6 | ⬜ TODO | `ShareModal.tsx` |
| 34 | Error messages bilingual | ⬜ TODO | `NglDashboard.tsx` |
| 35 | Skeleton/shimmer loaders | ⬜ TODO | `NglDashboard.tsx` |
| 36 | Typecheck + lint zero errors | ⬜ TODO | all files |
| 37 | Bundle size audit | ⬜ TODO | `vite.config.ts` |
| 38 | Cross-browser test | ⬜ TODO | manual |
| 39 | Integration test coverage | ⬜ TODO | `tests/api.test.ts` |
| 40 | Production deploy + verify | ⬜ TODO | deploy scripts |

---

## 🔧 REMAINING PHASES — DETAILED INSTRUCTIONS

> **Agents: Execute ONE phase at a time. Mark ✅ DONE when complete.**

---

### Phase 10 — Mid-tutorial resume (localStorage)
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **Implemented**:
  - `getResumeStep(scr)` reads `bng_tut_resume_{screen}` from localStorage, returns step if < 30 min old
  - `startTutorial()` checks resume and shows toast "⏩ Resuming from step X"
  - `useEffect` on `[tutorialStep, screen]` saves progress for steps 1-4
  - `markTutorialDone()` clears resume key on completion

---

### Phase 11 — Prompt card WCAG contrast audit
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Implemented**:
  - Bumped prompt text from `text-white/80` → `text-white/90` (passes WCAG AA on all 7 themes)
  - Added `aria-label="Shuffle prompt"` on dice/shuffle button
  - Added `aria-label="Edit prompt"` on edit button
  - Added `role="status"` on prompt text `<p>` element

---

### Phase 12 — WA share card routes to choice screen
- **Status**: ✅ DONE (was already implemented before plan creation)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Verified**: WA card at line 1085 already calls `setShareModalScreen('whatsapp'); setShowShareModal(true);` which opens ShareModal with the Chat vs Status picker. No code change needed.

---

### Phase 13 — OTP icon tooltip for first-time users
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Implemented**:
  - Speech bubble tooltip above OTP icon: "ফোন ভেরিফাই → প্রিমিয়াম" (BN) / "Verify phone → premium" (EN)
  - Auto-sets `localStorage('ngl_otp_seen')` after 5s or on tap
  - Only shows when `phoneStatus !== 'verified'` and `ngl_otp_seen` not set
  - Speech bubble with arrow pointer, `backdrop-blur-md`, dark glass style

---

### Phase 14 — Theme picker tooltip + gradient audit
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Implemented**:
  - Added `title` prop to each theme circle: `title="{label} {emoji}"` (e.g., "Ocean 🌊")
  - Theme persists via server API (`handleSetTheme` saves via PUT)
  - All 7 gradients verified rendering correctly on theme circles
  - Hover shows native browser tooltip with theme name

---

### Phase 15 — Banish (delete account) Bengali warning
- **Status**: ✅ DONE (was already implemented in i18n)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Verified**:
  - `NglLang.tsx` line 153 has `dash.banishWarning` key with full Bengali: "এটা করলে তোর account, সব messages, সব data — সব permanently মুছে যাবে। undo করা যাবে না!"
  - `NglDashboard.tsx` line 1594 renders it via `{t('dash.banishWarning')}` in the banish confirmation modal
  - No code change needed

---

### Phase 16 — ShareModal theme integration
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **Implemented**:
  - Added `THEME_ACCENTS` lookup (7 themes with gradient + shadow classes) inside component
  - Replaced 3 hardcoded `from-pink-500 to-orange-400` decorative gradients with `themeAccent.gradient`:
    1. Chat preview avatar bubble ("B" icon)
    2. Quick-mode "Open app" CTA button
    3. Tutorial last-step "Open app" CTA button
  - Platform brand colors (IG pink, WA green, FB blue) remain untouched
  - Shadow classes also dynamic via `themeAccent.shadow`

---

### Phase 17 — PhoneFrame platform-colored glow
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **What was done**:
  - Added `PLATFORM_GLOW` map: `ig-guide` → pink, `wa-status-guide` → green, `fb-guide` → blue
  - Applied `filter: drop-shadow(0 0 30px ...)` on tutorial phone wrapper div and expanded overlay
  - PhoneFrame component also accepts optional `glowColor` prop for future use
- **Done when**: PhoneFrame has subtle colored glow matching platform ✅

---

### Phase 18 — Dark background consistency audit
- **Status**: ✅ DONE (audit confirmed compliant, Apr 2026)
- **Files**: `ShareModal.tsx`, `NglDashboard.tsx`
- **Verified**:
  - No `bg-white` or `bg-gray-*` classes found in either file
  - All backgrounds use dark-mode compliant values: `#0a0a14`, `#1a1020`, `#12121f` (dark grays)
  - All surfaces use transparent whites: `white/[0.04]` through `white/15`
  - No bright surfaces break the dark premium feel
  - No code change needed

---

### Phase 19 — Button color hierarchy
- **Status**: ✅ DONE (Apr 2026)
- **Files**: `ShareModal.tsx`, `NglDashboard.tsx`
- **What was done**:
  - Audited 24 buttons in ShareModal, 36+ in NglDashboard
  - Twitter/X picker button promoted from Ghost to Secondary (`bg-white/[0.08]`)
  - Delete modal cancel button fixed to `bg-white/[0.08]` (Secondary)
  - Added `active:scale-[0.97]` tactile feedback to: Save Prompt, Enhance Prompt, Delete Cancel, Save Story Text, Save OG Meta, Reset OG
  - All motion.button elements already had `whileTap`; non-motion buttons now have CSS `active:scale-[0.97]`
  - All primary (gradient), secondary (`bg-white/[0.08]`), ghost (`bg-white/[0.04]`) classifications verified correct
- **Done when**: Clear visual hierarchy on all buttons ✅

---

### Phase 20 — Icon & emoji consistency sweep
- **Status**: ✅ DONE (was already implemented correctly)
- **File**: `client/src/components/ShareModal.tsx`
- **Verified**:
  - All platform logos (IG, WA, FB) use proper SVG icons (~lines 2140-2159), not emoji
  - SVG viewBox sizes consistent
  - Clean separation: Brand logos = SVG, action indicators = emoji
  - No code change needed

---

### Phase 21 — GA4 share funnel events
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **What exists**: `trackShare(platform)` saves to localStorage only. No gtag() calls.
- **Steps**:
  1. Add helper: `const gEvent = (name: string, params?: Record<string, string>) => { if (window.gtag) window.gtag('event', name, params); };`
  2. Fire `gEvent('ngl_share_modal_open')` when ShareModal opens
  3. Fire `gEvent('ngl_platform_select', { platform: screen })` when user picks platform
  4. Fire `gEvent('ngl_tutorial_step', { platform: screen, step: String(tutorialStep) })` on step change
  5. Fire `gEvent('ngl_tutorial_complete', { platform: screen })` in `markTutorialDone()`
  6. Fire `gEvent('ngl_skip_to_story_card')` when Story Card escape link clicked
  7. Declare `window.gtag` in a `.d.ts` or inline: `declare global { interface Window { gtag?: (...args: any[]) => void; } }`
- **Done when**: GA4 Real-time shows events when testing locally

---

### Phase 22 — Return-from-app tracking
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **Steps**:
  1. In `smartOpen()`, after opening external app, add `document.addEventListener('visibilitychange', ...)` listener
  2. When user returns (visible again), fire `gEvent('ngl_return_from_app', { platform: screen })`
  3. Show "Did it work?" UI if desired (optional — can just log the event)
- **Done when**: Returning from IG/WA/FB app fires GA4 event

---

### Phase 23 — Dashboard GA4 heatmap events
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/pages/NglDashboard.tsx`
- **Steps**:
  1. Import/reuse `gEvent` helper (or define locally)
  2. Fire events on: tab switch, theme change, prompt shuffle, prompt edit save, copy link tap, share card tap, OTP button tap, message reaction, message expand
  3. Use structured names: `ngl_tab_switch`, `ngl_theme_change`, `ngl_prompt_shuffle`, `ngl_copy_link`, `ngl_reaction`, etc.
- **Done when**: Dashboard interactions visible in GA4 Real-time

---

### Phase 24 — Error tracking
- **Status**: ✅ DONE (Apr 2026)
- **Files**: `client/index.html`, `client/src/lib/queryClient.ts`
- **Steps**:
  1. In `client/index.html` `<head>`, add:
     ```js
     window.onerror = function(msg, url, line) { if (window.gtag) window.gtag('event', 'js_error', { message: String(msg).slice(0,100), source: url, line: line }); };
     window.onunhandledrejection = function(e) { if (window.gtag) window.gtag('event', 'unhandled_rejection', { reason: String(e.reason).slice(0,100) }); };
     ```
  2. In `queryClient.ts`, after fetch failures, fire `gEvent('api_error', { endpoint, status })`
  3. In `ShareModal.tsx` clipboard catch block, fire `gEvent('clipboard_error')`
- **Done when**: Errors show as GA4 events

---

### Phase 25 — Performance metrics
- **Status**: ✅ DONE (Apr 2026)
- **Files**: `NglDashboard.tsx`, `ShareModal.tsx`
- **Steps**:
  1. In dashboard mount: `performance.mark('dashboard_render')` → in first useEffect after render: `performance.measure('dashboard_load', 'dashboard_render')` → fire `gEvent('perf_dashboard_load', { duration })`
  2. In ShareModal: track tutorial completion time (save `Date.now()` on start, compute delta on complete)
  3. For API calls: wrap fetch with timing → fire `gEvent('perf_api', { endpoint, duration })` for calls > 1s
- **Done when**: Performance data in GA4 Events

---

### Phase 26 — PhoneFrame responsive scaling
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **What was done**:
  - Non-expanded: `w-[200px] sm:w-[220px] md:w-[240px] lg:w-[280px]` (was `w-[220px] md:w-[240px]`)
  - Expanded: `w-[280px] sm:w-[340px] md:w-[380px]` (from 300px base)
  - Height: non-exp `h-[320px] sm:h-[340px]`, exp `h-[480px] sm:h-[580px] md:h-[640px]`
  - Scales clean at 320px, 375px, 768px, 1440px

---

### Phase 27 — Share cards 2-col grid on tiny phones
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/pages/NglDashboard.tsx`
- **What was done**:
  - Changed grid from `grid-cols-4` to `grid-cols-2 sm:grid-cols-4`
  - Card label text: `text-[10px] sm:text-[9px]` (slightly bigger on 2-col)
  - 2×2 grid on phones ≤640px, 4-col row on larger screens

---

### Phase 28 — Modal scroll handling (short viewports)
- **Status**: ✅ DONE (Apr 2026)
- **File**: `client/src/components/ShareModal.tsx`
- **What was done**:
  - Added `max-h-[90vh] overflow-y-auto scrollbar-hide` to modal content wrapper
  - Content scrolls on landscape mode (640px height) without clipping

---

### Phase 29 — Touch target 44px minimum
- **Status**: ✅ DONE (Apr 2026)
- **Files**: `ShareModal.tsx`, `NglDashboard.tsx`
- **What was done**:
  - Pause/Play button: `w-7 h-7` visual + `min-w-[44px] min-h-[44px]` tap zone
  - Language toggle (EN/বাং): `min-h-[44px] min-w-[44px]` + larger padding
  - Progress bar segments: `py-[10px] -my-[10px]` invisible padding for 44px+ tap zone
  - Close button: `min-h-[44px] min-w-[44px]` with flex centering
  - Story palette buttons: `min-h-[44px]` + `px-2.5 py-1.5`
  - Banish button: `w-11 h-11` (44px)
  - Photo remove button: visual `w-5` + `min-w-[44px]` tap zone

---

### Phase 30 — Keyboard accessibility
- **Status**: ✅ DONE (Apr 2026)
- **Files**: `ShareModal.tsx`, `NglDashboard.tsx`
- **What was done**:
  - Prompt text: `tabIndex={0}`, `role="button"`, Enter key opens editor, `focus-visible:outline-2 focus-visible:outline-white/20`
  - Progress bar segments: `tabIndex={0}`, `role="button"`, Enter/Space navigates steps
  - All picker buttons (IG, WA, FB, Telegram, Twitter/X, Copy, Story Card): `focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl`
  - Share cards in dashboard: `focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2`
  - Full Tab → Enter navigation works through picker and tutorial flows

---

### Phase 31 — Tutorial step descriptions accuracy (April 2026)
- **Status**: ✅ DONE (was already implemented with bilingual 5-step tutorials)
- **File**: `client/src/components/ShareModal.tsx`
- **Verified**:
  - `IG_STEPS`: 5 steps × 2 languages (Bengali + English) ~line 611
  - `WA_STATUS_STEPS`: 5 steps × 2 languages ~line 907
  - `FB_STEPS`: 5 steps × 2 languages ~line 1086
  - All step descriptions are current and detailed
  - No code change needed

---

### Phase 32 — Bengali translation 100% coverage
- **Status**: ⬜ TODO
- **Files**: `ShareModal.tsx`, `NglDashboard.tsx`
- **Steps**:
  1. Grep for all hardcoded English user-facing strings
  2. For each, ensure there's a `bn ?` ternary with Bengali translation
  3. Check: tooltip text, toast messages, error messages, button labels, placeholder text
  4. Special attention: any new features added after initial Bengali pass
- **Done when**: Toggle to BN → zero English text visible

---

### Phase 33 — Share templates expansion (6 BN + 6 EN)
- **Status**: ⬜ TODO
- **File**: `client/src/components/ShareModal.tsx`
- **What exists**: 3 BN + 3 EN share templates in `shareTemplates` array.
- **Steps**:
  1. Find `shareTemplates` array
  2. Add 3 more EN templates: professional, fun, mysterious tones
  3. Add 3 more BN templates matching same tones
  4. Verify random rotation still works
- **Done when**: 12 total templates (6 BN + 6 EN)

---

### Phase 34 — Error messages bilingual
- **Status**: ⬜ TODO
- **File**: `client/src/pages/NglDashboard.tsx`
- **Steps**:
  1. Find all error/empty state strings (API fail, offline, wrong key, empty inbox)
  2. Add Bengali versions for each
  3. Replace generic "Error" with helpful message: "কিছু সমস্যা হয়েছে, আবার চেষ্টা করো" etc.
  4. Add offline banner: `{isOffline && <div className="...">📶 ইন্টারনেট নেই</div>}`
- **Done when**: All error states show Bengali when BN active

---

### Phase 35 — Skeleton/shimmer loaders
- **Status**: ⬜ TODO
- **File**: `client/src/pages/NglDashboard.tsx`
- **What exists**: No skeletons. Content loads with fade animations.
- **Steps**:
  1. Create reusable `Shimmer` component: `<div className="animate-pulse bg-white/[0.06] rounded-lg h-4 w-full" />`
  2. Inbox loading: show 3 shimmer message bars (different widths: 80%, 60%, 70%)
  3. Prompt card loading: show shimmer text lines (2 lines, 90% and 60% width)
  4. Show shimmer while data is `undefined` (before first fetch resolves)
- **Done when**: All loading states use shimmer bars instead of blank/spinner

---

### Phase 36 — Typecheck + lint zero errors
- **Status**: ⬜ TODO
- **Steps**:
  1. Run `npm run check`
  2. Fix ALL TypeScript errors
  3. Run ESLint if configured
  4. Check: no `any` types in NGL code, no unused imports, all `motion.div` in `AnimatePresence` have `key` prop
- **Done when**: `npm run check` returns 0 errors

---

### Phase 37 — Bundle size audit
- **Status**: ⬜ TODO
- **Steps**:
  1. Run `npm run build:client`
  2. Check bundle sizes in terminal output
  3. If any chunk > 200KB: identify heavy imports, add dynamic `import()` for non-critical code
  4. Check framer-motion tree-shaking: should only import `motion`, `AnimatePresence`, `useAnimation`
  5. Check inline SVGs aren't bloating the bundle
- **Done when**: Build succeeds + no chunk > 200KB

---

### Phase 38 — Cross-browser testing
- **Status**: ⬜ TODO (manual)
- **Steps**:
  1. Test on: Chrome, Firefox, Safari, Edge (desktop)
  2. Test on: Chrome Android, Safari iOS (mobile)
  3. Verify: `backdrop-blur-xl` renders (not transparent fallback)
  4. Verify: framer-motion animations don't jank on low-end device emulation
  5. Verify: `navigator.clipboard` fallback (textarea method) works when clipboard API blocked
  6. Document any browser-specific CSS fixes needed
- **Done when**: Tested 6+ browsers, all pass

---

### Phase 39 — Integration test coverage
- **Status**: ⬜ TODO
- **File**: `tests/api.test.ts`
- **Steps**:
  1. Add test: `GET /api/ngl/u/{testuser}` → 200 + user data
  2. Add test: `GET /api/ngl/u/{testuser}/inbox` → 200 + messages array
  3. Add test: `POST /api/ngl/phone/send-otp` → 200 (with test number)
  4. Add test: `POST /api/ngl/phone/verify-otp` → 200 (with test OTP)
  5. Add test: `POST /api/ngl/u/{testuser}/prompt` → 200 (save prompt)
  6. Run `npm run test:integration` — all pass
- **Done when**: 5+ NGL API tests passing

---

### Phase 40 — Production deploy + verify
- **Status**: ⬜ TODO
- **Steps**:
  1. Run `npm run deploy:safe`
  2. Wait 2-3 min for GitHub Pages propagation
  3. Verify: `www.bongbari.com/ngl/q/testuser` loads correctly (deep link via 404.html)
  4. Verify: All 3 tutorials render (IG/WA/FB)
  5. Verify: OTP flow works on production backend (Oracle VM `79.76.110.66:5000`)
  6. Verify: GA4 Real-time shows events
  7. Hard refresh (Ctrl+F5) to confirm no stale cache
- **Done when**: Production live + all features verified

---

## 📚 COMPLETED PHASES ARCHIVE

> These are done. Do NOT re-do them. For reference only.

| Phase | Description | Completed |
|-------|-------------|-----------|
| 1 | IG Step 0: "Your Story" BouncingArrow + GlowRing | ✅ Apr 2026 |
| 2 | IG Step 1: Sticker icon arrow + GlowRing | ✅ Apr 2026 |
| 3 | IG Step 2: LINK tile arrow + dim non-LINK | ✅ Apr 2026 |
| 3.5 | IG Step 3: Done button — BouncingArrow (removed broken finger) | ✅ Apr 2026 |
| 3.6 | IG Step 4: 4-keyframe sticker animation + drag hint | ✅ Apr 2026 |
| 4 | WA Step 0: Pencil FAB pointer (tap pulse pattern — works fine) | ✅ Apr 2026 |
| 5 | FB Steps 0-1: Create Story + Text pointers (tap pulse — works fine) | ✅ Apr 2026 |
| 6 | Auto-copy link + animated confirmation overlay | ✅ Apr 2026 |
| 7 | Story Card escape hatch on every step | ✅ Apr 2026 |
| 8 | Deep link `smartOpen()` + fallback to web URL | ✅ Apr 2026 |
| 9 | Slide animation + swipe gestures + clickable progress | ✅ Apr 2026 |
| 10 | Mid-tutorial resume (localStorage) | ✅ Apr 2026 |
| 11 | Prompt card WCAG contrast audit | ✅ Apr 2026 |
| 12 | WA share card → choice screen | ✅ (was already implemented) |
| 15 | Banish Bengali warning (was already in i18n) | ✅ Apr 2026 |
| 18 | Dark bg consistency audit (confirmed compliant) | ✅ Apr 2026 |
| 20 | Icon/emoji consistency (all SVG already) | ✅ Apr 2026 |
| 31 | Tutorial descriptions (5 steps × 2 langs × 3 platforms) | ✅ Apr 2026 |
| 13 | OTP tooltip for first-time users | ✅ Apr 2026 |
| 14 | Theme picker tooltip + gradient audit | ✅ Apr 2026 |
| 16 | ShareModal theme integration (dynamic accent colors) | ✅ Apr 2026 |
| 26 | PhoneFrame responsive scaling | ✅ Apr 2026 |
| 27 | Share cards 2-col on tiny phones | ✅ Apr 2026 |
| 28 | Modal scroll handling (short viewports) | ✅ Apr 2026 |
| 29 | Touch target 44px minimum | ✅ Apr 2026 |
| 30 | Keyboard accessibility (tabIndex, focus rings) | ✅ Apr 2026 |

---

## Arrow Fix Quick Reference

| Tutorial | Step | Target | Arrow Type | Status |
|----------|------|--------|-----------|--------|
| IG | 0 | "Your story" circle | BouncingArrow ↑ | ✅ |
| IG | 1 | Sticker icon (☺) | BouncingArrow ↑ | ✅ |
| IG | 2 | LINK tile | BouncingArrow ↑ | ✅ |
| IG | 3 | "Done" button | BouncingArrow ↑ + GlowRing | ✅ |
| IG | 4 | Draggable sticker | Drag animation (no arrow) | ✅ |
| WA | 0 | Pencil FAB | Tap pulse + 👆 | ✅ |
| WA | 1 | Paste area | Clipboard fly animation | ✅ |
| WA | 2 | Send button | Tap pulse + 👆 | ✅ |
| FB | 0 | "Create Story" | Tap pulse + 👆 | ✅ |
| FB | 1 | "Text" option | Tap pulse + 👆 | ✅ |
| FB | 2 | "Share to Story" | GlowRing only | ⚠️ Optional: add arrow |
| FB | 3 | "Share Now" | BouncingArrow ↑ | ✅ |

---

## 🚨 AGENT RULES (READ BEFORE EVERY PHASE)

1. **One phase at a time.** Never combine phases.
2. **`get_errors` after every edit.** Zero TypeScript errors tolerated.
3. **Test at `localhost:5173`** after visual changes.
4. **Bengali must render correctly** — don't just write it, check it.
5. **Platform brand colors are SACRED**: IG=`#E4405F`/`#833ab4`, WA=`#25D366`/`#128C7E`, FB=`#1877F2`
6. **framer-motion**: stiffness 300–500, damping 14–22 (bouncy); stiffness 200, damping 25 (smooth). Never `duration` with `type:'spring'`.
7. **Dark palette**: bg `#0a0a14`, surface `white/[0.03-0.08]`, text `white/[0.20-0.90]`, borders `white/[0.04-0.08]`.
8. **Update this file** after completing each phase: change `⬜ TODO` → `✅ DONE (date)` in both the status dashboard table and the detailed section.