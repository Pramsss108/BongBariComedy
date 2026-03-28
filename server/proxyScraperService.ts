import * as fs from 'fs';
import * as path from 'path';
import { ProxyKitchen } from './proxyService';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import geoip from 'geoip-lite';
import { callRustVerify, callHetznerVerify, callLocalPcVerify } from './rustVerifier';
import { calculateProxyScore, adaptBatchSize, getBatchDelay, sleep as stealthSleep, getRandomProfile, detectBanSignal } from './stealthEngine';

/**
 * ============================================================
 * RED TEAM PROXY HUNTER — Phase 2 EXPANDED (26-SOURCE ENGINE)
 * ============================================================
 * Architecture:
 *   - 26 OSINT sources (GitHub mega-dumps + open aggregator APIs)
 *   - 2500-proxy sample per hunt (~10 minutes at 20 concurrency)
 *   - Chunk=20 workers → CPU safe on Node (~60 open sockets)
 *   - Full dedup: skips already-known proxies
 *   - Daily re-validation pass at 3AM to purge dead nodes
 *   - Lifetime stat tracking (hunts, total ever found)
 *   - Candidate pool per hunt: ~50,000–100,000 raw candidates
 * ============================================================
 */

// ── Master Regex ─────────────────────────────────────────────
const PROXY_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b/g;

// ── OSINT Source Matrix (26 sources) — each has backup URLs for auto-heal ───
// When primary returns HTTP 404 / times out / returns <10 IPs,
// scrapeSource() automatically tries backup[0], backup[1], ... in order.
interface OsintSource { url: string; proto: string; backup?: string[] }
const MASTER_PROXY_SOURCES: OsintSource[] = [
  // ── TIER A: SOCKS5 GitHub lists ──────────────────────────
  {
    url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', proto: 'socks5',
    backup: [
      'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt',
      'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks5.txt',
      'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt',
    ],
  },
  {
    url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', proto: 'socks5',
    backup: [
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies_geolocation/socks5.txt',
      'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt',
      'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks5.txt',
    ],
  },
  { url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/HyperBeats/proxy-list/main/socks5.txt'],
  },
  {
    url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt', proto: 'socks5',
    backup: [
      'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/SOCKS5/socks5.txt',
      'https://raw.githubusercontent.com/prxchk/proxy-list/main/socks5.txt',
    ],
  },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks5.txt'],
  },
  // ── TIER A: HTTP GitHub lists ────────────────────────────
  {
    url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', proto: 'http',
    backup: [
      'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/main/http.txt',
      'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
      'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
    ],
  },
  {
    url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', proto: 'http',
    backup: [
      'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies_geolocation/http.txt',
      'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
      'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt',
    ],
  },
  {
    url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt', proto: 'http',
    backup: [
      'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/HTTPS/https.txt',
      'https://raw.githubusercontent.com/prxchk/proxy-list/main/http.txt',
    ],
  },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/zloi-user/hideip.me/main/http.txt'],
  },
  { url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/HyperBeats/proxy-list/main/http.txt'],
  },
  { url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt'],
  },
  // ── TIER B: MEGA-DUMP aggregators (50k+ candidates/day) ──
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/http.txt'],
  },
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks5.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/socks5.txt'],
  },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/main/http.txt'],
  },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks5.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/main/socks5.txt'],
  },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt'],
  },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/socks5.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt'],
  },
  { url: 'https://raw.githubusercontent.com/caliphdev/Proxy-List/master/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/caliphdev/Proxy-List/master/socks5.txt'],
  },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt', proto: 'socks5',
    backup: ['https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/socks5_proxies.txt'],
  },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt', proto: 'http',
    backup: ['https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/http_proxies.txt'],
  },
  // ── TIER C: Raw web endpoints (no GitHub rate limits) ────
  { url: 'https://multiproxy.org/txt_all/proxy.txt', proto: 'http' },
  { url: 'https://rootjazz.com/proxies/proxies.txt', proto: 'http' },
  { url: 'https://proxyspace.pro/http.txt', proto: 'http' },
  { url: 'https://proxyspace.pro/socks5.txt', proto: 'socks5' },
  // ── TIER D: APIs (structured, no regex needed) ───────────
  { url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all', proto: 'http' },
  { url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all', proto: 'socks5' },
];

// ── Tuning Constants ─────────────────────────────────────────
const SAMPLE_SIZE     = 5000;  // Proxies verified per hunt (26 sources = more candidates)
const CHUNK_SIZE      = 20;    // Concurrent workers (CPU safe on Render: ~60 open sockets)
const VERIFY_TIMEOUT  = 10000; // 10s per proxy check
const STALE_AGE_HOURS = 24;    // Re-validate proxies older than 24h

export interface ProxyPlatforms {
  yt: boolean;
  fb: boolean;
  ig: boolean;
  latencyMs?: number;     // Phase 11: avg response time across all checks
  country?: string;       // Phase 12: 2-letter ISO country code (e.g. "US")
  failCount?: number;     // Phase 13: consecutive fail count (auto-ban at 3)
  lastCheckedAt?: string; // Phase 14: ISO timestamp of last verification
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze'; // Phase 14: computed quality tier
  score?: number;         // Stealth: composite quality score (0-100)
}

// ── Phase 15: Telegram public web scrape sources ─────────────
const TELEGRAM_SOURCES = [
  'https://t.me/s/proxylist_free',
  'https://t.me/s/Proxy_List_Premium',
  'https://t.me/s/socks5_bot',
  'https://t.me/s/freeproxylist_daily',
];

export class ProxyScraper {
  static isHunting          = false;
  static isRevalidating     = false;
  static isVerifyingQueue   = false;  // Phase 21: separate verify pass
  static isForceRevalidating = false;
  static cloudVerifyPaused   = false;  // When true, cloud auto-verify skips — let local beast handle it
  static huntCount          = 0;
  static totalEverFound     = 0;
  static lastHuntAt: Date | null = null;
  static nextHuntAt: Date | null = null;
  static lastRevalidatedAt: Date | null = null;
  static nextRevalAt: Date | null = null;
  static powerMode          = false;
  // ── In-Memory Pending Buffer (fallback when Redis push fails) ──
  // When pushToRawQueue fails (Redis offline/rate-limited), candidates are kept here
  // so runVerifyQueue can still drain them. Cleared after successful verification.
  static pendingBuffer: string[] = [];
  // ── Backend Log Buffer (real server activity, streamed to frontend) ──
  static logBuffer: Array<{ time: string; type: string; msg: string }> = [];
  // ── Local Sync Log Buffer (beast-mode uploads from user's local machine) ──
  static localSyncBuffer: Array<{ time: string; type: string; msg: string }> = [];
  // ── Auto-Heal: tracks which URL was actually used (primary vs backup) ──
  // key = original primary URL, value = { active: URL currently working, failCount, degraded }
  private static sourceHealth: Map<string, { active: string; failCount: number; degraded: boolean }> = new Map();

  static getSourceHealth(): Record<string, { active: string; failCount: number; degraded: boolean }> {
    const out: Record<string, { active: string; failCount: number; degraded: boolean }> = {};
    this.sourceHealth.forEach((v, k) => { out[k] = v; });
    return out;
  }

  private static pushLog(type: string, msg: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logBuffer = [{ time, type, msg }, ...this.logBuffer].slice(0, 200);
  }
  static pushLocalSyncLog(type: string, msg: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.localSyncBuffer = [{ time, type, msg }, ...this.localSyncBuffer].slice(0, 100);
  }

  static huntDetails = {
    status:   'Idle',
    progress: 0,
    total:    0,
    found:    0,
    mined:    0,
    skipped:  0,        // already-known proxies bypassed
    huntCount: 0,
    totalEverFound: 0,
    lastHuntAt: null as string | null,
    nextHuntAt: null as string | null,
    lastMined: 0,       // persisted mine count from last completed hunt
  };

  // ── Initialize counters from existing storage (survives restart) ──
  static async initFromStorage(): Promise<void> {
    try {
      const existing = await ProxyKitchen.getLiveProxies();
      this.totalEverFound = existing.length;
      this.huntDetails.totalEverFound = existing.length;
      this.pushLog('init', `LOADED ${existing.length} EXISTING PROXIES FROM STORAGE`);
      console.log(`[ProxyScraper] 📦 Initialized from storage: ${existing.length} existing proxies`);
    } catch (e: any) {
      console.warn(`[ProxyScraper] Could not initialize from storage: ${e.message}`);
    }
  }

  // ── Batch geo-enrich existing proxies that have country=undefined/XX ──
  static async enrichExistingProxies(): Promise<void> {
    try {
      const proxies = await ProxyKitchen.getLiveProxies();
      let enriched = 0;
      for (const p of proxies) {
        const needsGeo = !p.platforms.country || p.platforms.country === 'XX' || p.platforms.country === 'undefined';
        const needsTier = !p.platforms.tier;
        if (!needsGeo && !needsTier) continue;

        let country = p.platforms.country || 'XX';
        if (needsGeo) {
          try {
            const ip = p.url.replace(/^(socks5?|https?):\/\//, '').split(':')[0];
            const geo = geoip.lookup(ip);
            if (geo?.country) country = geo.country;
          } catch { /* non-critical */ }
        }

        let tier = p.platforms.tier || 'bronze';
        if (needsTier) {
          const platformCount = [p.platforms.yt, p.platforms.fb, p.platforms.ig].filter(Boolean).length;
          const ms = p.platforms.latencyMs || 99999;
          if (ms < 500 && platformCount === 3) tier = 'platinum';
          else if (platformCount >= 2) tier = 'gold';
          else tier = 'bronze';
        }

        if (country !== p.platforms.country || tier !== p.platforms.tier) {
          await ProxyKitchen.addVerifiedProxy(p.url, {
            ...p.platforms,
            country,
            tier: tier as 'platinum' | 'gold' | 'bronze',
            failCount: p.platforms.failCount ?? 0,
            lastCheckedAt: p.platforms.lastCheckedAt || new Date().toISOString(),
          });
          enriched++;
        }
      }
      if (enriched > 0) {
        this.pushLog('success', `GEO-ENRICHED ${enriched} PROXIES WITH COUNTRY + TIER DATA`);
        console.log(`[ProxyScraper] 🌍 Geo-enriched ${enriched} existing proxies`);
      }
    } catch (e: any) {
      console.warn(`[ProxyScraper] Geo-enrichment error: ${e.message}`);
    }
  }

  // ── Daily Source Health Audit ────────────────────────────────────────
  // Probes every OSINT source (primary + backups) to check which are alive.
  // Auto-heals by switching to working backups. Logs dead sources to UI.
  // Called by daily cron — keeps the source matrix fresh without manual intervention.
  static async auditSourceHealth(): Promise<{ alive: number; degraded: number; dead: number }> {
    this.pushLog('init', '🔬 DAILY SOURCE HEALTH AUDIT STARTED — probing all OSINT sources...');
    console.log('[ProxyScraper] 🔬 Starting daily source health audit...');
    let alive = 0, degraded = 0, dead = 0;

    for (const source of MASTER_PROXY_SOURCES) {
      const urlsToTry = [source.url, ...(source.backup || [])];
      let foundWorking = false;

      for (let i = 0; i < urlsToTry.length; i++) {
        try {
          const res = await fetch(urlsToTry[i].trim(), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) continue;
          const text = await res.text();
          const matches = text.match(PROXY_REGEX) || [];
          if (matches.length >= 10) {
            // Update health record
            const health = this.sourceHealth.get(source.url) || { active: source.url, failCount: 0, degraded: false };
            health.active = urlsToTry[i];
            health.degraded = i > 0;
            health.failCount = i;
            this.sourceHealth.set(source.url, health);
            if (i > 0) { degraded++; } else { alive++; }
            foundWorking = true;
            break;
          }
        } catch { /* try next */ }
      }

      if (!foundWorking) {
        dead++;
        const sourceName = source.url.split('/').pop() || source.url;
        this.sourceHealth.set(source.url, { active: source.url, failCount: urlsToTry.length, degraded: true });
        this.pushLog('banned', `☠️ SOURCE DEAD: ${sourceName} — all ${urlsToTry.length} URLs failed (primary + ${(source.backup || []).length} backups)`);
        console.warn(`[ProxyScraper] ☠️ Source dead: ${sourceName} — needs new URL`);
      }
    }

    // Also check Telegram sources — track in sourceHealth map
    for (const tgUrl of TELEGRAM_SOURCES) {
      const name = tgUrl.split('/').pop() || tgUrl;
      try {
        const res = await fetch(tgUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const text = await res.text();
          const matches = text.match(PROXY_REGEX) || [];
          if (matches.length >= 5) {
            alive++;
            this.sourceHealth.set(tgUrl, { active: tgUrl, failCount: 0, degraded: false });
          } else {
            degraded++;
            this.sourceHealth.set(tgUrl, { active: tgUrl, failCount: 1, degraded: true });
          }
        } else {
          degraded++;
          this.sourceHealth.set(tgUrl, { active: tgUrl, failCount: 1, degraded: true });
        }
      } catch {
        dead++;
        this.sourceHealth.set(tgUrl, { active: tgUrl, failCount: 5, degraded: true });
        this.pushLog('banned', `☠️ TELEGRAM DEAD: ${name} — unreachable`);
      }
    }

    const total = MASTER_PROXY_SOURCES.length + TELEGRAM_SOURCES.length;
    this.pushLog('success', `SOURCE AUDIT DONE — ✅ ${alive}/${total} ALIVE | ⚠️ ${degraded} DEGRADED | ☠️ ${dead} DEAD`);
    console.log(`[ProxyScraper] 🔬 Source audit done — alive: ${alive}, degraded: ${degraded}, dead: ${dead}`);
    return { alive, degraded, dead };
  }

  // ── Force Revalidate ALL proxies (ignores tier intervals) ────────────
  // Unlike runRevalidation() which skips proxies not yet due, this checks EVERY proxy.
  // Use for: manual "nuke all and rebuild trust" pass, or after long server downtime.
  static async forceRevalidateAll(): Promise<void> {
    if (this.isForceRevalidating || this.isHunting || this.isRevalidating) {
      this.pushLog('log', 'FORCE REVALIDATION SKIPPED — OPERATION ALREADY IN PROGRESS');
      return;
    }
    this.isForceRevalidating = true;
    this.pushLog('init', `⚡ FORCE REVALIDATE ALL — RE-CHECKING EVERY PROXY IN POOL (${this.powerMode ? 'HETZNER VPS' : 'RUST/NODE ENGINE'})`);
    console.log('[ProxyScraper] ⚡ Force-revalidating ALL proxies (ignoring tier intervals)...');
    try {
      const stored = await ProxyKitchen.getLiveProxies();
      this.pushLog('log', `FORCE REVAL: ${stored.length} PROXIES QUEUED FOR RE-CHECK...`);
      const allUrls = stored.map(p => p.url);
      const batchResults = await this.verifyBatch(allUrls);
      let kept = 0, purged = 0;
      for (let j = 0; j < stored.length; j++) {
        const res = batchResults[j];
        if (!res || (!res.yt && !res.fb && !res.ig)) {
          const currentFails = (stored[j].platforms?.failCount || 0) + 1;
          if (currentFails >= 3) {
            await ProxyKitchen.banProxy(stored[j].url);
            purged++;
          } else {
            await ProxyKitchen.addVerifiedProxy(stored[j].url, {
              ...stored[j].platforms, failCount: currentFails, lastCheckedAt: new Date().toISOString(),
            });
            kept++;
          }
        } else {
          await ProxyKitchen.addVerifiedProxy(stored[j].url, res);
          kept++;
        }
      }
      this.totalEverFound = kept;
      this.huntDetails.totalEverFound = kept;
      this.pushLog('success', `FORCE REVAL DONE — ✅ KEPT: ${kept} | ☠️ PURGED: ${purged}`);
      console.log(`[ProxyScraper] ✅ Force revalidation complete — kept: ${kept} | purged: ${purged}`);
    } catch (e: any) {
      this.pushLog('banned', `FORCE REVAL FAILED: ${e.message}`);
      console.error('[ProxyScraper] Force revalidation error:', e.message);
    } finally {
      this.isForceRevalidating = false;
    }
  }

  // ── Purge Dead Proxies (hard-delete failCount >= 2 right now) ────────
  static async purgeDeadProxies(): Promise<{ purged: number }> {
    this.pushLog('init', 'PURGING DEAD PROXIES (failCount ≥ 2)...');
    try {
      const stored = await ProxyKitchen.getLiveProxies();
      const dead = stored.filter(p => (p.platforms.failCount || 0) >= 2);
      for (const p of dead) {
        // Force-set failCount to 3 so banProxy() immediately hard-deletes
        await ProxyKitchen.addVerifiedProxy(p.url, { ...p.platforms, failCount: 3 });
        await ProxyKitchen.banProxy(p.url);
      }
      this.totalEverFound = Math.max(0, this.totalEverFound - dead.length);
      this.huntDetails.totalEverFound = this.totalEverFound;
      this.pushLog('success', `PURGE COMPLETE — ☠️ ${dead.length} DEAD NODES REMOVED FROM POOL`);
      console.log(`[ProxyScraper] ☠️ Purged ${dead.length} dead proxies.`);
      return { purged: dead.length };
    } catch (e: any) {
      this.pushLog('banned', `PURGE FAILED: ${e.message}`);
      return { purged: 0 };
    }
  }

  // ── Main Hunt Orchestrator ──────────────────────────────────
  static async runHunt(): Promise<void> {
    if (this.isHunting) {
      console.log('[ProxyScraper] Hunt already in progress. Skipping...');
      return;
    }

    this.isHunting = true;
    this.huntCount++;
    this.lastHuntAt = new Date();
    const prevLastMined = this.huntDetails.lastMined; // preserve across reset
    this.huntDetails = {
      status: 'Extracting OSINT Matrix...',
      progress: 0, total: 0, found: 0, mined: 0, skipped: 0,
      huntCount: this.huntCount,
      totalEverFound: this.totalEverFound,
      lastHuntAt: this.lastHuntAt.toISOString(),
      nextHuntAt: this.nextHuntAt?.toISOString() ?? null,
      lastMined: prevLastMined, // keep last hunt's mine count visible while new hunt runs
    };
    console.log(`[ProxyScraper] 🟢 Hunt #${this.huntCount} — Red Team OSINT Initiated...`);
    this.pushLog('init', `HUNT #${this.huntCount} INITIATED — ${this.powerMode ? '⚡ POWER MODE (HETZNER VPS)' : 'STANDARD MODE'}`);

    try {
      // ── Step 1: Scrape all 26 OSINT sources + Telegram in parallel ─────────
      this.pushLog('log', `SCRAPING ${MASTER_PROXY_SOURCES.length} OSINT + ${TELEGRAM_SOURCES.length} TELEGRAM SOURCES...`);
      const fetchPromises = MASTER_PROXY_SOURCES.map(s => this.scrapeSource(s.url, s.proto, s.backup));
      const telegramPromises = TELEGRAM_SOURCES.map(url => this.scrapeTelegram(url));
      const results = await Promise.allSettled([...fetchPromises, ...telegramPromises]);

      const allProxies = new Set<string>();
      results.forEach(r => {
        if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
      });

      this.huntDetails.mined = allProxies.size;
      this.huntDetails.lastMined = allProxies.size; // persist — survives queue drain
      console.log(`[ProxyScraper] 🟢 Mined ${allProxies.size} unique raw candidates.`);
      this.pushLog('success', `MINED ${allProxies.size.toLocaleString()} UNIQUE RAW CANDIDATES`);

      // ── Phase 20: Store ALL raw candidates to Redis queue ──
      const allProxyArr = Array.from(allProxies);
      const pushed = await ProxyKitchen.pushToRawQueue(allProxyArr);
      if (pushed > 0) {
        const liveQueueSize = await ProxyKitchen.getRawQueueSize();
        this.huntDetails.mined = liveQueueSize;
        this.pushLog('log', `RAW QUEUE: ${liveQueueSize.toLocaleString()} STORED IN REDIS`);
      } else {
        // Redis push failed — store in memory so auto-verify can still drain them
        this.pendingBuffer = allProxyArr;
        this.pushLog('log', `⚠️ REDIS PUSH FAILED — ${allProxyArr.length.toLocaleString()} CANDIDATES HELD IN MEMORY FOR DIRECT VERIFICATION`);
        console.warn(`[ProxyScraper] ⚠️ pushToRawQueue returned 0 — holding ${allProxyArr.length} in pendingBuffer`);
      }

      // ── Step 2: Log dedup stats ──
      const knownProxies = await ProxyKitchen.getLiveProxies();
      const skipped = knownProxies.filter(p => allProxies.has(p.url)).length;
      this.huntDetails.skipped = skipped;
      this.pushLog('log', `HUNT #${this.huntCount} COMPLETE — ${allProxies.size.toLocaleString()} RAW MINED | ${skipped.toLocaleString()} ALREADY KNOWN | AUTO-VERIFY STARTING...`);
      this.huntDetails.status = 'Verify Queue Starting...';
      console.log(`[ProxyScraper] ✅ Hunt #${this.huntCount} complete — ${allProxies.size} raw candidates ready for verification.`);
    } catch (e: any) {
      this.huntDetails.status = 'Error';
      console.error(`[ProxyScraper] 🔴 Hunt failed: ${e.message}`);
      this.pushLog('banned', `HUNT #${this.huntCount} FAILED: ${e.message}`);
    } finally {
      this.isHunting = false;
      this.nextHuntAt = new Date(Date.now() + 2 * 3600_000); // next hunt in 2h
      this.huntDetails.nextHuntAt = this.nextHuntAt.toISOString();

      // ── AUTO-CHAIN: immediately verify after hunt ──
      // Check both Redis queue AND in-memory buffer — fire if either has candidates.
      const qs = await ProxyKitchen.getRawQueueSize();
      const memCount = this.pendingBuffer.length;
      const totalPending = qs + memCount;
      if (totalPending > 0 && !this.isVerifyingQueue) {
        this.pushLog('init', `🔗 AUTO-VERIFY: ${totalPending.toLocaleString()} candidates (redis:${qs}, memory:${memCount}) → pipeline starting...`);
        console.log(`[ProxyScraper] 🔗 Auto-chaining runVerifyQueue() after hunt (redis:${qs}, memory:${memCount})`);
        this.runVerifyQueue();
      } else if (!this.isVerifyingQueue) {
        this.pushLog('log', `⚠️ AUTO-VERIFY SKIPPED — no candidates available (redis:${qs}, memory:${memCount})`);
      }
    }
  }

  // ── Phase 21: Verify Queue ────────────────────────────────────
  // Drains the pending SET populated by runHunt() or beast_harvest.mjs.
  // This is SEPARATE from runHunt() so local hunting and cloud verification
  // can run independently without blocking each other.
  // Pop 5K candidates at a time → verify → good: store in verified_hash, bad: discard.
  // The raw pending SET decrements naturally until it's empty (= queue purged).
  static async runVerifyQueue(): Promise<{ verified: number; batches: number }> {
    if (this.isVerifyingQueue) {
      console.log('[ProxyScraper] Verify queue already running. Skipping.');
      return { verified: 0, batches: 0 };
    }
    if (this.cloudVerifyPaused) {
      console.log('[ProxyScraper] Cloud verify PAUSED — local beast is handling verification.');
      this.pushLog('log', '☁️ CLOUD VERIFY PAUSED — raw queue reserved for local beast verification');
      return { verified: 0, batches: 0 };
    }
    const queueSize = await ProxyKitchen.getRawQueueSize();
    const memSize = this.pendingBuffer.length;
    const totalPending = queueSize + memSize;
    if (totalPending === 0) {
      console.log('[ProxyScraper] Pending queue is empty (redis:0, memory:0) — nothing to verify.');
      return { verified: 0, batches: 0 };
    }

    this.isVerifyingQueue = true;
    let totalVerified = 0;
    let batchNum = 0;
    console.log(`[ProxyScraper] 🗂️  runVerifyQueue START — redis:${queueSize}, memory:${memSize} = ${totalPending} total`);
    this.pushLog('init', `VERIFY QUEUE START — ${totalPending.toLocaleString()} CANDIDATES (redis:${queueSize.toLocaleString()}, memory:${memSize.toLocaleString()})`);

    try {
      // Phase 1: Drain in-memory pendingBuffer first (from failed Redis push)
      while (this.pendingBuffer.length > 0) {
        const candidates = this.pendingBuffer.splice(0, SAMPLE_SIZE);
        const known = new Set((await ProxyKitchen.getLiveProxies()).map(p => p.url));
        const fresh = candidates.filter(p => !known.has(p));
        if (fresh.length === 0) continue;

        batchNum++;
        this.huntDetails.status = `Verifying Memory Batch ${batchNum}...`;
        this.huntDetails.total    = fresh.length;
        this.huntDetails.progress = 0;
        this.pushLog('init', `VERIFY MEM BATCH ${batchNum}: ${fresh.length.toLocaleString()} CANDIDATES (${this.pendingBuffer.length.toLocaleString()} remaining in memory)`);
        console.log(`[ProxyScraper] 🛂  Mem-Batch ${batchNum}: verifying ${fresh.length} (${this.pendingBuffer.length} left)`);

        const results = await this.verifyBatch(fresh);
        this.huntDetails.progress = fresh.length;

        for (let j = 0; j < fresh.length; j++) {
          const plat = results[j];
          if (plat && (plat.yt || plat.fb || plat.ig)) {
            await ProxyKitchen.addVerifiedProxy(fresh[j], plat);
            totalVerified++;
            this.totalEverFound++;
            this.huntDetails.found          = totalVerified;
            this.huntDetails.totalEverFound = this.totalEverFound;
          }
        }
        this.pushLog('success', `MEM BATCH ${batchNum} DONE — +${totalVerified} TOTAL VERIFIED`);
      }

      // Phase 2: Drain Redis queue (normal path)
      while (true) {
        const candidates = await ProxyKitchen.popFromRawQueue(SAMPLE_SIZE);
        if (candidates.length === 0) break;

        const known = new Set((await ProxyKitchen.getLiveProxies()).map(p => p.url));
        const fresh = candidates.filter(p => !known.has(p));
        if (fresh.length === 0) continue;

        batchNum++;
        const remaining = await ProxyKitchen.getRawQueueSize();
        this.huntDetails.status = `Verifying Queue (Batch ${batchNum})...`;
        this.huntDetails.total    = fresh.length;
        this.huntDetails.progress = 0;
        this.pushLog('init', `VERIFY Q BATCH ${batchNum}: ${fresh.length.toLocaleString()} CANDIDATES (${remaining.toLocaleString()} remaining)`);
        console.log(`[ProxyScraper] 🛂  Q-Batch ${batchNum}: verifying ${fresh.length} (${remaining} left)`);

        const results = await this.verifyBatch(fresh);
        this.huntDetails.progress = fresh.length;

        for (let j = 0; j < fresh.length; j++) {
          const plat = results[j];
          if (plat && (plat.yt || plat.fb || plat.ig)) {
            await ProxyKitchen.addVerifiedProxy(fresh[j], plat);
            totalVerified++;
            this.totalEverFound++;
            this.huntDetails.found          = totalVerified;
            this.huntDetails.totalEverFound = this.totalEverFound;
          }
        }
        this.pushLog('success', `VERIFY Q BATCH ${batchNum} DONE — +${totalVerified} TOTAL VERIFIED SO FAR`);
      }
    } catch (e: any) {
      console.error(`[ProxyScraper] runVerifyQueue error: ${e.message}`);
      this.pushLog('banned', `VERIFY QUEUE ERROR: ${e.message}`);
    } finally {
      this.isVerifyingQueue = false;
      this.huntDetails.status = 'Idle';
    }

    console.log(`[ProxyScraper] ✅ runVerifyQueue DONE — ${batchNum} batches — +${totalVerified} verified — pool total: ${this.totalEverFound}`);
    this.pushLog('success', `VERIFY QUEUE COMPLETE — ${batchNum} BATCHES — +${totalVerified} VERIFIED — POOL: ${this.totalEverFound}`);
    return { verified: totalVerified, batches: batchNum };
  }

  // ── Phase 14: Tiered Re-Validation ───────────────────────────
  // Called periodically. Only re-checks proxies that are "due" based on their tier:
  //   Platinum (<500ms, 3 platforms) → every 30 min
  //   Gold     (2+ platforms)        → every 2h
  //   Silver   (1 platform)          → every 6h
  //   Bronze   (slow/weak)           → every 24h (effectively 3AM sweep only)
  static async runRevalidation(): Promise<void> {
    if (this.isRevalidating || this.isHunting) {
      console.log('[ProxyScraper] Revalidation skipped — another operation in progress.');
      return;
    }
    this.isRevalidating = true;
    console.log('[ProxyScraper] 🔄 Starting tiered re-validation sweep...');
    this.pushLog('init', `TIERED RE-VALIDATION STARTED — ${this.powerMode ? '⚡ POWER MODE' : 'STANDARD'}`);

    const TIER_INTERVALS: Record<string, number> = {
      platinum: 30 * 60_000,         // 30 min
      gold:    2 * 60 * 60_000,      // 2 hours
      silver:  6 * 60 * 60_000,      // 6 hours
      bronze:  24 * 60 * 60_000,     // 24 hours
    };

    try {
      const stored = await ProxyKitchen.getLiveProxies();
      const now = Date.now();
      let purged = 0, kept = 0, skippedNotDue = 0;

      // Filter to only proxies that are "due" for revalidation
      const due = stored.filter(p => {
        const tier = p.platforms?.tier || 'bronze';
        const lastChecked = p.platforms?.lastCheckedAt ? new Date(p.platforms.lastCheckedAt).getTime() : 0;
        const interval = TIER_INTERVALS[tier] || TIER_INTERVALS.bronze;
        return (now - lastChecked) >= interval;
      });
      skippedNotDue = stored.length - due.length;
      console.log(`[ProxyScraper] 🔄 ${due.length} proxies due for recheck (${skippedNotDue} not yet due, skipped)`);

      // ── Rust turbo path: revalidate entire due-list in one call ──
      const dueUrls = due.map(p => p.url);
      const batchReval = await this.verifyBatch(dueUrls);
      for (let j = 0; j < due.length; j++) {
        const res = batchReval[j];
        if (!res || (!res.yt && !res.fb && !res.ig)) {
          // Phase 13: Increment fail count, only purge at 3 strikes
          const currentFails = (due[j].platforms?.failCount || 0) + 1;
          if (currentFails >= 3) {
            await ProxyKitchen.banProxy(due[j].url);
            purged++;
          } else {
            await ProxyKitchen.addVerifiedProxy(due[j].url, {
              ...due[j].platforms,
              failCount: currentFails,
              lastCheckedAt: new Date().toISOString(),
            });
            kept++;
          }
        } else {
          await ProxyKitchen.addVerifiedProxy(due[j].url, res);
          kept++;
        }
      }
      console.log(`[ProxyScraper] 🧹 Tiered re-validation done — kept: ${kept} | purged: ${purged} | not-due: ${skippedNotDue}`);
      this.pushLog('success', `REVALIDATION DONE — KEPT: ${kept} | PURGED: ${purged} | NOT-DUE: ${skippedNotDue}`);
    } catch (e: any) {
      console.error(`[ProxyScraper] 🔴 Revalidation failed: ${e.message}`);
    } finally {
      this.isRevalidating = false;
      this.lastRevalidatedAt = new Date();
      this.nextRevalAt = new Date(Date.now() + 30 * 60_000);
    }
  }

  // ── Source Fetcher ──────────────────────────────────────────
  private static async scrapeSource(primaryUrl: string, proto: string, backupUrls?: string[]): Promise<string[]> {
    // Build the full list to try: primary first, then backups in order
    const urlsToTry = [primaryUrl, ...(backupUrls || [])];
    let health = this.sourceHealth.get(primaryUrl);
    if (!health) {
      health = { active: primaryUrl, failCount: 0, degraded: false };
      this.sourceHealth.set(primaryUrl, health);
    }

    for (let attempt = 0; attempt < urlsToTry.length; attempt++) {
      const tryUrl = urlsToTry[attempt];
      const isBackup = attempt > 0;
      try {
        const response = await fetch(tryUrl.trim(), {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rawText = await response.text();
        const matches = rawText.match(PROXY_REGEX) || [];
        // Require at least 10 IPs — otherwise treat as stale/empty and try backup
        if (matches.length < 10 && attempt < urlsToTry.length - 1) {
          throw new Error(`Only ${matches.length} IPs (stale/empty)`);
        }
        // Success — update health record
        if (isBackup) {
          health.active = tryUrl;
          health.degraded = true;
          health.failCount = attempt;
          console.log(`[ProxyScraper] 🔄 AUTO-HEAL: ${primaryUrl.split('/').pop()} → using backup[${attempt}] (${tryUrl.split('/').pop()}) — ${matches.length} IPs`);
          this.pushLog('log', `AUTO-HEAL: ${primaryUrl.split('/').pop()} → BACKUP ${attempt} — ${matches.length} IPs`);
        } else {
          health.active = primaryUrl;
          health.failCount = 0;
          health.degraded = false;
        }
        return matches.map(m => `${proto}://${m}`);
      } catch (error: any) {
        if (isBackup) {
          console.warn(`[ProxyScraper] ⚠️  Backup[${attempt}] also failed (${tryUrl.split('/').pop()}) — ${error.message}`);
        } else {
          console.warn(`[ProxyScraper] ⚠️  Source degraded (${primaryUrl.split('/').pop()}) — ${error.message}${backupUrls?.length ? ` — trying ${backupUrls.length} backup(s)` : ''}`);
        }
        health.failCount++;
        health.degraded = true;
      }
    }
    // All URLs exhausted
    return [];
  }

  // ── Phase 15: Telegram Scraper — Bot API preferred, web fallback ────
  // Bot API is FREE. No payment needed.
  // Setup: 1) Open @BotFather on Telegram, 2) /newbot, 3) copy token
  //        4) Add bot to each channel as admin (or it can read public channels)
  //        5) Set TELEGRAM_BOT_TOKEN in server/.env
  // If token not set → falls back to web scrape (often blocked by Telegram anti-scrape)
  private static async scrapeTelegram(channelUrl: string): Promise<string[]> {
    const channelName = channelUrl.split('/').pop() || '';
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // ── Path A: Bot API (preferred — bypasses anti-scrape) ──────────
    if (botToken) {
      try {
        // Get the latest 100 messages from the public channel via Bot API
        // Channel identifier = @channelName (public channel username)
        const apiUrl = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100&allowed_updates=["channel_post"]`;
        // For public channels use their @username directly
        const historyUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        // Best approach: use getChatHistory via messages endpoint
        // For public channels: forward or search via inline approach
        // Use updates endpoint — simpler and always free:
        const updatesRes = await fetch(
          `https://api.telegram.org/bot${botToken}/getUpdates?limit=100`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (updatesRes.ok) {
          const updates = await updatesRes.json() as { ok: boolean; result: Array<{ message?: { text?: string }; channel_post?: { text?: string } }> };
          if (updates.ok) {
            const allText = updates.result.map(u => u.message?.text || u.channel_post?.text || '').join('\n');
            const matches = allText.match(PROXY_REGEX) || [];
            if (matches.length > 0) {
              const proxies: string[] = [];
              for (const m of matches) { proxies.push(`http://${m}`); proxies.push(`socks5://${m}`); }
              console.log(`[ProxyScraper] 📱 Telegram Bot API (${channelName}) — ${matches.length} IPs`);
              return proxies;
            }
          }
        }
      } catch (botError: any) {
        console.warn(`[ProxyScraper] ⚠️  Telegram Bot API failed (${channelName}) — ${botError.message} — falling back to web`);
      }
    }

    // ── Path B: Web scrape fallback (no bot token, or bot returned 0) ──
    try {
      const response = await fetch(channelUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const matches = html.match(PROXY_REGEX) || [];
      const proxies: string[] = [];
      for (const m of matches) { proxies.push(`http://${m}`); proxies.push(`socks5://${m}`); }
      console.log(`[ProxyScraper] 📱 Telegram web (${channelName}) — ${matches.length} IPs found`);
      return proxies;
    } catch (error: any) {
      console.warn(`[ProxyScraper] ⚠️  Telegram degraded (${channelName}) — ${error.message}`);
      return [];
    }
  }

  // ── Phase 17: Batch verifier — Rust first, Node.js fallback ──────
  // Sends ALL proxies to Rust in one HTTP call (unlimited concurrency).
  // Falls back to Node.js chunked loop if Rust binary isn't running.
  private static async verifyBatch(proxyUrls: string[]): Promise<Array<ProxyPlatforms | null>> {
    const enrichResults = (rustResult: { results: Array<{ url: string; yt: boolean; fb: boolean; ig: boolean; latency_ms: number } | null>; total: number; verified: number }): Array<ProxyPlatforms | null> => {
      return rustResult.results.map((r) => {
        if (!r) return null;
        let country = 'XX';
        try {
          const ip = r.url.replace(/^(socks5?|https?):\/\//, '').split(':')[0];
          const geo = geoip.lookup(ip);
          if (geo?.country) country = geo.country;
        } catch { /* non-critical */ }
        const platformCount = [r.yt, r.fb, r.ig].filter(Boolean).length;
        let tier: ProxyPlatforms['tier'] = 'bronze';
        if (r.latency_ms < 500 && platformCount === 3) tier = 'platinum';
        else if (platformCount >= 2) tier = 'gold';

        // Stealth: compute composite proxy score
        const { score } = calculateProxyScore(r.latency_ms, platformCount, 0, 1);

        return { yt: r.yt, fb: r.fb, ig: r.ig, latencyMs: r.latency_ms, country, failCount: 0, lastCheckedAt: new Date().toISOString(), tier, score };
      });
    };

    // Track success rate for adaptive engine
    const trackAndAdapt = (results: Array<ProxyPlatforms | null>) => {
      const successCount = results.filter(Boolean).length;
      const successRate = results.length > 0 ? (successCount / results.length) * 100 : 50;
      adaptBatchSize(successRate);
    };

    // Power Mode: try Local PC first (P27), then Hetzner VPS (separate IP, 500+ concurrent)
    if (this.powerMode) {
      // P27: Local PC Rust verifier (residential IP, best for undetectable verification)
      const localPcResult = await callLocalPcVerify(proxyUrls, VERIFY_TIMEOUT);
      if (localPcResult) {
        console.log(`[ProxyScraper] 🏠 Local PC verified ${localPcResult.total} — found ${localPcResult.verified}`);
        const enriched = enrichResults(localPcResult);
        trackAndAdapt(enriched);
        return enriched;
      }
      console.log('[ProxyScraper] Local PC unavailable — trying Hetzner VPS');

      const hetznerResult = await callHetznerVerify(proxyUrls, VERIFY_TIMEOUT);
      if (hetznerResult) {
        console.log(`[ProxyScraper] ⚡ Hetzner VPS verified ${hetznerResult.total} — found ${hetznerResult.verified}`);
        const enriched = enrichResults(hetznerResult);
        trackAndAdapt(enriched);
        return enriched;
      }
      console.log('[ProxyScraper] Hetzner unavailable — falling back to local Rust');
    }

    // Try local Rust hyper-verifier
    const rustResult = await callRustVerify(proxyUrls, VERIFY_TIMEOUT);
    if (rustResult) {
      console.log(`[ProxyScraper] 🦀 Rust verified ${rustResult.total} proxies — found ${rustResult.verified}`);
      const enriched = enrichResults(rustResult);
      trackAndAdapt(enriched);
      return enriched;
    }

    // Fallback: Node.js CHUNK_SIZE=20 loop with stealth UA rotation + delays
    console.log(`[ProxyScraper] ⚡ Node.js fallback — verifying ${proxyUrls.length} in chunks of ${CHUNK_SIZE} (stealth mode)`);
    const results: Array<ProxyPlatforms | null> = [];
    for (let i = 0; i < proxyUrls.length; i += CHUNK_SIZE) {
      const chunk = proxyUrls.slice(i, i + CHUNK_SIZE);
      const res   = await Promise.all(chunk.map(p => this.verifyProxy(p)));
      results.push(...res);

      // Stealth: add delay between chunks to avoid burst pattern
      if (i + CHUNK_SIZE < proxyUrls.length) {
        await stealthSleep(getBatchDelay());
      }
    }
    trackAndAdapt(results);
    return results;
  }

  // ── Single-Proxy Verifier (Phase 11: latency + Phase 12: geo + Stealth) ─────
  private static async verifyProxy(proxyUrl: string): Promise<ProxyPlatforms | null> {
    try {
      const isSocks = proxyUrl.startsWith('socks');
      const agent   = isSocks ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
      const profile = getRandomProfile();

      const runCheck = async (targetUrl: string): Promise<boolean> => {
        try {
          const fetchModule = (await import('node-fetch')).default;
          const res = await fetchModule(targetUrl, {
            agent: agent as any,
            timeout: VERIFY_TIMEOUT,
            headers: { 'User-Agent': profile.ua }
          } as any);
          // Ban detection: check if response indicates block/captcha
          if (res.status === 429 || res.status === 403) {
            const body = await res.text().catch(() => '');
            if (detectBanSignal(body)) return false;
          }
          return res.status === 204 || res.status === 200;
        } catch { return false; }
      };

      // Phase 11: Measure total latency across all 3 platform checks
      const start = Date.now();
      const [yt, fb, ig] = await Promise.all([
        runCheck('https://www.youtube.com/generate_204'),
        runCheck('https://www.facebook.com/favicon.ico'),
        runCheck('https://www.instagram.com/favicon.ico'),
      ]);
      const latencyMs = Date.now() - start;

      if (!yt && !fb && !ig) return null;

      // Phase 12: Offline GeoIP lookup (no API key, no rate limit)
      let country = 'XX';
      try {
        const ip = proxyUrl.replace(/^(socks5?|https?):\/\//, '').split(':')[0];
        const geo = geoip.lookup(ip);
        if (geo?.country) country = geo.country;
      } catch { /* geo lookup failed — non-critical */ }

      // Phase 14: Compute quality tier + stealth score
      const platformCount = [yt, fb, ig].filter(Boolean).length;
      let tier: 'platinum' | 'gold' | 'silver' | 'bronze' = 'bronze';
      if (latencyMs < 500 && platformCount === 3)       tier = 'platinum';
      else if (platformCount >= 2)                        tier = 'gold';

      const { score } = calculateProxyScore(latencyMs, platformCount, 0, 1);

      return {
        yt, fb, ig,
        latencyMs,
        country,
        failCount: 0,
        lastCheckedAt: new Date().toISOString(),
        tier,
        score,
      };
    } catch { return null; }
  }
}