# 🔴 BONG BARI DOWNLOADER — MASTER PLAN
### The Unbreakable, Phase-Wise, Platform-by-Platform Architecture
> Classification: Red Team Engineering | BongBari Media Group  
> Version: 3.0 | March 2026

---

## ⚡ THE PHILOSOPHY

Every downloader on the internet eventually dies. Ours won't. Why?

Because we never fight the platform — **we become the user.**

The entire architecture follows ONE rule:

> **Free → Cheaper → Cheapest VPS → Paid proxy = LAST RESORT**
>
> If a user's own browser (residential IP) can do it — the server never touches it.

---

## 🏗️ THE UNIVERSAL WATERFALL (All Platforms)

Every download request follows this waterfall. Each layer is tried in order. The first success wins. No layer is skipped.

```
USER PASTES URL
       │
       ▼
┌──────────────────────────────────────────────────┐
│ LAYER 0: CLIENT-SIDE EXTRACTION (Browser)        │
│ ✦ Cost: $0 forever                               │
│ ✦ IP: User's residential (unblockable)           │
│ ✦ CORS: Defeated via readable endpoints          │
│ ✦ Works: YouTube HTML, IG oEmbed, FB oEmbed,     │
│          TikTok oEmbed, Twitter/X oEmbed          │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 1: HETZNER COBALT (Self-hosted VPS)        │
│ ✦ Cost: €4.5/mo (already running)                │
│ ✦ IP: 78.47.104.43 (clean Hetzner residential)   │
│ ✦ Handles: YouTube, Instagram, Facebook, TikTok  │
│ ✦ Engine: Cobalt API v10+ with PO-Token solver    │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 2: CLOUDFLARE EDGE SWARM                   │
│ ✦ Cost: $0 (100k req/day free tier)              │
│ ✦ IP: Cloudflare edge (300+ cities, clean ASN)   │
│ ✦ Best for: Instagram, Facebook HTML parsing      │
│ ✦ Worker: ancient-king-7fa9.workers.dev           │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 3: FREE PROXY POOL (Auto-Mined OSINT)     │
│ ✦ Cost: $0 (scraped from public proxy lists)     │
│ ✦ IP: 100k+ rotating residential/datacenter IPs  │
│ ✦ Engine: yt-dlp + proxy rotation                 │
│ ✦ Success: ~60-70% per proxy, but pool = reliable │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 4: HETZNER IPv6 ROTATION                   │
│ ✦ Cost: $0 (free /64 subnet = 18 quintillion IPs)│
│ ✦ Each request = brand new IPv6 address           │
│ ✦ Engine: yt-dlp --force-ipv6 + ndppd rotation   │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 5: YTDL-CORE + BOTGUARD BYPASS            │
│ ✦ Cost: $0                                       │
│ ✦ Native Node.js YouTube extraction              │
│ ✦ PO-Token via poTokenService.ts                  │
│ ✦ YouTube ONLY (no IG/FB/TikTok support)          │
└───────────┬──────────────────────────────────────┘
            │ FAIL?
            ▼
┌──────────────────────────────────────────────────┐
│ LAYER 6: ASocks PAID PROXY (LAST RESORT)         │
│ ✦ Cost: Per-GB ($$$)                             │
│ ✦ IP: Real residential from global pool           │
│ ✦ Session rotation via crypto.randomBytes         │
│ ✦ 99.9% success rate — but costs money            │
└──────────────────────────────────────────────────┘
```

---

## 🧠 LAYER 0 DEEP DIVE: CLIENT-SIDE EXTRACTION (THE GAME CHANGER)

This is the ULTIMATE layer. Zero cost. Zero blocks. Forever.

### Why Client-Side Is Unbreakable

```
Traditional downloader:
  User → Server (datacenter IP) → Platform API → blocked

Our approach:
  User → User's own browser (residential IP) → Platform → works forever

Platforms CANNOT block residential IPs because:
  1. They'd block their own users
  2. Residential ASNs (Jio, Airtel, Comcast) = real customers
  3. No bot signature — it IS a real browser
  4. No rate limit per IP — normal browsing behavior
```

### How We Defeat CORS (The Engineering)

CORS is the browser's OWN security — not the platform's. The browser:
1. Sends a preflight `OPTIONS` request
2. Checks if the `Access-Control-Allow-Origin` header allows our domain
3. If not → browser THROWS AWAY the response before JS can read it

**But here's the key insight: CORS only blocks PRIVATE APIs. Public endpoints that ALLOW cross-origin are ALWAYS readable.**

```
CORS BYPASS MATRIX:
┌─────────────────────┬────────────────────┬───────────┬─────────────┐
│ Endpoint            │ CORS Headers?      │ Readable? │ Use For     │
├─────────────────────┼────────────────────┼───────────┼─────────────┤
│ YouTube watch page  │ YES (public HTML)  │ ✅ YES    │ Metadata    │
│ YouTube innertube   │ NO (private API)   │ ❌ NO     │ —           │
│ YouTube oEmbed      │ YES (public JSON)  │ ✅ YES    │ Title/thumb │
│ IG oEmbed (graph)   │ YES (public JSON)  │ ✅ YES    │ Metadata    │
│ IG private API      │ NO (requires auth) │ ❌ NO     │ —           │
│ FB oEmbed           │ YES (public JSON)  │ ✅ YES    │ Metadata    │
│ FB GraphQL          │ NO (auth required) │ ❌ NO     │ —           │
│ Twitter oEmbed      │ YES (publish.tw)   │ ✅ YES    │ Metadata    │
│ TikTok oEmbed       │ YES (public JSON)  │ ✅ YES    │ Metadata    │
│ GoFile upload       │ YES (public API)   │ ✅ YES    │ File upload │
│ GoFile servers      │ YES (public API)   │ ✅ YES    │ Server list │
└─────────────────────┴────────────────────┴───────────┴─────────────┘
```

### CORS Defeat Techniques

```
TECHNIQUE 1: Use endpoints that ALLOW CORS (oEmbed, public HTML)
  → No hack needed. The platform WANTS these to be embeddable.
  → YouTube oEmbed: GET https://www.youtube.com/oembed?url=VIDEO_URL&format=json
  → IG oEmbed: GET https://graph.facebook.com/v18.0/instagram_oembed?url=VIDEO_URL
  → Twitter: GET https://publish.twitter.com/oembed?url=TWEET_URL
  → TikTok: GET https://www.tiktok.com/oembed?url=VIDEO_URL

TECHNIQUE 2: Read public HTML and parse embedded JSON
  → YouTube embeds `ytInitialPlayerResponse` in watch page HTML
  → Facebook embeds `playable_url` in page HTML
  → These are PUBLIC pages — browser can fetch and parse them

TECHNIQUE 3: CORS proxy for non-CORS endpoints (free)
  → corsproxy.io, allorigins.win, api.codetabs.com
  → Browser → CORS proxy → Platform → data back to browser
  → The proxy adds Access-Control-Allow-Origin: * to the response
  → Cost: $0, but rate limited. Use as Layer 0.5 fallback.

TECHNIQUE 4: Cloudflare Worker as custom CORS proxy
  → Our own CF Worker adds CORS headers to ANY response
  → 100k free requests/day
  → We control the proxy — no third-party dependency
```

---

## 📺 PLATFORM #1: YOUTUBE — Complete Extraction Plan

### What YouTube Checks
```
1. ASN (IP reputation) — datacenter IPs = instant block
2. PO-Token (Proof of Origin) — required for stream URLs since 2023
3. SABR/BotGuard — JS challenge that proves browser is real
4. innertube API — private, requires client context (ANDROID/iOS/WEB)
5. User-Agent fingerprint — scraper UAs = 403
```

### Phase-by-Phase Waterfall

```
PHASE 0: CLIENT-SIDE METADATA EXTRACTION (Browser)
─────────────────────────────────────────────────
  Endpoint: https://www.youtube.com/oembed?url={VIDEO_URL}&format=json
  Returns: title, author_name, thumbnail_url, html (embed iframe)
  CORS: ✅ Allowed (YouTube oEmbed is public)
  Cost: $0
  Speed: Instant (~100ms)
  Limitation: No download URLs — metadata only
  Use: Pre-populate title + thumbnail while server fetches streams

  BONUS: YouTube watch page HTML contains `ytInitialPlayerResponse`
  This JSON blob has actual stream URLs (adaptive_fmts, url_encoded_fmt)
  → Can be parsed client-side if we fetch the HTML via CORS proxy
  → This is how browser extensions (Video DownloadHelper) work

PHASE 1: HETZNER COBALT (Self-hosted, $0/request)
─────────────────────────────────────────────────
  URL: http://78.47.104.43:9000
  Method: POST with { url, aFormat: "best", vQuality: "1080" }
  Returns: { status: "stream", url: "CDN_DOWNLOAD_URL" }
  Speed: 1-3 seconds
  Success: ~90% for YouTube (Cobalt has built-in PO-Token solver)
  Cost: Already running (€4.5/mo VPS)

PHASE 2: CF EDGE SWARM (Worker proxy, $0)
─────────────────────────────────────────
  URL: https://ancient-king-7fa9.workers.dev/?url={VIDEO_URL}
  Method: GET → scrapes HTML → extracts video URL
  Speed: 2-5 seconds
  Success: ~70% for YouTube (some BotGuard challenges block)

PHASE 3: HETZNER IPv6 ROTATION ($0)
───────────────────────────────────
  Method: yt-dlp --force-ipv6 on VPS
  Each request = new IPv6 from /64 block
  Speed: 3-8 seconds
  Success: ~85% (fresh IPs never rate-limited)

PHASE 4: YTDL-CORE + PO-TOKEN ($0)
──────────────────────────────────
  Method: Native Node.js extraction with BotGuard token
  File: server/routes/poTokenService.ts generates fresh PO tokens
  Speed: 3-5 seconds
  Success: ~80% (PO tokens expire in ~6 hours)

PHASE 5: FREE PROXY POOL ($0)
────────────────────────────
  Method: yt-dlp + auto-mined proxy from ProxyKitchen pool
  Pool: 100k+ residential proxies scraped from public lists
  Speed: 5-15 seconds (proxy latency varies)
  Success: ~60% per proxy, but pool size = eventual success

PHASE 6: ASocks PAID PROXY ($$$, LAST RESORT)
─────────────────────────────────────────────
  Method: yt-dlp + ASocks residential proxy with session rotation
  Config: hold-session-session-{randomHex}
  Speed: 3-8 seconds
  Success: 99.9%
  Cost: Per-GB billing
```

### YouTube Audio/MP3 Flow
```
For audio-only downloads (MP3/M4A):
  1. Get video stream URL via any phase above
  2. Server-side FFmpeg converts: stream → MP3/M4A
  3. Pipe directly to user (zero disk, zero buffer)
  4. FFmpeg path: node_modules/ffmpeg-static
```

---

## 📸 PLATFORM #2: INSTAGRAM — Complete Extraction Plan

### What Instagram Checks
```
1. Session Cookie (ds_user_id + sessionid) — required for private content
2. X-IG-App-ID header — must match valid Instagram app ID
3. CSRF Token — required for mutating requests
4. Rate Limiting — 200 req/hour per IP for embed, 20/hour for datacenter
5. Login Wall — forces login redirect for unauthenticated scraping
```

### Phase-by-Phase Waterfall

```
PHASE 0: CLIENT-SIDE oEMBED (Browser, $0, UNBREAKABLE)
──────────────────────────────────────────────────────
  Endpoint: https://graph.facebook.com/v18.0/instagram_oembed
  Params: ?url={REEL_URL}&access_token={FB_APP_TOKEN}&omitscript=true
  CORS: ✅ ALLOWED (Facebook Graph API enables CORS)
  Returns: { title, author_name, thumbnail_url, html }
  
  From the oEmbed HTML response, extract:
    - Thumbnail URL (high-res)
    - Author name
    - Post description
    
  Limitation: Returns metadata only, NOT the direct video download URL
  But: The thumbnail_url IS a CDN URL that can reveal the media server pattern
  
  ADVANCED: Parse the oEmbed HTML → find embedded video src → direct CDN link
  Some Instagram embeds include the video URL directly in the HTML blob
  
  Why it's unbreakable:
    → Runs from user's residential IP (browser)
    → Facebook/Meta WANTS oEmbed to work (it's how embeds appear on websites)
    → Cannot be blocked without breaking all Instagram embeds on the internet
  
  Requirements:
    → Facebook Developer Account (free, takes 5 minutes)
    → App Token from developers.facebook.com
    → VITE_FB_APP_TOKEN env variable

PHASE 0.5: CLIENT-SIDE CORS PROXY EXTRACTION
─────────────────────────────────────────────
  For when oEmbed doesn't return the video URL directly:
  
  Method: Fetch Instagram page HTML via CORS proxy
    Browser → corsproxy.io → instagram.com/reel/XXX → HTML back
    Parse HTML for: og:video meta tag, video_url in embedded JSON
  
  CORS Proxies (free, rotate on rate limit):
    1. https://corsproxy.io/?url={encoded_url}
    2. https://api.allorigins.win/raw?url={encoded_url}
    3. https://api.codetabs.com/v1/proxy?quest={url}
  
  Our own CF Worker as backup CORS proxy:
    https://ancient-king-7fa9.workers.dev/?url={encoded_url}
  
  Success: ~85% for public content
  Cost: $0

PHASE 1: HETZNER COBALT ($0/request)
────────────────────────────────────
  Method: POST to http://78.47.104.43:9000
  Body: { url: "https://www.instagram.com/reel/XXX" }
  Cobalt handles Instagram natively (uses its own session/cookies)
  Returns: { status: "stream", url: "CDN_VIDEO_URL" }
  Speed: 1-3 seconds
  Success: ~85% for public Reels/Posts

PHASE 2: CF EDGE SWARM ($0)
──────────────────────────
  Worker URL: https://ancient-king-7fa9.workers.dev/?url={IG_URL}
  Method: Fetch IG page with mobile Safari User-Agent from CF edge
  Parse: og:video, video_url from HTML
  Speed: 2-4 seconds
  Success: ~70% (Meta login walls on some CF datacenter IPs)
  Headers spoofed:
    User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_1)
    Accept: text/html
    Sec-Fetch-Mode: navigate

PHASE 3: FREE PROXY POOL ($0)
────────────────────────────
  Method: yt-dlp + auto-mined proxy for Instagram
  File: server/proxyService.ts → ProxyKitchen.getBestProxyForDownload('ig')
  yt-dlp args: --proxy {free_proxy} --user-agent "iPhone Safari"
  Speed: 5-15 seconds
  Success: ~60% per proxy

PHASE 4: ASocks PAID ($$$, LAST RESORT)
──────────────────────────────────────
  Method: yt-dlp + ASocks with rotating session
  Config: hold-session-session-{cryptoRandom}
  Speed: 3-5 seconds
  Success: 99%
  Cost: Per-GB
```

### Instagram Stories & Private Content
```
NOT SUPPORTED in free layers (requires real Instagram session cookie)
Future option:
  → Instagram Basic Display API (OAuth) — user logs in, downloads THEIR content
  → Legal, ToS-compliant, uses user's own access_token
  → Endpoint: GET /me/media?fields=media_url,media_type
```

---

## 📘 PLATFORM #3: FACEBOOK — Complete Extraction Plan

### What Facebook Checks
```
1. Login wall for many videos (forces redirect to facebook.com/login)
2. fb_dtsg CSRF token required for GraphQL API
3. Rate limiting per IP/session
4. video_url embedded in page HTML (but behind login for some content)
```

### Phase-by-Phase Waterfall

```
PHASE 0: CLIENT-SIDE oEMBED (Browser, $0, UNBREAKABLE)
──────────────────────────────────────────────────────
  Endpoint: https://graph.facebook.com/v18.0/oembed_video
  Params: ?url={FB_VIDEO_URL}&access_token={FB_APP_TOKEN}
  CORS: ✅ ALLOWED
  Returns: { title, author_name, html, thumbnail_url }
  
  From HTML blob, extract embedded video URL if present
  Works for: Public Facebook videos and Reels
  Doesn't work: Private/friends-only, some Live videos
  
  ADVANCED PARSE:
    1. Get the oEmbed HTML
    2. Find <video src="..."> or data-video-url="..."
    3. Direct CDN link to video file
  
  Cost: $0
  Speed: Instant

PHASE 0.5: CLIENT-SIDE HTML PARSE via CORS PROXY
────────────────────────────────────────────────
  Method: Fetch fb.watch/{id} or facebook.com/watch page via CORS proxy
  Parse: "playable_url" or "playable_url_quality_hd" from embedded JSON
  Facebook embeds video URLs in <script type="application/json"> tags
  
  Also check: window.__data__ JSON blob
  Contains: { video: { playable_url: "...", playable_url_quality_hd: "..." } }
  
  CORS Proxies: Same rotation as Instagram (corsproxy.io, allorigins, CF Worker)
  Success: ~75% for public videos

PHASE 1: HETZNER COBALT ($0/request)
────────────────────────────────────
  Method: POST to http://78.47.104.43:9000
  Body: { url: "https://www.facebook.com/watch/?v=XXX" }
  Also handles: fb.watch short URLs
  Speed: 1-3 seconds
  Success: ~80%

PHASE 2: CF EDGE SWARM ($0)
──────────────────────────
  Worker: ancient-king-7fa9.workers.dev
  Method: Fetch FB page HTML → parse playable_url
  Speed: 2-5 seconds
  Success: ~65% (Facebook aggressive login walls)

PHASE 3: FREE PROXY POOL ($0)
────────────────────────────
  Method: yt-dlp + mined proxy for Facebook
  Platform tag: 'fb' in ProxyKitchen
  Speed: 5-12 seconds
  Success: ~55%

PHASE 4: ASocks PAID ($$$)
─────────────────────────
  Method: yt-dlp + ASocks residential proxy
  Speed: 3-6 seconds
  Success: 99%
```

---

## 🐦 PLATFORM #4: TWITTER / X — Complete Extraction Plan

### What Twitter/X Checks
```
1. Login wall (recent: X forces login for many tweets)
2. GraphQL API requires Bearer token (guest token works for public)
3. t.co URL shortener adds redirect layer
4. Rate limit: ~50 requests/15 min for guest sessions
```

### Phase-by-Phase Waterfall

```
PHASE 0: CLIENT-SIDE oEMBED (Browser, $0)
─────────────────────────────────────────
  Endpoint: https://publish.twitter.com/oembed
  Params: ?url={TWEET_URL}&omit_script=true
  CORS: ✅ ALLOWED (Twitter's oembed API has CORS headers)
  Returns: { html, author_name, author_url, provider_name }
  
  From HTML: extract t.co video link, thumbnail, text
  Limitation: oEmbed returns embed HTML, not direct video URL
  But: Parse the HTML for video poster/source URLs

PHASE 0.5: fxtwitter.com API (Free, no auth)
────────────────────────────────────────────
  Endpoint: https://api.fxtwitter.com/{username}/status/{tweetId}
  CORS: ✅ ALLOWED (fxtwitter explicitly enables CORS)
  Returns: {
    tweet: {
      text, author: { name, screen_name },
      media: {
        videos: [{ url: "DIRECT_VIDEO_URL", thumbnail: "..." }]
      }
    }
  }
  
  This is the BEST source for Twitter video downloads:
    → Free API, unlimited requests
    → Returns DIRECT video CDN URLs
    → No auth required
    → CORS enabled = works from browser
  
  CLIENT-SIDE EXTRACTION:
    1. User pastes: https://x.com/user/status/123456789
    2. Browser extracts tweet ID: 123456789
    3. Browser fetches: https://api.fxtwitter.com/user/status/123456789
    4. Parse response → get video URL → trigger download
    → ZERO server involvement
    → NEVER gets blocked (fxtwitter is an independent service)
  
  Speed: Instant (~200ms)
  Success: ~95% for public tweets with video
  Cost: $0 forever

PHASE 1: HETZNER COBALT ($0/request)
────────────────────────────────────
  Method: POST to Cobalt
  Cobalt supports Twitter/X natively
  Speed: 1-3 seconds
  Success: ~85%

PHASE 2: CF EDGE SWARM ($0)
──────────────────────────
  Worker fetches tweet page HTML
  Parse: og:video, twitter:player:stream from meta tags
  Success: ~60% (X aggressive login walls)

PHASE 3: FREE PROXY + yt-dlp ($0)
─────────────────────────────────
  Platform tag: 'tw'
  Speed: 5-10 seconds
  Success: ~65%

PHASE 4: ASocks PAID ($$$)
─────────────────────────
  yt-dlp + residential proxy
  Success: 99%
```

---

## 🎵 PLATFORM #5: TikTok — Complete Extraction Plan

### Phase-by-Phase Waterfall

```
PHASE 0: CLIENT-SIDE oEMBED (Browser, $0)
─────────────────────────────────────────
  Endpoint: https://www.tiktok.com/oembed?url={TIKTOK_URL}
  CORS: ✅ ALLOWED
  Returns: { title, author_name, thumbnail_url, html }
  Limitation: No direct video URL in oEmbed response
  But: thumbnail_url reveals CDN pattern

PHASE 0.5: tikwm.com API (Free, CORS)
─────────────────────────────────────
  Endpoint: https://tikwm.com/api/?url={TIKTOK_URL}
  Returns: { data: { play: "NO_WATERMARK_URL", wmplay: "WITH_WATERMARK_URL" } }
  CORS: Depends on tikwm — if blocked, route through CF Worker
  Speed: 1-2 seconds
  Success: ~90%
  Cost: $0
  Note: tikwm is third-party; if it dies, fall through

PHASE 1: HETZNER COBALT ($0)
────────────────────────────
  Cobalt handles TikTok well (no-watermark, HD audio)
  Speed: 1-3 seconds
  Success: ~90%

PHASE 2-4: Same stack as other platforms
```

---

## 🛡️ CLIENT-SIDE IP: WHY IT DEFEATS EVERYTHING

### The Unbreakable Truth

```
EVERY platform on earth trusts residential IPs because:

1. They CANNOT distinguish your download request from normal browsing
   → Same IP, same browser, same cookies, same JS fingerprint
   → You ARE a normal user

2. Blocking residential IPs = blocking customers = lost revenue
   → Instagram won't block Jio/Airtel IPs — that's 500M Indians
   → YouTube won't block Comcast IPs — that's 100M Americans

3. No rate limit applies per-user for normal browsing
   → You visit 50 YouTube pages/hour? Normal.
   → You fetch 50 oEmbed URLs/hour? Same traffic pattern.

4. Bot detection ML models are trained on datacenter traffic
   → Your browser has: real cookies, real screen size, real mouse movement
   → ML model says: this is a real human → allow

5. PO-Tokens, CSRF tokens, session cookies — ALL present in the browser
   → The user IS the authentication
   → No need to steal/forge tokens
```

### What Client-Side CAN Do (Today)

```
✅ Fetch YouTube oEmbed metadata (title, thumbnail)
✅ Fetch YouTube watch page HTML → parse ytInitialPlayerResponse
✅ Fetch Instagram oEmbed (metadata + sometimes video URL)
✅ Fetch Facebook oEmbed (metadata + video URL from HTML)
✅ Fetch Twitter/X video URL via fxtwitter.com API (CORS enabled)
✅ Fetch TikTok oEmbed metadata
✅ Upload files to GoFile (CORS enabled, residential IP)
✅ Download files from GoFile CDN (CORS enabled)
✅ Trigger file download via blob URL / File System Access API
```

### What Client-Side CANNOT Do (CORS Blocks)

```
❌ YouTube innertube API → no CORS headers → browser blocks response
❌ Instagram private API → no CORS, requires session cookie
❌ Facebook GraphQL → no CORS, requires fb_dtsg + session
❌ TikTok internal API → signed headers (X-Gorgon HMAC)
❌ Server-side FFmpeg conversion (MP3 extraction)
```

### The Hybrid Architecture (Best of Both)

```
CLIENT does: Metadata fetch + trigger download + progress UI
SERVER does: Stream URL resolution + FFmpeg conversion + proxy fallback

Flow for YouTube:
  1. Browser fetches oEmbed → instant metadata (title, thumb)
  2. Browser sends URL to server → /api/downloader/info
  3. Server runs Cobalt/yt-dlp waterfall → gets stream URL
  4. Server pipes stream → browser downloads via fetch() + blob
  
Flow for Twitter (100% CLIENT-SIDE):
  1. Browser fetches fxtwitter API → gets direct video URL
  2. Browser fetches video directly from Twitter CDN
  3. File saved via showSaveFilePicker() or blob download
  4. Server NEVER touched → zero cost → infinite scale
```

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

### Phase 1 — Implement NOW (Highest Impact, Lowest Effort)

| Task | Platform | Layer | Time | Impact |
|------|----------|-------|------|--------|
| **fxtwitter client-side** | Twitter/X | Layer 0 | 2 hours | 100% free, never breaks |
| **YouTube oEmbed prefetch** | YouTube | Layer 0 | 1 hour | Instant metadata, better UX |
| **IG oEmbed client-side** | Instagram | Layer 0 | 2 hours | Free metadata extraction |
| **FB oEmbed client-side** | Facebook | Layer 0 | 2 hours | Free metadata extraction |
| **Add Twitter to ALLOWED_HOSTS** | Twitter/X | All | 30 min | Enable Twitter downloads |
| **Add TikTok to ALLOWED_HOSTS** | TikTok | All | 30 min | Enable TikTok downloads |

### Phase 2 — Implement Next (Medium Effort)

| Task | Platform | Layer | Time | Impact |
|------|----------|-------|------|--------|
| **CF Worker CORS proxy** | All | Layer 0.5 | 3 hours | Universal CORS bypass |
| **tikwm.com integration** | TikTok | Layer 0.5 | 2 hours | No-watermark TikTok |
| **ytInitialPlayerResponse** | YouTube | Layer 0 | 4 hours | Client-side stream URLs |
| **IPv6 rotation on VPS** | All | Layer 4 | 4 hours | 18 quintillion free IPs |

### Phase 3 — Future Engineering

| Task | Platform | Layer | Time | Impact |
|------|----------|-------|------|--------|
| **Browser Relay Tunnel** | YouTube | Layer 0 | 2 days | User's IP for ALL requests |
| **Instagram OAuth download** | Instagram | Layer 0 | 1 day | Private content (user's own) |
| **Puppeteer stealth on VPS** | All | Layer 7 | 1 day | Nuclear fallback |

---

## 🔧 CURRENT CODEBASE STATUS

### Already Built & Working

```
✅ server/routes/downloader.ts — 8-phase engine with full waterfall
✅ executePhase1_HetznerCobalt() — Cobalt on 78.47.104.43:9000
✅ executePhase2_CFSwarm() — Cloudflare Worker proxy
✅ executePhase3_HetznerIPv6() — yt-dlp --force-ipv6
✅ executePhase4_YTDLCore() — Native ytdl-core + PO-Token
✅ executePhase5_ExpansionA() — Placeholder (removed public Cobalt)
✅ executePhase6_ASocks_Ultimate() — Paid ASocks last resort
✅ executePhase7_FreeProxyPool() — Auto-mined OSINT proxy pool
✅ fetchSmartMetadata() — Smart Auto-Fallback cascade
✅ handleInfo() — GET /api/downloader/info
✅ handleStream() — GET /api/downloader/stream with resource governor
✅ ProxyKitchen — Auto-mining + platform tagging (yt/ig/fb)
✅ Rate limiting — 30 info/min + 60 stream/min per IP
✅ Memory caching — 1-hour TTL for metadata
✅ Resource governor — MAX_CONCURRENT_DOWNLOADS = 3
✅ client/src/pages/SocialDownloaderPage.tsx — Full UI
✅ TrimSlider — CapCut-style server-side FFmpeg trim
✅ Download history — localStorage persistence
✅ Format picker — Video (360p–4K) + Audio (MP3/M4A)
```

### Needs Building

```
🔴 Layer 0 — Client-side oEmbed prefetch (YouTube/IG/FB/Twitter)
🔴 Layer 0 — fxtwitter.com client-side Twitter extraction
🔴 Twitter/X — Not in ALLOWED_HOSTS yet (validateVideoUrl blocks it)
🔴 TikTok — Not in ALLOWED_HOSTS yet
🔴 tikwm.com — TikTok no-watermark API integration
🔴 IPv6 rotation — ndppd setup on Hetzner VPS
🔴 CF Worker — Upgrade to act as CORS proxy (not just HTML scraper)
```

---

## 🎯 SUCCESS METRICS

```
GOAL: Every download should resolve within 10 seconds for free platforms

YouTube:   Layer 0 oEmbed (100ms) → Layer 1 Cobalt (1-3s) → success
Instagram: Layer 0 oEmbed (100ms) → Layer 1 Cobalt (1-3s) → success
Facebook:  Layer 0 oEmbed (100ms) → Layer 1 Cobalt (1-3s) → success
Twitter:   Layer 0 fxtwitter (200ms) → done (100% client-side)
TikTok:    Layer 0.5 tikwm (1-2s) → Layer 1 Cobalt (1-3s) → success

COST BREAKDOWN:
  Layer 0 (Client-side):  $0/month, infinite scale
  Layer 1 (Cobalt VPS):   €4.5/month, handles 10k+ req/day
  Layer 2 (CF Worker):    $0/month (under 100k req/day)
  Layer 3 (Free Proxies): $0/month
  Layer 4 (IPv6):         $0/month (VPS already paid)
  Layer 5 (ytdl-core):    $0/month
  Layer 6 (ASocks):       ~$5-20/month if used (LAST RESORT)
  
TOTAL: ~€4.5/month for UNLIMITED downloads across ALL platforms
```

---

## 🚨 RISKS & MITIGATIONS

```
RISK: GoFile changes API again
  → MITIGATION: Already normalized (code → parentFolderCode fallback)
  → Always extract code from downloadPage URL as ultimate fallback

RISK: Cobalt gets patched / stops supporting a platform
  → MITIGATION: We self-host → can update immediately
  → Waterfall ensures other layers catch the failure

RISK: Cloudflare Worker gets rate limited by Meta
  → MITIGATION: Multiple Workers on different accounts
  → Layer 3 (free proxies) catches the overflow

RISK: fxtwitter.com goes down
  → MITIGATION: Alternative: vxtwitter.com, fixupx.com (same thing)
  → Layer 1 Cobalt handles Twitter too

RISK: YouTube patches PO-Token solver
  → MITIGATION: Cobalt team actively maintains their solver
  → Fallback to OAuth2 (yt-dlp plugin) for permanent access

RISK: Free proxy pool runs dry
  → MITIGATION: ProxyKitchen auto-mines from 10+ public lists
  → Layer 6 ASocks always available as paid safety net
```

---

> **"Churi emon koro jate na dhoro poro"**  
> *Operate so flawlessly you are undetectable.*  
> — Red Police Engineering Principle
