#!/usr/bin/env node
/**
 * ============================================================
 * BONG BARI — Zero-Framework CORS Proxy Engine
 * ============================================================
 * Phase 2, Phrase 1: Core proxy server using ONLY native Node.js modules.
 * No Express. No frameworks. Raw http + https + stream.pipeline.
 *
 * Port: 8080 (runs alongside main Express server on 5000)
 * Security: x-api-key header required on every request
 * CORS: Full wildcard for our frontend
 * Streaming: Zero-RAM via stream.pipeline()
 *
 * Usage:
 *   node server/proxy-engine/server.mjs
 *   PROXY_API_KEY=mysecret node server/proxy-engine/server.mjs
 * ============================================================
 */

import http from 'node:http';
import https from 'node:https';
import { pipeline } from 'node:stream';
import { URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// ── Configuration ────────────────────────────────────────────
const PORT = parseInt(process.env.PROXY_PORT || '8080', 10);
const API_KEY = process.env.PROXY_API_KEY || 'bongbari-proxy-dev-2026';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 15_000; // 15s per proxy attempt

// Allowed origins (empty = allow all with wildcard)
const ALLOWED_ORIGINS = process.env.PROXY_ALLOWED_ORIGINS
  ? process.env.PROXY_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

// ── Rate Limiter (in-memory token bucket per IP) ─────────────
const RATE_LIMIT = parseInt(process.env.PROXY_RATE_LIMIT || '120', 10); // requests per minute
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > 60_000) {
    bucket = { count: 0, windowStart: now };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

// Cleanup stale buckets every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(ip);
  }
}, 300_000);

// ── Stealth Profiles (built-in, no imports needed) ───────────
const USER_PROFILES = [
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Chromium";v="124", "Not(A:Brand";v="24"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
    },
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Chromium";v="124"',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-site': 'none',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
    },
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.5',
    },
  },
  {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  },
];

function getRandomProfile() {
  return USER_PROFILES[Math.floor(Math.random() * USER_PROFILES.length)];
}

// ── Proxy Manager (loads from proxies.txt if available) ──────
class ProxyManager {
  constructor() {
    this.proxies = [];
    this.deadProxies = new Set();
    this.filePath = path.resolve(process.cwd(), 'server', 'proxy-engine', 'proxies.txt');
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.proxies = data.split('\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));
        console.log(`[ProxyManager] Loaded ${this.proxies.length} proxies from ${this.filePath}`);
      } else {
        console.log('[ProxyManager] No proxies.txt found — running in DIRECT mode (no proxy rotation)');
      }
    } catch (err) {
      console.error('[ProxyManager] Failed to load proxies:', err.message);
      this.proxies = [];
    }
  }

  getProxy() {
    const alive = this.proxies.filter(p => !this.deadProxies.has(p));
    if (alive.length === 0) return null;
    return alive[Math.floor(Math.random() * alive.length)];
  }

  markDead(proxy) {
    this.deadProxies.add(proxy);
    console.log(`[ProxyManager] Marked dead: ${proxy} (${this.proxies.length - this.deadProxies.size} remaining)`);
  }

  get hasProxies() {
    return this.proxies.length > 0 && this.proxies.length > this.deadProxies.size;
  }

  // Reload proxies from disk (for live reload)
  reload() {
    this.deadProxies.clear();
    this.load();
  }
}

const proxyManager = new ProxyManager();

// Hot-reload proxies every 60 minutes
setInterval(() => proxyManager.reload(), 60 * 60 * 1000);

// ── CORS Helper ──────────────────────────────────────────────
function setCorsHeaders(req, res) {
  // Dynamic origin or wildcard
  const origin = req.headers['origin'];
  if (ALLOWED_ORIGINS.length > 0 && origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
}

// ── Core Proxy Execution (with retry + streaming) ────────────
function executeProxy(clientReq, clientRes, targetUrlStr, retriesLeft) {
  if (retriesLeft < 0) {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'Bad Gateway: all retries exhausted' }));
    }
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    clientRes.writeHead(400, { 'Content-Type': 'application/json' });
    return clientRes.end(JSON.stringify({ error: 'Invalid target URL' }));
  }

  // Only allow http/https targets
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    clientRes.writeHead(400, { 'Content-Type': 'application/json' });
    return clientRes.end(JSON.stringify({ error: 'Only http/https targets allowed' }));
  }

  const profile = getRandomProfile();
  const requestModule = targetUrl.protocol === 'https:' ? https : http;

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: clientReq.method === 'OPTIONS' ? 'GET' : clientReq.method,
    timeout: REQUEST_TIMEOUT,
    headers: {
      // Use stealth profile headers
      'User-Agent': profile.ua,
      ...profile.headers,
      // Forward specific client headers that matter
      ...(clientReq.headers['range'] ? { 'Range': clientReq.headers['range'] } : {}),
      ...(clientReq.headers['if-none-match'] ? { 'If-None-Match': clientReq.headers['if-none-match'] } : {}),
    },
  };

  // Security: strip ALL proxy-revealing headers
  delete options.headers['host'];
  delete options.headers['x-api-key'];
  delete options.headers['x-forwarded-for'];
  delete options.headers['x-real-ip'];
  delete options.headers['via'];
  delete options.headers['forwarded'];

  const proxyReq = requestModule.request(options, (proxyRes) => {
    // Detect bot wall: 403 + Cloudflare signature → retry with different profile
    if (proxyRes.statusCode === 403) {
      const server = (proxyRes.headers['server'] || '').toLowerCase();
      if (server.includes('cloudflare') || server.includes('ddos-guard')) {
        console.log(`[Proxy] Cloudflare/DDoS-Guard 403 on attempt ${MAX_RETRIES - retriesLeft + 1} — retrying`);
        proxyRes.resume(); // drain the response
        return executeProxy(clientReq, clientRes, targetUrlStr, retriesLeft - 1);
      }
    }

    // Forward response headers, stripping target's CORS (we inject our own)
    const filteredHeaders = {};
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (!key.toLowerCase().startsWith('access-control-')) {
        filteredHeaders[key] = value;
      }
    }

    // Set our CORS headers + target's filtered headers
    setCorsHeaders(clientReq, clientRes);
    for (const [key, value] of Object.entries(filteredHeaders)) {
      try { clientRes.setHeader(key, value); } catch { /* skip invalid */ }
    }

    clientRes.writeHead(proxyRes.statusCode);

    // Zero-RAM streaming via pipeline (auto-cleans up on disconnect)
    pipeline(proxyRes, clientRes, (err) => {
      if (err && !clientRes.destroyed) {
        // Client disconnected mid-stream — this is normal, not an error
        if (err.code === 'ERR_STREAM_PREMATURE_CLOSE' || err.code === 'ECONNRESET') return;
        console.error('[Stream Error]', err.message);
      }
    });
  });

  // Network errors → retry with fallback
  proxyReq.on('error', (err) => {
    if (['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(err.code)) {
      console.log(`[Proxy] Network error (${err.code}) — retrying (${retriesLeft - 1} left)`);
      return executeProxy(clientReq, clientRes, targetUrlStr, retriesLeft - 1);
    }
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: `Proxy error: ${err.message}` }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Timeout'));
  });

  // For GET/HEAD/OPTIONS — no body to forward
  if (['GET', 'HEAD', 'OPTIONS'].includes(clientReq.method)) {
    proxyReq.end();
  } else {
    // Stream client body → proxy (for POST etc.)
    pipeline(clientReq, proxyReq, (err) => {
      if (err) console.error('[Body Stream Error]', err.message);
    });
  }
}

// ── HTTP Server ──────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  // 1. CORS Firewall — handle preflight instantly
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 2. Health check (no auth required)
  let reqUrl;
  try {
    reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  if (reqUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      proxies: proxyManager.proxies.length,
      deadProxies: proxyManager.deadProxies.size,
      memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }));
  }

  // 3. Security — require API key
  if (req.headers['x-api-key'] !== API_KEY) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: invalid or missing x-api-key' }));
  }

  // 4. Rate limiting
  if (isRateLimited(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too many requests. Slow down.' }));
  }

  // 5. Routing
  if (reqUrl.pathname === '/proxy') {
    const targetUrl = reqUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing "url" query parameter' }));
    }
    // Validate URL format to prevent SSRF
    try {
      const parsed = new URL(targetUrl);
      // Block internal/private IPs
      const host = parsed.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') ||
          host.startsWith('192.168.') || host.startsWith('172.') || host === '0.0.0.0' ||
          host === '::1' || host.endsWith('.local')) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Access to internal networks is blocked' }));
      }
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid target URL' }));
    }
    return executeProxy(req, res, targetUrl, MAX_RETRIES);
  }

  if (reqUrl.pathname === '/reload-proxies') {
    proxyManager.reload();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, proxies: proxyManager.proxies.length }));
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found. Use GET /proxy?url=TARGET or GET /health' }));
});

// ── Handle server-level errors ───────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[FATAL] Port ${PORT} is already in use. Kill the existing process or use PROXY_PORT env.`);
    process.exit(1);
  }
  console.error('[Server Error]', err);
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Proxy Engine] Shutting down gracefully...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000); // force kill after 5s
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  BONG BARI CORS Proxy Engine                ║');
  console.log(`  ║  Port: ${String(PORT).padEnd(39)}║`);
  console.log(`  ║  Proxies: ${String(proxyManager.proxies.length).padEnd(36)}║`);
  console.log(`  ║  Mode: ${proxyManager.hasProxies ? 'PROXY ROTATION' : 'DIRECT (no proxies.txt)'}${' '.repeat(Math.max(0, 39 - (proxyManager.hasProxies ? 14 : 25)))}║`);
  console.log(`  ║  Rate Limit: ${RATE_LIMIT} req/min/IP${' '.repeat(Math.max(0, 33 - String(RATE_LIMIT).length - 12))}║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Health:  http://localhost:${PORT}/health`);
  console.log(`  Proxy:   http://localhost:${PORT}/proxy?url=https://httpbin.org/get`);
  console.log(`  Reload:  http://localhost:${PORT}/reload-proxies`);
  console.log('');
});
