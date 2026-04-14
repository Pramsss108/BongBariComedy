# BongBari Enhancement Plan — April 2026
> 50 Phases, Batched for Zero Hallucination Execution  
> Rule #1: **Mobile-First** — every change must look perfect on 375px before desktop

---

## BATCH 1 — Mobile Layout & Gap Fixes (Phases 1–8)

### Phase 1: Footer Mobile Overhaul
- Footer grid `gap-10` → `gap-4` on mobile (currently 40px gaps between columns — looks like blog)
- Brand text `text-[17px]` → `text-[15px]` on mobile
- Social icon buttons: enforce `min-h-[44px] min-w-[44px]` touch targets
- Copyright text: `text-[11px]` → `text-xs` (12px, readable)
- Compact the Legal section header + links spacing on mobile

### Phase 2: Hero Video Red Ring Removal
- Remove `ring-2 ring-[#E53935]/60` from video container (red debug border visible in screenshot)
- Replace with subtle golden glow or no ring at all
- Verify on both mobile (375px) and desktop

### Phase 3: Homepage Section Gap Tightening (Mobile)
- Audit every `py-*`, `mb-*`, `mt-*`, `gap-*` on homepage sections at 375px
- Add mobile-overrides for sections with >32px vertical gaps
- Target: no section should have more than 24px gap between content on mobile
- Specifically fix Bridge section, Latest Comedy, Most Loved spacers

### Phase 4: Work With Us — Mobile Form Viewport Fit
- Hero section (COLLABORATE / Let's Create Together) takes too much space before form
- Compact hero: reduce `py-*` padding, shrink badge pills on mobile
- Goal: form first input visible without scrolling on 375px

### Phase 5: Navigation Brand Text Consistency
- Header shows "বং বাড়ি" (always Bengali) regardless of EN/BN toggle
- Add lang-aware brand text: EN = "Bong Bari", BN = "বং বাড়ি"
- Or keep always-Bengali branding (brand identity decision — ask user)

### Phase 6: Mobile Navbar Z-Index & Overlap Audit
- BongBot FAB at `bottom-20` may overlap with mobile navbar dock at `bottom-4`
- Verify no CTA buttons, submit buttons, or content hidden behind the dock
- Add `pb-24` safe zone on all page bottoms so last content isn't behind dock

### Phase 7: Mobile Scroll Smoothness
- Verify Lenis is disabled on mobile (it is — confirmed)
- Add `scroll-behavior: smooth` fallback in mobile-overrides.css
- Check if any `overflow-hidden` parents are trapping scroll on mobile
- Test 60fps scroll on homepage with DevTools Performance panel

### Phase 8: Mobile Font Sizing Pass
- Audit all page titles/subtitles at 375px for readability
- Ensure no text below 12px on mobile (except legal footnotes)
- Check line-height on all Bengali text (Baloo Da 2 needs `leading-relaxed`)

---

## BATCH 2 — BongBot Chatbot Enhancement (Phases 9–16)

### Phase 9: BongBot Mobile Full-Screen Mode
- On mobile (<768px), open BongBot as full-screen overlay instead of floating panel
- Add swipe-down-to-close gesture
- Ensure 100dvh height with soft keyboard handling (resize on focus)

### Phase 10: BongBot Scroll-to-Bottom Fix
- Auto-scroll to latest message after each bot response
- Use `scrollIntoView({ behavior: 'smooth', block: 'end' })` on messagesEndRef
- Handle typing indicator position (always visible at bottom)

### Phase 11: BongBot Quick Reply Chips Enhancement
- Style quick reply templates as horizontal scrollable chips (not stacked)
- Add emoji prefixes to each template for visual scanning
- Show after bot greeting and after each bot response

### Phase 12: BongBot Conversation Persistence
- Save chat history to localStorage (last 50 messages per session)
- On reopen, restore previous conversation with "Welcome back!" header
- Clear button to reset conversation

### Phase 13: BongBot Typing Indicator Polish
- Add 3-dot bouncing animation (not just text "typing...")
- Show bot avatar next to typing indicator
- Delay: show after 300ms of waiting (avoid flash for fast responses)

### Phase 14: BongBot Smart Suggestions
- After bot response, suggest 2-3 contextual follow-up questions
- Use Gemini to generate suggestions based on conversation context
- Display as tappable chips below the response

### Phase 15: BongBot Offline/Error Handling
- Show friendly error message if API unreachable (not generic error)
- "Arey baba! Network lagche na 😅 — try again?" in Bengali personality
- Retry button with exponential backoff (1s, 3s, 5s)

### Phase 16: BongBot Admin Analytics
- Track in DB: total conversations/day, avg messages/session, top questions
- Admin dashboard card: "BongBot Stats" with daily/weekly charts
- Top 10 most-asked questions list for training improvement

---

## BATCH 3 — Admin Dashboard Enhancement (Phases 17–22)

### Phase 17: Admin Dashboard Mobile Responsive
- Currently desktop-optimized — make all admin pages work on mobile
- Tabs → horizontal scrollable pills on mobile
- Data tables → card view on mobile (stacked, not horizontal scroll)

### Phase 18: Admin Lead Pipeline Visual Board
- Kanban-style board for collaboration leads: New → Hot → Warm → Cold → Dead
- Drag-and-drop (or tap-to-move on mobile) between columns
- Color-coded cards with company name, date, quick actions

### Phase 19: Admin Blog Editor Enhancement
- Rich text editor (replace plain textarea if currently basic)
- Image upload within blog posts
- Preview mode (see how post looks on site before publishing)
- SEO fields: meta description, featured image, slug editor

### Phase 20: Admin Analytics Dashboard
- Page views chart (from GA4 data or server-side logging)
- User signups over time
- Top pages by traffic
- BongBot usage stats (from Phase 16)
- Collaboration request conversion funnel

### Phase 21: Admin Quick Actions Bar
- Top bar with: "New Blog Post", "View Leads", "Check Moderation Queue"
- Notification badges: pending moderation count, new leads count
- One-click deploy status (last deployment time from GitHub Actions)

### Phase 22: Admin Settings Page
- Manage global settings: site title, description, social links
- Toggle features: BongBot on/off, community feed on/off, maintenance mode
- API key management UI (masked display, rotate keys)

---

## BATCH 4 — Backend & Database Hardening (Phases 23–30)

### Phase 23: API Rate Limiting Enhancement
- Current: 3 questions/day for BongBot free users
- Add: per-IP rate limit on all public POST endpoints (10 req/min)
- Add: per-IP rate limit on downloader endpoints (5 req/min)
- Use Upstash Redis or in-memory sliding window

### Phase 24: Database Query Optimization
- Add indexes on frequently queried columns: `blogPosts.slug`, `communityPosts.featured`, `collaborationRequests.leadStatus`
- Check for N+1 query patterns in community feed
- Add pagination to all list endpoints (default: 20 items)

### Phase 25: API Response Caching
- Cache blog posts list: 5min TTL (invalidate on create/update/delete)
- Cache chatbot templates: 15min TTL
- Cache community feed: 2min TTL
- Use server-side in-memory cache (Map with TTL)

### Phase 26: Error Logging & Monitoring
- Structured JSON logging for all API errors (timestamp, path, status, message)
- Log to file: `server/logs/error.log` (rotated daily)
- Health check endpoint `/api/health` with DB connectivity check
- Alert: if DB unreachable, return 503 with graceful message

### Phase 27: Database Backup Strategy
- Neon Postgres: enable point-in-time recovery (PITR)
- Document backup/restore procedure in README
- Weekly automated export of critical tables (users, leads, blog posts)

### Phase 28: API Input Validation Hardening
- Add Zod schemas for ALL POST/PUT request bodies server-side
- Sanitize HTML in blog content, community posts (XSS prevention)
- Enforce max lengths: message (5000 chars), name (100 chars), email (255 chars)

### Phase 29: Authentication Hardening
- Add session expiry (24h for regular, 7d for "remember me")
- Add refresh token rotation for Google OAuth sessions
- Rate limit login attempts: 5/min per IP
- Add account lockout after 10 failed login attempts

### Phase 30: CDN & Asset Optimization
- Serve static assets with long Cache-Control headers (1 year for hashed files)
- Setup Cloudflare CDN in front of Oracle VM for API caching
- Optimize hero video poster image: convert to WebP, resize to 750px max width
- Lazy-load all images below the fold with `loading="lazy"`

---

## BATCH 5 — Frontend Polish & Speed Phase 2 (Phases 31–38)

### Phase 31: Image Optimization Pass
- Audit all images in `client/public/` — convert PNG/JPG to WebP
- Add `width`/`height` attributes to all `<img>` tags (prevent CLS)
- Lazy-load images: `loading="lazy"` on all below-fold images
- Compress logo/favicons (currently may be oversized)

### Phase 32: Critical CSS Inline
- Extract above-the-fold CSS (~5KB) and inline in `<head>` of index.html
- Defer main CSS bundle load with `media="print" onload` trick
- Reduces First Contentful Paint (FCP) by ~200-400ms

### Phase 33: Service Worker (PWA Basics)
- Register service worker for offline fallback page
- Cache critical assets (JS bundles, CSS, fonts) on first visit
- Show "You're offline" toast when connection lost
- Add `manifest.json` with install prompt support

### Phase 34: Skeleton Screens for All Pages
- Current: only LoadingFallback (black skeleton) exists
- Add page-specific skeletons: Blog list, FAQ grid, Work With Us form
- Match exact layout of each page for zero-layout-shift loading

### Phase 35: Prefetch Critical Routes
- On homepage load, prefetch `/about`, `/work-with-us`, `/faq` chunks
- Use `<link rel="prefetch">` or React Router prefetch on hover
- Reduces navigation time to ~0ms for prefetched routes

### Phase 36: Framer Motion Tree-Shaking Audit
- Ensure only used motion features are bundled
- Check if `AnimatePresence` in unused routes is pulling extra code
- Consider `m` import alias for smaller bundle (`m.div` vs `motion.div`)

### Phase 37: CSS Deduplification
- Audit index.css for duplicate keyframes, redundant selectors
- Consolidate cursor animations (multiple definitions found)
- Extract repeated color values to CSS variables
- Target: reduce CSS size by 15-20%

### Phase 38: Third-Party Script Optimization
- GA4 + Meta Pixel: verify async loading, no blocking
- Defer non-critical third-party scripts to `requestIdleCallback`
- Consider Partytown for running analytics in web worker

---

## BATCH 6 — Desktop Polish & UX (Phases 39–44)

### Phase 39: Desktop Hero Above-the-Fold Audit
- Verify video + CTA buttons + "Funny stories" subtitle all visible without scroll on 1080p
- Check 1440p and 4K — ensure content doesn't look tiny
- Max-width constraints for ultra-wide monitors

### Phase 40: Desktop Navigation Hover Effects
- Add subtle hover animations on nav links (underline slide-in)
- Active page indicator with brand-yellow accent
- Smooth dropdown transitions for auth menu

### Phase 41: Desktop Footer Columns Alignment
- Verify 4-column layout looks balanced on 1920px
- Social icons: uniform sizing, hover color transitions
- Legal links: proper spacing, no orphan words

### Phase 42: Desktop BongBot Position & Size
- Ensure chatbot panel doesn't overlap important content
- Add resize handle for desktop (drag to resize panel)
- Remember last position/size in localStorage

### Phase 43: Blog Page Desktop Layout
- Two-column layout: posts list (left) + sidebar (right)
- Sidebar: recent posts, categories, search
- Post cards: featured image, title, excerpt, date, read time

### Phase 44: Desktop Smooth Scroll Polish
- Fine-tune Lenis settings: duration, easing curve
- Ensure parallax effects don't jank on 60Hz monitors
- Add scroll-triggered animations that respect prefers-reduced-motion

---

## BATCH 7 — Advanced Features & Future-Proofing (Phases 45–50)

### Phase 45: Push Notifications (Web Push API)
- Ask permission on second visit (not first — reduces annoyance)
- Notify on: new blog post, new community story featured, BongBot update
- Backend: store push subscriptions in DB, send via web-push library

### Phase 46: Dark Mode / Theme System
- Currently: always dark theme
- Add optional light theme toggle (stored in localStorage)
- CSS variables for all colors to enable instant theme switch
- Respect `prefers-color-scheme` media query

### Phase 47: i18n System (Beyond Toggle)
- Replace hardcoded EN/BN strings with proper i18n (react-intl or custom)
- Centralized translation files: `locales/en.json`, `locales/bn.json`
- All pages use translation keys, not inline strings
- Easy to add Hindi, other languages later

### Phase 48: Analytics Event Tracking Enhancement
- Track: CTA clicks, video plays, form submissions, BongBot opens
- Custom events for: page scroll depth, time on page, exit intent
- GA4 custom dimensions: language preference, device tier, auth status

### Phase 49: Performance Budget CI
- Add Lighthouse CI to GitHub Actions
- Fail build if: Performance < 85, Accessibility < 90, SEO < 90
- Track bundle size over time (fail if main chunk > 300KB)
- Weekly perf report in Slack/Discord

### Phase 50: A/B Testing Framework
- Simple server-side flag system (via adminSettings table)
- Assign users to cohorts (stored in localStorage)
- Track conversion by cohort (subscribe clicks, form fills)
- Admin UI: create/view/end experiments

---

## Execution Rules

1. **Batch Size**: Work in batches of 8 phases. Complete one batch fully before starting next.
2. **Mobile-First**: Every change tested at 375px BEFORE desktop.
3. **No Regressions**: `npm run check` + `npm run build:client` must pass after every batch.
4. **Incremental Commits**: One commit per batch with `FORCE_PAGES_DEPLOY`.
5. **No Feature Deletion**: Enhance existing features, never remove working functionality.
6. **Desktop Locked**: Desktop layout changes only in Batch 6 (Phases 39-44). All other batches focus mobile/backend.

---

## Priority Order (Today's Session)

| Priority | Batch | Phases | Focus |
|----------|-------|--------|-------|
| 🔴 NOW | Batch 1 | 1–8 | Mobile layout fixes, footer, gaps |
| 🟠 NEXT | Batch 2 | 9–16 | BongBot chatbot mobile + features |
| 🟡 THEN | Batch 3 | 17–22 | Admin dashboard enhancement |
| 🟢 AFTER | Batch 4 | 23–30 | Backend hardening |
| 🔵 LATER | Batch 5 | 31–38 | Frontend speed phase 2 |
| ⚪ FUTURE | Batch 6-7 | 39–50 | Desktop polish + advanced features |
