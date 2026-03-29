# 10-Phrase Rescue Plan: The Trimmer Engine Overhaul

1. **The Core Issue:** We hit a brick wall because `@ffmpeg/wasm` is silently freezing in your browser at `ffmpeg.load()`.
2. **The Cause:** Modern Chrome/Edge have strict security policies (`SharedArrayBuffer` and `COOP/COEP` headers) that block WebAssembly multi-threading, causing the background Worker to crash silently without throwing an error.
3. **The CDN Trap:** Loading a 25MB `.wasm` file via `toBlobURL` from an external CDN (`unpkg`) often triggers invisible Cross-Origin Resource Sharing (CORS) locks inside the Web Worker.
4. **The Weak Processor Reality:** Even if WASM loads, doing heavy video encoding inside a browser tab will crash older phones and freeze weak PCs, providing a bad user experience.
5. **The Alternative Strategy:** `yt-dlp` (our backend downloader) has a built-in feature called `--download-sections`. 
6. **The Backend Advantage:** Instead of downloading the *entire* video to the browser and slicing it locally, we can tell the server: *"Only download seconds 00:03 to 00:06 from YouTube"*.
7. **The Speed Boost:** This is 100x faster, uses 0% of the user's CPU, and completely bypasses the buggy WASM browser library.
8. **The Render Obstacle:** For `--download-sections` to work on the backend, the Render server must have `ffmpeg` installed on the operating system level.
9. **The Fallback WASM Fix:** If we *must* stay in the browser, we need to inject `Cross-Origin-Embedder-Policy: require-corp` into the Vite server to unblock the WASM thread, and use an explicit timeout to prevent infinite hanging.
10. **The Next Step:** I am deploying an immediate safety fallback in the WASM code so it doesn't hang forever, and terminating that stuck terminal prompt. Please review whether we should attempt the **Server-Side Trim (100x faster)** or try to force the **Browser WASM** to work by modifying Vite headers.
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
