import https from 'https';
import { parseStringPromise } from 'xml2js';

export type TrendItem = {
  title: string;
  link?: string;
  publishedAt?: string;
  category?: string;
  language: 'bn' | 'en';
  isSomber: boolean; // true if death/tragedy etc.
};

class TrendsService {
  private cache: { items: TrendItem[]; updatedAt: number } = { items: [], updatedAt: 0 };
  private running = false;
  private readonly intervalMs = 15 * 60 * 1000; // 15 minutes
  private intervalRef: NodeJS.Timeout | null = null;

  start() {
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

  // Basic status for health/ready endpoints
  getInfo() {
    return {
      items: this.cache.items.length,
      updatedAt: this.cache.updatedAt || null,
      running: this.running,
    } as const;
  }

  getTop(count = 8): TrendItem[] {
    return this.cache.items.slice(0, count);
  }

  async forceRefresh() {
    await this.refresh();
  }

  private async refresh() {
    const sources = [
      { url: 'https://news.google.com/rss?hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Top (BN)' },
      { url: 'https://news.google.com/rss/search?q=বিনোদন&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Entertainment (BN)' },
      { url: 'https://news.google.com/rss/search?q=কমেডি|হাসি|রসিকতা&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Comedy (BN)' },
      { url: 'https://news.google.com/rss/search?q=কলকাতা|কোলকাতা&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Kolkata (BN)' },
      // Safe Bangla sources via Google News site filters
      { url: 'https://news.google.com/rss/search?q=site:anandabazar.com&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Anandabazar (BN)' },
      { url: 'https://news.google.com/rss/search?q=site:bengali.abplive.com&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'ABP Ananda (BN)' },
      { url: 'https://news.google.com/rss/search?q=site:anandabazar.com+বিনোদন|কমেডি|হাসি&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'Anandabazar Entertainment (BN)' },
      { url: 'https://news.google.com/rss/search?q=site:bengali.abplive.com+বিনোদন|কমেডি|হাসি&hl=bn&gl=IN&ceid=IN:bn', language: 'bn' as const, category: 'ABP Ananda Entertainment (BN)' },
      { url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en', language: 'en' as const, category: 'Top (IN)' },
      { url: 'https://news.google.com/rss/search?q=india+comedy+viral&hl=en-IN&gl=IN&ceid=IN:en', language: 'en' as const, category: 'Comedy Viral (IN)' },
      { url: 'https://news.google.com/rss/search?q=Kolkata&hl=en-IN&gl=IN&ceid=IN:en', language: 'en' as const, category: 'Kolkata (IN)' },
    ];

    // Fetch sequentially (one source at a time) for safety
    const merged: TrendItem[] = [];
    for (const s of sources) {
      try {
        const arr = await this.fetchRSS(s.url);
        for (const it of arr.map(i => ({ ...i, category: s.category, language: s.language }))) {
          if (!merged.some(m => this.normalize(m.title) === this.normalize(it.title))) {
            const isSomber = this.isSomber(it.title);
            merged.push({ ...it, isSomber });
          }
        }
      } catch {
        // skip this source on error
      }
    }

    // Prefer BN first, then EN; keep most recent-ish at top (Google RSS includes pubDate)
    merged.sort((a, b) => {
      // BN first
      if (a.language !== b.language) return a.language === 'bn' ? -1 : 1;
      // Prefer titles that contain comedy terms
      const aw = this.weight(a.title), bw = this.weight(b.title);
      if (aw !== bw) return bw - aw;
      // Fallback: by recency if available
      const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bd - ad;
    });

    this.cache = { items: merged.slice(0, 30), updatedAt: Date.now() };
  }

  private async fetchRSS(url: string): Promise<Omit<TrendItem, 'language' | 'isSomber'>[]> {
    const xml = await this.fetchText(url);
    const json = await parseStringPromise(xml);
    const items = json.rss?.channel?.[0]?.item || [];
    return items.map((it: any) => ({
      title: (it.title?.[0] || '').toString(),
      link: it.link?.[0],
      publishedAt: it.pubDate?.[0],
      category: undefined,
    }));
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
      req.setTimeout(7000, () => req.destroy(new Error('request-timeout')));
    });
  }

  private normalize(s: string) {
    return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private isSomber(title: string): boolean {
    const t = title.toLowerCase();
    const bad = [
      'death', 'dies', 'passed away', 'rip', 'dead', 'mrittu', 'মৃত্যু', 'নিহত', 'হত্যা', 'accident', 'tragedy', 'earthquake', 'attack', 'blast', 'violence'
    ];
    return bad.some(k => t.includes(k));
  }

  private weight(title: string): number {
    const t = title.toLowerCase();
    let w = 0;
    if (/[\u0980-\u09ff]/.test(title)) w += 2; // Bengali
    if (/(কমেডি|হাসি|রসিকতা|মিম|হাসালো|ঠাট্টা)/.test(title)) w += 3;
    if (/(comedy|meme|funny|joke|roast|parody|satire|viral)/.test(t)) w += 2;
    if (/(trailer|song|skit|shorts)/.test(t)) w += 1;
    return w;
  }
}

export const trendsService = new TrendsService();
