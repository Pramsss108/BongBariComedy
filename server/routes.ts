import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeStory } from './moderation';
import { chatbotService } from "./chatbotService";
import { GoogleAuthService } from "./googleAuthService";
import { insertBlogPostSchema, insertCollaborationRequestSchema, insertUserSchema, insertHomepageContentSchema, type HomepageContent } from "@shared/schema.sqlite";
import { z } from "zod";
import https from 'https';
import { trendsService } from "./trendsService";
import { memeService } from "./memeService";
import { dailyDataService } from "./dailyDataService";
import { parseStringPromise } from 'xml2js';
import { youtubeService } from './youtubeService';
// Replit object storage removed
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  securityHeaders, 
  // rateLimit, // Removed permanently
  sanitizeBody,
  validateSession,
  trackRequests,
  generateCSRFToken,
  validateCSRFToken,
  // checkBruteForce, // Removed permanently
  // recordFailedLogin, // Removed permanently
  // clearLoginAttempts, // Removed permanently
  sanitizeInput
} from "./middleware/security";

// Simple session middleware
const sessions = new Map<string, { username: string; createdAt: Date; googleUser?: { email: string; name: string; picture?: string } }>();

const isAuthenticated = (req: any, res: any, next: any) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const session = sessionId ? sessions.get(sessionId) : null;
  
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if session is older than 24 hours
  const isExpired = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000;
  if (isExpired) {
    sessions.delete(sessionId);
    return res.status(401).json({ message: "Session expired" });
  }
  
  req.user = session;
  req.sessionId = sessionId; // Add sessionId to request for CSRF validation
  next();
};

// CSRF validation middleware for state-changing operations
const validateCSRF = (req: any, res: any, next: any) => {
  // Skip CSRF check for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  const sessionId = req.sessionId || req.headers.authorization?.replace('Bearer ', '');
  const csrfToken = req.headers['x-csrf-token'] || req.body?.csrfToken;
  
  if (!sessionId || !csrfToken) {
    return res.status(403).json({ message: "Missing CSRF token" });
  }
  
  if (!validateCSRFToken(sessionId, csrfToken)) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Device ID extraction & logging / rate limit setup ---
  interface DeviceLogEvent { ts: number; deviceId: string; ip: string | undefined; action: string; meta?: any; }
  const deviceLogs: DeviceLogEvent[] = [];
  const MAX_LOGS = 500;
  // Legacy short window removed; new 6h single-post rate limit handled below
  const sixHourMs = 6 * 60 * 60 * 1000;
  const recentPostsInMemory = new Map<string, number>(); // key -> ts (ephemeral fallback)

  const upstashUrl = process.env.UPSTASH_REST_URL;
  const upstashToken = process.env.UPSTASH_REST_TOKEN;
  async function upstashGet(key: string): Promise<boolean> {
    if (!upstashUrl || !upstashToken) return false;
    try {
      const r = await fetch(`${upstashUrl}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
      if (!r.ok) return false;
      const j = await r.json();
      return j.result != null;
    } catch { return false; }
  }
  async function upstashSetEx(key: string, ttlSec: number): Promise<void> {
    if (!upstashUrl || !upstashToken) return;
    try {
      await fetch(`${upstashUrl}/set/${encodeURIComponent(key)}/1?EX=${ttlSec}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
    } catch {/* ignore */}
  }

  function getDeviceIdFromReq(req: any): string {
    const header = (req.headers['x-device-id'] as string) || '';
    if (header) return header.slice(0, 64);
    const cookie = (req.headers.cookie || '').match(/bbc_device_id=([^;]+)/)?.[1];
    if (cookie) return decodeURIComponent(cookie).slice(0, 64);
    return 'unknown';
  }
  function logEvent(req: any, action: string, meta?: any) {
    const entry: DeviceLogEvent = { ts: Date.now(), deviceId: req.deviceId, ip: req.ip, action, meta };
    deviceLogs.push(entry);
    if (deviceLogs.length > MAX_LOGS) deviceLogs.splice(0, deviceLogs.length - MAX_LOGS);
  }
  app.use((req: any, _res, next) => {
    req.deviceId = getDeviceIdFromReq(req);
    next();
  });

  // Community feed - now using Postgres storage
  app.get('/api/community/feed', async (_req, res) => {
    try {
      const feed = await storage.getCommunityFeed();
      res.json(feed);
    } catch (error) {
      console.error('Error fetching community feed:', error);
      res.status(500).json({ message: 'Failed to fetch community feed' });
    }
  });

  // Preview moderation (no persistence, no rate-limit) – AI only suggests
  app.post('/api/moderate-preview', async (req: any, res) => {
    const { text } = req.body || {};
    const testBypassToken = process.env.TEST_BYPASS_TOKEN;
    if (testBypassToken && req.headers['x-test-bypass'] === testBypassToken) {
      return res.json({ status: 'ok', test: true });
    }
    if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ message: 'Missing text' });
    const raw = text.slice(0,1000);
    const lower = raw.toLowerCase();
    const severeIndicators = /(child\s*sex|rape|kill\syou|behead|incest|pedo|bomb|acid\s*attack)/i;
    if (severeIndicators.test(lower)) {
      return res.status(200).json({ status: 'severe_block', message: 'Eita khub sensitive – edit kore abar try korun.' });
    }
    let moderation: any;
    try { moderation = await analyzeStory(raw); } catch { moderation = { decision: 'pending', reason: 'fallback', flags: [], usedAI: false, severity: 0 }; }
    if (moderation.decision === 'approve') {
      return res.json({ status: 'ok' });
    }
    return res.json({ status: 'review_suggested', reason: moderation.reason, flags: moderation.flags });
  });

  // Submit story - now using Postgres storage
  app.post('/api/submit-story', async (req: any, res) => {
    const testBypassToken = process.env.TEST_BYPASS_TOKEN;
    const isBypass = testBypassToken && req.headers['x-test-bypass'] === testBypassToken;
    const deviceId = req.deviceId || 'unknown';
    const ip = (req.ip || '').replace(/[:].*$/, '') || 'ipless';
    const deviceHash = deviceId.split('').reduce((h: number, c: string) => (Math.imul(h ^ c.charCodeAt(0), 16777619))>>>0, 2166136261).toString(36);
    const rateKey = `post:${ip}:${deviceHash}`;
    const sixHourMs = 6 * 60 * 60 * 1000;
    let limited = false;

    // Rate limiting check
    if (!isBypass) {
      if (upstashUrl && upstashToken) {
        if (await upstashGet(rateKey)) limited = true; else await upstashSetEx(rateKey, sixHourMs/1000);
      } else {
        // Use Postgres rate limiting if available, fallback to memory
        try {
          limited = await storage.checkRateLimit(rateKey);
          if (!limited) {
            await storage.setRateLimit(rateKey, sixHourMs);
          }
        } catch {
          // Fallback to memory
          const ts = recentPostsInMemory.get(rateKey) || 0;
          if (Date.now() - ts < sixHourMs) limited = true; else recentPostsInMemory.set(rateKey, Date.now());
        }
      }
      
      if (limited) {
        const retryAfterSec = Math.round(sixHourMs / 1000);
        logEvent(req, 'submit_rate_limited_6h', { rateKey, retryAfterSec });
        return res.status(429).json({ code: 'rate_limited', retryAfterSec, message: 'Apni already post korechhen, 6 ghonta por abar.' });
      }
    } else {
      logEvent(req, 'submit_test_bypass', { deviceHash, ip });
    }

    const { name, isAnonymous, lang, text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'Missing text' });
    }
    
    // Process text and detect language
    const raw = text.slice(0, 1000);
    const lower = raw.toLowerCase();
    const detectedLang = /[\u0980-\u09FF]/.test(raw) ? 'bn' : 'en';
    
    // Severe content check
    const severeIndicators = /(child\s*sex|rape|kill\syou|behead|incest|pedo|bomb|acid\s*attack)/i;
    if (severeIndicators.test(lower)) {
      logEvent(req, 'submit_blocked_severe');
      return res.status(200).json({ status: 'blocked', message: 'Dada/Di, ei jinis publish kora jabe na.' });
    }

    // Generate unique post ID
    const postId = 'P' + Date.now() + Math.random().toString(36).substr(2, 5);

    // Auto publish when bypass active
    if (isBypass) {
      try {
        const approvedPost = await storage.createCommunityPost({
          text: raw,
          author: isAnonymous ? null : (name || null),
          language: detectedLang,
          featured: false,
          moderationFlags: [],
          moderationReason: 'test-bypass',
          moderationUsedAI: false,
          moderationSeverity: 0,
          moderationDecision: 'approve'
        });
        
        logEvent(req, 'submit_published_test', { postId, approvedId: approvedPost.id });
        return res.status(200).json({ 
          status: 'published', 
          postId, 
          approvedId: approvedPost.id, 
          test: true, 
          message: 'Test bypass: published.' 
        });
      } catch (error) {
        console.error('Error creating community post:', error);
        return res.status(500).json({ message: 'Failed to create post' });
      }
    }

    // AI moderation
    let moderation: any;
    try { 
      moderation = await analyzeStory(raw); 
    } catch { 
      moderation = { decision: 'pending', reason: 'fallback', flags: [], usedAI: false, severity: 0 }; 
    }

    if (moderation.decision === 'approve') {
      try {
        const approvedPost = await storage.createCommunityPost({
          text: raw,
          author: isAnonymous ? null : (name || null),
          language: detectedLang,
          featured: false,
          moderationFlags: moderation.flags,
          moderationReason: moderation.reason,
          moderationUsedAI: moderation.usedAI,
          moderationSeverity: moderation.severity,
          moderationDecision: 'approve'
        });
        
        logEvent(req, 'submit_published', { postId, approvedId: approvedPost.id, test: isBypass });
        return res.status(200).json({ 
          status: 'published', 
          postId, 
          approvedId: approvedPost.id, 
          message: 'Shabash! Golpo live holo.', 
          test: isBypass 
        });
      } catch (error) {
        console.error('Error creating approved community post:', error);
        return res.status(500).json({ message: 'Failed to create post' });
      }
    }

    // Add to pending queue
    try {
      await storage.createPendingCommunityPost({
        postId,
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
      
      logEvent(req, 'submit_pending_review', { postId, flags: moderation.flags, test: isBypass });
      return res.status(200).json({ 
        status: 'pending_review', 
        postId, 
        message: 'Dada/Di, ektu flagged kora holo — admin review korbe.', 
        test: isBypass 
      });
    } catch (error) {
      console.error('Error creating pending community post:', error);
      return res.status(500).json({ message: 'Failed to create pending post' });
    }
  });

  // Admin moderation list - using Postgres storage
  app.get('/api/admin/list-pending', isAuthenticated, async (req: any, res) => {
    try {
      const pending = await storage.getPendingCommunityPosts();
      res.json(pending);
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      res.status(500).json({ message: 'Failed to fetch pending posts' });
    }
  });

  // Admin publish posts - using Postgres storage
  app.post('/api/admin/publish', async (req: any, res) => {
    const { postId, postIds, text } = req.body || {};
    const ids: string[] = postIds || (postId ? [postId] : []);
    const published: string[] = [];
    
    try {
      for (const id of ids) {
        const editedText = (text && id === postId) ? text : undefined;
        const approvedPost = await storage.approvePendingCommunityPost(id, editedText);
        if (approvedPost) {
          published.push(id);
        }
      }
      
      logEvent(req, 'publish', { count: published.length });
      res.json({ ok: true, published });
    } catch (error) {
      console.error('Error publishing posts:', error);
      res.status(500).json({ message: 'Failed to publish posts' });
    }
  });

  // Admin reject posts - using Postgres storage
  app.post('/api/admin/reject', async (req: any, res) => {
    const { postId, reason } = req.body || {};
    
    try {
      const success = await storage.rejectPendingCommunityPost(postId);
      if (!success) {
        return res.status(404).json({ message: 'Not found' });
      }
      
      logEvent(req, 'reject', { postId, reason: (reason||'').slice(0,140) });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error rejecting post:', error);
      res.status(500).json({ message: 'Failed to reject post' });
    }
  });

  // Admin delete posts - using Postgres storage
  app.post('/api/admin/delete', async (req: any, res) => {
    const { postId, postIds } = req.body || {};
    const ids: string[] = postIds || (postId ? [postId] : []);
    let deleted = 0;
    
    try {
      for (const id of ids) {
        const success = await storage.deletePendingCommunityPost(id);
        if (success) deleted++;
      }
      
      logEvent(req, 'delete', { deleted });
      res.json({ ok: true, deleted });
    } catch (error) {
      console.error('Error deleting posts:', error);
      res.status(500).json({ message: 'Failed to delete posts' });
    }
  });
  // Admin feature post - using Postgres storage
  app.post('/api/admin/feature', async (req: any, res) => {
    const { postId } = req.body || {};
    
    try {
      const success = await storage.featureCommunityPost(postId);
      if (!success) {
        return res.status(404).json({ message: 'Not found' });
      }
      
      logEvent(req, 'feature', { postId });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error featuring post:', error);
      res.status(500).json({ message: 'Failed to feature post' });
    }
  });

  // Reaction endpoint - using Postgres storage with deduplication
  const reactionTypes = new Set(['heart','laugh','thumbs']);
  app.post('/api/reaction', async (req: any, res) => {
    const { postId, type } = req.body || {};
    if (!postId || !type || !reactionTypes.has(type)) {
      return res.status(400).json({ message: 'Invalid reaction' });
    }

    const deviceId = req.deviceId || 'unknown';
    const ip = (req.ip || '').replace(/[:].*$/, '') || 'ipless';
    const deviceHash = deviceId.split('').reduce((h: number, c: string) => (Math.imul(h ^ c.charCodeAt(0), 16777619))>>>0, 2166136261).toString(36);
    const dedupeKey = `reaction:${postId}:${type}:${deviceHash}`;
    let duplicate = false;

    const testBypassToken2 = process.env.TEST_BYPASS_TOKEN;
    if (testBypassToken2 && req.headers['x-test-bypass'] === testBypassToken2) {
      // Test bypass - add reaction directly
      try {
        await storage.addReactionToCommunityPost(postId, type);
        logEvent(req, 'reaction_test', { postId, type });
        
        // Get updated feed to return current reactions
        const feed = await storage.getCommunityFeed();
        const post = feed.find(p => p.id === postId);
        return res.json({ ok: true, postId, reactions: post?.reactions || {}, test: true });
      } catch (error) {
        console.error('Error adding test reaction:', error);
        return res.status(500).json({ message: 'Failed to add reaction' });
      }
    }

    // Check for reaction deduplication
    if (upstashUrl && upstashToken) {
      try {
        const exists = await fetch(`${upstashUrl}/get/${encodeURIComponent(dedupeKey)}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
        const exJson = await exists.json().catch(()=>({}));
        if (exJson.result) duplicate = true; 
        else await fetch(`${upstashUrl}/set/${encodeURIComponent(dedupeKey)}/1?EX=${365*24*60*60}`, { headers: { Authorization: `Bearer ${upstashToken}` } });
      } catch (error) {
        console.warn('Upstash deduplication error:', error);
      }
    } else {
      // Use Postgres rate limiting for deduplication
      try {
        duplicate = await storage.checkRateLimit(dedupeKey);
        if (!duplicate) {
          await storage.setRateLimit(dedupeKey, 365 * 24 * 60 * 60 * 1000); // 1 year
        }
      } catch (error) {
        console.warn('Postgres deduplication error:', error);
      }
    }

    if (duplicate) {
      logEvent(req, 'reaction_duplicate', { postId, type, dedupeKey });
      return res.json({ ok: false, message: 'Already reacted' });
    }

    // Add reaction to post
    try {
      const success = await storage.addReactionToCommunityPost(postId, type);
      if (!success) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      logEvent(req, 'reaction_added', { postId, type });
      
      // Get updated reactions to return
      const feed = await storage.getCommunityFeed();
      const post = feed.find(p => p.id === postId);
      res.json({ ok: true, postId, reactions: post?.reactions || {} });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ message: 'Failed to add reaction' });
    }
  });

  // (Optional) expose last device logs (dev only)
  app.get('/api/admin/device-logs', (_req, res) => {
    res.json(deviceLogs.slice(-100));
  });
  // Health endpoint (lightweight): confirms server is up and AI key presence
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiReady: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Version endpoint: build info and diagnostics
  app.get('/api/version', async (_req, res) => {
    try {
      const versionInfo = {
        version: '1.0.0',
        buildTime: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        status: 'healthy',
        aiReady: Boolean(process.env.GEMINI_API_KEY)
      };
      res.json(versionInfo);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to get version info',
        status: 'unhealthy' 
      });
    }
  });

  // Readiness endpoint: verifies background caches warmed; never blocks startup
  app.get('/api/ready', (_req, res) => {
    try {
      const yt = youtubeService.getInfo();
      const tr = trendsService.getInfo();
      const ready = (yt.latest + yt.popular) > 0 && tr.items > 0;
      res.json({ ok: true, ready, yt, trends: tr, aiReady: Boolean(process.env.GEMINI_API_KEY) });
    } catch (e) {
      res.json({ ok: true, ready: false });
    }
  });

  // Start trends fetcher (BN/IN news & comedy viral)
  trendsService.start();

  // Daily greeting builder (always fresh per request)
  app.get("/api/greeting/today", async (_req, res) => {
    try {
      // Get latest trends
      const items = trendsService.getTop(8);
      const upbeat = items.filter(i => !i.isSomber);
      const somber = items.filter(i => i.isSomber);
  // Persist today’s items for variety across visits
  try { dailyDataService.mergeToday(items.map(i => ({ title: i.title, link: i.link, language: i.language, isSomber: i.isSomber })) as any); } catch {}

      // Build a safe prompt for Gemini; if no key, use local fallback
      const hasAI = Boolean(process.env.GEMINI_API_KEY);
      const topicLines = items.slice(0, 6).map((it, idx) => `${idx + 1}. [${it.language.toUpperCase()}] ${it.title}${it.isSomber ? ' (somber)' : ''}`).join('\n');
      const instructions = `
You are Bong Bot, Bengali family-friendly comedian. Task: craft a fresh, tiny greeting for today.
Constraints:
- 2 short sentences max, answer-first punchy humor. Keep it clean & family-safe.
- Language: Prefer Bengali (Bangla script) if trend titles include Bangla; else Benglish. Avoid heavy English.
- Humor rules: never joke about death/accidents/tragedies. If somber present, acknowledge softly in 1 clause, then pivot to light, positive everyday humor.
- Tone: witty, cultural (maa-chele, para, cha-fuchka), not cringe, not long.
- Occasionally add CTA like “subscribe/like” (20% chance); not every time.
Input trends (top 6):\n${topicLines}
Output format: JUST the 1–2 sentence greeting. No emojis unless fits naturally (<=1).`;

      let text = '';
      if (hasAI) {
        try {
          const out = await chatbotService.generateFreeform(instructions, { temperature: 0.8, maxOutputTokens: 120 });
          text = out || '';
        } catch {
          text = '';
        }
      }

      if (!text || typeof text !== 'string') {
        // Local safe fallback with more variety
        const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
        const daily = dailyDataService.getTodaySamples(4).map(s => s.title.replace(/[|:–—-].*$/, ''));
        const topic = daily[0] || upbeat[0]?.title || 'Kolkata vibe';
        const quips = [
          `Bikel bela moto—halka haowa, halka roast, full on hasi.`,
          `${topic.split(' ').slice(0,3).join(' ')} niye ekta choto mazaak?`,
          `Tension kom, ${topic.split(' ').slice(0,2).join(' ')} diye suru kori?`,
          `Mood high, ${topic.split(' ').slice(0,2).join(' ')} er upor ekto light fun!`,
          `Cha ready, kotha mishti—ajker topic: ${topic.split(' ').slice(0,3).join(' ')}.`
        ];
        const cta = Math.random() < 0.2 ? '—like/subscribe korle adda aro jambe!'
          : '';
        const base = somber.length
          ? `Ajker khobore kichu pojjolo bishoy ache—samman rekhe halka positive kotha boli. ${pick(quips)}`
          : pick(quips);
        text = `${base} ${cta}`.trim();
      }

  res.json({ text });
    } catch (e) {
      console.error('today greeting error', e);
  res.status(200).json({ text: 'Ajke positive thaki—halka roast, boro hasi.' });
    }
  });

  // Viral comedy/trends feed (safe)
  app.get("/api/trends", (_req, res) => {
    const items = trendsService.getTop(20);
    res.json({ items });
  });
  // Built-in fallback videos to avoid empty UI
  const fallbackVideos = [
    { videoId: 'pdjQpcVqxMU', title: 'Bong Bari Comedy Short 1', thumbnail: 'https://img.youtube.com/vi/pdjQpcVqxMU/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
    { videoId: '8gdxQ_dgFv8', title: 'Bong Bari Comedy Short 2', thumbnail: 'https://img.youtube.com/vi/8gdxQ_dgFv8/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
    { videoId: 'rGOvg5PJtXA', title: 'Bong Bari Comedy Short 3', thumbnail: 'https://img.youtube.com/vi/rGOvg5PJtXA/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
    { videoId: 'Gyo_QpZQuPU', title: 'Bong Bari Comedy Short 4', thumbnail: 'https://img.youtube.com/vi/Gyo_QpZQuPU/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
    { videoId: 'GJfHWL0ro_A', title: 'Bong Bari Comedy Short 5', thumbnail: 'https://img.youtube.com/vi/GJfHWL0ro_A/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
    { videoId: 'NRdGq7Ncqw0', title: 'Bong Bari Comedy Short 6', thumbnail: 'https://img.youtube.com/vi/NRdGq7Ncqw0/hqdefault.jpg', publishedAt: '2024-01-01T00:00:00Z' },
  ];
  // Apply global security middleware
  app.use(securityHeaders);
  app.use(trackRequests);
  // app.use(rateLimit(1000, 60000)); // Rate limiting removed permanently
  app.use(sanitizeBody); // Sanitize all request bodies
  // Removed legacy /public-objects route (Replit Object Storage)

  // Authentication routes with enhanced security
  app.post("/api/auth/login", async (req, res) => { // No rate limiting
    try {
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      
      // No brute force protection - removed permanently
      
      const { username, password } = insertUserSchema.parse(req.body);
      let user = await storage.getUserByUsername(username);

      // Auto-bootstrap admin if missing and correct env password provided
      const adminEnvPass = process.env.ADMIN_PASSWORD || 'bongbari2025';
      if (!user && username === 'admin' && password === adminEnvPass) {
        try {
          user = await storage.createUser({ username: 'admin', password: adminEnvPass });
          console.log('✅ Admin auto-created on login');
        } catch (e) {
          // continue; maybe a race, will try to read again
          user = await storage.getUserByUsername(username);
        }
      }

      // Accept either DB password match or ADMIN_PASSWORD override for admin
      const validPassword = user && (
        user.password === password || (username === 'admin' && password === adminEnvPass)
      );

      if (!user || !validPassword) {
        // No failed login recording
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Clear failed attempts on successful login
      // No login attempt tracking
      
      // Create session
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessions.set(sessionId, {
        username: user.username,
        createdAt: new Date()
      });
      
      // Generate CSRF token for this session
      const csrfToken = generateCSRFToken(sessionId);
      
      res.json({ sessionId, username: user.username, csrfToken });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", isAuthenticated, (req: any, res) => {
    res.json({ username: req.user.username });
  });
  
  // Get CSRF token for authenticated users
  app.get("/api/auth/csrf-token", isAuthenticated, (req: any, res) => {
    const sessionId = req.sessionId;
    if (!sessionId) {
      return res.status(401).json({ message: "No session found" });
    }
    const csrfToken = generateCSRFToken(sessionId);
    res.json({ csrfToken });
  });

  // Create initial admin user if none exists
  app.post("/api/auth/create-admin", async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername('admin');
      if (existingUser) {
        return res.status(400).json({ message: "Admin user already exists" });
      }
      
      const adminUser = await storage.createUser({
        username: 'admin',
        password: 'bongbari2025'
      });
      
      res.json({ message: "Admin user created", username: adminUser.username });
    } catch (error) {
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Create new admin user (protected)
  app.post("/api/auth/create-user", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser({ username, password });
      
      res.json({ message: "User created successfully", username: newUser.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Helper: fetch YouTube channel uploads via RSS (no API key)
  async function fetchLatestFromRSS(channelId: string) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const xml = await new Promise<string>((resolve, reject) => {
      https.get(url, (r) => {
        let data = '';
        r.on('data', (c) => (data += c));
        r.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const json = await parseStringPromise(xml);
    const entries = json.feed?.entry || [];
    return entries.slice(0, 6).map((e: any) => {
      const videoId = e['yt:videoId']?.[0];
      return {
        videoId,
        title: e.title?.[0],
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: e.published?.[0],
      };
    });
  }

  // YouTube - Latest videos from background cache
    app.get("/api/youtube/latest", async (req, res) => {
    try {
        const channelId = (req.query.channelId as string) || process.env.YOUTUBE_CHANNEL_ID;
        if (!channelId) {
          console.warn('[express] YOUTUBE_CHANNEL_ID not set; YouTube sections will be empty.');
          return res.json([]);
        }
        // Ensure background fetcher is running for this channel, then refresh now
    youtubeService.start(channelId);
    await youtubeService.forceRefresh();
    const items = youtubeService.getLatest(3);
    return res.json(items.length ? items : fallbackVideos.slice(0, 3));
    } catch (error) {
      console.error('YouTube RSS Error (Latest):', error);
        res.status(200).json([]);
    }
  });

  // YouTube - Popular videos from background cache
    app.get("/api/youtube/popular", async (req, res) => {
    try {
        const channelId = (req.query.channelId as string) || process.env.YOUTUBE_CHANNEL_ID;
        if (!channelId) {
          console.warn('[express] YOUTUBE_CHANNEL_ID not set; YouTube sections will be empty.');
          return res.json([]);
        }
        // Ensure background fetcher is running for this channel, then refresh now
    youtubeService.start(channelId);
    await youtubeService.forceRefresh();
    const items = youtubeService.getPopular(3);
    return res.json(items.length ? items : fallbackVideos.slice(3, 6));
    } catch (error) {
      console.error('YouTube RSS Error (Popular):', error);
        res.status(200).json([]);
    }
  });

  // Manual refresh endpoint (useful during development)
  app.post("/api/youtube/refresh", async (_req, res) => {
    try {
      await youtubeService.forceRefresh();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false });
    }
  });

  // Blog routes
  app.post("/api/blog", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const blogData = insertBlogPostSchema.parse(req.body);
      const newPost = await storage.createBlogPost(blogData);
      res.json(newPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  // Meme generation and admin review routes (Phase 1)
  // Admin: generate today's meme ideas
  app.post('/api/memes/generate', isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const count = Math.max(1, Math.min(8, Number(req.body?.count) || 5));
      const language = (req.body?.language as any) || 'auto';
      const items = await memeService.generateForToday(count, language);
      res.json({ dateKey: new Date().toISOString().slice(0, 10), items });
    } catch (e) {
      console.error('meme generate error', e);
      res.status(500).json({ error: 'Failed to generate meme ideas' });
    }
  });

  // Admin: list today or by date with optional status filter
  app.get('/api/memes', isAuthenticated, async (req, res) => {
    try {
      const dateKey = String(req.query.dateKey || '').trim();
      const status = String(req.query.status || '').trim() as any;
      const items = dateKey ? memeService.getByDate(dateKey, status) : memeService.getToday(status);
      res.json({ dateKey: dateKey || new Date().toISOString().slice(0,10), items });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch memes' });
    }
  });

  // Admin: update meme idea (edit text/status/language)
  app.put('/api/memes/:id', isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const patch: any = {};
      if (typeof req.body?.idea === 'string') patch.idea = String(req.body.idea);
      if (req.body?.status && ['draft','edited','approved','published'].includes(req.body.status)) patch.status = req.body.status;
      if (req.body?.language && ['bn','en','auto'].includes(req.body.language)) patch.language = req.body.language;
      const updated = memeService.update(id, patch);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update meme' });
    }
  });

  // Admin: publish
  app.post('/api/memes/:id/publish', isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = memeService.publish(id);
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to publish meme' });
    }
  });

  // Public: latest published feed
  app.get('/api/memes/public', async (_req, res) => {
    try {
      const items = memeService.getPublic(30);
      res.json({ items });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch public memes' });
    }
  });

  app.get("/api/blog", async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.get("/api/blog/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.post("/api/blog", async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.put("/api/blog/:id", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(id, validatedData);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/:id", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBlogPost(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Collaboration request routes (protected)
  app.get("/api/collaboration-requests", isAuthenticated, async (req, res) => {
    try {
      // Get query parameters for filtering
      const { leadStatus, opened } = req.query;
      const requests = await storage.getCollaborationRequests({ leadStatus, opened });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaboration requests" });
    }
  });

  // Mark lead as opened
  app.put("/api/collaboration-requests/:id/open", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.markLeadAsOpened(id);
      if (!updated) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error marking lead as opened:", error);
      res.status(500).json({ message: "Failed to mark lead as opened" });
    }
  });

  // Update lead status
  app.put("/api/collaboration-requests/:id/status", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const { leadStatus } = req.body;
      
      if (!['new', 'hot', 'warm', 'cold', 'dead'].includes(leadStatus)) {
        return res.status(400).json({ message: "Invalid lead status" });
      }
      
      const updated = await storage.updateLeadStatus(id, leadStatus);
      if (!updated) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Update follow-up notes
  app.put("/api/collaboration-requests/:id/follow-up", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { id } = req.params;
      const { followUpNotes } = req.body;
      
      const updated = await storage.updateFollowUpNotes(id, followUpNotes);
      if (!updated) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating follow-up notes:", error);
      res.status(500).json({ message: "Failed to update follow-up notes" });
    }
  });

  // Export leads (Multiple formats)
  app.get("/api/collaboration-requests/export", isAuthenticated, async (req, res) => {
    try {
      const { leadStatus, ids, format = 'csv' } = req.query;
      const filters: any = {};
      
      if (leadStatus) filters.leadStatus = leadStatus as string;
      if (ids) filters.ids = Array.isArray(ids) ? ids as string[] : [ids as string];
      
      const requests = await storage.getCollaborationRequests(filters);
      
      // Format data for export
      const exportData = requests.map(r => ({
        ID: r.id,
        Name: r.name,
        Email: r.email || '',
        Phone: r.phone || '',
        Company: r.company,
        Message: r.message || '',
        Status: r.status,
        'Lead Status': r.leadStatus || 'new',
        Opened: r.opened ? 'Yes' : 'No',
        'Created Date': r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
        'Opened Date': r.openedAt ? new Date(r.openedAt).toLocaleString() : '',
        'Follow-up Notes': r.followUpNotes || ''
      }));
      
      const formatString = String(format);
      if (formatString === 'xlsx' || formatString === 'excel') {
        // Excel export
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
        
        // Style the header row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const address = XLSX.utils.encode_col(C) + '1';
          if (!worksheet[address]) continue;
          worksheet[address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFCC00' } }
          };
        }
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.xlsx"`);
        res.send(buffer);
        
      } else if (formatString === 'pdf') {
        // PDF export
        const doc = new jsPDF({ orientation: 'landscape' });
        
        // Add title
        doc.setFontSize(18);
        doc.text('Collaboration Leads Export', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
        doc.text(`Total Leads: ${exportData.length}`, 14, 28);
        
        // Prepare table data
  const headers = Object.keys(exportData[0] || {});
  const rows = exportData.map(item => headers.map(key => (item as Record<string, any>)[key]));
        
        // Add table
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 35,
          theme: 'grid',
          headStyles: { 
            fillColor: [255, 204, 0], // Brand yellow
            textColor: [0, 0, 0]
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 20 }, // ID
            1: { cellWidth: 25 }, // Name
            2: { cellWidth: 30 }, // Email
            3: { cellWidth: 25 }, // Phone
            4: { cellWidth: 25 }, // Company
            5: { cellWidth: 40 }, // Message
            6: { cellWidth: 15 }, // Status
            7: { cellWidth: 15 }, // Lead Status
            8: { cellWidth: 12 }, // Opened
            9: { cellWidth: 25 }, // Created Date
            10: { cellWidth: 25 }, // Opened Date
            11: { cellWidth: 35 }  // Follow-up Notes
          }
        });
        
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
        
      } else {
        // CSV export (default)
        const csvHeader = Object.keys(exportData[0] || {}).join(',') + '\n';
        const csvRows = exportData.map(row => 
          Object.values(row).map(val => 
            typeof val === 'string' && val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',')
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
        res.send(csvHeader + csvRows);
      }
    } catch (error) {
      console.error("Error exporting leads:", error);
      res.status(500).json({ message: "Failed to export leads" });
    }
  });


  // Chatbot API routes
  app.get("/api/ai/ready", async (req, res) => {
    const health = await chatbotService.checkAIReady().catch(() => ({ ok: false, aiKeyPresent: Boolean(process.env.GEMINI_API_KEY) }));
    res.json({ ok: health.ok, aiReady: health.ok, aiKeyPresent: health.aiKeyPresent });
  });

  // Rate limiting for chatbot (3 questions per device per day for anonymous users)
  const chatbotRateLimit = new Map<string, { count: number, resetTime: number }>();
  
  function checkChatbotRateLimit(deviceId: string, isAuthenticated: boolean): { allowed: boolean, remaining: number } {
    // Authenticated users have unlimited access
    if (isAuthenticated) {
      return { allowed: true, remaining: -1 };
    }

    const now = Date.now();
    const dailyResetTime = new Date().setHours(24, 0, 0, 0); // Reset at midnight
    
    let userLimit = chatbotRateLimit.get(deviceId);
    
    // Reset if past midnight
    if (!userLimit || now >= userLimit.resetTime) {
      userLimit = { count: 0, resetTime: dailyResetTime };
      chatbotRateLimit.set(deviceId, userLimit);
    }
    
    const maxQuestions = 3;
    const remaining = Math.max(0, maxQuestions - userLimit.count);
    
    if (userLimit.count >= maxQuestions) {
      return { allowed: false, remaining: 0 };
    }
    
    return { allowed: true, remaining: remaining - 1 }; // -1 because we're about to use one
  }

  app.post("/api/chatbot/message", async (req, res) => {
    try {
      // Extract device ID and check authentication
      const deviceId = getDeviceIdFromReq(req);
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const isAuthenticated = sessionId && sessions.has(sessionId);
      
      // Check rate limit
      const rateCheck = checkChatbotRateLimit(deviceId, !!isAuthenticated);
      
      if (!rateCheck.allowed) {
        return res.status(429).json({ 
          error: "Daily limit reached", 
          message: "You've used your 3 questions today! Sign up with Google for unlimited chat or check our FAQ page.",
          remaining: 0,
          needsAuth: true,
          faqUrl: "/faq"
        });
      }
      
      const { message, conversationHistory = [], aiOnly: aiOnlyBody } = req.body || {};
      const aiOnly = String(req.query.aiOnly || '').trim() === '1' || Boolean(aiOnlyBody);
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // SECURITY: Input moderation for Gemini API compliance
      const moderationResult = await analyzeStory(message);
      if (moderationResult.decision === 'rejected') {
        return res.status(400).json({
          error: "Content policy violation",
          message: "Content doesn't meet our family-friendly guidelines. Please try a different question!",
          moderationReason: moderationResult.reason,
          flags: moderationResult.flags
        });
      }

  let response = '';
      try {
        response = await chatbotService.generateResponse(message, conversationHistory, { allowFallback: !aiOnly });
      } catch (e) {
        console.error('generateResponse failed, using fallback', e);
        response = aiOnly ? '' : chatbotService.getFallback(message);
      }

      // SECURITY: Output sanitization for Gemini API compliance
      if (response) {
        const outputModeration = await analyzeStory(response);
        if (outputModeration.decision === 'rejected') {
          console.warn('Gemini output rejected by moderation:', { 
            input: message, 
            output: response, 
            flags: outputModeration.flags,
            reason: outputModeration.reason 
          });
          response = chatbotService.getFallback(message); // Use safe fallback
        }
      }

      if (!response || typeof response !== 'string' || response.trim().length === 0) {
        response = aiOnly ? '' : chatbotService.getFallback(message);
      }

      // Determine if AI produced this response
      const aiInfo = chatbotService.getLastAiInfo();
      const usedAI = aiInfo.source !== 'none';

      // Allow greeting templates even in aiOnly mode
      const isGreeting = /\b(hi|hello|hey|yo)\b/i.test(message) || /নমস্কার|হ্যালো|ওই|হাই/.test(message);

      if (aiOnly && !usedAI && !isGreeting && (!response || response.trim().length === 0)) {
        // Instead of leaving the user hanging, return a clear CTA to contact the team
        const contactFallback = "Sorry, AI is busy right now. Email team@bongbari.com or use the contact form: /work-with-us#form";
        return res.status(200).json({ response: contactFallback, usedAI: false, aiInfo });
      }

      // Save chat message to database for authenticated users
      if (isAuthenticated) {
        try {
          const session = sessions.get(sessionId!);
          const userEmail = session?.googleUser?.email || session?.username;
          
          if (userEmail) {
            // Get or create Google user
            let googleUser = await storage.getGoogleUserByEmail(userEmail);
            if (!googleUser && session?.googleUser) {
              googleUser = await storage.createGoogleUser({
                googleId: userEmail,
                email: userEmail,
                name: session.googleUser.name || 'User',
                pictureUrl: session.googleUser.picture
              });
            }
            
            if (googleUser) {
              // Create or get active chat session
              const chatSession = await storage.createChatSession({
                userId: googleUser.id,
                deviceFingerprint: deviceId
              });
              
              // Save user message
              await storage.saveChatMessage({
                sessionId: chatSession.id,
                userId: googleUser.id,
                message: message,
                response: response,
                isUserMessage: true,
                messageType: 'chat'
              });
              
              // Save bot response
              await storage.saveChatMessage({
                sessionId: chatSession.id,
                userId: googleUser.id,
                message: message,
                response: response,
                isUserMessage: false,
                messageType: 'chat'
              });
            }
          }
        } catch (error) {
          console.error('Failed to save chat message:', error);
          // Continue without failing the request
        }
      }
      
      // Increment rate limit counter for anonymous users
      if (!isAuthenticated) {
        const userLimit = chatbotRateLimit.get(deviceId);
        if (userLimit) {
          userLimit.count += 1;
          chatbotRateLimit.set(deviceId, userLimit);
        }
      }

      res.json({ 
        response,
        usedAI,
        aiInfo,
        timestamp: new Date().toISOString(),
        rateLimit: {
          remaining: isAuthenticated ? -1 : Math.max(0, 3 - (chatbotRateLimit.get(deviceId)?.count || 0)),
          isAuthenticated,
          needsAuth: !isAuthenticated && (chatbotRateLimit.get(deviceId)?.count || 0) >= 2 // Show auth prompt on 3rd question
        }
      });
    } catch (error) {
      console.error('Chatbot API error:', error);
      // In aiOnly mode, don't send local fallback; tell client to keep waiting
      const aiOnly = String(req.query.aiOnly || '').trim() === '1' || Boolean(req.body?.aiOnly);
      if (aiOnly) {
        return res.status(202).json({ pending: true, usedAI: false, aiInfo: chatbotService.getLastAiInfo() });
      }
      const safe = chatbotService.getFallback(req.body?.message || 'hello');
      res.status(200).json({ response: safe, usedAI: false, aiInfo: chatbotService.getLastAiInfo(), timestamp: new Date().toISOString() });
    }
  });

  // Get chat history for authenticated users
  app.get("/api/chatbot/history", async (req, res) => {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '');
      const isAuthenticated = sessionId && sessions.has(sessionId);
      
      if (!isAuthenticated) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const session = sessions.get(sessionId!);
      const userEmail = session?.googleUser?.email || session?.username;
      
      if (!userEmail) {
        return res.status(400).json({ error: "User email not found" });
      }
      
      const googleUser = await storage.getGoogleUserByEmail(userEmail);
      if (!googleUser) {
        return res.json({ messages: [] });
      }
      
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit)) || 20));
      const messages = await storage.getChatHistory(googleUser.id, limit);
      
      res.json({ 
        messages: messages.reverse(), // Show oldest first
        user: { name: googleUser.name, email: googleUser.email },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat history error:', error);
      res.status(500).json({ error: "Failed to get chat history" });
    }
  });

  app.post("/api/chatbot/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const results = await chatbotService.searchWeb(query);
      
      res.json({ 
        results,
        query,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot search error:', error);
      res.status(500).json({ 
        error: "অনুসন্ধান করতে সমস্যা হচ্ছে। (Having trouble with search.)"
      });
    }
  });

  app.get("/api/chatbot/tips", async (req, res) => {
    try {
      const tips = await chatbotService.getBengaliComedyTips();
      
      res.json({ 
        tips,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot tips error:', error);
      res.status(500).json({ 
        error: "টিপস দিতে সমস্যা হচ্ছে। (Having trouble providing tips.)"
      });
    }
  });

  // Google OAuth initiate - redirect to Google
  app.get("/api/auth/google", async (req, res) => {
    try {
      if (!GoogleAuthService.isConfigured()) {
        return res.status(500).json({ error: "Google OAuth not configured" });
      }
      
      const authUrl = GoogleAuthService.getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Google OAuth redirect error:', error);
      res.status(500).json({ error: "Failed to initiate Google OAuth" });
    }
  });

  // Google OAuth callback - handle response from Google
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/login?error=oauth_error&message=' + encodeURIComponent('Google authentication failed'));
      }
      
      if (!code || typeof code !== 'string') {
        return res.redirect('/login?error=missing_code&message=' + encodeURIComponent('Authorization code missing'));
      }

      // Exchange code for user info
      const googleUser = await GoogleAuthService.getUserInfo(code);
      
      // Create session for this Google user
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Store Google user in database
      try {
        await storage.createGoogleUser({
          googleId: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          pictureUrl: googleUser.picture || 'https://via.placeholder.com/40',
          newsletterOptIn: true // Auto opt-in to newsletter as per terms
        });
      } catch (error) {
        // User might already exist, that's fine
        console.log('Google user already exists or creation failed:', error);
      }
      
      sessions.set(sessionId, {
        username: googleUser.email,
        googleUser: { 
          email: googleUser.email, 
          name: googleUser.name, 
          picture: googleUser.picture 
        },
        createdAt: new Date()
      });
      
      // Generate CSRF token for the session
      const csrfToken = generateCSRFToken(sessionId);
      
      // Redirect to frontend with session data
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `https://www.bongbari.com/login?success=true&sessionId=${sessionId}&csrfToken=${csrfToken}&user=${encodeURIComponent(JSON.stringify(googleUser))}`
        : `http://localhost:5173/login?success=true&sessionId=${sessionId}&csrfToken=${csrfToken}&user=${encodeURIComponent(JSON.stringify(googleUser))}`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/login?error=callback_error&message=' + encodeURIComponent('Authentication failed'));
    }
  });

  // Google OAuth for chatbot access (legacy endpoint for frontend compatibility)
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, email, name, picture } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Google user email is required" });
      }

      // Create session for this Google user
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Store Google user in database
      try {
        await storage.createGoogleUser({
          googleId: email, // Use email as Google ID for demo compatibility
          email: email,
          name: name || 'Comedy Lover',
          pictureUrl: picture || 'https://via.placeholder.com/40',
          newsletterOptIn: true // Auto opt-in to newsletter
        });
      } catch (error) {
        // User might already exist, that's fine
        console.log('Google user already exists or creation failed:', error);
      }
      
      sessions.set(sessionId, {
        username: email,
        googleUser: { email, name, picture },
        createdAt: new Date()
      });
      
      // Generate CSRF token for the session
      const csrfToken = generateCSRFToken(sessionId);
      
      res.json({
        success: true,
        sessionId,
        csrfToken,
        username: email,
        chatbotAccess: "unlimited"
      });
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Check authentication status
  app.get("/api/auth/me", async (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessionId ? sessions.get(sessionId) : null;
    
    if (!session) {
      return res.status(401).json({ authenticated: false });
    }
    
    // Check if session is expired (24 hours)
    const isExpired = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000;
    if (isExpired && sessionId) {
      sessions.delete(sessionId);
      return res.status(401).json({ authenticated: false });
    }
    
    res.json({
      authenticated: true,
      username: session.username,
      chatbotAccess: "unlimited"
    });
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionId) {
      sessions.delete(sessionId);
    }
    
    res.json({ success: true });
  });

  app.post("/api/collaboration-requests", async (req, res) => {
    try {
      const validatedData = insertCollaborationRequestSchema.parse(req.body);
      
      // Save request directly without verification - clean up the data types
      const requestData = {
        name: validatedData.name,
        company: validatedData.company,
        email: validatedData.email,
        phone: validatedData.phone,
        message: validatedData.message,
        status: 'submitted'
      };
      
      const request = await storage.createCollaborationRequest(requestData);
      
      res.status(201).json({ 
        message: "Collaboration request submitted successfully! We'll get back to you soon.",
        id: request.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaboration request data", errors: error.errors });
      }
      console.error('Collaboration request error:', error);
      res.status(500).json({ message: "Failed to submit collaboration request" });
    }
  });

  // 🤖 ADMIN PANEL - CHATBOT TRAINING MANAGEMENT
  app.get("/api/admin/chatbot-training", isAuthenticated, async (req, res) => {
    try {
      const training = await storage.getAllChatbotTraining();
      res.json(training);
    } catch (error) {
      console.error("Error fetching chatbot training:", error);
      res.status(500).json({ message: "Failed to fetch chatbot training data" });
    }
  });

  app.post("/api/admin/chatbot-training", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const trainingData = req.body;
      const newTraining = await storage.createChatbotTraining(trainingData);
      res.json(newTraining);
    } catch (error) {
      console.error("Error creating chatbot training:", error);
      res.status(500).json({ message: "Failed to create chatbot training" });
    }
  });

  app.put("/api/admin/chatbot-training/:id", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateChatbotTraining(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Training data not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating chatbot training:", error);
      res.status(500).json({ message: "Failed to update chatbot training" });
    }
  });

  app.delete("/api/admin/chatbot-training/:id", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChatbotTraining(id);
      if (!deleted) {
        return res.status(404).json({ message: "Training data not found" });
      }
      res.json({ message: "Training data deleted successfully" });
    } catch (error) {
      console.error("Error deleting chatbot training:", error);
      res.status(500).json({ message: "Failed to delete chatbot training" });
    }
  });

  // 📝 ADMIN PANEL - CHATBOT TEMPLATES MANAGEMENT
  app.get("/api/admin/chatbot-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllChatbotTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching chatbot templates:", error);
      res.status(500).json({ message: "Failed to fetch chatbot templates" });
    }
  });

  app.post("/api/admin/chatbot-templates", isAuthenticated, async (req, res) => {
    try {
      // Handle cases where body might be a string or improperly parsed
      const raw = (req as any).body;
      let body: any = raw;
      if (typeof raw === 'string') {
        try { body = JSON.parse(raw); } catch { body = {}; }
      }

      const payload = {
        name: typeof body?.name === 'string' ? body.name.trim() : '',
        templateType: typeof body?.templateType === 'string' ? body.templateType.trim() : 'quick_reply',
        content: typeof body?.content === 'string' ? body.content : '',
        language: typeof body?.language === 'string' ? body.language : 'auto',
        isActive: typeof body?.isActive === 'boolean' ? body.isActive : true,
        displayOrder: Number.isFinite(Number(body?.displayOrder)) ? Number(body.displayOrder) : 1,
        // validFrom/validTo managed by DB defaults unless explicitly added later
      } as any;

      if (!payload.name || !payload.content) {
        return res.status(400).json({ message: 'name and content are required' });
      }

      // Upsert by (templateType, displayOrder)
      const existingList = await storage.getAllChatbotTemplates();
      const match = existingList.find(
        (t: any) => t.templateType === payload.templateType && (t.displayOrder ?? 1) === payload.displayOrder
      );
      if (match) {
        const updated = await storage.updateChatbotTemplate(match.id, payload);
        return res.json(updated);
      }
      const created = await storage.createChatbotTemplate(payload);
      res.json(created);
    } catch (error) {
      console.error("Error creating chatbot template:", error);
      res.status(500).json({ message: "Failed to create chatbot template" });
    }
  });

  app.put("/api/admin/chatbot-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateChatbotTemplate(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating chatbot template:", error);
      res.status(500).json({ message: "Failed to update chatbot template" });
    }
  });

  app.delete("/api/admin/chatbot-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChatbotTemplate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting chatbot template:", error);
      res.status(500).json({ message: "Failed to delete chatbot template" });
    }
  });

  // Public templates endpoint for BongBot
  app.get("/api/chatbot/templates", async (req, res) => {
    try {
      const templates = await storage.getAllChatbotTemplates();
      const type = String((req.query.type || 'quick_reply')).trim();
      // Filter active templates by requested type, dedupe by displayOrder taking latest
      const filtered = templates.filter(t => t.isActive && t.templateType === (type === 'greeting' ? 'greeting' : 'quick_reply'));
      const byOrder = new Map<number, any>();
      for (const t of filtered) {
        const order = (t.displayOrder ?? 1) as number;
        const prev = byOrder.get(order);
        const prevTs = prev ? (new Date(prev.updatedAt || prev.createdAt || 0)).getTime() : -1;
        const curTs = (new Date((t as any).updatedAt || (t as any).createdAt || 0)).getTime();
        if (!prev || curTs >= prevTs) {
          byOrder.set(order, t);
        }
      }
      let activeTemplates = Array.from(byOrder.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, t]) => ({
          id: t.id,
          name: t.name,
          content: t.content,
          displayOrder: t.displayOrder,
          isActive: t.isActive,
          templateType: t.templateType
        }));
      if (type !== 'greeting') {
        activeTemplates = activeTemplates.slice(0, 3);
      }
      
      res.json(activeTemplates);
    } catch (error) {
      console.error("Error fetching public chatbot templates:", error);
      res.status(500).json({ message: "Failed to fetch chatbot templates" });
    }
  });

  // 🏠 ADMIN PANEL - HOMEPAGE CONTENT MANAGEMENT
  app.get("/api/admin/homepage-content", isAuthenticated, async (req, res) => {
    try {
      const content = await storage.getAllHomepageContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching homepage content:", error);
      res.status(500).json({ message: "Failed to fetch homepage content" });
    }
  });

  app.get("/api/homepage-content/active", async (req, res) => {
    try {
      const content = await storage.getActiveHomepageContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching active homepage content:", error);
      res.status(500).json({ message: "Failed to fetch homepage content" });
    }
  });

  app.post("/api/admin/homepage-content", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const contentData = req.body;
      const newContent = await storage.createHomepageContent(contentData);
      res.json(newContent);
    } catch (error) {
      console.error("Error creating homepage content:", error);
      res.status(500).json({ message: "Failed to create homepage content" });
    }
  });

  app.put("/api/admin/homepage-content/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateHomepageContent(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating homepage content:", error);
      res.status(500).json({ message: "Failed to update homepage content" });
    }
  });

  app.delete("/api/admin/homepage-content/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHomepageContent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting homepage content:", error);
      res.status(500).json({ message: "Failed to delete homepage content" });
    }
  });

  // ⚙️ ADMIN PANEL - SETTINGS MANAGEMENT
  app.get("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getAllAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.get("/api/public-settings", async (req, res) => {
    try {
      const settings = await storage.getPublicSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Failed to fetch public settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const settingData = req.body;
      const newSetting = await storage.setAdminSetting(settingData);
      res.json(newSetting);
    } catch (error) {
      console.error("Error setting admin setting:", error);
      res.status(500).json({ message: "Failed to set admin setting" });
    }
  });

  app.delete("/api/admin/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      const deleted = await storage.deleteAdminSetting(key);
      if (!deleted) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin setting:", error);
      res.status(500).json({ message: "Failed to delete admin setting" });
    }
  });


  // 🎨 BANNER API - Get banner data from database
  app.get("/api/homepage-banner", async (req, res) => {
    try {
      // Get banner from homepage content table
      const bannerContent = await storage.getHomepageContentByType("banner");
      const banner = bannerContent.find(c => c.isActive);
      
      if (banner) {
        res.json({
          title: banner.title || "বং বাড়ি",
          subtitle: banner.content || "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প",
          bannerImage: banner.imageUrl || ""
        });
      } else {
        // Return default if no banner found
        res.json({
          title: "বং বাড়ি",
          subtitle: "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প",
          bannerImage: ""
        });
      }
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Failed to fetch banner data" });
    }
  });

  app.post("/api/homepage-banner", isAuthenticated, validateCSRF, async (req, res) => {
    try {
      const { title, subtitle, bannerImage } = req.body;
      
      // Get existing banner or create new one
      const existingBanners = await storage.getHomepageContentByType("banner");
      const existingBanner = existingBanners.find(b => b.isActive);
      
      if (existingBanner) {
        // Update existing banner
        await storage.updateHomepageContent(existingBanner.id, {
          title,
          content: subtitle,
          imageUrl: bannerImage
        });
      } else {
        // Create new banner
        await storage.createHomepageContent({
          sectionType: "banner",
          title,
          content: subtitle,
          imageUrl: bannerImage,
          isActive: true,
          displayOrder: 1
        });
      }
      
      console.log("✅ Banner saved to database:", { title, subtitle, bannerImage });
      res.json({ 
        message: "Banner updated successfully",
        data: { title, subtitle, bannerImage }
      });
    } catch (error) {
      console.error("❌ Error saving banner:", error);
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
