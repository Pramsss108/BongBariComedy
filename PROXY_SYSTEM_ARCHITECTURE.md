# 🛡️ BongBari Proxy Hunter — Full System Architecture
> **Version:** 2.0 — Dual-Process Hybrid Design  
> **Author:** Red Team Engine (BongBari Media Group)  
> **Status:** Design Review — Pre-Implementation

---

## 🎯 Purpose

Build an **unbreakable, bulletproof, self-healing proxy pool** that:
- Runs 24/7 **without manual effort** in the cloud
- Can be **turbo-charged manually** from your local PC (RTX 2060 power)
- Feeds verified proxies into any tool: downloader, scraper, ad platform bot, etc.
- Costs **₹0 extra** beyond your existing Render + Hetzner setup
- **Pool grows day-by-day** — never wiped, only validated and trimmed of dead nodes
- **Monetization-ready**: Once pool reaches 5,000–20,000+ verified proxies → sell API access as a Premium Proxy Service

> **Core Rule:** We NEVER do a full wipe. We ONLY revalidate and move failures to BIN.  
> Dead nodes sit in BIN for 24 hours then are auto-purged. Live pool always stays intact.

---

## ✅ Clarification: Your Assumptions vs Reality

| Your Assumption | Reality | Status |
|---|---|---|
| "We mine 2 lakh proxies and only 5K get validated" | **PARTIALLY WRONG** — see below | ⚠️ Needs correction |
| "Validation completes in 230 minutes" | ~42 minutes on Render (Node.js) / ~90 sec on local Rust | ✅ Confirmed |
| "Power Mode uses GPU" | Currently routes to Hetzner VPS (NOT GPU). GPU mode is Phase 20. | 🔧 On roadmap |
| "VPS should only do Tor/dark web hunting" | **CORRECT** — this doc redesigns that | ✅ Will implement |

### 🔍 The Real Mining Pipeline (Verified from Code)

```
Per Hunt Cycle (every 3 hours):
──────────────────────────────────────────────────────────────
 Step 1 │ Scrape 26 OSINT sources → ~50,000–200,000 raw IP:PORT
        │ (This is what "mined" shows in the UI)
        │
 Step 2 │ Dedup filter → remove proxies already in our live pool
        │ ("Skipped" count in UI)
        │
 Step 3 │ RANDOM SAMPLE: Take 5,000 from the new ones only
        │ ← THIS is why you see 5,000, NOT because 5K pass
        │
 Step 4 │ Verify those 5,000 against YouTube + Facebook + Instagram
        │ → ~200–400 pass (0.1–0.5% survival rate = normal)
        │
 Step 5 │ Save verified proxies to cloud DB
───────────────────────────────────────────────────────────────
```

**In plain words:**
> We mine 50K–200K raw IPs per hunt.  
> We don't test all of them (would take 5+ hours on Render).  
> We randomly sample 5K and test those.  
> ~0.5% pass with working YT+FB+IG connections → ~200–400 added per hunt.

**Why only 5K tested?**  
- CHUNK_SIZE = 20 concurrent (Render CPU safe limit)  
- VERIFY_TIMEOUT = 10 seconds per proxy  
- 5K ÷ 20 × 10s = **2,500 seconds ≈ 42 minutes** ← Confirmed by code  
- Testing all 200K would take: 200,000 ÷ 20 × 10s = **28 hours** ← impossible on Render  

---

## 🏗️ System Architecture — Two-Process Hybrid Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                     BONG BARI PROXY ECOSYSTEM                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────────┐      ┌────────────────────┐                 │
│   │   RENDER (Cloud)  │      │  HETZNER VPS        │                 │
│   │   Process 1       │      │  (Tor Hunting ONLY) │                 │
│   │                   │      │                      │                 │
│   │  • Scrape 26 OSINT│      │  • Tor daemon        │                 │
│   │  • Hunt every 3h  │      │  • .onion scraping   │                 │
│   │  • Node.js verify │      │  • Dark web sources  │                 │
│   │  • Store to cloud │      │  • Push raw to DB    │                 │
│   │  • API server     │      │                      │                 │
│   └────────┬──────────┘      └──────────┬───────────┘                 │
│            │                            │                              │
│            ▼                            ▼                              │
│   ┌────────────────────────────────────────────────────────────┐      │
│   │              UPSTASH REDIS / CLOUD DATABASE                 │      │
│   │  • rawCandidateQueue[]   (ALL scraped IPs, unverified)     │      │
│   │    └─ persisted each hunt, local machine drains it         │      │
│   │  • verifiedProxies[]     (live, tiered, geotagged)         │      │
│   │    └─ updated by both Render (5K/hunt) + local (50K+/run)  │      │
│   │  • huntStats{}           (counters, timestamps)            │      │
│   │  • localSyncLog[]        (beast mode upload events)        │      │
│   └────────────────────────────┬───────────────────────────────┘      │
│                                │                                        │
│                                ▼                                        │
│   ┌─────────────────────────────────────────────────────────────┐     │
│   │           YOUR LOCAL PC (Windows, RTX 2060)                  │     │
│   │           Process 2 — Hybrid Local Validator                 │     │
│   │                                                               │     │
│   │  beast_harvest.mjs  ←──── pulls rawCandidateQueue           │     │
│   │        ↓                                                      │     │
│   │  Rust binary (local) ← tokio, 500+ concurrent HTTP          │     │
│   │        ↓                                                      │     │
│   │  Local Tor daemon   ← for dark web hunting on your PC       │     │
│   │        ↓                                                      │     │
│   │  POST /api/admin/proxy-bulk-import → pushes results to DB   │     │
│   │        ↓                                                      │     │
│   │  ProxyMissionControl UI ← shows both logs side-by-side      │     │
│   └─────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Process 1 — Cloud Auto-Hunter (Render)

**Role:** Lightweight 24/7 background hunter. Runs without anyone touching it.

### What it does:
| Task | Schedule | Engine |
|---|---|---|
| Scrape 26 OSINT sources | Every 3 hours | Node.js fetch |
| **Store ALL raw candidates to cloud queue** | Per hunt | Upstash Redis |
| Sample 5K from queue for quick verify | Per hunt | Random shuffle |
| Verify 5K against YT+FB+IG (quick pass) | Per hunt | Node.js, 20 concurrent |
| Save verified proxies to live pool | Per hunt | Upstash Redis |
| Revalidate existing live pool (tiered) | Every 30 min | Node.js |
| Full sweep (all live proxies) | Daily 3AM | Node.js |
| Scrape Telegram sources | Per hunt | 4 channels |

> **Key change:** Render now stores **ALL** ~50K-200K raw scraped IPs into `rawCandidateQueue` in the cloud DB.  
> Local machine pulls this full queue and validates with full power — nothing is discarded.

### Timing (accurate):
```
Scraping 26 sources:     ~2-3 minutes
Store full queue to DB:  ~5-10 seconds
Verifying 5K proxies:    ~20-42 minutes  (Node.js, 20 concurrent, quick pass only)
Total per hunt cycle:    ~25-45 minutes
Hunt window:             3 hours
Dead time between hunts: ~2h 15-35 minutes

Local machine (when running):
  Validate full queue (50K):  ~5-15 minutes  (Rust, 500+ concurrent)
  Validate full queue (200K): ~20-60 minutes (Rust, 500+ concurrent)
  Revalidate live pool:       ~30-90 seconds (Rust, all proxies at once)
```

### Render resource usage:
- CPU: Stays under Render free limit (~60 open sockets)  
- Memory: ~150-300MB  
- Network: ~500MB per hunt cycle  

---

## 💻 Process 2 — Local Hybrid Validator (Your RTX 2060 PC)

**Role:** Turbo charger. When you run this, the pool grows 10x faster.

---

### ⚡ LOCAL POWER MODE — When ON, EVERYTHING Runs Locally

When Power Mode is toggled ON in the ProxyMissionControl UI:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LOCAL POWER MODE ON — Full local takeover                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ HUNT       → Scrape all 26 OSINT sources from YOUR PC (residential)  │
│  ✅ VALIDATE   → Validate rawCandidateQueue with Rust 500+ concurrent      │
│  ✅ REVALIDATE → Re-test full live pool (dead → BIN, alive → tier update) │
│  ✅ SYNC       → Every result pushed to cloud DB in real-time              │
│  ✅ TOR HUNT   → If local Tor is running → also scrape dark web sources    │
│  ✅ VPS CHECK  → Ping Hetzner VPS → if online, pull its Tor queue too      │
│                                                                         │
│  Render still runs as API server + fallback cron (cloud never dies)     │
│  But heavy lifting moved entirely to your PC → faster + better results  │
└─────────────────────────────────────────────────────────────────────────┘
```

### ⏱️ Time-Span Trigger — "Run for X hours"

User sets a time window when launching beast_harvest.mjs:

```
node beast_harvest.mjs --mode=C --duration=2h

Or interactive:
  > How long to run? [30m / 1h / 2h / 4h / until-stop]: 2h
  > Starting LOCAL POWER MODE — full cycle for 2 hours...

What happens during the time window:
  Loop start
    1. Scrape 26 OSINT sources + optional Tor sources → get fresh raw IPs
    2. Dedup against cloud DB (no duplicate work)
    3. Validate all NEW IPs with Rust 500+ concurrent
    4. Revalidate existing live pool (every 30 min sub-cycle)
    5. Push ALL results to cloud DB in batches of 500
    6. Check Hetzner VPS Tor status → pull its queue if online
    7. Sleep 5 min → repeat loop until time window expires
  Loop end
    8. Final sync → local file + cloud DB both up to date
    9. Print session summary: X hunted, Y verified, Z binned
```

> No separate cron needed. Just run `--duration=2h` before bed or during a movie.  
> When time expires, beast exits cleanly. Cloud keeps running on its own.

### 🚫 Deduplication Guarantee — No Wasted Work

At every stage, duplicates are eliminated:

```
DEDUP LAYER 1: Source scraping
  └── Remove exact duplicate IP:PORT pairs within the same scrape batch

DEDUP LAYER 2: Against cloud verifiedProxies[]
  └── Pull current live pool IPs from DB
  └── Filter out any rawCandidate already in live pool (no re-test waste)

DEDUP LAYER 3: Against rawCandidateQueue[]
  └── If an IP is already in the unverified queue, don't re-add it

DEDUP LAYER 4: Against binnedProxies[]
  └── IPs in BIN WON'T be re-added to queue (already failed 3x recently)
  └── Exception: if BIN entry is > 22 hours old → eligible for re-test

Result: Every validation attempt is fresh, unique work. Zero waste.
```

### 🧅 Tor Status Detection (Local + VPS)

On startup, beast_harvest.mjs detects all Tor resources available:

```
beast_harvest.mjs Tor check:

  CHECK 1 — Local Tor daemon
    ├── Try: curl --socks5 127.0.0.1:9050 https://check.torproject.org
    ├── SUCCESS → "[✅] Local Tor: ACTIVE (127.0.0.1:9050)"
    └── FAIL    → "[❌] Local Tor: NOT RUNNING"
              └── Hint: "Install with: winget install -e --id TorProject.TorBrowser"
              └── "Tor sources will be skipped. Non-Tor hunt will proceed."

  CHECK 2 — Hetzner VPS Tor
    ├── Try: SSH ping to 78.47.104.43 + check Tor service status
    ├── SUCCESS → "[✅] Hetzner VPS Tor: ACTIVE → pulling .onion queue"
    └── FAIL    → "[❌] Hetzner VPS: OFFLINE or Tor not running"
              └── "VPS queue skipped this run."

  STATUS SHOWN IN UI:
    ┌──────────────────────────────────┐
    │ LOCAL TOR:   ✅ Active (9050)          │
    │ HETZNER TOR: ✅ Active (78.47.104.43)  │
    │ CLOUD CRON:  ✅ Running (next in 1h42) │
    │ POWER MODE:  ⚡ LOCAL PC               │
    └──────────────────────────────────┘
```

> Tor is **optional** for local hunting. Without it, beast still runs all 26 clearnet OSINT sources.  
> With local Tor: adds .onion proxy directories to the scrape list for extra raw candidates.

---

### Why local beats Render for validation:
| Factor | Render (Cloud) | Your PC (Local) |
|---|---|---|
| Concurrent connections | 20 (CPU limit) | 500-2000+ (no limit) |
| IP type | Datacenter (ASN banned by YT/FB) | **Residential** (trusted) |
| Time for 5K proxies | 20-42 minutes | **~30-90 seconds** |
| Time for 50K proxies | 7+ hours (impossible) | **~5-15 minutes** |
| Tor integration | ❌ No Tor on Render | ✅ Local Tor daemon |
| GPU utilization | ❌ No GPU | ✅ RTX 2060 via CUDA |
| Cost | ~$0 on free tier | ₹0 (already owned) |

### Four Local Modes (Power Mode ON)

When `beast_harvest.mjs` runs on your PC, you choose (or auto-run all with `--mode=ALL`):

```
┌──────────────────────────────────────────────────────────────────┐
│  MODE H — LOCAL HUNT (fresh scrape from all sources)             │
│                                                                    │
│  Scrape 26 OSINT sources directly from YOUR PC                   │
│        ↓                                                          │
│  If local Tor active → also scrape .onion directories            │
│        ↓                                                          │
│  If Hetzner VPS Tor online → pull its pending queue too          │
│        ↓                                                          │
│  Dedup layers 1–4 → only fresh unique IPs proceed               │
│        ↓                                                          │
│  Push ALL new raw IPs to rawCandidateQueue in cloud DB           │
│        ↓                                                          │
│  Immediately validate them (Mode A) → no waiting for Render      │
│  UI shows real-time hunt progress + sync events                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MODE A — VALIDATE MINED QUEUE (find NEW live proxies)           │
│                                                                    │
│  Pull rawCandidateQueue from cloud (50K–200K IPs)                │
│        ↓                                                          │
│  Rust 500+ concurrent → test each against YT+FB+IG               │
│        ↓                                                          │
│  ~200–2000 pass (residential IP = better hit rate)               │
│        ↓                                                          │
│  Write verified proxies to LOCAL file (proxies_local.json)       │
│        ↓                                                          │
│  POST /api/admin/proxy-bulk-import → cloud DB updated            │
│  UI Local terminal shows sync events in real-time                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MODE B — REVALIDATE EXISTING LIVE POOL (prune dead ones)        │
│                                                                    │
│  Pull all verifiedProxies[] from cloud DB                        │
│        ↓                                                          │
│  Dedup: skip any already-binned proxies (4-layer dedup)          │
│        ↓                                                          │
│  Rust 500+ concurrent → re-test ALL live proxies                 │
│        ↓                                                          │
│  Alive: failCount reset to 0, tier re-scored, DB updated         │
│  Dead:  moved to BIN (binnedAt = NOW, out of rotation)           │
│        ↓                                                          │
│  POST /api/admin/proxy-bulk-import → cloud DB synced             │
│  Live pool INTACT — only dead moved to BIN, never wiped          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  MODE C — FULL BLAST (H + B + A, maximum power run)             │
│                                                                    │
│  Step 1: Mode B → revalidate + clean live pool (30-90 sec)       │
│  Step 2: Mode H → fresh scrape all 26 sources + Tor              │
│  Step 3: Mode A → validate full raw queue (5-60 min)            │
│  Step 4: Sync all results to cloud DB                            │
│  Result: Clean pool + max new proxies + DB fully updated         │
└──────────────────────────────────────────────────────────────────┘
```

### Local Storage — Dual-Write Design

When local machine validates proxies, results go to **two places simultaneously**:

```
Rust validation result (live proxy found)
  ├── Write to LOCAL:  proxies_local.json  (instant, fast, offline backup)
  └── Push to CLOUD:  POST /api/admin/proxy-bulk-import
                          → Upstash Redis merges, deduplicates, saves
                          → failCount / tier / geo all updated
                          → UI reflects changes within 3 seconds
```

This means:
- Even if internet disconnects mid-run, results are not lost (local file)
- When reconnected, beast mode re-syncs local file to cloud
- Cloud is always the source of truth, local is the fast-write buffer

### On PC Startup — Smart Auto-Revalidation

When `beast_harvest.mjs` starts (or PC wakes from sleep), it runs a startup check:

```
beast_harvest.mjs startup:
  1. Connect to cloud DB
  2. Check: when was last full revalidation?
  3. If > 6 hours ago:
     └── Show prompt: "Revalidate pool now? [Y/n] (auto-starts in 10s)"
     └── If YES or no response → run Mode B silently in background
  4. Mode B runs: dead ones → BIN, alive ones → tier updated
  5. Cloud DB updated, UI reflects within 3s
  6. Startup check completes — all other modes available
```

> One-time background revalidation per session. Silent, zero friction.  
> User can always cancel or run Mode B manually whenever needed.

### Revalidation Engine Fallback Chain (CPU Load Management)

If a revalidation is triggered but one engine is overloaded:

```
Revalidation Engine Priority:

  1. LOCAL PC (RTX 2060)          ← BEST: residential IP, Rust 500+ concurrent
     └── Residential = not ASN-blocked by YT/FB/IG
     └── 500+ concurrent = ~30-90 sec for 5K proxies
     └── Active when beast_harvest.mjs is running

  2. HETZNER VPS                  ← FALLBACK: if local PC is offline
     └── Datacenter IP (weaker hit rate for YT/IG)
     └── Still 500+ concurrent via Rust
     └── Acceptable for cleanup runs, not fresh mining

  3. RENDER NODE.JS               ← EMERGENCY: Render too busy / high CPU?
     └── Do NOT run large revalidations here
     └── Use only for quick 500-proxy spot checks
     └── Flag: if CPU > 80% → skip, defer to next PC session

  4. MANUAL TRIGGER               ← User-initiated anytime from UI admin panel
     └── "Force Revalidate" button → queues for next available engine
```

> If Render CPU is overloaded during revalidation → flag it and queue the job locally.  
> Next time beast_harvest.mjs opens → it will pick up the deferred revalidation job.

### RTX 2060 Note:
> The GPU does **not** directly run HTTP requests (GPUs don't do TCP).  
> The benefit is indirect: Rust's tokio can spawn thousands of OS threads,  
> and your home CPU (not Render's throttled vCPU) handles massive parallelism.  
> For true GPU acceleration, we use CUDA for: cryptographic handshakes (TLS/SOCKS5),  
> bulk IP pattern matching, and hash deduplication — all Phase 20 features.  
> Current gain from local: **residential IP + 500+ concurrent = ~20x faster** than Render.

---

## 🧅 Hetzner VPS — Tor/Dark Web Hunting ONLY

**Role changed from:** Rust verifier (current)  
**Role changed to:** Dedicated Tor exit node hunter

### What it does (new design):
```
Hetzner VPS (78.47.104.43)
  ├── Runs Tor daemon (installed, with 100+ circuits)
  ├── Scrapes .onion proxy directories every 6 hours
  ├── Scrapes Tor-accessible proxy lists
  ├── Pushes raw candidates to cloud rawCandidateQueue
  └── Returns ONLY raw IPs — does NOT verify them
```

### Why NOT validate on VPS:
- VPS uses a Hetzner datacenter IP → ASN-blocked by YouTube and Instagram
- Cannot verify if a proxy works for real social media
- Your local PC (residential IP) is MUCH better for that

### Power Mode — Redesigned:
| Mode | Before | After (this design) |
|---|---|---|
| OFF | Node.js 20 concurrent | Same |
| ON | Hetzner Rust 500+ concurrent | **Local PC Rust 500+ concurrent** |
| Tor Mode (new) | N/A | Routes hunt through local Tor |

---

## 🖥️ Frontend Architecture

### ProxyMissionControl.tsx — Current Tabs + Planned Additions

```
┌─────────────────────────────────────────────────────────┐
│  NAV: [COMMAND] [HUNTING] [POOL] [MAP] [SYSTEM]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  COMMAND (Dashboard)                                     │
│  ├── Live stat cards (nodes, countries, latency)        │
│  ├── World map (proxy geo distribution)                 │
│  ├── Platform breakdown (YT/FB/IG/ALL3)                 │
│  └── Tier breakdown (Platinum/Gold/Bronze)              │
│                                                          │
│  HUNTING ✅ (Enhanced this session)                      │
│  ├── Mining Funnel (explains 200K→5K→280 pipeline)     │
│  ├── Dead/Near-Dead health cards                        │
│  ├── 4-Button action grid (Hunt/Reval/ForceAll/Purge)  │
│  ├── Hetzner VPS Mode toggle (correctly labeled)        │
│  └── Phase 1-19 checklist                              │
│                                                          │
│  POOL                                                    │
│  └── Sortable proxy table (tier, country, latency)     │
│                                                          │
│  MAP                                                    │
│  └── SVG world map with proxy density overlay          │
│                                                          │
│  SYSTEM ✅ (Enhanced this session)                       │
│  ├── Config cards (SAMPLE_SIZE, CHUNK_SIZE, timeouts)  │
│  ├── VPS Health Panel (Hetzner ping, Rust status)      │
│  ├── Dual Terminal:                                     │
│  │   ├── ☁️ Cloud Server Log (Render activity)          │
│  │   └── 💻 Local Machine Log (beast sync events)       │
│  └── User Guide (full operational manual)              │
│                                                          │
│  PLANNED (Phase 20+)                                    │
│  ├── LOCAL RUNNER tab (run beast_harvest directly)     │
│  ├── TOR MODE tab (launch local Tor hunting)           │
│  └── GPU STATS tab (RTX utilization via Rust)          │
└─────────────────────────────────────────────────────────┘
```

### Mode Differentiation in UI (Planned):

```tsx
// Three operating modes clearly shown in the UI header:
[AUTO: CLOUD 🟢]    // Render running, next hunt in 2:34:12
[LOCAL: IDLE ⚪]     // beast_harvest.mjs NOT running
[TOR: INACTIVE ⚫]  // Local Tor not connected
```

---

## ⚙️ Backend Architecture

### server/proxyScraperService.ts — Key Constants
```ts
const SAMPLE_SIZE    = 5000;   // Proxies tested per hunt
const CHUNK_SIZE     = 20;     // Concurrent workers on Render
const VERIFY_TIMEOUT = 10000;  // 10 seconds per proxy
const STALE_AGE_HOURS = 24;    // Revalidate proxies older than this
```

### Verification Engine Priority Chain:
```
verifyBatch(proxies)
  │
  ├─ powerMode ON + beast_harvest.mjs running locally?
  │     → ALL verification routed to LOCAL PC Rust binary
  │     • 500-2000+ concurrent (no Render CPU limit)
  │     • Residential IP (not ASN-blocked by YT/FB/IG)
  │     • ~30-90 sec / 5K proxies, ~5-15 min / 50K
  │     • Results synced to cloud DB in batches of 500
  │     • Tor check: if local Tor up → route dark-web proxies through it
  │     • If beast goes offline → fall through ↓
  │
  ├─ Hetzner VPS reachable? (fallback when local offline)
  │     → callHetznerVerify()
  │     • 500+ concurrent via Hetzner Rust binary
  │     • Datacenter IP (weaker hit rate for YT/IG)
  │     • Returns results in ~90 seconds
  │     • If unreachable → fall through ↓
  │
  ├─ Rust binary LOCAL running (no power mode)? → callRustVerify()
  │     • tokio async, unlimited concurrent
  │     • ~90 seconds for 5K proxies
  │     • If not running → fall through ↓
  │
  └─ Node.js fallback (Render only — emergency small batches)
        • 20 concurrent chunks
        • ~20-42 minutes for 5K proxies
        • Only for spot-checks (<500 proxies) if CPU not overloaded
        • Always available on Render as last resort
```

### API Endpoints (Proxy Hunter):
```
GET  /api/admin/proxy-status                  → Live dashboard data
POST /api/admin/proxy-trigger-hunt            → Manual hunt trigger
POST /api/admin/proxy-revalidate              → Tiered revalidation
POST /api/admin/proxy-force-revalidate-all    → Recheck ALL (ignore tier)
POST /api/admin/proxy-purge-dead              → Remove failCount ≥ 2
POST /api/admin/proxy-bulk-import             → Beast mode upload (local → cloud)
POST /api/admin/proxy-geo-enrich              → Fix XX country codes
POST /api/admin/proxy-toggle-power            → Toggle power mode
GET  /api/admin/proxy-download-pool           → Export verified pool as JSON
GET  /api/admin/proxy-download-queue          → Export raw candidate queue (for local Mode A)
GET  /api/admin/proxy-download-live           → Export live pool for local Mode B revalidation
DELETE /api/admin/proxy-remove                → Move dead proxy to BIN (not instant delete)
POST /api/admin/proxy-local-hunt              → Trigger local hunt (Power Mode ON only)
                                                  body: { duration: "2h", mode: "C", torEnabled: true }
GET  /api/admin/proxy-tor-status              → Check local Tor + Hetzner VPS Tor both alive
GET  /api/admin/proxy-bin                     → List all binned proxies + binnedAt timestamps
POST /api/admin/proxy-purge-bin               → Manually purge bin now (don't wait for 3AM)
```

> **`proxy-download-queue`** is the key new endpoint for local Mode A — returns ALL unverified
> raw candidates (50K-200K IPs) so beast_harvest.mjs can validate the full set locally.

> **`proxy-download-live`** returns the full live pool for local Mode B revalidation,
> which is faster and more accurate than Render's tiered scheduler.

### Data Schema (ProxyEntry):
```ts
{
  url: "socks5://1.2.3.4:1080",  // Full proxy URL
  platforms: {
    yt: true,          // Works for YouTube
    fb: true,          // Works for Facebook  
    ig: false,         // Failed Instagram test
    latencyMs: 342,    // Average response time (ms)
    country: "DE",     // ISO country code
    failCount: 0,      // Consecutive failures (moves to BIN at 3)
    lastCheckedAt: "2025-01-15T03:42:00Z",
    tier: "platinum",  // platinum|gold|bronze
    status: "active",  // active | binned
    binnedAt?: string  // ISO timestamp when moved to BIN (if binned)
  }
}
```

---

## 🔁 Full Data Flow — End to End

```
CLOUD AUTO MODE (every 3 hours, no user action needed):
───────────────────────────────────────────────────────
  1. Render cron fires
  2. Fetch 26 GitHub/Telegram/API sources → ~50-200K raw IPs
  3. Deduplicate against existing pool
  4. Random sample 5,000 new IPs
  5. Verify each against YT + FB + IG (Promise.all for 3 checks)
  6. ~200-400 pass → added to Upstash pool
  7. CountryCode geo-tagged via geoip-lite (offline)
  8. Tier computed: Platinum/Gold/Bronze based on latency+platforms
  9. UI auto-refreshes every 3s via polling
  10. Repeat in 3 hours

LOCAL MODE A — VALIDATE MINED QUEUE (find new live proxies):
──────────────────────────────────────────────────────────────
  1. beast_harvest.mjs pulls rawCandidateQueue from cloud DB
     → ALL raw IPs Render scraped but couldn't fully validate (50K–200K)
  2. Rust binary validates FULL queue (500+ concurrent, residential IP)
     → Takes 5–60 min depending on queue size
  3. Each passing proxy written to LOCAL proxies_local.json immediately
  4. Every 500 verified proxies → batch POST /api/admin/proxy-bulk-import
  5. Cloud DB merged, deduped, geo-tagged, tier-scored, saved
  6. Local terminal in UI shows each sync event live
  7. At end: queue marked as processed, cloud pool updated

LOCAL MODE B — REVALIDATE EXISTING LIVE POOL:
───────────────────────────────────────────────
  1. beast_harvest.mjs pulls verifiedProxies[] from cloud DB
  2. Run 4-layer dedup → skip already-binned entries
  3. Rust re-tests ALL at 500+ concurrent (~30–90 sec)
  4. Alive: failCount reset, tier re-scored, DB updated
  5. Dead: moved to BIN (binnedAt = NOW) → NOT deleted yet
  6. Cloud DB pool INTACT — only dead moved out of rotation
  7. UI shows: "X live, Y newly binned"

LOCAL MODE C — FULL BLAST (H + B + A, with time-span):
─────────────────────────────────────────────────────
  User triggers: node beast_harvest.mjs --mode=C --duration=2h

  Loop (repeats until time window exhausted):
    1. Check Tor status: local Tor + Hetzner VPS Tor
    2. Mode B: revalidate live pool → dead → BIN
    3. Mode H: scrape 26 OSINT sources + Tor sources (if active)
       └── 4-layer dedup → only fresh unique IPs proceed
       └── Push new raw IPs to rawCandidateQueue in cloud DB
    4. Mode A: validate full queue with Rust 500+ concurrent
       └── Every 500 verified → batch push to cloud DB
    5. Sub-cycle complete → sleep 5 min → repeat
  Loop ends when --duration expires:
    6. Final sync → proxies_local.json + cloud DB
    7. Print session summary: X hunted, Y verified, Z binned

LOCAL MODE H — HUNT ONLY (fresh scrape, no validation):
──────────────────────────────────────────────
  1. Scrape 26 OSINT sources + Tor (.onion) if available
  2. Pull Hetzner VPS Tor queue (if VPS online)
  3. 4-layer dedup → unique only
  4. Push ALL to rawCandidateQueue in cloud DB
  5. Done — Render or next Mode A session will validate
  Use case: fast stockpile before a long validation run

TOR HUNTING MODE (Hetzner VPS, new design):
────────────────────────────────────────────
  1. Hetzner VPS runs Tor daemon (10+ circuits)
  2. Every 6 hours: .onion proxy aggregators scraped via Tor
  3. Raw IPs pushed to cloud rawCandidateQueue (NOT verified yet)
  4. Render or local validator picks them up from queue
  5. Validates them normally (Tor proxies often work differently)

DEAD NODE BIN LIFECYCLE (NEW — pool never destroyed):
──────────────────────────────────────────────────────
  1. During any revalidation run, proxy fails 3 consecutive tests
  2. Proxy STATUS = "binned" — removed from active rotation instantly
  3. Proxy moved to binnedProxies[] with timestamp = NOW
  4. Pool continues serving remaining live proxies (pool intact)
  5. Scheduled 3AM job: purge all entries where (NOW - binnedAt > 24h)
  6. Permanent deletion only happens at scheduled purge, not inline
  7. UI shows: "X live" and "Y in bin (purge in Zh)"
  8. Manual "Purge Dead Now" button available in admin panel

PROXY POOL GROWTH STRATEGY:
─────────────────────────────
  Day 1:    ~280  verified proxies  (baseline)
  Week 1:   ~2,000–5,000           (daily local beast runs)
  Month 1:  ~10,000–20,000+        (continuous hunting + revalidation)
  Sellable: Once > 5,000 verified → sell API access as Premium Proxy SaaS
  Revenue:  $10–50/month per customer for reliable YT+FB+IG proxy pool
```

---

## 🗂️ Tier System — How Quality is Computed

```
After verification, each proxy is scored:

  Platinum ⭐⭐⭐  → <500ms latency + ALL THREE platforms (YT+FB+IG)
                   → Revalidated every 30 minutes
                   → Used first for downloads

  Gold     ⭐⭐    → 500ms-2000ms OR 2/3 platforms pass
                   → Revalidated every 2 hours

  Bronze   ⭐      → >2000ms OR only 1 platform passes
                   → Revalidated every 24 hours
                   → Last resort in rotation

  BIN      🗑️      → failCount reaches 3 → MOVED TO BIN (NOT deleted yet)
                   → Removed from active rotation immediately
                   → Sits in binnedProxies[] for 24 hours
                   → Scheduled 3AM purge deletes all 24h+ bin entries
                   → Gives chance for temporary outages to recover
                   → Bin count shown in UI ("X nodes in bin")
```

> **Why BIN instead of instant delete?**  
> A proxy may fail 3x due to temporary rate-limiting or platform downtime — not because it's truly dead.  
> BIN gives it a 24-hour window before final disposal. Pool is never accidentally shrunk by a temporary blip.

---

## 🛠️ Current Implementation Status

### ✅ Already Built & Deployed

| Component | File | Status |
|---|---|---|
| 26-Source OSINT scraper | `server/proxyScraperService.ts` | ✅ Live |
| 3-Hour auto hunt cron | `server/routes/system.ts` | ✅ Live |
| Platform verifier (YT/FB/IG) | `server/proxyScraperService.ts` | ✅ Live |
| Tiered revalidation (30m/2h/24h) | `server/proxyScraperService.ts` | ✅ Live |
| 3-Strike auto-ban | `server/proxyScraperService.ts` | ✅ Live |
| Hetzner Rust verifier API | `server/rustVerifier.ts` | ✅ Live |
| Local Rust binary | `server/rust-verifier/src/main.rs` | ✅ Compiled |
| Force-revalidate-all | `server/proxyScraperService.ts` | ✅ Live |
| Purge dead nodes | `server/proxyScraperService.ts` | ✅ Live |
| GeoIP enrichment | `server/proxyScraperService.ts` | ✅ Live |
| Cloud + Local dual terminal | `ProxyMissionControl.tsx` | ✅ Live |
| Mining Funnel visualization | `ProxyMissionControl.tsx` | ✅ Live |
| 4-Button action grid | `ProxyMissionControl.tsx` | ✅ Live |
| Dead/Near-dead health cards | `ProxyMissionControl.tsx` | ✅ Live |
| Power Mode (Hetzner) | `ProxyMissionControl.tsx` | ✅ Live (labels fixed) |
| Beast mode bulk import | `server/routes/system.ts` | ✅ Live |
| Pool → Downloader wired | `server/proxyService.ts` | ✅ Live |

### 🔧 Pending — Phase 20+

| Feature | Priority | Effort |
|---|---|---|
| **P20: rawCandidateQueue in cloud DB** (store ALL scraped IPs, not just 5K) | 🔴 High | Medium |
| **P21: `GET /api/admin/proxy-download-queue`** (serve full queue to local machine) | 🔴 High | Small |
| **P22: `GET /api/admin/proxy-download-live`** (serve live pool to local revalidator) | 🔴 High | Small |
| **P23: beast_harvest.mjs Mode A** (pull queue → Rust validate → dual-write) | 🔴 High | Medium |
| **P24: beast_harvest.mjs Mode B** (pull live pool → Rust revalidate → sync) | 🔴 High | Medium |
| **P25: beast_harvest.mjs Mode C** (full blast = A + B + fresh scrape) | 🟡 Medium | Small |
| **P26: Local Rust binary runs on YOUR PC** (not Hetzner VPS) | 🔴 High | Medium |
| **P27: Power Mode = Local PC** (not Hetzner VPS) | 🔴 High | Small |
| **P28: Hetzner → Tor-only mode** (redesign VPS role) | 🟡 Medium | Medium |
| **P29: BIN state in cloud DB** (`binnedProxies[]` with timestamp, removed from active rotation) | 🔴 High | Medium |
| **P30: 24h scheduled purge** (3AM daily job: delete all bin entries older than 24h) | 🔴 High | Small |
| **P31: beast startup check** (on open → prompt revalidate → bg Mode B → dead → BIN) | 🔴 High | Medium |
| **P32: Revalidation engine fallback** (local → VPS → Render → manual queue if CPU high) | 🔴 High | Medium |
| **P33: UI BIN panel** (show binnedCount, time-to-purge, manual "Purge Now" button) | 🟡 Medium | Small |
| **P34: beast_harvest.mjs auto-mode** (runs on 30m cron locally) | 🟡 Medium | Small |
| **P35: Local Tor integration** (hunt through Tor on PC) | 🟡 Medium | Medium |
| **P36: RTX 2060 CUDA dedup** (GPU-accelerated hashing) | 🟢 Low | Large |
| **P37: LOCAL RUNNER tab in UI** (start beast from browser, shows output) | 🟢 Low | Medium |
| **P38: Proxy Pool SaaS API** (sell access once pool > 5K — rate-limited API keys) | 🟢 Low | Large |

---

## 📋 Functional Design — Mode Matrix

| Trigger | Location | Verification Engine | IP Type | Speed | Use Case |
|---|---|---|---|---|---|
| Auto cron (3h) | Render | Node.js 20-concurrent | Datacenter | ~40 min / 5K | 24/7 background hunt |
| Manual UI → HUNT | Render | Rust or Node.js | Datacenter | ~90s or ~40min | Quick cloud boost |
| Manual UI → FORCE REVAL ALL | Render | Rust or Node.js | Datacenter | ~90s or ~40min | Cloud pool cleanup |
| **beast Mode A** (validate queue) | **Your PC** | **Rust 500+ concurrent** | **Residential** | **~5-60 min / 50K-200K** | **Find max new proxies** |
| **beast Mode B** (revalidate live) | **Your PC** | **Rust 500+ concurrent** | **Residential** | **~30-90 sec / full pool** | **Clean pool fast** |
| **beast Mode C** (full blast) | **Your PC** | **Rust 500+ concurrent** | **Residential** | **~10-70 min total** | **Maximum power run** |
| Local Tor Mode (planned) | Your PC + Tor | Rust → Tor circuits | Tor exit nodes | ~5-20 min | Dark web proxy hunt |
| Hetzner Tor Hunt (planned) | Hetzner | Tor scraper | Tor network | ~10-30 min | .onion sources only |

---

## 🔐 Security Notes

- All admin endpoints require `Authorization: Bearer <sessionId>` + `X-CSRF-Token`
- Beast mode bulk import requires `BEAST_MODE_SECRET` env var match
- Proxy URLs stripped before logging (no credentials exposed)
- Hetzner VPS: SSH key auth only, no password login
- Local Rust binary: communicates over localhost only (port 9876)

---

## 🚀 Next Step: Phase 20-25 — Full Local Power Unlock

After your review of this document, we build in this order:

1. **P20:** Add `rawCandidateQueue` to cloud DB — Render stores ALL scraped IPs (not just 5K sample) every hunt
2. **P21-22:** Add two new API endpoints: `proxy-download-queue` and `proxy-download-live` so local machine can pull both datasets
3. **P23-24:** Upgrade `beast_harvest.mjs` with Mode A (validate queue) + Mode B (revalidate live pool) + dual-write (local file + cloud push)
4. **P25:** Mode C (full blast) = scrape fresh + Mode B + Mode A in sequence
5. **P26-27:** Rewire Power Mode toggle to point at local PC Rust binary instead of Hetzner
6. **P28:** Reconfigure Hetzner VPS as Tor-only dark web scraper

**Result:** Your RTX 2060 PC validates 50K-200K proxies in one run. Cloud handles 24/7 discovery. Together the pool grows from ~280 to potentially 5,000-20,000 verified proxies over a few sessions.

### Pool Health Rules (Zero-Shrink Guarantee)
- **NEVER do a full wipe** — only revalidate and move failures to BIN
- **BIN** = soft-delete buffer; proxy removed from rotation but not purged for 24 hours
- **Scheduled 3AM purge** = only time permanent deletion happens
- **Local PC open** = beast auto-revalidates in background (one-time per session)
- **Render overloaded** = defer revalidation to next local PC session or Hetzner VPS
- **Manual option always available** = "Force Revalidate" + "Purge Dead" in admin UI

**Pool growth trajectory (realistic):**
```
Now:      ~280 verified nodes
In 1 week:  2,000–5,000 (daily beast runs)
In 1 month: 10,000–20,000+
Monetize: Sell Premium Proxy API at $10-50/mo when pool > 5K strong
```

**Ask before proceeding** if anything in this design needs correction.

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
