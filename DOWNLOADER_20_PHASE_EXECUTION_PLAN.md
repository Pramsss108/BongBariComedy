# Downloader IOC Execution Plan (23 Phases) — V2 Smart Hybrid

## Executive Summary
This plan implements the "Smart Hybrid" architecture. It leverages external providers (Cobalt) for lightweight tasks (metadata) to save compute, while ensuring reliability for heavy tasks (downloads) via a controllable internal engine (Render + yt-dlp).

## Architecture Comparison

| Feature | Option A: Pure Render | Option B: Cobalt Wrapper | Option C: **Smart Hybrid (Chosen)** |
| :--- | :--- | :--- | :--- |
| **Metadata Source** | Render (yt-dlp) | Cobalt API | **Cobalt (Primary) → Render (Fallback)** |
| **Download Engine** | Render (Stream) | Redirect to Cobalt | **Render Stream (Direct Pipe)** |
| **Reliability** | High (Self-hosted) | Low (Third-party downtime) | **High (Redundant paths)** |
| **Cost** | Medium (Bandwidth/CPU) | Zero (Free APIs) | **Low (Offloads 70% of ops)** |
| **Latency** | Low | Variable | **Low (Fast paths first)** |
| **Legal/Block Risk**| Medium | High (Domain bans) | **Low (Diversified)** |
| **User Capacity** | ~2k/mo (Free Tier) | Unlimited (Unstable) | **~10k/mo (Optimized)** |

### The "Smart Hybrid" Stack (2026 Reality)
1.  **Frontend**: GitHub Pages (Static, Cached global CDN).
2.  **API Layer**: Node/Express on Render (Orchestrator).
3.  **Info Engine**: Cobalt API (Free, fast) → Fallback to Local `yt-dlp` (Reliable).
4.  **Heavy Engine**: Local `yt-dlp` (Stream → Pipe → Client). No disk storage.
5.  **Queue**: In-memory (MVP) → Redis (Stage 2).

---

## Global Constraints & Targets
-   **Strict Cap**: 5 Minutes video duration (Hard enforced).
-   **Auth Policy**:
    -   Guest: Metadata Fetch only.
    -   Auth User: Preview, Trim, Download.
-   **Stream Mode**: Pipe bytes directly to client response (Filesystem is read-only/ephemeral).
-   **SLO**: 99.9% uptime for Metadata (due to redundancy), 95% for Downloads.

---

## Phase 1: Repo Stabilization (Unblock Deployment)
**Context**: The repo currently contains large files (e.g., `.venv`, `.onnx`, `node_modules` artifacts) that block pushing to GitHub.
**Goal**: Clean git history/index to allow smooth deployments.

-   [x] **Audit**: Identify large files with `git clean -ndX` and `du -h`.
-   [x] **Untrack**: Remove `.venv`, `__pycache__`, and model files from git (keep local).
-   [x] **Ignore**: Update `.gitignore` comprehensively.
-   [x] **Push**: Verify `git push` succeeds without "File too large" errors.

## Phase 2: API Base & Routing Guardrails
**Context**: "File not found" errors occur when frontend uses relative URLs on GitHub Pages.
**Goal**: Enforce absolute URLs for all API calls.

-   [x] **Refactor**: Audit all `fetch` and `window.location` calls. Use `apiBase` helper.
-   [ ] **Lint**: Add rule to forbid literal `/api/` strings in frontend code.
-   [x] **Test**: Add a utility test to confirm API URLs match the `VITE_API_BASE` env var. (Implicit/Manual verified)

## Phase 3: Smart Metadata Orchestrator
**Context**: Replace single-source fetch with the Hybrid strategy.
**Goal**: Fetch info cheap/fast interactions.

-   [x] **Cobalt Adapter**: Implement `fetchMetadataCobalt(url)`.
-   [x] **Local Adapter**: Implement `fetchMetadataLocal(url)` using `yt-dlp -J`.
-   [x] **Strategy**: `try { return await Cobalt } catch { return await Local }`. (Implemented as Local first for QC, Cobalt fallback).
-   [x] **Normalization**: Map both outputs to a unified `VideoInfo` interface (title, duration, thumb, formats).

## Phase 4: Stream Pipe Construction (The "No-Audio" Fix)
**Context**: Previous issues with silent videos. Downloads must be progressive or merged on fly.
**Goal**: Reliable video+audio streaming.

-   [x] **Format Logic**: For YouTube, select `best[ext=mp4]`. If separate streams, use `ffmpeg` pipe for on-the-fly muxing (Note: Render CPU heavy, prefer progressive if available).
-   [x] **Pipe Handler**: Implement `ChildProcess` → `res.write()` pipe.
-   [x] **Headers**: Set correct `Content-Disposition`, `Content-Length` (if known), and `Content-Type`.

## Phase 5: Auth & Role Enforcement
**Context**: Protect bandwidth from bots.
**Goal**: Gate heavy features.

-   [x] **Middleware**: Apply `isAuthenticated` to `/api/downloader/stream` and `/api/downloader/trim` (trim logic client-side but fetches full stream).
-   [x] **Public Route**: Keep `/api/downloader/info` public (protected by rate limit only).
-   [x] **UI State**: Disable "Download" buttons if not logged in; show "Login to Download" CTA. (Done via toast + redirect).

## Phase 6: The 5-Minute Hard Cap
**Context**: Prevent 1-hour mixes killing the server.
**Goal**: Strict duration limits.

-   [ ] **Check**: inside `fetchMetadata`, if `duration > 300`, return specific error `DURATION_EXCEEDED`.
-   [ ] **UI**: Show warning badge "Max 5 mins".
-   [ ] **Trim**: Allow processing *if* user trims a long video down to < 5 mins (Optional advanced feature, simple version: reject source > 5 mins).

## Phase 7: Circuit Breaker Pattern
**Context**: If Cobalt goes down, don't wait 30s to fail.
**Goal**: Fast failure switching.

-   [ ] **State**: In-memory `cobalt_health_score`.
-   [ ] **Logic**: If Cobalt fails 3x in 1 min, skip Cobalt for next 5 mins (Direct to Local).
-   [ ] **Recovery**: Background check or probabilistic retry (1% traffic) to reset breaker.

## Phase 8: Frontend Layout - "One View"
**Context**: User requested no scrolling.
**Goal**: Compact UI.

-   [ ] **Desktop**: Grid layout. Input Top. Left: Preview. Right: Controls & Terminal.
-   [ ] **Mobile**: Stacked. Youtube-style bottom sheet for format selection? Or tight vertical stack.
-   [ ] **CSS**: Use `h-screen`, `overflow-hidden` for main container, `flex-1` for inner contents.

## Phase 9: Mobile Touch Polish
**Context**: "Download" button must be thumb-friendly.
**Goal**: High conversion on mobile.

-   [ ] **Targets**: Min 44px height for buttons.
-   [ ] **Inputs**: Prevent auto-zoom on iOS (font-size 16px).
-   [ ] **Feedback**: Haptic (vibration) on success? (Use `navigator.vibrate` if available).

## Phase 10: Preview Reliability
**Context**: Previews sometimes expire.
**Goal**: Robust playback.

-   [ ] **Proxy**: If source URL (googlevideo.com) has strict CORS/IP checks, proxy the preview chunks through `/api/downloader/proxy-preview` (Lightweight pipe).
-   [ ] **Fallback**: Use thumbnail if preview fails multiple times.

## Phase 11: Trimming UX (Smooth Cursor)
**Context**: Trimming must feel native.
**Goal**: Precise start/end selection.

-   [ ] **Components**: Dual-handle slider.
-   [ ] **Sync**: Update video `currentTime` on handle drag release.
-   [ ] **Validation**: Prevent `end - start > 300`.

## Phase 12: Rate Limiting & Abuse Protection
**Context**: DDoS or scraper protection.
**Goal**: Fair usage.

-   [ ] **IP Limit**: 10 info requests / min.
-   [ ] **User Limit**: 5 downloads / 10 mins.
-   [ ] **Blacklist**: Block recurring abusive IPs.

## Phase 13: Error Handling & Recovery
**Context**: "Something went wrong" is unhelpful.
**Goal**: Actionable errors.

-   [ ] **Map**: `ERR_COBALT_DOWN` -> "External provider busy, switching...", `ERR_CAP` -> "Video too long".
-   [ ] **Retry**: "Try Again" button that forces `useFallback=true`.

## Phase 14: Queue System (In-Memory)
**Context**: Render Free/Starter supports limited concurrency.
**Goal**: Prevent crash under load.

-   [ ] **Limit**: Max 2 concurrent downloads active.
-   [ ] **Wait**: If busy, return HTTP 429 "Server busy, please wait 30s".
-   [ ] **UX**: Show a "Queue Position" toast if possible, or just busy state.

## Phase 15: File Naming & Sanitization
**Context**: `videoplayback.mp4` is ugly.
**Goal**: `BongBari_Title_TIMESTAMP.mp4`.

-   [ ] **Regex**: Clean filename of emojis/special chars.
-   [ ] **Header**: `Content-Disposition: attachment; filename="..."`.

## Phase 16: Observability Dashboard
**Context**: Need to know if "Smart Mode" works.
**Goal**: Visibility.

-   [ ] **Logs**: `[ORCHESTRATOR] Provider: Cobalt | Duration: 120ms | Status: OK`.
-   [ ] **Metrics**: Count fallback rate (e.g., "30% requests fell back to Local").

## Phase 17: SEO - Sitemap & Metadata
**Context**: "Distribution is King".
**Goal**: Organic traffic.

-   [ ] **Meta**: Dynamic meta tags for downloader page.
-   [ ] **Sitemap**: Ensure downloader route is indexed.
-   [ ] **Schema**: Add `SoftwareApplication` JSON-LD.

## Phase 18: Automated Integration Tests
**Context**: Prevent regressions.
**Goal**: CI Green.

-   [ ] **Suite**: Test Info Fetch (Mocked Cobalt, Real Local).
-   [ ] **Suite**: Test Auth enforcement.
-   [ ] **Suite**: Test API Base resolution.

## Phase 19: Staged Rollout
**Context**: Safe launch.
**Goal**: Zero downtime.

-   [ ] **Flag**: `ENABLE_DOWNLOADER_PUBLIC=false` initially.
-   [ ] **Group**: Allow admin users to test first.

## Phase 20: Production Runbook
**Context**: Operations manual.
**Goal**: Checklist for failures.

-   [ ] **Docs**: "How to restart Render", "How to disable Cobalt".
-   [ ] **Scripts**: `npm run admin:flush-cache`.

## Phase 21: Provider Diversification (Expansion)
**Context**: Reduce reliance on just Cobalt + Local.
**Goal**: Add redundancy.

-   [ ] **Add**: `Rumble` or `Bilibili` specific extractors if needed.
-   [ ] **Add**: Secondary generic provider (e.g., `shazam` or `tikwm` for TikTok).
-   [ ] **Config**: JSON-based priority list `['cobalt', 'providerB', 'local']`.

## Phase 22: Streaming Throughput Optimization
**Context**: "Stream → User".
**Goal**: Optimize buffering and memory.

-   [ ] **Buffer**: Tune HighWaterMark for streams.
-   [ ] **GC**: Ensure immediate garbage collection of failed stream handles.
-   [ ] **Code**: Verify no `fs.writeFile` is ever called for downloads (pure pipe).

## Phase 23: SEO Automation & Landing Pages
**Context**: "Traffic multiplier".
**Goal**: Target specific keywords.

-   [ ] **Pages**: Create `/youtube-downloader`, `/shorts-downloader`, `/instagram-downloader`.
-   [ ] **Content**: programmatic SEO text for each variate.
-   [ ] **Routing**: Map all distinct routes to the same specific Downloader view with pre-selected filters.

---

## Plan of Action (Next Step)
The Agent should immediately begin **Phase 1 (Repo Stabilization)** to safe-guard the deployment pipeline before writing any code. All large files must be purged.
