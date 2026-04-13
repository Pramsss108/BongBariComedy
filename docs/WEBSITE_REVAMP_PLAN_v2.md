# Website Revamp — Master Plan v2

> **Strategy:** 12 rounds × 3 phases each = 36 total  
> **Execution:** Each round is one Opus agentic pass (MAX 3 focused phases — prevents hallucination)  
> **Automated Testing:** Every round ends with `npm run check` + visual browser verify  
> **Goal:** Awwwards-tier dark premium site, butter-smooth animations, 90+ Lighthouse, flawless 375px→2560px

---

## 📊 CURRENT SITE AUDIT (Pre-Revamp Baseline)

### What We Have Already ✅
- **Stack:** React 18 + Vite 5 + TypeScript + Tailwind + Framer Motion 11
- **Code splitting:** 15+ lazy routes, manual chunks (react-vendor, ui-vendor, animation-vendor)
- **Design tokens:** CSS vars for brand-yellow (#FFCC00), brand-red, brand-blue, glass morphism
- **Fluid typography:** `clamp()` in CSS (hero 32→72px, body 14→18px)
- **Fonts:** Poppins (sans) + Baloo Da 2 (Bengali)
- **Mobile nav:** Floating glass dock (bottom-4, z-9999, rounded-full, 56px touch targets)
- **Safe-area:** body `env(safe-area-inset-*)` in mobile-overrides.css
- **Dark theme:** #050505 bg, aurora blur orbs, gradient border cards
- **Icons:** Lucide React
- **Carousel:** embla-carousel-react

### What's WRONG ❌
- Homepage footer: tiny `p-3` glass bar, unreadable, no links
- Video card sections: raw thumbnails, janky `x: -40` / `x: 40` slide animations
- No image optimization (no WebP/AVIF, no lazy loading plugin)
- `useQuery` refetch aggressive (5-15min, no staleTime)
- Aurora blur orbs (3× `blur-[120px]`) expensive on low-end devices
- iframe remount on mute toggle (`key={videoKey}`) — expensive
- No scroll progress indicator
- No View Transitions API
- No prefers-reduced-motion handling
- Blog single post page may be broken/placeholder
- FAQ: full page scroll, not contained viewport
- Work With Us: form below fold

### Trending Techniques to ADD 🔥
1. **CSS Scroll-Driven Animations** — native `animation-timeline: scroll()` (Chrome/Safari/Edge)
2. **Intersection Observer `once: true`** — already using framer-motion whileInView, keep & optimize
3. **Reveal-on-scroll** — `opacity: 0 → 1` + `translateY(20px → 0)` only, NEVER horizontal slides
4. **Magnetic hover effects** — subtle cursor-following button attraction (already have `useGlobalCursor`)
5. **Grain/noise texture** — CSS `background-image: url(noise.svg)` overlay for premium depth
6. **Glassmorphism 2.0** — inner glow + outer shadow + frosted borders
7. **Bento grid layout** — asymmetric card grid for About/Features sections
8. **Stagger orchestration** — parent controls children with `staggerChildren: 0.06`
9. **Smooth page transitions** — framer-motion `AnimatePresence` on route change
10. **Core Web Vitals focus** — LCP < 2.5s, INP < 200ms, CLS < 0.1
11. **Image lazy loading** — native `loading="lazy"` + `decoding="async"` on all images
12. **prefers-reduced-motion** — disable animations for accessibility

---

## 🔴 GLOBAL RULES (Apply to EVERY round)

### Mobile-First — Non-Negotiable
- Test at **375px (iPhone SE)** and **390px (iPhone 14 Pro)**
- Nothing cut off, no horizontal scroll, all text readable
- **Bottom nav safe zone:** `pb-24` on mobile (dock = `fixed bottom-4`, ~72px)
- **Notch safe area:** `env(safe-area-inset-bottom)` already on body — verify per page
- Cards: `grid-cols-1` on mobile → `grid-cols-2` tablet → `grid-cols-3/4` desktop
- Touch targets: minimum 44×44px (current dock items are 56px — good)
- Font sizes: minimum 14px body, minimum 12px labels

### Premium Dark Theme Tokens (DO NOT DEVIATE)
```
BG:          #050505
Card outer:  rounded-2xl p-[1px] bg-gradient-to-br from-[accent]/20 to-white/5
Card inner:  bg-black/80 backdrop-blur-xl border border-white/5 rounded-[calc(1rem-1px)]
Text:        white (headings), text-gray-300 (body), text-gray-500 (muted)
Buttons:     bg-[color]/20 border border-[color]/30 → hover: bg-[color] text-white
Glow:        bg-brand-yellow/10 blur-[120px] (max 2 orbs per page)
Glass:       bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl
Gold:        #FFD700 / #DAA520 / #FFF8DC / #B8860B (metallic palette)
```

### Animation Rules (Lessons from Round 1 Footer)
- **ONLY opacity + blur on scroll-linked elements** — `filter: blur(10px→0px)` + `opacity: 0→1`
- **NEVER use `scale()` or `translateY()` in scroll-linked transforms** — causes clipping at ancestor boundaries
- **Vertical fade for entrance:** `y: 16-20, opacity: 0` → `y: 0, opacity: 1` (non-scroll-linked, whileInView)
- **NEVER horizontal slides** (`x: ±40` — BANNED)
- **No hardcoded glow `<div>`s behind text** — they render as ugly visible rectangles. Use CSS only.
- **No `overflow: hidden` on section parents** — clips transformed children. Use `overflow-x: hidden` only if needed.
- **Stagger:** `delay: index * 0.06` (fast, not slow)
- **Duration:** 0.3-0.5s max (never longer)
- **Easing:** `easeOut` or `[0.25, 0.46, 0.45, 0.94]` (Apple cubic-bezier)
- **`once: true`** on all scroll-triggered animations (except brand reveals that benefit from replay)
- **`prefers-reduced-motion`:** wrap in `useReducedMotion()` from framer-motion
- **No parallax** (removed — keep removed)
- **Compact first, breathe second** — reduce font/padding before adding spacing

### Premium Effects Palette (Proven in Footer)
```
Noise overlay:     SVG fractalNoise, opacity-[0.03], pointer-events-none
Gold edge line:    2px gradient, sweep animation 5s, upward halo blur(12px)
Metallic text:     7-stop gold gradient, background-clip: text, shimmer 8s
Pill elements:     rounded-full, per-item colored glow ring on hover
Marquee:           30s infinite scroll, pause on hover, letter-spacing expand
Frosted glass bg:  blur(20px), border-top white/0.06
Micro-interactions: ArrowUpRight on link hover, gold underline expand
```

### Automated Verification (End of EVERY round)
```powershell
npm run check                    # TypeScript zero errors
# Visual: open localhost:5173 in Chrome DevTools
# Test at 375px, 768px, 1024px, 1440px widths
# Check: no horizontal scroll, no cut-off, no console errors
```

---

## ✅ Round 1 — Homepage: Premium Footer ✅ COMPLETE

**Delivered:** `client/src/components/footer.tsx` + CSS in `client/src/index.css`
**Quality:** Gold metallic shimmer brand text, scroll-linked blur reveal (opacity + filter only — NO scale/Y transforms that clip), edge-faded marquee, pill social icons with per-platform glow, 12-col grid, ArrowUpRight hover micro-interactions, noise texture overlay, premium gold edge line with sweeping animation.
**Shared across:** home, about, blog, FAQ, work-with-us, free-tools (6 pages).

### 🔑 Lessons Learned (Apply to ALL Future Rounds)
1. **NEVER use CSS `scale()` or `translateY()` on scroll-linked text** — browsers clip at ancestor boundaries. Use only `opacity` + `filter: blur()` for reveal effects.
2. **No hardcoded glow `<div>`s behind text** — they look like ugly rectangles. Use CSS `text-shadow` or gradient `background-clip: text` only.
3. **No `overflow: hidden` on parent sections** — it clips transformed children. Avoid entirely or use `overflow-x: hidden` only when needed.
4. **Compact first, headroom second** — reduce font sizes/padding before adding spacing. Smaller elements naturally create breathing room.
5. **No brown/warm melt zones** — page bg is `#050505`, footer starts at `#050505`. Seamless match, no visible transition gradient.
6. **Gold metallic is `#FFD700 / #DAA520 / #FFF8DC / #B8860B`** — NOT `rgba(255,204,0,0.x)` white/gold mix which looks washed out.
7. **Premium = restraint** — fewer effects done perfectly > many effects done cheaply.

---

## Round 2 — Homepage: Premium Reels Showcase (Phases 4–6)

### Phase 4: Premium Video Card — Clean, No Badges
**File:** `client/src/components/youtube-short.tsx`

**The card is the content. No overlaid badges (they kill readability).**
- Remove `badge` prop entirely — section title tells users what they're seeing
- Thumbnail: `rounded-2xl`, `loading="lazy" decoding="async"`
- Dark vignette: bottom 40% gradient for title readability
- Title: white, `text-shadow: 0 2px 8px rgba(0,0,0,0.85)`, `line-clamp-2`
- Play button: centered, glass circle `bg-white/10 backdrop-blur-md`, gold ring on hover
- Hover: thumbnail zoom `scale(1.03)` INSIDE overflow-hidden (no clipping), card border shifts gold
- Keep click-to-play iframe swap

### Phase 5: Premium Section Container — "Reels Showcase"
**File:** `client/src/pages/home.tsx` + `client/src/index.css`

**This is where the $1000 lives. Each section is a full branded container:**

**Container Architecture:**
- Outer: `max-w-7xl mx-auto px-4 py-8 md:py-12`
- Glass card wrapper: `bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm rounded-3xl p-5 sm:p-6 md:p-8`
- Top accent line inside container: 2px gradient bar (cyan→indigo for Latest, pink→rose for Loved)
- `whileInView` opacity+y fade on the entire container (no per-card stagger — too jumpy)

**Section Header (INSIDE container):**
- Title: `text-xl sm:text-2xl font-bold text-white` — NOT all-caps, NOT gradient text
- Bengali subtitle: `text-sm text-gray-500`
- Small accent underline: `h-[2px] w-12` matching section color
- "View All" link (right side, desktop only): `text-sm text-gray-400 hover:text-white` with ArrowUpRight

**Cards Grid (INSIDE container):**
- `grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4`
- NO per-card gradient border wrapper — the section container IS the premium element
- Cards sit directly in grid with `rounded-2xl overflow-hidden bg-black/60`

**CSS:**
- `.reels-section`: the glassmorphism container class
- `.reels-section-accent`: 2px gradient line at top, with subtle glow halo
- Hover: entire section gets a barely-visible border brighten

### Phase 6: Apply to Both Sections + Polish
**File:** `client/src/pages/home.tsx`

- "Latest Comedy" section: cyan→indigo accent, links to YouTube channel
- "Most Loved" section: pink→rose accent, links to popular playlist
- Both use identical container architecture (DRY via same component pattern)
- Compact spacing between sections: `gap-6 md:gap-8` between them
- **Kill** all `x:` animations — y+opacity only
- **Kill** all badges from cards
- **Verify:** `npm run check` → 0 errors, test 375px / 768px / 1440px

---

## Round 3 — Homepage: Animation Cleanup + Spacing (Phases 7–9)

### Phase 7: Kill ALL Janky Animations Sitewide
**Files:** ALL page files (`home.tsx`, `about.tsx`, `blog.tsx`, `faq.tsx`, `work-with-us.tsx`)

- **Search & destroy** every `x: -40`, `x: 40`, `x: -20`, `x: 20` → delete the `x` prop
- All `whileInView`: ONLY `{ opacity: 1, y: 0 }` pattern
- Initial: `{ opacity: 0, y: 16 }` titles, `{ opacity: 0, y: 20 }` cards
- Hero section: NO animation delay (instant visible — above the fold)
- Viewport: `{ once: true, margin: '-40px' }`
- **Lesson from R1:** NEVER use `scale()` in scroll-linked transforms — it clips

### Phase 8: Section Spacing — Compact Premium
**File:** `client/src/pages/home.tsx`

- **Lesson from R1:** compact first, breathe second
- Section padding: `py-8 md:py-12` (NOT `py-16 md:py-24` — too much dead space)
- Section title margin: `mb-5 md:mb-6`
- Hero: video + CTA visible without scroll on 1080p desktop
- Kill dead space between hero and first content section
- **Mobile:** `py-6` section padding, `gap-3` between cards

### Phase 9: Performance Quick Wins
**Files:** home.tsx, youtube-short.tsx, index.css

- `loading="lazy" decoding="async"` on ALL `<img>` tags
- Aurora orbs: max 2, hide 1 on mobile (`hidden sm:block`)
- `@media (prefers-reduced-motion: reduce)` in index.css — kill all keyframes
- Fix iframe: no remount on mute toggle — use `postMessage`
- **Verify:** `npm run check` → 0 errors

---

## Round 4 — FAQ: Modern Rebuild (Phases 10–12)

### Phase 10: FAQ Layout
**File:** `client/src/pages/faq.tsx`

- **Premium standard:** Dark, compact, no wasted space
- Desktop: sidebar (25%) + content (75%) with internal scroll
- Mobile: horizontal category pills (scrollable) + content below
- Compact header: title + search only (kill big hero banner)
- `min-h-[calc(100dvh-80px)]`, custom dark scrollbar
- **No scale/Y transforms** — opacity fade only for sections

### Phase 11: FAQ Accordion
**File:** `client/src/pages/faq.tsx`

- `AnimatePresence` + `motion.div` height animation (spring, 0.3s)
- Chevron: `transition-transform duration-200 rotate-180`
- Active question: 3px left accent bar (category color)
- Category pills: icon + title + count badge, active = filled gradient
- **Lesson from R1:** no glow divs, use CSS borders/shadows for premium feel

### Phase 12: FAQ Search + CTA
**File:** `client/src/pages/faq.tsx`

- Debounced search (200ms), matched text highlighted `text-brand-yellow`
- "No results" state: suggestion chips
- Bottom CTA: "Still have questions?" glassmorphism card
- **Mobile:** `pb-28` for bottom nav
- **Verify:** `npm run check` → 0 errors

---

## Round 5 — Work With Us: One-View Form (Phases 13–15)

### Phase 13: Layout — Form First, Above Fold
**File:** `client/src/pages/work-with-us.tsx`

- **Premium standard:** One glassmorphism card, everything inside
- Kill paragraph descriptions + separate collaboration cards
- Header: "Let's Collaborate" + 3 tab pills (Product / Content / Social)
- Must fit in `100vh - 80px` without scroll on desktop
- `bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl rounded-2xl`

### Phase 14: Form Inputs — Dark Premium
**File:** `client/src/pages/work-with-us.tsx`

- 2-col desktop (Name + Company, Email + Phone), 1-col mobile
- Inputs: `bg-white/5 border-white/10 text-white placeholder:text-gray-600` 
- Focus: `border-brand-yellow/50 ring-2 ring-brand-yellow/20`
- Textarea: 3 rows, not 6
- 48px input height on mobile, full-width

### Phase 15: Submit UX
**File:** `client/src/pages/work-with-us.tsx`

- Button: `bg-brand-yellow/20 border border-brand-yellow/30` → hover solid gold
- Loading: animated dots inside button (not spinner)
- Success: replace form with checkmark + "We'll reply in 48 hours"
- **Mobile:** full-width button, `pb-28` for bottom nav
- **Verify:** `npm run check` → 0 errors

---

## Round 6 — Blog: Magazine Cards (Phases 16–18)

### Phase 16: Blog Card — Magazine Overlay Style
**File:** `client/src/pages/blog.tsx`

- **Premium standard (like footer):** no cheap flat layouts
- Image fills card (`h-64` desktop, `h-48` mobile), `object-cover rounded-2xl`
- Dark gradient overlay bottom 40% (`bg-gradient-to-t from-black/80 via-black/40 to-transparent`)
- Title: bold white ON image (text-shadow), 2 lines max with `line-clamp-2`
- Category pill top-left, reading time top-right
- Gold underline reveal on hover (same pattern as footer links)

### Phase 17: Blog Cards — Hover + Entrance
**File:** `client/src/pages/blog.tsx`

- Hover: image zoom `scale(1.03)` (inside `overflow-hidden` container), gradient darkens
- Entire card clickable
- Stagger entrance: `y: 20, opacity: 0`, `delay: i * 0.06`, `once: true`
- Category filter pills above cards (All / Comedy / Culture / Behind Scenes)
- **Mobile:** full-width stacked, no hover effects (tap only)

### Phase 18: Blog Single Post + Loading
**File:** Blog post page/route

- Article layout: full-width hero image → `max-w-2xl` body, `text-[18px] leading-relaxed`
- Loading: dark skeleton pulse matching layout
- Empty state: "No posts yet" with subtle illustration
- Share: copy link + WhatsApp buttons
- **Verify:** `npm run check` → 0 errors

---

## Round 7 — About Page: Visual Polish (Phases 19–21)

### Phase 19: About — Card Layout
**File:** `client/src/pages/about.tsx`

- **Premium standard:** same gradient-border card pattern as video cards
- Founder card: gradient avatar placeholder
- Cards: `p-[1px] bg-gradient-to-br from-brand-yellow/20 to-white/5 rounded-2xl`
- Inner: `bg-black/80 backdrop-blur-xl rounded-[calc(1rem-1px)]`
- Stagger entrance: `y: 16`, `once: true`

### Phase 20: About — Contact + Social
**File:** `client/src/pages/about.tsx`

- `tel:` and `mailto:` links work on mobile (click-to-call)
- Social icons: 48px touch targets, same pill style as footer
- Text address (no embed map — fast loading)
- Legal cross-links: Privacy, Terms, Refund

### Phase 21: About — Mobile Audit
**File:** `client/src/pages/about.tsx`

- Kill any `x:` animations
- 375px: no overflow, cards stack properly
- Footer renders correctly
- **Verify:** `npm run check` → 0 errors

---

## Round 8 — Navigation + Page Transitions (Phases 22–24)

### Phase 22: Navbar — Active State + Premium
**File:** Navbar component

- Active page: `border-b-2 border-brand-yellow` indicator
- Navbar blur increases on scroll
- Logo hover: subtle gold glow via CSS `filter: drop-shadow()`
- Link hover: `text-white` transition, no jarring effects

### Phase 23: Mobile Nav Audit
**File:** `client/src/components/mobile-navbar.tsx`

- Verify `env(safe-area-inset-bottom)` on notched devices
- Active state: gold indicator on current route
- 44px+ touch targets confirmed
- Smooth `AnimatePresence` drawer open/close

### Phase 24: Route Transitions
**File:** `client/src/App.tsx`

- `AnimatePresence` wrapper on routes
- Enter: `opacity: 0 → 1` (0.3s), Exit: `opacity: 1 → 0` (0.2s)
- **NO layout shift** during transition
- **Verify:** `npm run check` → 0 errors

---

## Round 9 — Performance + Core Web Vitals (Phases 25–27)

### Phase 25: Image Optimization
- `loading="lazy" decoding="async"` on ALL below-fold images
- Hero: `fetchpriority="high"`
- YouTube thumbs: `sddefault.jpg` where possible
- Explicit `width/height` or `aspect-ratio` to prevent CLS

### Phase 26: Bundle + Runtime
- Code splitting: chunks < 200KB each
- `useQuery` staleTime: 5 minutes minimum
- Aurora orbs: max 2, `hidden sm:block` third
- `content-visibility: auto` on below-fold sections
- `will-change: transform` only during active animation

### Phase 27: Accessibility + Reduced Motion
- `@media (prefers-reduced-motion: reduce)` block in CSS
- Focus rings: `focus-visible:ring-2 ring-brand-yellow/50`
- ARIA labels on icon-only buttons
- WCAG AA contrast on all text
- **Verify:** `npm run check` → 0 errors

---

## Round 10 — SEO + Meta + Structured Data (Phases 28–30)

### Phase 28: Per-Page Meta Tags
**Files:** All page components

- **Premium standard:** every page individually SEO-optimized, not generic
- Custom `useEffect` hook per page setting `document.title`
- Format: `"Page Name | Bong Bari — Bengali Comedy"`
- Meta description: 150-160 chars, unique per page, keyword-targeted
- OpenGraph: `og:title`, `og:description`, `og:image` (social sharing card), `og:url`
- Twitter card: `summary_large_image`, with same OG data
- Canonical URL: `<link rel="canonical">` matching route

### Phase 29: Sitemap + Robots Audit
**Files:** `client/public/sitemap.xml`, `client/public/robots.txt`

- Verify ALL routes present including new/changed ones
- Priority: Home 1.0, About/FAQ/Blog 0.8, Free Tools 0.7, Legal pages 0.3
- `changefreq`: daily for home/blog, weekly for tools, monthly for legal
- Robots: no blocking of critical paths, allow Googlebot on all public routes
- Canonical URLs match sitemap URLs exactly
- **Verify:** `robots.txt` and `sitemap.xml` live in `client/public/` (NOT repo root)

### Phase 30: JSON-LD + Schema Enhancement
**File:** `client/index.html`

- Organization schema: name, url, logo, social profiles, contact
- Person schema: founder (Abhijit Pramanik)
- BreadcrumbList: `Home > [Current Page]` for all routes
- WebSite schema with SearchAction (if search exists)
- Test: Google Rich Results Test passes for all schema types
- **Verify:** `npm run check` → 0 errors

---

## Round 11 — Cross-Page Consistency Audit (Phases 31–33)

### Phase 31: Visual Consistency — Design Token Enforcement
**Files:** All page files

- **Premium standard (from footer learnings):**
- Background: `#050505` everywhere, max 2 aurora orbs per page
- Card pattern: `p-[1px] bg-gradient-to-br from-[color]/20 to-white/5 rounded-2xl`
- Card inner: `bg-black/80 backdrop-blur-xl rounded-[calc(1rem-1px)]`
- Glassmorphism: `bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl`
- H1: `text-3xl md:text-4xl font-bold text-white` (compact, not extrabold bloated)
- H2: `text-xl md:text-2xl font-semibold text-white`
- Section padding: `py-8 md:py-12` (compact premium)
- Gold accents: `#FFD700 / #DAA520 / #FFF8DC` palette ONLY
- NO `overflow: hidden` on section parents unless `overflow-x: hidden` specifically needed
- NO `scale()` or `translateY()` in scroll-linked transforms — opacity + blur ONLY

### Phase 32: Mobile Responsive Mega-Audit (375px + 390px)

| Page | Checklist |
|------|-----------|
| Home | hero visible, video plays, cards grid, footer stacked, `pb-28` nav clear |
| About | cards stack full-width, contact links clickable, no x-overflow |
| Work With Us | form visible immediately, inputs 48px height, button full-width |
| Blog | cards full-width, images load, category pills horizontal scroll |
| FAQ | pills scroll horizontally, accordion smooth, search debounced |
| Free Tools | cards stack, all clickable, 44px+ touch targets |
| Privacy/Terms/Refund | scrollable, text readable `text-[16px]`, links work |

- **Kill:** any `x:` animation on mobile, any hover-dependent interaction with no tap fallback
- All pages: `pb-28` to clear bottom nav dock

### Phase 33: Desktop Breakpoint Audit (768px / 1024px / 1440px / 2560px)

- Content: `max-w-7xl mx-auto` on all pages
- Cards: 1-col → 2-col (768px) → 3-col (1024px) → 4-col (1440px) where applicable
- Navigation: mobile dock < 768px → full horizontal links ≥ 768px
- Footer: stacked → 12-col grid transition clean at `sm:` breakpoint
- No orphaned text, no cards wider than 400px on ultrawide
- **Verify:** `npm run check` → 0 errors

---

## Round 12 — Final QA + Deploy (Phases 34–36)

### Phase 34: Build + TypeScript Verification
```powershell
npm run check          # TypeScript: 0 errors required
npm run build:client   # Clean build, 0 warnings
```
- Verify `dist/public/404.html` exists (SPA routing)
- Verify `dist/public/` contains all JS/CSS assets referenced by `index.html`
- Verify no asset filename mismatches between `index.html` and built files

### Phase 35: Live Site Testing Checklist
After deploy via `npm run deploy:safe`:

- [ ] `https://www.bongbari.com` loads (not blank, not stuck on spinner)
- [ ] `https://www.bongbari.com/robots.txt` returns plain text (NOT SPA HTML)
- [ ] `https://www.bongbari.com/sitemap.xml` returns XML (NOT SPA HTML)
- [ ] View source: Meta Pixel + GA4 in `<head>`, Pixel `<noscript>` in `<body>`
- [ ] View source: JSON-LD schemas in `<head>`
- [ ] Deep link `/about` works (loads SPA, NOT GitHub 404)
- [ ] Deep link `/admin` loads SPA
- [ ] DevTools Network: main JS bundle returns JavaScript (NOT HTML redirect)
- [ ] No mixed-content warnings in console
- [ ] Mobile: bottom nav visible, all pages navigable, `pb-28` clearance
- [ ] Google Rich Results Test: Organization + BreadcrumbList detected

### Phase 36: Final Verification Matrix

| Page | Desktop 1440px | Mobile 375px | Footer OK | Animations OK | SEO Meta OK | No Console Errors |
|------|---------------|-------------|-----------|---------------|-------------|-------------------|
| Home | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| About | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Work With Us | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Blog | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| FAQ | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Free Tools | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Privacy | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Terms | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Refund | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

**All cells must be [x] before declaring revamp complete.**

---

## Execution Summary

| Round | Focus | Phases | Status | Risk |
|-------|-------|--------|--------|------|
| **1** | Premium Footer | 1–3 | ✅ **COMPLETE** | 🟢 Done |
| **2** | Premium Reels Showcase | 4–6 | ⬜ Pending | 🟡 Medium |
| **3** | Animations + Spacing | 7–9 | ⬜ Pending | 🟡 Medium |
| **4** | FAQ Rebuild | 10–12 | ⬜ Pending | 🔴 High (rewrite) |
| **5** | Work With Us | 13–15 | ⬜ Pending | 🔴 High (restructure) |
| **6** | Blog Revamp | 16–18 | ⬜ Pending | 🔴 High (card redesign) |
| **7** | About Polish | 19–21 | ⬜ Pending | 🟢 Low |
| **8** | Navigation + Transitions | 22–24 | ⬜ Pending | 🟡 Medium |
| **9** | Performance + CWV | 25–27 | ⬜ Pending | 🟡 Medium |
| **10** | SEO + Meta | 28–30 | ⬜ Pending | 🟢 Low |
| **11** | Consistency Audit | 31–33 | ⬜ Pending | 🟢 Low |
| **12** | Final QA + Deploy | 34–36 | ⬜ Pending | 🟢 Low |

### Quality Rules (Enforced from Round 1 Footer Learnings)
- **Scroll effects:** opacity + blur ONLY — no scale, no Y, no letterSpacing transforms
- **Glow:** CSS gradients/text-shadow only — no hardcoded glow `<div>`s
- **Overflow:** never `overflow: hidden` on section parents
- **Colors:** gold metallic palette `#FFD700 / #DAA520 / #FFF8DC / #B8860B`, bg `#050505`
- **Cards:** 1px gradient border wrapper + `bg-black/80 backdrop-blur-xl` inner
- **Mobile:** `pb-28` bottom clearance, 44px+ touch targets, no hover-only interactions
- **Verify:** every round ends with `npm run check` → 0 errors

**Tell me which round to start. I'll execute all 3 phases in one shot.**
