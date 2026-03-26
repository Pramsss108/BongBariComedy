import * as fs from 'fs';
import * as path from 'path';
import { ProxyKitchen } from './proxyService';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * ============================================================
 * RED TEAM PROXY HUNTER — Phase 1 & 2 (INDUSTRY-GRADE ENGINE)
 * ============================================================
 * Architecture:
 *   - 12 OSINT sources (GitHub lists + open aggregators)
 *   - 2500-proxy sample per hunt (~10 minutes at 20 concurrency)
 *   - Chunk=20 workers → CPU safe on Node (~60 open sockets)
 *   - Full dedup: skips already-known proxies
 *   - Daily re-validation pass at 3AM to purge dead nodes
 *   - Lifetime stat tracking (hunts, total ever found)
 * ============================================================
 */

// ── Master Regex ─────────────────────────────────────────────
const PROXY_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b/g;

// ── OSINT Source Matrix (12 sources) ─────────────────────────
const MASTER_PROXY_SOURCES = [
  // SOCKS5 lists
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt', proto: 'socks5' },
  // HTTP / HTTPS lists
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt', proto: 'http' },
  // Mixed aggregators
  { url: 'https://spys.me/proxy.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', proto: 'http' },
];

// ── Tuning Constants ─────────────────────────────────────────
const SAMPLE_SIZE     = 2500;  // Proxies verified per hunt (~10 min)
const CHUNK_SIZE      = 20;    // Concurrent workers (CPU safe: ~60 open sockets)
const VERIFY_TIMEOUT  = 10000; // 10s per proxy check
const STALE_AGE_HOURS = 24;    // Re-validate proxies older than 24h

export interface ProxyPlatforms {
  yt: boolean;
  fb: boolean;
  ig: boolean;
}

export class ProxyScraper {
  static isHunting     = false;
  static isRevalidating = false;
  static huntCount     = 0;
  static totalEverFound = 0;
  static lastHuntAt: Date | null = null;
  static nextHuntAt: Date | null = null;

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

    try {
      // ── Step 1: Scrape all 12 sources in parallel ─────────
      const fetchPromises = MASTER_PROXY_SOURCES.map(s => this.scrapeSource(s.url, s.proto));
      const results = await Promise.allSettled(fetchPromises);

      const allProxies = new Set<string>();
      results.forEach(r => {
        if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
      });

      this.huntDetails.mined = allProxies.size;
      console.log(`[ProxyScraper] 🟢 Mined ${allProxies.size} unique raw candidates.`);

      // ── Step 2: Skip already-known verified proxies ───────
      const knownProxies = new Set((await ProxyKitchen.getLiveProxies()).map(p => p.url));
      const newProxies   = Array.from(allProxies).filter(p => !knownProxies.has(p));
      const skipped      = allProxies.size - newProxies.length;
      this.huntDetails.skipped = skipped;
      console.log(`[ProxyScraper] ⏭️  Skipping ${skipped} already-verified proxies.`);

      // ── Step 3: Random sample & verify ───────────────────
      const sampleSize  = Math.min(SAMPLE_SIZE, newProxies.length);
      const testSample  = newProxies.sort(() => 0.5 - Math.random()).slice(0, sampleSize);
      this.huntDetails.total  = sampleSize;
      this.huntDetails.status = 'Verifying Nodes...';
      console.log(`[ProxyScraper] 🛂 Verifying ${sampleSize} fresh candidates (${CHUNK_SIZE} concurrency)...`);

      let verifiedCount = 0;
      for (let i = 0; i < testSample.length; i += CHUNK_SIZE) {
        const chunk = testSample.slice(i, i + CHUNK_SIZE);
        this.huntDetails.progress = Math.min(i + CHUNK_SIZE, sampleSize);

        const res = await Promise.all(chunk.map(p => this.verifyProxy(p)));
        for (let j = 0; j < chunk.length; j++) {
          const platforms = res[j];
          if (platforms && (platforms.yt || platforms.fb || platforms.ig)) {
            await ProxyKitchen.addVerifiedProxy(chunk[j], platforms);
            verifiedCount++;
            this.totalEverFound++;
            this.huntDetails.found          = verifiedCount;
            this.huntDetails.totalEverFound = this.totalEverFound;
          }
        }
      }

      this.huntDetails.status = 'Idle';
      console.log(`[ProxyScraper] ✅ Hunt #${this.huntCount} complete — +${verifiedCount} new proxies | ${knownProxies.size} existing | total ever: ${this.totalEverFound}`);
    } catch (e: any) {
      this.huntDetails.status = 'Error';
      console.error(`[ProxyScraper] 🔴 Hunt failed: ${e.message}`);
    } finally {
      this.isHunting = false;
    }
  }

  // ── Daily Re-Validation Pass ────────────────────────────────
  // Runs at 3AM via cron. Re-checks ALL stored proxies and purges dead ones.
  static async runRevalidation(): Promise<void> {
    if (this.isRevalidating || this.isHunting) {
      console.log('[ProxyScraper] Revalidation skipped — another operation in progress.');
      return;
    }
    this.isRevalidating = true;
    console.log('[ProxyScraper] 🔄 Starting daily re-validation sweep...');

    try {
      const stored = await ProxyKitchen.getLiveProxies();
      let purged   = 0;
      let kept     = 0;

      for (let i = 0; i < stored.length; i += CHUNK_SIZE) {
        const chunk = stored.slice(i, i + CHUNK_SIZE);
        const res   = await Promise.all(chunk.map(p => this.verifyProxy(p.url)));
        for (let j = 0; j < chunk.length; j++) {
          if (!res[j] || (!res[j]!.yt && !res[j]!.fb && !res[j]!.ig)) {
            await ProxyKitchen.banProxy(chunk[j].url);
            purged++;
          } else {
            // Update freshness — re-store with latest platform flags
            await ProxyKitchen.addVerifiedProxy(chunk[j].url, res[j]!);
            kept++;
          }
        }
      }
      console.log(`[ProxyScraper] 🧹 Re-validation done — kept: ${kept} | purged: ${purged}`);
    } catch (e: any) {
      console.error(`[ProxyScraper] 🔴 Revalidation failed: ${e.message}`);
    } finally {
      this.isRevalidating = false;
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

  // ── Single-Proxy Verifier ───────────────────────────────────
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

      const [yt, fb, ig] = await Promise.all([
        runCheck('https://www.youtube.com/generate_204'),
        runCheck('https://www.facebook.com/favicon.ico'),
        runCheck('https://www.instagram.com/favicon.ico'),
      ]);

      if (!yt && !fb && !ig) return null;
      return { yt, fb, ig };
    } catch { return null; }
  }
}