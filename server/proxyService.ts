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
   * Removes a proxy from Upstash if it fails during ghost execution
   */
  static async banProxy(proxyUrl: string): Promise<void> {
    try {
      if (redis) {
        await redis.hdel(PROXY_REDIS_KEY, proxyUrl);
      } else {
        delete this.localFallbackMemory[proxyUrl];
        saveLocalCache(this.localFallbackMemory);
      }
      console.log(`[ProxyKitchen] Purged: ${proxyUrl}`);    
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
}
