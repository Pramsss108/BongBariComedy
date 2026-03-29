/**
 * ============================================================
 * BONG SHARE — Server-Side GoFile Proxy Upload Engine
 * ============================================================
 * 
 * WHY THIS EXISTS:
 *   GoFile.io DNS is blocked at user's ISP level. Direct browser
 *   XHR to GoFile fails. This route acts as an intelligent proxy:
 *   Browser → Render (this) → [optional proxy from pool] → GoFile
 *
 * WATERFALL (zero failure tolerance):
 *   Layer 1: Direct connection (Render datacenter → GoFile, fastest)
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
  // Prefer EU zone for latency from Render (US-East) → balanced
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

// ── ROUTE: Health check — test if Render can reach GoFile ───────
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
   Browser → Render → catbox/litterbox → direct download URL back
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
   FILEBIN DOWNLOAD PROXY — cloaks filebin URLs, forces download
   Browser → Render → filebin (302 → S3 presigned) → stream back
   User NEVER sees filebin.net domain. All downloads via our API.
   ══════════════════════════════════════════════════════════════ */

/** GET /api/share/dl/:binId/:chunkName?as=filename.mkv
 *  Resolves filebin URL → follows 302 → streams S3 file back
 *  with Content-Disposition: attachment (forces download, not play)
 */
router.get('/dl/:binId/:chunkName', async (req: Request, res: ExpressResponse) => {
  const { binId, chunkName } = req.params;
  const downloadAs = String(req.query.as || chunkName);

  // Validate params (prevent path traversal)
  if (!binId || !chunkName || /[\/\\]/.test(binId) || /[\/\\]/.test(chunkName)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const filebinUrl = `https://filebin.net/${encodeURIComponent(binId)}/${encodeURIComponent(chunkName)}`;
    
    // Step 1: Get the 302 redirect → presigned S3 URL
    // Must use curl-like User-Agent (filebin serves HTML warning page to browser UAs)
    const redirectResp = await fetchWithTimeout(filebinUrl, {
      headers: { 'User-Agent': 'curl/8.0' },
      redirect: 'manual',
    }, 30000);

    if (redirectResp.status !== 302) {
      return res.status(redirectResp.status).json({ error: `Upstream returned ${redirectResp.status} (expected 302)` });
    }

    const s3Url = redirectResp.headers.get('location');
    if (!s3Url) {
      return res.status(502).json({ error: 'No redirect URL from upstream' });
    }

    // Step 2: Fetch real file from S3 presigned URL
    const upstream = await fetchWithTimeout(s3Url, {
      redirect: 'follow',
    }, 5 * 60 * 1000); // 5 min timeout for large files

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Storage returned ${upstream.status}` });
    }

    // Forward content headers, force attachment download
    const ct = upstream.headers.get('content-type') || 'application/octet-stream';
    const cl = upstream.headers.get('content-length');
    
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadAs.replace(/"/g, '_')}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (cl) res.setHeader('Content-Length', cl);

    // Stream body to client
    if (upstream.body) {
      upstream.body.pipe(res);
      upstream.body.on('error', () => { try { res.end(); } catch {} });
    } else {
      const buf = await upstream.buffer();
      res.send(buf);
    }
  } catch (err: any) {
    console.error(`[ShareDL] Error proxying ${binId}/${chunkName}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Download proxy failed', detail: err.message });
    }
  }
});

/** GET /api/share/zip/:binId
 *  Proxies filebin's native server-side ZIP endpoint.
 *  Cloaks the filebin URL — user downloads from our domain.
 */
router.get('/zip/:binId', async (req: Request, res: ExpressResponse) => {
  const { binId } = req.params;
  
  if (!binId || /[\/\\]/.test(binId)) {
    return res.status(400).json({ error: 'Invalid bin ID' });
  }

  try {
    const zipUrl = `https://filebin.net/archive/${encodeURIComponent(binId)}/zip`;

    const upstream = await fetchWithTimeout(zipUrl, {
      headers: { 'User-Agent': 'curl/8.0' },
      redirect: 'follow',
    }, 10 * 60 * 1000); // 10 min for large ZIPs

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `ZIP endpoint returned ${upstream.status}` });
    }

    const cl = upstream.headers.get('content-length');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="BongBari_Bundle.zip"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (cl) res.setHeader('Content-Length', cl);

    if (upstream.body) {
      upstream.body.pipe(res);
      upstream.body.on('error', () => { try { res.end(); } catch {} });
    } else {
      const buf = await upstream.buffer();
      res.send(buf);
    }
  } catch (err: any) {
    console.error(`[ShareZIP] Error proxying ZIP for ${binId}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'ZIP proxy failed', detail: err.message });
    }
  }
});

/** POST /api/share/upload-fb/:binId/:chunkName
 *  Upload proxy: client streams raw body → Render → filebin.net.
 *  Bypasses filebin's ~55 KB/s residential IP rate limit.
 *  Render datacenter → filebin S3 has no such cap → dramatically faster.
 *  No disk buffering — body is streamed end-to-end, zero OOM risk.
 */
router.options('/upload-fb/:binId/:chunkName', (_req: Request, res: ExpressResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length, X-CSRF-Token, Authorization');
  res.status(204).end();
});

router.post('/upload-fb/:binId/:chunkName', async (req: Request, res: ExpressResponse) => {
  const { binId, chunkName } = req.params;

  // Validate — reject path-traversal attempts
  if (!binId || !chunkName || /[\/\\<>]/.test(binId) || /[\/\\<>]/.test(chunkName)) {
    return res.status(400).json({ error: 'Invalid binId or chunkName' });
  }

  try {
    const filebinUrl = `https://filebin.net/${encodeURIComponent(binId)}/${encodeURIComponent(chunkName)}`;

    const headers: Record<string, string> = { 'User-Agent': 'curl/8.0' };
    // Forward Content-Length so filebin knows exactly when the body ends
    const cl = req.headers['content-length'];
    if (cl) headers['Content-Length'] = cl;

    // Stream req directly to filebin — no disk write, no memory buffer
    const upstream = await fetchWithTimeout(
      filebinUrl,
      { method: 'POST', body: req as any, headers },
      30 * 60 * 1000, // 30 min (80 MB chunk @ ~40 KB/s edge case)
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).end();
  } catch (err: any) {
    console.error('[ShareUploadFB] Proxy upload failed:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upload proxy failed', detail: err.message });
    }
  }
});

export function registerShareRoutes(app: any) {
  app.use('/api/share', router);
}
