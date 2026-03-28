/** 
 * Bong Share - GoFile API Engine
 * High-leverage file sharing using GoFile.io public API
 * Updated March 2026: /getServer is dead → using /servers (array response)
 * Updated March 2026 v2: Server-side proxy upload (bypasses ISP/DNS blocks)
 */

import { buildApiUrl } from './queryClient';

export interface GoFileServerResponse {
  status: string;
  data: {
    servers: Array<{ name: string; zone: string }>;
  };
}

export interface GoFileUploaderResponse {
  status: string;
  data: {
    downloadPage: string;
    code: string;
    parentFolder: string;
    fileId: string;
    fileName: string;
    md5: string;
    directLink: string;
    info: string;
  };
}

export async function getBestServer(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://api.gofile.io/servers', { signal: controller.signal });
    clearTimeout(timeout);
    const result: GoFileServerResponse = await response.json();
    if (result.status === 'ok' && result.data.servers?.length > 0) {
      const idx = Math.floor(Math.random() * result.data.servers.length);
      return result.data.servers[idx].name;
    }
    throw new Error('No active GoFile servers available');
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error('GoFile server unreachable — try P2P mode instead');
    console.error('GoFile getBestServer Error:', error);
    throw error;
  }
}

export function uploadFileWithProgress(
  file: File, 
  server: string, 
  onProgress: (percent: number) => void
): Promise<GoFileUploaderResponse['data']> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const response: GoFileUploaderResponse = JSON.parse(xhr.responseText);
            if (response.status === 'ok') {
              resolve(response.data);
            } else {
              reject(new Error(response.status || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Server returned status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error — GoFile may be down. Try P2P mode.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — try P2P mode instead.'));
    xhr.timeout = 300000; // 5 min max
    xhr.open('POST', `https://${server}.gofile.io/uploadFile`);
    xhr.send(formData);
  });
}

/**
 * SERVER-SIDE UPLOAD — bypasses ISP/DNS blocks
 * Browser → POST /api/share/upload → Render → [proxy pool] → GoFile
 * 
 * This is the PRIMARY upload method. Direct XHR to GoFile is the fallback
 * (in case Render itself is down).
 * 
 * Progress tracking works because we measure upload from browser → our server.
 * The server→GoFile hop is fast (datacenter) so total progress feels accurate.
 */
export function uploadFileViaServer(
  file: File,
  onProgress: (percent: number) => void,
): Promise<GoFileUploaderResponse['data']> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // Map browser→server upload as 0–90%, server→GoFile as implicit 90–100%
        const percent = Math.round((event.loaded / event.total) * 90);
        onProgress(percent);
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          try {
            const body = JSON.parse(xhr.responseText);
            if (body.status === 'ok') {
              onProgress(100);
              resolve(body.data);
            } else if (body.fallback === 'p2p') {
              reject(new Error('GoFile unreachable via all server routes. Try P2P mode.'));
            } else {
              reject(new Error(body.message || 'Server upload failed'));
            }
          } catch {
            reject(new Error('Failed to parse server response'));
          }
        } else if (xhr.status === 413) {
          reject(new Error('File too large — maximum 10 GB per transfer'));
        } else if (xhr.status === 502 || xhr.status === 504) {
          reject(new Error('GoFile unreachable via all routes. Try P2P mode.'));
        } else {
          reject(new Error(`Upload server error (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error connecting to upload server'));
    xhr.ontimeout = () => reject(new Error('Upload timed out — try P2P mode instead.'));
    xhr.timeout = 11 * 60 * 1000; // 11 min (slightly above server's 10 min)
    xhr.open('POST', buildApiUrl('/api/share/upload'));
    xhr.send(formData);
  });
}

/* ── Link Cloaking: Encode/Decode GoFile data into branded short URLs ──
   Strategy: Pack file metadata (gofile code + filename + size) into a
   single URL-safe token. XOR with a fixed key then base64url encode.
   100% client-side → zero server, zero DB, zero cost, infinite scale.
   ─────────────────────────────────────────────────────────────────── */

const CLOAK_KEY = 'BongBariEtherealTerminal2026';

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

export interface SharePayload {
  /** GoFile content code */
  c: string;
  /** Original file name */
  n: string;
  /** File size in bytes */
  s: number;
}

/** Encode GoFile data into a URL-safe cloaked token */
export function encodeShareToken(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const ciphered = xorCipher(json, CLOAK_KEY);
  return toBase64Url(ciphered);
}

/** Decode a cloaked token back to GoFile data */
export function decodeShareToken(token: string): SharePayload | null {
  try {
    const ciphered = fromBase64Url(token);
    const json = xorCipher(ciphered, CLOAK_KEY);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.c === 'string') return parsed as SharePayload;
    return null;
  } catch {
    return null;
  }
}

/** Build the branded share URL from GoFile upload data */
export function buildBongBariShareUrl(gofileCode: string, fileName: string, fileSize: number): string {
  const token = encodeShareToken({ c: gofileCode, n: fileName, s: fileSize });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

/** Resolve a cloaked token back to GoFile download page URL */
export function resolveGoFileUrl(token: string): { downloadPage: string; fileName: string; fileSize: number } | null {
  const data = decodeShareToken(token);
  if (!data) return null;
  return {
    downloadPage: `https://gofile.io/d/${data.c}`,
    fileName: data.n,
    fileSize: data.s,
  };
}
