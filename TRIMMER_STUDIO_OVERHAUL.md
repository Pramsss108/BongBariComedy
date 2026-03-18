# Trimmer Studio & Downloader Overhaul Report
*Date: March 18, 2026*

## 🚀 Overview
The BongBari Video Trimmer ("Studio") was suffering from extreme preview delays (up to a minute) before playback started, rendering it unusable. The scrubber was also glitching out, snapping backwards when dragging, and network requests were hitting `401 Unauthorized` blocks. 

This overhaul successfully shifted the architecture to a **Hybrid Model**: using blazing fast 480p proxy streams for instant trimming previews, while reserving the heavy, high-res yt-dlp backend for the final download.

---

## ✅ What We Did (The Solutions)
1. **The Cobalt Hybrid Architecture**: 
   - Swapped the Trimmer preview stream from our heavy backend to a dedicated proxy (`api.qwkuns.me` / Cobalt API).
   - Forced `vQuality=480` for the preview. This reduced the initial buffer load time from ~60 seconds to nearly instantaneous ("blazing fast").
2. **Fixed the 401 Unauthorized Fetch Bug**:
   - The direct `fetch` fetching the proxy stream for the `<video>` element was bypassing our custom `apiRequest` wrapper, so the `Authorization` header got stripped out.
   - **Fix**: Manually injected the session token into the URL query (`&sessionId=${sessionId||""}`) so the Express backend middleware successfully authenticates the preview request.
3. **Fixed the Slider "Bouncing / WTF" Logic**:
   - The React `requestAnimationFrame` loop (`enforceLoopBounds`) was continuously forcing the playhead back into the trim zone, even when the user paused the video to scrub.
   - **Fix**: Added an `if (vid && !vid.paused)` condition. If the user pauses to drag the scrubber, boundary enforcement shuts off so they can comfortably seek to their desired timestamps.
4. **UI Streamlining**:
   - Moved the Format, Video, and Audio quality selectors *into* the Studio Overlay so the user doesn't have to bounce between the main page and the trimmer to set up their final download.

---

## ❌ What Failed (The Dead Ends)
1. **Trying to Optimize the Original Hetzner/yt-dlp Stream for Previews**: 
   - We initially tried sticking to the original stream route, but it was fundamentally too heavy. Asking yt-dlp to stream a full 1080p payload chunk-by-chunk just for a preview was the root cause of the 1-minute delay. It had to be abandoned for the Cobalt proxy route.
2. **Forcing Strict Start Bounds on Playback**:
   - We originally tried forcing the player to instantly snap to the `startTime` if the user clicked play before the cut zone. This felt jarring and broken. We removed it so users can now comfortably play *into* their cut zone from earlier in the video.

---

## 🧠 What We Learned
1. **React Animation Frame vs. Native DOM Scrubbing**: 
   - Never run unchecked state enforcement on media elements while the user is actively holding/scrubbing it. Tying bounds-checking to the native `vid.paused` state is the cleanest way to prevent UI desync.
2. **URL Query Auth is Mandatory for HTML5 Media**:
   - Media elements (`<video src="...">`) and raw lightweight fetches don't carry React context headers. Our backend middleware `isAuthenticated` brilliantly checks `req.query.sessionId` as a fallback, which saved us from having to implement complex Blob fetching.
3. **Split Workloads are Better Workloads**:
   - Fast UX requires low-res data. The single greatest optimization was separating the **UX Preview Data** (480p fast proxy) from the **Final Output Data** (1080p/4k yt-dlp backend fetch). 

---

## ⏭️ What's Left (Next Steps)
1. **Test the Final Tripped Download**:
   - The trimming UX is smooth, but we still need a final physical test of the Download button to ensure the Hetzner backend successfully crops and delivers the chosen format based on the new Studio overlay settings.
2. **Monitor Cobalt Proxy (qwkuns)**:
   - Since the fast preview depends on the `api.qwkuns.me` Cobalt instance, we just need to keep an eye on it. If it ever goes down or rate-limits us, we may need to rotate the proxy URL in `server/routes/downloader.ts`.

*End of Report.*