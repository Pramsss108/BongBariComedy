import dotenv from 'dotenv';
import path from 'path';
// Ensure env is loaded even if this module is imported before server/index
try {
  const envPath = path.resolve(import.meta.dirname, '.env');
  const r = dotenv.config({ path: envPath });
  if (r.error) {
    dotenv.config();
  }
} catch (_) { }
import { storage } from "./storage";
import { type ChatbotTraining, type ChatbotTemplate } from "@shared/schema";
import { trendsService } from "./trendsService";

// Grok API Endpoint
const GROK_ENDPOINT = "https://ghost-worker.guitarguitarabhijit.workers.dev/ai/chat";

// Custom training data about Bong Bari
const BONG_BARI_CONTEXT = `
You are the official AI assistant for Bong Bari (বং বাড়ি), a Bengali comedy platform that creates authentic family comedy content.

ABOUT BONG BARI:
- Bengali comedy platform focusing on family-friendly content
- Specializes in mother-son (maa-chele) dynamics that every Bengali family relates to
- Creates authentic, relatable comedy that feels real, not acted
- Perfect partner for brands wanting to reach Bengali homes
- Content available on YouTube @bongbari and Instagram @thebongbari

KEY FEATURES:
- Authentic Bengali family comedy
- Universal maa-chele relationships everyone connects with
- Real household moments turned into comedy gold
- Professional collaboration opportunities for brands and creators

COLLABORATION SERVICES:
- Brand partnerships and sponsored content
- Custom comedy content creation
- Social media campaigns
- Comedy writing and scripting
- Video production services

CONTACT INFO:
- YouTube: https://youtube.com/@bongbari
- Instagram: https://instagram.com/thebongbari
- Website collaboration form available

CRITICAL LANGUAGE RULES:
- If user writes in Bengali (বাংলা script), ALWAYS respond in Bengali script only
- If user writes in Benglish (Bengali words in English script), ALWAYS respond in Benglish only
- If user writes in English, ALWAYS respond in English only
- NEVER mix languages in your response - match the user's language exactly
- Analyze each message to detect language before responding

PERSONALITY:
- Friendly, warm, and humorous like a Bengali family member
- Knowledgeable about Bengali culture and family dynamics
- Helpful for both viewers and potential collaborators
- Professional but approachable for business inquiries
`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatbotService {
  private lastCtaTs = 0;
  private lastAiCheckTs = 0;
  private lastAiOk: boolean | null = null;
  private lastAiSource: 'grok' | 'none' = 'none';
  private trainingCache: { text: string; ts: number } = { text: '', ts: 0 };

  // Friendly greeting generator for simple hellos
  private makeHelloReply(userMessage: string): string {
    const hasBengaliScript = /[\u0980-\u09ff]/.test(userMessage);
    const items = trendsService.getTop(6).filter(t => !t.isSomber);
    const topic = items[0]?.title || '';
    const topicShort = topic ? topic.replace(/[|:–—-].*$/, '').split(/\s+/).slice(0, 3).join(' ') : 'ajker gossip';
    if (hasBengaliScript) {
      const opts = [
        `নমস্কার! কেমন আছেন? আজ কী নিয়ে হাসির আড্ডা—${topicShort} নাকি চা-ফুচকা?`,
        `হাই! আজ একটু মজা করি—${topicShort} না বাড়ির গল্প?`
      ];
      return opts[Math.floor(Math.random() * opts.length)];
    }
    const opts = [
      `Hi! Kemon acho? Ajke ki niye hashir adda—${topicShort} na pura para gossip?`,
      `Hey! Cha ready, punchline o—ki topic niye jabo, ${topicShort} na maa-chele rosh?`
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  // Public helper for modules that need short generation with Bong Bot style prompts
  public async generateFreeform(
    prompt: string,
    options?: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number }
  ): Promise<string | null> {
    return await this.generateText([{ role: 'user', content: prompt }], options);
  }

  // Public: get a local graceful fallback quickly
  public getFallback(userMessage: string): string {
    return this.makeFallbackReply(userMessage);
  }

  // Local, instant fallback: short Benglish, clean, 1–2 lines + optional CTA
  private makeFallbackReply(userMessage: string): string {
    // Direct greeting handling: keep it natural, no meta
    if (/\b(hi|hello|hey|yo)\b/i.test(userMessage) || /নমস্কার|হ্যালো|ওই|হাই/.test(userMessage)) {
      return this.makeHelloReply(userMessage);
    }
    const jokes: Array<[string, string]> = [
      ["Friend: Diet korchis?", "Me: Hasi‑te zero calories—cholu!"],
      ["WiFi slow?", "Hasi buffer kore na—instant play!"],
      ["Boss: Deadline kothay?", "Ami: Punchline ready, sir!"],
      ["Alarm bajlo?", "Hasi snooze hoyna—uto, হেসে nao!"],
      ["Rainy day?", "Muri, chaa, aar extra hasi!"],
    ];
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const [l1, l2] = pick(jokes);

    const base = `${l1}\n${l2}`;

    // Occasional CTA (not back‑to‑back, ~10%), never on joke intent
    let cta = '';
    const now = Date.now();
    const um = (userMessage || '').toLowerCase();
    const isJoke = /(joke|jokes|funny|haso|হাস|মজা|মিম|meme)/i.test(um);
    if (!isJoke && now - this.lastCtaTs > 60_000 && Math.random() < 0.10) {
      this.lastCtaTs = now;
      cta = "\nMon bhalo thakle subscribe kore nao.";
    }

    // Understand quick intents
    if (isJoke) {
      const trends = trendsService.getTop(8).filter(t => !t.isSomber);
      const topic = trends[0]?.title || '';
      let topicShort = topic ? topic.replace(/[|:–—-].*$/, '').split(/\s+/).slice(0, 3).join(' ') : '';
      if (!topicShort || /viral\s+funny\s+name/i.test(topicShort)) topicShort = 'Trending now';

      const hasBn = /[\u0980-\u09ff]/.test(userMessage);
      const hasEn = /[a-zA-Z]/.test(userMessage);
      const bengaliWords = ['ami', 'tumi', 'kemon', 'bhalo', 'hobe', 'korbo', 'chai', 'meme', 'roast', 'adda', 'haso', 'hasi'];
      const isBenglish = !hasBn && hasEn && bengaliWords.some(w => (userMessage || '').toLowerCase().includes(w));

      if (hasBn) {
        const l1 = `আজকের টপিক: ${topicShort}—হালকা মজা, ভারী হাসি।`;
        const l2 = `টেনশন কম, পাঞ্চলাইন অন—বাংলা স্টাইলে!`;
        return `${l1}\n${l2}`.trim();
      }
      if (isBenglish) {
        const l1 = `Ajker topic: ${topicShort} — halka roast, full hasi.`;
        const l2 = `Stress off, punchline on — Bangla style!`;
        return `${l1}\n${l2}`.trim();
      }
      const l1 = `Today’s pick: ${topicShort} — light roast, big laughs.`;
      const l2 = `Zero stress, punchline on — Bangla vibe.`;
      return `${l1}\n${l2}`.trim();
    }
    const engaging: string[] = [
      'Adda ta shuru—tumi bol, ami punchline dei.',
      'Cholo normal kotha thekei hasi tule ani.',
      'Ki topic niye jabo—meme, collab, na daily roast?'
    ];
    const nudges: string[] = [
      'Choto context dile aro tight hobe.',
      'Ek line hint dile khub jambe.',
      'Ekta clue dile punch korte pari.'
    ];
    const words = um.split(/\s+/).filter(Boolean);
    const echo = words.length > 0 && words.length <= 2 ? `${words.join(' ')}? — thik ache, ami spice debo.` : '';
    const firstLine = echo || pick(engaging);
    const maybeNudge = Math.random() < 0.25 ? `\n${pick(nudges)}` : '';
    return `${firstLine}${maybeNudge}${cta}`.trim();
  }

  // Grok implementation: Connects to the Cloudflare Worker endpoint
  private async generateText(
    messages: ChatMessage[],
    options?: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number }
  ): Promise<string | null> {
    const { timeoutMs = 8000 } = options || {};

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(GROK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`Grok API Error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const content = data?.content?.trim() || "";

      if (content) {
        this.lastAiSource = 'grok';
        return content;
      }
      return null;
    } catch (error) {
      console.error("Grok generation fail:", error);
      return null;
    }
  }

  // Health check for Grok Worker
  public async checkAIReady(): Promise<{ ok: boolean; aiKeyPresent: boolean; reason?: string }> {
    const now = Date.now();
    if (this.lastAiOk !== null && now - this.lastAiCheckTs < 60_000) {
      return { ok: this.lastAiOk, aiKeyPresent: true };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(GROK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const ok = resp.ok;
      this.lastAiOk = ok;
      this.lastAiCheckTs = now;
      return { ok, aiKeyPresent: true };
    } catch (e: any) {
      this.lastAiOk = false;
      this.lastAiCheckTs = now;
      return { ok: false, aiKeyPresent: true, reason: e?.message || 'error' };
    }
  }

  public getLastAiInfo(): { source: 'grok' | 'none'; model: string | null } {
    return { source: this.lastAiSource, model: 'grok-1' };
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    opts?: { allowFallback?: boolean }
  ): Promise<string> {
    try {
      if (/\b(hi|hello|hey|yo)\b/i.test(userMessage) || /নমস্কার|হ্যালো|ওই|হাই/.test(userMessage)) {
        try {
          let templates: ChatbotTemplate[] = [];
          if (typeof (storage as any).getChatbotTemplatesByType === 'function') {
            templates = await (storage as any).getChatbotTemplatesByType('greeting');
          } else {
            const all = await storage.getAllChatbotTemplates();
            templates = all.filter((t: any) => t.templateType === 'greeting');
          }
          const greet = (templates || []).sort((a: any, b: any) => (a.displayOrder ?? 1) - (b.displayOrder ?? 1))[0];
          if (greet?.content) return greet.content;
        } catch (_) { }
        return this.makeHelloReply(userMessage);
      }
      const trainedResponse = await this.getTrainedResponse(userMessage);
      if (trainedResponse) {
        return trainedResponse;
      }

      const hasBengaliScript = /[\u0980-\u09ff]/.test(userMessage);
      const hasEnglishWords = /[a-zA-Z]/.test(userMessage);

      let languageInstruction = "";
      if (hasBengaliScript && !hasEnglishWords) {
        languageInstruction = "RESPOND ONLY IN BENGALI SCRIPT. Do not use any English words.";
      } else if (hasEnglishWords && !hasBengaliScript) {
        const bengaliWords = ['ami', 'tumi', 'achi', 'kemon', 'bhalo', 'hobe', 'korbo', 'chai', 'khabo', 'jabo', 'asbo', 'dekho', 'bolo', 'shono', 'fuckka', 'cha', 'familir', 'ekjon'];
        const isBenglish = bengaliWords.some(word => userMessage.toLowerCase().includes(word));
        if (isBenglish) {
          languageInstruction = "RESPOND ONLY IN BENGLISH (Bengali words written in English script). Do not use Bengali script.";
        } else {
          languageInstruction = "RESPOND ONLY IN ENGLISH. Do not use Bengali words or script.";
        }
      } else {
        languageInstruction = "RESPOND IN THE SAME LANGUAGE MIX AS THE USER.";
      }

      const isJokeIntent = /(joke|jokes|funny|haso|হাস|মজা|মিম|meme)/i.test(userMessage);
      const isChattyUser = conversationHistory.filter(m => m.role === 'user').length >= 2
        || /(bol|bolo|detail|আরো|আরও|explain|kichu beshi|aro)/i.test(userMessage);
      const maxTokens = isJokeIntent ? 80 : isChattyUser ? 220 : 140;
      const temperature = isJokeIntent ? 0.85 : isChattyUser ? 0.7 : 0.65;

      const nowTs = Date.now();
      if (nowTs - this.trainingCache.ts > 60_000) {
        try {
          const settings = await (storage as any).getPublicSettings?.().catch(() => [])
            || await (storage as any).getAllAdminSettings?.().catch(() => []);
          const fromAll = Array.isArray(settings) ? settings : [];
          const setting = fromAll.find((s: any) => s.settingKey === 'chatbot_training_notepad');
          this.trainingCache = { text: (setting?.settingValue || '').toString(), ts: nowTs };
        } catch { this.trainingCache = { text: this.trainingCache.text, ts: nowTs }; }
      }

      const trainingBlock = this.trainingCache.text
        ? `\nPROJECT TRAINING NOTES (curated):\n${this.trainingCache.text}\n\n— End of notes —\n`
        : '';

      const systemMessage: ChatMessage = {
        role: 'system',
        content: `${BONG_BARI_CONTEXT}\n\nLANGUAGE INSTRUCTION: ${languageInstruction}\n\n${trainingBlock}\n\nSTRICT INSTRUCTIONS:\n1) Answer-first, playful, family-friendly tone.\n2) Natural Benglish or Bengali script (≤1 emoji).\n3) Quick asks ≤2 short lines; deep questions ≤4 lines (max 2 bullets).\n4) Business/collab? Include value-point and: Apply: /work-with-us#form\n5) Witty Bong quip; no politics/tragedy.\n6) Mention YouTube @bongbari or Insta @thebongbari if relevant.`
      };

      const grokMessages: ChatMessage[] = [
        systemMessage,
        ...conversationHistory.map(m => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content
        })),
        { role: 'user', content: userMessage }
      ];

      const allowFallback = opts?.allowFallback !== false;
      const text = await this.generateText(grokMessages, { temperature, maxOutputTokens: maxTokens, timeoutMs: 6500 });
      return text && text.trim().length > 0 ? text : (allowFallback ? this.makeFallbackReply(userMessage) : '');
    } catch (error) {
      console.error('Chatbot error:', error);
      return opts?.allowFallback === false ? '' : this.makeFallbackReply(userMessage);
    }
  }

  async searchWeb(query: string): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are helping users find information about a topic. Provide helpful, accurate information based on your knowledge. If it is about Bong Bari (Bengali comedy), use that context.' },
        { role: 'user', content: `Find info about: ${query}` }
      ];
      const text = await this.generateText(messages, { temperature: 0.8, maxOutputTokens: 400 });
      return text && text.trim().length > 0 ? text : this.makeFallbackReply(query);
    } catch (error) {
      console.error('Web search error:', error);
      return this.makeFallbackReply(query);
    }
  }

  async getBengaliComedyTips(): Promise<string> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are Bong Bari\'s AI assistant.' },
        { role: 'user', content: 'Provide 3-4 quick tips about creating authentic Bengali comedy content. Natural mix of Bengali/English.' }
      ];
      const text = await this.generateText(messages, { temperature: 0.6, maxOutputTokens: 300 });
      return text && text.trim().length > 0 ? text : this.makeFallbackReply('tips');
    } catch (error) {
      console.error('Tips generation error:', error);
      return this.makeFallbackReply('tips');
    }
  }

  private async getTrainedResponse(userMessage: string): Promise<string | null> {
    try {
      const keywords = this.extractKeywords(userMessage.toLowerCase());
      for (const keyword of keywords) {
        let trainingData = [] as ChatbotTraining[];
        if (typeof storage.searchChatbotTraining === 'function') {
          trainingData = await (storage as any).searchChatbotTraining(keyword);
        } else {
          const all = await storage.getAllChatbotTraining();
          trainingData = all.filter(d => d.keyword.toLowerCase().includes(keyword));
        }
        if (trainingData.length > 0) {
          const bestMatch = trainingData.find((data: ChatbotTraining) =>
            data.keyword.toLowerCase() === keyword ||
            userMessage.toLowerCase().includes(data.keyword.toLowerCase())
          ) || trainingData[0];
          return bestMatch.botResponse;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting trained response:', error);
      return null;
    }
  }

  private extractKeywords(message: string): string[] {
    const commonWords = ['ami', 'tumi', 'ki', 'kemon', 'what', 'how', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but'];
    const words = message
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09ff]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
    const unique = Array.from(new Set(words));
    return unique.sort((a, b) => b.length - a.length);
  }

  async getGreetingTemplates(): Promise<string[]> {
    try {
      let templates: ChatbotTemplate[];
      if (typeof (storage as any).getChatbotTemplatesByType === 'function') {
        templates = await (storage as any).getChatbotTemplatesByType('greeting');
      } else {
        templates = (await storage.getAllChatbotTemplates()).filter(t => (t as any).templateType === 'greeting');
      }
      return templates.map((template: ChatbotTemplate) => template.content);
    } catch (error) {
      console.error('Error fetching greeting templates:', error);
      return ['🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!'];
    }
  }

  async getQuickReplyTemplates(): Promise<string[]> {
    try {
      let templates: ChatbotTemplate[];
      if (typeof (storage as any).getChatbotTemplatesByType === 'function') {
        templates = await (storage as any).getChatbotTemplatesByType('quick_reply');
      } else {
        templates = (await storage.getAllChatbotTemplates()).filter(t => (t as any).templateType === 'quick_reply');
      }
      return templates.map((template: ChatbotTemplate) => template.content);
    } catch (error) {
      console.error('Error fetching quick reply templates:', error);
      return ['Kadate tow sobai pare Haste Chao?', 'Collab korlei Hese Felbe, Try?'];
    }
  }
}

export const chatbotService = new ChatbotService();