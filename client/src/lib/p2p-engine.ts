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
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.onload = () => {
      peerJSLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load P2P engine'));
    document.head.appendChild(script);
  });

  return peerJSLoadPromise;
}

/* ── Chunk size for DataChannel (64KB is safe for WebRTC) ── */
const CHUNK_SIZE = 64 * 1024;

/* ── Sender: Create peer, wait for receiver, send file ── */
export function createSender(
  file: File,
  onPeerId: (id: string) => void,
  onStatus: (s: P2PStatus) => void,
  onProgress: (percent: number) => void,
): { destroy: () => void } {
  let destroyed = false;
  let peer: any = null;

  (async () => {
    try {
      await loadPeerJS();
      if (destroyed) return;

      const PeerClass = (window as any).Peer;
      peer = new PeerClass();

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

          // Send file metadata first
          conn.send({ type: 'meta', name: file.name, size: file.size, mime: file.type });

          // Read and send file in chunks
          const reader = new FileReader();
          let offset = 0;

          const sendNextChunk = () => {
            if (destroyed || offset >= file.size) {
              conn.send({ type: 'done' });
              onStatus('complete');
              onProgress(100);
              return;
            }

            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.onload = (e) => {
              if (destroyed) return;
              conn.send({ type: 'chunk', data: e.target?.result });
              offset += CHUNK_SIZE;
              onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
              // Use setTimeout to avoid stack overflow on large files
              setTimeout(sendNextChunk, 0);
            };
            reader.readAsArrayBuffer(slice);
          };

          sendNextChunk();
        });

        conn.on('error', () => {
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
      peer = new PeerClass();

      peer.on('open', () => {
        if (destroyed) return;
        onStatus('connecting');
        const conn = peer.connect(senderPeerId, { reliable: true });

        let fileName = 'download';
        let fileSize = 0;
        const chunks: ArrayBuffer[] = [];
        let received = 0;

        conn.on('open', () => {
          if (!destroyed) onStatus('transferring');
        });

        conn.on('data', (msg: any) => {
          if (destroyed) return;

          if (msg.type === 'meta') {
            fileName = msg.name;
            fileSize = msg.size;
          } else if (msg.type === 'chunk') {
            chunks.push(msg.data);
            received += msg.data.byteLength;
            onProgress(Math.min(100, Math.round((received / fileSize) * 100)));
          } else if (msg.type === 'done') {
            const blob = new Blob(chunks);
            onFile(blob, fileName);
            onStatus('complete');
            onProgress(100);
          }
        });

        conn.on('error', () => {
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
      peer?.destroy();
    },
  };
}
