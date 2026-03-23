# VIBE CODER NOTES: SECURITY, SCALE & PROGRESSION PROTOCOL (March 2026)

**1. Security First, Speed Second, Zero Errors:**
- All implementations must prioritize security (avoiding IP blocks, secure metadata fetching) followed by maximum speed.
- Zero error tolerance: Ensure graceful fallbacks and proven methods. No hacky unproven solutions.

**2. Progress Bar & Metadata Fetch:**
- Maintain the "smooth progressive loading" (simulated percentage intervals up to 90/95%) rather than abrupt 4-step jumps.
- The metadata fetch approach (which is fast, <2KB, and avoids full video load) is working perfectly and should be preserved.

**3. Preview & Trim Cache Quality (Zero Lag Rule):**
- Preview caches and trim streams **MUST always use the absolute lowest viable quality** (highly compressed MP4).
- High quality is **only** for the final download, *never* for preview. This guarantees 0ms seek times without lag on the main site.
- Do not engage the server's CPU to transcode the preview; heavily rely on lowest-tier pre-muxed CDN streams via the proxy (e.g., mp4-360 or mp4-480).

**4. Download Formats (Exact & Low-to-High):**
- Metadata extraction must read exactly what qualities are available for that specific video.
- Download buttons should dynamically display exactly these qualities, ordered from **Lowest to Highest** (e.g., 360p -> 720p -> 1080p).
- Must ensure options are pre-muxed (audio + video) where possible, to prevent excessive ffmpeg merging on our single VPS.

**5. Scaling Constraints (1 VPS + Proxies):**
- System is running on **1 VPS**. Avoid heavy ffmpeg processing (merging 4K Dash streams) unless absolutely requested.
- Fully utilize the integrated proxies (ASOCKS) to prevent source blocks.
- If a method requires complex custom coding that eats resources, look for proven stacks, lightweight libs, or CDN caching instead.

---
# Trimmer Studio V2: The Scaling & Hardening Roadmap 

*This document serves as the brutal reality check for the BongBari Trimmer Studio. We successfully built a blazing fast MVP. Now, we need to transition it from a fragile prototype to a production-grade, load-bearing system.*

---

## 🎯 The Philosophy (Vibe Coder Stance)
The MVP proved our architecture (split workloads: fast proxy for preview, heavy backend for final) is the right *idea*. But the current implementation is held together by duct tape. We swapped a slow bottleneck for borrowed speed (Cobalt) and applied quick DOM hacks for UI logic. 

**The Goal now:** Remove Single Points of Failure (SPOFs), respect user intent over DOM state, and build an enterprise-level queueing system before traffic spikes melt the Render server.

---

## 🛑 The Brutal Truths & Our Execution Plan

### 1. The 3rd-Party Proxy Dependency & The "Single IP Fragility" (High Risk)
* **The Past Reality:** We depended 100% on `api.qwkuns.me`, but it died from YouTube datacenter IP bans.
* **The Current Fix (Phase 1.5):** We successfully bypassed Cobalt and routed previews locally through our own Hetzner VPS (`http://78.47.104.43:9000`). This is a **valid immediate fix** because Hetzner currently has a clean IP.
* **The Brutal Truth:** We solved "proxy instability" but created "single IP fragility" and mixed responsibilities.
  * Hetzner is now acting as *both* a high-bandwidth preview streamer and a heavy-compute downloader.
  * Repeated automated requests from one Hetzner IP will eventually get flagged by YouTube just like Cobalt and Render did.
  * Preview streams can cause massive bandwidth spikes. If 50 users buffer streams, our VPS bandwidth explodes.

#### 🛡️ The Final Infrastructure Playbook: The Hybrid Smart-Split

**The "Free P2P Client Proxy" Debate (Settled):**
Browsers run in sandboxes. YouTube blocks CORS. You cannot use a user's connection as a free proxy. We must build controlled infrastructure, not messy backend hacks.

**The Golden Insight (YouTube Metadata vs Google CDN):**
* **The Vulnerability:** YouTube blocks IP addresses *scraping for metadata* (the initial yt-dlp call).
* **The Exploit:** Google's Video CDN (`googlevideo.com`) rarely blocks the actual *streaming* IP once the direct URL is successfully generated.
* **The Strategy:** Stealth for Metadata (KBs). Brute force for Streams (GBs).

### 🚨 CRITICAL RULE: NEVER CHOKE THE PROXY WITH VIDEO BYTES
A devastating bug occurred (March 2026) where the UI spun endlessly at 95% and videos showed a black screen.
* **The Cause**: The backend routed massive `480p mp4 stream bytes` through the ASocks residential proxy intended for `yt-dlp` text scraping. The residential proxy instantly rate-limited/choked on the gigabytes of video data, returning `0 bytes` to the frontend `<video>` tag.
* **The Absolute Law**: **Never use `HttpsProxyAgent` in Axios/Fetch requests that pipe media to the client.** The proxy is strictly for initial `yt-dlp` metadata evasion (< 100KB). Once the raw Google CDN URL is obtained, the Render/Hetzner server must use its raw, native gigabit connection to funnel the bytes back to the user.

**Phase A (The Startup Reality Stack): 1 VPS + ASocks PAYG**
* **The Reality:** We don't need a massive Residential pool, and we definitely don't need a 3-VPS swarm for a product in the testing phase. We need a low-cost, easy-to-debug, monolithic node paired with a cheap precision proxy.
* **Architecture:** 
  `User` -> `Your ONE VPS (Hetzner)` -> `yt-dlp (via ASocks Residential Proxy)` -> `Gets CDN URL` -> `Your SAME VPS streams video`

* **The Setup (Maximum Cost Efficiency):**
  * **1️⃣ ONE VPS (Hetzner, ~€4-€6/mo):** Handles EVERYTHING. The API, the Preview streaming, and the Downloads. Do not split this up until CPU consistently hits >80% or users complain about queue delays.
  * **2️⃣ ONE PROXY (ASocks PAYG, ~₹0-₹200/mo):** We ONLY use this for the initial `yt-dlp --proxy` extraction (fetching CDN URL). Since it only pulls metadata JSON (~100KB), 1GB ($3) literally covers 10,000 to 20,000 requests. 

**Why This Is The Startup Holy Grail:**
1. **Cheap:** Fixed cost of 1 VPS. Proxy is almost free because it strictly fetches text, not video bytes.
2. **Simple:** No complex multi-VPS routing, no infrastructure headaches, easy to debug.
3. **Safe:** No over-engineering and zero wasted money before we validate with real users.

**Execution Warning:** Do NOT depend strictly on the proxy. The code MUST have a direct-fetch fallback in case the SOCKS5 proxy drops.
```typescript
// The Code Reality (SOCKS5 + Direct Fallback)
try {
  // 1. Try Stealth (ASocks)
  const cmd = `yt-dlp --proxy "socks5://user:pass@proxy" --dump-json URL`;
} catch (e) {
  // 2. Fallback to Direct (Hetzner Native)
  const cmd = `yt-dlp --dump-json URL`;
}
```

### 2. The Scrubber Hack: DOM State vs. User Intent
* **The Reality:** Relying on `!vid.paused` is smart but fragile. Mobile browsers handle media state weirdly. Network buffering can arbitrarily trigger pause states, breaking the scrubber logic mid-drag.
* **The Fix (Phase 1): Intent-based State Management**
  We need to decouple bounds enforcement from the HTML video player and tie it to React state:
  ```tsx
  // Track intentional dragging via pointerDown / pointerUp
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  if (!isScrubbing) enforceBounds(); 
  ```

### 3. The Auth "Hack" & The Speed-Security Conflict
* **The Reality:** We initially hid `sessionId` in Phase 2 using a dynamic JWT (`/api/stream?token=xyz`). But dynamic tokens bypassed our caching engine (Phase 0), forcing the proxy to re-extract KBs of metadata on every single play/click! We accidentally killed speed to gain security.
* **The Fix (Phase 2 Revamped): HMAC-Signed Cached Routes**
  Instead of dynamic tokens that change (killing cache), the server will use a deterministic hash: `hmac(targetUrl + ServerSecret)`.
  1. Frontend asks for metadata.
  2. Backend returns metadata AND a strict `signature` string for that exact video.
  3. Frontend requests stream: `/api/stream?url=TARGET&sig=SIGNATURE`.
  4. **Why this wins for SaaS:** The URL stays identical (so our Phase 0 Blazing Fast Memory cache still hits at 0ms latency), but the route is completely secure because nobody can spoof the `sig` without our backend secret. We get 100% caching speed *and* 100% route obfuscation.

### 4. The Final Boss: The Download Bottleneck & The "Fake 1080p" Bug
* **The Reality (Why High Quality Fails):** Users are noticing that selecting 1080p yields the exact same file size/quality as 720p or lower. **This is because of a massive architectural limitation in how we stream data.** 
  Currently, we pipe `yt-dlp` directly to the Express `res` (response output). When piping to stdout, `yt-dlp` *cannot* use ffmpeg to merge separate audio and video tracks (which YouTube does for everything above 720p). Therefore, we are forced to ask `yt-dlp` for a "pre-muxed" format (`best[ext=mp4]`). YouTube's highest pre-muxed format is almost always artificially capped at 720p (and sometimes 360p). Selecting 1080p just falls back to this 720p file.
* **The Weakness:** Not only are we artificially capped at 720p, but our initial thought to "process `yt-dlp` one at a time" is dumb for scaling. If 20 users hit Download, 19 users waiting sequentially in line creates atrocious UX.
* **The True Fix (Phase 2): Disk Processing & Asynchronous Queues**
  We must stop piping directly to the browser. We need to:
  1. Let `yt-dlp` download the video + audio to the Hetzner disk first so ffmpeg can merge true 1080p/4K.
  2. Implement a proper worker queue (BullMQ/Redis) so users have a waiting screen ("Processing...").
  3. Serve the file via a CDN static link once it's finished merging on disk.

### 5. HLS vs. HTTP Range (The Hard Truth)
* **The Reality Check:** We initially said, "We will stick to HTTP Range Requests." That is playing it too safe. Range requests do not equal smooth scrubbing, *especially* on Indian mobile networks (our core demographic). If we get popular, users will feel lag spikes and buffer jumps.
* **The True Mindset:**
  - *Phase 1:* HTTP Range (To get out of the door)
  - *Phase 2:* Measure Telemetry
  - *Phase 3:* **HLS (chunked `.m3u8`) is inevitable.** We must plan to pre-generate seekable chunks for power-users, otherwise we will hit a massive UX ceiling. 

### 6. Zero Observability 
* **The Reality:** We don't actually know how fast it is. We are "guessing" it's fast based on our own PCs.
* **The Fix (Phase 1): Basic Telemetry**
  Log `Time To First Frame (TTFF)`, `download_success_rate`, `scrub_latency`, and proxy failure fallbacks. Without this, we are flying blind.

---

## 🚀 The Execution Roadmap (Startup Phase Logic)

### 🔥 PHASE 0 (Start Here — Today)
*Goal: Make the core hybrid pipeline work first.*
- [x] Setup ASocks proxy integration for `yt-dlp`.
- [x] Add proxy + direct fallback (proxy → no proxy retry) in `server/routes/downloader.ts`.
- [ ] Verify CDN URL extraction success.
- [ ] Verify smooth video streaming.

### 🔥 PHASE 1 (UI & Polish)
- [ ] Implement `isScrubbing` UI state to replace `vid.paused` in the UI layer.
- [ ] Add basic failure/time logging to the backend proxy handler.

### 🔥 PHASE 2 (Scale & Monetizable Security)
- [ ] Implement the Background Job Queue (Upstash Redis + Worker) to handle heavy `yt-dlp` final downloads.
- [ ] Implement true ffmpeg merging on disk for true 1080p outputs.
- [ ] Build Progress Polling UI (so users see "Processing... 45%" instead of just a spinning button).
- [ ] Implement deterministic `HMAC` signatures for media fetching. Secures the routes *without* breaking the fast Phase 0 RAM cache.

### Phase 3 (Advanced Scale Weapons)
- [ ] Custom lightweight node for raw fetching (removing Cobalt dependency entirely).
- [ ] Smart Prefetching/HLS chunking for extreme low-end mobile architectures. 

---

## ⚙️ Phase 2 Blueprint: The Distributed Queue Architecture
*The transition from "the guy who makes things work" to "the guy who builds systems that don't break." We are moving from a fragile Request-Response system to a hardened Job-Based Infrastructure.*

### 1. The Distributed Flow (Render + Upstash + Hetzner)
We cannot process jobs on Render (too weak) and we cannot serve files from Render if they are downloaded on Hetzner. 
* **User clicks Download:** Hits Render API (`POST /api/download`).
* **Render (The Brain):** Instantly creates a job in **Upstash Redis** (`bullmq`) and returns a `jobId` to the frontend.
* **Hetzner (The Worker):** Runs a background Node.js process listening to the Redis queue. It picks up the job.
* **Hetzner Processing:** Executes `yt-dlp -f "bv*+ba/best"`. `ffmpeg` merges true 1080p/4K audio and video to the physical SSD.
* **Hetzner Delivery:** A lightweight NGINX server on Hetzner serves the final file directly via a static URL (`https://dl.bongbari.com/<jobId>.mp4`). 

### 2. Worker Logic & Concurrency (The Hetzner Node)
To prevent server melt-down, we strictly control concurrency and retries in the BullMQ worker:
```typescript
const worker = new Worker("downloads", async (job) => {
    // 1. Extract params (URL, Start/End for Trimming, Format)
    // 2. yt-dlp arguments MUST use bv*+ba/best to force ffmpeg merging
    // 3. Add trimming arguments (--download-sections "*start-end")
    // 4. Save to /downloads/jobId.mp4
    
    return { fileUrl: `https://dl.bongbari.com/${job.id}.mp4` };
}, {
    connection,
    concurrency: 1, // CRITICAL: Start with 1 to prevent VPS meltdown. Increase later.
});
```

### 3. Resiliency (No Dead Queues)
* **Auto-Retries:** YouTube randomly drops connections. Jobs must be created with `attempts: 3` and exponential backoff (`delay: 5000`).
* **Storage Eviction (Disk Saver):** The Hetzner node will run a strict cron job: `*/10 * * * * find /downloads -type f -mmin +10 -delete`. Files vanish after 10 minutes. If a user loses their link, they trim it again.

### 4. The Frontend Polling UX
* Render provides instant `jobId`.
* Frontend sets a `setInterval` firing `GET /api/job/:id` every 2 seconds.
* **UI State:** Shows "Processing..." or reads stdout progress (`job.progress`).
* When state = `completed`, the green download button illuminates pointing to the Hetzner static file link.

---

## 🛡️ The Advanced Defenses (The Final Mentor AI Corrections)
*Building a queue is one thing. Protecting it from edge cases, deadlocks, and shared-IP networks is the final hurdle.*

### 1. Defending The Static Server Expiry 
* **The Vulnerability:** A random 32-char string (`a9xK3lPz9q.mp4`) stops scrapers, but without a hard expiration, a shared link still acts as an unlimited bandwidth leak. 
* **The Vibe Coder Fix:** We pair Obfuscation with **Backend Expiry Logic**. The file is fetched via our Server proxy (`GET /api/download/:jobId`). The server checks `if (now > job.expiresAt) return 403;` before redirecting to the `.mp4`. 

### 2. Disk Pressure Guard & Recovery 
* **The Vulnerability:** Earlier we added `worker.pause()` on 85% disk usage. But we forgot to resume it. One spike meant a permanently frozen product.
* **The Fix:** A self-healing worker loop.
  ```typescript
  if (currentDiskUsage > 85%) {
      worker.pause(); 
      triggerEmergencyEviction(); 
  } else if (currentDiskUsage < 70% && worker.isPaused()) {
      worker.resume(); // System auto-recovers
  }
  ```

### 3. Queue Starvation (Protecting The Money)
* **The Vulnerability:** 50 free users enqueue 1-hour podcast trims. A newly upgraded Pro user submits a job and gets stuck behind them. Business = dead.
* **The Fix:** BullMQ priority injection: `queue.add("job", data, { priority: isPro ? 1 : 5 })`. Lower number = executes next whenever a slot opens.

### 4. Smart Rate Limits (No IP Collateral Damage)
* **The Critique:** Restricting purely by IP (e.g., 5 jobs/IP/hr) is a western mindset. In India, mobile networks (Jio) and college dorms use aggressive NATs. One IP could represent 200 users.
* **The Fix:** We use **Session ID + IP Thresholds** as a soft limit. If a user breaches the limit, they aren't fully blocked. They are simply penalized with `priority: 10` (Queue Delay). *“High traffic detected. Job delayed by 2 minutes. Upgrade to Pro to skip the line.”*

### 5. Frontend Honesty & Wait-Time Metrics
* **UX Honesty:** Since files auto-evict in 10 minutes, the frontend UI *must* show a ticking countdown: `Link expires in 09:59`. If they leave and come back, it's their fault, not a "bug".
* **The Critical Metric:** We must log `queue_wait_time = job.startedAt - job.createdAt`. If our `yt-dlp` trims in 10 seconds, but the queue wait time is 3 minutes, the user perceives the product as "slow." This metric tells us when to boot up a second Hetzner VPS.

---

## 🏗️ The Infrastructure Reality Check (Startup Phase)
Instead of complicated setups across different servers, we are keeping it unified until traffic forces us to split.

* **The Single Hetzner VPS (Brain + Muscle):** 
  To reduce latency and moving parts, the Single VPS acts as the API, handles the user queuing logic, executes `yt-dlp` (via ASocks SOCKS5), runs `ffmpeg` to merge streams, and pipes the preview video data directly back to the user. 
* **The "When To Upgrade" Signal:**
  We only transition into a Multi-VPS Worker/Master architecture when:
  1. CPU consistently lives > 80-100%.
  2. Users complain that queues are too slow.
  3. Video piping lag ruins the UI preview.

---

## 💰 The Monetization Masterplan (How We Make Money)
Fast technology is cool, but a *business* is cooler. Here is the powerful playbook for turning the Trimmer into cash:

### 1. The Ad Strategy (Google AdSense)
Once we scale organic traffic via SEO (our JSON-LD is already set up), we apply for Google AdSense.
* **Placement 1 (The Header):** Simple banner above the Trimmer player. 
* **Placement 2 (The Sweet Spot - Interstitial):** When users hit "Download", there is a natural 5-15 second wait time while `yt-dlp` cuts their video. *This is a captive audience.* We serve a high-paying interstitial ad right here while the queue loads. "Your video is processing... [AD]".

### 2. The Freemium / Recurring Plan System (Stripe / Razorpay)
* **The Reality Check:** A slightly delusional mindset early on is thinking we can throw up a paywall immediately. Nobody pays until the tool becomes a habit, they trust it, and it works flawlessly. Premature monetization kills growth. We will optimize for Stability -> Speed -> Repeat Usage -> *Then* Monetize.
* **Free Tier:** 720p maximum, watermark added (viral loop marketing), limit of 3 downloads per day, must wait in the "queue".
* **Pro Tier (₹299/mo or $5/mo):** 1080p/4K unlocked, ZERO wait times (priority queue routed to a premium Hetzner node), no watermarks, batch link processing. Use Stripe for Intl and Razorpay for India. *Only after we establish massive organic traction.*

### 3. Cost Minimization (Protecting Margins)
* **The Cloudflare Caching Reality:** We initially assumed: "If 500 people trim a viral meme, we process it once and Cloudflare caches it." ** Reality:** Users trim slightly different timestamps. Even a 1-second difference is a cache miss. Caching definitely helps for identical formats, but it *will not* save us at scale. We cannot rely strictly on Cloudflare for cost control.
* **Storage Eviction:** Downloaded files on our server auto-delete after 10 minutes. We are a pipeline, not a hard drive.

---

## 🚀 Traffic & Distribution (Organic vs. Inorganic)

### Organic (The Free Pipeline)
* **SEO:** Target keywords like *"trim youtube video online fast"*, *"download specific meme timestamp"*. 
* **Content:** Create YouTube Shorts/Reels where someone says, *"Stop downloading 2-hour podcast videos just to get a 10-second clip"* and show them using BongBari.

### Inorganic (The "Feed the Machine" Pipeline)
* **Meta Pixel (Already Installed):** We run highly targeted Facebook/Insta ads towards "Meme Creators", "Reaction Channels", and "Video Editors". 
* Since our preview is instant (thanks to Cobalt), the bounce rate on ads will be incredibly low. They click the ad $\rightarrow$ they are trimming right away $\rightarrow$ they get hooked $\rightarrow$ they convert into Pro users.

*Let's build a product, not just a prototype. We aren't just writing code, we are building a printing press.*
