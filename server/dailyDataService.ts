import fs from 'fs';
import path from 'path';

export interface TrendItem {
  title: string;
  link?: string;
  language?: string;
  isSomber?: boolean;
}

class DailyDataService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(import.meta.dirname, 'data', 'daily');
    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
    } catch {}
  // Purge old files on startup
  this.purgeOld();
  }

  private todayFile(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return path.join(this.baseDir, `${yyyy}-${mm}-${dd}.json`);
  }

  mergeToday(items: TrendItem[]): void {
    const file = this.todayFile();
  this.purgeOld();
    let existing: TrendItem[] = [];
    try {
      existing = JSON.parse(fs.readFileSync(file, 'utf-8')) as TrendItem[];
    } catch {}

    const map = new Map<string, TrendItem>();
    for (const it of [...existing, ...items]) {
      const key = (it.title || '').trim();
      if (key) map.set(key, it);
    }
    const arr = Array.from(map.values());
    try {
      fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf-8');
    } catch {}
  }

  getTodaySamples(n = 5): TrendItem[] {
    const file = this.todayFile();
    let arr: TrendItem[] = [];
    try {
      arr = JSON.parse(fs.readFileSync(file, 'utf-8')) as TrendItem[];
    } catch {}
    if (!arr.length) return [];
    // random sample
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(1, Math.min(n, shuffled.length)));
  }

  private purgeOld() {
    try {
      const today = path.basename(this.todayFile());
      for (const f of fs.readdirSync(this.baseDir)) {
        if (f.endsWith('.json') && f !== today) {
          try { fs.unlinkSync(path.join(this.baseDir, f)); } catch {}
        }
      }
    } catch {}
  }
}

export const dailyDataService = new DailyDataService();
