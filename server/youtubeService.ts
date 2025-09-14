import https from 'https';
import { parseStringPromise } from 'xml2js';

export type VideoInfo = {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount?: number;
};

class YouTubeService {
  private latest: VideoInfo[] = [];
  private popular: VideoInfo[] = [];
  private lastUpdate = 0;
  private running = false;
  private channelId: string | null = null;
  private readonly intervalMs = 2 * 60 * 1000; // 2 minutes
  private intervalRef: NodeJS.Timeout | null = null;

  start(channelId: string) {
    this.channelId = channelId;
    if (this.running) return;
    this.running = true;
    // Kick off immediately, then on interval
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
      channelId: this.channelId,
    } as const;
  }

  getLatest(count = 3): VideoInfo[] {
    return this.latest.slice(0, count);
  }

  getPopular(count = 3): VideoInfo[] {
    return this.popular.slice(0, count);
  }

  async forceRefresh() {
    await this.refresh();
  }

  private async refresh() {
    if (!this.channelId) return;
    // Throttle to avoid overlapping
    const now = Date.now();
    if (now - this.lastUpdate < 30_000) return; // at most once per 30s
    this.lastUpdate = now;

    const apiKey = process.env.YOUTUBE_API_KEY;
    let latestAll: VideoInfo[] = [];

    if (apiKey) {
      try {
        latestAll = await this.fetchLatestFromAPI(this.channelId, apiKey);
      } catch {
        latestAll = await this.fetchLatestFromRSS(this.channelId);
      }
    } else {
      latestAll = await this.fetchLatestFromRSS(this.channelId);
    }
    this.latest = latestAll.slice(0, 6);

    // Popular: prefer API if available, else estimate by scraping
    if (apiKey) {
      try {
        this.popular = await this.fetchPopularFromAPI(this.channelId, apiKey, 6);
      } catch {
        this.popular = await this.estimatePopularFromRecent(latestAll);
      }
    } else {
      this.popular = await this.estimatePopularFromRecent(latestAll);
    }
  }

  private async fetchLatestFromAPI(channelId: string, apiKey: string): Promise<VideoInfo[]> {
    // 1) Get uploads playlist id
    const ch = await this.fetchJSON(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return [];
    // 2) Get recent playlist items
    const pl = await this.fetchJSON(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploads}&maxResults=6&key=${apiKey}`);
    const items = pl.items || [];
    return items.map((it: any) => {
      const vid = it.contentDetails?.videoId;
      const sn = it.snippet;
      return {
        videoId: vid,
        title: sn?.title,
        thumbnail: sn?.thumbnails?.high?.url || sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
        publishedAt: sn?.publishedAt,
      } as VideoInfo;
    });
  }

  private async fetchPopularFromAPI(channelId: string, apiKey: string, take: number): Promise<VideoInfo[]> {
    // 1) Search by viewCount
    const search = await this.fetchJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=viewCount&type=video&key=${apiKey}`);
    const ids = (search.items || []).map((it: any) => it.id?.videoId).filter(Boolean);
    if (!ids.length) return [];
    // 2) Get stats
    const stats = await this.fetchJSON(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(',')}&key=${apiKey}`);
    const items = stats.items || [];
    return items
      .map((it: any) => ({
        videoId: it.id,
        title: it.snippet?.title,
        thumbnail: it.snippet?.thumbnails?.high?.url || it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${it.id}/hqdefault.jpg`,
        publishedAt: it.snippet?.publishedAt,
        viewCount: parseInt(it.statistics?.viewCount || '0', 10),
      }) as VideoInfo)
      .sort((a: VideoInfo, b: VideoInfo) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, take);
  }

  private async estimatePopularFromRecent(latestAll: VideoInfo[]): Promise<VideoInfo[]> {
    const candidates = latestAll.slice(0, 12);
    const withViews = await this.withLimitedConcurrency(candidates.map(v => async () => {
      const viewCount = await this.fetchViewCount(v.videoId).catch(() => 0);
      return { ...v, viewCount } as VideoInfo;
    }), 3);
    return withViews
      .filter(v => typeof v.viewCount === 'number')
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 6);
  }

  private async fetchLatestFromRSS(channelId: string): Promise<VideoInfo[]> {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const xml = await this.fetchText(url);
    const json = await parseStringPromise(xml);
    const entries = json.feed?.entry || [];
    return entries.map((e: any) => {
      const videoId = e['yt:videoId']?.[0];
      const title = e.title?.[0];
      const publishedAt = e.published?.[0];
      return {
        videoId,
        title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt,
      } as VideoInfo;
    });
  }

  private async fetchViewCount(videoId: string): Promise<number> {
    const html = await this.fetchText(`https://www.youtube.com/watch?v=${videoId}`);
    // Try to find a numeric view count in the initial JSON
    // 1) "viewCount":{"simpleText":"1,234 views"}
    const m1 = html.match(/\"viewCount\"\s*:\s*\{[^}]*\"simpleText\"\s*:\s*\"([^\"]+)\"/);
    if (m1) {
      const n = this.parseCount(m1[1]);
      if (!isNaN(n)) return n;
    }
    // 2) "shortViewCountText":{"simpleText":"1.2M views"}
    const m2 = html.match(/\"shortViewCountText\"\s*:\s*\{[^}]*\"simpleText\"\s*:\s*\"([^\"]+)\"/);
    if (m2) {
      const n = this.parseCount(m2[1]);
      if (!isNaN(n)) return n;
    }
    return 0;
  }

  private parseCount(text: string): number {
    // Examples: "1,234 views", "1.2M views", "987K"
    const clean = text.replace(/views?/i, '').trim();
    const m = clean.match(/([0-9.,]+)\s*([kKmMbB]?)/);
    if (!m) return parseInt(clean.replace(/[^0-9]/g, ''), 10) || 0;
    const num = parseFloat(m[1].replace(/,/g, ''));
    const suffix = (m[2] || '').toLowerCase();
    const mult = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
    return Math.round(num * mult);
  }

  private fetchText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, (r) => {
        if (r.statusCode && r.statusCode >= 400) {
          reject(new Error(`HTTP ${r.statusCode} for ${url}`));
          return;
        }
        let data = '';
        r.on('data', (c) => (data += c));
        r.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(8000, () => {
        req.destroy(new Error('request-timeout'));
      });
    });
  }

  private async fetchJSON(url: string): Promise<any> {
    const text = await this.fetchText(url);
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON from ' + url);
    }
  }

  private async withLimitedConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    let i = 0;
    const runners = new Array(Math.min(limit, tasks.length)).fill(null).map(async () => {
      while (i < tasks.length) {
        const idx = i++;
        try {
          const res = await tasks[idx]();
          results[idx] = res;
        } catch (e) {
          results[idx] = undefined as unknown as T;
        }
      }
    });
    await Promise.all(runners);
    return results;
  }
}

export const youtubeService = new YouTubeService();
