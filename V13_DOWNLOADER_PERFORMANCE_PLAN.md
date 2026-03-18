# V13 Downloader Performance & Bypass Protocol

## Architecture Reality Check
Right now, the system is agonizingly slow because **Render (Free Tier)** is acting as a middleman for heavy video processing.
Render gives you exactly 0.1 CPU cores and 512MB RAM. Running `yt-dlp` or `ffmpeg` locally on this causes the CPU to lock up at 100%, causing the UI to freeze at "0% Loading Studio".

**The Strategy:** We will stop using Render to download/process bytes. Render will ONLY be an API manager. All heavy lifting (bytes, ffmpeg, metadata) will bypass Render and point directly to the Hetzner VPS (`78.47.104.43:9000`) or the Google CDNs directly.

---

### Phase 1: The Render Decoupling (Stop Double-Piping)
**Goal:** Stop piping gigabytes of video through Node.js.
- [ ] Task 1: Rewrite `/api/downloader/stream` so instead of `res.write(chunk)`, it returns a heavily cached, direct SOCKS5/CORS-bypassed streaming URL.
- [ ] Task 2: Remove the "Global Slots 512MB" lock for basic previews, redirecting the UI player specifically to a raw Cobalt stream URL.

### Phase 2: Instant Metadata (Fix "Very Slow Loading")
**Goal:** Previews should load in under 1.5 seconds.
- [ ] Task 1: Rip out local `yt-dlp` fallback in `fetchSmartMetadata` (which takes ~10 seconds to bypass BotGuard locally).
- [ ] Task 2: Point `/info` strictly to the Hetzner Engine or rapid external APIs (`qwkuns.me`) so the UI gets thumbnails and durations instantly.

### Phase 3: Raw CDN Extraction (Save Bandwidth)
**Goal:** Reduce Hetzner & Render bandwidth by forcing the client's browser to download Google's traffic directly.
- [ ] Task 1: Spoof the API to grab the raw `rr---googlevideo.com` CDN URLs (via Android TV spoofing).
- [ ] Task 2: Pass these raw URLs directly to the React Frontend. (Costs $0 server bandwidth).

### Phase 4: Ultra-Light Trimming Studio (Fix "0% Loading")
**Goal:** The Studio should open immediately without pre-downloading the whole video.
- [ ] Task 1: Mount the React `<video>` player strictly to the Phase 3 Raw CDN URL.
- [ ] Task 2: Send `Range: bytes=0-` headers intelligently so scrubbing the timeline doesn't crash the player.

### Phase 5: Offloaded FFmpeg Slicing
**Goal:** Fix the extremely slow cut process.
- [ ] Task 1: Completely delete the local Node.js `spawn(ffmpegPath)` logic in `downloader.ts`.
- [ ] Task 2: Configure the system so trimming happens either entirely on the client (via lightweight MediaRecorder API chunking if possible) OR securely on the pure Hetzner VPS, not Render.

### Phase 6: Bypass BotGuard & CORS Natively
**Goal:** Ensure the proxy tricks don't break.
- [ ] Task 1: Ensure the Hetzner Engine uses `--extractor-args "youtube:player_client=tv,ios"` to instantly shatter the PO-Token requirements.
- [ ] Task 2: Attach strict `Access-Control-Allow-Origin: *` to only the media endpoints so the React player never gets CORS blocked.

### Phase 7: UI "Aukat" State Polish
**Goal:** The UI should never lie or hang.
- [ ] Task 1: Add a rapid ping check; if the backend takes longer than 2 seconds, switch the UI to a "Waking up Engine..." text instead of hanging.
- [ ] Task 2: Render true resolutions (360p, 720p, etc.) only based on what the extraction payload actually returns, ditching any hardcoded ladders if they don't exist.

### Phase 8: Data Flow & Caching
**Goal:** Identical downloads shouldn't require re-scraping.
- [ ] Task 1: Implement an ultra-fast temporary memory cache for metadata. If two users paste the same URL in 1 hour, user 2 gets it in 10ms.

### Phase 9: Traffic Profiling & Defenses
**Goal:** Protect the 20TB Hetzner Cap.
- [ ] Task 1: Implement Nginx/Express Leaky Bucket `limit_req` for the extraction routes to instantly yield `429 Too Many Requests` to malicious bots.
- [ ] Task 2: Disable streaming for videos over 30 minutes to prevent server drain.

### Phase 10: Codebase Lockdown & Cleanup
**Goal:** Finalize the golden build.
- [ ] Task 1: Remove all dead code from the old local yt-dlp implementation.
- [ ] Task 2: Generate a final `V13_STABLE_SNAPSHOT.md` capturing the new, lightweight architecture.
