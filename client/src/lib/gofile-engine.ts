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
/* ── Filebin.net Upload Engine ────────────────────────────────────────
   filebin.net is a free file host with FULL CORS support:
   - Upload: POST https://filebin.net/{binId}/{filename} (raw binary body)
   - Download: GET https://filebin.net/{binId}/{filename} → 302 → S3 (CORS ✅)
   - OPTIONS: returns 200 + CORS headers ✅
   - No proxy needed — direct from browser, 100% serverless
   - Expiry: 6 days from last access (auto-renewed on download)
   - No file size limit per file (tested up to large binaries)
   - UNLIMITED total size via chunking
   ─────────────────────────────────────────────────────────────────── */

const FILEBIN_API = 'https://filebin.net';

/** Chunk size: 80 MB per chunk (safe margin below filebin's per-file limit) */
export const CHUNK_SIZE = 80 * 1024 * 1024;

/** Generate a random unguessable bin ID */
function generateBinId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `bb-${ts}-${rand}`;
}

/**
 * Upload one chunk (or a whole small file) to filebin.net.
 * Uses raw binary body (Content-Type: application/octet-stream).
 * CORS is fully supported — no proxy required.
 * Progress tracked via XHR upload events.
 */
function uploadFilebinChunk(
  blob: Blob,
  binId: string,
  chunkName: string,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    let animTimer: ReturnType<typeof setInterval> | null = null;
    let currentPct = 0;
    const startTail = () => {
      if (animTimer) return;
      animTimer = setInterval(() => {
        if (currentPct < 99) { currentPct = Math.min(99, currentPct + 0.2); onProgress(Math.round(currentPct)); }
      }, 250);
    };
    const stopTail = () => { if (animTimer) { clearInterval(animTimer); animTimer = null; } };

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        currentPct = Math.round((e.loaded / e.total) * 90);
        onProgress(currentPct);
        if (e.loaded >= e.total) startTail();
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        stopTail();
        if (xhr.status === 201 || xhr.status === 200) { onProgress(100); resolve(); }
        else reject(new Error(`filebin upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => { stopTail(); reject(new Error('Network error uploading chunk to filebin')); };
    xhr.ontimeout = () => { stopTail(); reject(new Error('Chunk upload timed out')); };
    xhr.timeout = 10 * 60 * 1000; // 10 min per chunk

    // If a Cloudflare Worker proxy is configured (VITE_FILEBIN_PROXY_BASE), route through it.
    // CF Worker = globally fast (300+ POPs), no residential rate limit, free 100K req/day.
    // Fallback: upload direct to filebin (works but may be rate-limited at ~55 KB/s on some ISPs).
    const FILEBIN_PROXY = (import.meta.env.VITE_FILEBIN_PROXY_BASE as string || '').replace(/\/$/, '');
    const uploadTarget = FILEBIN_PROXY
      ? `${FILEBIN_PROXY}/upload/${binId}/${chunkName}`
      : `${FILEBIN_API}/${binId}/${chunkName}`;
    xhr.open('POST', uploadTarget);
    // Send as a typeless Blob — no Content-Type header, avoids preflight edge cases.
    const raw = new Blob([blob]);  // strips .type → no Content-Type header
    xhr.send(raw);
  });
}

/**
 * Upload a file to filebin.net — split into CHUNK_SIZE pieces if large.
 * Returns { binId, chunkNames[] } to store in share token.
 * onProgress: 0–100 across the entire upload.
 */
export async function uploadToFilebin(
  file: File,
  onProgress: (p: number) => void,
): Promise<{ binId: string; chunkNames: string[] }> {
  const binId = generateBinId();
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '.bin';
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const chunkNames: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);
    const chunkName = `chunk_${String(i).padStart(4, '0')}${ext}`;
    chunkNames.push(chunkName);

    await uploadFilebinChunk(chunkBlob, binId, chunkName, (p) => {
      const base = (i / totalChunks) * 100;
      onProgress(Math.round(base + (p / 100) * (100 / totalChunks)));
    });
  }

  onProgress(100);
  return { binId, chunkNames };
}

/**
 * Upload the bundle manifest JSON as _manifest.json inside the same binId.
 * This is a small text file uploaded as JSON.
 */
async function uploadBundleManifest(manifest: BundleManifest, binId: string): Promise<void> {
  const json = JSON.stringify(manifest);
  const blob = new Blob([json], { type: 'application/json' });
  await uploadFilebinChunk(blob, binId, '_manifest.json', () => {});
}

/**
 * Upload multiple files (any mix of types/sizes) to ONE filebin bin.
 * Large files are split into CHUNK_SIZE chunks automatically.
 * Files are processed 2 at a time (concurrency=2) for safe rate usage.
 * Progress: overall 0–95% across all file bytes, then 95–100% for manifest.
 *
 * @param files           Array of File objects (any type, any size)
 * @param onOverallPct    Overall 0–100 progress callback
 * @param onFilePct       Per-file progress callback(fileIndex, 0–100)
 * @returns { binId, manifest }
 */
export async function uploadMultipleToFilebin(
  files: File[],
  onOverallPct: (p: number) => void,
  onFilePct?: (fileIdx: number, p: number) => void,
): Promise<{ binId: string; manifest: BundleManifest }> {
  const binId = generateBinId();
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0) || 1;
  // per-file uploaded byte estimate (updated continuously from XHR progress)
  const fileBytesUploaded = new Float64Array(files.length);

  const emitProgress = () => {
    const done = fileBytesUploaded.reduce((a, b) => a + b, 0);
    // 95% of bar for file content, last 5% reserved for manifest
    onOverallPct(Math.min(95, Math.round((done / totalBytes) * 95)));
  };

  const uploadOneFile = async (file: File, fileIdx: number): Promise<BundleFileEntry> => {
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop()!.toLowerCase() : '.bin';
    // Sanitize original filename for use in filebin URL (safe chars only)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunks: string[] = [];

    for (let c = 0; c < totalChunks; c++) {
      const start = c * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);
      const chunkBytes = end - start;
      // Use recognizable name: idx_originalname.ext or idx_originalname_c0000.ext
      const chunkName =
        totalChunks === 1
          ? `${fileIdx}_${safeName}`
          : `${fileIdx}_${safeName}_c${String(c).padStart(4, '0')}${ext}`;
      chunks.push(chunkName);

      await uploadFilebinChunk(blob, binId, chunkName, (p) => {
        // Update this file's running byte estimate
        fileBytesUploaded[fileIdx] = start + (p / 100) * chunkBytes;
        // Per-file %
        const filePercent = Math.round(
          ((start + (p / 100) * chunkBytes) / file.size) * 100,
        );
        onFilePct?.(fileIdx, filePercent);
        emitProgress();
      });

      // Chunk done — lock in exact bytes
      fileBytesUploaded[fileIdx] = end;
      onFilePct?.(fileIdx, Math.round((end / file.size) * 100));
      emitProgress();
    }

    return { name: file.name, size: file.size, chunks };
  };

  const CONCURRENCY = 2;
  const manifestFiles: BundleFileEntry[] = new Array(files.length);

  // Process in batches of CONCURRENCY
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((file, bIdx) => uploadOneFile(file, i + bIdx)),
    );
    results.forEach((entry, bIdx) => {
      manifestFiles[i + bIdx] = entry;
    });
  }

  const manifest: BundleManifest = { v: 1, files: manifestFiles };

  // Upload manifest (95 → 99)
  onOverallPct(96);
  await uploadBundleManifest(manifest, binId);
  onOverallPct(100);

  return { binId, manifest };
}

/** Build a branded share URL for a multi-file bundle.
 *  The manifest (file list + chunk names) is embedded directly in the token
 *  so the download page never needs a second network fetch.
 */
export function buildBongBariBundleUrl(binId: string, totalSize: number, manifest: BundleManifest): string {
  const token = encodeShareToken({ c: '', b: binId, n: 'bundle', s: totalSize, h: 'filebin-bundle', m: manifest });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

/** Fetch the bundle manifest from filebin (async, called on the download page) */
export async function fetchBundleManifest(binId: string): Promise<BundleManifest> {
  const url = `https://filebin.net/${binId}/_manifest.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Manifest fetch failed: HTTP ${res.status}`);
  const json: BundleManifest = await res.json();
  if (!json.files || !Array.isArray(json.files)) throw new Error('Invalid manifest format');
  return json;
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

export type ShareHost = 'filebin' | 'filebin-bundle' | 'catbox' | 'catbox-chunked' | 'litterbox' | 'gofile';

/* ── Multi-file bundle (filebin.net) ──────────────────────────────────────
   A "bundle" uploads ALL files (any mix of types/sizes) into one shared
   binId on filebin.net, then stores a JSON manifest as _manifest.json.
   The share URL encodes only the binId. Download page fetches the manifest
   to get the file list, then assembles chunks per file.
   ─────────────────────────────────────────────────────────────────────── */

export interface BundleFileEntry {
  /** Original file name (e.g. "vacation.mp4") */
  name: string;
  /** Original file size in bytes */
  size: number;
  /** Chunk file names stored in filebin (single-chunk or multi-chunk) */
  chunks: string[];
}

export interface BundleManifest {
  /** Schema version */
  v: 1;
  files: BundleFileEntry[];
}

export interface SharePayload {
  /** GoFile content code OR empty for filebin */
  c: string;
  /** filebin binId */
  b?: string;
  /** Chunk file names for single-file filebin uploads */
  urls?: string[];
  /** Original file name (or "bundle" for multi-file bundles) */
  n: string;
  /** Total file size in bytes */
  s: number;
  /** Host type */
  h?: ShareHost;
  /** Embedded bundle manifest (only for filebin-bundle) */
  m?: BundleManifest;
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

/** Build the branded share URL for a single upload (GoFile fallback) */
export function buildBongBariShareUrl(code: string, fileName: string, fileSize: number, host?: ShareHost): string {
  const token = encodeShareToken({ c: code, n: fileName, s: fileSize, h: host });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

/** Build the branded share URL for a filebin chunked upload (unlimited size, 6-day expiry) */
export function buildBongBariFilebinUrl(binId: string, chunkNames: string[], fileName: string, fileSize: number): string {
  const token = encodeShareToken({ c: '', b: binId, urls: chunkNames, n: fileName, s: fileSize, h: 'filebin' });
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  return `${origin}/s/${token}`;
}

export interface ResolvedShare {
  /** Direct download URL (single file), empty for chunked/bundle */
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  /** true = direct download (no third-party UI), false = GoFile external page */
  isDirect: boolean;
  /** Host type for UI messaging */
  host: ShareHost;
  /** true if the link will expire */
  expires: boolean;
  /** true = file was split into chunks that must be reassembled on download */
  isChunked: boolean;
  /** true = multi-file bundle */
  isBundle?: boolean;
  /** Embedded bundle manifest (set when isBundle = true) */
  manifest?: BundleManifest;
  /** filebin binId (set for filebin and filebin-bundle) */
  binId?: string;
  /** Chunk file names (only set when isChunked = true — single file) */
  chunkNames?: string[];
  /** Legacy catbox chunk URLs (only set when host='catbox-chunked') */
  chunkUrls?: string[];
}

/** Resolve a cloaked token back to download info */
export function resolveShareUrl(token: string): ResolvedShare | null {
  const data = decodeShareToken(token);
  if (!data) return null;

  // Multi-file bundle (filebin-bundle) — manifest embedded in token
  if (data.h === 'filebin-bundle' && data.b) {
    return {
      downloadUrl: '',
      fileName: 'bundle',
      fileSize: data.s,
      isDirect: true,
      host: 'filebin-bundle',
      expires: true,
      isChunked: false,
      isBundle: true,
      binId: data.b,
      manifest: data.m as BundleManifest | undefined,
    };
  }
  // Single-file filebin chunked upload (unlimited size, 6-day expiry)
  if (data.h === 'filebin' && data.b && data.urls && data.urls.length > 0) {
    return { downloadUrl: '', fileName: data.n, fileSize: data.s, isDirect: true, host: 'filebin', expires: true, isChunked: true, binId: data.b, chunkNames: data.urls };
  }
  // Legacy catbox chunked (old tokens still work)
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
