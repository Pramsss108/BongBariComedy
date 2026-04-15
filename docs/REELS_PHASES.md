# Bong Bari Reels — Implementation Phases

All phases below are **COMPLETED** and live at `www.bongbari.com`.

---

## Phase 1: Hero Section — Foundation
- [x] Most viral reel auto-selected as hero (highest viewCount)
- [x] Ken Burns slow zoom+pan on blurred background
- [x] Portrait video centered inside landscape container (9:16 in 16:9)
- [x] Cinematic side gradients (28% opaque panels)
- [x] Bokeh ambient floating dots (4 dots, staggered animations)
- [x] Preload hero video via `<link rel="preload">`
- [x] "Tap to Watch" CTA appears after 2s delay
- [x] Play/pause toggle on click

## Phase 2: View Count System — Bulletproof 3-Layer
- [x] Scraper estimates all 0-view reels (likes × 18)
- [x] Component `displayViewCount` auto-estimates at render time
- [x] Hero: gold-accent view badge with Eye icon + pulse animation
- [x] Cards: animated count-up on scroll into view (IntersectionObserver)
- [x] 0/145 reels with 0 views — guaranteed coverage

## Phase 3: Profile Picture — Bulletproof Inline
- [x] Profile pic downloaded from Instagram CDN via scraper
- [x] Base64 inlined (~10KB) — zero path/CDN/deployment failures
- [x] 3-tier fallback: base64 → IG CDN avatar → gradient logo
- [x] IG Stories gradient ring (purple→red→orange) with spin on hover
- [x] Dark gap ring between ring and pic

## Phase 4: Card UX — Loading & Interaction
- [x] Shimmer overlay while video loads
- [x] Video fade-in reveal animation
- [x] Tap ripple effect on card click
- [x] Buffering spinner overlay
- [x] Glass play button (glassmorphism + shadow)

## Phase 5: Card Polish — Netflix-Grade CSS
- [x] GPU anti-aliasing (`-webkit-mask-image`, `backface-visibility: hidden`)
- [x] Hover: `translateY(-6px) scale(1.012)` + multi-layer box-shadow
- [x] Desktop-only blur entrance (deblur on load)
- [x] Hover headroom fix (`padding-top: 10px; margin-top: -10px`)
- [x] Playing state: IG pulse aura
- [x] Caption gradient fade mask
- [x] Sidebar icons: heartbeat, bounce, tilt, pop on hover
- [x] Light-leak glow on hover (merged into main hover rule)

## Phase 6: Hero — Netflix/Apple TV+ Premium
- [x] Cinematic entrance: scale(1.03) + blur(8px) → normal reveal
- [x] Ambient glow ring (conic-gradient halo behind hero)
- [x] Shimmer sweep (traveling light highlight on load)
- [x] Cinematic vignette (inset box-shadow dark edges)
- [x] Desktop hover: scale(1.015) + depth shadow + glow intensify
- [x] Animated gradient border (conic-gradient, 8s rotation)
- [x] Parallax scale-down on scroll (desktop: 1→0.92, tablet: 1→0.95)

## Phase 7: Scroll Performance
- [x] Background blobs: static on desktop (removed Framer Motion parallax)
- [x] `contain: strict` on blob container for compositor isolation
- [x] Cards: `contain: layout style` instead of `will-change: transform`
- [x] `content-visibility: auto` on all card containers
- [x] Mobile: backdrop-filter capped at 4px
- [x] `prefers-reduced-motion`: all animations disabled

## Phase 8: Data Pipeline
- [x] RapidAPI instagram120 scraper (`scripts/scrape-reels.cjs`)
- [x] 145 reels scraped with thumbnails, video URLs, metrics
- [x] Popular reels sorted by viewCount (top 4: 2.9M, 671.6K, 272.3K, 68.8K)
- [x] Latest reels by date (newest 4)
- [x] Static JSON at `client/public/data/reels-data.json`
- [x] API endpoints: `/api/instagram/latest`, `/api/instagram/popular`
- [x] Single-player mode: only one reel plays at a time (`reelBus`)
- [x] `React.memo` on InstagramReel component

---

*Last updated: Auto-generated from implemented code*
