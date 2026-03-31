/**
 * BongBari P2P Tunnel — Browser Client
 *
 * This module runs in the user's browser tab. It connects via WebSocket to the
 * BongBari server and silently acts as a residential proxy node.
 *
 * When the server needs to fetch an Instagram reel (or any blocked resource),
 * it sends a PROXY_REQUEST message down the WebSocket. This client executes the
 * fetch() from the user's own home IP, streams the response chunks back to the
 * server with a correlation ID, then sends a PROXY_DONE signal.
 *
 * From Instagram's perspective, every request originates from a real home IP.
 * This is structurally impossible for Meta to block without blocking all of their
 * own legitimate users.
 *
 * Security: Only fetches URLs on an allowlist (Instagram, TikTok, Twitter).
 * Users' browsers never touch arbitrary URLs.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const ALLOWED_TUNNEL_HOSTS = [
  "www.instagram.com",
  "i.instagram.com",
  "instagram.com",
  "cdninstagram.com",
  "www.tiktok.com",
  "api.tiktok.com",
  "twitter.com",
  "x.com",
  "api.fxtwitter.com",
  "api.vxtwitter.com",
];

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const CHUNK_SIZE = 16_384; // 16 KB per WebSocket message

// ─── State ────────────────────────────────────────────────────────────────────

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let isManuallyStopped = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // In production the API lives at a different origin (Oracle VM / api.bongbari.com)
  // We read it from the same global that the downloader uses.
  const base: string =
    (window as any).__API_BASE__ ||
    (window as any).API_BASE ||
    `${proto}//${window.location.host}`;

  // Strip http/https and replace with ws/wss
  const wsBase = base.replace(/^https?:/, proto);
  return `${wsBase}/ws/tunnel`;
}

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_TUNNEL_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

/**
 * Exponential backoff with ±30% jitter to prevent thundering herd.
 * Caps at BACKOFF_MAX_MS.
 */
function nextBackoffMs(): number {
  const exp = Math.min(
    BACKOFF_BASE_MS * Math.pow(2, reconnectAttempts),
    BACKOFF_MAX_MS
  );
  const jitter = exp * (0.7 + Math.random() * 0.6); // 70%–130% of exp
  return Math.floor(jitter);
}

// ─── Proxy execution ──────────────────────────────────────────────────────────

async function executeProxyRequest(
  txId: string,
  targetUrl: string,
  headers: Record<string, string>
): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // Security gate: only fetch allowed hosts
  if (!isAllowedHost(targetUrl)) {
    ws.send(
      JSON.stringify({
        type: "PROXY_ERROR",
        txId,
        message: `Host not in allowlist: ${new URL(targetUrl).hostname}`,
      })
    );
    return;
  }

  try {
    const resp = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        ...headers,
      },
      credentials: "omit", // Never send user's own cookies to 3rd party
    });

    // Build metadata header (first line, newline-terminated)
    const meta = JSON.stringify({
      status: resp.status,
      contentType: resp.headers.get("content-type") || "application/octet-stream",
    });

    // Encode txId as fixed 36-byte ASCII prefix for every binary frame
    const txIdBytes = new TextEncoder().encode(txId.padEnd(36, " ").slice(0, 36));
    const metaBytes = new TextEncoder().encode(meta + "\n");

    // Send metadata as first chunk (txId prefix + metadata)
    const metaFrame = new Uint8Array(txIdBytes.length + metaBytes.length);
    metaFrame.set(txIdBytes, 0);
    metaFrame.set(metaBytes, txIdBytes.length);
    ws.send(metaFrame);

    // Stream body in CHUNK_SIZE chunks
    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        // Send in CHUNK_SIZE slices with txId prefix
        for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
          const slice = value.subarray(offset, offset + CHUNK_SIZE);
          const frame = new Uint8Array(txIdBytes.length + slice.length);
          frame.set(txIdBytes, 0);
          frame.set(slice, txIdBytes.length);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(frame);
          } else {
            throw new Error("WebSocket closed mid-stream");
          }
        }
      }
    }

    // Signal completion
    ws.send(JSON.stringify({ type: "PROXY_DONE", txId }));
  } catch (err: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "PROXY_ERROR",
          txId,
          message: err.message || "Unknown fetch error",
        })
      );
    }
  }
}

// ─── Connection management ────────────────────────────────────────────────────

function connect(): void {
  if (isManuallyStopped) return;

  const url = buildWsUrl();

  try {
    ws = new WebSocket(url);
  } catch {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempts = 0;
    console.debug("[P2P Tunnel] Connected as proxy node");
  };

  ws.onmessage = (evt: MessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(typeof evt.data === "string" ? evt.data : "{}");
    } catch {
      return;
    }

    if (msg.type === "PROXY_REQUEST") {
      // Fire and forget — errors are sent back to server
      executeProxyRequest(msg.txId, msg.url, msg.headers || {}).catch(
        console.error
      );
    }
    // TUNNEL_READY is purely informational — no action needed
  };

  ws.onclose = () => {
    ws = null;
    if (!isManuallyStopped) scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will fire next — let it handle reconnect
    ws = null;
  };
}

function scheduleReconnect(): void {
  reconnectAttempts++;
  const delay = nextBackoffMs();
  console.debug(
    `[P2P Tunnel] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`
  );
  setTimeout(connect, delay);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once when the app boots (e.g. in main.tsx or App.tsx).
 * The client silently joins the proxy pool in the background.
 */
export function startTunnelClient(): void {
  isManuallyStopped = false;
  connect();
}

/**
 * Gracefully stop participating in the tunnel (e.g. user logs out or
 * navigates away — call on component unmount if needed).
 */
export function stopTunnelClient(): void {
  isManuallyStopped = true;
  ws?.close();
  ws = null;
}

/** Returns true if this tab is currently a live proxy node */
export function isTunnelConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
