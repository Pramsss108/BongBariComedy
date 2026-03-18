# BongBari Downloader Architecture & Optimization Report (Phase 13+)

This document summarizes the current working approaches, what failed previously, and the handoff state for future development sessions on the Downloader architecture.

## 🟢 WHAT WORKS WELL (PROVEN & FAST)

### 1. Hybrid Meta API (Instant Metadata) - **LOCKED**
Instead of using slow cold `yt-dlp` commands on the local machine for basic video details, the app hits the proxy (`Hetzner` / `Cobalt`) via `Promise.any`, instantly returning UI details in ~150-300ms. 
**Why it works**: By avoiding `spawn()` for basic details, we massively drop latency and immediately let the user see the visual layout (duration, thumbnail).

### 2. Selective Proxy Routes (Hetzner vs Cobalt) - **LOCKED**
- **Direct App Stream (`/api/downloader/stream`)**: When users hit *Download*, we use the Hetzner Go-Proxy to extract a raw CDN url and issue a `302 Redirect`. This forces maximum possible bandwidth straight from Google to the Browser.
- **Fast Preview & Trimmer Source (`/api/downloader/proxy-stream`)**: When opening the Trimmer, we prioritize the **Cobalt API (`api.qwkuns.me`)** passing `vQuality=480`. 
  - **Why it works**: Using the lowest resolution saves the user's browser memory (0-latency seeking/scrubbing in Trim slider) and completely completely fixes the "1 minute preview load" lag.

### 3. Server-side Trimming with `yt-dlp` + Temp Files
Trying to `stdout` pipe an actively trimmed mp4 via ffmpeg constantly resulted in corrupted headers or fell back to `mpegts`.
- **Current fix**: When trimming (`startSec` and `endSec` provided), `yt-dlp` is asked to `-o trim_file.mp4`. It honors the user's explicit format selection (accessible *inside* the Studio view now).
- **Why it works**: `yt-dlp` safely assembles the MP4 metadata (`--force-keyframes-at-cuts`). Render saves the tiny slice to disk, then read-streams the final `.mp4` perfectly to the browser, then auto-deletes it.

## 🟡 UI/UX UPGRADES ACCOMPLISHED
- **Trim Studio Quality Selector**: Users can natively flip between Video/Audio modes and resolutions inside the Trim Overlay without going back to the dashboard.
- **Playhead Desync Fixed**: Play/Pause shortcuts and slider bounds now accurately freeze the video without causing the scrubber to randomly snap around during active playback adjustments.

## 🔴 WHAT FAILED / AVOID DOING

### 1. Hard Rate Limiting on Previews (`429 Error`)
HTML5 `<video src="...">` tags do not make 1 request. They make numerous `Range: bytes=` requests. If `express-rate-limit` is set to `5/minute` globally on `/api/downloader/stream`, the browser consumes all 5 limits instantly, blocking the video.
- **Fix Applied**: Previews (`?mode=preview`) bypass `streamLimiter`. The max limit for generic streams was updated to `60/minute`.

### 2. Blob `fetch()` arrayBuffer Downloads
Fetching gigabyte videos into the React JS memory as Blob ArrayBuffers crashed the browser and mobile devices. 
- **Fix Applied**: Using strict anchor tag downloads native to the browser `<a href={download_api} download>`.

## 🟡 WHAT IS LEFT / NEXT STEPS

**1. Further Limit Trimming CPU Abuse** 
- Currently restricted via a concurrent connections limit check (`let ACTIVE_DOWNLOADS = 0;`), but we must make sure these processes terminate fast if users drop connection.
- Monitor `tryAcquireSlot()` logic to ensure trimming doesn't crash Render's 512MB limit in spikes.

**2. Analytics / Downloader Counts**
- Implement incrementing counters in PostgreSQL (Neon) to showcase exactly how many videos have been successfully downloaded using the platform.

**3. Preview Optimization for Exotic Sites**
- While YouTube works cleanly, Facebook and Instagram might aggressively block Direct CDN proxy URLs after IP checks. If preview fails on these websites, we use the `try/catch` fallback of native `yt-dlp` execution.
