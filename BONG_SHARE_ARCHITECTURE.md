# Bong Share — Architecture & Link Generation Flow
> *Vibe Coder Breakdown — How the magic works under the hood*

---

## 🎯 What is Bong Share?

A **free, unlimited file transfer tool** built into Bong Bari's website. Users drag-drop any file (up to 10GB), get a shareable download link instantly. Zero storage cost for us. Comedy-branded with rotating Bengali jokes.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 USER'S BROWSER                       │
│                                                      │
│  1. User drops file on BongShare page               │
│  2. React calls GoFile API to get best server       │
│  3. XHR uploads file directly to GoFile CDN         │
│  4. GoFile returns download link                    │
│  5. User copies link & shares with friend           │
│                                                      │
│  ┌──────────┐     ┌──────────────┐                  │
│  │ BongShare│────>│ GoFile API   │                  │
│  │ React UI │<────│ (Free, Public│                  │
│  └──────────┘     │  REST API)   │                  │
│                   └──────────────┘                  │
│                                                      │
│  💡 OUR SERVER NEVER TOUCHES THE FILE               │
│     (Zero bandwidth, zero storage cost)             │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 How Link Generation Works (Step-by-Step)

### Phase 1: Server Discovery
```
GET https://api.gofile.io/getServer
→ Response: { "status": "ok", "data": { "server": "store14" } }
```
GoFile has many storage nodes worldwide. This call finds the **least-loaded server** for fastest upload.

### Phase 2: File Upload (XHR with Progress)
```
POST https://store14.gofile.io/uploadFile
Content-Type: multipart/form-data
Body: { file: <the actual file bytes> }
```
- We use `XMLHttpRequest` (not fetch) because XHR gives us **real-time upload progress** via `xhr.upload.onprogress`
- The file goes **directly from the user's browser to GoFile's CDN** — our Render backend is never involved
- Works for files up to **10GB+** (GoFile has no practical limit for free uploads)

### Phase 3: Link Received
```json
{
  "status": "ok",
  "data": {
    "downloadPage": "https://gofile.io/d/abc123",
    "code": "abc123",
    "fileName": "my_video.mp4",
    "md5": "a1b2c3d4...",
    "fileId": "xxxxx"
  }
}
```
The `downloadPage` URL is what we show to the user. Anyone with this link can download the file.

### Phase 4: User Shares the Link
The link is displayed in the glass panel UI. User can:
- **Copy to clipboard** (one click)
- **Open in new tab** to verify it works
- Send the link via WhatsApp, email, anywhere

---

## ⏱️ File Lifecycle & Auto-Delete

| Event | What Happens |
|-------|-------------|
| Upload complete | File is live on GoFile CDN |
| Someone downloads | 10-day timer resets |
| No downloads for 10 days | File auto-deleted by GoFile |

**This is actually perfect for Bong Bari** — we're a transfer tool, not a storage service. No legal liability for hosting files permanently.

---

## 💰 Cost Breakdown

| Resource | Cost |
|----------|------|
| GoFile API | **$0 forever** (free public API) |
| GoFile storage | **$0** (they monetize via ads on download page) |
| Our server bandwidth | **$0** (file never touches our backend) |
| CDN/hosting | **$0** (already on GitHub Pages) |
| **Total** | **$0/month** |

---

## 🛡️ Security Model

- **No server-side storage** → nothing to hack on our end
- **GoFile handles encryption** → files encrypted at rest on their CDN
- **No authentication required** → anyone can upload (keeps it friction-free)
- **Links are unguessable** → random codes like `abc123` with high entropy
- **Auto-delete** → files don't persist forever (reduces liability)

---

## 📁 Code Map

| File | Purpose |
|------|---------|
| `client/src/pages/BongShare.tsx` | Main UI — drop zone, progress, link display, jokes |
| `client/src/lib/gofile-engine.ts` | GoFile API client — server discovery + XHR upload |
| `client/src/App.tsx` | Route `/tools/share` → BongShare (nav hidden) |

---

## 🎭 Comedy Integration

The page rotates Bengali jokes contextually:
- **Idle state**: Jokes about file sizes, WhatsApp limits, pendrive hunting
- **Uploading**: Jokes about internet speed, patience, server strength  
- **Success**: Victory jokes, tech-savvy flexing, sharing karma

Jokes rotate every 5 seconds with smooth fade animations.

---

## � PHASE 2: Link Cloaking System (PLANNED)

> **Goal:** Users share `bongbari.com/s/XyZ9kR` — nobody can tell we use GoFile underneath.

### The Problem (Current State)

Right now, after upload the user sees:
```
https://gofile.io/d/abc123
```
**Anyone who gets this link immediately knows:**
1. We're using GoFile (free hosting service)
2. They can explore GoFile, discover our pattern
3. It looks unprofessional / non-branded
4. GoFile's download page shows GoFile branding + ads

### The Solution: Multi-Layer Link Cloaking

```
┌─────────────────────────  WHAT USER SEES  ─────────────────────────┐
│                                                                     │
│   https://www.bongbari.com/s/XyZ9kR    ← branded short link       │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────  LAYER 1: SPA ROUTE  ─────────────────────┐
│                                                                     │
│   React page at /s/:code                                           │
│   → Shows branded "Bong Bari Download" page (our design)          │
│   → Displays file name, size, upload date (from our DB)            │
│   → "Download" button triggers the real fetch                      │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  user clicks Download
                               ▼
┌─────────────────────────  LAYER 2: API RESOLVE  ───────────────────┐
│                                                                     │
│   POST /api/share/resolve  { code: "XyZ9kR" }                     │
│   → Server looks up shareLinks table                                │
│   → Returns one-time signed redirect URL (or direct stream)        │
│   → GoFile URL NEVER sent to frontend                              │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────  LAYER 3: REDIRECT/PROXY  ────────────────┐
│                                                                     │
│   Option A: Server 302 redirect → GoFile (fastest, GoFile visible  │
│             in Network tab only briefly)                            │
│                                                                     │
│   Option B: Cloudflare Worker proxy → strips GoFile headers,       │
│             serves file as-if from our domain (FULL CLOAK)         │
│                                                                     │
│   Option C: Server-side stream for small files (<100MB),           │
│             redirect for large files (saves bandwidth)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Components

#### A. Database Schema — `shareLinks` table

```sql
CREATE TABLE share_links (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(8) UNIQUE NOT NULL,    -- "XyZ9kR"
  gofile_url    TEXT NOT NULL,                  -- "https://gofile.io/d/abc123"
  gofile_code   VARCHAR(32),                   -- "abc123" (GoFile's code)
  file_name     VARCHAR(255),                  -- Original filename
  file_size     BIGINT,                        -- Bytes
  file_type     VARCHAR(100),                  -- MIME type
  download_count INTEGER DEFAULT 0,            -- Analytics
  created_at    TIMESTAMP DEFAULT NOW(),
  expires_at    TIMESTAMP,                     -- Optional manual expiry
  is_active     BOOLEAN DEFAULT true,          -- Kill switch
  uploader_ip_hash VARCHAR(64)                 -- SHA-256 of IP (privacy-safe analytics)
);

CREATE INDEX idx_share_code ON share_links(code);
```

#### B. Short Code Generator

```typescript
// Cryptographically random, URL-safe, 6-8 chars
import crypto from 'crypto';

function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  // Removed ambiguous: 0/O, 1/l/I to prevent user typos
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => chars[b % chars.length]).join('');
}
// Output: "Xk9mRp", "Bn4wQz", etc.
// 55^6 = ~27 billion combinations (collision-proof for our scale)
```

#### C. API Endpoints (Render Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/share/create` | POST | After GoFile upload → store mapping, return short code |
| `GET /api/share/resolve/:code` | GET | Lookup code → return file metadata (NOT the GoFile URL) |
| `GET /api/share/download/:code` | GET | 302 redirect to GoFile OR proxy stream |
| `GET /api/share/stats/:code` | GET | Download count, created date (optional) |

**Create flow:**
```
Client uploads to GoFile → gets gofile URL
Client calls: POST /api/share/create
  Body: { gofileUrl, gofileCode, fileName, fileSize, fileType }
  Response: { code: "XyZ9kR", shareUrl: "https://www.bongbari.com/s/XyZ9kR" }
```

**Download flow:**
```
Visitor opens: https://www.bongbari.com/s/XyZ9kR
→ SPA loads branded download page
→ User clicks "Download"
→ Browser navigates to: /api/share/download/XyZ9kR
→ Server: 302 Location: https://gofile.io/d/abc123
   (or proxy stream if CF Worker is set up)
```

#### D. Frontend Download Page (`/s/:code`)

A beautiful branded page — NOT a redirect. The visitor sees:

```
┌────────────────────────────────────────┐
│         🎬  BONG BARI                  │
│         File Transfer                  │
│                                        │
│    ┌──────────────────────────┐        │
│    │  📄  my_awesome_video.mp4│        │
│    │      1.2 GB              │        │
│    │      Shared 2 hours ago  │        │
│    └──────────────────────────┘        │
│                                        │
│    ┌──────────────────────────┐        │
│    │   ⬇️  DOWNLOAD NOW       │        │
│    └──────────────────────────┘        │
│                                        │
│    🔒 End-to-end encrypted             │
│    ⏱️ Auto-deletes in 10 days          │
│                                        │
│    ─────────────────────────────       │
│    "Bong Bari — Send anything."        │
└────────────────────────────────────────┘
```

**What this achieves:**
- Visitor NEVER sees "gofile.io" in the URL bar
- Our branding is front and center
- We can show download count, file info
- We control the experience (no GoFile ads)

#### E. Cloudflare Worker (Full Cloak — Optional Level 3)

For **maximum** stealth, add a CF Worker route at `www.bongbari.com/dl/*`:

```javascript
// Cloudflare Worker: bongbari-download-proxy
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const gofileUrl = url.searchParams.get('t'); // encrypted token
    
    if (!gofileUrl) return new Response('Not found', { status: 404 });

    // Decrypt the GoFile URL from signed token
    const realUrl = decryptToken(gofileUrl); // AES-256 decrypt
    
    // Fetch from GoFile, stream to user
    const resp = await fetch(realUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });
    
    // Strip all GoFile headers, serve as ours
    const headers = new Headers();
    headers.set('Content-Type', resp.headers.get('Content-Type'));
    headers.set('Content-Length', resp.headers.get('Content-Length'));
    headers.set('Content-Disposition', resp.headers.get('Content-Disposition'));
    headers.set('X-Powered-By', 'Bong Bari CDN');
    
    return new Response(resp.body, { headers });
  }
}
```

**Result:** Even in browser DevTools → Network tab, the download comes from `bongbari.com/dl/...` — zero GoFile traces.

### Implementation Priority (Recommended Order)

| Phase | What | Effort | Cloak Level |
|-------|------|--------|-------------|
| **2A** | DB table + `/api/share/create` + short code gen | ~30 min | URL hidden |
| **2B** | `/s/:code` branded download page (React) | ~30 min | Full brand |
| **2C** | `/api/share/download/:code` redirect | ~15 min | GoFile visible only in Network tab |
| **2D** | CF Worker download proxy (full stream) | ~45 min | **FULL CLOAK** — zero traces |
| **2E** | Analytics (download count, geo, referrer) | ~20 min | Bonus |

### Security Considerations

- **Rate limiting:** `/api/share/create` limited to 10 creates/hour per IP
- **No GoFile URL in frontend:** The GoFile URL is ONLY stored server-side in Postgres, NEVER sent to the browser
- **Code entropy:** 6-char codes from 55-char alphabet = 27B combos (unguessable)
- **HMAC validation (optional):** Sign the short code with server secret so we can verify without DB lookup for hot paths
- **IP hashing:** Store SHA-256 hash of uploader IP (for abuse prevention, not tracking)
- **Kill switch:** `is_active` column to disable any link instantly
- **Expiry:** Optional `expires_at` for time-limited shares

### What Changes on the Frontend (BongShare.tsx)

---

## 🛡️ Hetzner VPS — Reverse Proxy Setup (Nginx / Caddy)

> Files: `infra/nginx.conf` + `infra/Caddyfile`

### Why a reverse proxy in front of Node.js

| Without Reverse Proxy | With Reverse Proxy |
|---|---|
| Node.js burns CPU serving static JS/CSS | Nginx/Caddy serves assets at zero CPU — pure OS kernel sendfile() |
| 100 users hit `/api/version` → 100 DB reads | Micro-cache: 1 DB read, 99 served from RAM |
| Node.js handles TLS handshakes | Nginx terminates SSL in optimized C code; Node gets plain HTTP |
| Complex CORS rules spread across routes | One place in proxy config; always correct |
| Backend IP exposed, DDoS hits Node directly | Proxy absorbs flood; Node only sees clean requests |

### Resource savings breakdown

```
Static assets (React bundle, chunks)
  Before: Node reads disk, pipes bytes, 1 CPU cycle per chunk
  After:  Nginx sendfile() — OS kernel copies directly RAM→NIC, 0 Node CPU

Micro-cache (active node counts, proxy pool stats)
  Before: 100 concurrent users = 100 Redis/Postgres queries/sec
  After:  1 query per 5s regardless of user count. 98% DB load eliminated.

TLS termination
  Before: Node crypto library handles every handshake
  After:  Nginx OpenSSL (hardware AES-NI accelerated). Node CPU drops ~15%.

Upload streaming (/api/share/upload)
  proxy_request_buffering off → file streams through proxy directly
  No extra RAM copy. Render sees same memory usage as before.
```

### Caddy vs Nginx at a glance

| | Caddy | Nginx |
|---|---|---|
| SSL setup | Automatic (zero commands) | Manual Certbot + cron |
| Config size | ~40 lines | ~120 lines |
| Micro-cache | Via `cache` module (plugin) | Built-in `proxy_cache` |
| Performance at scale | Slightly lower ceiling | Battle-tested at 100k+ rps |
| **Recommendation** | ✅ Use this for Hetzner | Only if you need advanced Lua/WAF |

**Use Caddy** unless you need nginx-specific features. Auto-SSL alone saves 30 minutes of setup.

### Quick install on Hetzner (Ubuntu 22.04)

```bash
# Install Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Copy config
sudo cp infra/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy

# Verify — Caddy auto-provisions SSL, check logs:
sudo journalctl -u caddy -f
```

---

## 🌐 Free Residential Proxy Pool — Source Expansion

> File: `server/proxyScraperService.ts` — now **50+ sources** (was 26)

### Why residential proxies matter for file ops

Datacenter IPs (AWS/Render/DigitalOcean ASNs) are heavily rate-limited
by GoFile, Instagram embed proxies, and YouTube. Residential IPs hit
these platforms at ~10x higher success rate.

### New sources added (Tier E — 2026-03)

| Source | Type | Est. daily pool |
|---|---|---|
| `zevtyardt/proxy-list` | HTTP + SOCKS5 | 3,000–8,000 |
| `prxchk/proxy-list` | HTTP + SOCKS5 | 2,000–5,000 |
| `almroot/proxylist` | HTTP | 1,500 |
| `fate0/proxylist` | HTTP (rotating) | 5,000 |
| `ErcinDedeoglu/proxies` | HTTP + SOCKS5 | 4,000 |
| `Anonym0usWork1221/Free-Proxies` | HTTP + SOCKS5 | 3,000 |
| `proxifly/free-proxy-list` | all protocols | 10,000+ |
| `openproxy.space` | HTTP + SOCKS5 (API) | 15,000+ |
| `proxyscrape.com v3 API` | HTTP + SOCKS5 | 20,000+ |
| `geonode.com API` | HTTP + SOCKS5 | 5,000 |
| `proxy-list.download API` | HTTP + SOCKS5 | 4,000 |
| `spys.me` | HTTP + SOCKS5 | 1,500 |
| `jetkai/proxy-list` | HTTP + SOCKS5 | 6,000 |
| `B4RC0DE-TM/proxy-list` | HTTP + SOCKS5 | 3,000 |
| `sunny9577/proxy-scraper` | HTTP | 2,000 |
| `UptimerBot/proxy-list` | HTTP + SOCKS5 | 3,000 |

**Total candidate pool per hunt: ~100,000–150,000** (up from ~50,000)

### Further free residential sources (can add to Tier E later)

```
# Tor network (SOCKS5) — residential-adjacent, free forever
127.0.0.1:9050 (local Tor daemon on VPS)
Add: sudo apt install tor && systemctl start tor
Then use: socks5://127.0.0.1:9050

# I2P outproxy (for http)
Need I2P daemon: i2p.net

# Webshare.io free tier
https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25
(Free: 10 verified residential proxies, rotating)
Register at webshare.io → copy API key → add header auth

# Luminati/Brightdata free trial
https://brightdata.com (1GB free residential trial)

# ProxyRack free tier
https://www.proxyrack.com/free-proxy-list/

# HideMyName / hidemy.name API
https://hidemy.io/en/proxy-list/ (scrape or paid API)

# NordVPN residential exit nodes (if team has subscription)
Socks5: *.nordvpn.com:1080 (auth required)

# Free Socks5 from SOCKS5PROXIES.NET
https://www.socks5proxies.net/

# FreeProxyList.net (HTML scrape)
https://free-proxy-list.net/ (regex the table)

# SSL Proxies from sslproxies.org
https://www.sslproxies.org/

# US-Proxy.org
https://www.us-proxy.org/
```

---

## ⚡ Consent-Based Browser Relay (opt-in seeding)

> Components: `client/src/components/RelayConsentBanner.tsx` + `client/public/relay-worker.js`

### Concept (honest framing to users)

```
"Like seeding a torrent — while you browse BongBari, your browser
 quietly helps relay downloads for other users. No files are read
 from your device. You can stop anytime."
```

This is the same model as:
- **WebTorrent** — browser-based P2P seeding
- **Opera Turbo / Brave** — bandwidth sharing for speed
- **IPFS** — content-addressed pinning
- **jsDelivr P2P CDN** — asset serving from peers

### What it does technically

```
User A uploads file → GoFile CDN stores it
User A enables relay → browser opens SharedWorker
SharedWorker opens PeerJS DataChannel → joins BongBari mesh
User B downloads file → gets fastest peer (A's browser or CDN)
```

### Privacy guarantees (must be in consent text)
- ✅ Only relays files already being downloaded (no cold cache reads)
- ✅ No files stored on relay user's disk
- ✅ No IP address logged by us (P2P is direct peer-to-peer)
- ✅ Off the moment tab closes or user clicks Stop
- ✅ SharedWorker means 1 relay per browser regardless of tab count

### Current implementation status
- `RelayConsentBanner.tsx` — UI complete, consent stored in localStorage
- `relay-worker.js` — SharedWorker stub (Phase 1 stub deployed)
- Phase 2 (next): wire PeerJS mesh into worker `start` command

---

## ✅ Verification checklist (after Render deploys)

1. `https://bongbaricomedy.onrender.com/api/share/gofile-health` → `{ reachable: true }`
2. Upload file on `/tools/share` → progress bar reaches 100% → link appears
3. Relay banner appears 3s after page load (first visit), disappears after Enable/Skip
4. Relay ON pill shows in top-right after enabling
5. Proxy hunt: admin dashboard shows 50+ sources in source health table

Currently:
```typescript
// After upload succeeds:
setShareLink(data.downloadPage);  // "https://gofile.io/d/abc123"
```

After Phase 2:
```typescript
// After upload succeeds:
const gofileUrl = data.downloadPage;
const res = await apiRequest('/api/share/create', {
  method: 'POST',
  body: JSON.stringify({
    gofileUrl,
    gofileCode: data.code,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  }),
  headers: { 'Content-Type': 'application/json' },
});
setShareLink(res.shareUrl);  // "https://www.bongbari.com/s/XyZ9kR"
```

**The GoFile URL is captured server-side and NEVER shown to the user.**

### Traceability Matrix — What Can Someone See?

| What They Inspect | Current (No Cloak) | Phase 2A-C (Short Link) | Phase 2D (Full Cloak) |
|---|---|---|---|
| URL bar | gofile.io/d/abc123 | bongbari.com/s/XyZ9kR | bongbari.com/s/XyZ9kR |
| Page source/HTML | GoFile page | Our branded page | Our branded page |
| Network tab (download) | gofile.io request | gofile.io redirect (302) | bongbari.com/dl/... |
| Response headers | GoFile server headers | GoFile server headers | Custom "Bong Bari CDN" |
| DNS lookup | gofile.io | bongbari.com + gofile.io | bongbari.com only |
| **Can they tell it's GoFile?** | **YES, obvious** | **Only if they watch Network tab** | **NO — fully invisible** |

---

## �🚀 Future: P2P WebRTC (Path B)

If we ever want **zero-server file transfer** (no GoFile dependency):

```
┌──────────┐   WebRTC DataChannel   ┌──────────┐
│ Sender's │ ◄═══════════════════► │ Receiver │
│ Browser  │   (direct P2P pipe)    │ Browser  │
└──────────┘                        └──────────┘
     │                                    │
     └── PeerJS signaling server ─────────┘
         (just for initial handshake)
```

**How P2P link generation would work:**
1. Sender opens BongShare → PeerJS generates a unique peer ID (e.g., `bb-x82k9sh2`)
2. App creates shareable link: `bongbari.com/tools/share?p=bb-x82k9sh2`
3. Receiver opens that link → PeerJS connects browsers directly
4. File streams through WebRTC DataChannel — **never touches any server**
5. **Catch**: Sender must keep tab open until transfer completes

**When to use P2P vs GoFile:**
| Feature | GoFile (Current) | WebRTC P2P (Future) |
|---------|-----------------|-------------------|
| Sender can close tab? | ✅ Yes | ❌ Must stay open |
| Works behind strict NAT? | ✅ Always | ⚠️ Sometimes needs TURN |
| File size limit | ~10GB | Unlimited |
| Download link shareable? | ✅ Anyone, anytime | ❌ Only while sender online |
| Cost | $0 | $0 (or small TURN cost) |

**Recommendation**: GoFile is the right choice for Bong Bari. Users want "upload → get link → close tab → walk away." P2P is great for power users but bad UX for casual comedy fans.

---

*Built with ❤️ by Bong Bari's Vibe Coder army. "Churi emon koro jate na dhoro poro."*
