/**
 * BongBari Tunnel Extension — Background Service Worker
 *
 * What this does:
 *   Opens a persistent WebSocket to the BongBari server and silently acts
 *   as a residential proxy node. When a user tries to download an Instagram
 *   Reel and our server's datacenter IP gets blocked, the server routes the
 *   fetch() through THIS extension instead — Meta sees a real home IP.
 *
 * Why the extension is better than a plain browser tab:
 *   1. host_permissions bypass — no CORS restrictions at all
 *   2. credentials: "include" — can use the user's actual Instagram session
 *      cookies, which unlocks content that completely blocks datacenter IPs
 *   3. 100% native TLS fingerprint — Chrome's real TLS stack, undetectable
 *      by JA3/JA4 anti-bot fingerprinting that blocks Node.js TLS
 *
 * User impact: zero. No data is stored. No bandwidth quota is eaten beyond
 * the tiny metadata HTML pages we fetch (< 200KB per request).
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const TUNNEL_URL = 'wss://api.bongbari.com/ws/tunnel?type=ext';
const FALLBACK_URL = 'wss://158.101.175.37:5000/ws/tunnel?type=ext';

const ALLOWED_HOSTS = [
  'instagram.com',
  'www.instagram.com',
  'i.instagram.com',
  'cdninstagram.com',
  'www.tiktok.com',
  'api.tiktok.com',
  'twitter.com',
  'x.com',
  'api.fxtwitter.com',
];

const CHUNK_SIZE = 16384; // 16 KB per WebSocket frame
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;

// ─── State ────────────────────────────────────────────────────────────────────

let ws = null;
let reconnectAttempts = 0;
let useFallback = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAllowed(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

function nextBackoffMs() {
  const exp = Math.min(BACKOFF_BASE_MS * Math.pow(2, reconnectAttempts), BACKOFF_MAX_MS);
  // ±30% jitter prevents thundering herd if server restarts
  return Math.floor(exp * (0.7 + Math.random() * 0.6));
}

// ─── Proxy execution ──────────────────────────────────────────────────────────

async function executeProxy(txId, targetUrl, reqHeaders) {
  if (!isAllowed(targetUrl)) {
    safeSend(JSON.stringify({ type: 'PROXY_ERROR', txId, message: 'Host not in allowlist' }));
    return;
  }

  // txId is always exactly 36 chars (UUID v4) — used as binary frame prefix
  const txIdBytes = new TextEncoder().encode(txId.padEnd(36, ' ').slice(0, 36));

  try {
    const resp = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        ...reqHeaders,
      },
      // KEY DIFFERENCE FROM PLAIN TAB:
      // Extensions with host_permissions can send credentials cross-origin.
      // This means the user's active Instagram login session cookies are
      // automatically included — bypassing auth walls entirely.
      credentials: 'include',
    });

    // ── Send metadata header first (JSON line, newline-terminated) ────────────
    const meta = JSON.stringify({
      status: resp.status,
      contentType: resp.headers.get('content-type') || 'application/octet-stream',
    });
    const metaBytes = new TextEncoder().encode(meta + '\n');
    const metaFrame = new Uint8Array(txIdBytes.length + metaBytes.length);
    metaFrame.set(txIdBytes, 0);
    metaFrame.set(metaBytes, txIdBytes.length);
    safeSend(metaFrame);

    // ── Stream body in CHUNK_SIZE slices ─────────────────────────────────────
    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
          const slice = value.subarray(offset, offset + CHUNK_SIZE);
          const frame = new Uint8Array(txIdBytes.length + slice.length);
          frame.set(txIdBytes, 0);
          frame.set(slice, txIdBytes.length);
          if (ws && ws.readyState === WebSocket.OPEN) {
            safeSend(frame);
          } else {
            throw new Error('WebSocket closed mid-stream');
          }
        }
      }
    }

    safeSend(JSON.stringify({ type: 'PROXY_DONE', txId }));

  } catch (err) {
    safeSend(JSON.stringify({ type: 'PROXY_ERROR', txId, message: err.message || 'fetch failed' }));
  }
}

function safeSend(data) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
  } catch { /* ignore send errors */ }
}

// ─── Connection management ────────────────────────────────────────────────────

function connect() {
  const url = useFallback ? FALLBACK_URL : TUNNEL_URL;
  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    console.log('[BongBari Ext] ✅ Connected as extension proxy node');
    // Broadcast pool status to popup if open
    chrome.runtime.sendMessage({ type: 'TUNNEL_STATUS', connected: true }).catch(() => {});
  };

  ws.onmessage = (evt) => {
    if (typeof evt.data !== 'string') return;
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }

    if (msg?.type === 'PROXY_REQUEST') {
      // Fire & forget — errors reported back via PROXY_ERROR message
      executeProxy(msg.txId, msg.url, msg.headers || {});
    }
    // TUNNEL_READY is informational, no action needed
  };

  ws.onclose = () => {
    ws = null;
    chrome.runtime.sendMessage({ type: 'TUNNEL_STATUS', connected: false }).catch(() => {});
    scheduleReconnect();
  };

  ws.onerror = () => {
    // After primary fails twice, try fallback IP once
    if (!useFallback && reconnectAttempts >= 2) useFallback = true;
    ws = null;
  };
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delay = nextBackoffMs();
  console.log(`[BongBari Ext] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
}

// ─── Chrome MV3 keepAlive ─────────────────────────────────────────────────────
// Service workers in Chrome MV3 go dormant after 30s of inactivity.
// We use chrome.alarms (fires every 24s) to keep the service worker alive
// and reconnect if the WebSocket was dropped during dormancy.

chrome.alarms.create('bongbariKeepAlive', { periodInMinutes: 0.4 }); // every 24s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'bongbariKeepAlive') return;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('[BongBari Ext] KeepAlive: reconnecting...');
    connect();
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────

connect();
