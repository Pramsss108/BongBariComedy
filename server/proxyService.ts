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
   * Phase 13: Soft-ban with 3-strike logic.
   * First 2 failures increment failCount. Third strike = permanent removal.
   */
  static async banProxy(proxyUrl: string): Promise<void> {
    try {
      // Load current data to check fail count
      const proxies = await this.getLiveProxies();
      const existing = proxies.find(p => p.url === proxyUrl);
      const currentFails = (existing?.platforms?.failCount || 0) + 1;

      if (currentFails >= 3) {
        // 3 strikes — permanently purge
        if (redis) {
          await redis.hdel(PROXY_REDIS_KEY, proxyUrl);
        } else {
          delete this.localFallbackMemory[proxyUrl];
          saveLocalCache(this.localFallbackMemory);
        }
        console.log(`[ProxyKitchen] ☠️ Purged (3-strike): ${proxyUrl}`);
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
        console.log(`[ProxyKitchen] ⚠️ Strike ${currentFails}/3: ${proxyUrl}`);
      }
    } catch (error) {
      console.error('[ProxyKitchen] Redis ban error:', error);
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
   * Phase 16: Batch-import proxies from Beast Mode local harvest.
   * Called by POST /api/admin/proxy-bulk-import when local ProxyForge syncs to server.
   * Deduplicates against existing pool automatically.
   */
  static async bulkImport(entries: Array<{ url: string; platforms: ProxyPlatforms }>): Promise<{ added: number; skipped: number }> {
    const existing = await this.getLiveProxies();
    const existingSet = new Set(existing.map(p => p.url));
    let added = 0;
    let skipped = 0;
    for (const entry of entries) {
      if (existingSet.has(entry.url)) {
        skipped++;
        continue;
      }
      await this.addVerifiedProxy(entry.url, entry.platforms);
      added++;
    }
    console.log(`[ProxyKitchen] BulkImport: +${added} new, ${skipped} dupes skipped`);
    return { added, skipped };
  }
}
