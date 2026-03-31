# 🗺️ PHASE 3 ROADMAP — Unbreakable Social Downloader
> Red Engineering · BongBari Media Group · March 2026

---

## 🎯 THE BIG PICTURE (Vibe Coder Summary)

**What we already have:**
- ✅ Beautiful downloader UI (`SocialDownloaderPage.tsx`) with paste → fetch → preview → trim → download
- ✅ TrimSlider component with keyboard shortcuts, touch support, dual handles
- ✅ Download history (localStorage, no server needed)
- ✅ 7-layer server extraction cascade (Cobalt → CF Swarm → IPv6 → ytdl-core → Free Proxy → ASocks)
- ✅ Client-side extraction via Piped/Invidious mirrors (uses visitor's own IP = residential = unblockable)
- ✅ CORS Proxy Engine on Oracle VM port 8080 (zero-RAM streaming, API key secured)
- ✅ yt-dlp for trimming (server-side ffmpeg)

**What's broken or missing:**
- ❌ YouTube: Cobalt (Layer 1) works but only returns 720p, no quality picker
- ❌ Instagram: CF Swarm (Layer 2) works sometimes, but Meta login walls block ~40% of requests
- ❌ TikTok: **NOT supported at all** — not in `detectPlatform()`, not in `ALLOWED_HOSTS`
- ❌ Twitter/X: **NOT supported at all**
- ❌ Facebook: Works via CF Swarm but unreliable (login wall)
- ❌ No waterfall per platform — if one method fails, user just sees "error"
- ❌ Oracle CORS Proxy Engine (port 8080) not wired into the downloader yet

**What we're building (Phase 3):** Make EVERY platform work flawlessly with a waterfall of free → semi-free → paid methods. Each platform is standalone. If one method fails, the next one fires automatically. User never sees "error" — they always get their video.

**End goal:** Monetize with ads + premium tier (faster downloads, no ads, batch downloads).

---

## � CAPACITY & COST ANALYSIS — Our "Aukat"

### Infrastructure (All Free)
| Service | Plan | Monthly Cost | What It Does |
|---------|------|-------------|--------------|
| Oracle Cloud VM | Always Free (VM.Standard.E2.1.Micro) | **$0** | Main backend (port 5000) + CORS proxy (port 8080) |
| Hetzner VPS | ~€4.50/mo (CX11) | **~$5** | Self-hosted Cobalt extraction engine |
| GitHub Pages | Free | **$0** | Frontend hosting (www.bongbari.com) |
| Cloudflare Worker | Free tier (100K req/day) | **$0** | CF Swarm edge scraper |
| Neon Postgres | Free tier (1 project) | **$0** | User data, community features |
| **TOTAL** | | **~$5/month** | |

### Oracle VM Specs (The Bottleneck)
| Resource | Value |
|----------|-------|
| CPU | 1 OCPU (AMD EPYC, 2 threads) |
| RAM | 951 MB total |
| Base usage (2 PM2 processes) | ~148 MB (bongbari ~75MB + bongbari-proxy ~73MB) |
| Free RAM for operations | ~800 MB |
| Disk | 47 GB boot volume |
| Bandwidth | 480 Mbps (burstable) |

### Per-Request Resource Usage
| Action | RAM per request | CPU impact | Server load |
|--------|----------------|------------|-------------|
| **Metadata fetch** (info request) | ~10-20 MB | Low (HTTP call to Cobalt/Piped) | Light |
| **Client-side extraction** (Piped/Invidious) | **0 MB** | **Zero** | User's browser does everything |
| **Non-trim download** (302 redirect to CDN) | **0 MB** | **Zero** | Server sends redirect, CDN streams directly to user |
| **Trim/clip** (yt-dlp + ffmpeg spawn) | ~100-200 MB per concurrent job | **HIGH** (yt-dlp + ffmpeg = 2 child processes) | Heaviest operation |
| **Proxy stream** (CORS proxy pipe-through) | ~1-5 MB | Low (stream.pipeline, zero buffering) | Moderate |

### Concurrency Limits
| Operation | Max Concurrent | Why |
|-----------|---------------|-----|
| Info/metadata requests | ~50/min (rate limited to 30/IP) | Lightweight HTTP calls |
| CDN redirect downloads | **Unlimited** | Zero server load — CDN does all the work |
| Client-side extractions | **Unlimited** | Zero server load — user's browser does it |
| Trim/clip jobs | **3** (hard limit, ResourceGovernor) | 3 × 200MB = 600MB + 148MB base = ~750MB, leaving safety margin |
| CORS proxy streams | ~10 concurrent | ~5MB each, stream.pipeline zero-copy |

### Daily/Monthly User Capacity Estimates
| Scenario | Daily Users | Monthly Users | Notes |
|----------|-------------|---------------|-------|
| **Metadata fetches** | ~1,000-2,000/day | ~30K-60K/month | Each fetch is fast (~2-5s), low RAM |
| **Full downloads (no trim)** | **Unlimited** | **Unlimited** | 302 redirect to YouTube/Instagram CDN. Our server does NOTHING |
| **Client extractions (YouTube)** | **Unlimited** | **Unlimited** | Runs in user's browser. Zero server cost |
| **Trims/clips** | ~300-700/day | ~9K-21K/month | 3 concurrent × ~2min each × 12hrs active = ~1080 max/day. Realistic: ~50% utilization |
| **CORS proxy downloads** | ~500-1,000/day | ~15K-30K/month | Bandwidth is the limit, not RAM |

### Smart Architecture = Massive Savings
```
MOST REQUESTS (80%+):    Zero server load  →  CDN redirect or client extraction
MODERATE REQUESTS (15%):  Light load        →  Metadata fetch from Cobalt/Piped
RARE REQUESTS (5%):       Heavy load        →  Trim/clip with yt-dlp + ffmpeg
```

**Bottom line:** With smart architecture (CDN redirects + client-side extraction), our $5/month setup can handle **30,000+ users/month** for downloads. Only trim/clip operations are limited (~700/day max).

### Trim Optimization (Already Implemented!)
- `--download-sections *start-end` → yt-dlp downloads ONLY the trimmed portion, not the full video
- `--force-keyframes-at-cuts` → clean cuts without re-encoding artifacts
- Cobalt streams: ffmpeg `-ss`/`-to` → smart seeking on CDN URL
- **Result:** A 30-second trim of a 10-minute video downloads ~30s of data, not 10 minutes

### When We Outgrow This (Scaling Path)
| Trigger | Action | Cost |
|---------|--------|------|
| >700 trims/day regularly | Upgrade Oracle VM (A1.Flex, 4GB RAM) | Free (within Always Free) |
| >50K users/month | Add second Cobalt node or use public Cobalt instances | ~$5 more |
| >100K users/month | Move to Hetzner dedicated (CPX21, 4 vCPU, 8GB RAM) | ~$10/month |
| Premium tier revenue >$100/month | Upgrade everything, add CDN | Self-funded |

---

## �📊 ARCHITECTURE — The Waterfall Pattern

Every platform gets its own **waterfall** — a chain of extraction methods from cheapest to most expensive. The system tries each step. If step 1 fails, step 2 fires. User never knows which step worked.

```
USER PASTES LINK
       ↓
  detectPlatform()  →  "youtube" | "instagram" | "tiktok" | "twitter" | "facebook"
       ↓
  PLATFORM WATERFALL (each platform has its own)
       ↓
  ┌─────────────────────────────────────────────────┐
  │  Step 1: 🟢 FREE        (community mirrors)     │  ← try first
  │  Step 2: 🟢 FREE        (client-side extract)   │  ← user's own IP
  │  Step 3: 🟡 SEMI-FREE   (our Cobalt on Hetzner) │  ← our VPS, free but costs bandwidth
  │  Step 4: 🟡 SEMI-FREE   (Oracle CORS Proxy)     │  ← our VM, free tier
  │  Step 5: 🔴 PAID        (ASocks residential)    │  ← last resort, costs money
  └─────────────────────────────────────────────────┘
       ↓
  VIDEO INFO  →  preview card + quality picker + trim slider + download button
```

---

## 📊 PHASE OVERVIEW (15 Phrases → Monetization)

```
PHRASE 1-5:   🎬 Platform Waterfalls (YouTube + Instagram + TikTok + Twitter + Facebook)
PHRASE 6-10:  ⚡ Engine Wiring + Streaming (Connect proxy, quality picker, streaming)
PHRASE 11-15: 💰 Harden + Monetize (Anti-bot, speed, ads, premium tier, launch)
```

---

## 🎬 PLATFORM WATERFALLS — Phrases 1-5

Each phrase = one platform, fully standalone, fully tested.

---

### PHRASE 1: 🔴 YouTube Waterfall (Unblock Everything) ✅ DONE

**What exists today:**
| Layer | Method | Status | Cost |
|-------|--------|--------|------|
| L1 | Hetzner Cobalt (`78.47.104.43:9000`) | ✅ Working, 720p only | Free (our VPS) |
| L3 | yt-dlp IPv6 on Hetzner | ⚠️ Fragile | Free |
| L4 | ytdl-core + PO Token | ⚠️ Fragile, BotGuard blocks | Free |
| Client | Piped/Invidious mirrors from user browser | ✅ Working | Free |
| L7 | yt-dlp + free proxy pool | ⚠️ Depends on pool freshness | Free |
| L6 | yt-dlp + ASocks residential | ✅ Working | Paid |

**What to fix/enhance:**
1. Wire Oracle CORS Proxy (port 8080) as a new step: proxy Piped/Invidious API calls through Oracle so even if user's ISP blocks Piped, it still works
2. Add multi-quality extraction: Cobalt returns `vQuality: "max"` → parse all available qualities (360p, 720p, 1080p, 4K, audio-only)
3. Fix waterfall order so the fastest FREE method fires first, paid fires last
4. Client-side Piped extraction should be Step 1 (it uses visitor's own residential IP = hardest to block)

**New YouTube Waterfall (after enhancement):**
```
Step 1: 🟢 FREE     — Client Piped/Invidious (visitor's IP, zero server cost)
Step 2: 🟢 FREE     — Piped/Invidious via Oracle CORS Proxy (bypasses ISP blocks)
Step 3: 🟡 SEMI     — Hetzner Cobalt (our VPS, request vQuality=max for all qualities)
Step 4: 🟡 SEMI     — yt-dlp IPv6 on Hetzner (fallback)
Step 5: 🟡 SEMI     — ytdl-core + PO Token (fragile but free)
Step 6: 🟢 FREE     — yt-dlp + free proxy pool (if pool has proxies)
Step 7: 🔴 PAID     — yt-dlp + ASocks residential (last resort)
```

**Files to modify:**
- `server/routes/downloader.ts` — reorder `fetchSmartMetadata()` cascade, add Cobalt `vQuality: "max"`
- `client/src/lib/clientExtractor.ts` — add Oracle CORS Proxy as fallback path for Piped calls
- `client/src/pages/SocialDownloaderPage.tsx` — NO changes needed (it already calls `handleFetch` which cascades)

**Done when:** Paste ANY YouTube link → get title + thumbnail + multiple quality options (720p, 1080p, audio). Works even if Cobalt is down.

---

### PHRASE 2: 📸 Instagram Waterfall (Reels, Posts, Stories) ✅ DONE

**Implementation:** Added `executeInstagramEmbedScrape()` — scrapes `/p/SHORTCODE/embed/` with 5 regex patterns, detects login wall. Platform-aware cascade routes Instagram through Cobalt → embed scrape → CF Swarm → yt-dlp → proxy pool.

**What exists today:**
| Layer | Method | Status | Cost |
|-------|--------|--------|------|
| L1 | Hetzner Cobalt | ✅ Works for public reels | Free (our VPS) |
| L2 | CF Swarm (og:video scraper) | ⚠️ Login wall blocks ~40% | Free |
| L6 | yt-dlp + ASocks | ✅ Working | Paid |

**What to fix/enhance:**
1. Cobalt already supports Instagram natively — just need to make sure it's the primary engine
2. Add a **public embed fallback**: Instagram embeds (`instagram.com/p/XXX/embed/`) don't need login — scrape video URL from embed HTML via Oracle CORS Proxy
3. Add TikTok-style API extraction: some Instagram content is accessible via `?__a=1&__d=dis` JSON endpoint (no login needed for public posts)
4. Wire Oracle CORS Proxy for embed scraping (bypasses CORS from frontend)

**New Instagram Waterfall:**
```
Step 1: 🟢 FREE     — Hetzner Cobalt (handles reels, posts, stories natively)
Step 2: 🟢 FREE     — Instagram embed scrape via Oracle CORS Proxy (/p/XXX/embed/)
Step 3: 🟡 SEMI     — CF Swarm Edge (og:video regex, works when no login wall)
Step 4: 🟢 FREE     — yt-dlp + free proxy pool
Step 5: 🔴 PAID     — yt-dlp + ASocks residential
```

**Files to modify:**
- `server/routes/downloader.ts` — add embed scrape function, reorder Instagram cascade
- `SocialDownloaderPage.tsx` — already detects Instagram, no UI changes needed

**Done when:** Paste Instagram reel/post link → preview + download works. Login wall doesn't block us.

---

### PHRASE 3: 🎵 TikTok Waterfall ✅ DONE

**Implementation:** Added `executeTikTokFallback()` — uses oEmbed API for metadata + mobile UA page scrape for video URL (`__UNIVERSAL_DATA_FOR_REHYDRATION__` patterns). TikTok hosts added to `ALLOWED_HOSTS` and `detectPlatform()`. Cascade: Cobalt → TikTok fallback → yt-dlp → proxy pool.

**What existed before:** Nothing. TikTok was not in `detectPlatform()` or `ALLOWED_HOSTS`.

**What to build:**
1. Add `tiktok.com` and `vm.tiktok.com` to `detectPlatform()` in frontend
2. Add TikTok hosts to `ALLOWED_HOSTS` in server
3. Cobalt already supports TikTok natively (returns no-watermark URL) — just need to allow TikTok URLs through
4. Add a free TikTok embed scrape as backup (TikTok embeds expose video CDN URLs)

**TikTok Waterfall:**
```
Step 1: 🟢 FREE     — Hetzner Cobalt (native TikTok support, no watermark)
Step 2: 🟢 FREE     — TikTok embed/oembed scrape via Oracle CORS Proxy
Step 3: 🟢 FREE     — yt-dlp + free proxy pool
Step 4: 🔴 PAID     — yt-dlp + ASocks residential
```

**Files to modify:**
- `client/src/pages/SocialDownloaderPage.tsx` — add `tiktok` to `detectPlatform()`, add TikTok icon
- `server/routes/downloader.ts` — add TikTok to `ALLOWED_HOSTS`, ensure Cobalt cascade handles it

**Done when:** Paste TikTok link → video preview → download without watermark.

---

### PHRASE 4: 🐦 Twitter/X Waterfall ✅ DONE

**Implementation:** Added `executeTwitterFallback()` — tries fxtwitter API then vxtwitter API with `/username/status/id` format. Handles video/gif types and `mediaURLs` for vxtwitter format. Twitter/X hosts added to `ALLOWED_HOSTS` and `detectPlatform()`. Cascade: Cobalt → fxtwitter/vxtwitter → yt-dlp → proxy pool.

**What existed before:** Nothing. Twitter/X was not in `detectPlatform()` or `ALLOWED_HOSTS`.

**What to build:**
1. Add `twitter.com`, `x.com`, `t.co` to `detectPlatform()` and `ALLOWED_HOSTS`
2. Cobalt already supports Twitter natively — just need to allow the URLs through
3. Add Twitter syndication API as backup: `https://cdn.syndication.twimg.com/tweet-result?id=TWEET_ID` returns video URLs (public, no auth needed)
4. Add `vxtwitter.com` / `fxtwitter.com` API as ultra-free fallback (community APIs that extract Twitter videos)

**Twitter/X Waterfall:**
```
Step 1: 🟢 FREE     — Hetzner Cobalt (native Twitter support)
Step 2: 🟢 FREE     — fxtwitter.com API via Oracle CORS Proxy (community mirror)
Step 3: 🟢 FREE     — Twitter syndication CDN (public embed data)
Step 4: 🟢 FREE     — yt-dlp + free proxy pool
Step 5: 🔴 PAID     — yt-dlp + ASocks residential
```

**Files to modify:**
- `client/src/pages/SocialDownloaderPage.tsx` — add `twitter` to `detectPlatform()`, add X icon
- `server/routes/downloader.ts` — add Twitter/X to `ALLOWED_HOSTS`, add syndication fallback

**Done when:** Paste Twitter/X link with video → preview → download mp4.

---

### PHRASE 5: 📘 Facebook Waterfall ✅ DONE

**Implementation:** Added mobile URL rewrite (`www.facebook.com` → `m.facebook.com`) in `executePhase2_CFSwarm()` to bypass login walls. Cascade: Cobalt → CF Swarm (mobile rewrite) → yt-dlp → proxy pool.

**What exists today:**
| Layer | Method | Status | Cost |
|-------|--------|--------|------|
| L1 | Hetzner Cobalt | ✅ Works for public videos | Free |
| L2 | CF Swarm (og:video scraper) | ⚠️ Login wall blocks often | Free |

**What to fix/enhance:**
1. Cobalt handles Facebook natively — make it primary
2. Facebook mobile URLs (`m.facebook.com`) sometimes bypass login walls — add mobile URL rewrite
3. Add Facebook embed scrape via Oracle CORS Proxy as backup

**Facebook Waterfall:**
```
Step 1: 🟢 FREE     — Hetzner Cobalt (native Facebook support)
Step 2: 🟢 FREE     — Mobile URL rewrite + CF Swarm Edge
Step 3: 🟢 FREE     — Facebook embed scrape via Oracle CORS Proxy
Step 4: 🟢 FREE     — yt-dlp + free proxy pool
Step 5: 🔴 PAID     — yt-dlp + ASocks residential
```

**Files to modify:**
- `server/routes/downloader.ts` — add mobile rewrite, reorder Facebook cascade
- Frontend already detects Facebook, no UI changes needed

**Done when:** Paste Facebook video link → preview → download works for public videos.

---

## ⚡ ENGINE WIRING + STREAMING — Phrases 6-10

---

### PHRASE 6: Wire Oracle CORS Proxy Into Extraction Chain ✅ DONE

**Implementation:** Added `VITE_CORS_PROXY_URL` and `VITE_CORS_PROXY_KEY` env vars. `clientExtractor.ts` now tries direct Piped/Invidious first, then retries through Oracle CORS Proxy (`/proxy?url=...`) on failure. Added `tryPipedViaProxy()` and `tryInvidiousViaProxy()` functions.

---

### PHRASE 7: Multi-Quality Picker Enhancement ✅ DONE (in Phrase 1)

**Implementation:** Already done as part of Phrase 1 — Cobalt `vQuality: "max"` + audio-only fetch + 7 format output (4K/1080/720/480/360/MP3/M4A).

**What to do:**
- Cobalt API: Change `vQuality: "1080"` to `vQuality: "max"` — returns best available
- For each video, also request `isAudioOnly: true` to get audio-only stream URL
- Parse Piped/Invidious `audioStreams[]` and `videoStreams[]` into quality options
- Frontend already has `formats[]` in `VideoInfo` — populate with all available qualities
- Quality pills: 360p, 720p, 1080p, 4K, Audio (MP3), Audio (M4A)

**Done when:** YouTube video shows multiple quality buttons. Each downloads the correct quality.

---

### PHRASE 8: Streaming Download via CORS Proxy

**What:** When user clicks "Download 1080p", stream the video through Oracle CORS Proxy instead of server.

**Why:** Currently downloads go through our Express server (port 5000) which is slow and RAM-heavy. The CORS Proxy (port 8080) uses zero-RAM `stream.pipeline()`.

**What to do:**
- For `_clientStreams` downloads: if CDN URL is cross-origin, route through Oracle CORS Proxy
- Frontend: `fetch(PROXY_URL + '/proxy?url=' + encodeURIComponent(videoStreamUrl), { headers: { 'x-api-key': KEY } })`
- Use `showSaveFilePicker()` (Chrome) or blob fallback (Firefox) — exactly like BongShare
- Add Content-Length forwarding for progress bar
- Keep server `/api/downloader/stream` as fallback for trimming (needs yt-dlp + ffmpeg on server)

**Done when:** Full video downloads stream through the CORS Proxy. Progress bar works. Zero RAM on server.

---

### PHRASE 9: Trim Integration With New Engine

**What:** Make sure trimming still works perfectly with the new extraction chain.

**Why:** Trimming needs yt-dlp + ffmpeg on the server (can't trim in-browser for large files). This path must stay on port 5000 Express server.

**What to verify/fix:**
- Trim flow: user sets start/end → calls `/api/downloader/stream?url=...&start=X&end=Y`
- Server uses yt-dlp `--download-sections` to extract the clip
- `performSecureDownload()` streams trimmed result with progress bar
- Make sure new platforms (TikTok, Twitter) can also be trimmed (they can — yt-dlp supports them)

**Done when:** Paste YouTube → trim from 0:30 to 1:00 → download only that 30s clip. Same for TikTok/Twitter.

---

### PHRASE 10: Error Recovery + User Feedback ✅ DONE

**Implementation:** Added retry button (RefreshCcw icon) to error card. Enhanced engine badge with Zap icon and gradient styling. Added platform-specific error codes: `PLATFORM_BLOCK` (TikTok), `LOGIN_WALL` (Instagram), and improved Twitter error messages. Error card now color-codes by error type (yellow=rate limit, orange=platform block, purple=login wall, red=generic).

---

## 💰 HARDEN + MONETIZE — Phrases 11-15

---

### PHRASE 11: Mirror Health Monitor + Auto-Failover

**What:** Background pinger that checks all Cobalt/Piped/Invidious mirrors every 5 minutes. Dead mirrors get skipped automatically.

**Mirrors to monitor:**
- Cobalt: `78.47.104.43:9000` (our Hetzner), public Cobalt instances
- Piped: `pipedapi.kavin.rocks`, `pipedapi.adminforge.de`, etc.
- Invidious: `inv.nadeko.net`, `invidious.fdn.fr`, etc.
- fxtwitter: `api.fxtwitter.com`

**Done when:** Kill Hetzner Cobalt manually → extraction auto-fails-over to next mirror. Zero user impact.

---

### PHRASE 12: Anti-Bot Hardening

**What:** Make all proxy requests look exactly like a real Chrome browser.

**What to add to Oracle CORS Proxy (server.mjs):**
- User-Agent rotation (already done in Phase 2 ✅)
- Add `Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest` headers
- Add `Accept-Language: en-US,en;q=0.9` 
- Referrer spoofing per platform (e.g., `Referer: https://www.youtube.com/` for YouTube CDN)
- Strip all proxy-revealing headers (X-Forwarded-For, Via)

**Done when:** Proxy requests pass anti-bot detection at `bot.sannysoft.com`.

---

### PHRASE 13: Speed Optimization + Caching

**What:** Make everything faster.

**What to do:**
- Server-side metadata cache (already exists — 1hr TTL): ensure all platforms use it
- Client-side cache: `localStorage` with 10min TTL for recently fetched URLs
- Preconnect hints: `<link rel="preconnect" href="PROXY_URL">` in HTML
- Lazy-load TrimSlider (only load when user clicks Trim, not on page load)
- Parallel mirror pinging: try top 3 mirrors simultaneously, use fastest response

**Done when:** Second fetch of same URL is instant (cache hit). Mirror selection is parallel.

---

### PHRASE 14: Ad Integration + Premium Tier (Monetization)

**What:** Start making money from the downloader.

**Free tier (everyone):**
- All platforms work
- 720p max quality
- 5-second countdown timer before download starts (show ad during countdown)
- Max 10 downloads per hour (rate limit)
- Small banner ad on page

**Premium tier ($2.99/month or one-time $9.99):**
- All qualities up to 4K
- No ads, no countdown timer
- Unlimited downloads
- Batch download (paste multiple URLs)
- Priority extraction (paid proxies fire first = faster)

**Implementation:**
- Google AdSense or banner ads on free tier
- Premium gate: check `user.isPremium` before allowing 1080p+ or removing countdown
- Payment: Stripe Checkout or LemonSqueezy (one-time or subscription)
- Store premium status in Neon Postgres user table

**Done when:** Free users see ads + countdown. Premium users get instant full-quality downloads.

---

### PHRASE 15: Production Launch + Polish

**Checklist:**
- [ ] All 5 platforms work (YouTube, Instagram, TikTok, Twitter, Facebook)
- [ ] Waterfall cascade auto-recovers from any single method failing
- [ ] Trimming works for all platforms
- [ ] Quality picker shows real options per video
- [ ] Downloads stream via CORS Proxy (zero RAM on server)
- [ ] Mirror health monitor running
- [ ] Anti-bot headers on all proxy requests
- [ ] Mobile responsive (paste → download works on phone)
- [ ] Ad integration live (free tier)
- [ ] Premium tier payment working
- [ ] Download history shows recent 20 items
- [ ] Error messages are human-readable
- [ ] `npm run deploy:safe` → full deploy
- [ ] Test from 3 different devices + browsers

**Done when:** Go to `www.bongbari.com/download` → paste ANY social media link → video downloads. Every time. Every platform. Unbreakable. 💰

---

## 📊 WHAT WE ALREADY HAVE vs WHAT WE BUILD

| Component | Status | Action |
|-----------|--------|--------|
| `SocialDownloaderPage.tsx` | ✅ Beautiful UI, working | **ENHANCE ONLY** — add TikTok/Twitter detection |
| `SocialDownloaderPage.css` | ✅ Styled | No changes |
| `TrimSlider.tsx` | ✅ Working perfectly | No changes |
| `DownloadHistory.tsx` | ✅ Working | No changes |
| `clientExtractor.ts` | ✅ Piped/Invidious for YouTube | **ENHANCE** — add Oracle Proxy fallback |
| `server/routes/downloader.ts` | ✅ 7-layer cascade | **ENHANCE** — add TikTok/Twitter hosts, reorder waterfall |
| `server/routes/extractor.ts` | ✅ Mirror list + reporting | **ENHANCE** — add more mirrors |
| `server/proxy-engine/server.mjs` | ✅ Running on Oracle VM:8080 | **WIRE** — connect to frontend |
| `server/proxyService.ts` | ✅ ProxyKitchen + Upstash | No changes |
| `server/stealthEngine.ts` | ✅ UA rotation | **ENHANCE** — add Sec-Fetch headers |
| TikTok support | ❌ Missing | **NEW** — add to frontend + backend |
| Twitter/X support | ❌ Missing | **NEW** — add to frontend + backend |
| Monetization | ❌ Missing | **NEW** — ads + premium tier |

---

## ⚠️ RULES FOR AGENTS (Anti-Hallucination)

1. **NEVER create a new downloader page** — enhance `SocialDownloaderPage.tsx` ONLY
2. **NEVER delete existing working extraction layers** — only ADD new steps to the waterfall
3. **NEVER write placeholder code** — every function must be complete and tested
4. **NEVER claim a method "works" without testing it** — run the actual code
5. **NEVER blame platform patching** without running an isolated test script FIRST
6. **Test ONE phrase at a time** — verify → then move to next
7. **If extraction fails → try next step in waterfall** — don't declare it "dead"
8. **BongShare / File Transfer is SEPARATE** — do NOT touch it (being built by Antigravity bot)
9. **Free tier only for infrastructure** — no paid APIs unless last-resort fallback
10. **Each phrase must compile with zero TypeScript errors** before moving on
11. **NEVER change the trimming flow** — it works, leave it alone
12. **Each platform is STANDALONE** — breaking TikTok must not break YouTube

---

## 🔄 HOW TO USE THIS ROADMAP

**For the vibe coder (you):**
- Work 5 phrases at a time
- After Phrase 5: test all 5 platforms yourself, then say "next 5"
- After Phrase 10: test full download + trim flow, then say "next 5"
- After Phrase 15: test on live site, start making money!

**For the AI agent:**
- Work on exactly 1 phrase at a time
- Show the code changes
- Run `npm run check` after each phrase
- Test the SPECIFIC platform for that phrase
- Ask: "Ready to test? Or next phrase?"

---

*Last updated: March 31, 2026*
*Focus: Downloader ONLY — BongShare/File Transfer handled by Antigravity bot separately*
