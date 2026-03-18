# Trimmer Studio V2: The Scaling & Hardening Roadmap 

*This document serves as the brutal reality check for the BongBari Trimmer Studio. We successfully built a blazing fast MVP. Now, we need to transition it from a fragile prototype to a production-grade, load-bearing system.*

---

## 🎯 The Philosophy (Vibe Coder Stance)
The MVP proved our architecture (split workloads: fast proxy for preview, heavy backend for final) is the right *idea*. But the current implementation is held together by duct tape. We swapped a slow bottleneck for borrowed speed (Cobalt) and applied quick DOM hacks for UI logic. 

**The Goal now:** Remove Single Points of Failure (SPOFs), respect user intent over DOM state, and build an enterprise-level queueing system before traffic spikes melt the Render server.

---

## 🛑 The Brutal Truths & Our Execution Plan

### 1. The 3rd-Party Proxy Dependency (High Risk)
* **The Reality:** We depend 100% on `api.qwkuns.me`. If it rate-limits us or shuts down, the Studio dies instantly. 
* **The Fix (Phase 1): Proxy Rotation & Fallback**
  We will introduce a proxy rotation array. 
  ```ts
  const proxies = ["https://api.qwkuns.me", "https://co.wuk.sh", "https://cobalt.api.etc"];
  // Loop, try, cache the fastest working proxy for the next 10 minutes.
  ```
* **Long Term:** Spin up our own lightweight reverse-proxy node to guarantee SLA.

### 2. The Scrubber Hack: DOM State vs. User Intent
* **The Reality:** Relying on `!vid.paused` is smart but fragile. Mobile browsers handle media state weirdly. Network buffering can arbitrarily trigger pause states, breaking the scrubber logic mid-drag.
* **The Fix (Phase 1): Intent-based State Management**
  We need to decouple bounds enforcement from the HTML video player and tie it to React state:
  ```tsx
  // Track intentional dragging via pointerDown / pointerUp
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  if (!isScrubbing) enforceBounds(); 
  ```

### 3. The Auth "Hack" (Security Leak)
* **The Reality:** Injecting `sessionId` into the standard URL query solves the 401, but the tokens can get logged in proxy histories and network logs, opening up replay attacks. 
* **The Fix (Phase 2): Signed Short-Lived Tokens (AWS Style)**
  Instead of naked Session IDs, the backend will generate a 5-minute signed JWT specifically for stream delivery: `/api/downloader/proxy-stream?token=SIGNED_HASH`. Once it expires, the link is dead. Security goes up, convenience stays exactly the same.

### 4. The Final Boss: The Download Bottleneck
* **The Reality:** Right now, hitting "Download" initiates a synchronous Express process running `yt-dlp` and `ffmpeg`. If 20 users hit this at the same time, the server CPU will flatline, queues will build, and connections will timeout.
* **The Fix (Phase 2): Asynchronous Task Queues**
  We must integrate a worker queue (using our Upstash Redis or completely shifting downlaods to an async poller). 
  - User hits "Download" -> Receives a `jobId`.
  - Frontend polls `GET /api/jobs/:id`.
  - Backend safely processes `yt-dlp` one at a time, protecting the main API thread.

### 5. HLS vs. HTTP Range (The Stream Debate)
* **The Reality:** HLS (chunked `.m3u8` playlists) is the gold standard for "God-level UX" and scrubbing without latency jumps.
* **The Debate:** Pre-generating HLS segments on our backend entirely negates the speed of skipping our backend for proxies. 
* **The Compromise:** As long as our proxy supports strict HTTP Range Requests (206 Partial Content), modern browsers natively fetch "chunks" of MP4s efficiently. We will stick to HTTP Range Requests for Phase 1/2, and explore edge-CDN HLS caching only if scrubbing metrics show high latency on poor network conditions.

### 6. Zero Observability 
* **The Reality:** We don't actually know how fast it is. We are "guessing" it's fast based on our own PCs.
* **The Fix (Phase 1): Basic Telemetry**
  Log `Time To First Frame (TTFF)`, `download_success_rate`, and proxy failure fallbacks so we have a dashboard of the Trimmer's health.

---

## 🚀 The Execution Roadmap

### Phase 1 (Immediate Hardening)
- [ ] Implement `isScrubbing` UI state to replace `vid.paused`.
- [ ] Add the Proxy Array Fallback in `server/routes/downloader.ts`.
- [ ] Add basic failure/time logging to the backend proxy handler.

### Phase 2 (Power & Security - Requires DB/Redis Changes)
- [ ] Implement short-lived signed tokens (`HMAC`) for media fetch endpoints instead of exposing `sessionId`.
- [ ] Build the Background Job Queue (Upstash Redis + Worker) to handle yt-dlp downloads so the Main API never blocks.
- [ ] Build Progress Polling UI (so users see "Processing... 45%" instead of just a spinning button).

### Phase 3 (Scale Weapons)
- [ ] Custom lightweight node for raw fetching (removing Cobalt dependency).
- [ ] Smart Prefetching/HLS chunking for extreme low-end mobile architectures. 

*Let's build a product, not just a prototype.*