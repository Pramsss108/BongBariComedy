import { Redis } from '@upstash/redis';
import * as ProxyChain from 'proxy-chain';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import type { ProxyPlatforms } from './proxyScraperService';

dotenv.config();

// Ensure Upstash Redis is configured
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REST_TOKEN || '';

const redis = redisUrl ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

export const PROXY_REDIS_KEY = 'red_team_proxies:verified_hash';
export const PROXY_BIN_KEY  = 'red_team_proxies:bin';
// Phase 20+: Changed from LIST to SET for automatic IP deduplication
// (sadd is idempotent — re-hunting never creates duplicate entries in the queue)
export const PROXY_RAW_QUEUE_KEY = 'red_team_proxies:pending';

// File-based persistence for local dev (survives hot-reloads)
const PROXY_CACHE_FILE = path.join(process.cwd(), 'data', 'proxies.json');

function loadLocalCache(): Record<string, string> {
  try {
    if (fs.existsSync(PROXY_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(PROXY_CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[ProxyKitchen] Cache file corrupt, starting fresh.');
  }
  return {};
}

function saveLocalCache(data: Record<string, string>): void {
  try {
    const dir = path.dirname(PROXY_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROXY_CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[ProxyKitchen] Failed to write cache file:', e);
  }
}

export interface EnrichedProxy {
  url: string;
  platforms: ProxyPlatforms;
}

export class ProxyKitchen {
  private static localFallbackMemory: Record<string, string> = loadLocalCache();
  private static localBinMemory: Record<string, string> = {};

  /**
   * Phase 5.1: Memory Storage
   * Returns a list of all currently live proxies stored in Upstash, parsing their platform data.
   */
  static async getLiveProxies(): Promise<EnrichedProxy[]> {
    try {
      const dbProxies: Record<string, string> | null = redis ? await redis.hgetall(PROXY_REDIS_KEY) : this.localFallbackMemory;
      if (!dbProxies) return [];
      
      return Object.entries(dbProxies).map(([url, platformsStr]) => {
          let platforms: ProxyPlatforms = { yt: false, fb: false, ig: false };
          try { platforms = typeof platformsStr === "string" ? JSON.parse(platformsStr) : platformsStr; } catch(e){}
          return {
             url,
             platforms
          }
      });
    } catch (error) {
      console.error('[ProxyKitchen] Redis pull error:', error);
      return [];
    }
  }

  /**
   * Add a newly verified proxy into Upstash Redis with its platform data.
   */
  static async addVerifiedProxy(proxyUrl: string, platforms: ProxyPlatforms): Promise<void> {
    try {
      const data = JSON.stringify(platforms);
      if (redis) {
        await redis.hset(PROXY_REDIS_KEY, { [proxyUrl]: data });
      } else {
        this.localFallbackMemory[proxyUrl] = data;
        saveLocalCache(this.localFallbackMemory);
      }
    } catch (error) {
      console.error('[ProxyKitchen] Redis insert error:', error);
    }
  }

  /**
   * Phase 13 + Phase 29: Soft-ban with 3-strike logic.
   * First 2 failures increment failCount. Third strike = move to BIN (soft-delete).
   */
  static async banProxy(proxyUrl: string): Promise<void> {
    try {
      // Load current data to check fail count
      const proxies = await this.getLiveProxies();
      const existing = proxies.find(p => p.url === proxyUrl);
      const currentFails = (existing?.platforms?.failCount || 0) + 1;

      if (currentFails >= 5) {
        // 5 strikes — move to BIN (soft-delete, recoverable for 24h)
        // Free proxies are flaky — 3 strikes was too aggressive, 5 gives them a fair chance
        const binData = JSON.stringify({
          ...(existing?.platforms || { yt: false, fb: false, ig: false }),
          failCount: currentFails,
          binnedAt: new Date().toISOString(),
        });
        if (redis) {
          await redis.hset(PROXY_BIN_KEY, { [proxyUrl]: binData });
          await redis.hdel(PROXY_REDIS_KEY, proxyUrl);
        } else {
          this.localBinMemory[proxyUrl] = binData;
          delete this.localFallbackMemory[proxyUrl];
          saveLocalCache(this.localFallbackMemory);
        }
        console.log(`[ProxyKitchen] 🗑️ Binned (5-strike): ${proxyUrl}`);
      } else {
        // Increment fail count but keep alive
        const updated = { ...(existing?.platforms || { yt: false, fb: false, ig: false }), failCount: currentFails };
        const data = JSON.stringify(updated);
        if (redis) {
          await redis.hset(PROXY_REDIS_KEY, { [proxyUrl]: data });
        } else {
          this.localFallbackMemory[proxyUrl] = data;
          saveLocalCache(this.localFallbackMemory);
        }
        console.log(`[ProxyKitchen] ⚠️ Strike ${currentFails}/5: ${proxyUrl}`);
      }
    } catch (error) {
      console.error('[ProxyKitchen] Redis ban error:', error);
    }
  }

  /**
   * Phase 29: Get all proxies currently in the BIN (soft-deleted).
   */
  static async getBinnedProxies(): Promise<Array<{ url: string; platforms: ProxyPlatforms & { binnedAt?: string } }>> {
    try {
      const binData: Record<string, string> | null = redis ? await redis.hgetall(PROXY_BIN_KEY) : this.localBinMemory;
      if (!binData) return [];
      return Object.entries(binData).map(([url, dataStr]) => {
        let platforms: any = { yt: false, fb: false, ig: false };
        try { platforms = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr; } catch {}
        return { url, platforms };
      });
    } catch (error) {
      console.error('[ProxyKitchen] Redis getBinnedProxies error:', error);
      return [];
    }
  }

  /**
   * Phase 29: Restore a proxy from BIN back to the live pool.
   * Resets failCount to 0 and removes binnedAt.
   */
  static async restoreFromBin(proxyUrl: string): Promise<boolean> {
    try {
      const binned = await this.getBinnedProxies();
      const entry = binned.find(b => b.url === proxyUrl);
      if (!entry) return false;
      const { binnedAt, failCount, ...cleanPlatforms } = entry.platforms as any;
      const restored = { ...cleanPlatforms, failCount: 0, lastCheckedAt: new Date().toISOString() };
      await this.addVerifiedProxy(proxyUrl, restored);
      if (redis) {
        await redis.hdel(PROXY_BIN_KEY, proxyUrl);
      } else {
        delete this.localBinMemory[proxyUrl];
      }
      console.log(`[ProxyKitchen] ♻️ Restored from BIN: ${proxyUrl}`);
      return true;
    } catch (error) {
      console.error('[ProxyKitchen] Restore from BIN error:', error);
      return false;
    }
  }

  /**
   * Phase 30: Purge BIN entries older than maxAgeHours (default 24h).
   * Called by cron or manually.
   */
  static async purgeBinExpired(maxAgeHours: number = 24): Promise<{ purged: number }> {
    try {
      const binned = await this.getBinnedProxies();
      const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
      let purged = 0;
      for (const entry of binned) {
        const binnedAt = entry.platforms.binnedAt ? new Date(entry.platforms.binnedAt).getTime() : 0;
        if (binnedAt > 0 && binnedAt < cutoff) {
          if (redis) {
            await redis.hdel(PROXY_BIN_KEY, entry.url);
          } else {
            delete this.localBinMemory[entry.url];
          }
          purged++;
        }
      }
      console.log(`[ProxyKitchen] 🧹 BIN purge: ${purged} expired entries removed (>${maxAgeHours}h old)`);
      return { purged };
    } catch (error) {
      console.error('[ProxyKitchen] BIN purge error:', error);
      return { purged: 0 };
    }
  }

  /**
   * Bulk-add failed proxies to BIN (used by beast BOOST mode).
   * Each proxy stored with binnedAt timestamp for 24h auto-purge.
   */
  static async bulkAddToBin(proxyUrls: string[]): Promise<number> {
    try {
      const now = new Date().toISOString();
      let added = 0;
      const binData = JSON.stringify({ yt: false, fb: false, ig: false, failCount: 5, binnedAt: now });
      if (redis) {
        // Use pipeline for efficiency
        const pipeline: Record<string, string> = {};
        for (const url of proxyUrls) {
          pipeline[url] = binData;
          added++;
        }
        if (added > 0) await redis.hset(PROXY_BIN_KEY, pipeline);
      } else {
        for (const url of proxyUrls) {
          this.localBinMemory[url] = binData;
          added++;
        }
      }
      console.log(`[ProxyKitchen] 🗑️ Bulk-binned ${added} failed proxies (24h auto-purge)`);
      return added;
    } catch (error) {
      console.error('[ProxyKitchen] bulkAddToBin error:', error);
      return 0;
    }
  }

  /**
   * RESCUE: Move all BIN entries back to raw queue for re-verification.
   * Used when proxies were binned due to Rust verifier being offline (not actually bad proxies).
   */
  static async rescueBinToRawQueue(): Promise<{ rescued: number; total: number }> {
    try {
      const binned = await this.getBinnedProxies();
      if (binned.length === 0) return { rescued: 0, total: 0 };

      const proxyUrls = binned.map(p => p.url);
      const rescued = await this.pushToRawQueue(proxyUrls);

      // Clear rescued entries from bin
      if (redis) {
        const CHUNK = 500;
        for (let i = 0; i < proxyUrls.length; i += CHUNK) {
          await redis.hdel(PROXY_BIN_KEY, ...proxyUrls.slice(i, i + CHUNK));
        }
      } else {
        for (const url of proxyUrls) {
          delete this.localBinMemory[url];
        }
      }
      console.log(`[ProxyKitchen] 🚑 Rescued ${rescued} proxies from BIN → Raw Queue`);
      return { rescued, total: binned.length };
    } catch (error) {
      console.error('[ProxyKitchen] rescueBinToRawQueue error:', error);
      return { rescued: 0, total: 0 };
    }
  }

  /**
   * Phase 5.2 & 5.3: The Router and Ghost Execution
   * Generates a rotation anonymizer using proxy-chain, connected to a random verified node.
   * Can optionally filter by required platform.
   */
  static async getNextGhostProxy(requiredPlatform?: 'yt' | 'ig' | 'fb'): Promise<string | null> {
    const proxies = await this.getLiveProxies();
    
    // Filter out if requested platform is dead on proxy
    const validProxies = requiredPlatform 
        ? proxies.filter(p => p.platforms[requiredPlatform])
        : proxies;

    if (!validProxies.length) {
      console.warn(`[ProxyKitchen] No live proxies available${requiredPlatform ? ` for ${requiredPlatform}` : ''}.`);
      return null;
    }

    // Select fastest/random proxy from the pool
    const selectedObj = validProxies[Math.floor(Math.random() * validProxies.length)];
    const selectedProxy = selectedObj.url;
    
    try {
      // proxy-chain automatically anonymizes the upstream SOCKS5 / HTTP proxy
      const anonymizedProxy = await ProxyChain.anonymizeProxy(selectedProxy);
      console.log(`[ProxyKitchen] 🟢 Yielded Anonymized Proxy: ${anonymizedProxy}`);
      return anonymizedProxy;
    } catch (error) {
      console.error(`[ProxyKitchen] Failed to anonymize proxy ${selectedProxy}, banning...`);
      await this.banProxy(selectedProxy);
      return null; // Return null here, forcing caller to retry
    }
  }

  /**
   * Cleans up proxy chain after request is completed
   */
  static async cleanupGhostProxy(anonymizedProxyUrl: string): Promise<void> {
    try {
      await ProxyChain.closeAnonymizedProxy(anonymizedProxyUrl, true);
    } catch (error) {
      console.error('[ProxyKitchen] Error closing anonymized proxy:', error);
    }
  }

  /**
   * Phase 16 + Phase 11: Get the best raw proxy URL for yt-dlp --proxy.
   * Prefers lowest-latency proxy (platinum/gold first).
   * Skips proxies with 2+ fails (unreliable).
   */
  static async getBestProxyForDownload(platform: 'yt' | 'ig' | 'fb'): Promise<string | null> {
    try {
      const proxies = await this.getLiveProxies();
      const valid = proxies
        .filter(p => p.platforms[platform] && (p.platforms.failCount || 0) < 2)
        .sort((a, b) => (a.platforms.latencyMs || 99999) - (b.platforms.latencyMs || 99999));
      if (!valid.length) return null;
      // Pick from top 5 fastest (small randomness to spread load)
      const topN = valid.slice(0, Math.min(5, valid.length));
      const picked = topN[Math.floor(Math.random() * topN.length)];
      return picked.url;
    } catch {
      return null;
    }
  }

  /**
   * Phase 20: Push raw scraped candidates to Redis list for later verification.
   * These are IPs that were mined but NOT yet tested — the "queue" of untested candidates.
   */
  static async pushToRawQueue(proxyUrls: string[]): Promise<number> {
    if (!proxyUrls.length) return 0;
    if (!redis) {
      console.error('[ProxyKitchen] ⚠️ pushToRawQueue: Redis NOT connected — cannot store raw queue. Set UPSTASH_REST_URL + UPSTASH_REST_TOKEN in .env');
      return 0;
    }
    let totalPushed = 0;
    try {
      // Batch in chunks of 500 (smaller = less likely to hit Upstash payload/rate limits)
      const CHUNK = 500;
      for (let i = 0; i < proxyUrls.length; i += CHUNK) {
        const chunk = proxyUrls.slice(i, i + CHUNK);
        // Retry each chunk up to 3 times with exponential backoff
        let attempts = 0;
        while (attempts < 3) {
          try {
            await redis.sadd(PROXY_RAW_QUEUE_KEY, ...(chunk as [string, ...string[]]));
            totalPushed += chunk.length;
            break; // success
          } catch (chunkErr: any) {
            attempts++;
            if (attempts >= 3) {
              console.error(`[ProxyKitchen] pushToRawQueue chunk ${Math.floor(i/CHUNK)+1} FAILED after 3 retries: ${chunkErr.message}`);
              break; // skip this chunk, continue with next
            }
            // Exponential backoff: 500ms, 1s, 2s
            const delay = 500 * Math.pow(2, attempts - 1);
            console.warn(`[ProxyKitchen] pushToRawQueue chunk retry ${attempts}/3 (delay ${delay}ms)`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      if (totalPushed > 0) {
        console.log(`[ProxyKitchen] ✅ pushToRawQueue: ${totalPushed.toLocaleString()} candidates stored in Redis`);
      } else {
        console.error(`[ProxyKitchen] ⚠️ pushToRawQueue: 0 candidates stored — all chunks failed`);
      }
      return totalPushed;
    } catch (error: any) {
      console.error(`[ProxyKitchen] pushToRawQueue FATAL error: ${error.message}`);
      return totalPushed; // return whatever was pushed before the fatal error
    }
  }

  /**
   * Phase 20: Pop a batch of raw candidates from the queue for verification.
   */
  static async popFromRawQueue(count: number = 5000): Promise<string[]> {
    try {
      if (!redis) return [];
      // SPOP with count is a single O(N) Redis call — vastly faster than
      // the previous loop of N individual RPOP calls.
      const items = await redis.spop(PROXY_RAW_QUEUE_KEY, count);
      if (!items) return [];
      return Array.isArray(items) ? (items as string[]) : [items as string];
    } catch (error) {
      console.error('[ProxyKitchen] popFromRawQueue error:', error);
      return [];
    }
  }

  /**
   * Phase 20: Get the current size of the raw candidate queue.
   */
  static async getRawQueueSize(): Promise<number> {
    try {
      if (!redis) return 0;
      return await redis.scard(PROXY_RAW_QUEUE_KEY);
    } catch (error) {
      console.error('[ProxyKitchen] getRawQueueSize error:', error);
      return 0;
    }
  }

  /**
   * Phase 16: Batch-import proxies from Beast Mode local harvest.
   * Called by POST /api/admin/proxy-bulk-import when local ProxyForge syncs to server.
   * Deduplicates against existing pool automatically.
   */
  static async bulkImport(entries: Array<{ url: string; platforms: ProxyPlatforms }>): Promise<{ added: number; skipped: number }> {
    const existing = await this.getLiveProxies();
    const existingSet = new Set(existing.map(p => p.url));
    let added = 0;
    let skipped = 0;
    // Build full batch object — one hset call instead of N sequential calls (N+1 fix)
    const batchData: Record<string, string> = {};
    for (const entry of entries) {
      if (existingSet.has(entry.url)) { skipped++; continue; }
      batchData[entry.url] = JSON.stringify(entry.platforms);
      added++;
    }
    if (added > 0) {
      if (redis) {
        await redis.hset(PROXY_REDIS_KEY, batchData);
      } else {
        Object.assign(this.localFallbackMemory, batchData);
        saveLocalCache(this.localFallbackMemory);
      }
    }
    console.log(`[ProxyKitchen] BulkImport: +${added} new, ${skipped} dupes skipped (single batched hset)`);
    return { added, skipped };
  }

  // ── Phase Reaper: Redis Sorted Set (ZADD) operations ─────────────────────────
  // Used by Oracle VM deep verifier to store verified proxies by latency score.
  // Lower score = faster proxy = returned first.
  // Key format: `proxies:verified:{platform}` — TTL 6h (refreshed on write).

  private static readonly VERIFIED_POOL_TTL = 6 * 60 * 60; // 6h in seconds

  /**
   * Pop `count` candidates from the Reaper candidate SET.
   * Oracle VM verifier calls this every 30 min to grab a batch for deep-testing.
   */
  static async spopCandidates(key: string, count: number = 20): Promise<string[]> {
    try {
      if (!redis) return [];
      const items = await redis.spop(key, count);
      if (!items) return [];
      return Array.isArray(items) ? (items as string[]) : [items as string];
    } catch (error) {
      console.error('[ProxyKitchen] spopCandidates error:', error);
      return [];
    }
  }

  /**
   * Add a proxy to a platform sorted set scored by latency (ms).
   * Automatically refreshes 6h TTL on each write.
   */
  static async zaddVerified(platform: string, latencyMs: number, proxyUrl: string): Promise<void> {
    try {
      if (!redis) return;
      const key = `proxies:verified:${platform}`;
      await redis.zadd(key, { score: latencyMs, member: proxyUrl });
      await redis.expire(key, ProxyKitchen.VERIFIED_POOL_TTL);
    } catch (error) {
      console.error('[ProxyKitchen] zaddVerified error:', error);
    }
  }

  /**
   * Return the best (lowest latency) proxy for a platform from the sorted set.
   * Falls back to legacy HASH-based getBestProxyForDownload() when the set is empty.
   */
  static async getBestFromVerifiedPool(platform: 'yt' | 'ig' | 'fb'): Promise<string | null> {
    try {
      if (!redis) return ProxyKitchen.getBestProxyForDownload(platform);
      const key = `proxies:verified:${platform}`;
      const results = await redis.zrange(key, 0, 4); // top-5 fastest
      if (!results || results.length === 0) {
        return ProxyKitchen.getBestProxyForDownload(platform);
      }
      // Spread load across top-5
      const picked = results[Math.floor(Math.random() * results.length)];
      return (picked as string) ?? null;
    } catch (error) {
      console.error('[ProxyKitchen] getBestFromVerifiedPool error:', error);
      return ProxyKitchen.getBestProxyForDownload(platform);
    }
  }

  /**
   * Remove a proxy from the platform sorted set on failure.
   */
  static async removeFromVerifiedPool(platform: string, proxyUrl: string): Promise<void> {
    try {
      if (!redis) return;
      await redis.zrem(`proxies:verified:${platform}`, proxyUrl);
    } catch (error) {
      console.error('[ProxyKitchen] removeFromVerifiedPool error:', error);
    }
  }

  /**
   * Get the number of proxies in a platform's verified sorted set.
   */
  static async getVerifiedPoolSize(platform: string): Promise<number> {
    try {
      if (!redis) return 0;
      return (await redis.zcard(`proxies:verified:${platform}`)) || 0;
    } catch {
      return 0;
    }
  }
}
