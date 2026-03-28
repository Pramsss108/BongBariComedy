/** 
 * Bong Share - GoFile API Engine
 * High-leverage file sharing using GoFile.io public API
 * Updated March 2026: /getServer is dead → using /servers (array response)
 * Updated March 2026 v2: Server-side proxy upload (bypasses ISP/DNS blocks)
 * Updated March 2026 v3: Server cache + multi-server retry for unbreakable uploads
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
    code?: string;
    parentFolderCode?: string;
    parentFolder: string;
    id: string;
    name: string;
    md5: string;
    guestToken?: string;
    mimetype?: string;
    size?: number;
    type?: string;
  };
}

// ── Known-good GoFile servers (hardcoded fallback if /servers API is down) ──
const FALLBACK_SERVERS = [
  'store-eu-par-4', 'store-eu-par-5', 'store-eu-par-6',
  'store-na-miami-1', 'store-na-miami-2',
];

// ── Server list cache (5 minute TTL) ──────────────────────────────────────
let _serverCache: { servers: string[]; expiry: number } | null = null;

async function fetchServerList(): Promise<string[]> {
  // Return cached list if still fresh
  if (_serverCache && Date.now() < _serverCache.expiry) {
    return _serverCache.servers;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://api.gofile.io/servers', { signal: controller.signal });
    clearTimeout(timeout);
    const result: GoFileServerResponse = await response.json();
    if (result.status === 'ok' && result.data.servers?.length > 0) {
      const names = result.data.servers.map(s => s.name);
      _serverCache = { servers: names, expiry: Date.now() + 5 * 60 * 1000 };
      return names;
    }
  } catch {
    // API unreachable — use hardcoded fallback
  }
  return FALLBACK_SERVERS;
}

export async function getBestServer(): Promise<string> {
  const servers = await fetchServerList();
  if (servers.length === 0) throw new Error('GoFile server unreachable — try P2P mode instead');
  return servers[Math.floor(Math.random() * servers.length)];
}

/** Get multiple servers in random order (for retry logic) */
export async function getServerPool(): Promise<string[]> {
  const servers = await fetchServerList();
  if (servers.length === 0) return [...FALLBACK_SERVERS].sort(() => Math.random() - 0.5);
  // Shuffle for load distribution
  return [...servers].sort(() => Math.random() - 0.5);
}

/** Upload to a single GoFile server via XHR */
function uploadToServer(
  file: File,
  server: string,
  onProgress: (percent: number) => void,
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
              // Normalize: GoFile renamed 'code' to 'parentFolderCode'
              const d = response.data;
              if (!d.code && d.parentFolderCode) d.code = d.parentFolderCode;
              if (!d.code && d.downloadPage) d.code = d.downloadPage.split('/d/').pop() || '';
              resolve(d);
            } else {
              reject(new Error(response.status || 'Upload failed'));
            }
          } catch {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`GoFile server ${server} returned ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error(`Network error on ${server}`));
    xhr.ontimeout = () => reject(new Error(`Upload timed out on ${server}`));
    xhr.timeout = 300000; // 5 min max per server
    xhr.open('POST', `https://${server}.gofile.io/uploadFile`);
    xhr.send(formData);
  });
}

/**
 * Upload with automatic multi-server retry.
 * Tries up to 3 different GoFile servers before giving up.
 * Progress resets to 0 on each retry attempt.
 */
export async function uploadFileWithProgress(
  file: File,
  _server: string, // kept for backwards compat, actual server picked from pool
  onProgress: (percent: number) => void
): Promise<GoFileUploaderResponse['data']> {
  const pool = await getServerPool();
  const maxAttempts = Math.min(3, pool.length);
  let lastError: Error = new Error('No GoFile servers available');

  for (let i = 0; i < maxAttempts; i++) {
    const server = pool[i];
    try {
      onProgress(0);
      const data = await uploadToServer(file, server, onProgress);
      return data;
    } catch (err: any) {
      lastError = err;
      console.warn(`[GoFile] Server ${server} failed (attempt ${i + 1}/${maxAttempts}):`, err.message);
      // Short pause before retry
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, 800));
    }
  }

  throw new Error(`All GoFile servers failed — ${lastError.message}. Try P2P mode.`);
}

/**
 * SERVER-SIDE UPLOAD — bypasses ISP/DNS blocks
 * Browser → POST /api/share/upload → VPS (api.bongbari.com) → GoFile
 * 
 * Used as fallback when direct GoFile fails.
 * Progress: 0–90% = browser→VPS upload, 90–100% animates while VPS→GoFile runs.
 */
export function uploadFileViaServer(
  file: File,
  onProgress: (percent: number) => void,
): Promise<GoFileUploaderResponse['data']> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    // Animate progress from 90 → 99 while waiting for VPS→GoFile
    let animTimer: ReturnType<typeof setInterval> | null = null;
    let currentPct = 0;

    const startTailAnimation = () => {
      if (animTimer) return;
      animTimer = setInterval(() => {
        if (currentPct < 99) {
          // Slower, more gradual animation for better UX
          currentPct = Math.min(99, currentPct + 0.1);
          onProgress(Math.round(currentPct));
        }
      }, 250);
    };

    const stopTailAnimation = () => {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
    };


    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // Map browser→server upload as 0–90%
        currentPct = Math.round((event.loaded / event.total) * 90);
        onProgress(currentPct);
        // When browser→server part completes, start tail animation
        if (event.loaded >= event.total) startTailAnimation();
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        stopTailAnimation();
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

    xhr.onerror = () => { stopTailAnimation(); reject(new Error('Network error connecting to upload server')); };
    xhr.ontimeout = () => { stopTailAnimation(); reject(new Error('Upload timed out — try P2P mode instead.')); };
    xhr.timeout = 11 * 60 * 1000; // 11 min (slightly above server's 10 min)
    xhr.open('POST', buildApiUrl('/api/share/upload'));
    xhr.send(formData);
  });
}
/* ── Catbox.moe Upload Engine ─────────────────────────────────────────
   Primary host for ALL file sizes via chunking.
   Single file ≤90 MB → one catbox upload → permanent direct URL.
   Larger files → split into 90 MB chunks → multiple catbox uploads → reassembled on download.
   All routed through CF Worker (serverless, no Render needed, $0 forever).
   ─────────────────────────────────────────────────────────────────── */

// CF Worker (ancient-king-7fa9.workers.dev) — replaces Render proxy entirely
const CF_WORKER_URL = 'https://ancient-king-7fa9.workers.dev';

/** Chunk size: 90 MB per chunk (safe for CF Worker free tier body limit) */
export const CHUNK_SIZE = 90 * 1024 * 1024;

const CATBOX_MAX_SIZE = 200 * 1024 * 1024; // 200 MB
const LITTERBOX_MAX_SIZE = 1024 * 1024 * 1024; // 1 GB

/** Tier 1: permanent catbox (≤200 MB) */
export function canUseCatbox(file: File): boolean {
  return file.size <= CATBOX_MAX_SIZE;
}

/** Tier 2: temporary litterbox (200 MB – 1 GB, 72 h expiry) */
export function canUseLitterbox(file: File): boolean {
  return file.size > CATBOX_MAX_SIZE && file.size <= LITTERBOX_MAX_SIZE;
}

/**
 * Upload to catbox.moe via CF Worker proxy (replaces Render — 100% serverless).
 * Browser → CF Worker → catbox.moe → direct URL back.
 * Returns the direct download URL (e.g. https://files.catbox.moe/abc123.ext).
 */
export function uploadToCatbox(
  file: File | Blob,
  onProgress: (percent: number) => void,
): Promise<string> {
  return uploadViaDirectProxy(file, 'catbox', onProgress);
}

/**
 * Upload to litterbox.catbox.moe via CF Worker proxy.
 * Returns a direct download URL like https://litter.catbox.moe/abc123.ext.
 */
export function uploadToLitterbox(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return uploadViaDirectProxy(file, 'litterbox', onProgress);
}

/**
 * Shared CF Worker proxy upload for catbox/litterbox.
 * - Uses catbox API format: reqtype=fileupload + fileToUpload field
 * - CF Worker adds CORS headers so browser can read catbox plain-text URL response
 * - Replaces Render /api/share/upload-direct entirely (no pipeline minutes needed)
 * Progress: 0–90% = browser → CF Worker, 90–100% tail animation until response.
 */
function uploadViaDirectProxy(
  file: File | Blob,
  host: 'catbox' | 'litterbox',
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    // Catbox API format (not our custom format)
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    if (host === 'litterbox') formData.append('time', '72h');

    // Route through CF Worker to bypass catbox CORS restrictions
    const catboxEndpoint = host === 'catbox'
      ? 'https://catbox.moe/user/api.php'
      : 'https://litterbox.catbox.moe/resources/internals/api.php';
    const proxyUrl = `${CF_WORKER_URL}/?url=${encodeURIComponent(catboxEndpoint)}`;

    let animTimer: ReturnType<typeof setInterval> | null = null;
    let currentPct = 0;

    const startTail = () => {
      if (animTimer) return;
      animTimer = setInterval(() => {
        if (currentPct < 99) {
          currentPct = Math.min(99, currentPct + 0.15);
          onProgress(Math.round(currentPct));
        }
      }, 250);
    };
    const stopTail = () => {
      if (animTimer) { clearInterval(animTimer); animTimer = null; }
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        currentPct = Math.round((event.loaded / event.total) * 90);
        onProgress(currentPct);
        if (event.loaded >= event.total) startTail();
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        stopTail();
        if (xhr.status === 200) {
          // Catbox returns plain-text URL (e.g. "https://files.catbox.moe/abc123.mp4")
          const url = xhr.responseText.trim();
          if (url.startsWith('https://') || url.startsWith('http://')) {
            onProgress(100);
            resolve(url);
          } else {
            reject(new Error(`${host} returned unexpected response: ${url.slice(0, 80)}`));
          }
        } else {
          reject(new Error(`CF Worker returned ${xhr.status} uploading to ${host}`));
        }
      }
    };

    xhr.onerror = () => { stopTail(); reject(new Error(`Network error uploading to ${host}`)); };
    xhr.ontimeout = () => { stopTail(); reject(new Error(`${host} upload timed out`)); };
    xhr.timeout = 8 * 60 * 1000; // 8 min
    xhr.open('POST', proxyUrl);
    xhr.send(formData);
  });
}

/**
 * Split a large file into CHUNK_SIZE pieces and upload each to catbox.
 * Returns an array of permanent catbox URLs (one per chunk).
 * Chunks are uploaded sequentially to avoid hammering catbox.
 * onProgress receives 0–100 across the entire multi-chunk operation.
 */
export async function uploadChunked(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string[]> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunkUrls: string[] = [];
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '.bin';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);
    // Name chunk so catbox gives it a recognizable extension
    const chunkFile = new File([chunkBlob], `chunk_${String(i).padStart(4, '0')}${ext}`, {
      type: 'application/octet-stream',
    });

    const url = await uploadViaDirectProxy(chunkFile, 'catbox', (p) => {
      // Scale chunk's 0–100 into its share of the total 0–100
      const base = (i / totalChunks) * 100;
      onProgress(Math.round(base + (p / 100) * (100 / totalChunks)));
    });
    chunkUrls.push(url);
  }

  onProgress(100);
  return chunkUrls;
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

export type ShareHost = 'catbox' | 'catbox-chunked' | 'litterbox' | 'gofile';

export interface SharePayload {
  /** GoFile content code OR single catbox/litterbox URL */
  c: string;
  /** Chunk URLs for large files split across multiple catbox uploads */
  urls?: string[];
  /** Original file name */
  n: string;
  /** File size in bytes */
  s: number;
  /** Host type. catbox = permanent direct, catbox-chunked = multi-chunk, litterbox = 72h direct, gofile/undefined = GoFile */
  h?: ShareHost;
}

/** Encode GoFile data into a URL-safe cloaked token (Unicode-safe v2) */
export function encodeShareToken(payload: SharePayload): string {
  // encodeURIComponent makes ALL chars ASCII-safe before XOR + btoa
  const json = encodeURIComponent(JSON.stringify(payload));
  const ciphered = xorCipher(json, CLOAK_KEY);
  return toBase64Url(ciphered);
}

/** Decode a cloaked token back to GoFile data */
export function decodeShareToken(token: string): SharePayload | null {
  // Try v2 format (encodeURIComponent-wrapped): handles Bengali/emoji filenames
  try {
    const ciphered = fromBase64Url(token);
    const json = decodeURIComponent(xorCipher(ciphered, CLOAK_KEY));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.c === 'string') return parsed as SharePayload;
  } catch { /* fall through */ }
  // Fallback: try legacy v1 format (raw JSON, ASCII filenames only)
  try {
    const ciphered = fromBase64Url(token);
    const json = xorCipher(ciphered, CLOAK_KEY);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.c === 'string') return parsed as SharePayload;
  } catch { /* fall through */ }
  return null;
}

/** Build the branded share URL for a single upload (catbox, litterbox, or GoFile) */
export function buildBongBariShareUrl(code: string, fileName: string, fileSize: number, host?: ShareHost): string {
  const token = encodeShareToken({ c: code, n: fileName, s: fileSize, h: host });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

/** Build the branded share URL for a chunked catbox upload (unlimited size) */
export function buildBongBariChunkedShareUrl(urls: string[], fileName: string, fileSize: number): string {
  const token = encodeShareToken({ c: '', urls, n: fileName, s: fileSize, h: 'catbox-chunked' });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

export interface ResolvedShare {
  /** Direct download URL (catbox/litterbox) or GoFile download page. Empty for chunked. */
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  /** true = direct download (no third-party UI), false = GoFile external page */
  isDirect: boolean;
  /** Host type for UI messaging */
  host: ShareHost;
  /** true if the link will expire (litterbox = 72h) */
  expires: boolean;
  /** true = file was split into chunks that must be reassembled on download */
  isChunked: boolean;
  /** Chunk URLs (only set when isChunked = true) */
  chunkUrls?: string[];
}

/** Resolve a cloaked token back to download info */
export function resolveShareUrl(token: string): ResolvedShare | null {
  const data = decodeShareToken(token);
  if (!data) return null;

  // Chunked catbox upload (unlimited size, permanent)
  if (data.h === 'catbox-chunked' && data.urls && data.urls.length > 0) {
    return { downloadUrl: '', fileName: data.n, fileSize: data.s, isDirect: true, host: 'catbox-chunked', expires: false, isChunked: true, chunkUrls: data.urls };
  }
  if (data.h === 'catbox') {
    return { downloadUrl: data.c, fileName: data.n, fileSize: data.s, isDirect: true, host: 'catbox', expires: false, isChunked: false };
  }
  if (data.h === 'litterbox') {
    return { downloadUrl: data.c, fileName: data.n, fileSize: data.s, isDirect: true, host: 'litterbox', expires: true, isChunked: false };
  }
  // GoFile or legacy tokens (no h field)
  return { downloadUrl: `https://gofile.io/d/${data.c}`, fileName: data.n, fileSize: data.s, isDirect: false, host: 'gofile', expires: false, isChunked: false };
}

/** @deprecated Use resolveShareUrl instead */
export function resolveGoFileUrl(token: string): { downloadPage: string; fileName: string; fileSize: number } | null {
  const data = decodeShareToken(token);
  if (!data) return null;
  if (data.h === 'catbox' || data.h === 'litterbox') {
    return { downloadPage: data.c, fileName: data.n, fileSize: data.s };
  }
  return { downloadPage: `https://gofile.io/d/${data.c}`, fileName: data.n, fileSize: data.s };
}
