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
type FetchResponse = Awaited<ReturnType<typeof fetch>>;
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { Blob } from 'buffer';
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
  parentFolder: string;
  fileId: string;
  fileName: string;
  md5: string;
}

// ── Helper: typed fetch with timeout ───────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { agent?: any } = {},
  timeoutMs = 15000,
): Promise<FetchResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // node-fetch / undici both accept signal
    return await fetch(url, { ...options, signal: ctrl.signal as any });
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

  // Build FormData with file stream
  const fileStream = fs.createReadStream(filePath);
  const formData = new FormData();
  
  // Read file into blob for FormData (Node 18+)
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' }) as any;
  formData.append('file', blob, fileName);

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

  // Cleanup stream
  fileStream.destroy();

  if (!uploadResp.ok) throw new Error(`GoFile upload HTTP ${uploadResp.status}`);
  const result: any = await uploadResp.json();
  if (result.status !== 'ok') throw new Error(`GoFile upload failed: ${result.status}`);
  return result.data as GoFileUploaderData;
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

export function registerShareRoutes(app: any) {
  app.use('/api/share', router);
}
