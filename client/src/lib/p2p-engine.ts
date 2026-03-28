/**
 * Bong Share — P2P File Transfer Engine
 * Uses WebRTC DataChannels via PeerJS (CDN-loaded, zero npm bloat)
 * 
 * How it works:
 * 1. Sender creates a Peer → gets a unique peer ID
 * 2. We encode that into a bongbari.com/p/:token link
 * 3. Receiver opens the link → connects to sender's peer
 * 4. File transfers DIRECT browser-to-browser (zero servers)
 * 
 * Cost: $0 forever. PeerJS cloud handles signaling for free.
 * Privacy: File never touches any server. Pure P2P.
 * 
 * v2 — Smooth P2P:
 * - 256KB chunks (4× larger, fewer round-trips, higher throughput)
 * - DataChannel backpressure via bufferedAmountLowThreshold (no DC overflow)
 * - Custom STUN servers for better NAT traversal
 * - Keepalive ping to prevent idle connection drops
 */

/* ── Types ── */
export interface P2PPayload {
  /** PeerJS peer ID */
  p: string;
  /** File name */
  n: string;
  /** File size in bytes */
  s: number;
}

export type P2PStatus = 'idle' | 'waiting' | 'connecting' | 'transferring' | 'complete' | 'error';
export type P2PRole = 'sender' | 'receiver';

/* ── Encode/Decode share link ── */
const P2P_KEY = 'BongBariP2PTerminal2026';

function xorCipher(text: string, key: string): string {
  return Array.from(text)
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return atob(s);
}

export function encodeP2PToken(payload: P2PPayload): string {
  const json = JSON.stringify(payload);
  return toBase64Url(xorCipher(json, P2P_KEY));
}

export function decodeP2PToken(token: string): P2PPayload | null {
  try {
    const json = xorCipher(fromBase64Url(token), P2P_KEY);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.p === 'string') return parsed as P2PPayload;
    return null;
  } catch {
    return null;
  }
}

export function buildP2PShareUrl(peerId: string, fileName: string, fileSize: number): string {
  const token = encodeP2PToken({ p: peerId, n: fileName, s: fileSize });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/p/${token}`;
}

/* ── PeerJS dynamic loader (CDN, no npm) ── */
let peerJSLoaded = false;
let peerJSLoadPromise: Promise<void> | null = null;

export function loadPeerJS(): Promise<void> {
  if (peerJSLoaded && (window as any).Peer) return Promise.resolve();
  if (peerJSLoadPromise) return peerJSLoadPromise;

  peerJSLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    // Primary CDN
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => { peerJSLoaded = true; resolve(); };
    script.onerror = () => {
      // Fallback CDN
      const fallback = document.createElement('script');
      fallback.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      fallback.crossOrigin = 'anonymous';
      fallback.onload = () => { peerJSLoaded = true; resolve(); };
      fallback.onerror = () => reject(new Error('Failed to load P2P engine from all CDNs'));
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  });

  return peerJSLoadPromise;
}

/* ── PeerJS config: multiple STUN servers for better NAT traversal ── */
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
};

/* ── Chunk size: 256KB — safe max for reliable WebRTC DataChannel ── */
const CHUNK_SIZE = 256 * 1024;

/**
 * Max DataChannel buffer before we pause sending (backpressure).
 * If we exceed this, chunks pile up in RAM and the browser stutters.
 * 4MB high-water mark, resume at 1MB.
 */
const BUFFER_HIGH = 4 * 1024 * 1024;  // pause if buffer grows above 4MB
const BUFFER_LOW  = 1 * 1024 * 1024;  // resume when buffer drains to 1MB

/* ── Sender: Create peer, wait for receiver, send file ── */
export function createSender(
  file: File,
  onPeerId: (id: string) => void,
  onStatus: (s: P2PStatus) => void,
  onProgress: (percent: number) => void,
): { destroy: () => void } {
  let destroyed = false;
  let peer: any = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  (async () => {
    try {
      await loadPeerJS();
      if (destroyed) return;

      const PeerClass = (window as any).Peer;
      peer = new PeerClass(undefined, PEER_CONFIG);

      peer.on('open', (id: string) => {
        if (destroyed) return;
        onPeerId(id);
        onStatus('waiting');
      });

      peer.on('connection', (conn: any) => {
        if (destroyed) return;
        onStatus('connecting');

        conn.on('open', () => {
          if (destroyed) return;
          onStatus('transferring');

          // ── Keepalive ping every 10s to prevent idle connection drops ──
          keepalive = setInterval(() => {
            if (!destroyed && conn.open) conn.send({ type: 'ping' });
          }, 10000);

          // Send file metadata first
          conn.send({ type: 'meta', name: file.name, size: file.size, mime: file.type });

          // ── Backpressure-aware chunk sender ──────────────────────
          // Access the raw RTCDataChannel underneath PeerJS
          const rawDC: RTCDataChannel | undefined = conn.dataChannel || conn._dc;
          let offset = 0;
          let paused = false;

          const sendNextChunk = () => {
            if (destroyed || paused) return;
            if (offset >= file.size) {
              conn.send({ type: 'done' });
              onStatus('complete');
              onProgress(100);
              if (keepalive) { clearInterval(keepalive); keepalive = null; }
              return;
            }

            // Backpressure: pause if DC buffer is too full
            if (rawDC && rawDC.bufferedAmount > BUFFER_HIGH) {
              paused = true;
              // Set threshold — browser fires bufferedamountlow when drained to BUFFER_LOW
              rawDC.bufferedAmountLowThreshold = BUFFER_LOW;
              rawDC.onbufferedamountlow = () => {
                paused = false;
                rawDC.onbufferedamountlow = null;
                sendNextChunk();
              };
              return;
            }

            const slice = file.slice(offset, offset + CHUNK_SIZE);
            slice.arrayBuffer().then((buf) => {
              if (destroyed) return;
              conn.send({ type: 'chunk', data: buf });
              offset += buf.byteLength;
              onProgress(Math.min(99, Math.round((offset / file.size) * 100)));
              // Yield to event loop briefly, then continue — avoids call-stack depth
              setTimeout(sendNextChunk, 0);
            }).catch(() => {
              if (!destroyed) onStatus('error');
            });
          };

          sendNextChunk();
        });

        conn.on('error', () => {
          if (keepalive) { clearInterval(keepalive); keepalive = null; }
          if (!destroyed) onStatus('error');
        });
      });

      peer.on('error', () => {
        if (!destroyed) onStatus('error');
      });
    } catch {
      if (!destroyed) onStatus('error');
    }
  })();

  return {
    destroy: () => {
      destroyed = true;
      if (keepalive) { clearInterval(keepalive); keepalive = null; }
      peer?.destroy();
    },
  };
}

/* ── Receiver: Connect to sender, receive file ── */
export function createReceiver(
  senderPeerId: string,
  onStatus: (s: P2PStatus) => void,
  onProgress: (percent: number) => void,
  onFile: (blob: Blob, name: string) => void,
): { destroy: () => void } {
  let destroyed = false;
  let peer: any = null;

  (async () => {
    try {
      await loadPeerJS();
      if (destroyed) return;

      const PeerClass = (window as any).Peer;
      peer = new PeerClass(undefined, PEER_CONFIG);

      peer.on('open', () => {
        if (destroyed) return;
        onStatus('connecting');
        const conn = peer.connect(senderPeerId, {
          reliable: true,
          serialization: 'binary',
        });

        let fileName = 'download';
        let fileSize = 0;
        const chunks: ArrayBuffer[] = [];
        let received = 0;

        conn.on('open', () => {
          if (!destroyed) onStatus('transferring');
        });

        conn.on('data', (msg: any) => {
          if (destroyed) return;

          if (msg.type === 'ping') {
            // keepalive — ignore
          } else if (msg.type === 'meta') {
            fileName = msg.name;
            fileSize = msg.size;
          } else if (msg.type === 'chunk') {
            const buf: ArrayBuffer = msg.data;
            chunks.push(buf);
            received += buf.byteLength;
            onProgress(Math.min(99, Math.round((received / fileSize) * 100)));
          } else if (msg.type === 'done') {
            onProgress(100);
            const blob = new Blob(chunks);
            onFile(blob, fileName);
            onStatus('complete');
          }
        });

        conn.on('error', () => {
          if (!destroyed) onStatus('error');
        });

        conn.on('close', () => {
          // If we closed without 'done', mark error
          if (!destroyed && received < fileSize && fileSize > 0) onStatus('error');
        });
      });

      peer.on('error', () => {
        if (!destroyed) onStatus('error');
      });
    } catch {
      if (!destroyed) onStatus('error');
    }
  })();

  return {
    destroy: () => {
      destroyed = true;
      peer?.destroy();
    },
  };
}
