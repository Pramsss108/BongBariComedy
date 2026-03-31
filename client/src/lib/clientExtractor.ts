/**
 * Client-Side Extractor — Residential IP Extraction Intelligence
 *
 * When the server's datacenter IP is blocked by YouTube/Instagram,
 * this service uses the visitor's OWN browser (residential IP) to
 * extract video metadata from Piped/Invidious public mirrors.
 *
 * Flow:
 *   1. Server responds with { mode: 'client_extract', platform, videoId }
 *   2. This module fetches the mirror list from /api/extractor/mirrors
 *   3. Tries mirrors sequentially until one works
 *   4. Reports success/failure back to /api/extractor/report
 *   5. Returns extracted stream URLs to the caller
 *
 * Privacy: No visitor IP is stored. Only an anonymous browser hash,
 * timezone-based country code, and extraction result are reported.
 *
 * Backend priority:
 *   1. Cloudflare Worker (set VITE_EXTRACTOR_CF_URL in client/.env)
 *      e.g. VITE_EXTRACTOR_CF_URL=https://bongbari-extractor.<subdomain>.workers.dev
 *   2. Oracle VM (/api/extractor/* via buildApiUrl) — automatic fallback
 */

import { buildApiUrl } from './queryClient';

// Cloudflare Worker URL injected at build time — falls back to Oracle VM
const CF_EXTRACTOR =
  (import.meta.env as any).VITE_EXTRACTOR_CF_URL?.replace(/\/$/, '') || null;

// Oracle CORS Proxy for bypassing CORS on Piped/Invidious mirrors
const CORS_PROXY_URL =
  ((import.meta.env as any).VITE_CORS_PROXY_URL || '').replace(/\/$/, '') || null;
const CORS_PROXY_KEY =
  (import.meta.env as any).VITE_CORS_PROXY_KEY || '';

function extractorUrl(path: string): string {
  if (CF_EXTRACTOR) return `${CF_EXTRACTOR}${path}`;
  return buildApiUrl(`/api/extractor${path}`);
}

/** Route a URL through the Oracle CORS Proxy */
function proxiedUrl(targetUrl: string): string {
  if (!CORS_PROXY_URL) throw new Error('CORS proxy not configured');
  return `${CORS_PROXY_URL}/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/** Fetch headers for proxied requests */
function proxyHeaders(): Record<string, string> {
  return CORS_PROXY_KEY ? { 'x-api-key': CORS_PROXY_KEY } : {};
}

// ── Types ────────────────────────────────────────────────────────
export interface ExtractorMirror {
  url: string;
  type: 'piped' | 'invidious' | 'cobalt' | 'oembed';
  successRate: number | null;
  avgLatencyMs: number | null;
}

export interface ExtractedStream {
  url: string;
  quality: string;
  height?: number;
  mimeType?: string;
  isAudioOnly?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  title?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  streams: ExtractedStream[];
  mirrorUsed?: string;
  mirrorType?: string;
  latencyMs?: number;
  error?: string;
}

// ── Anonymous Client Hash ────────────────────────────────────────
// A stable per-session hash that is NOT the user's IP. Uses browser
// characteristics that are common enough not to be fingerprinting.
function getClientHash(): string {
  const stored = sessionStorage.getItem('_bb_ch');
  if (stored) return stored;

  const raw = [
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() ?? '0',
  ].join('|');

  // Simple djb2 hash to string
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  const hashStr = Math.abs(hash).toString(36);
  sessionStorage.setItem('_bb_ch', hashStr);
  return hashStr;
}

// Guess country from timezone (rough, privacy-preserving)
function guessCountry(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map: Record<string, string> = {
      'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD',
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US',
      'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
      'Asia/Tokyo': 'JP', 'Australia/Sydney': 'AU', 'Asia/Singapore': 'SG',
    };
    return map[tz];
  } catch { return undefined; }
}

// ── Mirror Fetcher ───────────────────────────────────────────────
let cachedMirrors: ExtractorMirror[] | null = null;
let mirrorsCachedAt = 0;
const MIRROR_CACHE_TTL = 5 * 60_000; // 5 minutes

async function fetchMirrors(): Promise<ExtractorMirror[]> {
  if (cachedMirrors && Date.now() - mirrorsCachedAt < MIRROR_CACHE_TTL) {
    return cachedMirrors;
  }
  try {
    const res = await fetch(extractorUrl('/mirrors'));
    const data = await res.json();
    cachedMirrors = data.mirrors || [];
    mirrorsCachedAt = Date.now();
    return cachedMirrors!
  } catch {
    // Hardcoded fallback if server is unreachable
    return [
      { url: 'https://pipedapi.kavin.rocks', type: 'piped', successRate: null, avgLatencyMs: null },
      { url: 'https://pipedapi.adminforge.de', type: 'piped', successRate: null, avgLatencyMs: null },
      { url: 'https://inv.nadeko.net', type: 'invidious', successRate: null, avgLatencyMs: null },
      { url: 'https://invidious.fdn.fr', type: 'invidious', successRate: null, avgLatencyMs: null },
    ];
  }
}

// ── Report Back ──────────────────────────────────────────────────
async function reportExtraction(
  mirrorUrl: string,
  mirrorType: string,
  platform: string,
  success: boolean,
  latencyMs?: number,
  httpStatus?: number,
  errorMsg?: string,
  videoId?: string
): Promise<void> {
  try {
    await fetch(extractorUrl('/report'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientHash: getClientHash(),
        clientCountry: guessCountry(),
        mirrorUrl,
        mirrorType,
        platform,
        success,
        latencyMs,
        httpStatus,
        errorMsg: errorMsg?.slice(0, 200),
        videoId,
      }),
    });
  } catch {
    // Reporting is best-effort; don't break the UX
  }
}

// ── Extraction Engine ────────────────────────────────────────────

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Try a single Piped mirror */
async function tryPiped(mirror: string, videoId: string, signal: AbortSignal): Promise<ExtractionResult> {
  const start = performance.now();
  const res = await fetch(`${mirror}/streams/${videoId}`, { signal });
  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    throw Object.assign(new Error(`Piped ${res.status}`), { httpStatus: res.status, latency });
  }

  const data = await res.json();
  const streams: ExtractedStream[] = [];

  // Video streams
  if (Array.isArray(data.videoStreams)) {
    for (const s of data.videoStreams) {
      if (s.url && s.quality) {
        streams.push({
          url: s.url,
          quality: s.quality,
          height: parseInt(s.quality) || undefined,
          mimeType: s.mimeType,
          isAudioOnly: false,
        });
      }
    }
  }

  // Audio streams
  if (Array.isArray(data.audioStreams)) {
    for (const s of data.audioStreams) {
      if (s.url) {
        streams.push({
          url: s.url,
          quality: s.quality || 'audio',
          mimeType: s.mimeType,
          isAudioOnly: true,
        });
      }
    }
  }

  return {
    success: streams.length > 0,
    title: data.title,
    thumbnail: data.thumbnailUrl,
    duration: data.duration,
    uploader: data.uploader,
    streams,
    mirrorUsed: mirror,
    mirrorType: 'piped',
    latencyMs: latency,
  };
}

/** Try a single Invidious mirror */
async function tryInvidious(mirror: string, videoId: string, signal: AbortSignal): Promise<ExtractionResult> {
  const start = performance.now();
  const res = await fetch(`${mirror}/api/v1/videos/${videoId}?fields=title,videoThumbnails,lengthSeconds,author,formatStreams,adaptiveFormats`, { signal });
  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    throw Object.assign(new Error(`Invidious ${res.status}`), { httpStatus: res.status, latency });
  }

  const data = await res.json();
  const streams: ExtractedStream[] = [];

  // Format streams (premuxed video+audio)
  if (Array.isArray(data.formatStreams)) {
    for (const s of data.formatStreams) {
      if (s.url) {
        streams.push({
          url: s.url,
          quality: s.qualityLabel || s.quality || 'unknown',
          height: parseInt(s.qualityLabel) || undefined,
          mimeType: s.type,
          isAudioOnly: false,
        });
      }
    }
  }

  // Adaptive formats
  if (Array.isArray(data.adaptiveFormats)) {
    for (const s of data.adaptiveFormats) {
      if (s.url) {
        const isAudio = s.type?.startsWith('audio/');
        streams.push({
          url: s.url,
          quality: s.qualityLabel || s.bitrate?.toString() || 'adaptive',
          height: isAudio ? undefined : (parseInt(s.qualityLabel) || undefined),
          mimeType: s.type,
          isAudioOnly: !!isAudio,
        });
      }
    }
  }

  const thumb = Array.isArray(data.videoThumbnails) && data.videoThumbnails.length > 0
    ? data.videoThumbnails[0].url : undefined;

  return {
    success: streams.length > 0,
    title: data.title,
    thumbnail: thumb,
    duration: data.lengthSeconds,
    uploader: data.author,
    streams,
    mirrorUsed: mirror,
    mirrorType: 'invidious',
    latencyMs: latency,
  };
}

// ── Proxy-wrapped Mirror Fetchers ────────────────────────────
// Route requests through Oracle CORS Proxy when direct calls fail (CORS/GeoBlock)

async function tryPipedViaProxy(mirror: string, videoId: string, signal: AbortSignal): Promise<ExtractionResult> {
  const start = performance.now();
  const res = await fetch(proxiedUrl(`${mirror}/streams/${videoId}`), {
    signal,
    headers: proxyHeaders(),
  });
  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    throw Object.assign(new Error(`Piped-proxy ${res.status}`), { httpStatus: res.status, latency });
  }

  const data = await res.json();
  const streams: ExtractedStream[] = [];

  if (Array.isArray(data.videoStreams)) {
    for (const s of data.videoStreams) {
      if (s.url && s.quality) {
        streams.push({ url: s.url, quality: s.quality, height: parseInt(s.quality) || undefined, mimeType: s.mimeType, isAudioOnly: false });
      }
    }
  }
  if (Array.isArray(data.audioStreams)) {
    for (const s of data.audioStreams) {
      if (s.url) {
        streams.push({ url: s.url, quality: s.quality || 'audio', mimeType: s.mimeType, isAudioOnly: true });
      }
    }
  }

  return { success: streams.length > 0, title: data.title, thumbnail: data.thumbnailUrl, duration: data.duration, uploader: data.uploader, streams, mirrorUsed: mirror, mirrorType: 'piped-proxy', latencyMs: latency };
}

async function tryInvidiousViaProxy(mirror: string, videoId: string, signal: AbortSignal): Promise<ExtractionResult> {
  const start = performance.now();
  const res = await fetch(proxiedUrl(`${mirror}/api/v1/videos/${videoId}?fields=title,videoThumbnails,lengthSeconds,author,formatStreams,adaptiveFormats`), {
    signal,
    headers: proxyHeaders(),
  });
  const latency = Math.round(performance.now() - start);

  if (!res.ok) {
    throw Object.assign(new Error(`Invidious-proxy ${res.status}`), { httpStatus: res.status, latency });
  }

  const data = await res.json();
  const streams: ExtractedStream[] = [];

  if (Array.isArray(data.formatStreams)) {
    for (const s of data.formatStreams) {
      if (s.url) {
        streams.push({ url: s.url, quality: s.qualityLabel || s.quality || 'unknown', height: parseInt(s.qualityLabel) || undefined, mimeType: s.type, isAudioOnly: false });
      }
    }
  }
  if (Array.isArray(data.adaptiveFormats)) {
    for (const s of data.adaptiveFormats) {
      if (s.url) {
        const isAudio = s.type?.startsWith('audio/');
        streams.push({ url: s.url, quality: s.qualityLabel || s.bitrate?.toString() || 'adaptive', height: isAudio ? undefined : (parseInt(s.qualityLabel) || undefined), mimeType: s.type, isAudioOnly: !!isAudio });
      }
    }
  }

  const thumb = Array.isArray(data.videoThumbnails) && data.videoThumbnails.length > 0 ? data.videoThumbnails[0].url : undefined;
  return { success: streams.length > 0, title: data.title, thumbnail: thumb, duration: data.lengthSeconds, uploader: data.author, streams, mirrorUsed: mirror, mirrorType: 'invidious-proxy', latencyMs: latency };
}

// ── Main Extractor Entry Point ───────────────────────────────────

/**
 * Attempt client-side extraction using the visitor's residential IP.
 * Tries all available mirrors in priority order (server-ranked).
 *
 * @param videoUrl - Full YouTube URL
 * @param platform - 'youtube' (extensible to 'instagram' etc.)
 * @returns ExtractionResult with stream URLs or error
 */
export async function extractFromClient(
  videoUrl: string,
  platform: string = 'youtube'
): Promise<ExtractionResult> {
  // Currently only YouTube is supported for client-side extraction
  if (platform !== 'youtube') {
    return { success: false, streams: [], error: 'Client extraction only supports YouTube' };
  }

  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) {
    return { success: false, streams: [], error: 'Could not parse YouTube video ID' };
  }

  const mirrors = await fetchMirrors();
  if (mirrors.length === 0) {
    return { success: false, streams: [], error: 'No mirrors available' };
  }

  // Try each mirror: first direct, then via CORS proxy if direct fails
  for (const mirror of mirrors) {
    // ── Attempt 1: Direct fetch (uses visitor's residential IP) ──
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    try {
      let result: ExtractionResult;

      if (mirror.type === 'piped') {
        result = await tryPiped(mirror.url, videoId, controller.signal);
      } else if (mirror.type === 'invidious') {
        result = await tryInvidious(mirror.url, videoId, controller.signal);
      } else {
        clearTimeout(timeout);
        continue; // Skip unknown mirror types
      }

      clearTimeout(timeout);

      // Report success
      reportExtraction(mirror.url, mirror.type, platform, result.success, result.latencyMs, 200, undefined, videoId);

      if (result.success) {
        return result;
      }
    } catch (err: any) {
      clearTimeout(timeout);
      const httpStatus = err.httpStatus ?? (err.name === 'AbortError' ? 408 : 0);
      const latency = err.latency ?? undefined;

      // Report failure (fire-and-forget)
      reportExtraction(mirror.url, mirror.type, platform, false, latency, httpStatus, err.message, videoId);

      // ── Attempt 2: Retry via Oracle CORS Proxy ──
      if (CORS_PROXY_URL) {
        const proxyCtrl = new AbortController();
        const proxyTimeout = setTimeout(() => proxyCtrl.abort(), 12_000);
        try {
          let result: ExtractionResult;
          if (mirror.type === 'piped') {
            result = await tryPipedViaProxy(mirror.url, videoId, proxyCtrl.signal);
          } else if (mirror.type === 'invidious') {
            result = await tryInvidiousViaProxy(mirror.url, videoId, proxyCtrl.signal);
          } else {
            clearTimeout(proxyTimeout);
            continue;
          }
          clearTimeout(proxyTimeout);
          if (result.success) {
            reportExtraction(mirror.url, mirror.type + '-proxy', platform, true, result.latencyMs, 200, undefined, videoId);
            return result;
          }
        } catch {
          clearTimeout(proxyTimeout);
          // Proxy attempt also failed — continue to next mirror
        }
      }
    }
  }

  return { success: false, streams: [], error: 'All mirrors failed' };
}

/**
 * Pre-warm the mirror cache so extraction is faster when needed.
 * Call this on page load or when the downloader section mounts.
 */
export function prewarmMirrors(): void {
  fetchMirrors().catch(() => {});
}
