# BongBari Downloader API - Final Architecture & Phases
**Status:** Completed & Unlocked! BotGuard Successfully Bypassed.

Here is the exact step-by-step phased approach of how the new downloader works flawlessly without getting blocked, and how the frontend is mapping it out for a zero-latency user experience.

---

## Phase 1: Zero-Latency Metadata (Information Gathering)
**Location:** `client` -> `Express Backend (/api/downloader/info)` -> `Hetzner Engine`

**What happens:**
When a user pastes a link and clicks "Fetch", we don't immediately download massive video files. We send a quick ping to Hetzner via the BotGuard tunneling system to extract perfectly formatted JSON (Titles, Thumbnails, Available MP4 resolutions).
* **Result:** Instant UI population. The React viewer lights up in < 2 seconds. No heavy bandwidth consumed yet.

## Phase 2: BotGuard Evasion & SOCKS5 Tunneling (The "Aukat" Bypass)
**Location:** `Hetzner Docker Service (Port 9000)`

**What happens:**
When the user decides to Preview or Download, our Node backend sends a request to Hetzner.
Instead of using normal browser scraping (which BotGuard blocks with invisible Recaptcha tokens), Hetzner takes the link and:
1. Puts on an `Android/TV Spoofing Mask` via `yt-dlp`. 
2. Routes the IP address through Cloudflare WARP (`127.0.0.1:40000`).
3. Safely convinces Google to hand over the raw backend `.mp4` video streaming link without signatures or encryptions (`https://rr3---sn-...googlevideo.com`).

## Phase 3: The Native Stream Proxy (Fixing the Scrubber Lag)
**Location:** `server/routes/downloader.ts` -> `/api/downloader/stream`

**What happens:**
If the frontend just tried to play Google's raw link directly, the browser would block it due to strict CORS rules. 
Instead, our Express server opens a direct pipe to Google's servers. 
* **The "Seeking" fix:** Express now listens for browser `Range` headers. When you drag the video playhead, Express proxies that exact byte range request over to Google and returns a `206 Partial Content` response. This makes the player scrubber buttery smooth!
* **The "Mode" fix:** If the request specifies `&mode=preview`, the server serves the video as `inline` so the HTML5 video player can play it. If the user clicks Download, the server serves it as an `attachment` so the browser triggers a native "Save As" dialogue popup.

## Phase 4: Blob Caching & Local FFmpeg (Trimmer Prep)
**Location:** `client/src/pages/SocialDownloaderPage.tsx`

**What happens:**
When the user clicks "Trim Mode", the web browser actually starts downloading the proxied video completely into Local Memory (the RAM via `Blob`), showing you a large green progress bar. 
Why? Because when playing around with milliseconds trying to cut a meme clip using FFmpeg.wasm inside the browser, network fetching causes lag. By saving it strictly to `Blob://`, you get true 0ms latency!

---

### What's Done? 
✅ Ditched the broken Cobalt container entirely. 
✅ Spun up a lightweight FastAPI + SOCKS5 Python tunnel on Hetzner.
✅ Fixed the Express Payload JSON Mismatch (The `undefined '0'` bug).
✅ **NEW just now:** Upgraded the Node.js Express proxy to pass `req.headers.range` and standard HTTP video bytes backward and forward so the HTML5 preview player stops lagging and supports native seeking/scrubbing!
✅ Added dynamic `content-disposition` (Inline for UI players, Attachment for Hard-drive downloads).

### What's Left?
Ensure the live GitHub deploy has the latest Express code to perfectly mirror this local test! The architecture is entirely complete.