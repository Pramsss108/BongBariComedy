import * as fs from 'fs';
import * as path from 'path';
import { ProxyKitchen } from './proxyService';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import geoip from 'geoip-lite';
import { callRustVerify, callHetznerVerify } from './rustVerifier';

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

// ── OSINT Source Matrix (26 sources) ─────────────────────────
const MASTER_PROXY_SOURCES = [
  // ── TIER A: SOCKS5 GitHub lists ──────────────────────────
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt', proto: 'socks5' },
  // ── TIER A: HTTP GitHub lists ────────────────────────────
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', proto: 'http' },
  // ── TIER B: MEGA-DUMP aggregators (50k+ candidates/day) ──
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/caliphdev/Proxy-List/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt', proto: 'http' },
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
  static isForceRevalidating = false;
  static huntCount          = 0;
  static totalEverFound     = 0;
  static lastHuntAt: Date | null = null;
  static nextHuntAt: Date | null = null;
  static lastRevalidatedAt: Date | null = null;
  static nextRevalAt: Date | null = null;
  static powerMode          = false;
  // ── Backend Log Buffer (real server activity, streamed to frontend) ──
  static logBuffer: Array<{ time: string; type: string; msg: string }> = [];
  // ── Local Sync Log Buffer (beast-mode uploads from user's local machine) ──
  static localSyncBuffer: Array<{ time: string; type: string; msg: string }> = [];
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
    this.huntDetails = {
      status: 'Extracting OSINT Matrix...',
      progress: 0, total: 0, found: 0, mined: 0, skipped: 0,
      huntCount: this.huntCount,
      totalEverFound: this.totalEverFound,
      lastHuntAt: this.lastHuntAt.toISOString(),
      nextHuntAt: this.nextHuntAt?.toISOString() ?? null,
    };
    console.log(`[ProxyScraper] 🟢 Hunt #${this.huntCount} — Red Team OSINT Initiated...`);
    this.pushLog('init', `HUNT #${this.huntCount} INITIATED — ${this.powerMode ? '⚡ POWER MODE (HETZNER VPS)' : 'STANDARD MODE'}`);

    try {
      // ── Step 1: Scrape all 26 OSINT sources + Telegram in parallel ─────────
      this.pushLog('log', `SCRAPING ${MASTER_PROXY_SOURCES.length} OSINT + ${TELEGRAM_SOURCES.length} TELEGRAM SOURCES...`);
      const fetchPromises = MASTER_PROXY_SOURCES.map(s => this.scrapeSource(s.url, s.proto));
      const telegramPromises = TELEGRAM_SOURCES.map(url => this.scrapeTelegram(url));
      const results = await Promise.allSettled([...fetchPromises, ...telegramPromises]);

      const allProxies = new Set<string>();
      results.forEach(r => {
        if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
      });

      this.huntDetails.mined = allProxies.size;
      console.log(`[ProxyScraper] 🟢 Mined ${allProxies.size} unique raw candidates.`);
      this.pushLog('success', `MINED ${allProxies.size.toLocaleString()} UNIQUE RAW CANDIDATES`);

      // ── Step 2: Skip already-known verified proxies ───────
      const knownProxies = new Set((await ProxyKitchen.getLiveProxies()).map(p => p.url));
      const newProxies   = Array.from(allProxies).filter(p => !knownProxies.has(p));
      const skipped      = allProxies.size - newProxies.length;
      this.huntDetails.skipped = skipped;
      console.log(`[ProxyScraper] ⏭️  Skipping ${skipped} already-verified proxies.`);
      this.pushLog('log', `DEDUP: ${skipped.toLocaleString()} ALREADY KNOWN — ${newProxies.length.toLocaleString()} NEW`);

      // ── Step 3: Random sample & verify ───────────────────
      const sampleSize  = Math.min(SAMPLE_SIZE, newProxies.length);
      const testSample  = newProxies.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
      this.huntDetails.total  = sampleSize;
      this.huntDetails.status = 'Verifying Nodes...';
      console.log(`[ProxyScraper] 🛂 Verifying ${sampleSize} fresh candidates (${CHUNK_SIZE} concurrency)...`);
      this.pushLog('init', `VERIFYING ${sampleSize.toLocaleString()} CANDIDATES — ${this.powerMode ? 'HETZNER VPS 500+ CONCURRENT' : 'RUST/NODE ENGINE'}`);

      let verifiedCount = 0;
      // ── Rust turbo path: all proxies in one shot (~90s vs ~42 min) ──
      this.huntDetails.status = 'Verifying Nodes (🦀 Rust Engine)...';
      const batchResults = await this.verifyBatch(testSample);
      this.huntDetails.progress = sampleSize;
      for (let j = 0; j < testSample.length; j++) {
        const platforms = batchResults[j];
        if (platforms && (platforms.yt || platforms.fb || platforms.ig)) {
          await ProxyKitchen.addVerifiedProxy(testSample[j], platforms);
          verifiedCount++;
          this.totalEverFound++;
          this.huntDetails.found          = verifiedCount;
          this.huntDetails.totalEverFound = this.totalEverFound;
        }
      }

      this.huntDetails.status = 'Idle';
      console.log(`[ProxyScraper] ✅ Hunt #${this.huntCount} complete — +${verifiedCount} new proxies | ${knownProxies.size} existing | total ever: ${this.totalEverFound}`);
      this.pushLog('success', `HUNT #${this.huntCount} COMPLETE — +${verifiedCount} VERIFIED | ${knownProxies.size} EXISTING | POOL: ${this.totalEverFound}`);
    } catch (e: any) {
      this.huntDetails.status = 'Error';
      console.error(`[ProxyScraper] 🔴 Hunt failed: ${e.message}`);
      this.pushLog('banned', `HUNT #${this.huntCount} FAILED: ${e.message}`);
    } finally {
      this.isHunting = false;
    }
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
  private static async scrapeSource(url: string, proto: string): Promise<string[]> {
    try {
      const response = await fetch(url.trim(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawText = await response.text();
      const matches = rawText.match(PROXY_REGEX) || [];
      return matches.map(m => `${proto}://${m}`);
    } catch (error: any) {
      console.warn(`[ProxyScraper] ⚠️  Source degraded (${url.split('/').pop()}) — ${error.message}`);
      return [];
    }
  }

  // ── Phase 15: Telegram Public Web Scraper ─────────────────────
  // Fetches https://t.me/s/CHANNEL (public HTML preview, no API key)
  // Extracts IP:PORT from message text, tries both http:// and socks5://
  private static async scrapeTelegram(channelUrl: string): Promise<string[]> {
    try {
      const response = await fetch(channelUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const matches = html.match(PROXY_REGEX) || [];
      // Telegram channels mix protocols — emit both and let verifier sort
      const proxies: string[] = [];
      for (const m of matches) {
        proxies.push(`http://${m}`);
        proxies.push(`socks5://${m}`);
      }
      console.log(`[ProxyScraper] 📱 Telegram (${channelUrl.split('/').pop()}) — ${matches.length} IPs found`);
      return proxies;
    } catch (error: any) {
      console.warn(`[ProxyScraper] ⚠️  Telegram degraded (${channelUrl.split('/').pop()}) — ${error.message}`);
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
        return { yt: r.yt, fb: r.fb, ig: r.ig, latencyMs: r.latency_ms, country, failCount: 0, lastCheckedAt: new Date().toISOString(), tier };
      });
    };

    // Power Mode: try Hetzner VPS first (separate IP, 500+ concurrent)
    if (this.powerMode) {
      const hetznerResult = await callHetznerVerify(proxyUrls, VERIFY_TIMEOUT);
      if (hetznerResult) {
        console.log(`[ProxyScraper] ⚡ Hetzner VPS verified ${hetznerResult.total} — found ${hetznerResult.verified}`);
        return enrichResults(hetznerResult);
      }
      console.log('[ProxyScraper] Hetzner unavailable — falling back to local Rust');
    }

    // Try local Rust hyper-verifier
    const rustResult = await callRustVerify(proxyUrls, VERIFY_TIMEOUT);
    if (rustResult) {
      console.log(`[ProxyScraper] 🦀 Rust verified ${rustResult.total} proxies — found ${rustResult.verified}`);
      return enrichResults(rustResult);
    }

    // Fallback: Node.js CHUNK_SIZE=20 loop (original behavior)
    console.log(`[ProxyScraper] ⚡ Node.js fallback — verifying ${proxyUrls.length} in chunks of ${CHUNK_SIZE}`);
    const results: Array<ProxyPlatforms | null> = [];
    for (let i = 0; i < proxyUrls.length; i += CHUNK_SIZE) {
      const chunk = proxyUrls.slice(i, i + CHUNK_SIZE);
      const res   = await Promise.all(chunk.map(p => this.verifyProxy(p)));
      results.push(...res);
    }
    return results;
  }

  // ── Single-Proxy Verifier (Phase 11: latency + Phase 12: geo) ─────
  private static async verifyProxy(proxyUrl: string): Promise<ProxyPlatforms | null> {
    try {
      const isSocks = proxyUrl.startsWith('socks');
      const agent   = isSocks ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);

      const runCheck = async (targetUrl: string): Promise<boolean> => {
        try {
          const fetchModule = (await import('node-fetch')).default;
          const res = await fetchModule(targetUrl, {
            agent: agent as any,
            timeout: VERIFY_TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' }
          } as any);
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

      // Phase 14: Compute quality tier
      const platformCount = [yt, fb, ig].filter(Boolean).length;
      let tier: 'platinum' | 'gold' | 'silver' | 'bronze' = 'bronze';
      if (latencyMs < 500 && platformCount === 3)       tier = 'platinum';
      else if (platformCount >= 2)                        tier = 'gold';

      return {
        yt, fb, ig,
        latencyMs,
        country,
        failCount: 0,
        lastCheckedAt: new Date().toISOString(),
        tier,
      };
    } catch { return null; }
  }
}