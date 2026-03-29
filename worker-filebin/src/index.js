/**
 * BongBari Filebin Proxy — Cloudflare Worker
 * ============================================
 * Routes:
 *   POST /upload/:binId/:chunkName    — proxy upload browser → filebin (no residential rate limit)
 *   GET  /dl/:binId/:chunkName?as=fn  — proxy download with forced Content-Disposition: attachment
 *   GET  /zip/:binId                  — proxy filebin native ZIP with forced attachment
 *   OPTIONS *                         — CORS preflight
 *
 * Why Cloudflare Workers:
 *   - 300+ global edge POPs → fast everywhere for every user
 *   - 100,000 free requests/day, no pipeline/build minutes concept
 *   - Datacenter-to-datacenter bandwidth to filebin → no per-IP rate cap
 *   - Deploy once: cd worker-filebin && npx wrangler deploy
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Length, Authorization, X-CSRF-Token',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // ── CORS preflight ──────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── Health check ────────────────────────────────────────────────
    if (pathname === '/' || pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'BongBari Filebin Proxy', edge: request.cf?.colo || 'unknown' }), {
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // ── POST /upload/:binId/:chunkName ──────────────────────────────
    // Streams the body directly to filebin — no buffering. Uses curl UA
    // so filebin datacenter path is used (no residential rate limiting).
    const uploadMatch = pathname.match(/^\/upload\/([^/]+)\/([^/]+)$/);
    if (request.method === 'POST' && uploadMatch) {
      const [, binId, chunkName] = uploadMatch;

      // Validate to prevent SSRF
      if (!isValidBinId(binId) || !isValidChunkName(chunkName)) {
        return new Response('Invalid parameters', { status: 400, headers: CORS_HEADERS });
      }

      const filebinUrl = `https://filebin.net/${encodeURIComponent(binId)}/${encodeURIComponent(chunkName)}`;
      const headers = new Headers();
      headers.set('User-Agent', 'curl/8.0');
      const cl = request.headers.get('content-length');
      if (cl) headers.set('Content-Length', cl);

      try {
        const upstream = await fetch(filebinUrl, {
          method: 'POST',
          headers,
          body: request.body,
          // duplex needed for streaming uploads in Workers
          duplex: 'half',
        });
        return new Response(null, {
          status: upstream.status,
          headers: CORS_HEADERS,
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ── GET /dl/:binId/:chunkName?as=filename ───────────────────────
    // Two-hop: filebin (curl UA) → follow redirect to S3 → stream back
    // with Content-Disposition: attachment to force browser save dialog.
    const dlMatch = pathname.match(/^\/dl\/([^/]+)\/([^/]+)$/);
    if (request.method === 'GET' && dlMatch) {
      const [, binId, chunkName] = dlMatch;
      const downloadAs = (url.searchParams.get('as') || chunkName).replace(/"/g, '_');

      if (!isValidBinId(binId) || !isValidChunkName(chunkName)) {
        return new Response('Invalid parameters', { status: 400, headers: CORS_HEADERS });
      }

      const filebinUrl = `https://filebin.net/${encodeURIComponent(binId)}/${encodeURIComponent(chunkName)}`;

      try {
        // follow:follow — CF Worker follows the 302→S3 automatically
        const upstream = await fetch(filebinUrl, {
          headers: { 'User-Agent': 'curl/8.0' },
          redirect: 'follow',
        });

        if (!upstream.ok) {
          return new Response(`filebin returned ${upstream.status}`, { status: upstream.status, headers: CORS_HEADERS });
        }

        const responseHeaders = new Headers(upstream.headers);
        // Override to force download (S3 sends Content-Disposition: inline by default)
        responseHeaders.set('Content-Disposition', `attachment; filename="${downloadAs}"`);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        // Remove S3 security headers that might interfere
        responseHeaders.delete('x-amz-request-id');
        responseHeaders.delete('x-amz-id-2');

        return new Response(upstream.body, {
          status: 200,
          headers: responseHeaders,
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    // ── GET /zip/:binId ─────────────────────────────────────────────
    // Proxies filebin's native server-side ZIP endpoint.
    const zipMatch = pathname.match(/^\/zip\/([^/]+)$/);
    if (request.method === 'GET' && zipMatch) {
      const [, binId] = zipMatch;

      if (!isValidBinId(binId)) {
        return new Response('Invalid parameters', { status: 400, headers: CORS_HEADERS });
      }

      const zipUrl = `https://filebin.net/archive/${encodeURIComponent(binId)}/zip`;

      try {
        const upstream = await fetch(zipUrl, {
          headers: { 'User-Agent': 'curl/8.0' },
          redirect: 'follow',
        });

        if (!upstream.ok) {
          return new Response(`filebin zip returned ${upstream.status}`, { status: upstream.status, headers: CORS_HEADERS });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="BongBari_Bundle.zip"',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },
};

// ── Security: prevent SSRF via path traversal ──────────────────────
function isValidBinId(id) {
  return /^[a-zA-Z0-9_\-]{1,80}$/.test(id);
}

function isValidChunkName(name) {
  return /^[a-zA-Z0-9_\-\.]{1,120}$/.test(name);
}
