import https from 'https';

export type ReelInfo = {
  reelId: string;
  caption: string;
  thumbnail: string;
  permalink: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
};

class InstagramService {
  private latest: ReelInfo[] = [];
  private popular: ReelInfo[] = [];
  private lastUpdate = 0;
  private running = false;
  private userId: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0; // Unix ms when current token expires
  private readonly intervalMs = 2 * 60 * 1000; // 2 minutes (same as YouTube service)
  private readonly tokenRefreshDays = 50; // Refresh 10 days before 60-day expiry
  private intervalRef: NodeJS.Timeout | null = null;

  start(userId: string, accessToken: string) {
    this.userId = userId;
    this.accessToken = accessToken;
    // Assume token was just set — expires in 60 days from now
    if (!this.tokenExpiresAt) {
      this.tokenExpiresAt = Date.now() + 60 * 24 * 60 * 60 * 1000;
    }
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
    if (!this.userId || !this.accessToken) return;

    // Throttle to avoid overlapping (at most once per 30s)
    const now = Date.now();
    if (now - this.lastUpdate < 30_000) return;
    this.lastUpdate = now;

    // Auto-refresh token if within 10 days of expiry
    if (this.tokenExpiresAt && now > this.tokenExpiresAt - (10 * 24 * 60 * 60 * 1000)) {
      await this.refreshToken().catch((err) => {
        console.error('[InstagramService] Token refresh failed:', err.message);
      });
    }

    try {
      const allMedia = await this.fetchMedia();
      // Filter to VIDEO type only (reels)
      const reels = allMedia.filter((m: any) => m.media_type === 'VIDEO');

      // Latest: sorted by timestamp (API returns newest first by default)
      this.latest = reels.slice(0, 12).map(this.mapToReelInfo);

      // Popular: sorted by engagement score (likes + comments*3)
      const sorted = [...reels]
        .map(this.mapToReelInfo)
        .sort((a, b) => {
          const scoreA = (a.likeCount || 0) + (a.commentCount || 0) * 3;
          const scoreB = (b.likeCount || 0) + (b.commentCount || 0) * 3;
          return scoreB - scoreA;
        });
      this.popular = sorted.slice(0, 12);
    } catch (err: any) {
      console.error('[InstagramService] Refresh failed:', err.message);
    }
  }

  private async fetchMedia(): Promise<any[]> {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const url = `https://graph.instagram.com/${this.userId}/media?fields=${fields}&limit=50&access_token=${this.accessToken}`;
    const data = await this.fetchJSON(url);
    return data.data || [];
  }

  private mapToReelInfo = (item: any): ReelInfo => {
    const caption = item.caption || '';
    // Use first line of caption as title, max 80 chars
    const firstLine = caption.split('\n')[0].replace(/#\S+/g, '').trim().slice(0, 80) || 'Instagram Reel';
    return {
      reelId: item.id,
      caption: firstLine,
      thumbnail: item.thumbnail_url || item.media_url || '',
      permalink: item.permalink || `https://www.instagram.com/thebongbari/`,
      publishedAt: item.timestamp || new Date().toISOString(),
      likeCount: item.like_count || 0,
      commentCount: item.comments_count || 0,
    };
  };

  private async refreshToken(): Promise<void> {
    if (!this.accessToken) return;

    // Try Instagram Login token refresh first
    try {
      const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${this.accessToken}`;
      const data = await this.fetchJSON(url);
      if (data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 60 * 24 * 60 * 60 * 1000);
        console.log('[InstagramService] Token refreshed via IG endpoint, expires:', new Date(this.tokenExpiresAt).toISOString());
        return;
      }
    } catch {
      // Fall through to Facebook Login method
    }

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

    console.warn('[InstagramService] Token refresh failed — manual re-auth may be needed');
  }

  private fetchText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (r) => {
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
      req.setTimeout(10_000, () => {
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
