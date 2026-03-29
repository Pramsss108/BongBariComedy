# 🔥 BONG SHARE — SERVER-SIDE PROXY UPLOAD PLAN
> **Date:** March 28, 2026  
> **Status:** ENGINEERING BLUEPRINT — Zero-Failure-Tolerance  
> **Priority:** CRITICAL — GoFile upload is completely broken at user's ISP level

---

## 🎯 ROOT CAUSE (Confirmed — March 2026)

```
DIAGNOSIS:
  curl.exe https://api.gofile.io/servers  → Resolving timed out (10 013 ms)
  curl.exe https://gofile.io              → Resolving timed out (10 012 ms)

ROOT CAUSE #1: GoFile.io DNS is not resolving from user's ISP/network
ROOT CAUSE #2: GoFile.io MAY be blocked on Render datacenter IPs too
ROOT CAUSE #3: Browser XHR directly to GoFile = always fails in this network
```

**Current BongShare flow (BROKEN):**
```
Browser → XHR → GoFile.io ❌ DNS BLOCK ❌
```

**Target flow (BULLETPROOF):**
```
Browser → POST /api/share/upload → Render Server → [optional proxy] → GoFile.io ✅
```

---

## 🏗️ FULL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BROWSER (client)                                                         │
│                                                                          │
│  gofile-engine.ts (updated)                                              │
│  ┌─────────────┐                                                         │
│  │ uploadFile()│── POST multipart ──▶                                    │
│  └─────────────┘                   │                                     │
└───────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼ /api/share/upload
┌─────────────────────────────────────────────────────────────────────────┐
│ RENDER SERVER (Bongbaricomedy.onrender.com)                              │
│                                                                          │
│  server/routes/share.ts (NEW FILE)                                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │                    WATERFALL LOGIC                           │        │
│  │                                                              │        │
│  │  LAYER 1: Direct to GoFile (no proxy, fastest path)         │        │
│  │  ↓ (if fails: ETIMEDOUT / ECONNREFUSED / status ≠ ok)       │        │
│  │  LAYER 2: Try top-5 proxies from pool (sorted by latency)   │        │
│  │  ↓ (if all 5 fail)                                          │        │
│  │  LAYER 3: Expand to ALL proxies in pool (up to 20)          │        │
│  │  ↓ (if none work)                                           │        │
│  │  LAYER 4: Return structured error → browser shows P2P CTA   │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Direct or via SocksProxyAgent/HttpsProxyAgent
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ GoFile.io                                                                │
│  GET  /servers        → pick best server name                           │
│  POST /uploadFile     → upload binary                                   │
│  ← { status: "ok", data: { code, downloadPage, ...} }                  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                         Response piped back to browser
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BROWSER again                                                            │
│  buildBongBariShareUrl(data.code, file.name, file.size)                 │
│  → bongbari.com/s/TOKEN  ✅                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 PACKAGES AVAILABLE (all already in package.json ✅)

| Package | Use |
|---|---|
| `multer@2.1.0` | Parse multipart upload from browser |
| `node-fetch@3.3.2` | Server-side fetch to GoFile |
| `https-proxy-agent@8.0.0` | HTTP/HTTPS proxy support |
| `socks-proxy-agent@9.0.0` | SOCKS5 proxy support |
| `axios@1.11.0` | Fallback HTTP client |

**DO NOT add new npm packages — fully covered.**

---

## 🔧 IMPLEMENTATION PHASES

---

### ✅ PHASE 0 — Health Check Endpoint (Test if Render can reach GoFile)

**File:** `server/routes/share.ts` (NEW)

```typescript
// GET /api/share/gofile-health
// Tests if Render can reach GoFile directly — no proxy
app.get('/api/share/gofile-health', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout('https://api.gofile.io/servers', {}, 8000);
    const json = await resp.json();
    if (json.status === 'ok') {
      return res.json({ reachable: true, servers: json.data.servers.length });
    }
    res.json({ reachable: false, reason: 'bad_status' });
  } catch (err: any) {
    res.json({ reachable: false, reason: err.message });
  }
});
```

**Why:** Before we build proxy fallback, we need to know if Render itself can reach GoFile. 
This endpoint lets us test live from the admin panel.

---

### ✅ PHASE 1 — Server-Side Upload Endpoint (CORE ENGINE)

**File:** `server/routes/share.ts`

**Key design decisions:**
- Use `multer({ dest: '/tmp/bongshare' })` — disk storage, avoids OOM on Render (tmp has ~1GB)
- Stream the file from disk to GoFile using `node-fetch` + `FormData` (Node 18 built-in)
- Auto-cleanup `/tmp/bongshare` file after upload regardless of success/failure
- 10GB file size limit (matches GoFile's limit)
- Return same response structure that the existing `gofile-engine.ts` expects

**Route:** `POST /api/share/upload`
- Accepts: `multipart/form-data` with field `file`
- Returns: `{ status: "ok", data: { code, downloadPage, fileName, fileSize } }`
- Or error: `{ status: "error", message: "...", fallback: "p2p" }`

**Upload function signature:**
```typescript
async function uploadToGoFileWithFallback(
  filePath: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<GoFileUploaderData>
```

**Internal waterfall:**
```
1. fetchGoFileServer(null)           // direct, no proxy
2. fetchGoFileServer(proxies[0])     // fastest proxy
3. fetchGoFileServer(proxies[1])     // second fastest
... up to 5 proxy attempts
```

---

### ✅ PHASE 2 — Proxy Pool Integration

**Key function:** 
```typescript
async function getBestProxiesForGoFile(limit: number = 5): Promise<string[]>
```

**Logic:**
- Call `ProxyKitchen.getLiveProxies()`
- Filter: `failCount < 2` (not near-dead)
- Sort by: `latencyMs` ascending (fastest first)
- If `gf` field exists on platforms, prefer those (Phase 4 adds GoFile testing)
- Take top `limit` proxies
- Return their URLs

**Proxy agent factory:**
```typescript
function makeAgent(proxyUrl: string): Agent {
  if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://')) {
    return new SocksProxyAgent(proxyUrl);
  }
  return new HttpsProxyAgent(proxyUrl);
}
```

---

### ✅ PHASE 3 — Client Update (gofile-engine.ts + BongShare.tsx)

**gofile-engine.ts changes:**
```typescript
// NEW: Server-side upload (bypasses local DNS blocks)
export async function uploadFileViaServer(
  file: File,
  onProgress: (percent: number) => void
): Promise<GoFileUploaderResponse['data']> {
  // Use XHR for progress tracking — same as current approach
  // but targets /api/share/upload instead of GoFile directly
}
```

**BongShare.tsx changes:**
- `handleLinkUpload()` calls `uploadFileViaServer()` first
- Falls back to `uploadFileWithProgress()` (direct) if server route fails
- Clear progress reporting (XHR upload event still works server→browser direction)

---

### ✅ PHASE 4 — GoFile Proxy Tagging (Background, Non-Blocking)

**Add `gf` field to `ProxyPlatforms` interface:**
```typescript
interface ProxyPlatforms {
  yt: boolean;
  fb: boolean;
  ig: boolean;
  gf?: boolean;  // ← NEW: GoFile reachable via this proxy
  // ...
}
```

**Background verifier job** (runs every 6 hours, after normal hunt):
- Take 50 random proxies from pool
- Test each: `fetch('https://api.gofile.io/servers', { agent })` with 8s timeout
- Tag with `gf: true` if succeeds
- This builds a GoFile-specific pool over time

**Priority in `getBestProxiesForGoFile()`:**
- `gf: true` proxies come first (proven to work for GoFile)
- `gf: undefined` proxies come next (untested — might work)
- `gf: false` proxies are skipped (known to not work for GoFile)

---

### ✅ PHASE 5 — Admin Panel Health Display

**Add to ProxyMissionControl.tsx (SYSTEM tab):**
```
[ GoFile Health ]
  Direct (Render):    ✅ 142ms  → servers: [store3, eu5, ...]
  Best proxy route:   ✅ 380ms  → socks5://45.23.x.x:1080
  Client browser:     ❌ DNS BLOCKED (user's ISP)
  
  Upload Mode:  🔀 Server-Proxy (active)
               ○ Direct  ○ Server-Direct  ● Server-Proxy  ○ P2P only
```

---

## 📋 EXACT FILE CHANGES

### NEW FILE: `server/routes/share.ts`

Complete streaming upload proxy with waterfall.

### MODIFIED: `server/routes.ts`

```typescript
// Add import at top:
import { registerShareRoutes } from './routes/share';

// Add in registerRoutes():
registerShareRoutes(app);
```

### MODIFIED: `client/src/lib/gofile-engine.ts`

- Add `uploadFileViaServer()` function
- Keep `uploadFileWithProgress()` as fallback (direct XHR to GoFile)
- `getBestServer()` still available for direct path testing

### MODIFIED: `client/src/pages/BongShare.tsx`

- `handleLinkUpload()` → uses `uploadFileViaServer()` first
- Progress bar still works (XHR to our server, which fires progress events)
- Error state: if server upload fails → suggest P2P (already built)

### OPTIONAL MODIFIED: `server/proxyService.ts`

- Add `gf?: boolean` to `ProxyPlatforms` interface
- Add `getBestProxiesForGoFile()` helper

---

## ⚡ STREAMING ARCHITECTURE DETAIL

**The memory problem (Render = 512MB RAM):**

Naive approach (WRONG — OOM risk):
```
Browser → [buffer 400MB in RAM] → GoFile
```

Correct approach (streaming):
```
Browser → multer disk → /tmp/bongshare/xyz → stream → GoFile → delete /tmp file
```

**Why disk storage is safe:**
- Render `/tmp` has ~1GB available (ephemeral SSD)
- File is written to disk chunk-by-chunk (multer handles this)
- Then streamed from disk to GoFile using `fs.createReadStream()`
- File is deleted immediately after upload (success or failure)
- RAM usage stays under 50MB regardless of file size

**Why not pure pipe (browser → Render → GoFile simultaneously)?**
- GoFile requires `Content-Length` header in the upload request
- Pure pipe cannot provide Content-Length before reading the entire body
- Disk storage is the only reliable way to know file size before sending
- Exception: if GoFile supports chunked transfer encoding (needs testing)

---

## 🔒 SECURITY

- Rate limit: 5 uploads per IP per minute (Express `express-rate-limit`)
- File size: hard limit 10GB in multer config
- Temp cleanup: `finally` block always deletes `/tmp` file
- No CSRF needed for this endpoint (file upload is not a session mutation)
- Proxy URLs never returned to client (server-side only)
- `X-Request-ID` header added for debugging upload chains

---

## 🚨 FAILURE MODES & FIXES

| Failure | Detection | Fix |
|---|---|---|
| GoFile servers API fails (all layers) | `status !== ok` | Return `{ fallback: 'p2p' }`, UI shows P2P CTA |
| GoFile upload returns non-200 | `xhr.status !== 200` | Try next proxy in waterfall |
| Proxy agent fails to connect | `ETIMEDOUT` / `ECONNREFUSED` | Ban proxy +1 strike, try next |
| `/tmp` disk full on Render | ENOSPC error | Return 507, UI shows file-too-large message |
| Render upload request times out | 10min max | Return 504, UI shows "try P2P" |
| Multer rejects file (too large) | 413 response | UI shows file size error |
| All proxies tried, none work | Pool empty | Return structured error with `P2P` fallback |

---

## 📊 PROGRESS TRACKING

| Phase | Description | Status |
|---|---|---|
| P0 | Health check endpoint `/api/share/gofile-health` | ❌ NOT STARTED |
| P1 | Core upload endpoint `POST /api/share/upload` | ❌ NOT STARTED |
| P2 | Proxy pool integration (getBestProxiesForGoFile) | ❌ NOT STARTED |
| P3 | Client update (uploadFileViaServer) | ❌ NOT STARTED |
| P4 | GoFile proxy tagging (background verifier) | ❌ NOT STARTED |
| P5 | Admin panel health display | ❌ NOT STARTED |

**Implementation order: P1 → P2 → P3 → P0 → P4 → P5**  
(P1+P2+P3 = core fix that makes uploads work. P0/P4/P5 = hardening/monitoring)

---

## ✅ VERIFICATION CHECKLIST (Post-Deploy)

```
[ ] GET  /api/share/gofile-health returns { reachable: true } from Render
[ ] POST /api/share/upload with a 1MB file → returns { status: "ok", data: { code: "xyz" } }
[ ] bongbari.com/tools/share → pick file → Generate Link → progress bar fills → branded URL shown
[ ] Generated URL (bongbari.com/s/TOKEN) → opens download page correctly 
[ ] When GoFile direct fails → proxy is tried → upload still succeeds
[ ] /tmp file is deleted after upload (no disk leak)
[ ] P2P mode still works as before (untouched)
[ ] 200MB+ file upload completes without OOM on Render
```

---

## 🚀 EXECUTION COMMAND

```powershell
# After implementing:
npm run check                    # TypeScript must be 0 errors
npm run build:client             # Build SPA
git add -A
git commit -m "feat(share): server-side GoFile proxy upload with pool fallback FORCE_PAGES_DEPLOY"
git push origin main
# Wait 3 minutes, then test: https://www.bongbari.com/tools/share
```

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
