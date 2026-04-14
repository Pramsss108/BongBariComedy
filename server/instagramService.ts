import https from 'https';
import http from 'http';

export type ReelInfo = {
  reelId: string;
  caption: string;
  thumbnail: string;
  permalink: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
};

type DataSource = 'graph-api' | 'public-scrape' | 'none';

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

  /**
   * Start with Graph API token (primary — permanent, official)
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
   * Start with just a username (fallback — public scraping, red team)
   * Works without any API token for public accounts
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

    // Auto-refresh token if within 10 days of expiry
    if (this.accessToken && this.tokenExpiresAt && now > this.tokenExpiresAt - (10 * 24 * 60 * 60 * 1000)) {
      await this.refreshToken().catch((err) => {
        console.error('[InstagramService] Token refresh failed:', err.message);
      });
    }

    let allReels: ReelInfo[] = [];

    // Priority 1: Graph API (permanent, official)
    if (this.userId && this.accessToken) {
      try {
        const media = await this.fetchMediaFromGraphAPI();
        allReels = media.filter((m: any) => m.media_type === 'VIDEO').map(this.mapGraphAPIToReel);
        this.dataSource = 'graph-api';
        console.log(`[InstagramService] Fetched ${allReels.length} reels via Graph API`);
      } catch (err: any) {
        console.error('[InstagramService] Graph API failed:', err.message);
        // Fall through to scraping
      }
    }

    // Priority 2: Public profile scraping (red team fallback)
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

    // Latest: by timestamp descending (newest first)
    this.latest = [...allReels]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 12);

    // Popular: by engagement score descending (most viral first)
    this.popular = [...allReels]
      .sort((a, b) => {
        const scoreA = (a.likeCount || 0) + (a.commentCount || 0) * 3;
        const scoreB = (b.likeCount || 0) + (b.commentCount || 0) * 3;
        return scoreB - scoreA;
      })
      .slice(0, 12);
  }

  // ─── GRAPH API (Primary) ────────────────────────────────────

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
    };
  };

  // ─── PUBLIC SCRAPING (Red Team Fallback) ─────────────────────

  private async scrapePublicProfile(username: string): Promise<ReelInfo[]> {
    // Strategy 1: Try the __a=1 JSON endpoint
    try {
      const reels = await this.scrapeViaProfileJSON(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    // Strategy 2: Try HTML scraping with SharedData extraction
    try {
      const reels = await this.scrapeViaHTML(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    // Strategy 3: Try the web API endpoint
    try {
      const reels = await this.scrapeViaWebAPI(username);
      if (reels.length > 0) return reels;
    } catch { /* fall through */ }

    return [];
  }

  /**
   * Strategy 1: Fetch profile JSON via /?__a=1&__d=dis
   * Works for public profiles, returns _sharedData with recent media
   */
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

  /**
   * Strategy 2: Parse HTML page for window._sharedData or similar embedded JSON
   */
  private async scrapeViaHTML(username: string): Promise<ReelInfo[]> {
    const url = `https://www.instagram.com/${username}/`;
    const html = await this.fetchTextWithHeaders(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    });

    // Try to find _sharedData JSON blob
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

    // Try to find __additionalData or similar JSON blobs
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

    // Try finding xdt_api__v1 or similar modern IG payloads in preloaded data
    const preloadRe = /"xdt_api__v1__[^"]*":\s*(\{[^}]+\})/g;
    let preloadMatch: RegExpExecArray | null;
    while ((preloadMatch = preloadRe.exec(html)) !== null) {
      try {
        const payload = JSON.parse(preloadMatch[1]);
        if (payload?.items) {
          return payload.items
            .filter((it: any) => it.media_type === 2) // 2 = video
            .map((it: any) => this.mapScrapedItem(it, username));
        }
      } catch { continue; }
    }

    return [];
  }

  /**
   * Strategy 3: Try the web API endpoint used by instagram.com's frontend
   */
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

  /**
   * Map a scraped GraphQL node to ReelInfo
   */
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
    };
  }

  /**
   * Map a v1 API item to ReelInfo
   */
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
    };
  }

  // ─── TOKEN REFRESH ───────────────────────────────────────────

  private async refreshToken(): Promise<void> {
    if (!this.accessToken) return;

    // Try Instagram Login token refresh
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

    // Try Facebook Login token exchange
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
        // Follow redirects (301, 302, 307, 308)
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
