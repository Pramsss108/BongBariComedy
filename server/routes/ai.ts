import { Express } from "express";
import { chatbotService } from "../chatbotService";
import { trendsService } from "../trendsService";
import { analyzeStory } from "../moderation";

export function registerAiRoutes(app: Express, sessions: Map<string, any>, getDeviceIdFromReq: Function) {
    // Chatbot Rate Limiting (Anonymous)
    const chatbotRateLimit = new Map<string, { count: number, resetTime: number }>();

    function checkLimit(deviceId: string, isAuthenticated: boolean) {
        if (isAuthenticated) return { allowed: true, remaining: -1 };
        const now = Date.now();
        const dailyResetTime = new Date().setHours(24, 0, 0, 0);
        let userLimit = chatbotRateLimit.get(deviceId);
        if (!userLimit || now >= userLimit.resetTime) {
            userLimit = { count: 0, resetTime: dailyResetTime };
            chatbotRateLimit.set(deviceId, userLimit);
        }
        const max = 3;
        if (userLimit.count >= max) return { allowed: false, remaining: 0 };
        return { allowed: true, remaining: max - userLimit.count - 1 };
    }

    app.get("/api/ai/ready", async (_req, res) => {
        const health = await chatbotService.checkAIReady().catch(() => ({ ok: false, aiKeyPresent: true }));
        res.json(health);
    });

    app.get("/api/greeting/today", async (_req, res) => {
        try {
            const items = trendsService.getTop(8).filter(i => !i.isSomber);
            const topic = items[0]?.title || 'Kolkata vibe';
            const prompt = `Craft a fresh, 1-2 sentence Bengali greeting about: ${topic}. Witty, family-friendly Bong style.`;
            const text = await chatbotService.generateFreeform(prompt, { temperature: 0.8 });
            res.json({ text: text || chatbotService.getFallback('hello') });
        } catch {
            res.json({ text: 'Ajke positive thaki—halka roast, boro hasi.' });
        }
    });

    app.post("/api/chatbot/message", async (req, res) => {
        try {
            const deviceId = getDeviceIdFromReq(req);
            const sessionId = req.headers.authorization?.replace('Bearer ', '');
            const isAuthenticated = sessionId && sessions.has(sessionId);

            const limit = checkLimit(deviceId, !!isAuthenticated);
            if (!limit.allowed) {
                return res.status(429).json({ error: "Limit reached", message: "Sign up for unlimited chat!" });
            }

            const { message, conversationHistory = [] } = req.body || {};
            const mod = await analyzeStory(message);
            if (mod.decision === 'rejected') return res.status(400).json({ error: "Policy violation", message: mod.reason });

            const response = await chatbotService.generateResponse(message, conversationHistory);

            if (!isAuthenticated) {
                const ul = chatbotRateLimit.get(deviceId);
                if (ul) ul.count++;
            }

            res.json({
                response,
                usedAI: true,
                aiInfo: chatbotService.getLastAiInfo(),
                rateLimit: { remaining: limit.remaining, isAuthenticated }
            });
        } catch (e) {
            res.status(500).json({ error: "AI error" });
        }
    });

    app.post("/api/chatbot/search", async (req, res) => {
        const { query } = req.body || {};
        if (!query) return res.status(400).json({ error: "Query required" });
        const results = await chatbotService.searchWeb(query);
        res.json({ results });
    });

    app.get("/api/chatbot/tips", async (_req, res) => {
        const tips = await chatbotService.getBengaliComedyTips();
        res.json({ tips });
    });
}
