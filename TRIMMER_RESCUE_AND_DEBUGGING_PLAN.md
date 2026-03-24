# 🔴 BongBari Trimmer Rescue & Debugging Execution Plan

This document outlines the strict, phased execution plan to rescue the YouTube Metadata & Trimmer pipeline, while explicitly introducing a **Diagnostic UI (The Sentinel Debugger)** and a **Low-Res Fast-Preview Strategy** to guarantee instant loading without infinite buffering.

---

## 🎯 Architectural Strategy for "Infinite Loading" Prevention
You raised a critical point: *Streaming raw high-quality video for just a preview can cause infinite loading.* 
**The Best Approach:** We will smartly force the metadata extractor to identify the **lowest resolution MP4 format** (e.g., 360p or 144p video+audio combined) specifically for the React Player preview. 
- **Why?** It requires vastly fewer bytes, buffering almost instantly over the proxy, allowing the user to select their trim timestamps immediately.
- **The Trim:** The actual trim command sent to the backend will grab the requested higher-quality stream, slice it via FFmpeg `fast-start`, and drop it directly to the user.

---

## 🟢 PHASE 1: Extract Authentic Video Metadata (The Data Recovery Protocol)
*Goal: Fix the Hetzner VPS mapping so it stops returning `formats: []` and `duration: 0`.*

- **Step 1A:** Modify `fetchSmartMetadata()` in `server/routes/downloader.ts` to fetch proper `duration` from the Hetzner JSON payload.
- **Step 1B:** Modify `fetchSmartMetadata()` to map the extracted formats from Hetzner into the standard object array. We must explicitly flag/extract a `previewUrl` (the lowest res `mp4`) to feed the frontend.
- **Validation 1:** Hit `/api/downloader/info` locally and verify `duration > 0` and `formats` contains actual resolution data.

---

## 🟢 PHASE 2: The Sentinel Debugger UI (Frontend Pipeline Health)
*Goal: Build an on-screen diagnostic log inside the `tsx` file to give us granular visibility over why the player lives or dies.*

- **Step 2A:** Inject a `<DebuggerConsole />` component into `YouTubeDownloader.tsx` (collapsible, fixed at the bottom/side).
- **Step 2B:** Implement state tracking for:
  - `Metadata Fetch Time` (e.g., `Metadata fetched in 1.2s`)
  - `Metadata Payload Health` (e.g., `[FAIL] formats array is empty` or `[OK] 5 formats loaded`)
  - `Player Buffer State` (e.g., `Attempting to mount player...`, `Player Ready in 0.8s`, `[WARNING] Player screen black/stalled`)
- **Step 2C:** Add a **"Copy Logs"** button to easily dump the pipeline state to the clipboard for debugging via chat.
- **Validation 2:** Paste a URL. The debugger UI must instantly populate with timings and health checks.

---

## 🟢 PHASE 3: React Player & Trimmer Resuscitation (The UI Revival)
*Goal: Connect the Phase 1 backend data to the Phase 2 UI, ensuring the player springs back to life.*

- **Step 3A:** Modify `handleInfo` on Express to intercept the raw Hetzner URL list and properly pack it into the exact `{ height, ext, url, resolution }` map that the React dropdowns and player expect.
- **Step 3B:** Update `YouTubeDownloader.tsx` to mount the React Player using the **Low-Res Fast-Preview URL** derived in Phase 1/3A. Monitor via the Sentinel Debugger.
- **Validation 3:** The Video Thumbnail, Title, and the functional **Trimmer Video Player** must instantly appear and play smoothly without infinite loading.

---

## 🟢 PHASE 4: High-Speed FFmpeg Trimming Injection (The Trim Protocol)
*Goal: With the preview playing smoothly, the actual trimming must execute instantly.*

- **Step 4A:** Ensure the UI "Trim & Download" button sends the correct `start` and `end` times directly into our `handleStream` bypass endpoint.
- **Step 4B:** Verify `fast-start` MP4 parameters are forced into the proxy stream so the video slices locally without rendering delays.
- **Validation 4:** Trim a 5-second slice locally. Monitor the Debugger UI for "Initiating trim constraint" -> It must pop up a 5-second `trimmed.mp4`.

---

### Strict Rules of Engagement
1. **No Code Monoliths:** We execute and test one specific step at a time.
2. **Local Verification:** No code is pushed to Production (`main`) until the Sentinel Debugger confirms a healthy 200 OK pipeline locally for at least one YouTube link.
3. **Focus Isolation:** Standard full downloads are deferred; we are hyper-focusing *ONLY* on low-res preview stability and tim