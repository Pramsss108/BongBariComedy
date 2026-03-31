# BongShare Upgrade Plan V2 — Post-Deploy Bug Fixes & UX Overhaul

> **Created:** After first deployment of V1 upgrade (Circle FAB, Joke Ticker, Info Panel, Local Transfer)  
> **Priority:** Critical download bug first, then UX polish  
> **Approach:** Phase-by-phase — each phase ends with ✅ **DONE BOOM**  
> **Rule:** Do NOT skip ahead. Complete and verify each phase before starting the next.

---

## TABLE OF CONTENTS

| # | Phase | Priority | Status |
|---|-------|----------|--------|
| A | [Fix Chunked Download / Merge Bug](#phase-a) | 🔴 CRITICAL | ⬜ Not Started |
| B | [Shorten Share URLs (WhatsApp-safe)](#phase-b) | 🟠 HIGH | ⬜ Not Started |
| C | [Joke Ticker Redesign](#phase-c) | 🟡 MEDIUM | ⬜ Not Started |
| D | [Add "?" Info Panel to Upload Page](#phase-d) | 🟡 MEDIUM | ⬜ Not Started |
| E | [Local Transfer UX Overhaul](#phase-e) | 🟠 HIGH | ⬜ Not Started |
| F | [Large File (2+ GB) Future Planning](#phase-f) | ⚪ PLAN ONLY | ⬜ Not Started |

---

<a id="phase-a"></a>
## Phase A: Fix Chunked Download / Merge Bug 🔴 CRITICAL

### Problem Statement
A user shared a 258 MB file (`Darshana.mp4`) split into 4 × 80 MB filebin chunks. The download "failed" — either:
- Downloaded file was only a few KB (HTML error page instead of binary)
- Download appeared to complete but file was corrupted / couldn't play
- Merge step never finished (mobile RAM exhaustion)

### Root Cause Analysis (Verified via curl)

| Test | Result |
|------|--------|
| Filebin bin alive? | ✅ Yes — 4 files, 259 MB total, expires in 6 days |
| Direct chunk URL `GET` | ✅ 200 OK, 83,886,080 bytes (80 MB) downloaded |
| CORS headers | ✅ `Access-Control-Allow-Origin: *` on both filebin.net and storage.filebin.net |
| filebin redirect chain | `302` → S3 presigned URL → binary data |
| S3 `HEAD` request | ❌ 403 Forbidden (S3 presigned GET URLs reject HEAD) |
| Content-Disposition | `inline` on S3 (browser tries to PLAY video/mp4 instead of saving) |
| `VITE_FILEBIN_PROXY_BASE` | ❌ **EMPTY** — no CF Worker proxy deployed |

**Identified Root Causes:**

1. **S3 Content-Disposition `inline`** — When browser follows the 302 redirect, it may try to _play_ the video/mp4 chunk instead of treating it as a binary download. The `fetch()` API should handle this fine, but some mobile browsers may choke.

2. **Mobile RAM exhaustion (fallback path)** — On mobile devices without `showSaveFilePicker`, the code buffers ALL chunks as `Blob` objects in memory. For 258 MB, that means 258 MB in RAM simultaneously = crash on low-end phones.

3. **Possible HTML response on filebin** — If filebin returns a "Please read" interstitial HTML page instead of a 302 redirect (cookie/rate-limit), the `fetch()` gets HTML text, creates a tiny Blob, and triggers a ~2 KB download that appears successful but is actually garbage.

4. **No error feedback to user** — If any chunk fails, the generic error message doesn't explain what happened or offer retry.

### Fix Plan — Step by Step

#### A.1: Add response validation in `handleChunkedDownload`
**File:** `BongShareDownload.tsx`  
**What:** After each `fetch()` response, validate:
- `response.ok` (already exists)
- `Content-Type` is NOT `text/html` (reject HTML error pages)
- Response size > 1 KB (reject empty/tiny responses)
- If validation fails, show clear error: "This file host returned an error page. Try again or contact the sender."

**Why:** Prevents silent "successful" downloads of HTML error pages.

✅ **A.1 DONE BOOM**

---

#### A.2: Add per-chunk retry logic (3 attempts with backoff)
**File:** `BongShareDownload.tsx`  
**What:** Wrap each chunk fetch in a retry loop:
```
attempt 1 → fail → wait 1s → attempt 2 → fail → wait 3s → attempt 3 → fail → abort with clear error
```
Also add exponential backoff for the 302 → S3 redirect chain (some S3 presigned URLs expire quickly under load).

**Why:** Network hiccups on mobile cause single-attempt failures. 3 retries with backoff handles 95% of transient errors.

✅ **A.2 DONE BOOM**

---

#### A.3: Mobile download strategy — progressive download with service worker OR anchor tag fallback
**File:** `BongShareDownload.tsx`  
**What:** Replace the blob-in-memory fallback:

**Option 1 (preferred): Streamed download via hidden iframe/anchor per chunk**
- For each chunk, create a temporary `<a>` tag with `download` attribute
- But this downloads N separate files — not ideal for merge

**Option 2 (better): Use `StreamSaver.js` library (no npm — CDN)**
- `StreamSaver.js` creates a writable stream via a mitm.html service worker
- Works on mobile Safari/Chrome without `showSaveFilePicker`
- Streams chunks directly to disk, no RAM limit
- Fallback: if StreamSaver fails, use existing blob approach with a WARNING: "Large file — may be slow on this device"

**Implementation:**
1. Load `StreamSaver.js` from CDN (same pattern as PeerJS loader)
2. In the `else` branch of `handleChunkedDownload`, try StreamSaver first
3. If StreamSaver unavailable, fall back to blob + show warning for files > 100 MB
4. Add a "Downloading X MB — please wait" indicator with real progress

**Why:** 258 MB in-memory blob crashes phones. StreamSaver handles multi-GB files on mobile.

✅ **A.3 DONE BOOM**

---

#### A.4: Add download progress UI improvements
**File:** `BongShareDownload.tsx`  
**What:**
- Show chunk-level progress: "Part 2 of 4 — 45%"
- Show total bytes downloaded vs total size
- Show estimated time remaining (based on throughput of last chunk)
- On error, show specific message: "Part 2 failed — retrying (attempt 2/3)..."
- On complete, show "✅ Download complete — X MB saved"
- Add a "Cancel" button that aborts in-flight fetch

**Why:** User reported "merging is not happening" — they had no idea what was going on. Real-time progress eliminates confusion.

✅ **A.4 DONE BOOM**

---

#### A.5: (Optional) Deploy CF Worker proxy for filebin
**File:** `worker-filebin/`, `client/.env.production`  
**What:** Deploy the existing CF Worker code to handle filebin downloads:
- Worker fetches from filebin, follows 302, returns binary with correct `Content-Disposition: attachment`
- Forces `attachment` disposition (no browser media playback)
- Caches at the edge for faster repeat downloads
- Set `VITE_FILEBIN_PROXY_BASE` to deployed worker URL

**Why:** Eliminates ALL browser redirect/disposition issues. The CF Worker acts as a clean HTTP proxy that always returns downloadable binary. This is the most robust fix but requires CF Worker deployment.

**Note:** This is optional — A.1-A.4 should fix the bug for most users. Deploy the proxy as a permanent quality improvement later.

✅ **A.5 DONE BOOM**

---

<a id="phase-b"></a>
## Phase B: Shorten Share URLs (WhatsApp-safe) 🟠 HIGH

### Problem Statement
Current share URL for a 4-chunk filebin upload:
```
https://www.bongbari.com/s/XxXyYzZaAbBcCdDeEfFgGhHiIjJkKlLmMnNoO...
(~400 total characters)
```
WhatsApp, Telegram, and SMS truncate URLs beyond ~300 chars. Users see broken links.

### Root Cause
The share token encodes the FULL payload as XOR+base64url:
```json
{
  "c": "",
  "b": "bb-mncxq1i4-y98s4z7c",
  "urls": ["chunk_0000.mp4", "chunk_0001.mp4", "chunk_0002.mp4", "chunk_0003.mp4"],
  "n": "Darshana.mp4",
  "s": 258574008,
  "h": "filebin"
}
```
The `urls` array with 4 chunk names + filename + binId = massive token.

### Fix Plan — Step by Step

#### B.1: Compress the token payload — eliminate redundant data
**File:** `gofile-engine.ts` (encodeShareToken / decodeShareToken)  
**What:** Instead of storing the full `urls` array, store only the count and extension:
```json
// BEFORE (verbose):
{ "c": "", "b": "bb-mncxq1i4-y98s4z7c", "urls": ["chunk_0000.mp4", ...], "n": "Darshana.mp4", "s": 258574008, "h": "filebin" }

// AFTER (compact):
{ "c": "", "b": "bb-mncxq1i4-y98s4z7c", "k": 4, "x": "mp4", "n": "Darshana.mp4", "s": 258574008, "h": "filebin" }
```
- `k` = chunk count (was: full array of names)
- `x` = file extension (chunks are always `chunk_NNNN.{ext}`)
- Decoder reconstructs `urls` array: `["chunk_0000.mp4", "chunk_0001.mp4", ...]`

**Estimated savings:** ~80-120 chars in base64 token.

**Backward compatibility:** Keep decoding logic that handles old tokens with full `urls` array. New tokens use compact format.

✅ **B.1 DONE BOOM**

---

#### B.2: Shorten field names in payload
**File:** `gofile-engine.ts`  
**What:** Use single-char keys everywhere:
```json
// Current: { "c": "", "b": "binId", "n": "name", "s": size, "h": "filebin", "k": 4, "x": "mp4" }
// Already minimal — c, b, n, s, h, k, x are all 1 char
```
Also: if `c` is empty string (always is for filebin), omit it entirely. Decoder treats missing `c` as `""`.

**Estimated savings:** ~5-10 chars.

✅ **B.2 DONE BOOM**

---

#### B.3: Use pako/fflate gzip compression before base64 encoding
**File:** `gofile-engine.ts`  
**What:**
1. `JSON.stringify(payload)` → UTF-8 bytes
2. `fflate.deflateSync(bytes)` → compressed bytes (fflate is 8KB, tree-shakeable)
3. XOR cipher the compressed bytes
4. base64url encode

On decode: reverse the process.

**Estimated savings:** JSON compresses ~40-60% with deflate. A 200-byte JSON → ~100-120 bytes → ~140-160 base64 chars.

**Alternative:** If adding fflate feels heavy, skip this step — B.1 alone should bring the URL under 250 chars for most files.

**Note:** Must maintain backward compatibility — try to decode as compressed first, fall back to uncompressed for old tokens.

✅ **B.3 DONE BOOM**

---

#### B.4: (Future option) Server-side short codes
**What:** Store payload on Oracle backend, return a short code:
```
https://www.bongbari.com/s/Xk9mQ2  (6 chars)
```
Backend: `POST /api/share` → stores payload → returns code  
Download page: `GET /api/share/:code` → returns payload  

**Pros:** Shortest possible URLs. **Cons:** Requires backend DB, adds single point of failure, loses the zero-server-dependency design.

**Decision:** DEFER — B.1+B.2 should be sufficient. Only implement if URLs are still too long after compression.

✅ **B.4 DONE BOOM** (planning only)

---

<a id="phase-c"></a>
## Phase C: Joke Ticker Redesign 🟡 MEDIUM

### Problem Statement
User says the joke ticker is "very very bad looking" and "hard to read":
- Text is 11px italic at 35% opacity — nearly invisible
- CSS `marquee` scrolling at 60s for the full track — too fast for short text, too slow for long
- Looks like a cheap stock ticker, not a premium feature
- Present on BOTH upload (`BongShare.tsx`) and download (`BongShareDownload.tsx`) pages

### Fix Plan — Step by Step

#### C.1: Replace CSS marquee with "one-at-a-time" fade animation
**Files:** `BongShare.tsx`, `BongShareDownload.tsx`, `index.css`  
**What:** Instead of a continuous scrolling marquee:

**New behavior — "Joke of the moment":**
1. Show ONE joke at a time, centered in the bar
2. Fade in from opacity 0 → 1 (0.5s ease)
3. Hold for 5 seconds
4. Fade out from opacity 1 → 0 (0.5s ease)
5. Next joke fades in
6. Loop through all jokes, then restart

**Implementation:**
- Use `useState` for current joke index + `useEffect` with `setInterval(6000)` to cycle
- Framer Motion `AnimatePresence` with `mode="wait"`:
  ```tsx
  <AnimatePresence mode="wait">
    <motion.span
      key={jokeIndex}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.5 }}
    >
      {jokes[jokeIndex]}
    </motion.span>
  </AnimatePresence>
  ```

**Why:** One-at-a-time is readable, elegant, and premium. Marquee scrolling looks cheap on dark UI.

✅ **C.1 DONE BOOM**

---

#### C.2: Increase text size and improve styling
**Files:** `BongShare.tsx`, `BongShareDownload.tsx`  
**What:**
- Increase from `text-[11px]` to `text-[13px]` (readable on mobile)
- Change from italic to normal weight with a subtle `tracking-wide`
- Increase opacity from 35% to 60%: `color: 'rgba(240,193,44,0.6)'`
- Add a subtle glow: `textShadow: '0 0 12px rgba(240,193,44,0.15)'`
- Center the text in the bar with `text-center`
- Increase bar height from `h-7` to `h-9` to give breathing room

**Why:** Bigger text + higher contrast + centered layout = actually readable.

✅ **C.2 DONE BOOM**

---

#### C.3: Contextual jokes per page state
**Files:** `BongShare.tsx`, `BongShareDownload.tsx`  
**What:**
- Upload page idle: show `IDLE_JOKES`
- Upload page uploading: show `UPLOAD_JOKES`
- Upload page success: show `SUCCESS_JOKES`
- Download page: show `DOWNLOAD_JOKES`
- Local transfer: show `LOCAL_JOKES`

Transition to the correct joke set when page state changes.

**Why:** Shows relevant humor instead of a random dump of all jokes.

✅ **C.3 DONE BOOM**

---

#### C.4: Remove old CSS marquee keyframe
**File:** `index.css`  
**What:** Remove or deprecate the `@keyframes bongshare-marquee` animation since we're no longer using it. Keep it if other parts of the site use it; otherwise delete to reduce CSS bloat.

✅ **C.4 DONE BOOM**

---

<a id="phase-d"></a>
## Phase D: Add "?" Info Panel to Upload Page 🟡 MEDIUM

### Problem Statement
The "?" info button and slide-in panel were added to `BongShareDownload.tsx` (download page) but NOT to `BongShare.tsx` (upload page). Users on the upload page have no way to learn what BongShare is.

### Fix Plan — Step by Step

#### D.1: Extract info panel into a shared component
**File:** NEW `client/src/components/BongShareInfoPanel.tsx`  
**What:** Extract the info panel JSX (the "?" button + backdrop + slide-in panel with all 5 sections) from `BongShareDownload.tsx` into a reusable component.

Props:
```ts
interface BongShareInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

Also extract the "?" floating button into the same file or as a separate `BongShareInfoButton` component.

**Why:** DRY — same panel should appear on both pages without copy-paste.

✅ **D.1 DONE BOOM**

---

#### D.2: Add info panel to upload page
**File:** `BongShare.tsx`  
**What:**
1. Add `const [infoOpen, setInfoOpen] = useState(false)`
2. Import and render `<BongShareInfoPanel isOpen={infoOpen} onClose={() => setInfoOpen(false)} />`
3. Add the "?" floating button (bottom-left, same position/style as download page)

**Why:** Users can now learn about BongShare from either page.

✅ **D.2 DONE BOOM**

---

#### D.3: Update download page to use shared component
**File:** `BongShareDownload.tsx`  
**What:** Replace the inline info panel JSX with the new `<BongShareInfoPanel>` component. Remove ~100 lines of duplicated JSX.

✅ **D.3 DONE BOOM**

---

<a id="phase-e"></a>
## Phase E: Local Transfer UX Overhaul 🟠 HIGH

### Problem Statement
Current Local Transfer is barebones:
- Just shows a 6-digit code — no explanation of what to do
- No QR code for phone-to-phone (typing 6 digits on phone is annoying)
- No device discovery / auto-scanning animation
- No explanation of "same WiFi" requirement
- Device names are generic (no personality)
- Receive code input is awkwardly placed on the upload page

### Fix Plan — Step by Step

#### E.1: Add QR code for the 6-digit pairing code
**Files:** `BongShare.tsx` (sender screen)  
**What:**
- When Local Transfer sender shows the 6-digit code, ALSO show a QR code encoding:
  ```
  https://www.bongbari.com/tools/share?local=123456
  ```
  (The URL auto-opens BongShare and pre-fills the receive code)
- Use `qrcode` npm package (or CDN-loaded `qrcode-generator` to avoid npm dep)
- QR code should be gold-on-dark, matching the BongShare theme
- Show both: big 6-digit code text + QR code below it
- Label: "Scan with phone camera" / "Or type the code"

**Why:** Phone-to-phone transfers become instant — scan QR, done. No typing needed.

✅ **E.1 DONE BOOM**

---

#### E.2: Auto-fill receive code from URL parameter
**File:** `BongShare.tsx`  
**What:**
- On page load, check for `?local=XXXXXX` URL parameter
- If present, automatically switch to Local mode → Receive mode → pre-fill the code → auto-connect
- Show brief "Connecting to sender..." animation

**Why:** Works with the QR code from E.1 — scan → opens page → auto-connects.

✅ **E.2 DONE BOOM**

---

#### E.3: Add "same WiFi" explanation UI
**File:** `BongShare.tsx` (Local mode section)  
**What:** When user selects "Local" mode, show a brief explanation BEFORE showing send/receive:
```
┌──────────────────────────────────────┐
│  📡 Local Transfer                   │
│                                      │
│  Send files at LAN speed to any      │
│  device on the SAME WiFi network.    │
│                                      │
│  ⚡ No internet needed               │
│  🔒 Files never leave your network   │
│  📱 Works: Phone ↔ PC ↔ Tablet      │
│                                      │
│  [Send a File]   [Receive a File]    │
└──────────────────────────────────────┘
```

**Why:** Users don't understand what "Local" means. Brief explanation + trust signals.

✅ **E.3 DONE BOOM**

---

#### E.4: Fun Bong Bari device names (NOT cheap names)
**File:** `p2p-engine.ts` or new `client/src/lib/device-names.ts`  
**What:** Generate fun, cute, Bong Bari-style device names for connections:

**GOOD names (cute, fun, brand-aligned):**
- "Cute Pangolin 🦔"
- "Jigri Dost 🤝"
- "Golden Macaw 🦜"
- "Mishti Chhana 🍰"
- "Rocket Roshogolla 🚀"
- "Bong Bari Explorer 🗺️"
- "Neon Butterfly 🦋"
- "Stellar Fox 🦊"
- "Crystal Dolphin 🐬"
- "Thunder Panda 🐼"

**BAD names (DON'T use — cheap, generic, cringe):**
- ❌ "Rajesh Babu"
- ❌ "Device_1"
- ❌ "User ABC"
- ❌ "Phone123"

**Implementation:**
- Array of ~30-50 fun names
- Randomly pick one when creating a local sender/receiver
- Show in UI: "Connected to **Thunder Panda** 🐼"
- The name is purely cosmetic — doesn't affect the 6-digit code mechanism

**Why:** Makes the experience delightful and on-brand. The names should make users smile.

✅ **E.4 DONE BOOM**

---

#### E.5: Device type detection (phone vs PC)
**File:** `BongShare.tsx`  
**What:** Detect if the current device is phone or desktop:
```ts
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
```
- Show relevant icon: 📱 for phone, 💻 for desktop
- Customize UI hints:
  - On phone: "Open bongbari.com on your PC to receive"
  - On PC: "Open bongbari.com on your phone to receive"
- Show connected device type when transfer starts

**Why:** Users get contextual guidance. "Open on your PC" is way more helpful than "Enter code on other device."

✅ **E.5 DONE BOOM**

---

#### E.6: "Scanning nearby devices" animation
**File:** `BongShare.tsx`  
**What:** When the Local sender is waiting for a receiver:
1. Show a radar/sonar animation (concentric circles expanding outward)
2. Text: "Waiting for a friend to connect..."
3. Below: the 6-digit code (large, tappable to copy) + QR code
4. When receiver connects: animation transitions to connected state with device name + emoji

**Visual concept:**
```
     ╭───────────────╮
     │   ((( 📡 )))  │  ← radar animation
     │               │
     │  Waiting...   │
     │               │
     │  CODE: 847291 │
     │  [QR CODE]    │
     │               │
     │  "Scan or     │
     │   type code"  │
     ╰───────────────╯
```

**Implementation:** CSS keyframe animation for the radar rings. Use 3 concentric circles with staggered animation delays.

✅ **E.6 DONE BOOM**

---

#### E.7: Receiver UX — code input improvements
**File:** `BongShare.tsx`  
**What:**
- Move receive code input to a dedicated "Receive" screen (not awkwardly mixed with upload UI)
- Use 6 individual digit boxes (like OTP input) instead of a single text field
- Auto-focus first box, auto-advance on digit entry
- Auto-connect when all 6 digits entered (no "Connect" button needed)
- Show "Connecting..." spinner when code is complete
- If connection fails: clear boxes, show "Code not found — try again"

**Visual:**
```
┌──────────────────────────────────────┐
│  Enter the 6-digit code from sender  │
│                                      │
│     ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐       │
│     │8│ │4│ │7│ │2│ │9│ │1│         │
│     └─┘ └─┘ └─┘ └─┘ └─┘ └─┘       │
│                                      │
│  Or scan the QR on sender's screen   │
│  📷 [Open Camera]                    │
└──────────────────────────────────────┘
```

**Why:** OTP-style input is universally understood on phones. No friction.

✅ **E.7 DONE BOOM**

---

#### E.8: Transfer progress screen upgrade
**File:** `BongShare.tsx`  
**What:** When transfer is in progress:
- Show sender/receiver device names + emojis
- Progress bar (animated, gold gradient)
- Speed indicator: "12.4 MB/s"
- Bytes transferred: "45 MB / 258 MB"
- ETA: "~18 seconds remaining"
- On complete: celebratory animation (confetti or gold sparkle burst)
- "Send Another" button after completion

**Why:** Clear visual feedback during transfer builds trust and delight.

✅ **E.8 DONE BOOM**

---

<a id="phase-f"></a>
## Phase F: Large File (2+ GB) Future Planning ⚪ PLAN ONLY

> **NOTE:** This is a PLAN for future implementation. Do NOT implement now.

### Challenge
User wants to share 2.29 GB files. Current architecture can handle this in theory:
- Filebin accepts up to 100 GB per bin
- CHUNK_SIZE = 80 MB → 2.29 GB = ~30 chunks
- Upload works fine (XHR per chunk)
- Download is the problem:
  - Desktop `showSaveFilePicker` → ✅ can stream 30 chunks
  - Mobile blob fallback → ❌ 2.29 GB in RAM = crash

### Future Solutions (Ranked)

#### F.1: StreamSaver.js for mobile (from Phase A.3)
If A.3 is implemented, mobile can already handle 2+ GB via streamed downloads. This is the primary solution.

#### F.2: Increase chunk size for large files
Currently: `CHUNK_SIZE = 80 MB` (fixed)  
Proposed: Dynamic chunk sizing:
- Files < 500 MB → 80 MB chunks (current)
- Files 500 MB - 2 GB → 200 MB chunks (fewer parts, faster merge)
- Files 2 GB - 10 GB → 500 MB chunks (10-20 parts max)

Benefits: Fewer chunks = shorter URL tokens, fewer HTTP round-trips, faster downloads.
Trade-off: Larger chunks = higher RAM usage per chunk during upload XHR.

#### F.3: Resume support (interrupted downloads)
Add resume capability:
- Store download progress in `localStorage`
- If user refreshes or connection drops, offer "Resume from Part 15 of 30"
- Use `Range` headers to resume partial chunks (requires proxy — filebin's S3 supports Range)

#### F.4: Parallel chunk downloads
Download multiple chunks simultaneously (3-4 concurrent fetches) instead of sequential:
- Dramatically faster on high-bandwidth connections
- Must manage memory carefully (don't buffer more than 2 chunks ahead)
- Desktop+StreamSaver: write chunks in order, fetch out of order

#### F.5: Upload progress per chunk
Currently upload shows overall progress. For 30-chunk uploads:
- Show per-chunk progress bar
- Show "Uploading part 12 of 30 — 45%"
- Add retry per chunk on failure
- Add pause/resume capability

### Token Size for 30 chunks
With B.1 optimization (store count+ext, not full array):
```json
{ "b": "bb-mncxq1i4-y98s4z7c", "k": 30, "x": "mp4", "n": "BigFile.mp4", "s": 2458000000, "h": "filebin" }
```
Token length: ~120 base64 chars → URL total: ~160 chars. **Already WhatsApp-safe** with B.1.

---

## Implementation Order

```
Phase A (download fix) → Phase B (URL shortening) → Phase C (ticker) → Phase D (info panel) → Phase E (local transfer)
```

Phase A is CRITICAL — do it first, test with the real 258 MB file.  
Phases C and D are quick wins — can be done in parallel.  
Phase E is the largest UX effort — do last, in sub-steps.  
Phase F is planning only — implement when user requests 2+ GB support.

## Verification Checklist (After Each Phase)

- [ ] **Phase A:** Download the 258 MB Darshana.mp4 test file on both desktop and mobile. File plays correctly.
- [ ] **Phase B:** Share a filebin link → paste into WhatsApp → link is not truncated → recipient can open it.
- [ ] **Phase C:** Joke ticker shows one joke at a time, fading in/out, readable text, not ugly.
- [ ] **Phase D:** "?" button visible on upload page (bottom-left). Tap → info panel slides in with all 5 sections.
- [ ] **Phase E:** Local Transfer: QR code shows → scan with phone → auto-connects → file transfers with progress → fun device name shows.
- [ ] **Phase F:** (Future) 2+ GB file uploads and downloads work on both desktop and mobile.

---

## Files to Edit (Summary)

| File | Phases |
|------|--------|
| `client/src/pages/BongShareDownload.tsx` | A, C, D |
| `client/src/pages/BongShare.tsx` | C, D, E |
| `client/src/lib/gofile-engine.ts` | B |
| `client/src/lib/p2p-engine.ts` | E |
| `client/src/components/BongShareInfoPanel.tsx` | D (NEW) |
| `client/src/lib/device-names.ts` | E (NEW) |
| `client/src/index.css` | C, E |
| `worker-filebin/` | A (optional) |
| `client/.env.production` | A (optional) |

---

*Plan created after real-world testing revealed broken downloads, ugly ticker, and missing UX on the V1 upgrade deployment.*
