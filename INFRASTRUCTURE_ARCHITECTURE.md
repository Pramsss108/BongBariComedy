# BongBari Infrastructure Architecture — Three-Tier Split
> Updated: March 30, 2026 | Replaces all Render.com references

## TL;DR
| Tier | Host | IP | Role |
|------|------|----|------|
| **Frontend** | GitHub Pages | CDN | SPA, static assets, SEO |
| **Backend API** | Oracle Cloud Always Free VM | `79.76.110.66:5000` | Core API, auth, community, CMS, lightweight routes |
| **Heavy Compute** | Hetzner VPS (CX22) | `78.47.104.43` | Proxy scraping, verification, Cobalt extraction, future heavy workloads |
| **Edge** | Client Browser | Visitor's residential IP | Client-side metadata extraction (bypasses datacenter IP blocks) |

---

## 1. Oracle Cloud VM — Core API Server (Always Free)

### Specs
- **Instance:** `instance-20260329-1434` (VM.Standard.E2.1.Micro)
- **CPU:** 1 OCPU (AMD, burstable)
- **RAM:** ~951MB usable + 1.5GB swap
- **Disk:** 30GB boot volume
- **Network:** 10TB/month outbound, Frankfurt (eu-frankfurt-1)
- **OS:** Oracle Linux 9.7, user `opc`
- **Process Manager:** PM2 6.0.14
- **Port forwarding:** firewalld 80→5000

### What Runs Here
| Service | Memory | Interval |
|---------|--------|----------|
| Express API (all routes) | ~150MB base | Always on |
| YouTube RSS poller | 1-5MB | Every 2 min |
| Google News trends | 1-5MB | Every 15 min |
| BongShare GoFile proxy | Per-request, streams | On-demand |
| AI chatbot (Gemini relay) | Per-request | On-demand |
| Community feed (Postgres) | Per-request | On-demand |

### Resource Limits
- **MAX 3 concurrent ffmpeg/yt-dlp streams** (ResourceGovernor)
- **20MB maxBuffer** per yt-dlp JSON parse
- **Temp files** auto-deleted in `finally{}` (BongShare /tmp/bongshare)
- **50MB payload limit** (JSON/urlencoded for image uploads)

### What MUST NOT Run Here
- ❌ Proxy scraping (212k+ proxies → OOM)
- ❌ Rust verifier (concurrent sockets → OOM)
- ❌ Heavy batch ffmpeg transcoding
- ❌ Docker containers (no disk/RAM headroom)
- ❌ `dnf` package manager (triggers OOM death spiral)

---

## 2. Hetzner VPS — Heavy Compute & Scraping

### Specs
- **IP:** `78.47.104.43`
- **Plan:** CX22 (~4GB RAM, 2 vCPU, 40GB disk)
- **OS:** Linux (Debian/Ubuntu)
- **Ports:** 6000 (verifier), 9000 (Cobalt), 9876 (Rust binary)

### What Runs Here

#### Active Now ✅
| Service | Port | What It Does |
|---------|------|--------------|
| **Cobalt Docker Extractor** | 9000 | YouTube/IG/FB metadata extraction (IPv6 capable) |
| **Rust Proxy Verifier** | 9876 | Batch-verify proxies (3-platform: YT/FB/IG) |
| **beast_harvest.mjs** | CLI | Hunts 26 OSINT sources + Telegram, feeds Rust verifier |

#### Future Candidates 🔮
| Task | Why Hetzner | Priority |
|------|-------------|----------|
| **Heavy ffmpeg transcoding** | 4GB RAM vs Oracle's 1GB; 4K transcode needs 200MB+ per spawn | HIGH |
| **Batch video processing** | Parallel processing without OOM risk | MEDIUM |
| **Advanced stealth engine** | IP rotation, geo-targeting, cookie management | MEDIUM |
| **Tor exit node extraction** | Privacy-sensitive metadata scraping | LOW |
| **AI model inference** | If HuggingFace Spaces becomes unreliable | LOW |

### Communication Pattern
```
Oracle VM (API)  ──HTTP──→  Hetzner VPS (port 9000)  ──→  YouTube/IG CDN
     ↑                            │
     └──── JSON metadata ─────────┘
     
Client browser   ──→  Oracle VM  ──302 redirect──→  Google CDN (direct)
```

Oracle calls Hetzner for metadata extraction, then 302-redirects the client directly to the CDN. Oracle never streams YouTube bytes itself.

---

## 3. Client-Side IP Extraction — Residential IP Bypass

### Why This Exists
YouTube/Instagram BotGuard blocks datacenter IPs (Oracle Frankfurt, Hetzner Germany). Visitor browsers have **residential IPs** that are not blocked. By moving metadata extraction to the browser, we bypass all datacenter IP detection.

### Architecture
```
Step 1: User clicks "Download" on bongbari.com
Step 2: Client JS calls Oracle → /api/downloader/info?url=...
Step 3: Oracle dispatches to Hetzner Cobalt (datacenter extraction attempt)
Step 4: If Hetzner fails (403/bot-block), Oracle returns "client_extract" signal
Step 5: Client JS directly fetches YouTube oEmbed / noembed / player JSON
         using visitor's residential IP (via CORS-safe endpoints)
Step 6: Client sends extracted metadata back to Oracle
Step 7: Oracle resolves CDN link and 302-redirects client to download
```

### Safe Endpoints for Client-Side Extraction
These YouTube/social endpoints support CORS or return JSON-P:
- `https://noembed.com/embed?url=VIDEO_URL` — Public CORS-enabled oEmbed
- `https://www.youtube.com/oembed?url=VIDEO_URL&format=json` — YouTube's own oEmbed
- YouTube `get_video_info` endpoint (via Invidious/Piped mirrors)
- Instagram GraphQL API (via CORS proxy or noembed)

### Privacy & Consent
- Client-side extraction only happens for the user's OWN download request
- No visitor IPs are harvested, stored, or reused for other users
- The user's browser makes requests on their own behalf (same as visiting YouTube directly)
- Full transparency: "Using your connection for faster downloads" UI notice

### Implementation Priority
Phase 1: oEmbed metadata (title, thumbnail, duration) — client-side
Phase 2: Piped/Invidious mirror rotation for stream URLs — client-side  
Phase 3: PO-Token generation in browser (WebCrypto API) — advanced

---

## 4. Free Tier Limits & Budget

### Oracle Cloud (Always Free — $0/month forever)
| Resource | Limit | Current Usage |
|----------|-------|---------------|
| VMs | 2x Micro (1 OCPU, 1GB each) | 1 used |
| Boot Volume | 200GB total (2x 100GB) | 30GB used |
| Outbound Data | 10TB/month | <1GB/month |
| Object Storage | 20GB | Not used |
| Autonomous DB | 2x (20GB each) | Not used (using Neon) |
| Load Balancer | 1 flexible | Not used |

### Hetzner (Paid — ~€4.50/month)
| Resource | Spec |
|----------|------|
| CPU | 2 vCPU (shared) |
| RAM | 4GB |
| Disk | 40GB SSD |
| Traffic | 20TB/month |

### Free Services
| Service | Usage | Limit |
|---------|-------|-------|
| **Neon Postgres** | App database | 0.5GB storage, 190 compute hours/month |
| **Upstash Redis** | Proxy pool cache | 10K commands/day |
| **HuggingFace Spaces** | TTS/voice models | Community GPU (cold starts) |
| **GitHub Pages** | Frontend hosting | Unlimited (public repos) |
| **GitHub Actions** | CI/CD + HF keep-alive | 2000 min/month |
| **Cloudflare Workers** | Edge proxy (API key hiding) | 100K requests/day |

---

## 5. Deploy Workflows

### Frontend (GitHub Pages)
```
Push to main → .github/workflows/deploy.yml → Vite build → Pages publish
```

### Oracle Backend
```
Push to main (with FORCE_ORACLE_DEPLOY in commit msg)
→ .github/workflows/deploy.yml → SCP bundle to VM → PM2 restart
```

### Hetzner
```
Manual SSH or beast_harvest.mjs CLI
→ Docker compose for Cobalt, Rust binary for verifier
```

---

## 6. Task Assignment Matrix

| Feature | Oracle | Hetzner | Client Browser |
|---------|--------|---------|----------------|
| REST API routing | ✅ | | |
| Auth (Google OAuth, sessions) | ✅ | | |
| Community feed (Postgres CRUD) | ✅ | | |
| CMS/Blog/YouTube feeds | ✅ | | |
| BongShare GoFile proxy | ✅ | | |
| AI chatbot (Gemini relay) | ✅ | | |
| Text humanizer (HF relay) | ✅ | | |
| Download format selection | ✅ | | |
| YouTube metadata extraction | | ✅ (Cobalt) | Fallback ✅ |
| IG/FB metadata extraction | | ✅ (Cobalt) | Fallback ✅ |
| Stream URL resolution | | ✅ | |
| Proxy scraping (26 OSINT sources) | | ✅ | |
| Proxy verification (Rust) | | ✅ | |
| Heavy ffmpeg transcoding | | ✅ (future) | |
| oEmbed metadata | | | ✅ |
| PO-Token generation | | | ✅ (future) |

---

## 7. Network Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                          │
│  (Residential IP — bypasses BotGuard)                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐     │
│  │ React SPA │  │ oEmbed    │  │ Direct CDN download  │     │
│  │ (Pages)   │  │ extraction│  │ (302 redirect)       │     │
│  └────┬──────┘  └────┬──────┘  └──────────┬───────────┘     │
└───────┼──────────────┼────────────────────┼─────────────────┘
        │              │                    │
        ▼              ▼                    │
┌────────────────────────────────┐          │
│  ORACLE CLOUD VM (Frankfurt)   │          │
│  79.76.110.66:5000             │          │
│  ┌────────────────────────┐    │          │
│  │ Express API Server     │    │          │
│  │ • Auth, Community, CMS │    │          │
│  │ • Download routing     │────┼──────────┘  (302 to CDN)
│  │ • AI relay, BongShare  │    │
│  │ • YouTube/Trends poll  │    │
│  └──────────┬─────────────┘    │
└─────────────┼──────────────────┘
              │ HTTP (metadata extraction request)
              ▼
┌────────────────────────────────┐
│  HETZNER VPS (Germany)         │
│  78.47.104.43                  │
│  ┌────────────────────────┐    │
│  │ Cobalt Docker (:9000)  │    │
│  │ • YouTube extraction   │    │
│  │ • IG/FB metadata       │    │
│  ├────────────────────────┤    │
│  │ Rust Verifier (:9876)  │    │
│  │ • Proxy batch verify   │    │
│  ├────────────────────────┤    │
│  │ beast_harvest.mjs      │    │
│  │ • OSINT proxy hunting  │    │
│  └────────────────────────┘    │
└────────────────────────────────┘
              │
              ▼
┌────────────────────────────────┐
│  EXTERNAL SERVICES             │
│  • Neon Postgres (DB)          │
│  • Upstash Redis (proxy cache) │
│  • HuggingFace (AI models)     │
│  • GoFile/Filebin (file share) │
│  • Google/YouTube APIs         │
└────────────────────────────────┘
```

---

> **RENDER IS PERMANENTLY BANNED.** All backend services run on Oracle Cloud (free tier) and Hetzner VPS.
> Do not add any Render.com URLs, configs, buildpacks, or references to this codebase.
