/**
 * Client-Side Extraction Intelligence — Server Endpoints
 * 
 * When visitors use the downloader, their browser (residential IP) can
 * extract metadata from Piped/Invidious mirrors. These endpoints let the
 * client:
 *   1. GET /api/extractor/mirrors  — fetch the best-performing mirrors
 *   2. POST /api/extractor/report  — report extraction success/failure
 * 
 * The server aggregates crowd-sourced data to learn which mirrors work
 * from which regions — building a global health map.
 */

import { Router, type Request, type Response } from 'express';
import { storage } from '../storage';

// Default mirror catalog — seeded on first request if DB is empty
const DEFAULT_MIRRORS: Array<{ url: string; type: 'piped' | 'invidious' | 'cobalt' }> = [
  { url: 'https://pipedapi.kavin.rocks', type: 'piped' },
  { url: 'https://pipedapi.adminforge.de', type: 'piped' },
  { url: 'https://pipedapi.in.projectsegfau.lt', type: 'piped' },
  { url: 'https://inv.nadeko.net', type: 'invidious' },
  { url: 'https://invidious.fdn.fr', type: 'invidious' },
  { url: 'https://invidious.privacyredirect.com', type: 'invidious' },
];

// In-memory rate limit: max 20 reports per clientHash per 5 minutes
const reportLimitMap = new Map<string, { count: number; resetsAt: number }>();
const REPORT_WINDOW_MS = 5 * 60_000;
const REPORT_MAX = 20;

function isRateLimited(clientHash: string): boolean {
  const now = Date.now();
  const entry = reportLimitMap.get(clientHash);
  if (!entry || now > entry.resetsAt) {
    reportLimitMap.set(clientHash, { count: 1, resetsAt: now + REPORT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > REPORT_MAX;
}

// Basic input validation helpers
function isValidMirrorUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 3 && u.hostname.length < 100;
  } catch { return false; }
}

function sanitizeStr(s: unknown, maxLen: number): string | undefined {
  if (typeof s !== 'string') return undefined;
  return s.slice(0, maxLen).replace(/[^\x20-\x7E]/g, '');
}

/**
 * GET /api/extractor/mirrors
 * Returns the current list of alive mirrors, sorted by success rate.
 * Client uses this to know which mirrors to try first.
 */
async function getMirrors(_req: Request, res: Response): Promise<void> {
  try {
    const alive = await storage.getAliveMirrors();

    // If DB has no mirrors yet, return the default catalog
    if (alive.length === 0) {
      res.json({
        mirrors: DEFAULT_MIRRORS.map(m => ({
          url: m.url,
          type: m.type,
          successRate: null,
          avgLatencyMs: null,
        })),
        source: 'defaults',
      });
      return;
    }

    res.json({
      mirrors: alive.map(m => ({
        url: m.mirrorUrl,
        type: m.mirrorType,
        successRate: m.totalRequests
          ? Math.round(((m.successCount ?? 0) / m.totalRequests) * 100)
          : null,
        avgLatencyMs: m.avgLatencyMs,
        countryStats: m.countryStats ? JSON.parse(m.countryStats) : null,
      })),
      source: 'db',
    });
  } catch (err: any) {
    console.error('[extractor/mirrors] Error:', err.message);
    // Graceful fallback
    res.json({ mirrors: DEFAULT_MIRRORS, source: 'fallback' });
  }
}

/**
 * POST /api/extractor/report
 * Client reports the result of a client-side extraction attempt.
 * Body: { clientHash, clientCountry?, mirrorUrl, mirrorType, platform,
 *         success, latencyMs?, httpStatus?, errorMsg?, videoId? }
 */
async function postReport(req: Request, res: Response): Promise<void> {
  const body = req.body;

  // Validate required fields
  const clientHash = sanitizeStr(body?.clientHash, 64);
  const mirrorUrl = sanitizeStr(body?.mirrorUrl, 300);
  const mirrorType = sanitizeStr(body?.mirrorType, 20);
  const platform = sanitizeStr(body?.platform, 10);
  const success = body?.success === true;

  if (!clientHash || !mirrorUrl || !mirrorType || !platform) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!isValidMirrorUrl(mirrorUrl)) {
    res.status(400).json({ error: 'Invalid mirror URL' });
    return;
  }

  if (isRateLimited(clientHash)) {
    res.status(429).json({ error: 'Too many reports' });
    return;
  }

  const clientCountry = sanitizeStr(body?.clientCountry, 4);
  const latencyMs = typeof body?.latencyMs === 'number' && body.latencyMs >= 0 && body.latencyMs < 60000
    ? Math.round(body.latencyMs) : null;
  const httpStatus = typeof body?.httpStatus === 'number' && body.httpStatus >= 100 && body.httpStatus < 600
    ? body.httpStatus : null;
  const errorMsg = sanitizeStr(body?.errorMsg, 200);
  const videoId = sanitizeStr(body?.videoId, 64);

  try {
    // Insert the raw report
    await storage.insertClientProxyReport({
      clientHash,
      clientCountry: clientCountry ?? null,
      mirrorUrl,
      mirrorType,
      platform,
      success,
      latencyMs,
      httpStatus,
      errorMsg: errorMsg ?? null,
      videoId: videoId ?? null,
    });

    // Update aggregated mirror health (fire-and-forget)
    storage.upsertMirrorHealth(mirrorUrl, mirrorType, success, latencyMs, clientCountry ?? undefined)
      .catch(e => console.error('[extractor/report] mirror health update failed:', e.message));

    res.json({ ok: true });
  } catch (err: any) {
    console.error('[extractor/report] Error:', err.message);
    res.status(500).json({ error: 'Failed to save report' });
  }
}

export function registerExtractorRoutes(app: import('express').Express): void {
  const router = Router();
  router.get('/mirrors', getMirrors);
  router.post('/report', postReport);
  app.use('/api/extractor', router);
  console.log('[extractor] Client-side extraction intelligence routes registered');
}
