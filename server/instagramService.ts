import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ReelInfo = {
  reelId: string;
  caption: string;
  thumbnail: string;
  permalink: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  videoUrl: string;
};

type DataSource = 'static-json' | 'graph-api' | 'public-scrape' | 'none';

/**
 * Priority chain:
 *   1. Static JSON (from GitHub Actions multi-tier scraper) — auto-updated daily
 *   2. Graph API (if env vars exist)                        — official, real-time fallback
 *   3. Direct scraping (DEAD)                               — all methods blocked by IG (Apr 2025)
 *
 * NOTE (April 2025 — exhaustive testing):
 *   - ALL Picuki/Proxigram mirrors: dead (expired certs, DNS failures)
 *   - IG v1 Private API: 429 even via residential ASOCKS proxy
 *   - Instaloader: 403 even via residential proxy
 *   - IG embed page: empty app shell, zero media data
 *   - Instagram has locked ALL anonymous scraping completely
 *   
 * The GitHub Actions scraper (scripts/scrape-reels.cjs) supports:
 *   Tier 1: Graph API (official, permanent, free)
 *   Tier 2: RapidAPI (commercial free tier, 100-500 req/month)
 */
class InstagramService {
  private latest: ReelInfo[] = [];
  private popular: ReelInfo[] = [];
  private lastUpdate = 0;
  private running = false;
  private userId: string | null = null;
  private username: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private dataSource: DataSource = 'none';
  private readonly intervalMs = 2 * 60 * 1000; // 2 minutes
  private intervalRef: NodeJS.Timeout | null = null;
  private staticJsonPath: string;

  constructor() {
    // In dev: client/public/data/reels-data.json
    // In prod (built): dist/public/data/reels-data.json
    this.staticJsonPath = path.join(__dirname, '..', 'client', 'public', 'data', 'reels-data.json');
    const prodPath = path.join(__dirname, '..', 'dist', 'public', 'data', 'reels-data.json');
    if (!fs.existsSync(this.staticJsonPath) && fs.existsSync(prodPath)) {
      this.staticJsonPath = prodPath;
    }
  }

  /**
   * Start with Graph API token (Phase 2 — official)
   */
  start(userId: string, accessToken: string) {
    this.userId = userId;
    this.accessToken = accessToken;
    if (!this.tokenExpiresAt) {
      this.tokenExpiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000;
    }
    this.startInterval();
  }

  /**
   * Start with just a username (emergency fallback)
   */
  startWithUsername(username: string) {
    this.username = username.replace(/^@/, '');
    this.startInterval();
  }

  private startInterval() {
    if (this.running) return;
    this.running = true;
    this.refresh().catch(() => {});
    this.intervalRef = setInterval(() => this.refresh().catch(() => {}), this.intervalMs);
  }

  stop() {
    this.running = false;
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  getInfo() {
    return {
      latest: this.latest.length,
      popular: this.popular.length,
      lastUpdate: this.lastUpdate || null,
      running: this.running,
      userId: this.userId,
      username: this.username,
      dataSource: this.dataSource,
      tokenExpiresAt: this.tokenExpiresAt || null,
      staticJsonExists: fs.existsSync(this.staticJsonPath),
    } as const;
  }

  getLatest(count = 4): ReelInfo[] {
    return this.latest.slice(0, count);
  }

  getPopular(count = 4): ReelInfo[] {
    return this.popular.slice(0, count);
  }

  async forceRefresh() {
    await this.refresh();
  }

  private async refresh() {
    const now = Date.now();
    if (now - this.lastUpdate < 30_000) return; // throttle 30s
    this.lastUpdate = now;

    // ── Priority 1: Static JSON (Graph API scraper via GitHub Actions) ──
    const staticReels = this.loadStaticJSON();
    if (staticReels) {
      this.latest = staticReels.latest;
      this.popular = staticReels.popular;
      this.dataSource = 'static-json';
      console.log(`[InstagramService] Loaded ${staticReels.latest.length} latest + ${staticReels.popular.length} popular from static JSON`);
      return; // Done — no need for API calls
    }

    // ── Priority 2: Graph API (Phase 2 — if token env vars exist) ──
    if (this.accessToken && this.tokenExpiresAt && now > this.tokenExpiresAt - (10 * 24 * 60 * 60 * 1000)) {
      await this.refreshToken().catch((err) => {
        console.error('[InstagramService] Token refresh failed:', err.message);
      });
    }

    let allReels: ReelInfo[] = [];

    if (this.userId && this.accessToken) {
      try {
        const media = await this.fetchMediaFromGraphAPI();
        allReels = media.filter((m: any) => m.media_type === 'VIDEO').map(this.mapGraphAPIToReel);
        this.dataSource = 'graph-api';
        console.log(`[InstagramService] Fetched ${allReels.length} reels via Graph API`);
      } catch (err: any) {
        console.error('[InstagramService] Graph API failed:', err.message);
      }
    }

    // ── Priority 3: Direct scraping (emergency only) ──
    if (allReels.length === 0 && this.username) {
      try {
        allReels = await this.scrapePublicProfile(this.username);
        this.dataSource = 'public-scrape';
        console.log(`[InstagramService] Scraped ${allReels.length} reels from public profile`);
      } catch (err: any) {
        console.error('[InstagramService] Public scrape failed:', err.message);
      }
    }

    if (allReels.length === 0) {
      this.dataSource = 'none';
      return;
    }

    this.latest = [...allReels]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 12);

    this.popular = [...allReels]
      .sort((a, b) => {
        const scoreA = (a.likeCount || 0) + (a.commentCount || 0) * 3;
        const scoreB = (b.likeCount || 0) + (b.commentCount || 0) * 3;
        return scoreB - scoreA;
      })
      .slice(0, 12);
  }

  // ─── STATIC JSON (Primary — from GitHub Actions Graph API scraper) ──

  private loadStaticJSON(): { latest: ReelInfo[]; popular: ReelInfo[] } | null {
    try {
      if (!fs.existsSync(this.staticJsonPath)) return null;
      const raw = fs.readFileSync(this.staticJsonPath, 'utf-8');
      const data = JSON.parse(raw);

      // Validate expected shape
      if (!data?.latest?.length && !data?.popular?.length) return null;

      // Check staleness — if data is older than 3 days, fall through to live sources
      const scrapedAt = data?._meta?.scrapedAt;
      if (scrapedAt) {
        const age = Date.now() - new Date(scrapedAt).getTime();
        if (age > 3 * 24 * 60 * 60 * 1000) {
          console.warn('[InstagramService] Static JSON is stale (>3 days), falling through to live sources');
          return null;
        }
      }

      const mapItem = (item: any): ReelInfo => ({
        reelId: item.reelId || item.id || '',
        caption: item.caption || 'Instagram Reel',
        thumbnail: item.thumbnail || '',
        permalink: item.permalink || item.url || '',
        publishedAt: item.publishedAt || item.date || new Date().toISOString(),
        likeCount: item.likeCount || item.likes || 0,
        commentCount: item.commentCount || item.comments || 0,
        viewCount: item.viewCount || item.play_count || 0,
        videoUrl: item.videoUrl || '',
      });

      return {
        latest: (data.latest || []).map(mapItem),
        popular: (data.popular || []).map(mapItem),
      };
    } catch (err: any) {
      console.error('[InstagramService] Failed to load static JSON:', err.message);
      return null;
    }
  }

  // ─── GRAPH API (Phase 2) ────────────────────────────────────

  private async fetchMediaFromGraphAPI(): Promise<any[]> {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const url = `https://graph.instagram.com/${this.userId}/media?fields=${fields}&limit=50&access_token=${this.accessToken}`;
    const data = await this.fetchJSON(url);
    return data.data || [];
  }

  private mapGraphAPIToReel = (item: any): ReelInfo => {
    const caption = item.caption || '';
    const firstLine = caption.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 80) || 'Instagram Reel';
    return {
      reelId: item.id,
      caption: firstLine,
      thumbnail: item.thumbnail_url || item.media_url || '',
      permalink: item.permalink || `https://www.instagram.com/${this.username || 'thebongbari'}/`,
      publishedAt: item.timestamp || new Date().toISOString(),
      likeCount: item.like_count || 0,
      commentCount: item.comments_count || 0,
      viewCount: item.video_view_count || item.play_count || 0,
      videoUrl: item.media_url || '',
    };
  };

  // ─── DIRECT SCRAPING (Emergency Fallback) ────────────────────

  private async scrapePublicProfile(username: string): Promise<ReelInfo[]> {
    try {
      const reels = await this.scrapeViaProfileJSON(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    try {
      const reels = await this.scrapeViaHTML(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    try {
      const reels = await this.scrapeViaWebAPI(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    return [];
  }

  private async scrapeViaProfileJSON(username: string): Promise<ReelInfo[]> {
    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const html = await this.fetchTextWithHeaders(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Sec-Fetch-Mode': 'navigate',
    });

    const data = JSON.parse(html);
    const user = data?.graphql?.user || data?.data?.user;
    if (!user) return [];

    const edges = user?.edge_owner_to_timeline_media?.edges || [];
    return edges
      .filter((e: any) => e.node?.is_video === true)
      .map((e: any) => this.mapScrapedNode(e.node, username));
  }

  private async scrapeViaHTML(username: string): Promise<ReelInfo[]> {
    const url = `https://www.instagram.com/${username}/`;
    const html = await this.fetchTextWithHeaders(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    });

    const sharedMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]+?\});<\/script>/);
    if (sharedMatch) {
      try {
        const shared = JSON.parse(sharedMatch[1]);
        const user = shared?.entry_data?.ProfilePage?.[0]?.graphql?.user;
        if (user) {
          const edges = user?.edge_owner_to_timeline_media?.edges || [];
          return edges
            .filter((e: any) => e.node?.is_video === true)
            .map((e: any) => this.mapScrapedNode(e.node, username));
        }
      } catch { /* parse error, fall through */ }
    }

    const additionalMatch = html.match(/window\.__additionalDataLoaded\s*\(\s*['"][^'"]+['"]\s*,\s*(\{[\s\S]+?\})\s*\)/);
    if (additionalMatch) {
      try {
        const data = JSON.parse(additionalMatch[1]);
        const user = data?.graphql?.user || data?.data?.user;
        if (user) {
          const edges = user?.edge_owner_to_timeline_media?.edges || [];
          return edges
            .filter((e: any) => e.node?.is_video === true)
            .map((e: any) => this.mapScrapedNode(e.node, username));
        }
      } catch { /* parse error, fall through */ }
    }

    const preloadRe = /"xdt_api__v1__[^"]*":\s*(\{[^}]+\})/g;
    let preloadMatch: RegExpExecArray | null;
    while ((preloadMatch = preloadRe.exec(html)) !== null) {
      try {
        const payload = JSON.parse(preloadMatch[1]);
        if (payload?.items) {
          return payload.items
            .filter((it: any) => it.media_type === 2)
            .map((it: any) => this.mapScrapedItem(it, username));
        }
      } catch { continue; }
    }

    return [];
  }

  private async scrapeViaWebAPI(username: string): Promise<ReelInfo[]> {
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;
    const text = await this.fetchTextWithHeaders(url, {
      'User-Agent': 'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 458229258)',
      'X-IG-App-ID': '936619743392459',
      'Accept': '*/*',
    });

    const data = JSON.parse(text);
    const user = data?.data?.user;
    if (!user) return [];

    const edges = user?.edge_owner_to_timeline_media?.edges || [];
    return edges
      .filter((e: any) => e.node?.is_video === true)
      .map((e: any) => this.mapScrapedNode(e.node, username));
  }

  private mapScrapedNode(node: any, username: string): ReelInfo {
    const caption = node?.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    const firstLine = caption.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 80) || 'Instagram Reel';
    const shortcode = node?.shortcode || '';
    return {
      reelId: node?.id || shortcode,
      caption: firstLine,
      thumbnail: node?.thumbnail_src || node?.display_url || '',
      permalink: shortcode ? `https://www.instagram.com/reel/${shortcode}/` : `https://www.instagram.com/${username}/`,
      publishedAt: node?.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : new Date().toISOString(),
      likeCount: node?.edge_liked_by?.count || node?.edge_media_preview_like?.count || 0,
      commentCount: node?.edge_media_to_comment?.count || node?.edge_media_preview_comment?.count || 0,
      viewCount: node?.video_view_count || 0,
      videoUrl: node?.video_url || '',
    };
  }

  private mapScrapedItem(item: any, username: string): ReelInfo {
    const caption = item?.caption?.text || '';
    const firstLine = caption.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 80) || 'Instagram Reel';
    const code = item?.code || '';
    return {
      reelId: item?.pk?.toString() || item?.id || code,
      caption: firstLine,
      thumbnail: item?.image_versions2?.candidates?.[0]?.url || '',
      permalink: code ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/${username}/`,
      publishedAt: item?.taken_at ? new Date(item.taken_at * 1000).toISOString() : new Date().toISOString(),
      likeCount: item?.like_count || 0,
      commentCount: item?.comment_count || 0,
      viewCount: item?.play_count || item?.video_view_count || 0,
      videoUrl: item?.video_versions?.[0]?.url || '',
    };
  }

  // ─── TOKEN REFRESH (Phase 2) ─────────────────────────────────

  private async refreshToken(): Promise<void> {
    if (!this.accessToken) return;

    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`;
      const data = await this.fetchJSON(url);
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 60 * 24 * 60 * 60 * 1000);
        console.log('[InstagramService] Token refreshed via IG endpoint, expires:', new Date(this.tokenExpiresAt).toISOString());
        return;
      }
    } catch { /* fall through to FB method */ }

    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    if (appId && appSecret) {
      try {
        const url = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${this.accessToken}`;
        const data = await this.fetchJSON(url);
        if (data.access_token) {
          this.accessToken = data.access_token;
          this.tokenExpiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 60 * 24 * 60 * 60 * 1000);
          console.log('[InstagramService] Token refreshed via FB endpoint, expires:', new Date(this.tokenExpiresAt).toISOString());
          return;
        }
      } catch (err: any) {
        console.error('[InstagramService] FB token refresh failed:', err.message);
      }
    }

    console.warn('[InstagramService] Token refresh failed — will try scraping fallback');
  }

  // ─── HTTP UTILITIES ──────────────────────────────────────────

  private fetchText(url: string): Promise<string> {
    return this.fetchTextWithHeaders(url, {});
  }

  private fetchTextWithHeaders(url: string, headers: Record<string, string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https') ? https : http;
      const req = lib.get(url, { headers }, (r) => {
        if (r.statusCode && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
          this.fetchTextWithHeaders(r.headers.location, headers).then(resolve).catch(reject);
          return;
        }
        if (r.statusCode && r.statusCode >= 400) {
          let body = '';
          r.on('data', (c) => (body += c));
          r.on('end', () => reject(new Error(`HTTP ${r.statusCode}: ${body.slice(0, 200)}`)));
          return;
        }
        let data = '';
        r.on('data', (c) => (data += c));
        r.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(12_000, () => {
        req.destroy(new Error('request-timeout'));
      });
    });
  }

  private async fetchJSON(url: string): Promise<any> {
    const text = await this.fetchText(url);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON from Instagram API');
    }
  }
}

export const instagramService = new InstagramService();
