# BongBari Studio Trimmer: CapCut-Level Engineering Plan

**Purpose**: A strict, anti-hallucination, 20-phase roadmap for AI agents to rebuild the Social Downloader Trimmer into a professional, lag-free, CapCut-style web editor. 

**Core Engineering Principle**: The current trimmer chokes because native HTML5 `<video>` tags struggle with rapid network scrubbing, and most standard browsers do not natively support HLS (`.m3u8`) without plugins. To achieve "CapCut" smoothness, the video **must be downloaded to browser memory (Blob Cache)** as a low-res MP4 before the trimmer opens, and React state must be decoupled from the raw playback loop.

---

## 🏗️ BLOCK 1: Memory Caching & Core Playback
*Goal: Stop streaming over the network. Cache the file locally in the browser so time-seeking is instant (0ms latency).*

- **Phase 1: Blob Caching Architecture**: Modify the `Preview` fetcher to completely download a low-res (360p/480p) MP4 video into browser RAM (`fetch() -> Blob`), rather than streaming it.
- **Phase 2: ObjectURL Binding**: Create `URL.createObjectURL(blob)` and bind *that* local URL to the `<video>` tag. This eliminates network buffering during playback and seeking.
- **Phase 3: HLS.js Implementation (Fallback)**: If the backend must use M3U8, implement `hls.js` properly attached to the video ref so segments are cached and managed professionally.
- **Phase 4: Decouple React State**: Purge `onTimeUpdate` state updates that cause React to re-render the whole component 60 times a second. Move time tracking to a `requestAnimationFrame` loop modifying DOM refs directly.
- **Phase 5: Precision Seek Optimization**: Implement `video.fastSeek()` where supported, and handle `video.currentTime` explicitly on pointer-move without forcing React renders.

> 🛑 **VIBE TEST 1 (Core Playback)**: Start the local server. Click "Trim Video". Wait for the cache loader. Play/Pause must work instantly. Dragging the native HTML slider must show the video frames updating instantaneously with zero loading spinners.

---

## 🎛️ BLOCK 2: Pro Scrubbing Engine
*Goal: Rebuild the interactive timeline to feel tactile, precise, and immune to edge-case bugs.*

- **Phase 6: Playhead & Handle Isolation**: Separate the left handle, right handle, and playhead into isolated components that manage their own pointer dragging coordinates via pure DOM matrix calculations (bypassing React state lag).
- **Phase 7: Custom Playback Engine (RAF Loop)**: Implement a `requestAnimationFrame` monitor that watches `videoRef.current.currentTime` and updates the playhead strictly via CSS transform `translateX` (GPU accelerated).
- **Phase 8: Time Clamping Logic**: Build the strict loop logic mathematically. If `playhead >= rightHandle`, set `currentTime = leftHandle` and cleanly trigger `play()`. 
- **Phase 9: Play/Pause Sync Refactor**: Re-wire the floating play/pause UI to listen to native `element.addEventListener('play')` and `('pause')`, ensuring zero desync between the video and the UI.
- **Phase 10: Scrubbing Stabilization**: Ensure that dragging a handle *pauses* the video, updates the frame sequentially, and instantly resumes (if it was playing before) when dropped.

> 🛑 **VIBE TEST 2 (Scrubbing Feel)**: Open trimmer. Vigorously drag the left and right handles back and forth. The video frame must scrub smoothly alongside the mouse. The playhead must perfectly loop between the bounds and never escape.

---

## 🎞️ BLOCK 3: Timeline UI & Visuals (The CapCut Look)
*Goal: The user needs to see the video frames in the timeline track.*

- **Phase 11: Frame Extraction Worker**: Create a Web Worker that reads the cached Blob and extracts a small array of 6 to 10 image frames (Canvas `toDataURL()`) evenly spaced across the video duration.
- **Phase 12: CSS Filmstrip Track**: Render the extracted frames as the background image of the timeline slider.
- **Phase 13: Dimming & Overlays**: Add CSS visual dark overlays to the left of the Start handle and to the right of the End handle, clearly showing what is being cut out.
- **Phase 14: Mobile Touch Enhancements**: Increase the invisible hit-box radius around timeline handles so fat-fingering on mobile easily grabs the handles.
- **Phase 15: Magnetic Snapping**: If the user scrubs the playhead very close to the start or end handles, magnetically snap it to the exact boundary millisecond.

> 🛑 **VIBE TEST 3 (Timeline Visualization)**: The timeline should now look like a filmstrip. Validate that the non-selected ends are dimmed. Validate that grabbing handles on a mobile simulation (DevTools) is effortless. 

---

## 🚀 BLOCK 4: Polish & Export
*Goal: Audio visuals, keyboard usability, and flawless handoff to the backend.*

- **Phase 16: Keyboard Shortcuts**: Add global event listeners inside the Studio mode: `Space` to Play/Pause, `Left/Right Arrows` to jog exactly 0.1 seconds backward/forward.
- **Phase 17: Audio Waveform Generator**: (Optional/Advanced) Use Web Audio API to map the volume of the video into a CSS waveform overlay on top of the filmstrip.
- **Phase 18: Exact Time String Forging**: Format the UI timecodes strictly as `00:00.0` (including deciseconds) for high precision.
- **Phase 19: Cache Cleanup Protocol**: Ensure that when the Studio is closed, `URL.revokeObjectURL()` is fired to free browser memory and prevent memory leaks on weak phones.
- **Phase 20: Perfect Backend Handoff**: Pass the exact `startPercent` and `endPercent` natively back to the `yt-dlp` processing endpoint ensuring precision cuts.

> 🛑 **VIBE TEST 4 (Production Polish)**: Hit spacebar to play. Tap arrow keys to micro-adjust frames. Verify exact decisecond values update. Trim a file, close the overlay, and ensure browser RAM isn't leaking (verify via Task Manager).

---
*Instructions for AI Agent executing this plan: Do not skip phases. Do not combine phases. Read the current phase, execute it, run the vibe test, and ask the user for confirmation before moving to the next block.*