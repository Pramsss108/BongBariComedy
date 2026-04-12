import { Router } from 'express';

interface KhistiPost {
  id: string;
  text: string;
  createdAt: number;
  emoji: string;
}

// In-memory temporary store (like filebin) — clears on server restart
const khistiPosts: KhistiPost[] = [];
const MAX_POSTS = 500;
const MAX_TEXT_LENGTH = 500;

// Rate limit: max 1 post per IP per 10 seconds
const recentIps = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

const EMOJIS = ['🔥', '💀', '😂', '🤬', '💣', '🎭', '👻', '🐍', '🦴', '💩'];

export function registerKhistiRoutes(app: any) {
  const router = Router();

  // GET all posts (newest first)
  router.get('/', (_req, res) => {
    res.json({ posts: [...khistiPosts].reverse(), total: khistiPosts.length });
  });

  // POST a new anonymous khisti
  router.post('/', (req: any, res) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Rate limit
    const lastPost = recentIps.get(ip);
    if (lastPost && Date.now() - lastPost < RATE_LIMIT_MS) {
      return res.status(429).json({ message: 'ধীরে বাবা! 10 সেকেন্ড অপেক্ষা করো।' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Text is required' });
    }

    const sanitized = text.trim().slice(0, MAX_TEXT_LENGTH);
    if (sanitized.length < 2) {
      return res.status(400).json({ message: 'Too short — at least 2 chars' });
    }

    const post: KhistiPost = {
      id: `k_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: sanitized,
      createdAt: Date.now(),
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    };

    khistiPosts.push(post);
    if (khistiPosts.length > MAX_POSTS) khistiPosts.splice(0, khistiPosts.length - MAX_POSTS);

    recentIps.set(ip, Date.now());

    res.status(201).json({ post });
  });

  // Stats
  router.get('/stats', (_req, res) => {
    res.json({ total: khistiPosts.length, maxCapacity: MAX_POSTS });
  });

  app.use('/api/khisti', router);
}
