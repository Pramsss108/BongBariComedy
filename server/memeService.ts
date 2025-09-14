import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { trendsService } from './trendsService';
import { chatbotService } from './chatbotService';

export type MemeStatus = 'draft' | 'edited' | 'approved' | 'published';

export interface MemeIdea {
  id: string;
  dateKey: string; // YYYY-MM-DD
  idea: string; // short concept/caption
  topics: string[];
  language: 'bn' | 'en' | 'auto';
  status: MemeStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  publishedAt?: string; // ISO
}

class MemeService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(import.meta.dirname, 'data', 'memes');
    try { fs.mkdirSync(this.baseDir, { recursive: true }); } catch {}
  }

  private todayKey(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private fileForDate(dateKey: string): string {
    return path.join(this.baseDir, `${dateKey}.json`);
  }

  private readDay(dateKey: string): MemeIdea[] {
    const file = this.fileForDate(dateKey);
    try {
      const s = fs.readFileSync(file, 'utf-8');
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr as MemeIdea[];
    } catch {}
    return [];
  }

  private writeDay(dateKey: string, items: MemeIdea[]) {
    const file = this.fileForDate(dateKey);
    try { fs.writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8'); } catch {}
  }

  getToday(status?: MemeStatus): MemeIdea[] {
    const dateKey = this.todayKey();
    const items = this.readDay(dateKey);
    return status ? items.filter(i => i.status === status) : items;
  }

  getByDate(dateKey: string, status?: MemeStatus): MemeIdea[] {
    const items = this.readDay(dateKey);
    return status ? items.filter(i => i.status === status) : items;
  }

  private buildPrompt(topics: string[], language: 'bn' | 'en' | 'auto', count: number): string {
    const langHint = language === 'auto'
      ? 'Prefer Bengali (Bangla script) if topics include Bangla; otherwise use natural Benglish. Never mix scripts in one line.'
      : language === 'bn'
      ? 'Respond in Bengali (Bangla script) only.'
      : 'Respond in English only.';
    const topicLines = topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
    return `You are Bong Bot, Bengali family-friendly comedian. Create ${count} short meme ideas.
Rules:
- Family-safe humor, no vulgarity. Never joke about death/accidents/tragedies.
- Keep each idea in 1 line (max 110 chars). No hashtags.
- Tone: witty Bengali cultural vibe (maa-chele, para, cha-fuchka). Not cringe.
- Format: return exactly ${count} lines, each a standalone meme idea/caption. No numbering.
- ${langHint}
Topics to inspire (safe):\n${topicLines}`;
  }

  async generateForToday(count = 5, language: 'bn' | 'en' | 'auto' = 'auto'): Promise<MemeIdea[]> {
    const dateKey = this.todayKey();
    const existing = this.readDay(dateKey);
    const now = new Date().toISOString();
    // Build safe topic list from trends
    const top = trendsService.getTop(10).filter(t => !t.isSomber);
    const topics = top.map(t => (t.title || '').replace(/[|:\u2013\u2014-].*$/, ''));
    const prompt = this.buildPrompt(topics.slice(0, 8), language, count);

    let ideas: string[] = [];
    try {
      const text = await chatbotService.generateFreeform(prompt, { temperature: 0.8, maxOutputTokens: 220 });
      if (text) {
        ideas = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      }
    } catch {}

    if (!ideas.length) {
      // Local fallback: derive from topics
      const base = topics.slice(0, Math.max(3, Math.min(6, topics.length)));
      const tmpl = [
        (t: string) => `Ajker buzz: ${t} — halka roast, boro hasi.`,
        (t: string) => `${t}? Maa bolbe: cha kha, tension no.`,
        (t: string) => `Para news: ${t} — punchline ready.`,
        (t: string) => `${t} niye khub serious? Amra to hasi.`,
        (t: string) => `Daily adda topic: ${t} — ekta choto mazaak.`,
      ];
      ideas = base.slice(0, count).map((t, i) => tmpl[i % tmpl.length](t));
    }

    const unique = new Set(existing.map(i => i.idea.trim()));
    const newOnes: MemeIdea[] = [];
    for (const idea of ideas) {
      const trimmed = idea.replace(/^[-*\d.\)\s]+/, '').trim();
      if (!trimmed || unique.has(trimmed)) continue;
      unique.add(trimmed);
      newOnes.push({
        id: randomUUID(),
        dateKey,
        idea: trimmed,
        topics: topics.slice(0, 6),
        language,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
      if (newOnes.length >= count) break;
    }

    const merged = [...existing, ...newOnes];
    this.writeDay(dateKey, merged);
    return newOnes;
  }

  update(id: string, patch: Partial<Pick<MemeIdea, 'idea' | 'status' | 'language'>>): MemeIdea | null {
    // Search across all day files (small set)
    const files = this.safeReaddir();
    for (const f of files) {
      const dateKey = path.basename(f, '.json');
      const arr = this.readDay(dateKey);
      const idx = arr.findIndex(m => m.id === id);
      if (idx >= 0) {
        const now = new Date().toISOString();
        const prev = arr[idx];
        const updated: MemeIdea = {
          ...prev,
          ...patch,
          updatedAt: now,
        };
        arr[idx] = updated;
        this.writeDay(dateKey, arr);
        return updated;
      }
    }
    return null;
  }

  publish(id: string): MemeIdea | null {
    const files = this.safeReaddir();
    for (const f of files) {
      const dateKey = path.basename(f, '.json');
      const arr = this.readDay(dateKey);
      const idx = arr.findIndex(m => m.id === id);
      if (idx >= 0) {
        const now = new Date().toISOString();
        const prev = arr[idx];
        const updated: MemeIdea = {
          ...prev,
          status: 'published',
          publishedAt: now,
          updatedAt: now,
        };
        arr[idx] = updated;
        this.writeDay(dateKey, arr);
        return updated;
      }
    }
    return null;
  }

  getPublic(limit = 20): MemeIdea[] {
    const files = this.safeReaddir();
    const all: MemeIdea[] = [];
    for (const f of files) {
      const dateKey = path.basename(f, '.json');
      const arr = this.readDay(dateKey);
      for (const m of arr) if (m.status === 'published') all.push(m);
    }
    all.sort((a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime());
    return all.slice(0, limit);
  }

  private safeReaddir(): string[] {
    try { return fs.readdirSync(this.baseDir).filter(f => f.endsWith('.json')).map(f => path.join(this.baseDir, f)); } catch { return []; }
  }
}

export const memeService = new MemeService();
