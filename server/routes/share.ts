/**
 * ============================================================
 * BONG SHARE — Server-Side GoFile Proxy Upload Engine
 * ============================================================
 * 
 * WHY THIS EXISTS:
 *   GoFile.io DNS is blocked at user's ISP level. Direct browser
 *   XHR to GoFile fails. This route acts as an intelligent proxy:
 *   Browser → Oracle VM (this) → [optional proxy from pool] → GoFile
 *
 * WATERFALL (zero failure tolerance):
 *   Layer 1: Direct connection (Oracle datacenter → GoFile, fastest)
 *   Layer 2: Top-5 fastest proxies from live pool (latency-sorted)
 *   Layer 3: Expand to 20 proxies (all low-fail-count proxies)
 *   Layer 4: Structured error → UI falls back to P2P mode
 *
 * MEMORY SAFETY:
 *   Uses multer disk storage (/tmp/bongshare) to avoid OOM.
 *   Files are streamed from disk to GoFile, never fully buffered.
 *   Temp files are ALWAYS deleted in finally{} — zero disk leak.
 * ============================================================
 */

import { Router, Request, Response as ExpressResponse } from 'express';
import nodeFetch, { FormData as NodeFormData, fileFromSync } from 'node-fetch';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyKitchen } from '../proxyService';

const router = Router();

// ── Temp directory for uploads (auto-created) ─────────────────
const TMP_DIR = '/tmp/bongshare';
try { if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true }); } catch {}

// ── Multer: disk storage, 10 GB max ────────────────────────────
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 },
});

// ── GoFile response type ────────────────────────────────────────
interface GoFileUploaderData {
  downloadPage: string;
  code: string;
  parentFolderCode?: string;
  parentFolder: string;
  id: string;
  name: string;
  md5: string;
  guestToken?: string;
}

// ── Helper: typed fetch with timeout ───────────────────────────
async function fetchWithTimeout(
  url: string,
  options: any = {},
  timeoutMs = 15000,
): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await nodeFetch(url, { ...options, signal: ctrl.signal as any });
  } finally {
    clearTimeout(timer);
  }
}

// ── Helper: build proxy agent from URL string ───────────────────
function makeAgent(proxyUrl: string) {
  if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks://')) {
    return new SocksProxyAgent(proxyUrl) as any;
  }
  return new HttpsProxyAgent(proxyUrl) as any;
}

// ── Core: Get GoFile server name via optional proxy ─────────────
async function getGoFileServer(agent?: any): Promise<string> {
  const opts: any = { headers: { 'User-Agent': 'Mozilla/5.0' } };
  if (agent) opts.agent = agent;
  const resp = await fetchWithTimeout('https://api.gofile.io/servers', opts, 12000);
  if (!resp.ok) throw new Error(`GoFile servers API HTTP ${resp.status}`);
  const json: any = await resp.json();
  if (json.status !== 'ok' || !json.data?.servers?.length) throw new Error('GoFile servers API bad response');
  const servers: Array<{ name: string; zone: string }> = json.data.servers;
  // Prefer EU zone for latency from Oracle (Frankfurt) → balanced
  const eu = servers.filter(s => s.zone === 'eu');
  const pool = eu.length ? eu : servers;
  return pool[Math.floor(Math.random() * pool.length)].name;
}

// ── Core: Upload a file (from disk) to GoFile via optional proxy ─
async function uploadToGoFile(
  filePath: string,
  fileName: string,
  mimeType: string,
  agent?: any,
): Promise<GoFileUploaderData> {
  const server = await getGoFileServer(agent);

  // Build FormData with file from disk (node-fetch supports fileFromSync)
  const formData = new NodeFormData();
  const fileBlob = fileFromSync(filePath, mimeType || 'application/octet-stream');
  formData.append('file', fileBlob, fileName);

  const opts: any = {
    method: 'POST',
    body: formData,
    headers: { 'User-Agent': 'Mozilla/5.0' },
  };
  if (agent) opts.agent = agent;

  const uploadResp = await fetchWithTimeout(
    `https://${server}.gofile.io/uploadFile`,
    opts,
    10 * 60 * 1000, // 10 min max for large files
  );

  if (!uploadResp.ok) throw new Error(`GoFile upload HTTP ${uploadResp.status}`);
  const result: any = await uploadResp.json();
  if (result.status !== 'ok') throw new Error(`GoFile upload failed: ${result.status}`);
  const d = result.data as GoFileUploaderData;
  // Normalize: GoFile renamed 'code' to 'parentFolderCode'
  if (!d.code && d.parentFolderCode) d.code = d.parentFolderCode;
  if (!d.code && d.downloadPage) d.code = d.downloadPage.split('/d/').pop() || '';
  return d;
}

// ── Core: Get sorted proxy list for GoFile (gf-tagged first) ────
async function getBestProxiesForGoFile(limit = 20): Promise<string[]> {
  try {
    const all = await ProxyKitchen.getLiveProxies();
    const viable = all
      .filter(p => (p.platforms.failCount || 0) < 2) // skip near-dead
      .sort((a, b) => {
        // GoFile-tested proxies first
        const aGf = (a.platforms as any).gf === true ? 0 : (a.platforms as any).gf === false ? 2 : 1;
        const bGf = (b.platforms as any).gf === true ? 0 : (b.platforms as any).gf === false ? 2 : 1;
        if (aGf !== bGf) return aGf - bGf;
        // Then sort by latency
        return (a.platforms.latencyMs || 99999) - (b.platforms.latencyMs || 99999);
      });
    return viable.slice(0, limit).map(p => p.url);
  } catch {
    return [];
  }
}

// ── ROUTE: Health check — test if Oracle VM can reach GoFile ────
router.get('/gofile-health', async (_req: Request, res: ExpressResponse) => {
  const results: { layer: string; ok: boolean; latencyMs?: number; error?: string }[] = [];

  // Test direct
  const t0 = Date.now();
  try {
    const server = await getGoFileServer();
    results.push({ layer: 'direct', ok: true, latencyMs: Date.now() - t0 });
    // Test top proxy too
    const proxies = await getBestProxiesForGoFile(1);
    if (proxies.length) {
      const tp = Date.now();
      try {
        await getGoFileServer(makeAgent(proxies[0]));
        results.push({ layer: `proxy:${proxies[0].substring(0, 30)}`, ok: true, latencyMs: Date.now() - tp });
      } catch (e: any) {
        results.push({ layer: `proxy:${proxies[0].substring(0, 30)}`, ok: false, error: e.message });
      }
    }
    return res.json({ reachable: true, results, server });
  } catch (e: any) {
    results.push({ layer: 'direct', ok: false, latencyMs: Date.now() - t0, error: e.message });
    return res.json({ reachable: false, results });
  }
});

// ── ROUTE: Server-side upload ────────────────────────────────────
router.post('/upload', upload.single('file'), async (req: Request, res: ExpressResponse) => {
  const reqFile = (req as any).file;
  if (!reqFile) {
    return res.status(400).json({ status: 'error', message: 'No file provided' });
  }

  const filePath = reqFile.path;
  const fileName = Buffer.from(reqFile.originalname, 'latin1').toString('utf8');
  const mimeType = reqFile.mimetype || 'application/octet-stream';

  // Always clean up temp file
  const cleanup = () => {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
  };

  // Track attempts for logging
  const attempts: string[] = [];

  try {
    // ── LAYER 1: Direct connection (fastest — no proxy overhead) ──
    try {
      const data = await uploadToGoFile(filePath, fileName, mimeType, undefined);
      attempts.push('direct:ok');
      cleanup();
      return res.json({ status: 'ok', data, via: 'direct', attempts });
    } catch (directErr: any) {
      attempts.push(`direct:fail(${directErr.message.substring(0, 40)})`);
      console.warn('[ShareProxy] Direct GoFile failed:', directErr.message);
    }

    // ── LAYER 2+3: Try proxies from pool ──────────────────────────
    const proxies = await getBestProxiesForGoFile(20);

    if (!proxies.length) {
      console.warn('[ShareProxy] Proxy pool empty — no fallback available');
    }

    for (let i = 0; i < proxies.length; i++) {
      const proxyUrl = proxies[i];
      const agent = makeAgent(proxyUrl);
      try {
        const data = await uploadToGoFile(filePath, fileName, mimeType, agent);
        attempts.push(`proxy[${i}]:ok`);
        // Background: reward this proxy (it works for GoFile)
        ProxyKitchen.getLiveProxies().then(all => {
          const found = all.find(p => p.url === proxyUrl);
          if (found) {
            const updated = { ...found.platforms, gf: true } as any;
            ProxyKitchen.addVerifiedProxy(proxyUrl, updated);
          }
        }).catch(() => {});
        cleanup();
        return res.json({ status: 'ok', data, via: `proxy[${i}]`, attempts });
      } catch (proxyErr: any) {
        attempts.push(`proxy[${i}]:fail(${proxyErr.message.substring(0, 30)})`);
        // Light penalty — only strike if truly failed (not timeout of large file)
        if (!proxyErr.message.includes('AbortError') && !proxyErr.message.includes('abort')) {
          ProxyKitchen.banProxy(proxyUrl).catch(() => {});
        }
        // Don't log every proxy failure, only every 5th
        if (i % 5 === 4) console.warn(`[ShareProxy] Tried ${i + 1} proxies, still failing`);
      }
    }

    // ── LAYER 4: All layers failed ────────────────────────────────
    cleanup();
    return res.status(502).json({
      status: 'error',
      message: 'GoFile unreachable via all routes. Use P2P Transfer instead.',
      fallback: 'p2p',
      attempts: attempts.slice(0, 10), // cap log size
    });

  } catch (unexpectedErr: any) {
    cleanup();
    console.error('[ShareProxy] Unexpected error:', unexpectedErr);
    return res.status(500).json({
      status: 'error',
      message: unexpectedErr.message || 'Internal server error',
      fallback: 'p2p',
    });
  }
});

/* ══════════════════════════════════════════════════════════════
   CATBOX / LITTERBOX PROXY — bypasses CORS (no CORS headers)
   Browser → Oracle VM → catbox/litterbox → direct download URL back
   Storage is FREE on their servers. We only relay the upload bytes.
   ══════════════════════════════════════════════════════════════ */

const catboxUpload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB (litterbox max)
});

/** POST /api/share/upload-direct
 *  Body: multipart file + optional `host` field ('catbox' | 'litterbox')
 *  Returns: { status: 'ok', url: 'https://files.catbox.moe/...' }
 */
router.post('/upload-direct', catboxUpload.single('file'), async (req: Request, res: ExpressResponse) => {
  const tempPath = (req as any).file?.path;
  const originalName = (req as any).file?.originalname || 'file';
  const fileSize = (req as any).file?.size || 0;
  const host = (req.body?.host === 'litterbox') ? 'litterbox' : 'catbox';

  const cleanup = () => {
    try { if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch {}
  };

  if (!tempPath) {
    cleanup();
    return res.status(400).json({ status: 'error', message: 'No file provided' });
  }

  try {
    const formData = new NodeFormData();
    formData.append('reqtype', 'fileupload');
    if (host === 'litterbox') {
      formData.append('time', '72h');
    }
    formData.append('fileToUpload', fileFromSync(tempPath, (req as any).file?.mimetype || 'application/octet-stream'), originalName);

    const targetUrl = host === 'litterbox'
      ? 'https://litterbox.catbox.moe/resources/internals/api.php'
      : 'https://catbox.moe/user/api.php';

    console.log(`[ShareDirect] Uploading ${originalName} (${(fileSize / 1024 / 1024).toFixed(1)} MB) to ${host}…`);

    const response = await fetchWithTimeout(targetUrl, {
      method: 'POST',
      body: formData,
    }, 10 * 60 * 1000); // 10 min timeout for large files

    const text = await response.text();
    cleanup();

    const expectedPrefix = host === 'litterbox'
      ? 'https://litter.catbox.moe/'
      : 'https://files.catbox.moe/';

    if (text.trim().startsWith(expectedPrefix)) {
      console.log(`[ShareDirect] ✅ ${host} success: ${text.trim()}`);
      return res.json({ status: 'ok', url: text.trim(), host });
    } else {
      console.warn(`[ShareDirect] ❌ ${host} returned unexpected: ${text.slice(0, 200)}`);
      return res.status(502).json({ status: 'error', message: `${host} upload failed`, detail: text.slice(0, 200) });
    }
  } catch (err: any) {
    cleanup();
    console.error(`[ShareDirect] Error uploading to ${host}:`, err.message);
    return res.status(502).json({ status: 'error', message: err.message || `${host} upload failed` });
  }
});

/* ══════════════════════════════════════════════════════════════
   FILEBIN DOWNLOAD/UPLOAD PROXIES — REMOVED (March 2026)
   ──────────────────────────────────────────────────────────────
   Why removed:
   - Client already downloads DIRECTLY from filebin.net (CORS ✅)
   - Client already uploads DIRECTLY to filebin.net (CORS ✅)
   - These proxy routes streamed bytes through Oracle VM unnecessarily
   - On a 1GB VM, proxying large files → instant OOM/swap death
   - Direct client ↔ filebin = faster (no VPS middleman) + uses
     visitor's residential IP (no datacenter rate-limiting)

   If ISP-level filebin blocks appear in the future:
   - Deploy the Cloudflare Worker (worker-filebin/) and set
     VITE_FILEBIN_PROXY_BASE in client/.env.production
   - CF Worker has 300+ global POPs, 100K free req/day
   ══════════════════════════════════════════════════════════════ */

export function registerShareRoutes(app: any) {
  app.use('/api/share', router);
}
