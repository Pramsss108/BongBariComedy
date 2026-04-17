import { Router } from 'express';
import crypto from 'crypto';
import { pgDb } from '../db.pg';
import { nglUsers, nglMessages, nglBlockedFingerprints } from '../../shared/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { generateOtp, hashOtp, verifyOtp, otpExpiryDate, validatePhone, maskPhone, MAX_OTP_ATTEMPTS } from '../lib/otp';
import { sendWhatsAppOtp, devLogOtp } from '../lib/whatsapp';
import { containsBlockedWord } from '../lib/ngl-blocked-words';

// ──────────────────────────────────────────────────────────
// Phase 1: Data types & storage (Postgres primary, in-memory fallback)
// ──────────────────────────────────────────────────────────

const USE_PG = !!pgDb;

interface NglUserMem {
  username: string;
  prompt: string;
  secretKeyHash: string;
  pinHash: string | null;
  theme: string;
  photo: string | null;
  messageCount: number;
  streakDays: number;
  lastMessageDay: string | null;
  // Phase 35: OTP phone verification
  phone: string | null;
  phoneVerified: number;
  otpHash: string | null;
  otpExpiry: number | null; // epoch ms
  // Phase 40: Custom OG meta
  ogTitle: string | null;
  ogDescription: string | null;
  createdAt: number;
}

interface NglMessageMem {
  id: string;
  recipientUsername: string;
  text: string;
  emoji: string;
  reaction: string | null;
  senderLang: string | null;
  senderTz: string | null;
  senderDevice: string | null;
  senderBrowser: string | null;
  senderOs: string | null;
  senderCity: string | null;
  senderRegion: string | null;
  senderCountry: string | null;
  senderIsp: string | null;
  senderScreenRes: string | null;
  senderConnectionType: string | null;
  senderBatteryLevel: string | null;
  senderDarkMode: string | null;
  senderReferrer: string | null;
  senderLocalTime: string | null;
  senderFingerprint: string | null;
  pinned: number;
  createdAt: number;
}

// In-memory fallback stores (only used when DATABASE_URL is not set)
const memUsers = new Map<string, NglUserMem>();
const memMessages: NglMessageMem[] = [];
// B2: in-memory blocked fingerprints fallback — Map<username, Set<fingerprintHash>>
const memBlockedFingerprints = new Map<string, Set<string>>();
const MAX_USERS = 2000;
const MAX_MESSAGES = 10000;
const MAX_MSG_PER_USER = 500;
const MAX_TEXT = 500;

// Rate limiters (always in-memory, that's fine)
const createRateMap = new Map<string, number>();
const sendRateMap = new Map<string, number>();
const otpRateMap = new Map<string, number>();
const otpAttemptMap = new Map<string, number>(); // brute-force lockout: track verify attempts per user
const CREATE_COOLDOWN = 30_000;
const SEND_COOLDOWN = 8_000;
const OTP_COOLDOWN = 60_000; // 1 min between OTP requests per user

// B5: Periodic rate-limit map cleanup.
// Prevents unbounded memory growth on Oracle VM (503MB RAM total).
// Every 5 minutes, prune entries older than 1 hour.
const RATE_MAP_TTL = 60 * 60 * 1000; // 1 hour
const RATE_MAP_SWEEP = 5 * 60 * 1000; // 5 min
function pruneRateMap(m: Map<string, number>, ttl: number) {
  const now = Date.now();
  m.forEach((ts, k) => {
    if (now - ts > ttl) m.delete(k);
  });
}
setInterval(() => {
  pruneRateMap(createRateMap, RATE_MAP_TTL);
  pruneRateMap(sendRateMap, RATE_MAP_TTL);
  pruneRateMap(otpRateMap, RATE_MAP_TTL);
  // otpAttemptMap entries self-clear on success/lockout; prune conservatively
  if (otpAttemptMap.size > 500) otpAttemptMap.clear();
}, RATE_MAP_SWEEP).unref?.();

// B2: Compute a per-sender fingerprint from IP + User-Agent.
// Hashed so the raw IP is never stored. Collisions are acceptable
// since the feature is a soft-block; determined attackers can rotate.
function computeSenderFingerprint(ip: string, ua: string): string {
  const clean = (ip || 'unknown').replace(/^::ffff:/, '');
  const raw = `${clean}|${ua || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const PROMPTS_BN = [
  'আমার সম্পর্কে anonymous কিছু বলো',
  'তোর crush কে? বলে ফেল, জানা যাবে না',
  'আমার সম্পর্কে honest opinion দে',
  'আমার সাথে তোর সবচেয়ে মজার memory কি?',
  'secretly তুই আমাকে কেমন ভাবিস?',
  'আমাকে 1-10 এ rate কর, honest হ',
  'তোর ফোনে আমার নাম কি দিয়ে save করা?',
  'আমার সবচেয়ে annoying habit কোনটা?',
  'তুই কি কখনো আমাকে নিয়ে gossip করেছিস?',
  'আমাকে 3 শব্দে describe কর',
];

const PROMPTS_EN = [
  'send me an anonymous message',
  'say what you really think — stay hidden',
  'three words — describe me',
  'tell me a secret',
  'be honest, what do you think of me?',
  'one thing you always wanted to tell me',
  'rate me 1-10, no filter',
  "what's your first impression of me?",
  "what's the nicest thing about me?",
  'if you could change one thing about me, what would it be?',
];

const MSG_EMOJIS = ['💌', '🔥', '👀', '💀', '😂', '🤫', '💣', '🎭', '👻', '🐍', '💩', '❤️', '🤔', '😈', '🍿'];

// ── Helpers ──

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
function generateSecretKey(): string {
  return crypto.randomBytes(24).toString('hex');
}
function sanitizeText(raw: string): string {
  // Strip angle brackets to prevent XSS; do NOT encode quotes/apostrophes
  // (React auto-escapes text in JSX, and encoding causes double-encoding in JSON)
  return raw.replace(/</g, '').replace(/>/g, '').trim().slice(0, MAX_TEXT);
}
function validateUsername(u: string): string | null {
  if (!u || typeof u !== 'string') return 'Username is required';
  const clean = u.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 20) return 'Username must be 3-20 characters';
  if (!/^[a-z0-9_]+$/.test(clean)) return 'Only lowercase letters, numbers, underscore allowed';
  const reserved = ['admin', 'api', 'ngl', 'system', 'bongbari', 'root', 'create', 'settings', 'inbox', 'null', 'undefined', 'at'];
  if (reserved.includes(clean)) return 'This username is reserved';
  return null;
}
function getIp(req: any): string {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// ── Sender hint extraction (Phase 26) ──
function extractSenderLang(req: any): string | null {
  const accept = req.headers['accept-language'] as string;
  if (!accept) return null;
  // Parse primary language from "bn-BD,bn;q=0.9,en-US;q=0.8" → "Bengali"
  const primary = accept.split(',')[0]?.split(';')[0]?.trim().toLowerCase();
  if (!primary) return null;
  const langMap: Record<string, string> = {
    'bn': 'Bengali', 'bn-bd': 'Bengali', 'bn-in': 'Bengali',
    'hi': 'Hindi', 'hi-in': 'Hindi',
    'en': 'English', 'en-us': 'English', 'en-gb': 'English', 'en-in': 'English', 'en-au': 'English',
    'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese', 'pt-br': 'Portuguese',
    'ar': 'Arabic', 'zh': 'Chinese', 'zh-cn': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
    'ru': 'Russian', 'tr': 'Turkish', 'it': 'Italian', 'nl': 'Dutch', 'th': 'Thai',
    'ta': 'Tamil', 'te': 'Telugu', 'ml': 'Malayalam', 'kn': 'Kannada', 'mr': 'Marathi',
    'gu': 'Gujarati', 'pa': 'Punjabi', 'ur': 'Urdu', 'or': 'Odia', 'as': 'Assamese',
    'ne': 'Nepali', 'si': 'Sinhala', 'my': 'Burmese', 'vi': 'Vietnamese', 'id': 'Indonesian',
    'ms': 'Malay', 'fil': 'Filipino', 'tl': 'Tagalog', 'sw': 'Swahili',
  };
  return langMap[primary] || primary.split('-')[0]?.toUpperCase() || null;
}

// Phase 40: Advanced UA parsing — extract browser name+version, OS version, device brand
function extractDetailedUA(ua: string): { browser: string | null; os: string | null; device: string; } {
  if (!ua) return { browser: null, os: null, device: 'Unknown' };
  
  // Device
  let device = 'Unknown';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Samsung/i.test(ua)) device = 'Samsung';
  else if (/Xiaomi|Redmi|POCO|Mi /i.test(ua)) device = 'Xiaomi';
  else if (/OPPO|CPH/i.test(ua)) device = 'OPPO';
  else if (/vivo/i.test(ua)) device = 'Vivo';
  else if (/OnePlus|ONEPLUS/i.test(ua)) device = 'OnePlus';
  else if (/Realme|RMX/i.test(ua)) device = 'Realme';
  else if (/Pixel/i.test(ua)) device = 'Google Pixel';
  else if (/Huawei/i.test(ua)) device = 'Huawei';
  else if (/Nokia/i.test(ua)) device = 'Nokia';
  else if (/Motorola|moto/i.test(ua)) device = 'Motorola';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Macintosh|Mac OS/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Linux/i.test(ua)) device = 'Linux';
  else if (/CrOS/i.test(ua)) device = 'Chromebook';

  // Browser
  let browser: string | null = null;
  const chromeM = ua.match(/Chrome\/([\d.]+)/);
  const firefoxM = ua.match(/Firefox\/([\d.]+)/);
  const safariM = ua.match(/Version\/([\d.]+).*Safari/);
  const edgeM = ua.match(/Edg\/([\d.]+)/);
  const operaM = ua.match(/OPR\/([\d.]+)/);
  const braveM = ua.match(/Brave/i);
  const samsungM = ua.match(/SamsungBrowser\/([\d.]+)/);
  
  if (samsungM) browser = `Samsung Browser ${samsungM[1]}`;
  else if (braveM) browser = 'Brave';
  else if (edgeM) browser = `Edge ${edgeM[1]}`;
  else if (operaM) browser = `Opera ${operaM[1]}`;
  else if (firefoxM) browser = `Firefox ${firefoxM[1]}`;
  else if (safariM && !/Chrome/i.test(ua)) browser = `Safari ${safariM[1]}`;
  else if (chromeM) browser = `Chrome ${chromeM[1]}`;

  // OS
  let os: string | null = null;
  const iosM = ua.match(/OS ([\d_]+) like Mac/);
  const androidM = ua.match(/Android ([\d.]+)/);
  const winM = ua.match(/Windows NT ([\d.]+)/);
  const macM = ua.match(/Mac OS X ([\d_.]+)/);
  
  if (iosM) os = `iOS ${iosM[1].replace(/_/g, '.')}`;
  else if (androidM) os = `Android ${androidM[1]}`;
  else if (winM) {
    const v = winM[1];
    const winNames: Record<string, string> = { '10.0': 'Windows 10/11', '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7' };
    os = winNames[v] || `Windows NT ${v}`;
  }
  else if (macM) os = `macOS ${macM[1].replace(/_/g, '.')}`;

  return { browser, os, device };
}

function extractSenderDevice(req: any): string | null {
  const ua = (req.headers['user-agent'] || '') as string;
  return extractDetailedUA(ua).device;
}

function extractSenderTz(req: any): string | null {
  // Client sends timezone via X-Timezone header (set in fetch)
  const tz = req.headers['x-timezone'] as string;
  if (tz && tz.length <= 100) {
    // Convert "Asia/Kolkata" → "IST" or show region
    const tzLabels: Record<string, string> = {
      'Asia/Kolkata': 'India (IST)', 'Asia/Calcutta': 'India (IST)',
      'Asia/Dhaka': 'Bangladesh (BST)', 'Asia/Dacca': 'Bangladesh (BST)',
      'America/New_York': 'US East (EST)', 'America/Los_Angeles': 'US West (PST)',
      'America/Chicago': 'US Central (CST)', 'Europe/London': 'UK (GMT)',
      'Asia/Tokyo': 'Japan (JST)', 'Asia/Dubai': 'UAE (GST)',
      'Asia/Singapore': 'Singapore (SGT)', 'Australia/Sydney': 'Australia (AEST)',
      'Europe/Berlin': 'Germany (CET)', 'Europe/Paris': 'France (CET)',
    };
    return tzLabels[tz] || tz.replace('_', ' ').split('/').pop() || null;
  }
  return null;
}

// Phase 40: IP-based geolocation (free, legal, no API key needed)
// Uses ip-api.com free tier (45 req/min) — non-commercial, perfect for our scale
interface GeoResult { city: string | null; district: string | null; region: string | null; country: string | null; isp: string | null; }

const geoCache = new Map<string, GeoResult>();
const GEO_CACHE_TTL = 15 * 60 * 1000; // 15 min

async function geolocateIp(ip: string): Promise<GeoResult> {
  const empty: GeoResult = { city: null, district: null, region: null, country: null, isp: null };
  if (!ip || ip === 'unknown' || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return empty;
  
  // Clean IPv6-mapped IPv4
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  const cached = geoCache.get(cleanIp);
  if (cached) return cached;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,city,district,regionName,country,isp`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!resp.ok) return empty;
    const data = await resp.json();
    if (data.status !== 'success') return empty;
    
    const result: GeoResult = {
      city: data.city || null,
      district: data.district || null,
      region: data.regionName || null,
      country: data.country || null,
      isp: data.isp || null,
    };
    geoCache.set(cleanIp, result);
    // Auto-cleanup cache
    setTimeout(() => geoCache.delete(cleanIp), GEO_CACHE_TTL);
    return result;
  } catch {
    return empty;
  }
}

// Valid NGL themes
const NGL_THEMES = ['default', 'pink', 'blue', 'green', 'purple', 'gold', 'dark', 'neon', 'rosegold', 'midnight'] as const;
const MAX_PHOTO_SIZE = 150_000; // 150KB base64

// Phase 30: Theme → gradient stops for SVG OG cards
const THEME_GRADIENTS: Record<string, { stops: string[]; angle: number }> = {
  default: { stops: ['#667eea', '#f8477a', '#ee6b3b', '#f4843e'], angle: 135 },
  pink:    { stops: ['#ec4899', '#f43f5e', '#fb923c'], angle: 135 },
  blue:    { stops: ['#3b82f6', '#6366f1', '#8b5cf6'], angle: 135 },
  green:   { stops: ['#10b981', '#14b8a6', '#06b6d4'], angle: 135 },
  purple:  { stops: ['#8b5cf6', '#a855f7', '#d946ef'], angle: 135 },
  gold:    { stops: ['#f59e0b', '#ef4444', '#dc2626'], angle: 135 },
  dark:    { stops: ['#1e1b4b', '#312e81', '#1e1b4b'], angle: 135 },
};

// Extract key from X-NGL-Key header (preferred) or ?key= query param (backward compat)
function getAuthKey(req: any): string {
  return (req.headers['x-ngl-key'] as string) || (req.query.key as string) || '';
}

// ── Storage abstraction ──

async function dbGetUser(username: string) {
  if (USE_PG) {
    const rows = await pgDb!.select().from(nglUsers).where(eq(nglUsers.username, username)).limit(1);
    return rows[0] || null;
  }
  return memUsers.get(username) || null;
}

async function dbUserExists(username: string): Promise<boolean> {
  if (USE_PG) {
    const rows = await pgDb!.select({ u: nglUsers.username }).from(nglUsers).where(eq(nglUsers.username, username)).limit(1);
    return rows.length > 0;
  }
  return memUsers.has(username);
}

async function dbCreateUser(username: string, prompt: string, secretKeyHash: string, pinHash: string | null = null) {
  if (USE_PG) {
    await pgDb!.insert(nglUsers).values({ username, prompt, secretKeyHash, pinHash, theme: 'default', messageCount: 0, streakDays: 0 });
  } else {
    memUsers.set(username, { username, prompt, secretKeyHash, pinHash, theme: 'default', photo: null, messageCount: 0, streakDays: 0, lastMessageDay: null, phone: null, phoneVerified: 0, otpHash: null, otpExpiry: null, ogTitle: null, ogDescription: null, createdAt: Date.now() });
  }
}

async function dbUpdatePrompt(username: string, prompt: string) {
  if (USE_PG) {
    await pgDb!.update(nglUsers).set({ prompt }).where(eq(nglUsers.username, username));
  } else {
    const u = memUsers.get(username);
    if (u) u.prompt = prompt;
  }
}

async function dbUpdateOg(username: string, ogTitle: string | null, ogDescription: string | null) {
  if (USE_PG) {
    await pgDb!.update(nglUsers).set({ ogTitle, ogDescription }).where(eq(nglUsers.username, username));
  } else {
    const u = memUsers.get(username);
    if (u) { u.ogTitle = ogTitle; u.ogDescription = ogDescription; }
  }
}

async function dbGetMessages(username: string, limit?: number, offset?: number) {
  // B3: pinned messages always show first (pinned desc), then newest first.
  // B4: optional pagination via limit/offset.
  const lim = typeof limit === 'number' && limit > 0 && limit <= 200 ? limit : undefined;
  const off = typeof offset === 'number' && offset > 0 ? offset : 0;
  if (USE_PG) {
    let q = pgDb!.select().from(nglMessages)
      .where(eq(nglMessages.recipientUsername, username))
      .orderBy(desc(nglMessages.pinned), desc(nglMessages.createdAt)) as any;
    if (lim !== undefined) q = q.limit(lim);
    if (off > 0) q = q.offset(off);
    return q;
  }
  const all = memMessages
    .filter(m => m.recipientUsername === username)
    .sort((a, b) => (b.pinned - a.pinned) || (b.createdAt - a.createdAt));
  if (lim !== undefined) return all.slice(off, off + lim);
  return all.slice(off);
}

// Phase 40: Extended hint payload
interface SenderHints {
  senderLang: string | null;
  senderTz: string | null;
  senderDevice: string | null;
  senderBrowser: string | null;
  senderOs: string | null;
  senderCity: string | null;
  senderRegion: string | null;
  senderCountry: string | null;
  senderIsp: string | null;
  senderScreenRes: string | null;
  senderConnectionType: string | null;
  senderBatteryLevel: string | null;
  senderDarkMode: string | null;
  senderReferrer: string | null;
  senderLocalTime: string | null;
  senderFingerprint: string | null;
}

async function dbInsertMessage(id: string, recipientUsername: string, text: string, emoji: string, hints: SenderHints) {
  // Phase 33: Calculate today's date string for streak tracking
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  if (USE_PG) {
    await pgDb!.insert(nglMessages).values({
      id, recipientUsername, text, emoji,
      senderLang: hints.senderLang, senderTz: hints.senderTz, senderDevice: hints.senderDevice,
      senderBrowser: hints.senderBrowser, senderOs: hints.senderOs,
      senderCity: hints.senderCity, senderRegion: hints.senderRegion, senderCountry: hints.senderCountry,
      senderIsp: hints.senderIsp, senderScreenRes: hints.senderScreenRes,
      senderConnectionType: hints.senderConnectionType, senderBatteryLevel: hints.senderBatteryLevel,
      senderDarkMode: hints.senderDarkMode, senderReferrer: hints.senderReferrer,
      senderLocalTime: hints.senderLocalTime,
      senderFingerprint: hints.senderFingerprint,
    });

    // Streak update: read current user streak state
    const userRows = await pgDb!.select({
      lastMsgDay: nglUsers.lastMessageDay,
      streak: nglUsers.streakDays,
    }).from(nglUsers).where(eq(nglUsers.username, recipientUsername)).limit(1);
    const u = userRows[0];
    let newStreak = 1;
    if (u) {
      const lastDay = u.lastMsgDay;
      if (lastDay === today) {
        newStreak = u.streak || 1; // same day, keep streak
      } else {
        // Check if yesterday
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = lastDay === yesterday ? (u.streak || 0) + 1 : 1;
      }
    }
    await pgDb!.update(nglUsers).set({
      messageCount: sql`${nglUsers.messageCount} + 1`,
      streakDays: newStreak,
      lastMessageDay: today,
    }).where(eq(nglUsers.username, recipientUsername));
  } else {
    memMessages.push({
      id, recipientUsername, text, emoji, reaction: null, createdAt: Date.now(),
      senderLang: hints.senderLang, senderTz: hints.senderTz, senderDevice: hints.senderDevice,
      senderBrowser: hints.senderBrowser, senderOs: hints.senderOs,
      senderCity: hints.senderCity, senderRegion: hints.senderRegion, senderCountry: hints.senderCountry,
      senderIsp: hints.senderIsp, senderScreenRes: hints.senderScreenRes,
      senderConnectionType: hints.senderConnectionType, senderBatteryLevel: hints.senderBatteryLevel,
      senderDarkMode: hints.senderDarkMode, senderReferrer: hints.senderReferrer,
      senderLocalTime: hints.senderLocalTime,
      senderFingerprint: hints.senderFingerprint,
      pinned: 0,
    });
    const u = memUsers.get(recipientUsername);
    if (u) {
      u.messageCount++;
      const lastDay = u.lastMessageDay;
      if (lastDay === today) {
        // same day — keep streak
      } else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        u.streakDays = lastDay === yesterday ? (u.streakDays || 0) + 1 : 1;
      }
      u.lastMessageDay = today;
    }
    // Global limit
    if (memMessages.length >= MAX_MESSAGES) memMessages.splice(0, 100);
  }
}

async function dbDeleteMessage(username: string, msgId: string): Promise<boolean> {
  if (USE_PG) {
    const deleted = await pgDb!.delete(nglMessages).where(sql`${nglMessages.id} = ${msgId} AND ${nglMessages.recipientUsername} = ${username}`);
    if (deleted) {
      await pgDb!.update(nglUsers).set({ messageCount: sql`GREATEST(${nglUsers.messageCount} - 1, 0)` }).where(eq(nglUsers.username, username));
    }
    return true;
  }
  const idx = memMessages.findIndex(m => m.id === msgId && m.recipientUsername === username);
  if (idx === -1) return false;
  memMessages.splice(idx, 1);
  const u = memUsers.get(username);
  if (u) u.messageCount = Math.max(0, u.messageCount - 1);
  return true;
}

async function dbUserCount(): Promise<number> {
  if (USE_PG) {
    const rows = await pgDb!.select({ count: sql<number>`count(*)` }).from(nglUsers);
    return Number(rows[0]?.count || 0);
  }
  return memUsers.size;
}

async function dbMessageCount(): Promise<number> {
  if (USE_PG) {
    const rows = await pgDb!.select({ count: sql<number>`count(*)` }).from(nglMessages);
    return Number(rows[0]?.count || 0);
  }
  return memMessages.length;
}

async function dbUserMsgCount(username: string): Promise<number> {
  if (USE_PG) {
    const rows = await pgDb!.select({ count: sql<number>`count(*)` }).from(nglMessages).where(eq(nglMessages.recipientUsername, username));
    return Number(rows[0]?.count || 0);
  }
  return memMessages.filter(m => m.recipientUsername === username).length;
}

// B3: Pin / unpin helpers. Max 3 pinned per user.
async function dbCountPinned(username: string): Promise<number> {
  if (USE_PG) {
    const rows = await pgDb!.select({ count: sql<number>`count(*)` }).from(nglMessages)
      .where(and(eq(nglMessages.recipientUsername, username), sql`${nglMessages.pinned} > 0`));
    return Number(rows[0]?.count || 0);
  }
  return memMessages.filter(m => m.recipientUsername === username && m.pinned > 0).length;
}

async function dbSetPinned(username: string, msgId: string, pinned: number): Promise<boolean> {
  if (USE_PG) {
    const r: any = await pgDb!.update(nglMessages).set({ pinned })
      .where(and(eq(nglMessages.id, msgId), eq(nglMessages.recipientUsername, username)));
    return true;
  }
  const m = memMessages.find(x => x.id === msgId && x.recipientUsername === username);
  if (!m) return false;
  m.pinned = pinned;
  return true;
}

// B2: Blocked fingerprint helpers.
async function dbIsFingerprintBlocked(username: string, fingerprint: string): Promise<boolean> {
  if (!fingerprint) return false;
  if (USE_PG) {
    const rows = await pgDb!.select({ id: nglBlockedFingerprints.id })
      .from(nglBlockedFingerprints)
      .where(and(
        eq(nglBlockedFingerprints.recipientUsername, username),
        eq(nglBlockedFingerprints.fingerprintHash, fingerprint),
      ))
      .limit(1);
    return rows.length > 0;
  }
  return memBlockedFingerprints.get(username)?.has(fingerprint) || false;
}

async function dbBlockFingerprint(username: string, fingerprint: string): Promise<void> {
  if (!fingerprint) return;
  if (USE_PG) {
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // Ignore duplicates: check first (cheap) then insert
    const already = await dbIsFingerprintBlocked(username, fingerprint);
    if (already) return;
    await pgDb!.insert(nglBlockedFingerprints).values({
      id, recipientUsername: username, fingerprintHash: fingerprint,
    });
  } else {
    let set = memBlockedFingerprints.get(username);
    if (!set) { set = new Set(); memBlockedFingerprints.set(username, set); }
    set.add(fingerprint);
  }
}

// Fetch a single message by id+username (used by block-sender to find fingerprint)
async function dbGetMessageById(username: string, msgId: string): Promise<{ id: string; senderFingerprint: string | null } | null> {
  if (USE_PG) {
    const rows = await pgDb!.select({ id: nglMessages.id, senderFingerprint: nglMessages.senderFingerprint })
      .from(nglMessages)
      .where(and(eq(nglMessages.id, msgId), eq(nglMessages.recipientUsername, username)))
      .limit(1);
    return rows[0] || null;
  }
  const m = memMessages.find(x => x.id === msgId && x.recipientUsername === username);
  if (!m) return null;
  return { id: m.id, senderFingerprint: m.senderFingerprint };
}

// ──────────────────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────────────────

export function registerNglRoutes(app: any) {
  const router = Router();

  if (USE_PG) {
    console.log('[NGL] ✅ Using Postgres (permanent storage)');
  } else {
    console.log('[NGL] ⚠️ Using in-memory storage (data lost on restart)');
  }

  // ── POST /create ──
  router.post('/create', async (req: any, res) => {
    try {
      const ip = getIp(req);
      const lastCreate = createRateMap.get(ip);
      if (lastCreate && Date.now() - lastCreate < CREATE_COOLDOWN) {
        const wait = Math.ceil((CREATE_COOLDOWN - (Date.now() - lastCreate)) / 1000);
        return res.status(429).json({ message: `ধীরে! ${wait}s অপেক্ষা করো।` });
      }

      const { username: rawUsername, prompt: rawPrompt, pin: rawPin, phone: rawPhone } = req.body || {};
      const usernameError = validateUsername(rawUsername);
      if (usernameError) return res.status(400).json({ message: usernameError });

      const username = rawUsername.trim().toLowerCase();
      if (await dbUserExists(username)) {
        return res.status(409).json({ message: 'Username already taken! অন্য নাম দাও।' });
      }

      if (!USE_PG && memUsers.size >= MAX_USERS) {
        return res.status(503).json({ message: 'Max users reached. Try later.' });
      }

      // Validate PIN if provided (must be exactly 6 digits)
      let pinHash: string | null = null;
      if (rawPin && typeof rawPin === 'string') {
        const cleanPin = rawPin.trim();
        if (!/^\d{6}$/.test(cleanPin)) {
          return res.status(400).json({ message: 'PIN must be exactly 6 digits' });
        }
        pinHash = hashKey(cleanPin);
      }

      // Validate phone if provided (10-digit Indian number)
      let cleanPhone: string | null = null;
      if (rawPhone && typeof rawPhone === 'string' && rawPhone.trim().length > 0) {
        cleanPhone = validatePhone(rawPhone.trim());
        // Don't block account creation for invalid phone — just skip it
      }

      const secretKey = generateSecretKey();
      const secretKeyHash = hashKey(secretKey);
      const prompt = rawPrompt && typeof rawPrompt === 'string' && rawPrompt.trim().length >= 3
        ? sanitizeText(rawPrompt.trim()).slice(0, 200)
        : PROMPTS_BN[0];

      await dbCreateUser(username, prompt, secretKeyHash, pinHash);

      // Save phone if provided (separate update to avoid breaking existing dbCreateUser)
      if (cleanPhone) {
        if (USE_PG) {
          await pgDb!.update(nglUsers).set({ phone: cleanPhone }).where(eq(nglUsers.username, username));
        } else {
          const u = memUsers.get(username);
          if (u) u.phone = cleanPhone;
        }
      }

      createRateMap.set(ip, Date.now());

      res.status(201).json({
        ok: true,
        username,
        secretKey,
        hasPin: !!pinHash,
        prompt,
        shareUrl: `/ngl/q/${username}`,
        dashboardUrl: `/ngl/at/${username}`,
        message: '⚠️ secretKey শুধু একবারই দেখানো হবে — save করো!',
      });
    } catch (err: any) {
      console.error('[NGL] create error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /login — Re-authenticate with secret key OR 6-digit PIN ──
  router.post('/login', async (req: any, res) => {
    try {
      const { username: rawUsername, secretKey, pin } = req.body || {};
      if (!rawUsername || (!secretKey && !pin)) {
        return res.status(400).json({ message: 'Username and secret key or PIN required' });
      }
      const username = rawUsername.trim().toLowerCase();
      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Try PIN auth first if provided
      if (pin && typeof pin === 'string') {
        const cleanPin = pin.trim();
        if (!/^\d{6}$/.test(cleanPin)) {
          return res.status(400).json({ message: 'PIN must be exactly 6 digits' });
        }
        if (!user.pinHash || hashKey(cleanPin) !== user.pinHash) {
          return res.status(403).json({ message: 'Wrong PIN' });
        }
      } else if (secretKey) {
        // Secret key auth
        if (hashKey(secretKey) !== user.secretKeyHash) {
          return res.status(403).json({ message: 'Wrong secret key' });
        }
      }

      // Generate a fresh session key (so the client has a valid key for API calls)
      // We return the secretKeyHash concept — but the client already stores the key from creation
      // For PIN login, we need to provide a mechanism to get a session key
      // Solution: Return a temporary session token = the hash itself used as auth
      // Actually, we just validate — the client needs the secretKey for further API calls
      // For PIN users logging in on a new device, we issue a new secret key
      const newSecretKey = pin ? generateSecretKey() : undefined;
      if (pin && newSecretKey) {
        // Update the user's secret key hash so this new key works
        const newHash = hashKey(newSecretKey);
        if (USE_PG) {
          await pgDb!.update(nglUsers).set({ secretKeyHash: newHash }).where(eq(nglUsers.username, username));
        } else {
          const u = memUsers.get(username);
          if (u) u.secretKeyHash = newHash;
        }
      }

      res.json({
        ok: true,
        username: user.username,
        prompt: user.prompt,
        messageCount: user.messageCount,
        createdAt: user.createdAt,
        hasPin: !!user.pinHash,
        // If logged in via PIN, issue a new secret key for API calls
        ...(newSecretKey ? { secretKey: newSecretKey } : {}),
      });
    } catch (err: any) {
      console.error('[NGL] login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── GET /check/:username ──
  router.get('/check/:username', async (req, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const error = validateUsername(username);
      if (error) return res.json({ available: false, reason: error });
      const taken = await dbUserExists(username);
      res.json({ available: !taken, username });
    } catch (err: any) {
      res.status(500).json({ available: false, reason: 'Server error' });
    }
  });

  // ── GET /u/:username — Public Profile ──
  router.get('/u/:username', async (req, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found', exists: false });

      res.json({
        exists: true,
        username: user.username,
        prompt: user.prompt,
        messageCount: user.messageCount,
        theme: user.theme || 'default',
        photo: user.photo || null,
        streakDays: (user as any).streakDays || 0,
        ogTitle: (user as any).ogTitle || null,
        ogDescription: (user as any).ogDescription || null,
        // Part 3 (Premium): expose PRO status so dashboard + send page can render badge + gating
        isPremium: (user as any).isPremium === 1
          && (!(user as any).premiumUntil || new Date((user as any).premiumUntil).getTime() > Date.now())
          ? 1 : 0,
        createdAt: user.createdAt,
      });
    } catch (err: any) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /u/:username/send ──
  router.post('/u/:username/send', async (req: any, res) => {
    try {
      const ip = getIp(req);
      const username = (req.params.username || '').trim().toLowerCase();

      const lastSend = sendRateMap.get(ip);
      if (lastSend && Date.now() - lastSend < SEND_COOLDOWN) {
        const wait = Math.ceil((SEND_COOLDOWN - (Date.now() - lastSend)) / 1000);
        return res.status(429).json({ message: `ধীরে! ${wait}s অপেক্ষা করো।` });
      }

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const { text: rawText } = req.body || {};
      if (!rawText || typeof rawText !== 'string') return res.status(400).json({ message: 'Message text is required' });

      const text = sanitizeText(rawText);
      if (text.length < 1) return res.status(400).json({ message: 'Message too short' });

      // B1: Profanity / hate-speech filter. Soft rejection — returns 200 so sender
      // can't tell which words trigger the filter (prevents bypass probing).
      if (containsBlockedWord(text)) {
        sendRateMap.set(ip, Date.now());
        return res.status(200).json({ ok: true, message: 'Sent! 🔥', filtered: true, fakeCount: 150 + Math.floor(Math.random() * 250) });
      }

      // B2: Fingerprint-based block check. Compute fingerprint from IP+UA and
      // check if recipient has blocked this sender. Silent-drop (200) so the
      // blocked sender can't tell they've been blocked (prevents harassment loop).
      const uaForFp = (req.headers['user-agent'] || '') as string;
      const fingerprint = computeSenderFingerprint(ip, uaForFp);
      if (await dbIsFingerprintBlocked(username, fingerprint)) {
        sendRateMap.set(ip, Date.now());
        return res.status(200).json({ ok: true, message: 'Sent! 🔥', filtered: true, fakeCount: 150 + Math.floor(Math.random() * 250) });
      }

      const userMsgCount = await dbUserMsgCount(username);
      if (userMsgCount >= MAX_MSG_PER_USER) {
        return res.status(503).json({ message: "This user's inbox is full!" });
      }

      const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const emoji = MSG_EMOJIS[Math.floor(Math.random() * MSG_EMOJIS.length)];

      // Phase 26→40: Capture ALL sender hints (language, timezone, device, geo, screen, etc.)
      const ua = (req.headers['user-agent'] || '') as string;
      const uaDetails = extractDetailedUA(ua);
      const senderLang = extractSenderLang(req);
      const senderDevice = uaDetails.device;
      const senderBrowser = uaDetails.browser;
      const senderOs = uaDetails.os;
      const senderTz = extractSenderTz(req);
      
      // Client-sent metadata from body
      const clientMeta = req.body.meta || {};
      const senderScreenRes = typeof clientMeta.screen === 'string' ? clientMeta.screen.slice(0, 30) : null;
      const senderConnectionType = typeof clientMeta.connection === 'string' ? clientMeta.connection.slice(0, 30) : null;
      const senderBatteryLevel = typeof clientMeta.battery === 'string' ? clientMeta.battery.slice(0, 20) : null;
      const senderDarkMode = typeof clientMeta.darkMode === 'string' ? clientMeta.darkMode.slice(0, 10) : null;
      const senderReferrer = typeof clientMeta.referrer === 'string' ? clientMeta.referrer.slice(0, 200) : null;
      const senderLocalTime = typeof clientMeta.localTime === 'string' ? clientMeta.localTime.slice(0, 30) : null;
      
      // IP geolocation (async, non-blocking — if it fails, hints are still partial)
      const geo = await geolocateIp(ip);

      const hints: SenderHints = {
        senderLang, senderTz, senderDevice, senderBrowser, senderOs,
        senderCity: geo.district && geo.city && geo.district !== geo.city
          ? `${geo.district}, ${geo.city}`
          : geo.city,
        senderRegion: geo.region, senderCountry: geo.country, senderIsp: geo.isp,
        senderScreenRes, senderConnectionType, senderBatteryLevel, senderDarkMode, senderReferrer, senderLocalTime,
        senderFingerprint: fingerprint,
      };

      await dbInsertMessage(msgId, username, text, emoji, hints);
      sendRateMap.set(ip, Date.now());

      res.status(201).json({ ok: true, message: 'Sent! 🔥', fakeCount: 150 + Math.floor(Math.random() * 250) });
    } catch (err: any) {
      console.error('[NGL] send error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── GET /u/:username/inbox — Protected ──
  router.get('/u/:username/inbox', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key — access denied' });
      }

      // B4: Optional pagination — ?limit=20&offset=0
      const limitParam = Number(req.query.limit);
      const offsetParam = Number(req.query.offset);
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : undefined;
      const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;

      const userMessages = await dbGetMessages(username, limit, offset);
      const totalCount = await dbUserMsgCount(username);

      res.json({
        ok: true,
        username: user.username,
        prompt: user.prompt,
        messageCount: user.messageCount,
        messages: userMessages,
        totalCount,
        hasMore: limit !== undefined ? (offset + (userMessages as any[]).length) < totalCount : false,
        streakDays: (user as any).streakDays || 0,
        createdAt: user.createdAt,
      });
    } catch (err: any) {
      console.error('[NGL] inbox error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── DELETE /u/:username/message/:id ──
  router.delete('/u/:username/message/:id', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const msgId = req.params.id;
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const ok = await dbDeleteMessage(username, msgId);
      if (!ok) return res.status(404).json({ message: 'Message not found' });

      res.json({ ok: true, remaining: Math.max(0, user.messageCount - 1) });
    } catch (err: any) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/message/:id/pin — Toggle pin (B3) ──
  // Max 3 pinned messages per user. Pinned value = Date.now() (for ordering).
  router.put('/u/:username/message/:id/pin', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const msgId = req.params.id;
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const msg = await dbGetMessageById(username, msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });

      const { pinned: wantPinned } = req.body || {};
      const shouldPin = wantPinned === true || wantPinned === 1;

      if (shouldPin) {
        const pinnedCount = await dbCountPinned(username);
        if (pinnedCount >= 3) {
          return res.status(400).json({ message: 'Max 3 pinned messages. Unpin one first.', code: 'MAX_PINS' });
        }
        await dbSetPinned(username, msgId, Date.now());
        res.json({ ok: true, pinned: true });
      } else {
        await dbSetPinned(username, msgId, 0);
        res.json({ ok: true, pinned: false });
      }
    } catch (err: any) {
      console.error('[NGL] pin error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /u/:username/message/:id/block — Block sender by fingerprint (B2) ──
  // Recipient can block the sender of a specific message. The sender's
  // fingerprint (hash of their IP+UA at send time) is added to the
  // recipient's blocklist. Future sends matching that fingerprint are
  // silently dropped (see /send route).
  router.post('/u/:username/message/:id/block', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const msgId = req.params.id;
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const msg = await dbGetMessageById(username, msgId);
      if (!msg) return res.status(404).json({ message: 'Message not found' });
      if (!msg.senderFingerprint) {
        // Legacy message (stored before fingerprint column existed)
        return res.status(400).json({ message: 'Cannot block this message (no fingerprint data)', code: 'NO_FINGERPRINT' });
      }

      await dbBlockFingerprint(username, msg.senderFingerprint);
      res.json({ ok: true, blocked: true });
    } catch (err: any) {
      console.error('[NGL] block-sender error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/pin — Set or update 6-digit PIN ──
  router.put('/u/:username/pin', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = req.headers['x-ngl-key'] as string || (req.query.key as string) || '';

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { pin } = req.body || {};
      if (!pin || typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) {
        return res.status(400).json({ message: 'PIN must be exactly 6 digits' });
      }

      const newPinHash = hashKey(pin.trim());
      if (USE_PG) {
        await pgDb!.update(nglUsers).set({ pinHash: newPinHash }).where(eq(nglUsers.username, username));
      } else {
        const u = memUsers.get(username);
        if (u) u.pinHash = newPinHash;
      }

      res.json({ ok: true, message: 'PIN set successfully' });
    } catch (err: any) {
      console.error('[NGL] set pin error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/prompt ──
  router.put('/u/:username/prompt', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { prompt: rawPrompt } = req.body || {};
      if (!rawPrompt || typeof rawPrompt !== 'string' || rawPrompt.trim().length < 3) {
        return res.status(400).json({ message: 'Prompt must be at least 3 characters' });
      }

      const newPrompt = sanitizeText(rawPrompt.trim()).slice(0, 200);
      await dbUpdatePrompt(username, newPrompt);
      res.json({ ok: true, prompt: newPrompt });
    } catch (err: any) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/og — Save custom OG link-preview title & description ──
  router.put('/u/:username/og', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { ogTitle: rawTitle, ogDescription: rawDesc } = req.body || {};
      // Allow null/empty to clear custom values (falls back to default)
      const ogTitle = rawTitle && typeof rawTitle === 'string' && rawTitle.trim().length > 0
        ? sanitizeText(rawTitle.trim()).slice(0, 200) : null;
      const ogDescription = rawDesc && typeof rawDesc === 'string' && rawDesc.trim().length > 0
        ? sanitizeText(rawDesc.trim()).slice(0, 500) : null;

      await dbUpdateOg(username, ogTitle, ogDescription);
      res.json({ ok: true, ogTitle, ogDescription });
    } catch (err: any) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /prompts/enhance — AI polish/grammar fix for user prompt text ──
  router.post('/prompts/enhance', async (req: any, res) => {
    const { text, lang: rawLang } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return res.status(400).json({ message: 'Text must be at least 3 characters' });
    }
    const lang = rawLang === 'en' ? 'en' : 'bn';
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.json({ enhanced: text.trim(), source: 'unchanged' });
    }
    try {
      // Randomize the instruction style so each click gives different output
      const styles = lang === 'en'
        ? ['Make it spicier and more provocative', 'Make it funnier with Gen-Z slang', 'Make it more mysterious and intriguing', 'Make it more direct and bold', 'Make it more playful and flirty']
        : ['আরো spicy করো, Gen-Z vibe দাও', 'মজার করো, slang মেশাও', 'mysterious করো, curiosity বাড়াও', 'bold আর direct করো', 'playful আর flirty করো'];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const sysPrompt = lang === 'en'
        ? `You rewrite anonymous message prompts to be catchy and Gen-Z friendly. ${style}. Keep it short (max 20 words). Return ONLY the improved text, nothing else. No quotes. MUST be different from the input.`
        : `You rewrite anonymous message prompts mixing Bengali + English Gen-Z style. ${style}. Keep short (max 20 words). Return ONLY the improved text, nothing else. No quotes. MUST be different from input.`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `Rewrite this into something completely different but same meaning: "${text.trim()}"` }
          ],
          temperature: 1.3,
          max_tokens: 60,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (aiRes.ok) {
        const data = await aiRes.json() as any;
        const enhanced = (data?.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
        if (enhanced && enhanced.length >= 3 && enhanced.length <= 200) {
          return res.json({ enhanced: sanitizeText(enhanced), source: 'ai' });
        }
      }
    } catch { /* fall through */ }
    res.json({ enhanced: text.trim(), source: 'unchanged' });
  });

  // ── GET /prompts/random — AI-powered (Groq LLM) with static fallback ──
  // ?lang=bn → Bengali/Benglish prompts, ?lang=en → English prompts (default: bn)
  router.get('/prompts/random', async (req, res) => {
    const lang = (req.query.lang as string) === 'en' ? 'en' : 'bn';
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const sysPrompt = lang === 'en'
          ? 'You generate ONE short creative anonymous message prompt in English for an NGL-style app. Casual Gen-Z vibe. Max 15 words. Return ONLY the prompt text, nothing else. No quotes around it. NO emojis at all — premium text only.'
          : 'You generate ONE short creative anonymous message prompt for a Bengali NGL-style app. Mix Bengali and English casually like Gen-Z. Max 15 words. Return ONLY the prompt text, nothing else. No quotes around it. NO emojis at all — premium text only.';
        const userPrompt = lang === 'en'
          ? 'Give me a fresh unique anonymous question prompt in English, no emojis. Examples: "be honest, rate me 1-10", "what is your first impression of me?", "three words — describe me", "tell me something you have never told me", "one word to describe me?"'
          : 'Give me a fresh unique anonymous question prompt, no emojis. Examples: "তোর crush কে? বলে ফেল", "be honest, rate me 1-10", "আমার সম্পর্কে একটা lie বলো", "secretly তুই আমাকে কেমন ভাবিস?", "one word to describe me?"';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: sysPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 1.1,
            max_tokens: 60,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (aiRes.ok) {
          const data = await aiRes.json() as any;
          const text = (data?.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
          if (text && text.length >= 5 && text.length <= 200) {
            return res.json({ prompt: sanitizeText(text), source: 'ai' });
          }
        }
      } catch { /* Groq failed, fall through to static */ }
    }
    // Fallback to static prompts in the correct language
    const pool = lang === 'en' ? PROMPTS_EN : PROMPTS_BN;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    res.json({ prompt, source: 'static', total: pool.length });
  });

  // ── DELETE /u/:username — Permanently delete profile + all messages ──
  router.delete('/u/:username', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      // Delete all messages first, then user
      if (USE_PG) {
        await pgDb!.delete(nglMessages).where(eq(nglMessages.recipientUsername, username));
        await pgDb!.delete(nglUsers).where(eq(nglUsers.username, username));
      } else {
        // Memory cleanup
        for (let i = memMessages.length - 1; i >= 0; i--) {
          if (memMessages[i].recipientUsername === username) memMessages.splice(i, 1);
        }
        memUsers.delete(username);
      }

      console.log(`[NGL] 🗑️ User @${username} permanently deleted`);
      res.json({ ok: true, message: 'Profile and all messages permanently deleted' });
    } catch (err: any) {
      console.error('[NGL] delete user error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── GET /stats ──
  router.get('/stats', async (_req, res) => {
    try {
      res.json({
        totalUsers: await dbUserCount(),
        totalMessages: await dbMessageCount(),
        storage: USE_PG ? 'postgres' : 'memory',
      });
    } catch {
      res.json({ totalUsers: 0, totalMessages: 0, storage: USE_PG ? 'postgres' : 'memory' });
    }
  });

  // ── GET /og/:username — OG meta page ──
  router.get('/og/:username', async (req, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const user = await dbGetUser(username);
      const prompt = user ? user.prompt : 'send me anonymous messages!';
      const title = (user as any)?.ogTitle || `Send @${username} anonymous messages!`;
      const desc = (user as any)?.ogDescription || `Tap to send an anonymous message 👀 — ${prompt}`;
      const url = `https://www.bongbari.com/ngl/q/${username}`;
      // Phase 30: Dynamic OG image per user (served from same backend)
      const imgUrl = `http://158.101.175.37:5000/api/ngl/og/${encodeURIComponent(username)}/image`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${sanitizeText(title)}</title>
<meta name="description" content="${sanitizeText(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${sanitizeText(title)}" />
<meta property="og:description" content="${sanitizeText(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="Bong NGL by Bong Bari" />
<meta property="og:image" content="${imgUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${sanitizeText(title)}" />
<meta name="twitter:description" content="${sanitizeText(desc)}" />
<meta name="twitter:image" content="${imgUrl}" />
<meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
<p>Redirecting to <a href="${url}">${url}</a>...</p>
</body>
</html>`);
    } catch {
      res.status(500).send('Server error');
    }
  });

  // ── GET /og/:username/image — Phase 30: Dynamic SVG OG card ──
  router.get('/og/:username/image', async (req, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const user = await dbGetUser(username);
      const prompt = user ? sanitizeText(user.prompt).slice(0, 80) : 'send me anonymous messages!';
      const msgCount = user ? user.messageCount : 0;
      const userTheme = (user?.theme as string) || 'default';
      const grad = THEME_GRADIENTS[userTheme] || THEME_GRADIENTS.default;

      // Build gradient stops for SVG
      const stops = grad.stops.map((color, i) => {
        const pct = Math.round((i / (grad.stops.length - 1)) * 100);
        return `<stop offset="${pct}%" stop-color="${color}" />`;
      }).join('\n');

      // Escape XML entities for safe SVG rendering
      const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      ${stops}
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="0"/>
  <!-- Glass card -->
  <rect x="80" y="100" width="1040" height="430" rx="40" fill="white" fill-opacity="0.12" filter="url(#shadow)"/>
  <rect x="80" y="100" width="1040" height="430" rx="40" fill="none" stroke="white" stroke-opacity="0.2" stroke-width="2"/>
  <!-- Avatar circle -->
  <circle cx="200" cy="260" r="60" fill="white" fill-opacity="0.25"/>
  <text x="200" y="278" text-anchor="middle" font-size="48" font-weight="900" fill="white" font-family="system-ui,sans-serif">${escXml(username[0]?.toUpperCase() || '?')}</text>
  <!-- Username -->
  <text x="300" y="240" font-size="52" font-weight="900" fill="white" font-family="system-ui,sans-serif">@${escXml(username)}</text>
  <!-- PRO badge -->
  <rect x="300" y="255" width="70" height="28" rx="14" fill="#8b5cf6"/>
  <text x="335" y="275" text-anchor="middle" font-size="16" font-weight="800" fill="white" font-family="system-ui,sans-serif">PRO</text>
  <!-- Prompt -->
  <text x="200" y="370" font-size="32" fill="white" fill-opacity="0.9" font-family="system-ui,sans-serif" font-weight="600">"${escXml(prompt)}"</text>
  <!-- Stats -->
  <text x="200" y="460" font-size="24" fill="white" fill-opacity="0.6" font-family="system-ui,sans-serif" font-weight="600">🔥 ${msgCount} messages received</text>
  <!-- CTA -->
  <rect x="700" y="430" width="360" height="64" rx="32" fill="white"/>
  <text x="880" y="470" text-anchor="middle" font-size="26" font-weight="800" fill="#1a1a2e" font-family="system-ui,sans-serif">Send Anonymous Message →</text>
  <!-- Branding -->
  <text x="1120" y="600" text-anchor="end" font-size="20" fill="white" fill-opacity="0.4" font-family="system-ui,sans-serif" font-weight="700">বং NGL by Bong Bari</text>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(svg);
    } catch {
      res.status(500).send('Server error');
    }
  });

  // ── PUT /u/:username/message/:id/react — Phase 27: Message Reactions ──
  router.put('/u/:username/message/:id/react', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const msgId = req.params.id;
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { reaction } = req.body || {};
      const validReactions = ['❤️', '😂', '🔥', '💀', '🫣', null];
      if (reaction !== null && reaction !== undefined && !validReactions.includes(reaction)) {
        return res.status(400).json({ message: 'Invalid reaction' });
      }

      if (USE_PG) {
        await pgDb!.update(nglMessages)
          .set({ reaction: reaction || null })
          .where(sql`${nglMessages.id} = ${msgId} AND ${nglMessages.recipientUsername} = ${username}`);
      } else {
        const msg = memMessages.find(m => m.id === msgId && m.recipientUsername === username);
        if (msg) msg.reaction = reaction || null;
      }

      res.json({ ok: true, reaction: reaction || null });
    } catch (err: any) {
      console.error('[NGL] react error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/theme — Phase 28: Custom Themes ──
  router.put('/u/:username/theme', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { theme } = req.body || {};
      if (!theme || !NGL_THEMES.includes(theme as any)) {
        return res.status(400).json({ message: `Invalid theme. Choose from: ${NGL_THEMES.join(', ')}` });
      }

      // Part 3: PRO-only themes — require active premium
      const PRO_ONLY = ['neon', 'rosegold', 'midnight'];
      if (PRO_ONLY.includes(theme)) {
        const isPremium = (user as any).isPremium === 1
          && (!(user as any).premiumUntil || new Date((user as any).premiumUntil).getTime() > Date.now());
        if (!isPremium) {
          return res.status(403).json({ code: 'PRO_REQUIRED', message: 'This theme is for Bong PRO users only.' });
        }
      }

      if (USE_PG) {
        await pgDb!.update(nglUsers).set({ theme }).where(eq(nglUsers.username, username));
      } else {
        const u = memUsers.get(username);
        if (u) u.theme = theme;
      }

      res.json({ ok: true, theme });
    } catch (err: any) {
      console.error('[NGL] theme error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── PUT /u/:username/photo — Phase 29: Profile Photo Upload ──
  router.put('/u/:username/photo', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const { photo } = req.body || {};
      if (!photo || typeof photo !== 'string') {
        return res.status(400).json({ message: 'Photo data required' });
      }

      // Validate it's a data URI image
      if (!photo.startsWith('data:image/')) {
        return res.status(400).json({ message: 'Invalid image format' });
      }

      // Size check (base64 string length)
      if (photo.length > MAX_PHOTO_SIZE) {
        return res.status(400).json({ message: 'Photo too large. Max 100KB.' });
      }

      if (USE_PG) {
        await pgDb!.update(nglUsers).set({ photo }).where(eq(nglUsers.username, username));
      } else {
        const u = memUsers.get(username);
        if (u) u.photo = photo;
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error('[NGL] photo upload error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── DELETE /u/:username/photo — Remove profile photo ──
  router.delete('/u/:username/photo', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      if (USE_PG) {
        await pgDb!.update(nglUsers).set({ photo: null }).where(eq(nglUsers.username, username));
      } else {
        const u = memUsers.get(username);
        if (u) u.photo = null;
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error('[NGL] photo delete error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ════════════════════════════════════════════════════════════
  // Phase 35: WhatsApp OTP — Phone Verification
  // ════════════════════════════════════════════════════════════

  // ── POST /otp/send — Request OTP for a username ──
  // Body: { username, phone, key }
  router.post('/otp/send', async (req: any, res) => {
    try {
      const { username, phone, key } = req.body || {};
      if (!username || !phone || !key) {
        return res.status(400).json({ message: 'username, phone, key are required' });
      }

      const cleanUser = (username as string).trim().toLowerCase();
      const user = await dbGetUser(cleanUser);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Auth: must own the account
      if (hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      // Rate limit: 1 OTP per minute per username
      const now = Date.now();
      const lastOtp = otpRateMap.get(cleanUser) || 0;
      if (now - lastOtp < OTP_COOLDOWN) {
        const wait = Math.ceil((OTP_COOLDOWN - (now - lastOtp)) / 1000);
        return res.status(429).json({ message: `Wait ${wait}s before requesting another OTP` });
      }

      // Validate phone
      const cleanPhone = validatePhone(phone);
      if (!cleanPhone) {
        return res.status(400).json({ message: 'Invalid phone number. Use 10-digit Indian number.' });
      }

      // Generate OTP
      const otp = generateOtp();
      const hash = hashOtp(otp);
      const expiry = otpExpiryDate();

      // Save OTP hash + phone + expiry to DB
      if (USE_PG) {
        await pgDb!.update(nglUsers).set({
          phone: cleanPhone,
          otpHash: hash,
          otpExpiry: expiry,
        }).where(eq(nglUsers.username, cleanUser));
      } else {
        const u = memUsers.get(cleanUser);
        if (u) {
          u.phone = cleanPhone;
          u.otpHash = hash;
          u.otpExpiry = expiry.getTime();
        }
      }

      // Update rate limiter BEFORE delivery (prevent spam even if delivery fails)
      otpRateMap.set(cleanUser, now);
      // Reset verify attempts for this user (new OTP = fresh attempts)
      otpAttemptMap.delete(cleanUser);

      // Send via WhatsApp (or log in dev)
      let result;
      if (process.env.META_WABA_TOKEN) {
        result = await sendWhatsAppOtp(cleanPhone, otp);
      } else {
        result = devLogOtp(cleanPhone, otp);
      }

      if (!result.ok) {
        return res.status(502).json({ message: result.error || 'Failed to send OTP' });
      }

      res.json({
        ok: true,
        phone: maskPhone(cleanPhone),
        expiresIn: 300, // seconds
      });
    } catch (err: any) {
      console.error('[NGL] OTP send error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /otp/verify — Verify OTP and mark phone as verified ──
  // Body: { username, otp, key }
  router.post('/otp/verify', async (req: any, res) => {
    try {
      const { username, otp, key } = req.body || {};
      if (!username || !otp || !key) {
        return res.status(400).json({ message: 'username, otp, key are required' });
      }

      const cleanUser = (username as string).trim().toLowerCase();
      const cleanOtp = (otp as string).trim();

      if (!/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({ message: 'OTP must be 6 digits' });
      }

      const user = await dbGetUser(cleanUser);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Auth
      if (hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      // Get current attempt count for brute-force protection
      const attempts = otpAttemptMap.get(cleanUser) || 0;

      // Verify OTP
      let storedHash: string | null;
      let storedExpiry: Date | null;

      if (USE_PG) {
        storedHash = (user as any).otpHash || null;
        storedExpiry = (user as any).otpExpiry ? new Date((user as any).otpExpiry) : null;
      } else {
        const u = memUsers.get(cleanUser);
        storedHash = u?.otpHash || null;
        storedExpiry = u?.otpExpiry ? new Date(u.otpExpiry) : null;
      }

      const check = verifyOtp(cleanOtp, storedHash, storedExpiry, attempts);

      if (!check.valid) {
        // Increment attempt counter on wrong code
        otpAttemptMap.set(cleanUser, attempts + 1);

        // If lockout triggered (expired or too many attempts), clear OTP from DB
        if (check.lockout) {
          otpAttemptMap.delete(cleanUser);
          if (USE_PG) {
            await pgDb!.update(nglUsers).set({ otpHash: null, otpExpiry: null })
              .where(eq(nglUsers.username, cleanUser));
          } else {
            const u = memUsers.get(cleanUser);
            if (u) { u.otpHash = null; u.otpExpiry = null; }
          }
        }

        const remaining = MAX_OTP_ATTEMPTS - (attempts + 1);
        return res.status(400).json({
          message: check.reason,
          attemptsLeft: remaining > 0 ? remaining : 0,
        });
      }

      // ✅ Success — mark phone as verified, clear OTP + attempts
      otpAttemptMap.delete(cleanUser);

      if (USE_PG) {
        await pgDb!.update(nglUsers).set({
          phoneVerified: 1,
          otpHash: null,
          otpExpiry: null,
        }).where(eq(nglUsers.username, cleanUser));
      } else {
        const u = memUsers.get(cleanUser);
        if (u) {
          u.phoneVerified = 1;
          u.otpHash = null;
          u.otpExpiry = null;
        }
      }

      res.json({
        ok: true,
        phone: maskPhone((user as any).phone),
        verified: true,
      });
    } catch (err: any) {
      console.error('[NGL] OTP verify error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── GET /u/:username/phone — Check phone verification status ──
  router.get('/u/:username/phone', async (req: any, res) => {
    try {
      const username = (req.params.username || '').trim().toLowerCase();
      const key = getAuthKey(req);

      const user = await dbGetUser(username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (!key || hashKey(key) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const phone = (user as any).phone || null;
      const verified = (user as any).phoneVerified === 1;

      res.json({
        phone: phone ? maskPhone(phone) : null,
        verified,
      });
    } catch (err: any) {
      console.error('[NGL] phone status error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ════════════════════════════════════════════════════════════
  // Part 3 (PRO): Razorpay Payment Integration
  // Zero-dep: uses built-in fetch + crypto HMAC. No SDK needed.
  // Env required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
  // Optional:     RAZORPAY_WEBHOOK_SECRET
  // ════════════════════════════════════════════════════════════

  const PRO_PLANS = {
    monthly: { amount: 9800, days: 30, label: 'Bong PRO — Monthly' },   // ₹98.00
    yearly:  { amount: 68300, days: 365, label: 'Bong PRO — Yearly' },  // ₹683.00
  } as const;
  type PlanKey = keyof typeof PRO_PLANS;

  // Light rate limit: max 5 order creations per user per 10 min (prevents abuse)
  const payOrderMap = new Map<string, number[]>();

  // ── POST /payment/create-order ── (auth required)
  router.post('/payment/create-order', async (req: any, res) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        return res.status(503).json({ code: 'PAYMENT_DISABLED', message: 'Payment temporarily unavailable' });
      }

      const { username, plan } = req.body || {};
      const authKey = getAuthKey(req);
      if (!username || !authKey) return res.status(400).json({ message: 'username + auth required' });

      const cleanUser = String(username).trim().toLowerCase();
      const user = await dbGetUser(cleanUser);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (hashKey(authKey) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      const planKey = (plan === 'yearly' ? 'yearly' : 'monthly') as PlanKey;
      const planDef = PRO_PLANS[planKey];

      // Abuse guard: 5 order creations per 10 min per user
      const now = Date.now();
      const bucket = (payOrderMap.get(cleanUser) || []).filter(t => now - t < 10 * 60_000);
      if (bucket.length >= 5) {
        return res.status(429).json({ message: 'Too many attempts. Try again in a few minutes.' });
      }
      bucket.push(now);
      payOrderMap.set(cleanUser, bucket);

      // Create order via Razorpay REST (Basic auth = KEY_ID:KEY_SECRET)
      const receipt = `bong_${cleanUser.slice(0, 20)}_${now}`.slice(0, 40);
      const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        body: JSON.stringify({
          amount: planDef.amount,
          currency: 'INR',
          receipt,
          notes: { username: cleanUser, plan: planKey },
        }),
      });
      if (!rzRes.ok) {
        const errTxt = await rzRes.text().catch(() => '');
        console.error('[NGL/pay] create-order failed:', rzRes.status, errTxt);
        return res.status(502).json({ message: 'Razorpay order creation failed' });
      }
      const order = await rzRes.json() as any;

      res.json({
        orderId: order.id,
        amount: planDef.amount,
        currency: 'INR',
        keyId,
        plan: planKey,
        planLabel: planDef.label,
      });
    } catch (err: any) {
      console.error('[NGL/pay] create-order error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /payment/verify ── (auth required, marks user PRO on success)
  router.post('/payment/verify', async (req: any, res) => {
    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return res.status(503).json({ code: 'PAYMENT_DISABLED', message: 'Payment temporarily unavailable' });
      }

      const { username, razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body || {};
      const authKey = getAuthKey(req);
      if (!username || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !authKey) {
        return res.status(400).json({ message: 'Missing verification fields' });
      }

      const cleanUser = String(username).trim().toLowerCase();
      const user = await dbGetUser(cleanUser);
      if (!user) return res.status(404).json({ message: 'User not found' });
      if (hashKey(authKey) !== user.secretKeyHash) {
        return res.status(403).json({ message: 'Invalid secret key' });
      }

      // HMAC SHA256 verification: body = `order_id|payment_id`, secret = KEY_SECRET
      const expected = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature) {
        console.warn('[NGL/pay] Signature mismatch for', cleanUser);
        return res.status(400).json({ code: 'BAD_SIGNATURE', message: 'Payment verification failed' });
      }

      const planKey = (plan === 'yearly' ? 'yearly' : 'monthly') as PlanKey;
      const planDef = PRO_PLANS[planKey];
      const now = Date.now();
      // Extend from current premiumUntil if still active, else from now
      const currentUntil = (user as any).premiumUntil ? new Date((user as any).premiumUntil).getTime() : 0;
      const base = currentUntil > now ? currentUntil : now;
      const premiumUntil = new Date(base + planDef.days * 24 * 60 * 60 * 1000);

      if (USE_PG) {
        await pgDb!
          .update(nglUsers)
          .set({ isPremium: 1, premiumUntil } as any)
          .where(eq(nglUsers.username, cleanUser));
      } else {
        const u = memUsers.get(cleanUser) as any;
        if (u) { u.isPremium = 1; u.premiumUntil = premiumUntil; }
      }

      console.log(`[NGL/pay] ✓ PRO activated for @${cleanUser} (${planKey}) until ${premiumUntil.toISOString()}`);
      res.json({
        success: true,
        isPremium: 1,
        premiumUntil: premiumUntil.toISOString(),
        plan: planKey,
      });
    } catch (err: any) {
      console.error('[NGL/pay] verify error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ── POST /payment/webhook ── (Razorpay → us; no user auth, signed by webhook secret)
  router.post('/payment/webhook', async (req: any, res) => {
    try {
      const whSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!whSecret) {
        // If not configured, acknowledge to avoid Razorpay retries — but don't process
        return res.status(200).json({ received: true, processed: false, reason: 'webhook_secret_missing' });
      }

      const signature = req.headers['x-razorpay-signature'] as string | undefined;
      const rawBody = JSON.stringify(req.body || {}); // express.json leaves body as object; this recomputes canonical
      const expected = crypto.createHmac('sha256', whSecret).update(rawBody).digest('hex');

      if (!signature || expected !== signature) {
        console.warn('[NGL/pay] webhook signature mismatch');
        return res.status(400).json({ received: false, error: 'bad_signature' });
      }

      const event = req.body?.event as string | undefined;
      const notes = req.body?.payload?.payment?.entity?.notes || req.body?.payload?.order?.entity?.notes || {};
      const username = typeof notes.username === 'string' ? notes.username.trim().toLowerCase() : null;

      console.log(`[NGL/pay] webhook event=${event} user=${username || '?'}`);
      // Best-effort: on payment.captured we could also mark PRO, but /verify is the source of truth.
      // Keep this endpoint as observability + future renewal support.

      res.status(200).json({ received: true, event });
    } catch (err: any) {
      console.error('[NGL/pay] webhook error:', err);
      // Always 200 to prevent Razorpay retry storms; log the error
      res.status(200).json({ received: true, processed: false });
    }
  });

  app.use('/api/ngl', router);
}
