# 🔴 ULTIMATE RED TEAM: OMNI-PROXY HUNTER ARCHITECTURE (v4.1)

---

## 🚨 GOLDEN RULES — READ BEFORE ANYTHING ELSE

```
🔴 RULE 1 — NO PHASE JUMPING
         Phases must be done in order: 11 → 12 → 13 → 14...
         Each phase UNLOCKS the next. Never skip.
         Reason: each phase adds data/infrastructure the next one depends on.

🔴 RULE 2 — POWER COMPOUNDS
         Each phase you complete makes the NEXT phase more powerful.
         Phase 11 (latency) makes Phase 14 (tiered revalidation) smarter.
         Phase 15 (Telegram) feeds Beast Mode (Phase 23) with fresh candidates.
         Don't rush. Build the stack layer by layer.

🔴 RULE 3 — COST BOUNDARY (see full table below)
         Render + VPS combined must NEVER exceed 5$/month before first revenue.
         Local machine = FREE and should be used for heavy lifting (Beast Mode).
         Scale infra ONLY when the proxy API earns money first.

🔴 RULE 4 — BIG POOL = BIG MONEY (The Mission)
         Target: 10,000+ live verified proxies in pool.
         Revenue model: sell access to the pool via API.
         Path: 300 now → 1,500 (Phase 16) → 5,000 (Phase 19) → 25,000 (Beast Mode).

🔴 RULE 5 — LOCAL = FULL POWER, SERVER = BUDGET POWER
         Render/VPS runs light 24/7 patrol on a budget.
         Your LOCAL machine runs Beast Mode for explosive one-shot harvests.
         Combine both for maximum pool without maximum spend.
```

---

## 🗺️ VIBE CODER PROGRESS TRACKER — COMPLETE MASTER ROADMAP

> ✅ = DONE & LIVE right now &nbsp;|&nbsp; ⏳ = NEXT UP (say "do phase X") &nbsp;|&nbsp; 🔒 = PLANNED FUTURE

---

### 🟢 TIER 1 — CORE HUNT ENGINE (Server-side, Node.js)

```
✅ PHASE 1  — Basic proxy hunter built (proxyScraperService.ts created)
✅ PHASE 2  — 26-Source OSINT engine (12 orig + 14 new mega-dumps + APIs) ← JUST UPGRADED
✅ PHASE 3  — Platform verifier (YT + FB + IG checked per proxy in parallel)
✅ PHASE 4  — Deduplication (skip already-known proxies before verifying)
✅ PHASE 5  — File persistence (data/proxies.json — survives server restart)
✅ PHASE 6  — 3-hour auto-hunt cron (node-cron, fires every 3h automatically)
✅ PHASE 7  — 3AM daily re-validation cron (re-checks ALL stored proxies, purges dead)
✅ PHASE 8  — Lifetime stats (huntCount, totalEverFound, lastHuntAt, nextHuntAt)
✅ PHASE 9  — Cyber Sentinel admin UI (5 stat cards, countdown timer, telemetry)
✅ PHASE 10 — Masterplan doc written (PROXY_EMPIRE_MASTERPLAN.md — private, gitignored)
```

---

### � TIER 2 — QUALITY & INTELLIGENCE UPGRADES [ALL SHIPPED ✅]

```
✅ PHASE 11 — Latency badge  [SHIPPED]
              WHAT: Measure response time (ms) during verification
              HOW:  Date.now() before/after 3 platform checks → latencyMs stored per proxy
              RESULT: Green (<500ms) / Yellow (<2s) / Red (>2s) in table + avg latency stat card
              UPGRADE: getBestProxyForDownload() now prefers lowest-latency proxies (top 5)
              FILES: server/proxyScraperService.ts + server/proxyService.ts + admin.tsx

✅ PHASE 12 — Country flag (Geo-tag)  [SHIPPED]
              WHAT: Offline GeoIP detection using geoip-lite (npm, no API key, no rate limit)
              HOW:  Extract IP from proxy URL → geoip.lookup(ip) → 2-letter ISO code
              RESULT: Flag emoji per proxy row (🇺🇸 🇩🇪 🇳🇱) + country in expanded detail
              FILES: server/proxyScraperService.ts + admin.tsx
              DEP:   geoip-lite + @types/geoip-lite installed

✅ PHASE 13 — 3-Strike auto-prune  [SHIPPED]
              WHAT: Track failCount per proxy, soft-ban increments, purge at 3 consecutive fails
              HOW:  banProxy() first 2 calls increment failCount, 3rd call = permanent purge
                    Revalidation also uses 3-strike (increments on fail, resets on success)
                    UI shows ♥3 (healthy) / ♥2 / ♥1 (critical) hearts per proxy
              RESULT: Pool self-heals, no instant wipe of temporarily flaky proxies
              FILES: server/proxyService.ts (banProxy) + server/proxyScraperService.ts (revalidation)

✅ PHASE 14 — Tiered revalidation timing  [SHIPPED]
              WHAT: Quality tiers auto-computed during verification:
                    Platinum: <500ms latency + all 3 platforms → recheck every 30 min
                    Gold:     2+ platforms → recheck every 2h
                    Silver:   1 platform + <2s latency → recheck every 6h
                    Bronze:   slow / weak → recheck every 24h
              HOW:  runRevalidation() now checks lastCheckedAt + tier interval
                    Skips proxies not yet due → saves CPU
                    Cron upgraded: 30-min cycle (tiered) + daily 3AM full sweep
              RESULT: Platinum proxies always fresh, bronze don't waste CPU
              FILES: server/proxyScraperService.ts + server/index.ts
              UI:    5 new tier stat cards (Platinum/Gold/Silver/Bronze/Avg Latency)

✅ PHASE 15 — Telegram live mining  [SHIPPED]
              WHAT: Scrape 4 public Telegram channels via web preview (no API key!)
              HOW:  fetch('https://t.me/s/CHANNEL') → HTML → IP:PORT regex → emit http:// + socks5://
              CHANNELS: proxylist_free, Proxy_List_Premium, socks5_bot, freeproxylist_daily
              RESULT: +500–2000 extra candidates per hunt cycle, completely FREE
              FILE: server/proxyScraperService.ts (scrapeTelegram method + TELEGRAM_SOURCES array)

✅ PHASE 16 — Connect pool → downloader (THE BIG ONE)  [SHIPPED]
              WHAT: Wire verified proxy pool into YT-dlp and IG download routes
                    getBestProxyForDownload('yt') picks lowest-latency platform-best proxy
                    3-layer waterfall: FREE pool proxy → direct fallback → ASocks paid (LAST RESORT)
                    Auto-bans pool proxy via 3-strike system if it fails
                    getBestProxyForDownload() and bulkImport() live in proxyService.ts
                    POST /api/admin/proxy-bulk-import added to system.ts for Beast Mode sync
              RESULT: Downloads bypass bans using FREE mined proxies first, ASocks only as last resort
              FILES: server/proxyService.ts + server/routes/downloader.ts + server/routes/system.ts
              TIME: DONE ✅

╔══════════════════════════════════════════════════════════════════╗
║    PHASE 16 ARCHITECTURE v3.0 — ALL FREE FIRST, PAID LAST      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │  RENDER (24/7)                                           │   ║
║  │  ┌─────────────┐    cron 3h+3AM    ┌────────────────┐   │   ║
║  │  │ proxy hunt  │ ──────────────→  │  live proxy    │   │   ║
║  │  │ 30 sources  │                   │  pool (Redis)  │   │   ║
║  │  └─────────────┘                   └───────┬────────┘   │   ║
║  │                                             │            │   ║
║  │  ═══════════════════════════════════════════════════════ │   ║
║  │  SMART AUTO-FALLBACK (fetchSmartMetadata)               │   ║
║  │  ALL FREE methods exhausted before ANY paid usage:      │   ║
║  │                                                          │   ║
║  │  1. 🟢 Layer 1: Hetzner Cobalt         (FREE · YT/IG)  │   ║
║  │     ↓ fail                                               │   ║
║  │  2. 🔵 Layer 2: CF Edge Swarm          (FREE · YT/IG)  │   ║
║  │     ↓ fail                                               │   ║
║  │  3. 🟣 Layer 3: Hetzner IPv6           (FREE · YT)     │   ║
║  │     ↓ fail                                               │   ║
║  │  4. 🟡 Layer 4: YTDL-Core + PO-Token   (FREE · YT)    │   ║
║  │     ↓ fail                                               │   ║
║  │  5. 🆓 Layer 7: Free Proxy Pool  ←─────┘               │   ║
║  │     (mined OSINT proxies, $0, all platforms)             │   ║
║  │     auto-ban on failure via 3-strike                     │   ║
║  │     ↓ fail                                               │   ║
║  │  6. 🔴 Layer 6: ASocks Paid  ($0.003/req)  ⚠️ LAST     │   ║
║  │     ONLY reached after ALL free layers are dead          │   ║
║  │  ═══════════════════════════════════════════════════════ │   ║
║  │                                                          │   ║
║  │  executeYtDlpExtract (used internally by Layer 6):      │   ║
║  │  1. Free pool proxy (getBestProxyForDownload)           │   ║
║  │  2. Direct (no proxy)                                    │   ║
║  │  3. ASocks paid (absolute last resort)                   │   ║
║  │  ═══════════════════════════════════════════════════════ │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                              ↑                                   ║
║                    POST /api/admin/proxy-bulk-import             ║
║                    (secret-guarded, max 50k/batch)               ║
║                              ↑                                   ║
║  ┌─────────────────────────────────────────────────────────┐   ║
║  │  LOCAL BEAST MODE (Phase 23 — triggered manually)       │   ║
║  │  ┌────────────────────────────────────────────────────┐ │   ║
║  │  │  1. Run harvest script locally (no Hetzner risk)   │ │   ║
║  │  │  2. Mine 5k-20k candidates from 30+ sources        │ │   ║
║  │  │  3. Verify with p-limit(200) concurrent checks     │ │   ║
║  │  │  4. POST to /api/admin/proxy-bulk-import           │ │   ║
║  │  │  5. Server pool instantly grows by thousands       │ │   ║
║  │  └────────────────────────────────────────────────────┘ │   ║
║  └─────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  RESULT: ALL free paths (L1→L2→L3→L4→L7) exhaust before        ║
║  ASocks (L6) ever touches a single paid request. Downloads      ║
║  silently route through mined pool with zero user friction.      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### 🔵 TIER 3 — DARK WEB & DEEP OSINT (High value, needs VPS)

```
🔒 PHASE 17 — Tor bridge setup (Hetzner VPS only)
              WHAT: Install Tor daemon on VPS (apt-get install tor)
                    Opens silent SOCKS5 proxy at 127.0.0.1:9050
              REQUIRES: Hetzner VPS (Render.com cannot install Tor)
              COST: €3.29/month (Hetzner CAX11)

🔒 PHASE 18 — Dark web (.onion) proxy ingestion
              WHAT: Use Tor bridge (Phase 17) to fetch .onion pastebin directories
                    Cybersec communities dump anonymous SOCKS5 lists here
                    Standard web scrapers NEVER see these
              RESULT: Highly anonymous proxies that never appear in GitHub lists
              HOW:  socks-proxy-agent pointed at 127.0.0.1:9050 → fetch .onion URLs
                    Run Master Regex (\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b)
              FILE: server/proxyScraperService.ts (add ONION_SOURCES)

🔒 PHASE 19 — Active port discovery (Beast Mode source)
              WHAT: Scan public IP ranges for open SOCKS5/HTTP proxy ports
                    Port ranges: 80, 443, 1080, 3128, 8080, 8888, 9050, 9150
                    Finds "dark" proxies that never appeared in any GitHub list
              NOTE: Only scans public IP space (legal for research)
              TOOL: masscan-style in Rust (next tier), or nmap in Node.js for now
```

---

### 🔴 TIER 4 — RUST DESKTOP APP: PROXYFORGE

```
🔒 PHASE 20 — ProxyForge app scaffold
              WHAT: Tauri v2 project (Rust backend + React frontend)
                    Same React UI from admin.tsx embedded inside
                    Real .exe installer (Windows), .dmg (Mac), .deb (Linux)
                    5–10MB binary, 8–20MB RAM idle

🔒 PHASE 21 — System tray integration
              WHAT: App runs in background, right-click tray icon to control
              TRAY MENU: Open Dashboard / Status / Pool count / Next hunt
                         Beast Mode ON/OFF / Patrol Mode / Force Hunt / Quit
              ICONS: 🟢 hunting / 🔵 idle / 🟡 syncing / 🔴 pool empty
              NOTIFS: "Hunt Complete: +143 proxies" (Windows/Mac notifications)

🔒 PHASE 22 — Patrol Mode (always-on, background safe)
              WHAT: Every 2.5 hours, 20 concurrent connections, 5% CPU
                    Same 12 OSINT sources as server
                    Leave it on 24/7, barely noticeable

🔒 PHASE 23 — Beast Mode (full CPU/GPU hammer)
              WHAT: Manual toggle in tray → uses ALL CPU cores (Rayon parallel)
                    500–2000 concurrent connections (Tokio async runtime)
                    GPU acceleration for AI inference (ONNX Runtime + CUDA)
                    25,000+ candidates per run → 500–2000 verified proxies/session
                    Sources: 12 OSINT + Telegram + Dark web + port scanner
              SAFETY: Auto-throttle if CPU temp > 80°C

🔒 PHASE 24 — Auto-start with Windows
              WHAT: App starts on boot, goes straight to tray (no window popup)
                    Begins Patrol Mode 10s after startup silently
```

---

### 🟣 TIER 5 — AI BRAIN LAYER

```
🔒 PHASE 25 — ONNX fast classifier (pre-filter)
              WHAT: Train binary classifier on our proxies.json data
                    Features: [country_tier, port_type, protocol, ASN_score, age_hours]
                    Output: liveness probability 0.0–1.0
                    Model size: ~500KB, inference < 1ms per proxy
              RESULT: Filter out bottom 40% junk before verifying → 40% faster hunts
              TOOL:   scikit-learn → exported to ONNX → run via onnxruntime-node
              TRAIN:  python scripts/train_classifier.py (uses our own data)

🔒 PHASE 26 — Ollama LLM deep scoring (optional premium)
              WHAT: phi-3-mini (3.8B) or tinyllama (1.1B) running locally via Ollama
                    Deep reasoning on proxy metadata: ASN, location, port fingerprint
              WHEN:  Used only on final 100 "candidate-premium" proxies after ONNX filter
              COST:  Free, runs on your machine, no API
              INSTALL: ollama pull phi3:mini (one command)

🔒 PHASE 27 — Self-improving model
              WHAT: After 1 week of mining, re-train classifier on new labeled data
                    Every verified proxy = positive example
                    Every failed proxy = negative example
              RESULT: Model gets smarter every week automatically
```

---

### ⚫ TIER 6 — OFFLINE MODE + SYNC

```
🔒 PHASE 28 — SQLite local storage
              WHAT: All proxies stored in local SQLite DB (rusqlite) in the desktop app
                    Can hold 10 million proxy records in < 50MB
                    Works 100% offline — no internet needed to mine and store

🔒 PHASE 29 — Sync queue (offline → online merge)
              WHAT: When offline: mine, validate, store locally (synced: false)
                    When internet returns: push all pending to Render backend
                    Endpoint: POST /api/admin/proxy-bulk-import
                    Conflict: if proxy exists on server → skip (deduplicate)
              RESULT: Mine all day offline, sync all at once when back online

🔒 PHASE 30 — Offline validation (no internet)
              WHAT: Structure check, port validity, offline GeoIP ASN lookup
                    Geo scoring without connecting (DE/NL = tier 1 without verifying)
                    Freshness scoring based on source age
```

---

### 💰 TIER 7 — MONETIZATION & SaaS

```
🔒 PHASE 31 — Proxy API backend (proxyforge.onrender.com)
              WHAT: Separate Render service (NOT bongbaricomedy — keep them independent)
                    GET /v1/proxy?platform=yt&tier=gold → returns one verified proxy
              PRICING: Free (10/day) / Starter $9/mo / Pro $29/mo / Business $99/mo
              LIST ON: RapidAPI marketplace (free listing, millions of devs)

🔒 PHASE 32 — Daily proxy list download page
              WHAT: proxyforge.io website, free download (100 proxies/day)
                    Premium: $5/month → 5000 proxies, hourly refresh, platform-filtered

🔒 PHASE 33 — BongBari Premium tier
              WHAT: BongBari Pro ($5/month) → unlimited downloads via platinum proxy pool
                    Every existing BongBari user is a potential customer, zero acquisition cost

🔒 PHASE 34 — B2B white-label API
              WHAT: Sell entire proxy pool + API to agencies (SEO, social media, research)
                    $500–$2,000/month per client → just 2 clients = $1,000–4,000/month

🔒 PHASE 35 — Smart rotation API (per-user, per-session)
              WHAT: Each API user gets different proxies (no overlap)
                    Session-sticky (same proxy 15 min per session)
                    Weighted health score rotation (fastest first)
                    Geo-aware (user in US → prefer US proxy)
                    Anti-abuse: rate limit per API key, per proxy per 10 min
```

---

### 🛠️ TIER 8 — OTHER TOOLS BUILT ON THE POOL

```
🔒 PHASE 36 — SEO rank checker tool
              WHAT: Check website Google rank from 50 countries via our geo proxy pool
              SELL TO: SEO agencies ($10/month per domain monitored)

🔒 PHASE 37 — Geo price intelligence API
              WHAT: Check Amazon/Netflix/Spotify prices from any country
                    Route via our country-specific proxies
              SELL AS: API ($20/month)

🔒 PHASE 38 — Social media scraper API
              WHAT: IG follower count, YT subscribers, FB page stats — no rate limits
              SELL TO: Marketing agencies, analytics tools

🔒 PHASE 39 — BongBari geo-unlock feature
              WHAT: "This video unavailable in your country" → auto-route via US/UK proxy
                    Add as BongBari Pro feature
```

---

### 📊 LEGEND

```
✅ = Built and live on bongbaricomedy.onrender.com RIGHT NOW
⏳ = Ready to build — say "do phase X" to start
🔒 = Planned — confirm before starting
```

**HOW TO USE THIS (NO JUMPING):**
- Tier 1 + 2 complete. Current next phase: **Phase 17** (Tor bridge setup) → say "do phase 17"
- After Phase 17 done → say "do phase 18", and so on in order
- Want to know what's coming? Read the sections below.

---

## 🌐 MASTER SOURCE LIST — ALL 25+ PROXY SOURCES

> Activated progressively. More phases = more sources = bigger pool.

### ✅ LIVE NOW (26 sources — upgraded from 12)

**TIER A — SOCKS5 GitHub Lists**
```
01. TheSpeedX/PROXY-List/master/socks5.txt
02. monosans/proxy-list/main/proxies/socks5.txt
03. hookzof/socks5_list/master/proxy.txt
04. officialputuid/KangProxy/KangProxy/socks5/socks5.txt
05. roosterkid/openproxylist/main/SOCKS5_RAW.txt
```

**TIER A — HTTP GitHub Lists**
```
06. TheSpeedX/PROXY-List/master/http.txt
07. monosans/proxy-list/main/proxies/http.txt
08. officialputuid/KangProxy/KangProxy/http/http.txt
09. roosterkid/openproxylist/main/HTTPS_RAW.txt
10. ALIILAPRO/Proxy/main/http.txt
11. clarketm/proxy-list/master/proxy-list-raw.txt
```

**TIER B — MEGA-DUMP Aggregators (NEW — 50k+ candidates/day each)**
```
12. MuRongPIG/Proxy-Master/main/http.txt       → massive aggregation, hourly
13. MuRongPIG/Proxy-Master/main/socks5.txt
14. Zaeem20/FREE_PROXIES_LIST/master/http.txt  → frequent updates
15. Zaeem20/FREE_PROXIES_LIST/master/socks5.txt
16. vakhov/free-proxy-list/main/proxies/http.txt  → cleaned, deduped
17. vakhov/free-proxy-list/main/proxies/socks5.txt
18. caliphdev/Proxy-List/master/http.txt
19. mmpx12/proxy-list/master/socks5.txt
20. mmpx12/proxy-list/master/http.txt
```

**TIER C — Raw Web Endpoints (NEW — no GitHub rate limit)**
```
21. multiproxy.org/txt_all/proxy.txt
22. rootjazz.com/proxies/proxies.txt
23. proxyspace.pro/http.txt
24. proxyspace.pro/socks5.txt
```

**TIER D — Structured APIs (NEW — clean JSON/text)**
```
25. api.proxyscrape.com/v2/ HTTP  (all countries, all anon levels)
26. api.proxyscrape.com/v2/ SOCKS5 (all countries)
```

### 🔒 UNLOCK AT PHASE 15 — Telegram Web Scrape (no API key!)

> KEY TRICK: Scrape the PUBLIC web preview `t.me/s/CHANNEL` (not Telegram API)
> These pages show all recent messages in plain HTML — run IP:PORT regex on them.

```
T1. t.me/s/proxylist_free        → active, hourly posts, IP:PORT in message bubbles
T2. t.me/s/Proxy_List_Premium    → SOCKS5 focus, premium channel but public
T3. t.me/s/socks5_bot            → bot-posted, structured dumps
T4. t.me/s/freeproxylist_daily   → daily batch dumps, consistent timing

SCRAPE METHOD: fetch('https://t.me/s/CHANNEL') → extract text → run PROXY_REGEX
NO API KEY, NO BOT TOKEN, NO LIMITS — pure HTTP fetch
```

### 🔒 UNLOCK AT PHASE 18 — Dark Web Sources (Hetzner VPS + Tor)
```
D1. .onion pastebin directories  → anonymous SOCKS5 dumps, never indexed by Google
D2. Tor hidden proxy forums      → cybersec communities dump fresh lists here
D3. Paste0r / DeepPaste .onion   → curated underground proxy lists
D4. i2p network pastebins        → secondary network for extra anonymity

METHOD: socks-proxy-agent → 127.0.0.1:9050 (Tor on Hetzner) → fetch .onion URL
        Run PROXY_REGEX on response text → same validation pipeline
```

### 🔒 UNLOCK AT PHASE 19 — Active Port Scan (SAFE ARCHITECTURE)

> ⚠️ DO NOT scan from Hetzner — instant ban. DO NOT scan from Render — also banned.
> See PHASE 19 SAFE ARCHITECTURE section below.

```
P1. Offshore scanner node (FlokiNET/Shinjiru) runs Masscan
    Ports: 8080 (HTTP), 1080 (SOCKS), 3128 (Squid), 80, 443, 8888
    Finds: misconfigured corporate routers, open Squid servers
    Yield: 100,000–500,000 raw candidates per full scan
    These proxies NEVER appear on any GitHub list — 100% unique

ALTERNATIVE (no VPS needed):
    Shodan API query: port:"3128" product:"Squid http proxy"
    Shodan API query: port:"1080" "SOCKS5"
    Shodan API query: "X-Forwarded-For" port:8080
    Cost: Shodan API membership = $49/year (worth it at Phase 19 scale)
```

---

## 💰 COST BOUNDARY — HARD RULES (1 VPS ONLY)

> **You have: 1× Hetzner CAX11 (already paid). That is your ONLY VPS. Do NOT buy more.**
> **Hard rule: Render + 1 existing VPS must cover everything. Local GPU does the rest.**

### Infra Assignment (FIXED — do not change)
```
┌───────────────────────────────┬──────────────────────┐
│ Render (FREE or $7)          │ BongBari website + proxy    │
│                               │ hunt API (24/7 patrol cron) │
├───────────────────────────────┼──────────────────────┤
│ Hetzner CAX11 (€3.29/month)  │ Tor daemon ONLY             │
│                               │ (.onion scraping at Phase 18)│
│                               │ ❌ NOT for port scanning     │
│                               │ ❌ NOT for heavy validation  │
├───────────────────────────────┼──────────────────────┤
│ Your LOCAL GPU machine ($0)  │ Beast Mode harvests         │
│                               │ All-core OSINT hunting      │
│                               │ Port scanning (Phase 19)    │
│                               │ ONNX/AI inference (Phase 25) │
│                               │ ProxyForge tray app (Phase 20)│
└───────────────────────────────┴──────────────────────┘
TOTAL MAX SPEND: ~$10.50/month (€3.29 + $7 Render)
```

### Phase 19 Port Scan — DO NOT use Hetzner or Render
```
❌ HETZNER SCANNING = INSTANT SERVER TERMINATION
   Hetzner's automated systems detect outbound port scans immediately.
   They TERMINATE without warning. You lose the Tor VPS too.

✅ SAFE OPTIONS FOR PORT SCANNING (Phase 19):

OPTION A — Shodan API (recommended first)
  Price: Free tier (limited) or $49/year for full API access
  No VPS needed. Query their database instead of scanning yourself.
  Shodan has already scanned the entire internet — just query it.

OPTION B — Run Masscan on YOUR LOCAL GPU machine
  Your residential IP is far less likely to get complaints than a VPS.
  Run once per week during off-hours (3AM), not continuous.
  ISP may warn once but rarely terminates residential for research scans.

OPTION C — Offshore VPS (future, after revenue)
  FlokiNET (Iceland) or BuyVM (Luxembourg) explicitly allow port scanning
  Cost: ~$5–10/month. Only worth it if pool > 10,000 and API has customers.
  DO NOT get until Phase 31 (monetization) is earning money.
```

---

## 📊 PROXY YIELD ESTIMATES — HOW MANY LIVE PROXIES PER PHASE

> "Live" = verified working for at least 1 platform (YT, FB, or IG) right now.

```
┌──────────────────────────────────────────────────────────────────────┐
│ PHASE RANGE       │ SOURCES           │ CANDIDATES/RUN │ LIVE IN POOL  │
├──────────────────┼──────────────────┼────────────────┼───────────────┤
│ Phase 1-10 (was) │ 12 GitHub lists   │ ~2,500         │ 50–300 live   │
│ NOW (26 sources)  │ 26 src w/MegaDump │ ~15,000–30,000 │ 200–800 live  │
│ Phase 11-14       │ 26 sources        │ ~20,000        │ 400–1,200 live │
│                   │ + smart caching   │                │ (tiered fresh)│
│ Phase 15 + Tgm    │ 26 + 4 Telegram   │ ~25,000+       │ 600–1,500 live │
│ Phase 18 darkweb  │ 26 + Tor onion    │ ~35,000        │ 1,000–3,000   │
│ Phase 19 Shodan   │ 26 + Shodan dorks │ ~60,000+       │ 2,000–5,000   │
│ Phase 19 local    │ 26 + local scan   │ ~200,000+      │ 5,000–12,000  │
│ Phase 23 Beast    │ ALL + local GPU   │ ~500,000/run   │ 10,000–25,000 │
│ Phase 25 AI       │ ALL + ONNX filter │ ~500,000       │ 12,000–30,000+│
└──────────────────┴──────────────────┴────────────────┴───────────────┘
```

**Why live count is much lower than candidates:**
- ~80-90% of found proxies are dead when we test them (normal in the industry)
- Of the 10-20% alive, only 30-50% pass YT/FB/IG platform checks
- Our 3-strike prune (Phase 13) removes proxies that die over time
- **Goal: Quality over quantity — 500 platinum proxies > 5,000 bronze proxies**

---
## 🔎 HOW REAL PRO HUNTERS DO IT — DARK INTELLIGENCE REPORT

> Researched methods used by professional proxy sellers and dark-web traders.
> These are what separates a 300-proxy hobby pool from a 50,000-proxy empire.

### Method 1: The "Mega-Dump Aggregator Relay" (what we now do)
```
Pros run hundreds of GitHub scrapers, each pointing to different source repos.
They don't verify manually — they use distributed async queues (worker_threads or
RabbitMQ) to verify 50,000+ candidates in parallel. Our new 26-source setup does this.
Key insight: rotate sources every 3h, because most GitHub lists update that often.
```

### Method 2: Telegram Automation (no API, web scrape only)
```
Pros scrape the PUBLIC web preview URL of Telegram channels:
  https://t.me/s/CHANNEL_NAME
This requires ZERO API key, ZERO bot token, ZERO login.
It returns full HTML of last 20 messages in each channel.
Run PROXY_REGEX on the HTML — instant harvest.
Top channels post 200–2000 new proxies DAILY.
Cost: $0. Requires: 2 lines of fetch + regex.
```

### Method 3: The Censys / Shodan OSINT Pull (The "Quiet Scanner")
```
Instead of actively scanning IPs (which gets you banned), use Shodan/Censys
which have ALREADY scanned the entire internet and indexed the results.

Top Shodan dorks for finding proxies:
  port:"3128" product:"Squid http proxy"    → finds open corporate Squid servers
  port:"1080" "SOCKS5"                       → open SOCKS5 servers
  "X-Forwarded-For" port:8080               → transparent HTTP proxies
  port:"8888" "Via:" http                   → anonymous corporate proxies
  port:"3128" org:"Amazon"                  → misconfigured AWS servers

These results are:
  1. Fresh (Shodan indexes continuously)
  2. Unique (not on any GitHub list)
  3. High quality (usually faster than random scraped proxies)

Censys is same idea but different index. Both offer free API tiers.
Censys free: 25 queries/month. Shodan free: ~5 queries. Paid ~$49/year each.
```

### Method 4: Raw IP Range Walking (Beast Mode source)
```
Dark method: some pro hunters run Masscan on entire IP ranges of:
  • Cloud providers (AWS, Azure, GCP — tons of misconfigured VMs)
  • Eastern European ISPs (Russia, Ukraine, Romania — lax proxy configs)
  • Chinese ISPs (massive residential proxies, often open)
  • South American ranges (Brazil, Argentina — high volume, under-monitored)

They DON'T validate on the scanner. The scanner just does TCP SYN:
  "Is port 1080 open? Yes → push IP:PORT to queue. No → skip."
Validation happens on their main server. This creates the separation.

For us: Local machine (GPU) runs Masscan locally at Phase 19.
NOT Hetzner. Hetzner will terminate instantly for scanning.
```

### Method 5: The .onion "Ghost Layer" (dark web, Phase 18)
```
There are .onion forums and pastebin services that only exist on Tor.
Security researchers and hackers dump proxy lists there because:
  • No DMCA, no takedowns
  • Lists stay up for months/years
  • No GitHub rate limits
  • Many are SOCKS5 from real privacy communities — higher quality

Our Hetzner VPS runs apt-get install tor, opens :9050.
Our server sends requests through socks-proxy-agent to that port.
We fetch .onion URLs without revealing our IP. Proxies flow back out.
These lists NEVER appear on any search engine or public GitHub.
```

### Method 6: Combining Everything — The Funnel Architecture
```
TOP OF FUNNEL (candidates IN): 50,000–500,000 IPs per day
  → 26 GitHub/API sources (running NOW)
  → 4 Telegram web scrapes (Phase 15)
  → Shodan OSINT queries (Phase 14)
  → .onion dark web (Phase 18)
  → Local Masscan (Phase 19)

MIDDLE (fast pre-filter): cuts 80% immediately
  → Structure check (valid IP format, port 1–65535)
  → ASN score (AWS/Google/known datacenter IPs = lower priority)
  → Port sanity check (common proxy ports only)
  → ONNX classifier at Phase 25 (40% more junk removed in 1ms)

BOTTOM (platform verify): tests the 20% survivors
  → TCP connect test (is it alive?)
  → YT / FB / IG generate_204 test
  → Latency measurement
  → Only survivors enter the live pool

RESULT: Quality platinum proxies with latency badges, country flags, platform tags.
```

---

## ⚡ NODE.JS WORKER_THREADS ARCHITECTURE — 100K CONCURRENT PLAN

> When pool grows to 5000+ proxies and we validate 100k candidates per run,
> the simple chunk-20 loop won't cut it. Here's the upgrade plan.

### Current (Phase 1-16): Simple Async Chunk Loop
```typescript
// Current: chunks of 20, sequential
for (const chunk of chunks(proxies, 20)) {
  await Promise.all(chunk.map(verify));
}
// Problem: 100k proxies @ chunk-20 = 5000 iterations = slow serial bottleneck
```

### Phase 16 Upgrade: p-limit Async Queue (no worker_threads needed yet)
```typescript
import pLimit from 'p-limit';                    // npm install p-limit
const limit = pLimit(200);                        // 200 concurrent verifications
const results = await Promise.all(
  proxies.map(p => limit(() => verifyProxy(p)))
);
// Result: 100k proxies @ 200 concurrent = ~8-12 minutes on Render
// On local machine @ 2000 concurrent = ~45-60 seconds
```

### Phase 23+ Upgrade: Worker Threads (for Beast Mode local)
```typescript
// Main thread: splits candidate list into N chunks
// Worker thread pool: each worker owns a chunk, verifies in isolation
// Workers report results back via MessageChannel
// No shared memory issues, no GC pressure on main thread

// Architecture:
//   Main thread (coordinator)
//     ├─ Worker 1 (25k candidates, 500 concurrent)
//     ├─ Worker 2 (25k candidates, 500 concurrent)
//     ├─ Worker 3 (25k candidates, 500 concurrent)
//     └─ Worker 4 (25k candidates, 500 concurrent)
// Total: 100k candidates, 2000 concurrent, ~30-45 seconds on local GPU machine
// Admin panel stays responsive because main thread is NOT blocked
```

### Why this matters for the admin panel:
```
Current risk: if we run 2000 concurrent verifications in main thread,
the Node.js event loop blocks — admin panel stops responding, API times out.

Worker threads fix: verification work happens in separate threads.
Main thread only handles HTTP requests. Admin panel stays snappy at all times.

Timeline: implement p-limit at Phase 16, worker_threads at Phase 23 (Beast Mode).
```

---
## 🖥️ LOCAL MACHINE FULL POTENTIAL — BEAST MODE SPEC

> When you run on YOUR machine (not Render), all limiters are OFF.

### What changes on local vs. server:
```
                    RENDER SERVER        YOUR LOCAL MACHINE
─────────────────────────────────────────────────────────────
CPU cores           1 shared core        8-16 dedicated cores
Concurrent conns    20 (safe limit)      2,000 (Beast Mode)
RAM available       512MB                16-32GB
Port scanning       ❌ BANNED             ✅ Full masscan speed
Tor daemon          ❌ Cannot install     ✅ Run locally
GPU (ONNX)          ❌ Not available      ✅ Your RTX/CUDA
Cost per run        $0.001+              $0.00 (FREE)
Candidates/hour     ~600                 ~50,000+
```

### Expected local Beast Mode harvest (one 30-min run):
```
SOURCES ACTIVE:    25 GitHub + 5 Telegram + port scan = ~500k candidates
CONCURRENT CHECK:  2,000 parallel verification threads
TIME:              ~20-40 minutes per full sweep

EXPECTED YIELD:
  → Candidates fetched:       250,000 – 500,000
  → Alive (pass TCP check):   25,000  – 75,000  (~15%)
  → Platform verified:        5,000   – 20,000  (YT/FB/IG pass)
  → Platinum tier (<500ms):   500     – 2,000
  → Deduped vs existing pool: adds ~1,000–5,000 NEW proxies per run

AFTER ONE LOCAL BEAST MODE RUN:
  Pool goes from ~300 (server normal) → 3,000–8,000 live verified proxies instantly.
```

### How to trigger local Beast Mode (once Phase 23 is built):
```
1. Open ProxyForge tray app
2. Right-click tray icon → "Beast Mode"
3. Confirm → machine goes full throttle for 20-40 min
4. Notif: "Beast Mode Complete: +4,321 new proxies mined"
5. Pool auto-syncs to Render backend
6. Back to Patrol Mode (background, 5% CPU)
```

### Growing the pool safely:
```
WEEKDAYS:  Server patrol every 3h = slow steady grow
WEEKENDS:  Trigger one local Beast Mode run = massive single harvest
MONTHLY:   1 Beast Mode + 700 patrol hours = 5,000–20,000 live proxies in pool
```

---

## 🚀 LOCAL BEAST + CLOUD BOOST — THE COMPLETE TWO-TIER STRATEGY

> **For the non-coder:** This section explains what's happening when you click HUNT, VERIFY, and BOOST in the Proxy Mission Control panel. Read this once and you'll always understand what each button does and why.

---

### The Problem We're Solving

We need thousands of verified residential proxies to download videos from YouTube, Instagram, etc. without getting blocked. Verifying proxies quickly requires:
- A **residential IP** (not a server IP — servers are blocked by YouTube/Instagram)
- A **fast CPU** (your PC has 8-16 cores; the cloud server has 1 shared core)
- **No rate limits** from datacenter filters

The cloud server can't do heavy verification on its own. That's why we have two tiers.

---

### Tier 1 — Cloud (Automatic, Always Running)

```
CLOUD SERVER (Render.com) — runs 24/7 without you doing anything

Every 2 hours:
  1. OSINT Hunt → scrapes 25+ sources → finds ~10,000 raw proxy candidates
  2. Stores them in → "Cloud Raw Queue" (Redis, unverified)
  3. Cloud Verify → slowly verifies ~600/hour using server's 1 core
  4. Verified → Cloud Pool (usable by downloader)
  5. Failed → Cloud Bin (auto-deleted after 24 hours)

Speed: slow but constant. Works even when your PC is OFF.
```

---

### Tier 2 — Local Beast (Manual, When Your PC Is On)

```
YOUR LOCAL MACHINE — triggered manually from the admin panel

When you click HUNT on the admin panel:
  1. beast_harvest.mjs runs on YOUR machine, using YOUR residential IP
  2. Hunts 25+ OSINT sources simultaneously
  3. Rust verifier processes 2,000 proxies in parallel at full PC speed
  4. Verified → uploaded to Cloud Pool immediately
  5. Raw candidates → Cloud Raw Queue (for cloud to process when you go offline)

Speed: ~50,000 candidates/hour (80× faster than cloud alone)
```

---

### The BOOST Button — What It Actually Does

> **Plain language:** BOOST picks up all the unverified proxies the cloud found but couldn't verify yet (too slow), brings them to your powerful PC, verifies them instantly using Rust at full speed, then sends the verified ones to the cloud pool and throws away all the bad ones.

```
BEFORE BOOST:
  Cloud Raw Queue: 50,000 unverified proxies (cloud is slowly working through them)
  Cloud Pool: 300 verified proxies

CLICK BOOST (takes 10-20 minutes):
  Step 1: Your PC pulls ALL 50,000 raw proxies from cloud to local RAM
          ← At this point, the data is safe in your PC's memory.
            Even if internet drops, the data is NOT lost.

  Step 2: Rust verifier checks all 50,000 at 2,000/batch (no internet needed)
          This is 100% local — cloud can be down, doesn't matter

  Step 3: Verified ones (maybe 5,000–15,000) get uploaded to Cloud Pool
          Each batch of 500 uploads with automatic retry if connection drops

  Step 4: Failed ones get sent to Cloud Bin (auto-deleted in 24 hours)

AFTER BOOST:
  Cloud Raw Queue: EMPTY (clean slate for next cloud hunt)
  Cloud Pool: 5,000–15,000 verified proxies (was 300 before)
```

---

### Why the BOOST Is Network-Resilient

This was specially engineered to survive DNS restarts and short internet drops:

```
WHAT USED TO HAPPEN (fragile version):
  Pull 1,000 proxies → verify → try to upload → connection drops → LOSE ALL DATA
  
HOW IT WORKS NOW (resilient version):
  
  1. LOCAL MEMORY IS SAFE:
     All 50,000 raw proxies are pulled into your PC's RAM first.
     Once they're in RAM, the cloud can go offline — the data is safe.
     
  2. PROGRESSIVE UPLOADS WITH RETRY:
     Every 500 verified proxies → attempt upload to cloud
     If upload fails: wait 3 sec → retry → wait 6 sec → retry → up to 5 attempts
     That's 15+ seconds of retrying before giving up on a batch
     
  3. FINAL FLUSH WITH 8 RETRIES:
     The last batch at the end gets 8 retry attempts (most important data)
     If that fails, it saves to a local backup file
     
  4. LOCAL BACKUP:
     After boost completes, all verified proxies saved to data/proxies_backup.json
     Even worst case (cloud permanently down), your work is preserved locally
     
  5. DNS RESTART SCENARIO:
     Your router restarts (30-60 second outage)
     → All raw proxies are already in RAM (safe)
     → Rust verification continues (100% local, no internet needed)
     → Upload retries wait and keep trying until DNS comes back
     → Zero data lost, zero restarts needed
```

---

### The 4 Control Buttons Explained

| Button | What It Does | When To Use |
|--------|-------------|-------------|
| **HUNT** | Your PC hunts OSINT sources with your residential IP → sends raw candidates to cloud queue | When you want to add fresh new proxies to the pipeline |
| **VERIFY** | Takes proxies from cloud raw queue → verifies locally → sends to cloud pool | Light mode: chip away at a smaller backlog |
| **BOOST** | Pulls the ENTIRE cloud raw queue at once → verifies at max Rust speed → pool/bin | When you see "X,XXX unverified" and want to clear the backlog fast |
| **STOP** | Gracefully stops any running beast operation | Stop hunting/verifying without corrupting data |

---

### The Complete Flow Visualized

```
YOUR PC (when BOOST is running)
───────────────────────────────────────────────────────────────────
Cloud Raw Queue ──pull all──→  Local RAM (safe, no internet needed)
                                     ↓
                               Rust Verifier (2000/batch, pure CPU)
                               ↙               ↘
                     VERIFIED (~15%)         FAILED (~85%)
                          ↓                      ↓
              Upload to Cloud Pool      Send to Cloud Bin
              (retry 5x on drop)        (retry 3x on drop)
              (500 per batch)           (auto-delete 24h)
                          ↓
                  Local Backup saved
                  (data/proxies_backup.json)
───────────────────────────────────────────────────────────────────
RESULT: Cloud Raw Queue = EMPTY | Cloud Pool = much bigger
```

---

### Typical Boost Session Numbers

```
You arrive home, see this in the admin panel:
  Cloud Raw Queue:  45,000 unverified (cloud collected while you were away)
  Cloud Pool:       280 usable proxies
  
You click BOOST.

10 minutes later:
  Step 1 (pull):    45,000 pulled to local RAM in ~2 minutes
  Step 2 (verify):  45,000 Rust-checked at 2,000/batch = ~5 minutes
  Step 3 (upload):  ~7,500 verified uploaded to cloud pool
  Step 4 (bin):     ~37,500 failed sent to bin (auto-removed in 24h)
  
After BOOST:
  Cloud Raw Queue:  0 (empty — ready for next cloud hunt)
  Cloud Pool:       280 + 7,500 = 7,780 usable proxies 🎉
```

---

WEEKENDS:  Trigger one local Beast Mode run = massive single harvest
MONTHLY:   1 Beast Mode + 700 patrol hours = 5,000–20,000 live proxies in pool

---

## ✅ CURRENT STATUS — LIVE IN PRODUCTION (as of latest session)

### What's Built & Working

| Component | Status | Details |
|---|---|---|
| **12-Source OSINT Engine** | ✅ LIVE | `server/proxyScraperService.ts` - scrapes 12 GitHub raw endpoints |
| **Platform Verifier** | ✅ LIVE | Checks YT, FB, IG per proxy in parallel (3 targets per node) |
| **File Persistence** | ✅ LIVE | `data/proxies.json` - survives server restarts and hot-reloads |
| **Auto Deduplication** | ✅ LIVE | Skips already-known proxies before verifying (zero wasted CPU) |
| **Scheduler (3-hour cron)** | ✅ LIVE | `node-cron` fires hunt every 3 hours automatically |
| **Daily Re-Validation** | ✅ LIVE | 3AM cron: re-checks ALL stored proxies, purges dead ones |
| **Lifetime Stats** | ✅ LIVE | Tracks `huntCount`, `totalEverFound`, `lastHuntAt`, `nextHuntAt` |
| **Admin UI (Cyber Sentinel)** | ✅ LIVE | `client/src/pages/admin.tsx` - beautiful dark-theme dashboard |
| **Countdown Timer** | ✅ LIVE | Live ticking "Next hunt in Xh Xm Xs" in the admin UI |
| **Platform Filter** | ✅ LIVE | Filter by All / YT / FB / IG with live count badges |
| **5-Stat Cards** | ✅ LIVE | Active Nodes, YouTube, Facebook, Instagram, All-3-Platforms |
| **Telemetry Panel** | ✅ LIVE | Shows Mined, Deduped (skipped), Scanned, This Hunt in real-time |

### Current Configuration
```
SAMPLE_SIZE = 2500        // candidates pulled per hunt (was 500)
CHUNK_SIZE  = 20          // concurrent verifications (was 50 - CPU safe)
VERIFY_TIMEOUT = 10,000ms // per-proxy timeout
MAX_PLATFORMS  = 3        // YT + FB + IG verified per proxy
HUNT_INTERVAL  = 3 hours  // cron: "0 */3 * * *"
REVALIDATE_AT  = 3AM daily // cron: "0 3 * * *"
SOURCES        = 12       // OSINT GitHub endpoints
STORAGE        = data/proxies.json (file, survives restart)
```

### The 12 OSINT Sources (Currently Active)
```
1. TheSpeedX/PROXY-List         socks5.txt
2. TheSpeedX/PROXY-List         http.txt
3. monosans/proxy-list          socks5.txt
4. monosans/proxy-list          http.txt
5. hookzof/socks5_list          proxy.txt
6. prxchk/proxy-list            all.txt
7. officialputuid/KangProxy      socks5.txt
8. roosterkid/openproxylist      SOCKS5_checked.txt
9. ALIILAPRO/Proxy               socks5.txt
10. clarketm/proxy-list          proxy-list-raw.txt
11. ProxyScrape API              (socks5, elite+anonymous)
12. ShiftyTR/Proxy-List          socks5.txt
```

### CPU / Resource Profile (Safe for Render Free Tier)
```
During hunt (active):
  20 concurrent proxies × 3 platform checks = 60 simultaneous HTTP connections
  Each chunk:   ~10–12 seconds
  Total chunks: 2500 / 20 = 125 chunks  
  Total hunt:   ~21–25 minutes of background network I/O
  CPU spike:    ~10–20% on Render (network-bound, not CPU-bound)
  RAM usage:    ~30–50MB additional during hunt (string arrays)

Between hunts (idle):
  CPU:  ~0% (cron is sleeping)
  RAM:  ~5–10MB for the loaded proxies.json cache

Safe limits:
  Render free tier: 512MB RAM, 0.1 vCPU → comfortably within limits
  Max concurrent connections: stay under 100 to avoid OS socket exhaustion
  CHUNK_SIZE=20 is the sweet spot: fast enough, won't rate-limit or crash
```

### Admin UI Features (Cyber Sentinel Dashboard)
- **Dark glassmorphism aesthetic** — gray-900/800 gradient cards, neon emerald/red accents
- **5-column stat grid**: Active Nodes | YouTube | Facebook | Instagram | All 3 Platforms
- **Scheduler Status Panel**: shows Hunting / Re-validating / Standby state, cycle info, live revalidation countdown
- **Lifetime Stats Panel**: hunts this session, total ever verified, source count, last hunt time
- **Controls Bar**: Force OSINT Hunt button + Refresh + platform filter (All/YT/FB/IG with live counts)
- **Live Telemetry** (during hunt): progress bar, Mined / Deduped / Scanned / This Hunt metrics
- **Idle Status Banner**: hunt #, found count, skipped dupes, mined total, active nodes, next hunt countdown
- **Proxy Table**: sortable by protocol (SOCKS5/HTTP badge), platform indicators (Wifi icons), expand-to-details
- **Footer**: shows storage type ("File Cache · survives restart")
- **Copy to clipboard** per proxy with check-mark feedback

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────┐
│                      PROXY KITCHEN ENGINE v2.0                       │
│                    (Tier 1 + Tier 2 Complete)                        │
│                                                                      │
│  CRON TRIGGERS              SOURCES (30)                             │
│  ├─ Every 3h ────────────► 26 OSINT (GitHub raw lists + APIs)       │
│  │  runHunt()               TheSpeedX / monosans / hookzof / prxchk │
│  │                          KangProxy / openproxylist / ALIILAPRO   │
│  │                          clarketm / ProxyScrape / ShiftyTR + 16  │
│  │                                                                   │
│  │                         4 TELEGRAM (t.me/s/ public scrape)        │
│  │                          proxy_httptelegram / ProxySocks5Proxy    │
│  │                          DropShipSocks / free_proxy_lis           │
│  │                                                                   │
│  ├─ Every 30min ─────────► TIERED REVALIDATION                      │
│  │  runRevalidation()       Platinum (<500ms, 3 platforms) → 30 min │
│  │                          Gold (2+ platforms)            → 2 hrs   │
│  │                          Silver (1 platform, <2s)       → 6 hrs   │
│  │                          Bronze (slow/single)           → 24 hrs  │
│  │                                                                   │
│  └─ 3AM daily ───────────► FULL SWEEP (all proxies rechecked)       │
│                                                                      │
│                    IP:PORT REGEX EXTRACTION                           │
│                 \b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b        │
│                                ↓                                     │
│                    DEDUP + ENRICHMENT PIPELINE                       │
│               ┌─────────────────────────────────────┐               │
│               │  GeoIP (geoip-lite, offline)        │               │
│               │  → Country code + flag emoji         │               │
│               │                                      │               │
│               │  Latency Timer (Date.now delta)      │               │
│               │  → Green <500ms / Yellow <2s / Red   │               │
│               │                                      │               │
│               │  Tier Computation                    │               │
│               │  → Platinum/Gold/Silver/Bronze        │               │
│               └─────────────────────────────────────┘               │
│                                ↓                                     │
│                PARALLEL PLATFORM VERIFICATION                        │
│                  CHUNK_SIZE=20 concurrent                             │
│          ┌───────────────┬──────────────┬──────────────┐            │
│          │  YouTube      │  Facebook    │  Instagram   │            │
│          │ generate_204  │ connect.fb   │ favicon.ico  │            │
│          └───────────────┴──────────────┴──────────────┘            │
│                                ↓                                     │
│                    3-STRIKE AUTO-PRUNE                               │
│               Strike 1: ⚠️ Warning (failCount=1)                    │
│               Strike 2: ⚠️ Warning (failCount=2)                    │
│               Strike 3: ☠️ PERMANENT PURGE                          │
│                                ↓                                     │
│                    FILE PERSISTENCE LAYER                            │
│              data/proxies.json (survives restart)                    │
│                                ↓                                     │
│           DOWNLOAD WATERFALL (3-layer fallback)                      │
│           ┌──────────────────────────────────────┐                  │
│           │ 1. FREE: Pool proxy (lowest latency) │                  │
│           │ 2. FREE: Direct (no proxy)           │                  │
│           │ 3. PAID: ASocks (last resort only)   │                  │
│           └──────────────────────────────────────┘                  │
│                                ↓                                     │
│              /api/admin/proxy-status   ←── Cyber Sentinel UI         │
│        (activeNodes, platformCounts, tierCounts, avgLatency,         │
│         huntDetails, proxies[] with country/latency/tier/health)     │
└──────────────────────────────────────────────────────────────────────┘
```

---


> **⚠️ AGENT TRANSFER PROTOCOL (READ FIRST):**
> **Dear Next AI Agent:** You are assuming control of a highly advanced "Red Team" web scraper integration for `BongBariComedy`. 
> **Context:** The backend runs on Express/Node.js (Render.com). To bypass severe Meta (Instagram) and Google (YouTube) firewall blockades against datacenter IPs, we are deploying a self-healing SOCKS5 proxy swarm. You must adopt the "Red Police Vibe Coder" persona: act decisively, write complete working code, use zero placeholders, and do not hallucinate standard tutorials.
> **Current State:** The frontend Developer Proxy Tracker UI (`admin.tsx`) and the backend health API (`/api/admin/proxy-status`) are fully built and live. 
> **Your Directive:** You are to execute the 5-Phase architecture below. Execute sequentially. Start by implementing Phase 5 (the base interface): integrate `proxy-chain` and `Upstash Redis` into the Express Backend to manage the data before running the scraper engines.

**Mission:** Build an invincible, auto-healing, massive-scale proxy swarm. Zero human intervention. Infinite scalability. This system wraps battle-tested OSINT tools to fuel the downloader engines, specializing in SOCKS5 injection and Dark Web abstraction to obliterate IP bans, rate limits, and blockades.

## 🚨 WHY WE ARE BUILDING THIS (The Core Problem)
- **The Blockade:** Meta (Instagram/Facebook) and Google (YouTube) instantly detect and globally ban datacenter IPs (Render, AWS, Hetzner). Raw `yt-dlp` or vanilla `fetch()` scraping immediately fails with `403 Forbidden`, `422`, or Login/Captcha walls.
- **The Cost Trap:** Commercial rotating residential proxies charge exorbitant bandwidth fees, which scales instantly out of budget for high-volume HD video downloading. 
- **The Red Team Solution:** By wrapping existing OSINT proxy scrubbers (`proxy-scraper-checker`), caching specifically verified HTTP/SOCKS5 nodes into Ultra-Fast RAM (Upstash Redis), and dynamically rotating requests through `proxy-chain`, we construct an automated, zero-cost proxy network capable of slipping past Meta/Google undetected.

---

## 🌩️ PHASE 1: The Pre-Built OSINT Engine Pivot
Instead of writing a custom aggregation/validation matrix entirely from scratch, we leverage the open-source Red Team standard and wrap it inside our Node.js automation framework.

### 1. The Core Engine: `proxy-scraper-checker` (by monosans)
- **What it is:** The most aggressive, actively maintained open-source proxy hunter (Python).
- **Integration:** Triggered autonomously via Node.js `child_process` in a background cron job on your Hetzner VPS.
- **The Advantage:** Natively pulls from 70+ hidden sources, regex-parses them, and allows a custom target URL (e.g., `https://youtube.com/favicon.ico`) to actually verify unblocked status before saving it.

### 2. The Universal Extraction Rule (The Regex Master)
When writing custom Node.js ingestion extensions for extra sources, we do NOT try to carefully parse JSON or HTML. We download raw text blobs and extract IPs purely using this regex:
```regex
\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b
```
*Why?* It automatically finds every `IP:PORT` combination, ignoring HTML formatting, broken JSON, or chat text entirely.

---

## 🎯 PHASE 2: The Master SOCKS5 Source Matrix (Red Team Edition)
SOCKS5 handles video streaming packets flawlessly and bypasses basic HTTP packet-inspection firewalls. Add these specific endpoints to your aggregation lists:

### 1. The GitHub Master Aggregators (Highest Volume)
Automated repo scrapers that drop hourly:
- **TheSpeedX (Gold Standard):** `https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt`
- **monosans:** `https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt`
- **hookzof (SOCKS5 Only):** `https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt`
- **prxchk (Mega-Aggregator):** `https://raw.githubusercontent.com/prxchk/proxy-list/main/all.txt`
- **ShiftyTR:** `https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt`

### 2. Direct Raw Web Endpoints & OSINT Drops (High Stability)
- **Spys.me (Legendary):** `https://spys.me/proxy.txt`
- **Free-Proxy-List:** `https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt`
- **Fate0 (JSON detailed):** `https://raw.githubusercontent.com/fate0/proxylist/master/proxy.list`
- **ProxyScrape API:** `https://api.proxyscrape.com/v2/?request=displayproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=elite`
- **OpenProxy.Space:** `https://openproxy.space/list/socks5`

### 3. Advanced Public OSINT Queries (Shodan/Censys equivalents)
Using legitimate search queries to find open HTTP/SOCKS proxies using tools like Foofa or Shodan dorks (e.g., searching for specific open proxy server headers) with or without exploiting private networks.

---

## 🚀 PHASE 3: Telegram Auto-Scraping (The Edge Advantage)
Many premium proxy providers publish free promotional IP drops on Telegram. 
- Node.js fetches the public HTML of Telegram web channels and runs the Master Regex natively.
- **Targets:** `@proxy_list`, `@proxymain`, `@Socks5_Proxy_List`.

---

## 🕷️ PHASE 4: Dark Web (.onion) Ingestion Strategy
Cybersecurity intelligence communities often dump highly anonymous SOCKS5 lists on Tor pastebins to avoid ISP sweeps. We orchestrate a secure localhost bridge to harvest these open directories.

1. **The Tor-to-Localhost Bridge:** Install the Tor Daemon directly on the VPS (`apt-get install tor`).
2. **The Local Proxy:** The daemon opens a silent local Tor SOCKS5 proxy port at `127.0.0.1:9050`.
3. **The Extraction Worker:** Our Node.js scraper uses the `socks-proxy-agent` npm library pointed to `127.0.0.1:9050`.
4. **The Target:** We safely HTTP-fetch `.onion` pastebin directories natively from Node.js. Using the Master Regex, we rip out pristine proxy drops that standard web scrapers never see.

---

## ⚡ PHASE 5: Action, Speed, & Routing 
Once the data drops the verified, live array to our server folder:

1. **Memory Storage:** Load the verified list into **Upstash Redis** RAM immediately. We do not use PostgreSQL for proxy tracking to avoid SSD bottlenecking.
2. **The Router (`proxy-chain`):** We use the modern Node.js `proxy-chain` npm library to dynamically construct rotating proxies.
3. **Ghost Execution:** Every `yt-dlp`, Instagram extraction, or Meta payload is dynamically routed through `proxy-chain`, mapped to the fastest Live SOCKS5 node from the Redis pool. If a proxy ever fails the download, a catch block instantly purges it from Redis forever.

---

## 🔥 PHASE 6: NEXT-LEVEL UPGRADES (Red Team Phase 3 Roadmap)

### 6.1 Telegram Channel Live Mining ⚡ (Priority: HIGH)
Telegram public channels drop fresh proxy lists hourly. Many premium providers dump free promotional IPs here.

**Implementation:**
```typescript
// Add to proxyScraperService.ts as additional sources
const TELEGRAM_SOURCES = [
  'https://t.me/s/proxy_list',         // @proxy_list channel
  'https://t.me/s/proxymain',           // @proxymain channel
  'https://t.me/s/proxyshopnet',        // @proxyshopnet
  'https://t.me/s/Socks5_Proxy_List',   // @Socks5_Proxy_List
  'https://t.me/s/darknet_socks5',      // @darknet_socks5
];
// Fetch HTML, run Master Regex (\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b)
// No API key needed - Telegram Web is publicly readable
```
**Expected gain:** +500 to 2000 fresh proxies per hourly sweep  
**CPU cost:** < 1% (just 5 HTTP fetches + regex, no verification overhead)

---

### 6.2 Latency Scoring & Quality Tiers 🏆 (Priority: HIGH)
Right now all proxies are equal. In reality a 200ms proxy is 10× more valuable than a 3000ms proxy.

**Implementation plan:**
```typescript
interface ProxyRecord {
  url: string;
  platforms: { yt: boolean; fb: boolean; ig: boolean };
  latencyMs: number;      // NEW: measured during verification
  score: 'premium' | 'standard' | 'slow'; // NEW: auto-classified
  failCount: number;      // NEW: track consecutive failures
  lastChecked: number;    // NEW: ISO timestamp
}

// During verification, measure response time:
const start = Date.now();
await axios.get(VERIFY_URL, { httpsAgent, timeout: VERIFY_TIMEOUT });
proxy.latencyMs = Date.now() - start;
proxy.score = latency < 500 ? 'premium' : latency < 2000 ? 'standard' : 'slow';
```

**UI Enhancement:** Add a latency badge (green/yellow/red) to each proxy row in the admin table.  
**Rotation policy:** Always pick `premium` score proxies first for actual video downloads.

---

### 6.3 Geo-Filtering & Country-Aware Selection 🌍 (Priority: MEDIUM)
US/EU proxies bypass geo-restrictions better than Asian/African nodes for YouTube/Instagram.

**Implementation plan:**
```typescript
import geoip from 'geoip-lite';

// After verification, enrich with country:
const geo = geoip.lookup(proxyIP);
proxy.country = geo?.country || 'XX';
proxy.city = geo?.city || 'Unknown';

// Priority countries: US, DE, NL, GB, CA, FR, SE (strong proxies for US-gated content)
const PREFERRED_COUNTRIES = ['US', 'DE', 'NL', 'GB', 'CA', 'FR', 'SE'];

// Rotation: prefer PREFERRED_COUNTRIES when selecting proxy for download
```

**Package:** `npm install geoip-lite` (2MB offline GeoIP database, no API key needed)  
**Admin UI:** Add country flag emoji to each proxy row (🇺🇸 🇩🇪 🇳🇱)

---

### 6.4 Smart Rotation Pool for Actual Downloads 🔄 (Priority: HIGH)
Connect the proxy pool directly into the downloader engines.

**Architecture:**
```typescript
// server/proxyRotator.ts  (new file)
export function getBestProxy(platform: 'yt' | 'fb' | 'ig'): string | null {
  const pool = ProxyKitchen.getLiveProxies()
    .filter(p => p.platforms[platform])
    .sort((a, b) => (a.latencyMs || 9999) - (b.latencyMs || 9999));
  return pool[0]?.url ?? null;
}

export async function executeWithProxyFallback(
  platform: 'yt' | 'fb' | 'ig',
  fn: (proxyUrl: string) => Promise<any>
): Promise<any> {
  const pool = ProxyKitchen.getLiveProxies().filter(p => p.platforms[platform]);
  for (const proxy of pool.slice(0, 5)) {  // try top 5
    try {
      return await fn(proxy.url);
    } catch {
      ProxyKitchen.banProxy(proxy.url);   // auto-purge on fail
    }
  }
  throw new Error('All proxy attempts exhausted');
}
```

**Downloader integration:**
```typescript
// In server/routes/download.ts - wrap yt-dlp call:
const proxyUrl = getBestProxy('yt');
const args = proxyUrl ? ['--proxy', proxyUrl, ...ytdlpArgs] : ytdlpArgs;
```

---

### 6.5 Reliability Scoring & Auto-Pruning 🧹 (Priority: MEDIUM)
Track how often each proxy fails over time and auto-remove unreliable ones.

**Implementation:**
```typescript
// On each download failure, increment fail count:
proxy.failCount = (proxy.failCount || 0) + 1;
if (proxy.failCount >= 3) {
  ProxyKitchen.banProxy(proxy.url);  // purge after 3 strikes
}

// Daily revalidation also resets failCount for proxies that pass
// Proxies that fail revalidation are immediately purged
```

**Expected effect:** Pool self-heals. Dead proxies are auto-pruned within 10 minutes of failing.

---

### 6.6 Redis Upgrade (Optional, When Scale Demands It) ⚡
Current `data/proxies.json` works great up to ~10,000 proxies. Beyond that, use Upstash Redis:

```typescript
// When the pool grows beyond 5000 verified proxies:
// - Use Upstash HSET (O(1) lookup by proxy URL)  
// - ZSET (sorted set) for latency-ordered priority queue
// - TTL = 24h per proxy (auto-expire stale entries)
// Package: npm install @upstash/redis
```

**Trigger:** Switch when `proxies.json` consistently has > 2000 entries.

---

### 6.7 Dark Web (.onion) Ingestion ☠️ (Priority: LOW - Requires Hetzner VPS)
> ⚠️ This requires a dedicated VPS (not Render). Render free tier cannot install Tor daemon.

When migrated to Hetzner:
```bash
apt-get install tor       # Install Tor daemon
# Tor opens SOCKS5 proxy at 127.0.0.1:9050
```

```typescript
import { SocksProxyAgent } from 'socks-proxy-agent';
const torAgent = new SocksProxyAgent('socks5://127.0.0.1:9050');

// Scrape .onion proxy directories:
const ONION_SOURCES = [
  'http://ransomwaregroup.onion/proxy-dumps/',   // hypothetical
  'http://proxylist.onion/socks5/',
];

// These are proxy drops that standard web scrapers NEVER see
```

**Expected gain:** Highly anonymous, rarely blocked proxies from cybersec communities.

---

### 6.8 AI Liveness Prediction 🤖 (Priority: FUTURE)
Train a tiny binary classifier on proxy features to predict success rate before wasting CPU verifying junk proxies.

**Feature vector:**
```
[country_tier, port_range_type, protocol_socks5, source_quality_score, 
 ip_range_is_datacenter, ip_range_is_residential, time_since_listed]
```

**Model:** Lightweight sklearn `RandomForestClassifier` saved as ONNX  
**Expected effect:** Pre-filter bottom 40% of candidates → 40% fewer verifications → hunt finishes in 12 min instead of 21  
**Implementation:** Python training script + Node.js ONNX inference with `onnxruntime-node`

---

## 📊 PHASE 7: METRICS & OBSERVABILITY UPGRADE

Add a "health score" per proxy based on:
- **Latency** (lower = better)
- **Platforms supported** (1/2/3)
- **Days since last validated**
- **Historical fail rate**

**Admin UI additions planned:**
- [ ] Latency histogram chart (how proxies are distributed by speed)
- [ ] Country distribution pie chart
- [ ] Daily acquisition/loss graph (new vs. pruned per day)
- [ ] Export button (download full proxy list as .txt for use in tools)

---

## 🎯 IMPLEMENTATION PRIORITY ORDER (Vibe Coder Cheatsheet)

```
✅ DONE — These are LIVE right now, zero action needed:
   ✅ 12 OSINT sources (proxyScraperService.ts)
   ✅ 2500 sample size, CHUNK_SIZE=20 (CPU safe)
   ✅ Every 3-hour auto-hunt cron
   ✅ 3AM daily re-validation cron
   ✅ Deduplication (skip already-known proxies)
   ✅ File persistence (data/proxies.json, survives restart)
   ✅ Cyber Sentinel admin UI (5 stat cards, countdown, lifetime stats)
   ✅ Live telemetry (Mined / Deduped / Scanned / This Hunt)
   ✅ Platform filter (All / YT / FB / IG with counts)
   ✅ Admin panel accessible at /admin → Proxy Kitchen tab

⏳ NEXT UP — Say "do phase 7" to start any of these:
   ⏳ Phase 7: Latency badge (measure ms per proxy, green/yellow/red in table)
   ⏳ Phase 8: Country flag (geoip-lite, flag emoji per proxy row)
   ⏳ Phase 9: Telegram scraping (5 channels, +1000 proxies/day free)
   ⏳ Phase 10: Wire pool → downloader (proxies actually bypass YT/IG bans)
   ⏳ Phase 11: 3-strike auto-prune (dead proxies gone in 10 min)

🔒 FUTURE — Big upgrades, confirm before building:
   🔒 Phase 12: AI pre-filter (ONNX, 3× faster hints)
   🔒 Phase 13: Rust desktop app (ProxyForge, Beast Mode, system tray)
   🔒 Phase 14: Offline mode + SQLite sync
   🔒 Phase 15: Proxy API SaaS ($9–$299/month, RapidAPI listing)
```

---

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
