import { Express } from "express";
import { storage } from "../storage";
import { analyzeStory } from '../moderation';

export function registerCommunityRoutes(app: Express, logEvent: Function, upstashUtils: any, recentPostsInMemory: Map<string, number>) {
    const { upstashGet, upstashSetEx } = upstashUtils;

    // Community feed
    app.get('/api/community/feed', async (_req, res) => {
        try {
            const feed = await storage.getCommunityFeed();
            res.json(feed);
        } catch (error) {
            console.error('Error fetching community feed:', error);
            res.status(500).json({ message: 'Failed to fetch community feed' });
        }
    });

    // Preview moderation
    app.post('/api/moderate-preview', async (req: any, res) => {
        const { text } = req.body || {};
        const testBypassToken = process.env.TEST_BYPASS_TOKEN;
        if (testBypassToken && req.headers['x-test-bypass'] === testBypassToken) {
            return res.json({ status: 'ok', test: true });
        }
        if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ message: 'Missing text' });
        const raw = text.slice(0, 1000);
        const moderation = await analyzeStory(raw).catch(() => ({ decision: 'pending', reason: 'fallback', flags: [], usedAI: false, severity: 0 }));
        if (moderation.decision === 'approve') {
            return res.json({ status: 'ok' });
        }
        return res.json({ status: 'review_suggested', reason: moderation.reason, flags: moderation.flags });
    });

    // Submit story
    app.post('/api/submit-story', async (req: any, res) => {
        const testBypassToken = process.env.TEST_BYPASS_TOKEN;
        const isBypass = testBypassToken && req.headers['x-test-bypass'] === testBypassToken;
        const deviceId = req.deviceId || 'unknown';
        const ip = (req.ip || '').replace(/[:].*$/, '') || 'ipless';
        const deviceHash = deviceId.split('').reduce((h: number, c: string) => (Math.imul(h ^ c.charCodeAt(0), 16777619)) >>> 0, 2166136261).toString(36);
        const rateKey = `post:${ip}:${deviceHash}`;
        const sixHourMs = 6 * 60 * 60 * 1000;
        let limited = false;

        if (!isBypass) {
            const upstashLimit = await upstashGet(rateKey);
            if (upstashLimit) limited = true;
            else {
                try {
                    limited = await storage.checkRateLimit(rateKey);
                    if (!limited) await storage.setRateLimit(rateKey, sixHourMs);
                } catch {
                    const ts = recentPostsInMemory.get(rateKey) || 0;
                    if (Date.now() - ts < sixHourMs) limited = true; else recentPostsInMemory.set(rateKey, Date.now());
                }
            }

            if (limited) {
                logEvent(req, 'submit_rate_limited_6h', { rateKey });
                return res.status(429).json({ code: 'rate_limited', message: 'Apni already post korechhen, 6 ghonta por abar.' });
            }
            if (!upstashLimit) await upstashSetEx(rateKey, sixHourMs / 1000);
        }

        const { name, isAnonymous, text } = req.body || {};
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ message: 'Missing text' });
        }

        const raw = text.slice(0, 1000);
        const detectedLang = /[\u0980-\u09FF]/.test(raw) ? 'bn' : 'en';
        const moderation = await analyzeStory(raw).catch(() => ({ decision: 'pending', reason: 'fallback', flags: [], usedAI: false, severity: 0 }));

        if (moderation.decision === 'approve' || isBypass) {
            const post = await storage.createCommunityPost({
                text: raw,
                author: isAnonymous ? null : (name || null),
                language: detectedLang,
                featured: false,
                moderationFlags: moderation.flags || [],
                moderationReason: isBypass ? 'test-bypass' : moderation.reason,
                moderationUsedAI: moderation.usedAI || false,
                moderationSeverity: moderation.severity || 0,
                moderationDecision: 'approve'
            });
            logEvent(req, 'submit_published', { postId: post.id, test: isBypass });
            return res.json({ status: 'published', postId: post.id, message: 'Shabash! Golpo live holo.', test: isBypass });
        }

        const pending = await storage.createPendingCommunityPost({
            postId: 'P' + Date.now(),
            text: raw,
            author: isAnonymous ? null : (name || null),
            language: detectedLang,
            flaggedTerms: moderation.flags,
            moderationFlags: moderation.flags,
            moderationReason: moderation.reason,
            moderationUsedAI: moderation.usedAI,
            moderationSeverity: moderation.severity,
            moderationDecision: 'pending'
        });
        logEvent(req, 'submit_pending_review', { postId: pending.postId, test: isBypass });
        return res.json({ status: 'pending_review', postId: pending.postId, message: 'Dada/Di, ektu flagged kora holo — admin review korbe.' });
    });

    // Reaction endpoint
    const reactionTypes = new Set(['heart', 'laugh', 'thumbs']);
    app.post('/api/reaction', async (req: any, res) => {
        const { postId, type } = req.body || {};
        if (!postId || !type || !reactionTypes.has(type)) return res.status(400).json({ message: 'Invalid reaction' });

        const deviceId = req.deviceId || 'unknown';
        const deviceHash = deviceId.split('').reduce((h: number, c: string) => (Math.imul(h ^ c.charCodeAt(0), 16777619)) >>> 0, 2166136261).toString(36);
        const dedupeKey = `reaction:${postId}:${type}:${deviceHash}`;

        let duplicate = await upstashGet(dedupeKey);
        if (!duplicate) {
            try { duplicate = await storage.checkRateLimit(dedupeKey); } catch { duplicate = false; }
        }

        if (duplicate && !process.env.TEST_BYPASS_TOKEN) {
            return res.json({ ok: false, message: 'Already reacted' });
        }

        await storage.addReactionToCommunityPost(postId, type);
        await upstashSetEx(dedupeKey, 365 * 24 * 60 * 60);
        try { await storage.setRateLimit(dedupeKey, 365 * 24 * 60 * 60 * 1000); } catch { }

        const feed = await storage.getCommunityFeed();
        const post = feed.find(p => p.id === postId);
        res.json({ ok: true, postId, reactions: post?.reactions || {} });
    });
}
