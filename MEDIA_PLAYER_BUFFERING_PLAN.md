# Media Player Buffering & Lag Resolution Plan

## 🚨 The Current Problem (Why it lags & freezes)
Right now, when the "Studio Dominator" player opens, it uses a **Live Proxy Stream URL** (`/api/downloader/stream?mode=preview`) directly in the `<video src="...">` tag. 

**Why this breaks:**
1. **No Range Seeking:** `yt-dlp` streaming over HTTP pipes does not support instant "Range Requests." When you drag the slider or seek, the browser asks the server for "byte 500000". The server struggles to jump there, causing massive pauses/freezes.
2. **Tab Sleeping:** When you switch tabs, Chrome pauses the live video. Because it's a live pipe, the connection drops or stalls out, so returning to the tab results in a frozen player.
3. **Dancing Play/Pause:** Every time the network stutters, the video stops playing to buffer, which ruins the smooth editing experience.

## ✨ The Solution: Local "Blob" Caching (In-Browser RAM)
Just like professional web video editors (e.g., CapCut Web, Canva Web), we must **fully download the video into the browser's temporary memory (RAM Cache) first**, and then play it from the local machine.

### The Pipeline:
1. **Fetch to Cache:** User clicks "Start" -> We use `fetch()` to download the preview MP4 in the background.
2. **Blob Conversion:** We convert the response into a local file blob (`URL.createObjectURL(blob)`).
3. **Instant Playback:** We feed that Local URL to the video player. 
   - *Result:* 0ms latency seeking. No lag when hitting play/pause. Guaranteed background stability.
4. **Auto-Cleanup:** When the user closes the video, we run `URL.revokeObjectURL()` to delete the file from the PC's RAM so it doesn't crash the browser.

## 🛠️ Execution Steps
1. **State Update:** Add `isBufferingToRAM` state to `SocialDownloaderPage.tsx`.
2. **Modify `handlePreview`:** Wrap the API stream request into a background `fetch()` promise that downloads the file as a Blob.
3. **UI Feedback:** Show a sleek loading percentage / message ("Loading asset into Studio RAM...") before the player appears.
4. **Clean up Rules:** Add `useEffect` to destroy object URLs when unmounting.

*Let's execute this implementation in `SocialDownloaderPage.tsx`.*