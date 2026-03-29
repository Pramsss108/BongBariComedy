# V13 Agent Transfer Protocol & Debrief
**Date: March 2026**

## Context & Objectives
You are picking up the development of the "BongBari Downloader / Trimmer Studio" currently in **v13**. 
The goal is **Zero Errors, Zero Lag, and Infinite Scale** using a strict subset of rules outlined here and in `TRIMMER_SCALING_ROADMAP.md`. Do not hallucinate or experiment blindly ("no hypnosis"); read the known issues and architectural laws carefully.

## What We Did (The March 2026 Fixes)

### Bug 1: The "95% Ghost Spin"
* **Symptom**: User experienced the UI loading bar stuck endlessly at 95% `Resolving Media Formats...`
* **Root Cause**: If the ASocks proxy timed out fetching the metadata from YouTube, the frontend React app in `SocialDownloaderPage.tsx` failed silently in the `try/catch` and didn't set the failure state. The loader simply spun forever without providing context.
* **The Fix**: Rewrote the `catch (err: any)` in the `handleFetch` function to safely log `err.message || 'Extraction timed out'` into `setErrorMsg` and transition the UI state to `"error"`. Now, UI will immediately bounce users to a clear failure layout instead of trapping them.

### Bug 2: The "Black Screen / Zero Byte Stream"
* **Symptom**: When a user finally got to the preview screen, the `<video>` player buffered for two seconds and then permanently turned black.
* **Root Cause Analytical Path**:
    - Network tabs proved SPA routing (404.html intercepts) was behaving normally.
    - We triggered manual `axios.head` and `curl` tests against Render's active `/proxy-stream` endpoint.
    - The endpoints were returning HTTP 200, but dropping the connection instantly with `0` actual content bytes transferred.
    - Inspecting `server/routes/downloader.ts` revealed that the backend was instantiating an `HttpsProxyAgent` pointing to our ASocks residential proxy for the actual gigabyte-heavy video stream pipeline (`proxyDirectStream`).
* **The Rule Violation**: Residential proxies are to be used STRICTLY for KBs of text metadata bypassing blocks. By forcing large video stream chunks through ASocks, the proxy throttled us immediately, severing the feed completely, destroying the file.
* **The Fix**: Completely stripped `let httpsAgent` and proxy dependencies out of the media streaming pipe. The Render host now leverages its brute-force gigabit datacenter connection to cleanly `X-Forward` the Google CDN video bytes straight back to the client. The video plays smoothly with a working interactive scrubber.

## Core Architectural Guardrails (Do Not Violate)

1. **The Separation of Pipes:**
   - **Phase 1 metadata (`yt-dlp`)**: Must use Residential Proxies (ASocks) to avoid YouTube blocking scraping.
   - **Phase 3 Preview Streaming (`/proxy-stream`)**: Do NOT use a proxy. The server hits the raw `url` fetched in Phase 1 and pipes it directly over its native connection.

2. **Progressive Disclosure UX:**
   - Pull metadata and the 480p preview URL first. Render only the interactive preview to the user.
   - Do NOT hit the backend again for formats. Parse `videoInfo.formats` out of the global cache, sort lowest-to-highest, and expose them ONLY when the user clicks the "Download Menu" or enters the "Trimmer".

3. **Deploy Constraints:**
   - When deploying via AI, always explicitly trace how caching breaks and never assume a working UI isn't backed by an underlying infrastructure bottleneck. Test API bounds before sending "It looks like it works" messages. 
   - Deploy script should strictly follow: `npm run deploy:safe`.

## Next Agent Checklist (If 95% block or Video issue still persists):
- [ ] Confirm if the latest commit has been pulled successfully by Render (the `/api/version` or logs might show a delay of 2-5 minutes).
- [ ] Refresh the frontend `Ctrl + F5` aggressively.
- [ ] Check Render Server Logs to ensure `ASocks` hasn't rate-limited the actual metadata call.
- [ ] Verify `SocialDownloaderPage.tsx` state machine transitions out of `.loading` under all failure branches.
---

> ## ~~RENDER~~ — BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | http://79.76.110.66:5000 |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions → Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**

---

> ## ~~RENDER~~ -- BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | `http://79.76.110.66:5000` |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions -> Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**
