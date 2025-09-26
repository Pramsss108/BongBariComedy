import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
// Ensure env is loaded even if this module is imported before server/index
try {
  const envPath = path.resolve(import.meta.dirname, '.env');
  const r = dotenv.config({ path: envPath });
  if (r.error) {
    dotenv.config();
  }
} catch (_) {}
import { storage } from "./storage";
import { type ChatbotTraining, type ChatbotTemplate } from "@shared/schema";
import { trendsService } from "./trendsService";

// Gracefully handle missing API key in development/preview
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;
const API_KEY = process.env.GEMINI_API_KEY || '';

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
  role: 'user' | 'assistant';
  content: string;
}

export class ChatbotService {
  private model = ai?.models.generateContent;
  private lastCtaTs = 0;
  private lastAiCheckTs = 0;
  private lastAiOk: boolean | null = null;
  private lastAiSource: 'sdk' | 'rest' | 'none' = 'none';
  private lastAiModel: string | null = null;
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
    return await this.generateText(prompt, options);
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
      // Answer-first: 2 quick topical lines (no prompt request)
      const trends = trendsService.getTop(8).filter(t => !t.isSomber);
      const topic = trends[0]?.title || '';
      let topicShort = topic ? topic.replace(/[|:–—-].*$/, '').split(/\s+/).slice(0, 3).join(' ') : '';
  if (!topicShort || /viral\s+funny\s+name/i.test(topicShort)) topicShort = 'Trending now';

      const hasBn = /[\u0980-\u09ff]/.test(userMessage);
      const hasEn = /[a-zA-Z]/.test(userMessage);
      const bengaliWords = ['ami','tumi','kemon','bhalo','hobe','korbo','chai','meme','roast','adda','haso','hasi'];
      const isBenglish = !hasBn && hasEn && bengaliWords.some(w => (userMessage||'').toLowerCase().includes(w));

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
      // Pure English fallback
      const l1 = `Today’s pick: ${topicShort} — light roast, big laughs.`;
  const l2 = `Zero stress, punchline on — Bangla vibe.`;
      return `${l1}\n${l2}`.trim();
    }
    // Generic graceful fallback—engaging first; nudge for context only ~25%
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
  // Tiny echo if user wrote a 1–2 word cue
  const words = um.split(/\s+/).filter(Boolean);
  const echo = words.length > 0 && words.length <= 2 ? `${words.join(' ')}? — thik ache, ami spice debo.` : '';
  const firstLine = echo || pick(engaging);
    const maybeNudge = Math.random() < 0.25 ? `\n${pick(nudges)}` : '';
    return `${firstLine}${maybeNudge}${cta}`.trim();
  }

  // Generate text with correct request shape and robust parsing + light retry
  private async generateText(
    prompt: string,
    options?: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number }
  ): Promise<string | null> {
  if (!ai || !this.model) return null;
  const model = this.model; // capture to satisfy TS inside closures
  const { temperature = 0.7, maxOutputTokens = 500, timeoutMs = 5000 } = options || {};

    const attempt = async () => {
      const buildReq = (modelName: string) => model!({
        model: modelName,
        contents: [
          { role: "user", parts: [{ text: prompt }] },
        ],
        config: { temperature, maxOutputTokens },
      });

      const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite-preview",
        "gemini-2.5-flash",
      ];

      // Try SDK first across models
      for (const m of modelsToTry) {
        try {
          const response = await Promise.race([
            buildReq(m),
            new Promise((_resolve, reject) => setTimeout(() => reject(new Error('ai-timeout')), timeoutMs)),
          ]);
          const text = (response as any)?.text
            ?? (response as any)?.output_text
            ?? ((response as any)?.candidates?.[0]?.content?.parts
                  ? (response as any).candidates[0].content.parts.map((p: any) => p?.text ?? '').join('')
                  : undefined)
            ?? ((response as any)?.candidates?.[0]?.content?.text)
            ?? ((response as any)?.candidates?.[0]?.content)
            ?? '';
          const final = typeof text === 'string' ? text.trim() : '';
          if (final.length > 0) {
            this.lastAiSource = 'sdk';
            this.lastAiModel = m;
            return final;
          }
        } catch (_) {
          // try next model
        }
      }

      // REST fallback if SDK route fails
      if (!API_KEY) return null;
      const restModels = ["gemini-1.5-flash", "gemini-2.0-flash-lite-preview", "gemini-2.5-flash"];
      for (const m of restModels) {
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), timeoutMs);
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature, maxOutputTokens },
              }),
              signal: ctrl.signal,
            }
          ).then(r => r.ok ? r.json() : Promise.reject(new Error('rest-fail')));
          clearTimeout(to);
          const text = (resp?.candidates?.[0]?.content?.parts || [])
            .map((p: any) => p?.text || '')
            .join('')
            .trim();
          if (text) {
            this.lastAiSource = 'rest';
            this.lastAiModel = m;
            return text;
          }
        } catch (_) {
          // continue to next model
        }
      }

      return null;
    };

  // Single fast attempt; if it fails or is empty, let caller use local fallback
  const first = await attempt().catch(() => null);
  return first;
  }

  // Health check with 60s cache; verifies API key reachability
  public async checkAIReady(): Promise<{ ok: boolean; aiKeyPresent: boolean; reason?: string }>
  {
    const aiKeyPresent = Boolean(API_KEY);
    const now = Date.now();
    if (!aiKeyPresent) return { ok: false, aiKeyPresent, reason: 'no-key' };

    if (this.lastAiOk !== null && now - this.lastAiCheckTs < 60_000) {
      return { ok: this.lastAiOk, aiKeyPresent };
    }

    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 1200);
      const m = 'gemini-1.5-flash';
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 4 } }),
          signal: ctrl.signal,
        }
      ).then(r => r.ok ? r.json() : Promise.reject(new Error('rest-fail')));
      clearTimeout(to);
      const ok = Boolean(resp?.candidates?.length);
      this.lastAiOk = ok;
      this.lastAiCheckTs = now;
      return { ok, aiKeyPresent };
    } catch (e: any) {
      this.lastAiOk = false;
      this.lastAiCheckTs = now;
      return { ok: false, aiKeyPresent, reason: e?.message || 'error' };
    }
  }

  public getLastAiInfo(): { source: 'sdk' | 'rest' | 'none'; model: string | null } {
    return { source: this.lastAiSource, model: this.lastAiModel };
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[] = [],
    opts?: { allowFallback?: boolean }
  ): Promise<string> {
    try {
      // If user just said hello/hi, reply with saved Greeting template if available; else friendly fallback
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
        } catch (_) {}
        return this.makeHelloReply(userMessage);
      }
      // Then check for trained responses in database
      const trainedResponse = await this.getTrainedResponse(userMessage);
      if (trainedResponse) {
        return trainedResponse;
      }
      // Build conversation context
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Enhanced language detection
      const hasBengaliScript = /[\u0980-\u09ff]/.test(userMessage);
      const hasEnglishWords = /[a-zA-Z]/.test(userMessage);
      
      let languageInstruction = "";
      if (hasBengaliScript && !hasEnglishWords) {
        languageInstruction = "RESPOND ONLY IN BENGALI SCRIPT. Do not use any English words.";
      } else if (hasEnglishWords && !hasBengaliScript) {
        // Check if it's Benglish (Bengali words in English script)
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
      // Adaptive length: short for quick asks, medium for chatty users
      const maxTokens = isJokeIntent ? 80 : isChattyUser ? 220 : 140;
      const temperature = isJokeIntent ? 0.85 : isChattyUser ? 0.7 : 0.65;
  const trendHints = isJokeIntent ? trendsService.getTop(6).filter(t => !t.isSomber).slice(0, 4) : [];
  const trendLines = trendHints.length ? `\nToday's hints: ${trendHints.map(t => `[${t.language.toUpperCase()}] ${t.title}`).join(' \u2022 ')}` : '';

      // Load training notes (admin notepad), cached for 60s
      const nowTs = Date.now();
      if (nowTs - this.trainingCache.ts > 60_000) {
        try {
          const settings = await storage.getPublicSettings?.().catch(() => [])
            || await (storage as any).getAllAdminSettings?.().catch(() => []);
          const all = Array.isArray(settings) ? settings : [];
          // Prefer non-public if available, fall back to any list
          const fromAll = await (async () => {
            if (typeof (storage as any).getAllAdminSettings === 'function') {
              try { return await (storage as any).getAllAdminSettings(); } catch { return all; }
            }
            return all;
          })();
          const setting = (fromAll || []).find((s: any) => s.settingKey === 'chatbot_training_notepad');
          const txt = (setting?.settingValue || '').toString();
          this.trainingCache = { text: txt, ts: nowTs };
        } catch { this.trainingCache = { text: this.trainingCache.text, ts: nowTs }; }
      }

      const trainingBlock = this.trainingCache.text
        ? `\nPROJECT TRAINING NOTES (curated):\n${this.trainingCache.text}\n\n— End of notes —\n`
        : '';

  const systemPrompt = `${BONG_BARI_CONTEXT}

LANGUAGE INSTRUCTION: ${languageInstruction}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

${trendLines}

 ${trainingBlock}

 Instructions (STRICT):
  1) Answer-first in a playful, witty, family-friendly tone; use 1–2 short lines for quick asks, or 2–4 compact lines (max 2 bullets) for deeper questions.
  2) Keep it natural (Benglish or Bengali script); avoid formal AI voice. ≤1 emoji only when perfect.
  3) Emotionally intelligent persuasion: acknowledge needs, mirror the vibe, seed confidence with one crisp benefit.
  4) If user asks about business benefits or collaboration, include one concrete value-point (e.g., reach, authenticity, Bengali family connect) and END with: "Apply: /work-with-us#form" (always include this exact link on such intents).
  5) Add at most one clean, cheeky bong-style quip. Never rude. No tragedy/politics jokes; if mentioned, acknowledge softly then pivot positive.
  6) If unsure, say you’re not sure in 1 short line and ask 1 crisp follow-up.
  7) You may briefly mention YouTube @bongbari or Instagram @thebongbari when relevant.

 Keep it tight: quick ≤3 short sentences; deep ≤4 short lines or 2 bullets.`;

      const allowFallback = opts?.allowFallback !== false; // default true
      if (!ai || !this.model) {
        // If no AI available
        return allowFallback ? this.makeFallbackReply(userMessage) : '';
      }
  const text = await this.generateText(systemPrompt, { temperature, maxOutputTokens: maxTokens, timeoutMs: 4500 });
  return text && text.trim().length > 0 ? text : (allowFallback ? this.makeFallbackReply(userMessage) : '');
    } catch (error) {
      console.error('Chatbot error:', error);
      // On errors: only fallback if allowed
      return opts?.allowFallback === false ? '' : this.makeFallbackReply(userMessage);
    }
  }

  async searchWeb(query: string): Promise<string> {
    try {
      // Enhanced prompt for web search simulation using Gemini's knowledge
      const searchPrompt = `
      You are helping users find information about: "${query}"
      
      Based on your training data and knowledge, provide helpful, accurate information about this topic.
      If this is related to Bengali culture, comedy, or entertainment, provide detailed insights.
      If it's about Bong Bari specifically, use the context provided earlier.
      
      Format your response as if you found relevant information online, but make it clear this is based on your knowledge, not real-time web search.
      
      Query: ${query}
      `;

      if (!ai || !this.model) {
        return this.makeFallbackReply(query);
      }
  const text = await this.generateText(searchPrompt, { temperature: 0.8, maxOutputTokens: 400 });
  return text && text.trim().length > 0 ? text : this.makeFallbackReply(query);
    } catch (error) {
      console.error('Web search error:', error);
      // Provide a light fallback instead of an error line
      return this.makeFallbackReply(query);
    }
  }

  async getBengaliComedyTips(): Promise<string> {
    try {
      const prompt = `
      As Bong Bari's AI assistant, provide 3-4 quick tips about creating authentic Bengali comedy content.
      Make it practical and actionable for content creators.
      Respond in a mix of Bengali and English that feels natural.
      `;

      if (!ai || !this.model) {
        return this.makeFallbackReply('tips');
      }
  const text = await this.generateText(prompt, { temperature: 0.6, maxOutputTokens: 300 });
  return text && text.trim().length > 0 ? text : this.makeFallbackReply('tips');
    } catch (error) {
      console.error('Tips generation error:', error);
      // Use graceful local fallback instead of surfacing an error message
      return this.makeFallbackReply('tips');
    }
  }

  // 🎯 NEW: Use database training data for intelligent responses
  private async getTrainedResponse(userMessage: string): Promise<string | null> {
    try {
      const keywords = this.extractKeywords(userMessage.toLowerCase());
      
      // Search for trained responses with different strategies
      for (const keyword of keywords) {
        let trainingData = [] as ChatbotTraining[];
        if (typeof storage.searchChatbotTraining === 'function') {
          trainingData = await storage.searchChatbotTraining(keyword);
        } else {
          // Fallback: fetch all and filter in memory
          const all = await storage.getAllChatbotTraining();
          trainingData = all.filter(d => d.keyword.toLowerCase().includes(keyword));
        }
        if (trainingData.length > 0) {
          const bestMatch = trainingData.find((data: ChatbotTraining) =>
            data.keyword.toLowerCase() === keyword ||
            userMessage.toLowerCase().includes(data.keyword.toLowerCase())
          ) || trainingData[0];
          console.log(`🎯 Found trained response for keyword: "${keyword}"`);
          return bestMatch.botResponse;
        }
      }
      
      return null; // No trained response found, use AI
    } catch (error) {
      console.error('Error getting trained response:', error);
      return null; // Fallback to AI on error
    }
  }

  // Extract meaningful keywords from user message
  private extractKeywords(message: string): string[] {
    // Remove common words and extract meaningful terms
    const commonWords = ['ami', 'tumi', 'ki', 'kemon', 'what', 'how', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but'];
    const words = message
      .toLowerCase()
      .replace(/[^\w\s\u0980-\u09ff]/g, '') // Keep alphanumeric and Bengali characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
    
    // Return unique keywords, prioritizing longer ones
  const unique = Array.from(new Set(words));
  return unique.sort((a, b) => b.length - a.length);
  }

  // 📝 Get greeting templates from database
  async getGreetingTemplates(): Promise<string[]> {
    try {
      let templates: ChatbotTemplate[];
      if (typeof storage.getChatbotTemplatesByType === 'function') {
        templates = await storage.getChatbotTemplatesByType('greeting');
      } else {
        templates = (await storage.getAllChatbotTemplates()).filter(t => (t as any).templateType === 'greeting');
      }
      return templates.map((template: ChatbotTemplate) => template.content);
    } catch (error) {
      console.error('Error fetching greeting templates:', error);
      return ['🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!'];
    }
  }

  // 🚀 Get quick reply templates from database
  async getQuickReplyTemplates(): Promise<string[]> {
    try {
      let templates: ChatbotTemplate[];
      if (typeof storage.getChatbotTemplatesByType === 'function') {
        templates = await storage.getChatbotTemplatesByType('quick_reply');
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