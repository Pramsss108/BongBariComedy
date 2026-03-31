# BongShare — Complete Architecture & Visual Reference

> **Last updated:** July 2025  
> **Product:** BongShare (by Bong Bari)  
> **Status:** Production — `www.bongbari.com/tools/share`

---

## 1. What Is BongShare?

BongShare is a premium file transfer tool that gives users **unlimited storage** through a clever **multi-host waterfall** — files are automatically routed to the best available free storage backend, with automatic fallback when any host fails. Zero sign-up, zero ads, zero limits.

**Three transfer modes:**

| Mode | Icon | Use Case | Needs Server? | Expiry |
|------|------|----------|---------------|--------|
| **P2P Transfer** | ⚡ Wifi | Instant browser-to-browser | No (STUN only) | Until both close tab |
| **Generate Link** | 🌐 Globe | Async sharing via URL | Filebin direct / GoFile via proxy | 6–10 days |
| **Bundle (multi-file)** | 📦 Archive | Multiple files in one link | Filebin direct | 6 days |

---

## 2. "Unlimited Storage" — How It Works

### The Storage Waterfall

BongShare doesn't host any files. It chains multiple free storage providers in a **priority waterfall** — if one fails, the next takes over automatically:

```
USER DROPS FILE(S)
       │
       ▼
┌─────────────────────────────────────────┐
│  LAYER 1: Filebin.net (Primary)         │
│  ✅ Direct CORS (no proxy needed)       │
│  ✅ 80 MB chunk splitting               │
│  ✅ Multi-file bundles via binId        │
│  ✅ 6-day expiry (auto-renews on view)  │
│  ❌ Only fails if Filebin is down       │
└───────────────┬─────────────────────────┘
                │ FAIL?
                ▼
┌─────────────────────────────────────────┐
│  LAYER 2: GoFile.io (Server Proxy)      │
│  🔄 Oracle VM → GoFile direct           │
│  🔄 Then: 5 best proxies (by latency)   │
│  🔄 Then: expand to 20 proxy pool       │
│  ✅ 10 GB per file                      │
│  ✅ 10-day expiry                       │
│  ❌ No CORS = needs backend proxy       │
└───────────────┬─────────────────────────┘
                │ ALL PROXIES FAIL?
                ▼
┌─────────────────────────────────────────┐
│  LAYER 3: P2P Fallback                  │
│  ✅ WebRTC DataChannel (zero server)    │
│  ✅ DTLS-SRTP encrypted                 │
│  ✅ Works behind any NAT via STUN       │
│  ❌ Both parties must be online         │
└─────────────────────────────────────────┘
```

### Why It Feels "Unlimited"

| Provider | Free Capacity | Our Trick |
|----------|---------------|-----------|
| **Filebin** | No stated limit per bin | We split large files into 80 MB chunks → reassemble on download |
| **GoFile** | 10 GB/file, unlimited uploads | We rotate through multiple upload servers |
| **P2P** | Literally no storage used | Direct browser-to-browser via WebRTC |

The user never sees host names or chunking — they just click "Generate Link" and get a `bongbari.com/s/...` URL.

---

## 3. Token Cloaking (URL Security)

Every share link is **encoded** so the underlying storage URLs are invisible:

```
Public URL:   www.bongbari.com/s/BaJ7d8k9xYz...
                                  └── encoded token
```

### Encoding Pipeline

```
SharePayload (JSON)
  ├─ { host: 'filebin', binId: 'abc123', fileName: 'video.mp4', ... }
  │
  ▼ encodeURIComponent() — handles Bengali/Unicode filenames
  ▼ XOR cipher (repeating key)
  ▼ btoa() → Base64Url (URL-safe, no padding)
  │
  = Final token in URL
```

**Cloaking Key:** `BongBariEtherealTerminal2026` (link mode)  
**P2P Key:** `BongBariP2PTerminal2026` (P2P tokens)

**Security properties:**
- Outsiders cannot decode share links without the key
- URLs contain zero raw storage host information
- File names are URI-encoded before ciphering (Bengali-safe)
- No server-side database needed — everything is in the token

### Share Payload Structure

```typescript
interface SharePayload {
  host: 'filebin' | 'gofile' | 'catbox' | 'litterbox';
  url: string;           // Direct download URL
  fileName: string;      // Original file name
  fileSize: number;       // Bytes
  binId?: string;         // Filebin bin ID
  chunks?: number;        // Number of 80MB chunks (if split)
  bundleUrl?: string;     // Bundle manifest URL (multi-file)
  expiresLabel?: string;  // "6 days" etc.
}
```

---

## 4. Filebin Chunked Upload (Large Files)

For files > 80 MB, BongShare splits them into chunks and uploads each separately:

```
2.5 GB video.mp4
  ├─ chunk_0 (80 MB) → filebin.net/{binId}/video.mp4_chunk_0
  ├─ chunk_1 (80 MB) → filebin.net/{binId}/video.mp4_chunk_1
  ├─ ...
  ├─ chunk_31 (partial) → filebin.net/{binId}/video.mp4_chunk_31
  └─ _manifest.json → filebin.net/{binId}/_manifest.json
```

**The `_manifest.json`** stores metadata for reassembly:

```json
{
  "version": 2,
  "files": [
    {
      "name": "video.mp4",
      "size": 2684354560,
      "chunks": 32,
      "chunkSize": 83886080
    }
  ]
}
```

### Reassembly on Download

```
User clicks "Download"
  ▼
Fetch _manifest.json from bin
  ▼
For each chunk (sequential):
  fetch(filebin.net/{binId}/{name}_chunk_{i})
  ▼ write to disk (FileSystem Access API on Chrome)
  ▼ or buffer in RAM (Firefox/Safari, ~2GB safe limit)
  ▼
Merge all chunks → save as original file name
```

**Important:** The `_manifest.json` is NEVER included in ZIP downloads — the client-side ZIP generator (`client-zip` library) only iterates over actual user files.

---

## 5. Bundle Downloads (Multi-File)

When multiple files are shared, BongShare creates a **bundle**:

```
User drops 5 files
  ▼
All uploaded to same Filebin bin
  + _manifest.json listing all 5 files
  ▼
Single share link generated
  ▼
Download page shows:
  ├─ Individual download buttons per file
  └─ "Download All as ZIP" button
```

### Client-Side ZIP Generation

We use the `client-zip` library (3KB, zero deps) to generate ZIPs in the browser:

```
"Download All as ZIP" clicked
  ▼
Async generator yields { name, input: ReadableStream } per file
  ▼ Multi-chunk files: concatenate chunk streams into one
  ▼ Single-chunk files: direct fetch stream
  ▼
client-zip streams → ZIP file
  ▼
Chrome/Edge: showSaveFilePicker (no RAM limit)
Firefox/Safari: Blob + download (safe up to ~2GB)
  ▼
User gets: BongShare-bundle.zip
```

**Key detail:** The generator skips `_manifest.json` — only real user files go into the ZIP.

---

## 6. P2P Transfer (WebRTC)

### Architecture

```
SENDER (Chrome/Firefox)              RECEIVER (any browser)
  │                                       │
  ├─ Load PeerJS from CDN                 │
  ├─ Create peer (unique ID)              │
  ├─ Generate share URL:                  │
  │   /p/{XOR-encoded token}              │
  │     ├─ peerId                         │
  │     ├─ fileName                       │
  │     └─ fileSize                       │
  │                                       │
  │ ──── user copies link ──────────────► │
  │                                       ├─ Decode token
  │                                       ├─ Connect to sender peer
  │       ◄── WebRTC handshake ──────────►│
  │                                       │
  │ == DataChannel established ==          │
  │                                       │
  ├─ Read file in 256KB chunks            │
  ├─ Backpressure: pause at 4MB buffer    │
  │   resume at 1MB                       │
  ├─ Send chunks sequentially             ├─ Receive chunks
  ├─ 10s keepalive pings                  ├─ Accumulate into Blob
  │                                       ├─ Show progress bar
  └─ Done                                 └─ Trigger download
```

### STUN Servers (NAT Traversal)

```
stun:stun.l.google.com:19302
stun:stun1.l.google.com:19302
stun:stun2.l.google.com:19302
stun:stun.cloudflare.com:3478
stun:global.stun.twilio.com:3478
```

### P2P Security

| Layer | Protection |
|-------|-----------|
| **Transport** | DTLS-SRTP (WebRTC native encryption) |
| **Data** | Direct browser-to-browser, zero server relay |
| **URL** | XOR-ciphered token (peer ID hidden) |
| **Discovery** | PeerJS signaling only (no file data passes through) |

---

## 7. Backend Proxy Architecture (Oracle Cloud VM)

**Host:** `79.76.110.66:5000` (Oracle Cloud Always Free)  
**OS:** Oracle Linux 9, 1 OCPU, 1GB RAM  
**Process:** PM2 `bongbari` → ESM Node.js bundle

### Proxy Upload Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/share/upload` | multipart | GoFile upload via proxy waterfall (4 layers) |
| `POST /api/share/upload-direct` | multipart | Catbox/Litterbox direct upload |
| `GET /api/share/gofile-health` | — | Diagnostics: test GoFile reachability |

### GoFile Proxy Waterfall (Server-Side)

```
Layer 1: Oracle VM → GoFile direct (8-12s timeout)
    ↓ fail
Layer 2-3: Top 5 proxies sorted by GoFile success rate + latency
    ↓ fail
Layer 4: Expand to 20 proxies from pool (10-15s per proxy)
    ↓ all fail
Response: { fallback: 'p2p', message: 'Use P2P Transfer instead.' }
```

### GoFile Servers (Fallback Pool)

```
store-eu-par-4, store-eu-par-5, store-eu-par-6
store-na-miami-1, store-na-miami-2
```

### Temp File Handling

```
Upload → /tmp/bongshare/{uuid}.ext
Process → upload to GoFile/Catbox
Cleanup → finally { fs.unlinkSync(filePath) }  // zero disk leak
```

---

## 8. Visual Reference — Upload Page

```
┌─────────────────────────────────────────────────────┐
│ HEADER (h-12, dark glass, border-b white/5)         │
│ ← Back    Bong[Share]    ⚡ Premium Transfer        │
│                          (gold "Share")              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SCREEN 1: DROP ZONE                                │
│  ┌─────────────────────────────────────────┐        │
│  │      ☁️  Upload                          │        │
│  │                                         │        │
│  │   Drag & drop files here                │        │
│  │   or click to browse                    │        │
│  │                                         │        │
│  │   "Drag koro, drop koro, life e first   │        │
│  │    time kichu koro." 🫠                  │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  SCREEN 2: MODE SELECTION                           │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ ⚡ P2P Transfer   │  │ 🌐 Generate Link │        │
│  │ Direct, instant   │  │ Share via URL    │        │
│  │ E2E encrypted     │  │ 6-10 day expiry  │        │
│  └──────────────────┘  └──────────────────┘        │
│                                                     │
│  SCREEN 3: UPLOAD PROGRESS                          │
│  ┌─────────────────────────────────────────┐        │
│  │ video.mp4 (2.5 GB)                      │        │
│  │ ████████████████░░░░ 78%                │        │
│  │ "Splitting into 32 parts..."            │        │
│  │ Host: filebin · Expires: 6 days         │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  SCREEN 4: SHARE LINK                               │
│  ┌─────────────────────────────────────────┐        │
│  │ ✅ Upload complete!                      │        │
│  │                                         │        │
│  │ bongbari.com/s/BaJ7d8k9xYz...          │        │
│  │                                         │        │
│  │ [📋 Copy Link]  [↗ Open in New Tab]     │        │
│  │                                         │        │
│  │ "Upload complete! Eta toh magic." ✨     │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER (h-3, subtle gold border)                    │
│ BONGSHARE | by Bong Bari        P2P · Link · Bundle │
└─────────────────────────────────────────────────────┘
```

---

## 9. Visual Reference — Download Page

```
┌─────────────────────────────────────────────────────┐
│ HEADER (h-12, dark glass, border-b white/5)         │
│ ← Back    Bong[Share]    ⚡ Premium Transfer        │
│                          💾 2.5 GB · filebin         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SINGLE FILE:                                       │
│  ┌─────────────────────────────────────────┐        │
│  │  🎬 video.mp4                            │        │
│  │  2.5 GB · 32 chunks · Expires: 6 days   │        │
│  │                                         │        │
│  │  [⬇️  Download (2.5 GB)]                │        │
│  │                                         │        │
│  │  ████████████░░░░░░░ 62%                │        │
│  │  "Part 21 of 32..."                     │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  BUNDLE (multi-file):                               │
│  ┌─────────────────────────────────────────┐        │
│  │  📦 Bundle: 5 files (847 MB total)       │        │
│  │                                         │        │
│  │  [📥 Download All as ZIP]               │        │
│  │                                         │        │
│  │  ├─ 🎬 video1.mp4 (450 MB)  [⬇️]       │        │
│  │  ├─ 🖼️ photo.jpg (12 MB)    [⬇️]       │        │
│  │  ├─ 📄 notes.pdf (2 MB)     [⬇️]       │        │
│  │  ├─ 🎵 song.mp3 (8 MB)      [⬇️]       │        │
│  │  └─ 📁 data.csv (375 MB)    [⬇️]       │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  Security badges (subtle, muted):                   │
│  🔒 E2E Encrypted  ·  ☁️ CDN Hosted                │
│                                                     │
│  Joke ticker:                                       │
│  "WeTransfer ke bolchi — tumi retired." 🪦           │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER (h-3, subtle gold border)                    │
│ BONGSHARE | by Bong Bari          animated joke     │
└─────────────────────────────────────────────────────┘
```

---

## 10. Visual Reference — P2P Receiver Page

```
┌─────────────────────────────────────────────────────┐
│ HEADER (h-14, dark glass, border-b white/5)         │
│ ← Back    Bong[Share]    ⚡ P2P Transfer            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │  📡 Receiving File...                    │        │
│  │                                         │        │
│  │  presentation.pdf (45 MB)               │        │
│  │                                         │        │
│  │  ████████████████████░░ 89%             │        │
│  │                                         │        │
│  │  Status: Transferring (40 MB / 45 MB)   │        │
│  │                                         │        │
│  │  🔒 Browser-to-Browser                  │        │
│  │  ⚡ E2E Encrypted (DTLS-SRTP)           │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │  ✅ Transfer Complete!                   │        │
│  │                                         │        │
│  │  [⬇️  Save presentation.pdf]            │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
├─────────────────────────────────────────────────────┤
│ FOOTER                                              │
│ BongShare       Browser-to-Browser · E2E Encrypted  │
└─────────────────────────────────────────────────────┘
```

---

## 11. Design System

### Colors

| Role | Value | Usage |
|------|-------|-------|
| **Gold Accent** | `#f0c12c` | Logo "Share", buttons, highlights, hover states |
| **Cyan Accent** | `#40ceed` | P2P indicators, info badges, secondary CTAs |
| **Muted Tan** | `#d1c5ad` | Secondary text, file sizes, timestamps |
| **Dark Gray** | `#9a907a` | Tertiary text, disabled states |
| **Background** | `#0e0e0f` | Page background |
| **Glass Card** | `rgba(27,27,27,0.4)` + `blur(24px)` | All cards, dropzones, modals |
| **Border** | `rgba(255,255,255,0.05)` | Card borders, dividers |
| **Footer Border** | `rgba(240,193,44,0.08)` | Subtle gold separator |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| **Logo** | Manrope | Bold | text-lg → text-xl |
| **Headers** | Manrope | Semibold | text-base → text-lg |
| **Body** | System default | Regular | text-sm |
| **Badges** | Manrope | Medium | text-[10px] |
| **Footer** | Manrope | Medium | text-[9px] → text-[10px] |

### Branding

```
Logo:     Bong[Share]
          ^^^^         white
              ^^^^^    gold (#f0c12c)

Badge:    ⚡ Premium Transfer
          (gradient bg, Zap icon, text-[9px])

Footer:   BONGSHARE | by Bong Bari     [context tagline]
          (uppercase, letter-spacing 2px)
```

---

## 12. Bengali Joke System

BongShare displays rotating Bengali jokes throughout the UX:

### Joke Categories

| Context | Count | Rotation |
|---------|-------|----------|
| **Idle** (drop zone) | 7 jokes | 5000ms cycle |
| **Uploading** | 4 jokes | During transfer |
| **Success** | 4 jokes | After completion |
| **P2P** | 4 jokes | During P2P transfer |
| **Download** | 20 jokes | 5000ms cycle on download page |

### Sample Jokes

```
IDLE:
  "Drag koro, drop koro, life e first time kichu koro." 🫠
  "File ta eto boro je WhatsApp boleche — NO." 😤
  "Tomar 4GB meme folder? Amra ready." 💪

DOWNLOAD:
  "Bong Bari theke file niccho — taste e Bengali, speed e rocket." 🚀
  "WeTransfer ke bolchi — tumi retired." 🪦
  "Google Drive er 15GB limit? Cute." 😂

SUCCESS:
  "Upload complete! Eta toh magic." ✨
  "File safe — amra toh bank er cheye trusted." 🏦
```

---

## 13. File Type Detection

| Extensions | Icon | Color |
|-----------|------|-------|
| mp4, mkv, avi, mov, webm | 🎬 | — |
| mp3, wav, flac, aac, ogg | 🎵 | — |
| jpg, jpeg, png, gif, webp, svg | 🖼️ | — |
| zip, rar, 7z, tar, gz | 📦 | — |
| pdf | 📄 | — |
| doc, docx, txt, md | 📝 | — |
| xls, xlsx, csv | 📊 | — |
| ppt, pptx | 📽️ | — |
| apk | 📱 | — |
| exe, msi | 💻 | — |
| Everything else | 📁 | — |

---

## 14. Infrastructure Map

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│                                                         │
│  React SPA (Vite + TypeScript)                          │
│    ├─ BongShare.tsx (upload)                             │
│    ├─ BongShareDownload.tsx (download)                  │
│    ├─ BongShareP2P.tsx (P2P receive)                    │
│    ├─ gofile-engine.ts (storage + token logic)          │
│    └─ p2p-engine.ts (WebRTC)                            │
│                                                         │
│  Direct connections:                                    │
│    ├──── filebin.net (CORS OK, direct upload/download)  │
│    ├──── PeerJS CDN (signaling only)                    │
│    └──── STUN servers (NAT traversal only)              │
└────────────────────────┬────────────────────────────────┘
                         │ GoFile/Catbox only
                         ▼
┌─────────────────────────────────────────────────────────┐
│              ORACLE CLOUD VM (Always Free)               │
│              79.76.110.66:5000                           │
│                                                         │
│  Express API (ESM) — PM2 managed                        │
│    ├─ POST /api/share/upload → GoFile proxy waterfall   │
│    ├─ POST /api/share/upload-direct → Catbox/Litterbox  │
│    └─ GET /api/share/gofile-health → Diagnostics        │
│                                                         │
│  Proxy Pool (20+ rotating proxies, sorted by latency)   │
│  Temp: /tmp/bongshare/ (auto-cleanup)                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              STORAGE PROVIDERS (Free Tier)               │
│                                                         │
│  Filebin.net    — Primary, CORS, 80MB chunks, 6d expiry │
│  GoFile.io      — Fallback, 10GB limit, no CORS, 10d   │
│  Catbox.moe     — Permanent, 4GB limit                  │
│  Litterbox      — 72hr, 1GB limit                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   GITHUB PAGES (Frontend)                │
│                   www.bongbari.com                       │
│                                                         │
│  Static SPA build (Vite → dist/public/)                 │
│  CNAME: www.bongbari.com                                │
│  404.html = index.html (SPA deep link routing)          │
│  Auto-deploy: push to main → GitHub Actions             │
└─────────────────────────────────────────────────────────┘
```

---

## 15. Key Source Files

| File | Purpose |
|------|---------|
| `client/src/pages/BongShare.tsx` | Upload/send page — drop zone → mode picker → progress → share link |
| `client/src/pages/BongShareDownload.tsx` | Download page — single/chunked/bundle downloads, client-side ZIP |
| `client/src/pages/BongShareP2P.tsx` | P2P receiver — WebRTC file reception |
| `client/src/lib/gofile-engine.ts` | Storage engine: Filebin chunking, GoFile, token encode/decode |
| `client/src/lib/p2p-engine.ts` | P2P engine: PeerJS loader, WebRTC DataChannel, backpressure |
| `server/routes/share.ts` | Backend proxy routes for GoFile/Catbox uploads |

---

## 16. Capacity Summary

| Metric | Value |
|--------|-------|
| **Max single file** | 10 GB (GoFile) / unlimited chunks (Filebin) |
| **Max bundle size** | Unlimited (Filebin chunking per file) |
| **Max files per bundle** | No hard limit (manifest-based) |
| **P2P max file** | No limit (browser RAM/disk permitting) |
| **Concurrent uploads** | 2 files at a time (bundle mode) |
| **Server storage used** | Zero (temp only, cleaned after each upload) |
| **Monthly cost** | $0 (Oracle Always Free + free storage providers) |

---

*This document is for internal reference. Do not share token encoding details publicly.*
