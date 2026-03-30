/**
 * BongBari Extractor Intelligence — Cloudflare Worker
 *
 * Runs on Cloudflare's global edge network (free tier: 100K req/day).
 * Uses D1 (SQLite) which is automatically bound — no DATABASE_URL,
 * no drizzle-kit push, no manual migrations needed.
 *
 * Deploy:
 *   1. npx wrangler d1 create bongbari-extractor
 *   2. Update database_id in wrangler.toml
 *   3. npx wrangler d1 execute bongbari-extractor --file workers/schema.sql
 *   4. npx wrangler deploy
 *
 * Endpoints:
 *   GET  /mirrors  — ranked list of alive mirrors
 *   POST /report   — receive extraction success/failure from client browser
 */

// In-memory rate limit (per isolate, resets on cold start — sufficient throttle)
const reportRateMap = new Map();
const RATE_WINDOW = 5 * 60 * 1000; // 5 min
const RATE_MAX = 20;

function corsHeaders(origin) {
  const allowed = ['https://www.bongbari.com', 'http://localhost:5173'];
  const use = allowed.includes(origin) ? origin : 'https://www.bongbari.com';
  return {
    'Access-Control-Allow-Origin': use,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function isRateLimited(hash) {
  const now = Date.now();
  const entry = reportRateMap.get(hash);
  if (!entry || now > entry.resetsAt) {
    reportRateMap.set(hash, { count: 1, resetsAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

function sanitize(val, maxLen) {
  if (typeof val !== 'string') return null;
  return val.slice(0, maxLen).replace(/[^\x20-\x7E]/g, '') || null;
}

function isValidMirrorUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.length > 3 && u.hostname.length < 100;
  } catch { return false; }
}

// ── GET /mirrors ─────────────────────────────────────────────────
async function handleGetMirrors(env, origin) {
  const { results } = await env.DB.prepare(
    `SELECT mirror_url, mirror_type, total_requests, success_count, avg_latency_ms, country_stats
     FROM mirror_health
     WHERE is_alive = 1
     ORDER BY
       CASE WHEN total_requests = 0 THEN 0
            ELSE CAST(success_count AS REAL) / total_requests
       END DESC,
       avg_latency_ms ASC NULLS LAST
     LIMIT 20`
  ).all();

  const mirrors = (results || []).map(r => ({
    url: r.mirror_url,
    type: r.mirror_type,
    successRate: r.total_requests > 0
      ? Math.round((r.success_count / r.total_requests) * 100)
      : null,
    avgLatencyMs: r.avg_latency_ms,
    countryStats: r.country_stats ? (() => { try { return JSON.parse(r.country_stats); } catch { return null; } })() : null,
  }));

  return json({ mirrors, source: 'cf-d1' }, 200, origin);
}

// ── POST /report ──────────────────────────────────────────────────
async function handlePostReport(request, env, origin) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400, origin); }

  const clientHash  = sanitize(body?.clientHash, 64);
  const mirrorUrl   = sanitize(body?.mirrorUrl, 300);
  const mirrorType  = sanitize(body?.mirrorType, 20);
  const platform    = sanitize(body?.platform, 10);
  const success     = body?.success === true ? 1 : 0;

  if (!clientHash || !mirrorUrl || !mirrorType || !platform) {
    return json({ error: 'Missing required fields' }, 400, origin);
  }
  if (!isValidMirrorUrl(mirrorUrl)) {
    return json({ error: 'Invalid mirror URL' }, 400, origin);
  }
  if (isRateLimited(clientHash)) {
    return json({ error: 'Too many reports' }, 429, origin);
  }

  const clientCountry = sanitize(body?.clientCountry, 4);
  const latencyMs = typeof body?.latencyMs === 'number' && body.latencyMs >= 0 && body.latencyMs < 60000
    ? Math.round(body.latencyMs) : null;
  const httpStatus = typeof body?.httpStatus === 'number' && body.httpStatus >= 100 && body.httpStatus < 600
    ? body.httpStatus : null;
  const errorMsg = sanitize(body?.errorMsg, 200);
  const videoId  = sanitize(body?.videoId, 64);

  // Insert raw report
  await env.DB.prepare(
    `INSERT INTO client_proxy_reports
      (client_hash, client_country, mirror_url, mirror_type, platform, success, latency_ms, http_status, error_msg, video_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(clientHash, clientCountry, mirrorUrl, mirrorType, platform, success, latencyMs, httpStatus, errorMsg, videoId).run();

  // Upsert mirror_health aggregate
  const existing = await env.DB.prepare(
    `SELECT total_requests, success_count, avg_latency_ms, country_stats FROM mirror_health WHERE mirror_url = ?`
  ).bind(mirrorUrl).first();

  if (existing) {
    const newTotal   = (existing.total_requests || 0) + 1;
    const newSuccess = (existing.success_count || 0) + success;
    const newAvg = (success && latencyMs)
      ? Math.round(((existing.avg_latency_ms || 0) * (existing.total_requests || 0) + latencyMs) / newTotal)
      : existing.avg_latency_ms;

    let stats = {};
    try { stats = JSON.parse(existing.country_stats || '{}'); } catch {}
    if (clientCountry) {
      if (!stats[clientCountry]) stats[clientCountry] = { ok: 0, fail: 0 };
      stats[clientCountry][success ? 'ok' : 'fail']++;
    }

    const isAlive = newTotal > 5 ? (newSuccess / newTotal > 0.1 ? 1 : 0) : 1;
    await env.DB.prepare(
      `UPDATE mirror_health
       SET total_requests = ?, success_count = ?, avg_latency_ms = ?,
           country_stats = ?, is_alive = ?, updated_at = datetime('now')
       WHERE mirror_url = ?`
    ).bind(newTotal, newSuccess, newAvg, JSON.stringify(stats), isAlive, mirrorUrl).run();
  } else {
    const stats = {};
    if (clientCountry) stats[clientCountry] = { ok: success, fail: 1 - success };
    await env.DB.prepare(
      `INSERT INTO mirror_health (mirror_url, mirror_type, total_requests, success_count, avg_latency_ms, country_stats, is_alive)
       VALUES (?, ?, 1, ?, ?, ?, 1)`
    ).bind(mirrorUrl, mirrorType, success, latencyMs, JSON.stringify(stats)).run();
  }

  return json({ ok: true }, 200, origin);
}

// ── Worker Entry Point ────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, '');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health check
    if (path === '' || path === '/health') {
      return json({ ok: true, service: 'bongbari-extractor', ts: Date.now() }, 200, origin);
    }

    if (path === '/mirrors' && request.method === 'GET') {
      return handleGetMirrors(env, origin);
    }

    if (path === '/report' && request.method === 'POST') {
      return handlePostReport(request, env, origin);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
};
