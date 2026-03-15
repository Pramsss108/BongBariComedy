 # 🧠 Trimmer Architecture Research: WebAssembly vs Backend Muxing
*(This document is written for other AI assistants to read, understand the context, and provide architectural solutions)*

## 1. The Core System Setup
**Project Type:** Vite + React Frontend, Node.js + Express + `yt-dlp` Backend (Hosted on Render).
**Goal:** Allow users to paste a social media URL, visually preview the video, drag trim handles, and export the trimmed chunk.

### Current Workflow (The "Happy Path"):
1. User enters URL -> Backend `yt-dlp` fetches metadata (title, duration, thumbnails).
2. Frontend shows a Custom Studio Player. 
3. To enable zero-latency scrubbing, the frontend uses `fetch()` to pull the raw stream from our backend proxy into a client-side JavaScript `Blob`.
4. The `Blob` generates a `URL.createObjectURL()` which is passed to the `<video>` player.
5. User scrubs and sets `startTime` and `endTime`.
6. User clicks "Download".

## 2. The Bottleneck: Trimming the Export
Here is where the architecture splits and we face a dilemma.

### Path A: The Frontend WebAssembly Route (Current Stuck State)
We attempted to pass the downloaded `Blob` into `@ffmpeg/ffmpeg` (WASM) inside the browser.
*   **Pros:** $0 server cost. Zero additional bandwidth. The file is already in the user's RAM from the preview phase!
*   **The Critical Bug:** Browsers (Chrome/Edge) have locked down background threading for security. WebAssembly requires `SharedArrayBuffer` to run FFmpeg effectively. Without strict HTTP headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`), the WASM thread crashes silently inside `ffmpeg.load()` and the UI hangs at **"Trimming 0%"** forever.
*   **Why it's hard:** Setting COEP/COOP headers on a generic GitHub Pages / Render combo tends to break third-party iframes, YouTube API calls, and Google OAuth.

### Path B: The Backend yt-dlp Route (The "Double Fetch" Dilemma)
Instead of WASM, we could tell the user's browser, "Send the Start and End times to the node server." The server would then run `yt-dlp --download-sections "*[START]-[END]"` and stream the trimmed file to the user.
*   **Pros:** Bypasses browser security locks. Works on 100% of devices (even 10-year-old potatoes).
*   **The Architectural Flaw (The User's Catch):** Because the user *needs* a fluid live preview to pick their trim points, we already downloaded the 50MB video to their browser once using our proxy. If we now ask the backend to download it *again* to trim it, we are spending 2x the bandwidth and making the user wait twice. 

## 3. The Objective for the Assisting AI
We need a path forward that achieves:
1. **Accurate Visual Previewing** (User must see what they are trimming).
2. **No Infinite Loading / Freezing** (Must bypass or fix the COOP/COEP WASM locks).
3. **Bandwidth Efficiency** (We cannot "double fetch" large files on the Render network proxy).

**Potential Ideas to Explore:**
*   Is there a lightweight, modern JS-only media slicing library (like `mp4box.js`) that can perfectly slice MP4 keyframes without needing massive WASM threads?
*   Can we bypass `SharedArrayBuffer` entirely by forcing `@ffmpeg/ffmpeg` into a single-threaded fallback mode?
*   Should we implement HTTP Range requests for the live preview so we only buffer a low-res version of the file, and then do the final HD slice on the backend?

Please provide a Vibe-Coder optimized technical solution.