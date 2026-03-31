import ytdl from "@distube/ytdl-core";
/**
 * BongBari Social Media Downloader — Backend Routes
 * Phases , 3, 5, 14, 16, 17 of the masterplan.
 *
 * Stack: youtube-dl-exec (yt-dlp wrapper) + express-rate-limit
 * Cost: $0 — runs on Oracle Cloud Always Free VM, streams directly to user (zero disk/storage)
 */

import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import os from "os";
import { execFile, spawn } from "child_process";
import fs from "fs";
import { getPoToken } from './poTokenService.js';
import { youtubeService } from '../youtubeService.js';
import crypto from "crypto";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
// @ts-ignore
import ffmpegPath from "ffmpeg-static";
import { ProxyKitchen } from '../proxyService.js';
import { proxyThroughTunnel, getTunnelPoolSize } from '../p2pTunnel.js';

const previewNodes = [
  "http://78.47.104.43:9000/",
  // "http://hetzner2:9000/" // Phase 2: Add more nodes here for IP rotation
];
let currentNodeIndex = 0;

// ==========================================
// 8-PHASE ARCHITECTURE: STANDALONE ENGINES
// ==========================================

async function executePhase1_HetznerCobalt(url: string): Promise<any> {
    console.log('[Phase 1] Executing Hetzner Cobalt for:', url);
    const HETZNER_URL = process.env.HETZNER_COBALT_URL || 'http://78.47.104.43:9000';
    
    // Anti-burst: slight human-like initial delay
    const initialJitter = Math.floor(Math.random() * 200) + 100;
    await new Promise(resolve => setTimeout(resolve, initialJitter));
    
    
    // --- Multi-quality: request max quality, then also try audio-only ---
    const response = await axios.post(
      HETZNER_URL,
      {
        url: url,
        aFormat: "best",
        vQuality: "max",
        isAudioOnly: false,
        isTTfullAudio: true,
        isAudioMuted: false,
        dubLang: false,
        disableMetadata: false,
        twitterGif: false,
        vimeoGif: false
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      }
    );

    // Also fetch audio-only stream (best-effort, non-blocking)
    let audioUrl: string | null = null;
    try {
      const audioRes = await axios.post(
        HETZNER_URL,
        { url, aFormat: "best", vQuality: "max", isAudioOnly: true },
        { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      if (audioRes.data?.status === 'stream' && audioRes.data.url) {
        audioUrl = audioRes.data.url;
      }
    } catch { /* audio fetch is optional */ }

    if (response.data && response.data.status === 'stream' && response.data.url) {
      const formats: Array<{ext: string; height: number; url: string; id: string; label: string}> = [];
      // Cobalt returns the best available quality — expose as multiple options
      // We add common quality tiers; the URL is the same (Cobalt auto-selects best)
      formats.push({ ext: "mp4", height: 2160, url: response.data.url, id: "mp4-2160", label: "MP4 4K" });
      formats.push({ ext: "mp4", height: 1080, url: response.data.url, id: "mp4-1080", label: "MP4 1080p" });
      formats.push({ ext: "mp4", height: 720, url: response.data.url, id: "mp4-720", label: "MP4 720p" });
      formats.push({ ext: "mp4", height: 480, url: response.data.url, id: "mp4-480", label: "MP4 480p" });
      formats.push({ ext: "mp4", height: 360, url: response.data.url, id: "mp4-360", label: "MP4 360p" });
      if (audioUrl) {
        formats.push({ ext: "mp3", height: 0, url: audioUrl, id: "mp3", label: "Audio MP3" });
        formats.push({ ext: "m4a", height: 0, url: audioUrl, id: "m4a", label: "Audio M4A" });
      }
      return {
          engine: 'Layer 1: Cobalt (max quality)',
          video_url: response.data.url,
          title: response.data.title || "Hetzner Video",
          duration: response.data.duration || 0,
          thumbnail: response.data.thumbnail || null,
          formats
      };
    }
    
    if (response.data && response.data.picker && response.data.picker[0]?.url) {
        const pickerUrl = response.data.picker[0].url;
        const formats: Array<{ext: string; height: number; url: string; id: string; label: string}> = [
          { ext: "mp4", height: 1080, url: pickerUrl, id: "mp4-1080", label: "MP4 1080p" },
          { ext: "mp4", height: 720, url: pickerUrl, id: "mp4-720", label: "MP4 720p" },
          { ext: "mp4", height: 360, url: pickerUrl, id: "mp4-360", label: "MP4 360p" },
        ];
        if (audioUrl) {
          formats.push({ ext: "mp3", height: 0, url: audioUrl, id: "mp3", label: "Audio MP3" });
        }
        return {
            engine: 'Layer 1: Cobalt Picker (max quality)',
            video_url: pickerUrl,
            title: response.data.title || "Hetzner Picker Video",
            duration: 0,
            thumbnail: response.data.picker[0].thumb || null,
            formats
        };
    }
    
    throw new Error('Phase 1: Invalid response format from Hetzner Cobalt.');
}

async function executePhase2_CFSwarm(url: string): Promise<any> {
    console.log('[Phase 2] Executing CF Swarm Edge for:', url);
    const isMeta = url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch") || url.includes("instagr.am") || url.includes("instagr.com");
    
    // Phrase 5: Facebook mobile URL rewrite — mobile pages bypass login walls more often
    let targetUrl = url;
    if (url.includes("facebook.com") && !url.includes("m.facebook.com")) {
        targetUrl = url.replace("www.facebook.com", "m.facebook.com").replace("facebook.com", "m.facebook.com");
        console.log('[Phase 2] Facebook: Rewriting to mobile URL:', targetUrl);
    }
    
    const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(targetUrl);
    
    const swarmRes = await axios.get(swarmUrl, { timeout: 15000 });
    
    const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
    let match = body.match(/"video_url":"([^"]+)"/) ||
                body.match(/<meta property="og:video" content="([^"]+)"/) ||
                body.match(/"playable_url_quality_hd":"([^"]+)"/);

    if (!match) {
        if (body.includes("login_page") || body.includes("login")) { throw new Error("Phase 2 [CF Blocked]: Meta forced a Login Wall on Cloudflare Datacenter IP."); } else { if (body.includes("login_page") || body.includes("login")) { throw new Error("Phase 2 [CF Blocked]: Meta forced a Login Wall on Cloudflare Datacenter IP."); } else { throw new Error("Phase 2: No video stream found in Swarm payload."); } }
    }
    
    const finalUrl = match[1].replace(/\\/g, '').replace(/&amp;/g, '&');
    return {
        engine: 'Force Layer 2: CF Swarm Edge (Testing/Free/IG-FB)',
        video_url: finalUrl,
        title: "Instagram/Meta Video",
        duration: 0,
        thumbnail: null,
        formats: [
            {
                ext: "mp4",
                height: 720,
                url: finalUrl,
                id: "mp4-720",
                label: "MP4 720p"
            }
        ]
    };
}

function getNextPreviewNode() {
  const node = previewNodes[currentNodeIndex];
  currentNodeIndex = (currentNodeIndex + 1) % previewNodes.length;
  return node;
}

import { performance } from "perf_hooks";

// --- MEMORY CACHES FOR INSTANT PERFORMANCE ---
const metaCache = new Map<string, { data: any, expires: number }>();
const streamCache = new Map<string, { url: string, expires: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

const ytBin = os.platform() === "win32" ? "yt-dlp.exe" : "yt-dlp";
const YT_DLP_PATH = path.resolve(process.cwd(), "node_modules", "youtube-dl-exec", "bin", ytBin);

// Masterplan Phase 2/3: Bulletproof yt-dlp execution
// Replaces youtube-dl-exec which breaks on Windows paths with spaces
function executeYtDlp(url: string, args: string[], timeoutMs = 15000): Promise<any> {
  return new Promise((resolve, reject) => {
      // 20MB buffer for huge json manifests + fast timeout for proxy failover
      execFile(YT_DLP_PATH, [...args, url], { maxBuffer: 1024 * 1024 * 20, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error("Failed to parse yt-dlp output"));
      }
    });
  });
}

function spawnYtDlpStream(url: string, args: string[]) {
  return spawn(YT_DLP_PATH, [...args, "-o", "-", url], {
    stdio: ["ignore", "pipe", "pipe"] });
}

// ---------------------------------------------------------------------------
// PHASE : URL allowlist — only permit YouTube, Instagram, and public Facebook
// ---------------------------------------------------------------------------
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.watch",
  // TikTok (Phrase 3) — Cobalt supports natively
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "m.tiktok.com",
  // Twitter/X (Phrase 4) — Cobalt supports natively
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
  "x.com",
  "www.x.com",
  // LinkedIn (Phrase 11) — Cobalt + yt-dlp fallback
  "linkedin.com",
  "www.linkedin.com",
  "in.linkedin.com",
]);

function validateVideoUrl(rawUrl: string): { ok: true; url: string } | { ok: false; error: string } {
  if (!rawUrl || typeof rawUrl !== "string") return { ok: false, error: "No URL provided." };
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, error: "Invalid URL format." };
  }
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      error: `Platform not supported. We support YouTube, Instagram, Facebook, TikTok, Twitter/X, and LinkedIn.` };
  }
  return { ok: true, url: rawUrl.trim() };
}

// ---------------------------------------------------------------------------
// PHASE : Rate limiting — 10 info requests + 5 downloads per minute per IP
// ---------------------------------------------------------------------------
const infoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // Increased to 30 info req/min to prevent "failed first, then worked" user frustration
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute before fetching video info again." } });

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
    max: 60, // Increased to 60 to prevent 429 errors from HTML5 <video> range requests
    skip: (req) => req.query.mode === 'preview', // Completely bypass rate limiter for previews!
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Download limit reached. Please wait a minute." } });
// ---------------------------------------------------------------------------
// GLOBAL RESOURCE GOVERNOR (Phase 14)
// Protect Oracle VM's 951MB RAM by limiting active ffmpeg/yt-dlp spawns
// ---------------------------------------------------------------------------
let ACTIVE_DOWNLOADS = 0;
const MAX_CONCURRENT_DOWNLOADS = 3; // Strict limit for free tier to prevent OOM kills

function tryAcquireSlot(): boolean {
  if (ACTIVE_DOWNLOADS >= MAX_CONCURRENT_DOWNLOADS) return false;
  ACTIVE_DOWNLOADS++;
  console.log(`🛡️ [ResourceGovernor] Slot acquired. Active Streams: [ ${ACTIVE_DOWNLOADS} / ${MAX_CONCURRENT_DOWNLOADS} ]`);
  return true;
}

function releaseSlot(): void {
  ACTIVE_DOWNLOADS = Math.max(0, ACTIVE_DOWNLOADS - 1);
  console.log(`🛡️ [ResourceGovernor] Slot released. Active Streams: [ ${ACTIVE_DOWNLOADS} / ${MAX_CONCURRENT_DOWNLOADS} ]`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatNotAvailable(res: Response, msg: string, code = 422): void {
  res.status(code).json({ error: msg });
}

function mapDownloaderError(err: any): { code: string; message: string; status: number } {
  const msg = (err.message || "").toLowerCase();
  const stderr = (err.stderr || "").toLowerCase();
  const full = msg + stderr;

  if (full.includes("private video") || full.includes("this video is private")) {
    return { code: "PRIVATE_VIDEO", message: "This video is private and cannot be downloaded.", status: 403 };
  }
  // Bot check specific
  if (full.includes("sign in to confirm you're not a bot") || full.includes("bot check") || full.includes("verify you're human")) {
    return { code: "BOT_BLOCKED", message: "Download engine blocked by YouTube. Please try again shortly.", status: 503 };
  }
  // Actual age restriction (don't catch plain 'sign in' as blindly to avoid false positives with new youtube bot checks)
  if (full.includes("confirm your age") || full.includes("age-restricted") || full.includes("sign in to see this")) {
    return { code: "AGE_RESTRICTED", message: "This video is age-restricted and requires login.", status: 403 };
  }
  if (full.includes("sign in")) {
    return { code: "BOT_BLOCKED", message: "YouTube forced a sign-in wall to block automatic extraction. Please try again later.", status: 503 };
  }
  if (full.includes("geo-blocked") || full.includes("not available in your country")) {
    return { code: "GEO_BLOCK", message: "This video is not available in the server's region.", status: 403 };
  }
  if (full.includes("too many requests") || full.includes("429")) {
    return { code: "RATE_LIMIT", message: "You are downloading too fast. Please wait a moment.", status: 429 };
  }
  if (full.includes("duration") && full.includes("300")) {
      return { code: "DURATION_LIMIT", message: "Video is too long (Max 5 mins).", status: 422 };
  }
  
  // If "Both engines failed", try to pick the most relevant reason
  if (full.includes("both engines failed") || full.includes("total engine failure")) {
      if (full.includes("cobalt") && (full.includes("api error") || full.includes("down"))) {
         return { code: "COBALT_DOWN", message: "Our external download engine is temporarily unavailable. Please try again later.", status: 503 };
      }
      if (full.includes("tiktok")) {
         return { code: "PLATFORM_BLOCK", message: "TikTok is blocking our servers. Try again in a few seconds — we rotate IPs automatically.", status: 503 };
      }
      if (full.includes("twitter")) {
         return { code: "PLATFORM_BLOCK", message: "Could not extract this tweet's video. Make sure the tweet contains a video and is publicly accessible.", status: 422 };
      }
      if (full.includes("instagram") || full.includes("meta")) {
         return { code: "LOGIN_WALL", message: "Instagram requires login for this content. Try a different public reel or post.", status: 403 };
      }
  }
  if (full.includes("login wall") || full.includes("login required") || full.includes("rate-limit reached")) {
     return { code: "LOGIN_WALL", message: "This platform requires login to access this content. Try a public video instead.", status: 403 };
  }

  // Generic fallback: Expose raw stderr for live debugging
  return { code: "DOWNLOAD_FAILED", message: `Could not process this video. Trace: ${full.substring(0, 150)}`, status: 422 };
}

// ---------------------------------------------------------------------------
// HYBRID METADATA ENGINE (Free Pool → Direct → ASocks Paid LAST RESORT)
// Phase 16: Stealth extraction. All free methods exhaust before paid.
// ---------------------------------------------------------------------------

function generateRotatedProxy(): string {
    // Phase 2: Dynamic residential proxy rotation (Bypass bans by rotating sessions)
    const baseProxy = process.env.ASOCKS_PROXY || "http://q0b2vvoyfp-res-country-IN-hold-session-session-69badf0c52b0a:MsuSXbhmwtpdr81t@93.190.141.57:443";
    
    // Inject a unique random session ID into the Asocks proxy URL if it uses the session- hold format
    // This forces ASocks to assign a completely fresh residential IP
    if (baseProxy.includes("hold-session-session-")) {
        const randomSession = crypto.randomBytes(6).toString('hex');
        return baseProxy.replace(/hold-session-session-[a-z0-9]+/i, `hold-session-session-${randomSession}`);
    }
    return baseProxy;
}

async function executeYtDlpExtract(url: string, extraArgs: string[] = [], disableDirectFallback: boolean = false): Promise<any> {
    const ytArgs = [
        "--dump-json",
        "--no-warnings",
        "--geo-bypass", 
        // 👻 SPOOF HEADERS: Pretend to be iOS App and Android TV to bypass YouTube/Google bot guards natively
        "--extractor-args", "youtube:player_client=ios,tv",
        "--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
        ...extraArgs
    ];
    
    // ── Attempt 1: Phase 16 — Free pool proxy (auto-mined, costs nothing) ──
    const platform = url.includes('instagram.com') || url.includes('instagr.am') ? 'ig'
                   : url.includes('facebook.com') || url.includes('fb.watch') ? 'fb'
                   : 'yt';
    const poolProxy = await ProxyKitchen.getBestProxyForDownload(platform);
    if (poolProxy) {
        try {
            console.log(`[Phase 16] Attempting with free pool proxy (${platform}): ${poolProxy.substring(0, 30)}...`);
            return await executeYtDlp(url, [...ytArgs, "--proxy", poolProxy], 20000);
        } catch (poolErr: any) {
            console.warn(`[Phase 16] Pool proxy failed, banning: ${poolErr.message}`);
            await ProxyKitchen.banProxy(poolProxy);
        }
    } else {
        console.log(`[Phase 16] Pool empty for ${platform} — skipping to direct.`);
    }

    // ── Attempt 2: Direct (no proxy) — free, no cost ──────────────────────
    if (!disableDirectFallback) {
        try {
            console.log(`[Phase 2] Attempting direct extraction (no proxy)...`);
            return await executeYtDlp(url, ytArgs, 25000);
        } catch (directErr: any) {
            console.warn(`[Phase 2] Direct extraction failed: ${directErr.message}`);
        }

        // ── Attempt 3: Paid ASocks — LAST RESORT only (costs money) ───────────
        const paidProxy = generateRotatedProxy();
        console.log(`[Phase 2] LAST RESORT — falling back to paid ASocks proxy...`);
        return await executeYtDlp(url, [...ytArgs, "--proxy", paidProxy], 25000);
    }

    throw new Error('All free methods failed and direct/paid fallback is disabled (timeout guard).');
}


// ==========================================
// PHASE 3: Hetzner IPv6 Standalone
// ==========================================
async function executePhase3_HetznerIPv6(url: string): Promise<any> {
    console.log('[Phase 3] Executing Hetzner IPv6 via direct yt-dlp for:', url);
    const ytArgs = [
        "--dump-json",
        "--no-warnings",
        "--geo-bypass",
        "--force-ipv6",
        "--extractor-args", "youtube:player_client=ios,tv",
        "--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1"
    ];
    // No proxy, use direct node execution with --force-ipv6
    const dataJSON = await executeYtDlp(url, ytArgs, 25000);
    const data = typeof dataJSON === 'string' ? JSON.parse(dataJSON) : dataJSON;

    let video_url = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
    if (!video_url) throw new Error("Phase 3: No video URL matched in Hetzner IPv6 extraction");

    return {
        engine: 'Force Layer 3: Hetzner IPv6 (Pending/Free)',
        video_url: video_url,
        title: data.title || "IPv6 Extracted Video",
        duration: data.duration || 0,
        thumbnail: data.thumbnail || null,
        formats: data.formats || data.requested_formats || []
    };
}

// ==========================================
// PHASE 4: ASocks + Mobile (Upstream) Standalone
// ==========================================
async function executePhase6_ASocks_Ultimate(url: string): Promise<any> {
    console.log('[Phase 6] Executing ASocks + Mobile (Upstream) for:', url);
    const dataJSON = await executeYtDlpExtract(url, [], true); // Pass true to disable the 25s direct fallback attempt which causes frontend 45s timeout!
    const data = typeof dataJSON === 'string' ? JSON.parse(dataJSON) : dataJSON;

    let video_url = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
    if (!video_url) throw new Error("Phase 4: No video URL matched in ASocks Upstream extraction");

    return {
        engine: 'Force Layer 6: ASocks + Mobile (Locked/Paid)',
        video_url: video_url,
        title: data.title || "Proxy Extracted Video",
        duration: data.duration || 0,
        thumbnail: data.thumbnail || null,
        formats: data.formats || data.requested_formats || []
    };
}

// ==========================================
// PHASE 5: Public Cobalt Node Array (Free)
// ==========================================
async function executePhase5_ExpansionA(url: string): Promise<any> {
    throw new Error('Phase 5 is empty (Public Cobalt removed as requested).');
}

// ==========================================
// PERMANENT LAYER: P2P Residential Tunnel (Free, unpatchable)
// Routes the fetch() through a connected user's real home IP.
// Meta sees a genuine residential request — impossible to block at scale.
// Falls through gracefully if no browser nodes are available.
// ==========================================
async function executeP2PInstagramTunnel(url: string): Promise<any> {
    const poolSize = getTunnelPoolSize();
    if (poolSize === 0) {
        throw new Error('P2P_NO_NODES: No browser proxy nodes in pool — waiting for users');
    }
    console.log(`[P2P] Routing IG request through residential tunnel. Pool size: ${poolSize}`);

    // Extract shortcode
    const scMatch = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!scMatch) throw new Error('P2P: Could not extract shortcode from URL');
    const shortcode = scMatch[2];

    // Attempt 1: Hit the embed/captioned endpoint — this is dependency-locked (Meta cannot
    // break embedding without destroying WordPress/Squarespace/every CMS on earth)
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const embedResult = await proxyThroughTunnel(embedUrl, {
        'x-ig-app-id': '936619743392459',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    });

    if (embedResult.status === 200) {
        const html = embedResult.body.toString('utf8');

        // Deep parse the additionalDataLoaded JSON payload that Instagram's embed page
        // injects inline — this is the most reliable extraction path.
        const additionalDataMatch = html.match(/window\.__additionalDataLoaded[\s\S]{0,50}(\{[\s\S]+?\})\s*\)\s*;/)
            || html.match(/additionalDataLoaded[^(]*\([^,]+,\s*(\{[\s\S]+?\})\s*\)/);

        if (additionalDataMatch) {
            try {
                const data = JSON.parse(additionalDataMatch[1]);
                // Navigate nested structure: data.graphql.shortcode_media, or data.items[0]
                const media = data?.graphql?.shortcode_media
                    || data?.items?.[0]
                    || data?.shortcode_media;

                if (media?.video_url) {
                    const title = media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 100)
                        || `Instagram ${media.product_type || 'Video'}`;
                    const formats = [
                        { ext: 'mp4', height: media.dimensions?.height || 720, url: media.video_url, id: 'mp4-720', label: 'MP4 720p' }
                    ];
                    return {
                        engine: 'Layer P2P-Embed: Residential P2P Tunnel (Permanent)',
                        video_url: media.video_url,
                        title,
                        duration: media.video_duration || 0,
                        thumbnail: media.display_url || null,
                        formats,
                    };
                }
            } catch { /* fall through to regex patterns */ }
        }

        // Fallback: regex sweep across raw embed HTML (multiple patterns for resilience)
        const patterns = [
            /"video_url"\s*:\s*"([^"]+)"/,
            /property="og:video"\s+content="([^"]+)"/,
            /content="([^"]+)"\s+property="og:video"/,
            /"contentUrl"\s*:\s*"([^"]+)"/,
            /data-video-url="([^"]+)"/,
            /video_versions[\s\S]{0,200}"url"\s*:\s*"([^"]+\.mp4[^"]*)"/,
        ];
        for (const pat of patterns) {
            const m = html.match(pat);
            if (m) {
                const videoUrl = m[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
                return {
                    engine: 'Layer P2P-Regex: Residential P2P Tunnel (Permanent)',
                    video_url: videoUrl,
                    title: 'Instagram Video',
                    duration: 0,
                    thumbnail: null,
                    formats: [{ ext: 'mp4', height: 720, url: videoUrl, id: 'mp4-720', label: 'MP4 720p' }],
                };
            }
        }
    }

    throw new Error(`P2P_EXTRACT_FAIL: Tunnel returned status ${embedResult.status} but no video URL found in payload`);
}

// ==========================================
// PHRASE 2 FALLBACK: Instagram Embed Scrape (Free)
// Scrapes video URL from Instagram's public embed endpoint — no login needed
// ==========================================
async function executeInstagramEmbedScrape(url: string): Promise<any> {
    console.log('[IG Embed] Scraping Instagram embed page for:', url);
    
    // Extract shortcode from URL
    const scMatch = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!scMatch) throw new Error('IG Embed: Could not extract shortcode from URL');
    const shortcode = scMatch[2];
    
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
    const res = await axios.get(embedUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 12000,
    });
    
    const html = typeof res.data === 'string' ? res.data : '';
    
    // Try multiple patterns to find video URL in embed HTML
    const patterns = [
        /"video_url":"([^"]+)"/,
        /property="og:video"\s+content="([^"]+)"/,
        /data-video-url="([^"]+)"/,
        /"contentUrl":"([^"]+)"/,
        /video_versions.*?"url":"([^"]+)"/,
    ];
    
    let videoUrl: string | null = null;
    for (const pat of patterns) {
        const m = html.match(pat);
        if (m) {
            videoUrl = m[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
            break;
        }
    }
    
    if (!videoUrl) {
        if (html.includes('login') || html.includes('Login')) {
            throw new Error('IG Embed: Login wall detected on embed page');
        }
        throw new Error('IG Embed: No video URL found in embed HTML');
    }
    
    // Extract title from embed if possible
    const titleMatch = html.match(/<meta.*?property="og:title".*?content="([^"]+)"/);
    const thumbMatch = html.match(/<meta.*?property="og:image".*?content="([^"]+)"/);
    
    return {
        engine: 'Layer IG-Embed: Instagram Embed Scrape (Free)',
        video_url: videoUrl,
        title: titleMatch?.[1] || 'Instagram Video',
        duration: 0,
        thumbnail: thumbMatch?.[1] || null,
        formats: [
            { ext: 'mp4', height: 720, url: videoUrl, id: 'mp4-720', label: 'MP4 720p' },
        ],
    };
}

// ==========================================
// PHRASE 3 FALLBACK: TikTok oEmbed + Embed Scrape (Free)
// Uses TikTok's public oEmbed API for metadata, then tries to extract video
// ==========================================
async function executeTikTokFallback(url: string): Promise<any> {
    console.log('[TikTok Fallback] Trying oEmbed + embed scrape for:', url);
    
    // Step 1: Get metadata from oEmbed (always works, public API)
    let title = 'TikTok Video';
    let thumbnail: string | null = null;
    try {
        const oembedRes = await axios.get(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
            { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' } }
        );
        if (oembedRes.data) {
            title = oembedRes.data.title || title;
            thumbnail = oembedRes.data.thumbnail_url || null;
        }
    } catch { /* oEmbed failure is non-fatal */ }
    
    // Step 2: Try to extract video URL from TikTok page via mobile UA
    // TikTok mobile pages sometimes expose video URLs in __UNIVERSAL_DATA_FOR_REHYDRATION__
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
    
    const pageRes = await axios.get(url, {
        headers: {
            'User-Agent': mobileUA,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 12000,
        maxRedirects: 5,
    });
    
    const html = typeof pageRes.data === 'string' ? pageRes.data : '';
    
    // Try to find video URL in page data
    const videoPatterns = [
        /"playAddr":"([^"]+)"/,
        /"downloadAddr":"([^"]+)"/,
        /video_url['"]\s*:\s*['"]([^'"]+)['"]/,
        /"urls":\["([^"]+)"\]/,
    ];
    
    let videoUrl: string | null = null;
    for (const pat of videoPatterns) {
        const m = html.match(pat);
        if (m) {
            videoUrl = m[1].replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/\\/g, '');
            break;
        }
    }
    
    if (!videoUrl) {
        throw new Error('TikTok Fallback: Could not extract video URL from page. IP may be blocked.');
    }
    
    return {
        engine: 'Layer TT-Fallback: TikTok Embed Scrape (Free)',
        video_url: videoUrl,
        title,
        duration: 0,
        thumbnail,
        formats: [
            { ext: 'mp4', height: 720, url: videoUrl, id: 'mp4-720', label: 'MP4 720p (No Watermark)' },
        ],
    };
}

// ==========================================
// LINKEDIN FALLBACK: og:video scrape from public LinkedIn page
// LinkedIn requires auth for most content but public posts expose og:video meta
// ==========================================
async function executeLinkedInFallback(url: string): Promise<any> {
    console.log('[LinkedIn Fallback] Scraping og:video from public page:', url);
    
    // Extract activity ID from URL
    const activityMatch = url.match(/activity-(\d+)/);
    const activityId = activityMatch ? activityMatch[1] : null;
    
    // Try scraping the public LinkedIn page (some posts are publicly accessible)
    const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    };
    
    let lastError = '';
    
    // Attempt 1: Try the LinkedIn embed endpoint
    if (activityId) {
        const embedUrls = [
            `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`,
            `https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:${activityId}`,
            `https://www.linkedin.com/embed/feed/update/urn:li:share:${activityId}`,
        ];
        
        for (const embedUrl of embedUrls) {
            try {
                console.log(`[LinkedIn Fallback] Trying embed: ${embedUrl}`);
                const res = await axios.get(embedUrl, { timeout: 10000, headers });
                const html = res.data;
                
                // Look for video source in embed HTML
                const videoMatch = html.match(/data-sources="([^"]+)"/) ||
                                   html.match(/src="(https:\/\/[^"]*\.mp4[^"]*)"/i) ||
                                   html.match(/"contentUrl"\s*:\s*"([^"]+)"/i) ||
                                   html.match(/video[^>]*src="(https?:\/\/[^"]+)"/i);
                
                if (videoMatch) {
                    let videoUrl = videoMatch[1];
                    // Decode HTML entities
                    videoUrl = videoUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                    
                    // Try to parse data-sources JSON for multiple qualities
                    const formats: Array<{ext: string; height: number; url: string; id: string; label: string}> = [];
                    try {
                        const decoded = videoUrl.replace(/&quot;/g, '"');
                        const sources = JSON.parse(decoded);
                        if (Array.isArray(sources)) {
                            for (const s of sources) {
                                const src = s.src || s.url;
                                const h = s.height || s.data?.height || 720;
                                if (src) formats.push({ ext: 'mp4', height: h, url: src, id: `mp4-${h}`, label: `MP4 ${h}p` });
                            }
                        }
                    } catch { /* not JSON, use as direct URL */ }
                    
                    if (formats.length === 0) {
                        formats.push({ ext: 'mp4', height: 720, url: videoUrl, id: 'mp4-720', label: 'MP4 720p' });
                    }
                    formats.sort((a, b) => b.height - a.height);
                    
                    // Extract title from embed
                    const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || html.match(/aria-label="([^"]+)"/);
                    
                    return {
                        engine: 'Layer LI-embed: LinkedIn Embed (Free)',
                        video_url: formats[0].url,
                        title: titleMatch ? titleMatch[1].trim().slice(0, 100) : 'LinkedIn Video',
                        duration: 0,
                        thumbnail: null,
                        formats,
                    };
                }
            } catch (err: any) {
                lastError = err.message || 'Embed failed';
                console.log(`[LinkedIn Fallback] Embed ${embedUrl} failed: ${lastError}`);
            }
        }
    }
    
    // Attempt 2: Scrape the original URL for og:video meta tag
    try {
        console.log('[LinkedIn Fallback] Trying og:video meta scrape...');
        const res = await axios.get(url, { timeout: 10000, headers, maxRedirects: 5 });
        const html = res.data;
        
        const ogVideo = html.match(/<meta\s+(?:property|name)="og:video(?::url)?"\s+content="([^"]+)"/i) ||
                         html.match(/content="([^"]+)"\s+(?:property|name)="og:video(?::url)?"/i);
        
        if (ogVideo) {
            const videoUrl = ogVideo[1].replace(/&amp;/g, '&');
            const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i);
            const ogImage = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i);
            
            return {
                engine: 'Layer LI-og: LinkedIn og:video (Free)',
                video_url: videoUrl,
                title: ogTitle ? ogTitle[1].slice(0, 100) : 'LinkedIn Video',
                duration: 0,
                thumbnail: ogImage ? ogImage[1] : null,
                formats: [{ ext: 'mp4', height: 720, url: videoUrl, id: 'mp4-720', label: 'MP4 720p' }],
            };
        }
    } catch (err: any) {
        lastError = err.message || 'og:video scrape failed';
        console.log(`[LinkedIn Fallback] og:video scrape failed: ${lastError}`);
    }
    
    throw new Error(`LinkedIn Fallback: Could not extract video. LinkedIn requires authentication for most video content. Last error: ${lastError}`);
}

// ==========================================
// PHRASE 4 FALLBACK: Twitter/X via fxtwitter API (Free)
// fxtwitter.com is a free, community-run API that extracts Twitter video URLs
// ==========================================
async function executeTwitterFallback(url: string): Promise<any> {
    console.log('[Twitter Fallback] Trying fxtwitter API for:', url);
    
    // Extract username and tweet ID from URL
    // Formats: twitter.com/USER/status/ID, x.com/USER/status/ID
    const urlMatch = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/);
    if (!urlMatch) throw new Error('Twitter Fallback: Could not extract username/tweet ID from URL');
    const [, username, tweetId] = urlMatch;
    
    // Try fxtwitter API first (needs /username/status/ID format), then vxtwitter
    const endpoints = [
        `https://api.fxtwitter.com/${username}/status/${tweetId}`,
        `https://api.vxtwitter.com/${username}/status/${tweetId}`,
    ];
    
    let lastError = '';
    for (const endpoint of endpoints) {
        try {
            console.log(`[Twitter Fallback] Trying: ${endpoint}`);
            const fxRes = await axios.get(endpoint, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; BongBari/1.0)',
                    'Accept': 'application/json',
                },
            });
            
            const tweet = fxRes.data?.tweet;
            if (!tweet) continue;
            
            // Check for video in media
            const media = tweet.media;
            const formats: Array<{ext: string; height: number; url: string; id: string; label: string}> = [];
            
            // Check videos array
            if (media?.videos?.length) {
                const video = media.videos[0];
                if (video.url) {
                    formats.push({ ext: 'mp4', height: video.height || 720, url: video.url, id: `mp4-${video.height || 720}`, label: `MP4 ${video.height || 720}p` });
                }
            }
            
            // Check media.all for video/gif types
            if (formats.length === 0 && media?.all?.length) {
                for (const m of media.all) {
                    if ((m.type === 'video' || m.type === 'gif') && m.url) {
                        formats.push({ ext: 'mp4', height: m.height || 720, url: m.url, id: `mp4-${m.height || 720}`, label: `MP4 ${m.height || 720}p` });
                    }
                }
            }
            
            // Check for direct media_extended (vxtwitter format)
            if (formats.length === 0 && fxRes.data?.mediaURLs?.length) {
                for (const mUrl of fxRes.data.mediaURLs) {
                    if (mUrl.includes('.mp4') || mUrl.includes('video')) {
                        formats.push({ ext: 'mp4', height: 720, url: mUrl, id: 'mp4-720', label: 'MP4 720p' });
                    }
                }
            }
            
            if (formats.length === 0) {
                lastError = 'No video found in tweet';
                continue;
            }
            
            formats.sort((a, b) => b.height - a.height);
            
            return {
                engine: 'Layer TW-fx: fxtwitter API (Free)',
                video_url: formats[0].url,
                title: tweet.text?.slice(0, 100) || fxRes.data?.text?.slice(0, 100) || 'Twitter Video',
                duration: media?.videos?.[0]?.duration || 0,
                thumbnail: media?.videos?.[0]?.thumbnail_url || tweet.media?.photos?.[0]?.url || null,
                formats,
            };
        } catch (err: any) {
            lastError = err.message || 'Unknown error';
            console.log(`[Twitter Fallback] ${endpoint} failed: ${lastError}`);
        }
    }
    
    throw new Error(`Twitter Fallback: All APIs failed. Last error: ${lastError}`);
}

// ==========================================
// PHASE 7: Free Proxy Pool (Mined OSINT, $0 cost)
// Uses ONLY the auto-mined proxy pool. NO paid fallback.
// Supports ALL platforms: YouTube, Instagram, Facebook, TikTok, Twitter.
// For IG/FB: proxied yt-dlp extraction.
// For YT/TikTok/Twitter: proxied yt-dlp extraction.
// ==========================================
async function executePhase7_FreeProxyPool(url: string): Promise<any> {
    const isMeta = url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch") || url.includes("instagr.am");
    const isTikTok = url.includes("tiktok.com");
    const isTwitter = url.includes("twitter.com") || url.includes("x.com");
    const platform = isMeta ? (url.includes("facebook.com") || url.includes("fb.watch") ? 'fb' : 'ig') : isTikTok ? 'yt' : isTwitter ? 'yt' : 'yt';
    
    console.log(`[Phase 7] Free Proxy Pool engine for ${isTikTok ? 'TT' : isTwitter ? 'TW' : platform.toUpperCase()}: ${url}`);
    
    // Get best mined proxy for this platform
    const proxyUrl = await ProxyKitchen.getBestProxyForDownload(platform);
    if (!proxyUrl) {
        throw new Error(`Phase 7: No free mined proxies available for ${platform.toUpperCase()}. Pool empty — run a hunt first.`);
    }
    console.log(`[Phase 7] Using free proxy: ${proxyUrl.substring(0, 35)}...`);

    if (isMeta) {
        // ── META (IG/FB): Use Hetzner Cobalt with proxy tunnel ──
        // Try extracting via Cobalt first (it handles IG/FB natively)
        // If that fails, use yt-dlp with the free proxy
        try {
            // Attempt: yt-dlp with free proxy for IG/FB metadata
            const ytArgs = [
                "--dump-json", "--no-warnings", "--geo-bypass",
                "--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
                "--proxy", proxyUrl
            ];
            const data = await executeYtDlp(url, ytArgs, 20000);
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const video_url = parsed.url || (parsed.requested_downloads && parsed.requested_downloads[0]?.url);
            if (!video_url) throw new Error("No video URL in yt-dlp output");
            
            await ProxyKitchen.addVerifiedProxy(proxyUrl, { yt: platform === 'yt', fb: platform === 'fb', ig: platform === 'ig', failCount: 0, lastCheckedAt: new Date().toISOString() });
            
            return {
                engine: `Layer 7: Free Proxy Pool (${platform.toUpperCase()} · $0)`,
                video_url,
                title: parsed.title || "Proxy-Extracted Video",
                duration: parsed.duration || 0,
                thumbnail: parsed.thumbnail || null,
                formats: parsed.formats || parsed.requested_formats || []
            };
        } catch (ytErr: any) {
            console.warn(`[Phase 7] yt-dlp with proxy failed for Meta: ${ytErr.message}`);
            await ProxyKitchen.banProxy(proxyUrl);
            throw new Error(`Phase 7: Free proxy failed for ${platform.toUpperCase()}: ${ytErr.message}. Try another proxy or use Layer 1/2.`);
        }
    } else {
        // ── YOUTUBE: Use yt-dlp with free proxy ──
        try {
            const ytArgs = [
                "--dump-json", "--no-warnings", "--geo-bypass",
                "--extractor-args", "youtube:player_client=ios,tv",
                "--user-agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
                "--proxy", proxyUrl
            ];
            const data = await executeYtDlp(url, ytArgs, 25000);
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            const video_url = parsed.url || (parsed.requested_downloads && parsed.requested_downloads[0]?.url);
            if (!video_url) throw new Error("No video URL in yt-dlp output");
            
            return {
                engine: 'Layer 7: Free Proxy Pool (YT · $0)',
                video_url,
                title: parsed.title || "Proxy-Extracted Video",
                duration: parsed.duration || 0,
                thumbnail: parsed.thumbnail || null,
                formats: parsed.formats || parsed.requested_formats || []
            };
        } catch (ytErr: any) {
            console.warn(`[Phase 7] Free proxy failed for YT: ${ytErr.message}`);
            await ProxyKitchen.banProxy(proxyUrl);
            throw new Error(`Phase 7: Free proxy failed for YouTube: ${ytErr.message}. Proxy may be banned by Google.`);
        }
    }
}

// ==========================================
// PHASE 6: Direct ytdl-core + BotGuard Bypass
// ==========================================
async function executePhase4_YTDLCore(url: string): Promise<any> {
    console.log('[Phase 4] Executing YTDL-Core + BotGuard Bypass for:', url);
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) throw new Error("Not a YouTube domain");
    
    
    
    const { visitorData, poToken } = await getPoToken();
    const info = await ytdl.getInfo(url, {
        requestOptions: {
            headers: {
                'X-Youtube-Identity-Token': poToken,
                'X-Goog-Visitor-Id': visitorData
            }
        }
    });

    const mergedFormats = info.formats.filter((f: any) => f.hasVideo && f.hasAudio);
    let selectedFormat = mergedFormats.find((f: any) => (f.height || 0) <= 720) || ytdl.chooseFormat(mergedFormats, { quality: 'highest' });
    
    if (!selectedFormat || !selectedFormat.url) throw new Error('Phase 6: No stream url found in ytdl-core');

    return {
        engine: 'Force Layer 4: YTDL-Core Native (Backup)',
        video_url: selectedFormat.url,
        title: info.videoDetails.title || "YTDL-Core Video",
        duration: parseInt(info.videoDetails.lengthSeconds) || 0,
        thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
        formats: [{ ext: "mp4", height: selectedFormat.height || 720, url: selectedFormat.url, id: "mp4-720", label: "MP4 720p" }]
    };
}

async function fetchSmartMetadata(url: string, forceEngine?: string): Promise<any> {
    if (!forceEngine && metaCache.has(url)) {
        const cached = metaCache.get(url)!;
        if (cached.expires > Date.now()) {
            console.log(`[Cache ⚡] Instant Metadata HIT for ${url}`);
            return cached.data;
        }
    }

    console.log(`[Phase 0] Requesting metadata. Engine mode: ${forceEngine || 'Smart Auto-Fallback'} | URL: ${url}`);

    // ==========================================

    // ==========================================
    // STRICT FORCE MODE (NO FALLBACKS)
    // ==========================================

    if (forceEngine === "layer1") {
        const result = await executePhase1_HetznerCobalt(url);
        metaCache.set(url, { data: result, expires: Date.now() + CACHE_TTL_MS });
        return result; // Crashes if fails, NO fallback
    }

    if (forceEngine === "layer2" || forceEngine === "layer2_meta" || forceEngine === "layer2_yt") {
        const result = await executePhase2_CFSwarm(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; // Crashes if fails, NO fallback
    }

    if (forceEngine === "layer3") {
        const result = await executePhase3_HetznerIPv6(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; // Crashes if fails, NO fallback
    }

    if (forceEngine === "layer4") {
        const result = await executePhase4_YTDLCore(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; // Crashes if fails, NO fallback
    }

    if (forceEngine === "layer5") {
        const result = await executePhase5_ExpansionA(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; 
    }

    if (forceEngine === "layer6") {
        const result = await executePhase6_ASocks_Ultimate(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; 
    }

    if (forceEngine === "layer7") {
        const result = await executePhase7_FreeProxyPool(url);
        metaCache.set(url, { data: result, expires: Date.now() + 60000 });
        return result; // Crashes if fails, NO fallback — this is force-test mode
    }


    // ==========================================
      // SMART AUTO-FALLBACK CASCADE (Platform-Aware)
      // Each platform gets its own waterfall of free → semi → paid methods.
      // ==========================================
      if (!forceEngine || forceEngine === "auto") {
          // Detect platform for smart routing
          const isTikTok = url.includes('tiktok.com');
          const isTwitter = url.includes('twitter.com') || url.includes('x.com');
          const isInstagram = url.includes('instagram.com') || url.includes('instagr.am');
          const isFacebook = url.includes('facebook.com') || url.includes('fb.watch');
          const isLinkedIn = url.includes('linkedin.com');
          const isMeta = isInstagram || isFacebook;

          // ── Step 1: Cobalt (works for ALL platforms) ──
          try {
              const res1 = await executePhase1_HetznerCobalt(url);
              metaCache.set(url, { data: res1, expires: Date.now() + CACHE_TTL_MS });
              return res1;
          } catch (e1: any) {
              console.log(`[Smart Fallback] Cobalt failed (${e1.message}), trying platform-specific fallbacks...`);
          }

          // ── Step 2: Platform-specific free fallbacks ──
          if (isTwitter) {
              // Twitter: fxtwitter API (free, community-run)
              try {
                  const resTw = await executeTwitterFallback(url);
                  metaCache.set(url, { data: resTw, expires: Date.now() + 60000 });
                  return resTw;
              } catch (eTw: any) {
                  console.log(`[Smart Fallback] Twitter fxtwitter failed (${eTw.message}), cascading...`);
              }
          }

          if (isTikTok) {
              // TikTok: oEmbed + embed scrape (free)
              try {
                  const resTt = await executeTikTokFallback(url);
                  metaCache.set(url, { data: resTt, expires: Date.now() + 60000 });
                  return resTt;
              } catch (eTt: any) {
                  console.log(`[Smart Fallback] TikTok fallback failed (${eTt.message}), cascading...`);
              }
          }

          if (isInstagram) {
              // Instagram Step A: P2P residential tunnel (permanent, unpatchable)
              try {
                  const resP2P = await executeP2PInstagramTunnel(url);
                  metaCache.set(url, { data: resP2P, expires: Date.now() + 60000 });
                  return resP2P;
              } catch (eP2P: any) {
                  console.log(`[Smart Fallback] P2P tunnel failed (${eP2P.message}), cascading to embed scrape...`);
              }

              // Instagram Step B: Direct embed scrape (free, no login needed)
              try {
                  const resIg = await executeInstagramEmbedScrape(url);
                  metaCache.set(url, { data: resIg, expires: Date.now() + 60000 });
                  return resIg;
              } catch (eIg: any) {
                  console.log(`[Smart Fallback] IG embed scrape failed (${eIg.message}), cascading...`);
              }
          }

          if (isLinkedIn) {
              // LinkedIn: embed page + og:video scrape (free)
              try {
                  const resLi = await executeLinkedInFallback(url);
                  metaCache.set(url, { data: resLi, expires: Date.now() + 60000 });
                  return resLi;
              } catch (eLi: any) {
                  console.log(`[Smart Fallback] LinkedIn fallback failed (${eLi.message}), cascading...`);
              }
          }

          // ── Step 3: CF Swarm (Meta/IG/FB og:video scraper) ──
          if (isMeta) {
              try {
                  const res2 = await executePhase2_CFSwarm(url);
                  metaCache.set(url, { data: res2, expires: Date.now() + 60000 });
                  return res2;
              } catch (e2: any) {
                  console.log(`[Smart Fallback] CF Swarm failed (${e2.message}), cascading...`);
              }
          }

          // ── Step 4: yt-dlp IPv6 (YouTube/general) ──
          try {
              const res3 = await executePhase3_HetznerIPv6(url);
              metaCache.set(url, { data: res3, expires: Date.now() + 60000 });
              return res3;
          } catch (e3: any) {
              console.log(`[Smart Fallback] IPv6 failed (${e3.message}), cascading...`);
          }

          // ── Step 5: ytdl-core + PO Token (YouTube only) ──
          if (!isTikTok && !isTwitter) {
              try {
                  const res4 = await executePhase4_YTDLCore(url);
                  metaCache.set(url, { data: res4, expires: Date.now() + 60000 });
                  return res4;
              } catch (e4: any) {
                  console.log(`[Smart Fallback] ytdl-core failed (${e4.message}), cascading...`);
              }
          }

          // ── Step 6: Free Proxy Pool (all platforms) ──
          try {
              const res7 = await executePhase7_FreeProxyPool(url);
              metaCache.set(url, { data: res7, expires: Date.now() + 60000 });
              return res7;
          } catch (e7: any) {
              console.log(`[Smart Fallback] Free Proxy Pool failed (${e7.message}), LAST RESORT → ASocks...`);
          }

          // ── Step 7: ASocks Paid (last resort) ──
          try {
              const res6 = await executePhase6_ASocks_Ultimate(url);
              metaCache.set(url, { data: res6, expires: Date.now() + 60000 });
              return res6;
          } catch (e6: any) {
              throw new Error(`Total engine failure after ALL layers for ${isTikTok ? 'TikTok' : isTwitter ? 'Twitter' : isLinkedIn ? 'LinkedIn' : isMeta ? 'Meta' : 'YouTube'}: ${e6.message}`);
          }
      }

    throw new Error(`Forced engine '${forceEngine}' failed or is not fully implemented yet.`);
}

// ---------------------------------------------------------------------------
// PHASE : GET /api/downloader/info
// Returns video metadata: title, thumbnail, duration, available formats
// ---------------------------------------------------------------------------
async function handleInfo(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    formatNotAvailable(res, validated.error, 400);
    return;
  }

  try {
    const forceEngine = (req.query.forceEngine as string) || undefined;
    const info = await fetchSmartMetadata(validated.url, forceEngine);

    // Build a clean, safe response — never send raw yt-dlp output to client
    const formats: { id: string; label: string; ext: string; height?: number; isAudio?: boolean }[] = [];

    // V12 Dominator: Intelligent Format Extraction
    // If we have actual formats from yt-dlp, use them to build the ladder.
    // Otherwise fallback to safe defaults.
    if (Array.isArray(info.formats) && info.formats.length > 0) {
        // Collect distinct resolutions available directly
        const heights = new Set<number>();
        info.formats.forEach((f: any) => {
            if (f.height) heights.add(f.height);
        });
        
        // Sort heights descending (8K -> 144p)
        const sortedHeights = Array.from(heights).sort((a, b) => a - b);
        
        sortedHeights.forEach(h => {
            // Only show standard resolutions to avoid clutter (e.g. 721p)
            // But sometimes non-standard is all we have. Let's be generous but labeled nicely.
            if (h >= 240) { // filter out tiny thumbnails designated as video
                formats.push({ 
                    id: `mp4-${h}`, 
                    label: `MP4 ${h}p${h >= 1080 ? ' HD' : ''}`, 
                    ext: 'mp4', 
                    height: h,
                    isAudio: false
                });
            }
        });

        // Always ensure 720p is present if not found (as valid fallback alias)
        if (!formats.find(f => f.id === 'mp4-720')) {
             formats.push({ id: "mp4-720", label: "MP4 720p", ext: "mp4", height: 720, isAudio: false });
        }
    } else {
          // Fallback for fast proxy or non-video sources - assume all standard resolutions exist (Cobalt/Proxy resolves best available)
          formats.push({ id: "mp4-360", label: "MP4 360p", ext: "mp4", height: 360, isAudio: false });
          formats.push({ id: "mp4-480", label: "MP4 480p", ext: "mp4", height: 480, isAudio: false });
          formats.push({ id: "mp4-720", label: "MP4 720p", ext: "mp4", height: 720, isAudio: false });
          formats.push({ id: "mp4-1080", label: "MP4 1080p HD", ext: "mp4", height: 1080, isAudio: false });
          formats.push({ id: "mp4-1440", label: "MP4 1440p (2K)", ext: "mp4", height: 1440, isAudio: false });
          formats.push({ id: "mp4-2160", label: "MP4 2160p (4K)", ext: "mp4", height: 2160, isAudio: false });
      }

      // Audio Formats (Always Available via conversion)
      formats.push({ id: "mp3", label: "MP3 Audio (High)", ext: "mp3", isAudio: true });
      formats.push({ id: "m4a", label: "M4A Audio (AAC)", ext: "m4a", isAudio: true });

    // Phase 3: Extract Direct CDN Preview URL to bypass proxy node and save bandwidth
    let directPreviewUrl = null;
    if (Array.isArray(info.formats)) {
        const premuxed = info.formats.filter((f: any) => {
            if (f.format_id === '2' || f.format_id === '0') return true;
            return f.ext === 'mp4' && f.acodec && f.acodec !== 'none' &&
            f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') &&
            !f.url.includes('.m3u8')
        });
        if (premuxed.length > 0) {
            const bestPreview = [...premuxed].sort((a, b) => (a.height || 0) - (b.height || 0)).find(f => (f.height || 0) >= 360);
            directPreviewUrl = bestPreview ? bestPreview.url : premuxed[0].url;
        }
    }

    // Detect platform from URL (engines don't always set extractor_key)
    const detectPlatform = (u: string): string => {
      if (/youtube\.com|youtu\.be/i.test(u)) return 'youtube';
      if (/instagram\.com|instagr\.am/i.test(u)) return 'instagram';
      if (/facebook\.com|fb\.watch/i.test(u)) return 'facebook';
      if (/tiktok\.com/i.test(u)) return 'tiktok';
      if (/twitter\.com|\bx\.com/i.test(u)) return 'twitter';
      return info.extractor_key ?? 'unknown';
    };

    // Auto-generate YouTube thumbnails (free, always works)
    let thumbnail = info.thumbnail ?? null;
    if (!thumbnail) {
      const ytId = validated.url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
      if (ytId) thumbnail = `https://img.youtube.com/vi/${ytId[1]}/maxresdefault.jpg`;
    }

    res.json({
      engine: info.engine || "Unknown Routing Layer",
      previewUrl: directPreviewUrl,
      title: info.title ?? "Untitled Video",
      thumbnail,
      duration: info.duration ?? 0,
      durationString: info.duration_string ?? (info.duration ? `${Math.floor(info.duration / 60)}:${String(info.duration % 60).padStart(2, '0')}` : "—"),
      uploader: info.uploader ?? info.channel ?? "Unknown",
      platform: detectPlatform(validated.url),
      formats });
  } catch (err: any) {
    console.error("\n================ YT-DLP CRASH DIAGNOSTIC ================");
    console.error(`[downloader/info] Error Name: ${err?.name}`);
    console.error(`[downloader/info] Error Message: ${err?.message}`);
    if (err?.stderr) {
        console.error(`[downloader/info] STDERR: ${err.stderr}`);
    }
    console.error("=========================================================\n");

    // Client-side extraction fallback: if this is a YouTube URL, tell the client
    // to try extracting with its own residential IP via Piped/Invidious mirrors
    const ytMatch = validated.url.match(
      /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
      console.log(`[downloader/info] Server extraction failed — offering client_extract fallback for ${ytMatch[1]}`);
      res.json({
        mode: 'client_extract',
        platform: 'youtube',
        videoId: ytMatch[1],
        originalUrl: validated.url,
        serverError: err?.message?.slice(0, 200),
      });
      return;
    }
    
    const { message, code, status } = mapDownloaderError(err);
    res.status(status).json({ error: message, code });
  }
}

// ---------------------------------------------------------------------------
// PHASE : GET /api/downloader/stream
// Pipes the video/audio directly to the client — never buffers to disk/RAM
// ---------------------------------------------------------------------------
async function handleStream(req: Request, res: Response): Promise<void> {
  const startSec = req.query.start ? parseFloat(req.query.start as string) : null;
  const endSec = req.query.end ? parseFloat(req.query.end as string) : null;
  const rawUrl = req.query.url as string;
  const rawFormat = req.query.format as string || "mp4-720";
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const userSessionId = req.query.sessionId || (req as any).session?.userId || 'anonymous';

  console.log(`\n======================================================`);
  console.log(`🔵 [VIBE CODER] 🔥 NEW INCOMING STREAM CONNECTION 🔥`);
  console.log(`🛡️ [AUDIT LOG]   IP: ${userIp} | Session: ${userSessionId}`);
  console.log(`🔗 TARGET URL   : ${rawUrl}`);
  console.log(`🎛️ REQUESTED FMT: ${rawFormat}`);
  console.log(`✂️ TRIMMING     : ${startSec !== null ? `YES (From ${startSec}s to ${endSec}s)` : 'NO (Full Video)'}`);
  console.log(`======================================================\n`);

  const validated = validateVideoUrl(rawUrl);
  if (!validated.ok) {
    console.error(`❌ [VIBE CODER] URL rejected: ${validated.error}`);
    res.status(400).json({ error: validated.error });
    return;
  }

  const format = (req.query.format as string) ?? "mp4-720";
  const mode = (req.query.mode as string) ?? "download"; // 'download' | 'preview'

  // Phase 14: Global Concurrency Guard
    // Since previews return instant 302 redirects to CDN, they do not stress the Oracle VM RAM.
    const isStreamOrTrimSpawn = mode !== "preview";
    let slotAcquired = false;

    if (isStreamOrTrimSpawn) {
        if (!tryAcquireSlot()) {
            res.status(503).json({ error: "High traffic volume. Please try again in 30 seconds." });
            return;
        }
        slotAcquired = true;
    }

    // Ensure we release the slot when done
    let released = false;
    const releaseOnce = () => {
        if (slotAcquired && !released) {
             releaseSlot();
             released = true;
        }
    };
  res.on("close", releaseOnce);
  res.on("finish", releaseOnce);
  res.on("error", releaseOnce);

  // CORS for WASM/Trimming fetch
  // Since we use query param auth now, we can allow origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Disposition, Content-Type");

  // V12 Dominator: Dynamic Format Mapping
  // Supports patterns like "mp4-{HEIGHT}" or "audio-{EXT}"
  let chosen: { ytFormat: string; ext: string; isAudio: boolean } | null = null;
  const formatCode = (req.query.format as string) ?? "mp4-720";

  if (formatCode === "mp3") {
      chosen = { ytFormat: "bestaudio/best", ext: "mp3", isAudio: true };
  } else if (formatCode === "m4a") {
      chosen = { ytFormat: "bestaudio[ext=m4a]/bestaudio", ext: "m4a", isAudio: true };
  } else if (formatCode.startsWith("mp4-")) {
      const height = parseInt(formatCode.replace("mp4-", ""));
      if (!isNaN(height)) {
          // Fix: Must use pre-merged format (e.g., best[ext=mp4]) because pipelining to stdout cannot remux separate audio+video streams on-the-fly.
          chosen = {
              ytFormat: `best[height<=${height}][ext=mp4]/best[height<=${height}]/best`,
              ext: "mp4",
              isAudio: false
          };
      }
  }

  // Fallback for legacy calls
  if (!chosen) {
      if (formatCode === "mp4-720") chosen = { ytFormat: "best[height<=720][ext=mp4]/best", ext: "mp4", isAudio: false };
      else if (formatCode === "mp4-1080") chosen = { ytFormat: "best[height<=1080][ext=mp4]/best", ext: "mp4", isAudio: false };
      else chosen = { ytFormat: "best[height<=720][ext=mp4]/best", ext: "mp4", isAudio: false }; // Default safety
  }
  console.log(`🎯 [VIBE CODER] SERVER DECISION -> EXECUTING MEDIA SELECTION:`);
  console.log(`   🔸 Output Extension: .${chosen.ext.toUpperCase()}`);
  console.log(`   🔸 Is Audio Only?  : ${chosen.isAudio ? '✅ YES 🔊' : '❌ NO 🎥'}`);
  console.log(`   🔸 YT-DLP Selector : [ ${chosen.ytFormat} ]\n`);
  // Build a safe filename from the URL or query param
  let filenameBase = req.query.title ? String(req.query.title) : `bongbari_download_${Date.now()}`;
  const filename = `${filenameBase}.${chosen.ext}`;

  // Set download headers BEFORE streaming starts
  if (mode === "preview") {
     res.setHeader("Content-Disposition", "inline");
  } else {
     res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  }
  
  res.setHeader("Content-Type", chosen.isAudio ? "audio/mpeg" : "video/mp4");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering on Oracle VM

  // Prevent idle timeout by forcing headers out immediately
  res.flushHeaders();

  // 10 minute timeout (increased for 4K remuxing)
  req.socket.setTimeout(600_000);

  try {
      const forceEngine = (req.query.forceEngine as string) || undefined;
      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      const isMeta = validated.url.includes("instagram.com") || validated.url.includes("facebook.com") || validated.url.includes("fb.watch");

      // =========================================================================
      // LAYER 7: FREE PROXY POOL STREAM (forced only)
      // Resolve video_url via free mined proxy, then redirect client to CDN
      // =========================================================================
      if (forceEngine === "layer7") {
          try {
              console.log(`[Layer 7 Stream] Resolving stream URL via free proxy pool...`);
              const meta = await executePhase7_FreeProxyPool(validated.url);
              if (meta.video_url) {
                  const isTrimmingReq = startSec !== null && endSec !== null && endSec > startSec;
                  if (isTrimmingReq || chosen.ext === "mp3") {
                      // Need ffmpeg processing — pipe through ffmpeg
                      const ffmpegArgs: string[] = [];
                      if (isTrimmingReq) ffmpegArgs.push("-ss", startSec!.toString());
                      ffmpegArgs.push("-i", meta.video_url);
                      if (isTrimmingReq) ffmpegArgs.push("-to", endSec!.toString());
                      if (chosen.ext === "mp3") {
                          ffmpegArgs.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
                      } else if (chosen.isAudio) {
                          ffmpegArgs.push("-vn", "-c:a", "copy");
                      } else {
                          ffmpegArgs.push("-c:v", "copy", "-c:a", "copy");
                      }
                      ffmpegArgs.push("-f", chosen.ext === "mp3" ? "mp3" : "mp4", "pipe:1");
                      
                      res.setHeader("Content-Disposition", `attachment; filename="bongbari_proxy_${Date.now()}.${chosen.ext}"`);
                      const subprocess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, { stdio: ["ignore", "pipe", "pipe"] });
                      subprocess.stdout?.pipe(res);
                      subprocess.on("error", (err: any) => { if (!res.headersSent) res.status(500).json({ error: "Processing failed." }); });
                      req.on("close", () => { subprocess.kill?.("SIGTERM"); });
                      return;
                  } else {
                      console.log(`✅ [Layer 7 SUCCESS] Redirecting to CDN via free proxy!`);
                      res.redirect(302, meta.video_url);
                      return;
                  }
              }
              throw new Error("Layer 7 resolved but no video_url");
          } catch (l7Err: any) {
              console.error(`[Layer 7 Stream] Failed:`, l7Err.message);
              if (!res.headersSent) res.status(422).json({ error: "Layer 7 Free Proxy failed: " + l7Err.message });
              return;
          }
      }
      
      // =========================================================================
      // V14.5 LAYER 1.5: FAST HETZNER COBALT FOR META (Experimental / Safe Fallback)
      // =========================================================================
      if (isMeta && (!forceEngine || forceEngine === "layer1")) {
          try {
              console.log(`[Layer 1.5] Meta detected. Attempting fast internal Hetzner Cobalt resolve (Phase 1) safely...`);
              const vpsNode = getNextPreviewNode();
              const payload = JSON.stringify({ url: validated.url,  isAudioOnly: chosen.isAudio });
              
              const vpsRes = await fetch(vpsNode, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Accept": "application/json" },
                  body: payload,
                  signal: AbortSignal.timeout(3500) // Fast 3.5s timeout. If it hangs, we instantly fallback!
              });
              
              if (vpsRes.ok) {
                  const json = await vpsRes.json();
                  if (json.url) {
                      const sourceStreamUrl = json.url;
                      const isTrimmingReq = startSec !== null && endSec !== null && endSec > startSec;
                      
                      if (isTrimmingReq || chosen.ext === "mp3") {
                           console.log(`[Layer 1.5] Trimming or audio-only Meta stream. Acquired CDN URL from Hetzner for FFmpeg processing.`);
                           const ffmpegArgs = [];
                           if (isTrimmingReq) {
                               ffmpegArgs.push("-ss", startSec.toString());
                           }
                           ffmpegArgs.push("-i", sourceStreamUrl);
                           if (isTrimmingReq) {
                               ffmpegArgs.push("-to", endSec.toString());
                           }

                           if (chosen.ext === "mp3") {
                               ffmpegArgs.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
                           } else if (chosen.isAudio) {
                               ffmpegArgs.push("-vn", "-c:a", "copy");
                           } else {
                               ffmpegArgs.push("-c:v", "copy", "-c:a", "copy");
                           }

                           ffmpegArgs.push("-f", chosen.ext === "mp3" ? "mp3" : "mp4");
                           ffmpegArgs.push("pipe:1");

                           console.log(`⚙️ EXEC: ffmpeg ${ffmpegArgs.join(" ")}`);
                           
                           res.setHeader("Content-Disposition", `attachment; filename="bongbari_meta_${Date.now()}.${chosen.ext}"`);
                           res.setHeader("Content-Type", chosen.ext === "mp3" ? "audio/mpeg" : "video/mp4");
                           
                           const subprocess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, {
                               stdio: ["ignore", "pipe", "pipe"] });

                           subprocess.stderr?.on("data", (chunk: Buffer) => {
                               const msg = chunk.toString();
                               Object.assign({}, {msg});
                           });

                           subprocess.on("error", (err: any) => {
                               console.error(`[CRASH ALERT] spawn error:`, err?.message);
                               if (!res.headersSent) res.status(500).json({ error: "Processing failed." });
                           });

                           subprocess.stdout?.pipe(res);

                           req.on("close", () => {
                               subprocess.kill?.("SIGTERM");
                           });
                           return;
                      } else {
                          console.log(`[Layer 1.5 SUCCESS] Hetzner successfully extracted Meta link! Redirecting...`);
                          res.redirect(302, json.url);
                          return;
                      }
                  }
              }
              throw new Error("Hetzner returned ok but missing url in payload");
          } catch(e: any) {
              console.log(`[Layer 1.5] Hetzner Meta bypass failed (${e.message}), cleanly falling back to Layer 2 Ghost Nodes...`);
              if (forceEngine === "layer1") { // If explicitly forced to Layer 1, don't fall back, just crash here as requested.
                  if (!res.headersSent) res.status(422).json({ error: "Layer 1 forced, but Hetzner failed for Meta: " + e.message });
                  return;
              }
          }
      }

      // =========================================================================
// LAYER 2 CLOUDFLARE EDGE SWARM (META/INSTAGRAM)
      // =======================================================================
      if ((isMeta && !forceEngine) || forceEngine === "layer2") {
          console.log(`[Layer 2] Meta detected on stream route. Booting Cloudflare Edge Swarm...`);
          try {
              const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(validated.url);
              const swarmRes = await axios.get(swarmUrl, { timeout: 10000 });
              
              let sourceStreamUrl = null;
              
              const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
              
              // Extract video url from meta tags or json
              let match = body.match(/"video_url":"([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video" content="([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);
              if (!match) match = body.match(/"video_url":"([^"]+)"/);
              if (!match) {
                  const fbMatch = body.match(/"playable_url_quality_hd":"([^"]+)"/);
                  if (fbMatch) match = fbMatch;
              }
              
              console.log(`[Layer 2] Edge Swarm payload received. Checking for raw URLs...`);
              if (!match) {
                  // Maybe it returned JSON ?
                  try {
                      const j = JSON.parse(body);
                      if (j && j.video_url) {
                          match = [j.video_url, j.video_url];
                      }
                   } catch(e){}
              }
              
              if (match && match[1]) {
                   sourceStreamUrl = match[1].replace(/\\/g, '');
                   console.log(`[Layer 2] Edge Swarm Success: ${sourceStreamUrl.substring(0, 50)}...`);
              } else {
                   throw new Error("No video_url found in Swarm payload");
              }

              const isTrimmingReq = startSec !== null && endSec !== null && endSec > startSec;
              
              if (isTrimmingReq || chosen.ext === "mp3") {
                   console.log(`[Layer 2] Trimming or audio-only Meta stream. Acquired CDN URL from Ghost Layer for FFmpeg processing.`);
                   
                   const ffmpegArgs = [];
                   if (isTrimmingReq) {
                       ffmpegArgs.push("-ss", startSec.toString());
                   }
                   ffmpegArgs.push("-i", sourceStreamUrl);

                   if (isTrimmingReq) {
                       ffmpegArgs.push("-to", endSec.toString());
                   }

                   if (chosen.ext === "mp3") {
                       ffmpegArgs.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
                   } else if (chosen.isAudio) {
                       ffmpegArgs.push("-vn", "-c:a", "copy");
                   } else {
                       ffmpegArgs.push("-c:v", "copy", "-c:a", "copy");
                   }

                   ffmpegArgs.push("-f", chosen.ext === "mp3" ? "mp3" : "mp4");
                   ffmpegArgs.push("pipe:1");

                   console.log(`⚙️ EXEC: ffmpeg ${ffmpegArgs.join(" ")}`);

                   res.setHeader("Content-Disposition", `attachment; filename="bongbari_meta_${Date.now()}.${chosen.ext}"`);
                   res.setHeader("Content-Type", chosen.ext === "mp3" ? "audio/mpeg" : "video/mp4");

                   const subprocess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, {
                       stdio: ["ignore", "pipe", "pipe"] });

                   subprocess.stderr?.on("data", (chunk: Buffer) => {
                       const msg = chunk.toString();
                       Object.assign({}, {msg});
                   });

                   subprocess.on("error", (err: any) => {
                       console.error(`[CRASH ALERT] spawn error:`, err?.message);
                       if (!res.headersSent) res.status(500).json({ error: "Processing failed." });
                   });

                   subprocess.stdout?.pipe(res);

                   req.on("close", () => {
                       subprocess.kill?.("SIGTERM");
                   });
                   return;

              } else {
                  console.log(`✅ [Layer 2 SUCCESS] Redirecting client directly to Meta CDN!`);
                  res.redirect(302, sourceStreamUrl);
                  return;
              }
          } catch (metaErr: any) {
               console.error(`[Layer 2] Edge Swarm bypass failed!`, metaErr.message);
               if (forceEngine === "layer2") {
                   res.status(500).json({ error: "Layer 2 Forced but Failed: " + metaErr.message });
                   return;
               }
               // Proceed to Layer 3 fallback (yt-dlp) if Ghost Layer fails, mostly will fail but we try.
               console.log(`[Layer 2] Falling back to Layer 3 (yt-dlp) for Meta URL...`);
          }
      }

      // =========================================================================
      // V14 SERVERLESS YOUTUBE STREAMING BYPASS
      // Since Oracle/datacenter IPs are totally tarpitted by BotGuard scraping, we MUST
      // resolve the exact CDN link using native node crypto, then 302 redirect
      // the client so their own residential IP downloads from Google directly.
      // =========================================================================
      if ((isYT && !forceEngine) || forceEngine === "layer1") {
          try {
              console.log(`[Phase 2] YouTube detected. Booting Hetzner VPS Resolver...`);
              const vpsNode = getNextPreviewNode();
              const isTrimmingReq = startSec !== null && endSec !== null && endSec > startSec;

              const payload = JSON.stringify({
                  url: validated.url,
                  
                  
                  isAudioOnly: chosen.isAudio
              });

              // Calling Hetzner VPS Node
              const vpsRes = await fetch(vpsNode, {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Accept": "application/json"
                  },
                  body: payload
              });

              if (!vpsRes.ok) {
                  throw new Error("VPS resolve failed with status: " + vpsRes.status);
              }

              const json = await vpsRes.json();
              if (!json.url) {
                  throw new Error("Proxy returned invalid response (missing url).");
              }

              const sourceStreamUrl = json.url;

              if (isTrimmingReq || chosen.ext === "mp3") {
                   console.log(`[Phase 2] Trimming or strict payload detected. Acquired CDN URL from Hetzner for FFmpeg processing.`);
                   
                   const ffmpegArgs = [];
                   if (isTrimmingReq) {
                       ffmpegArgs.push("-ss", startSec.toString());
                   }
                   ffmpegArgs.push("-i", sourceStreamUrl);

                   if (isTrimmingReq) {
                       ffmpegArgs.push("-to", endSec.toString());
                   }

                   if (chosen.ext === "mp3") {
                       ffmpegArgs.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
                   } else if (chosen.isAudio) {
                       ffmpegArgs.push("-vn", "-c:a", "copy");
                   } else {
                       ffmpegArgs.push("-c:v", "copy", "-c:a", "copy");
                   }

                   ffmpegArgs.push("-f", chosen.ext === "mp3" ? "mp3" : "mp4");
                   ffmpegArgs.push("pipe:1");

                   console.log(`⚙️ EXEC: ffmpeg ${ffmpegArgs.join(" ")}`);

                   // Set headers to prevent Express from buffering or changing the format
                   res.setHeader("Content-Disposition", `attachment; filename="bongbari_${Date.now()}.${chosen.ext}"`);
                   res.setHeader("Content-Type", chosen.ext === "mp3" ? "audio/mpeg" : "video/mp4");

                   const subprocess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs, {
                       stdio: ["ignore", "pipe", "pipe"] });

                   subprocess.stderr?.on("data", (chunk: Buffer) => {
                       const msg = chunk.toString();
                       Object.assign({}, {msg}); // suppress unused
                   });

                   subprocess.on("error", (err: any) => {
                       console.error(`[CRASH ALERT] spawn error:`, err?.message);
                       if (!res.headersSent) res.status(500).json({ error: "Processing failed." });
                   });

                   subprocess.stdout?.pipe(res);

                   req.on("close", () => {
                       subprocess.kill?.("SIGTERM");
                   });
                   return; // End flow because piping handles response

              } else {
                  console.log(`✅ [SUCCESS] Bypassed Oracle Extractor completely! Redirecting client directly to Hetzner-resolved Google CDN!`);
                  res.redirect(302, sourceStreamUrl);
                  return;
              }
          } catch (vpsErr: any) {
               console.error(`[Phase 2] VPS Node bypass failed!`, vpsErr.message);
               res.status(422).json({ error: "YouTube stream extraction failed due to Hetzner node timeout. Please try a different URL." });
               return;
          }
      }
      let extraArgs: string[] = ["--extractor-args", "youtube:player_client=android,ios"];
      
      const sessionProxy = generateRotatedProxy();
      console.log(`[Phase 3] Booting Temp File Downloader using ASocks Proxy: ${sessionProxy.replace(/:[^:@]+@/, ':***@')}`);

      const ytdlArgs: string[] = [
        "--no-warnings",
        "--no-call-home",
        "--no-check-certificate",
        "--proxy", sessionProxy,
        ...extraArgs,
      "--force-ipv4",
      // Buffer optimization
      "--console-title",
      // Limit concurrent users for server stability
      "--match-filter", "duration <= 600",
    ];

    if (ffmpegPath) {
        ytdlArgs.push("--ffmpeg-location", ffmpegPath);
    }

        // V13: Server-side Trimming using yt-dlp native sections
    const isTrimming = startSec !== null && endSec !== null && endSec > startSec;
    let requiresTempFile = isTrimming || chosen.isAudio;
    let fallbackPiped = false;

    // 1. FAST-PATH DIRECT CDN REDIRECT (Full Videos Only, to prevent KB files)
    if (!requiresTempFile && !forceEngine) {
        console.log(`[Phase 0] Testing direct CDN URL viability...`);
        try {
            const data = await executeYtDlpExtract(validated.url, ["--format", chosen.ytFormat]);
            const rawCdnUrl = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
            
            // If it's a split track or manifest, we MUST use a temp file to merge!
            const isManifest = rawCdnUrl && (rawCdnUrl.includes('.m3u8') || rawCdnUrl.includes('manifest'));
            const needsMerge = data.requested_formats && data.requested_formats.length > 1;
            const isSplitTrack = !data.acodec || data.acodec === 'none' || data.vcodec === 'none';

            if (rawCdnUrl && !isManifest && !needsMerge && !isSplitTrack) {
                console.log(`✅ [SUCCESS] Fast-pathing Full Video -> Redirecting client directly to Google CDN!`);
                res.redirect(302, rawCdnUrl);
                return;
            } else {
                console.log(`[Phase 0] Requested quality requires ffmpeg merge (Split/DASH/M3U8). Escalating to Temp File...`);
                requiresTempFile = true;
                const heightMatch = chosen.ytFormat.match(/height<=(\d+)/);
                const heightLimit = heightMatch ? heightMatch[1] : "720";
                chosen.ytFormat = `bestvideo[height<=${heightLimit}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${heightLimit}][ext=mp4]+bestaudio/best[height<=${heightLimit}]/best`;
            }
        } catch(cdnErr: any) {
            console.warn(`[Phase 0] Direct CDN extraction failed. Attempting Temp File approach...`);
            requiresTempFile = true;
        }
    }

    // 2. YT-DLP ENGINE ARGUMENTS
    if (chosen.isAudio) {
      ytdlArgs.push("--extract-audio", "--audio-format", chosen.ext, "--audio-quality", "0", "--format", "bestaudio/best");
    } else {
        if (requiresTempFile && !isTrimming) {
            ytdlArgs.push("--format", chosen.ytFormat); // Uses the escalated format
        } else if (isTrimming) {
            const heightMatch = chosen.ytFormat.match(/height<=(\d+)/);
            const heightLimit = heightMatch ? heightMatch[1] : "720";
            ytdlArgs.push("--format", `bestvideo[height<=${heightLimit}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${heightLimit}][ext=mp4]+bestaudio/best[height<=${heightLimit}]/best`);
        } else {
            ytdlArgs.push("--format", chosen.ytFormat);
        }
        ytdlArgs.push("--merge-output-format", "mp4");
    }

    // 3. EXECUTION
    if (requiresTempFile) {
        console.log(`\n\n🟢 [VIBE CODER ALERT] 👉 TEMP FILE MERGE/TRIM INITIATED!`);
        console.log(`🎬 TARGET VIDEO: ${validated.url}`);
        if (isTrimming) console.log(`✂️ CUT TIMESTAMPS: Start -> ${startSec}s | End -> ${endSec}s`);
        
        const tmpDir = os.tmpdir();
        const trimFile = path.join(tmpDir, `task_${crypto.randomBytes(8).toString('hex')}.${chosen.ext}`);
        
        console.log(`📁 TEMP FILE ALLOCATED AT: ${trimFile}`);
        
        if (isTrimming) {
            ytdlArgs.push("--download-sections", `*${Number(startSec).toFixed(3)}-${Number(endSec).toFixed(3)}`);
            ytdlArgs.push("--force-keyframes-at-cuts");
        }
        ytdlArgs.push("-o", trimFile);

        console.log(`🚀 FIRING YT-DLP ENGINE WITH ARGS:`);
        console.log(`🛠️ [ ${ytdlArgs.join(' ')} ]\n`);

        const subprocess = spawn(YT_DLP_PATH, [...ytdlArgs, validated.url], {
          stdio: ["ignore", "pipe", "pipe"] });

        subprocess.stderr?.on("data", (chunk: Buffer) => {
            const msg = chunk.toString();
            console.log(`⚙️ [YT-DLP WORKING] -> ${msg.trim()}`);
        });

        subprocess.on("error", (err: any) => {
            console.error(`🚨 [CRASH ALERT] spawn error:`, err?.message);
            if (!res.headersSent) res.status(500).json({ error: "Download failed." });
        });

        subprocess.on("close", (code: number) => {
            console.log(`\n🏁 [PROCESS FINISHED] YT-DLP EXITED WITH CODE: ${code}`);
            
            if (code === 0 && fs.existsSync(trimFile)) {
                try {
                  const stat = fs.statSync(trimFile);
                  console.log(`✅ [SUCCESS] FILE GENERATED! SIZE: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
                  if (!res.headersSent) {
                    res.setHeader("Content-Length", stat.size);
                  }
                } catch(e) {}
                
                console.log(`🚚 [STREAMING] PIPING BITES TO BROWSER NOW...`);
                const readStream = fs.createReadStream(trimFile);
                readStream.pipe(res);
                
                readStream.on("end", () => {
                   console.log(`🎉 [DONE] PIPING COMPLETED! BURNING TEMP FILE...`);
                   try { fs.unlinkSync(trimFile); } catch(e){}
                });
                readStream.on("error", () => {
                   console.log(`💥 [CRASH] PIPE STREAM FAILED! BURNING TEMP FILE...`);
                   try { fs.unlinkSync(trimFile); } catch(e){} 
                });
            } else {
                console.error(`❌ [FAILURE] yt-dlp FAILED OR FILE MISSING!`);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Download or Trimming failed. Please try again." });
                } else {
                    res.end();
                }
                try { fs.unlinkSync(trimFile); } catch(e) {}
            }
        });

        req.on("close", () => {
            console.log(`🔌 [DISCONNECT] BROWSER HUNG UP! KILLING SUBPROCESS...`);
            subprocess.kill?.("SIGTERM");
            setTimeout(() => { try { fs.unlinkSync(trimFile); } catch(e){} }, 5000);
        });

    } else {
          // Absolute fail-safe pipe if we bypassed both CDN and temp file (rare)
          console.log(`[Phase 3] Proxies exhausted/failed. Falling back to native yt-dlp local buffering stream...`);
          ytdlArgs.push("-o", "-");
          const subprocess = spawn(YT_DLP_PATH, [...ytdlArgs, validated.url], {
            stdio: ["ignore", "pipe", "pipe"] });

          subprocess.stderr?.on("data", (chunk: Buffer) => {
            const msg = chunk.toString();
            console.log(`⚙️ [YT-DLP] -> ${msg.trim()}`);
          });

          subprocess.on("error", (err: any) => {
            if (!res.headersSent) res.status(500).json({ error: "Download failed." });
          });

          subprocess.on("close", (code: number) => {
             if (!res.writableEnded && !res.headersSent) res.status(500).json({ error: "Stream ended prematurely" });
          });

          subprocess.stdout?.pipe(res);

          req.on("close", () => {
            console.log(`🔌 [DISCONNECT] BROWSER HUNG UP! KILLING SUBPROCESS...`);
            subprocess.kill?.("SIGTERM");
          });
      }
    } catch (err: any) {
    console.error("[downloader/stream] error:", err?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Download failed. The video may no longer be available." });
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE : GET /api/downloader/proxy-stream
// Returns a short-lived direct URL for the browser <video> preview tag.
// Uses Cobalt proxy with 480p setting for lightweight memory caching.
// ---------------------------------------------------------------------------
async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  const requestedFormat = (req.query.format as string) || "mp4-480";
  // Extract quality '480' from 'mp4-480'
  const qualityMatch = requestedFormat.match(/\d{3,4}/);
  const qStr = qualityMatch ? parseInt(qualityMatch[0]) : 480;

  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const { url } = validated;
  const isStreamMode = req.query.mode === 'stream';
  const forceEngine = (req.query.forceEngine as string) || undefined;

  // Secure Proxy Pipe: Prevents strict-IP 403 errors by routing bytes through our backend
  const proxyDirectStream = async (targetUrl: string) => {
      try {
          const headers: Record<string, string> = {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36) Chrome/120.0.0.0 Safari/537.36"
          };
          if (req.headers.range) {
              headers["Range"] = req.headers.range;
          }

          // Phase A: Stealth for Metadata. Brute force (no proxy) for streams.
          
          if (req.method === 'HEAD') {
              // Rapid fast-path for browser video pre-flight checks, but MUST validate against 403s
              try {
                  const headRes = await axios.head(targetUrl, { headers, validateStatus: () => true, timeout: 4000 });
                  if (headRes.status !== 200 && headRes.status !== 206) return false;

                  res.status(headRes.status);
                  res.setHeader('Accept-Ranges', 'bytes');
                  res.setHeader('Content-Type', headRes.headers['content-type'] || 'video/mp4');
                  if (headRes.headers['content-length']) res.setHeader('Content-Length', headRes.headers['content-length']);
                  res.end();
                  return true;
              } catch(e) { return false; }
          }

            const requestStart = performance.now();
            const axiosConfig: any = {
                headers,
                responseType: 'stream',
                validateStatus: () => true };

            const proxyRes = await axios.get(targetUrl, axiosConfig);
              if (proxyRes.status !== 200 && proxyRes.status !== 206) {
                   console.log(`[Telemetry] Proxy Direct Stream Failed with status: ${proxyRes.status}`);
                   return false;
              }
    
              res.status(proxyRes.status);
              const fHeaders = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
              for (const key of fHeaders) {              if (proxyRes.headers[key]) res.setHeader(key, proxyRes.headers[key] as string);
          }
          const ttff = Math.round(performance.now() - requestStart);
          console.log(`[Telemetry 🚀] Time To First Frame (TTFF): ${ttff}ms (Range: ${req.headers.range || 'Full'})`);
          proxyRes.data.pipe(res);
          return true;
      } catch(e) {
          return false;
      }
  };

  let bestStreamUrl: string | null = null;

  // 1. FAST PATH: Check RAM Cache for existing direct URL
  if (streamCache.has(url)) {
      const cached = streamCache.get(url)!;
      if (cached.expires > Date.now()) {
          bestStreamUrl = cached.url;
      }
  }

  // 2. ULTRA SMART PATH (Phase 0 Fast Cache Sharing):
  if (!bestStreamUrl && metaCache.has(url)) {
      const cached = metaCache.get(url)!;
      if (cached.expires > Date.now() && cached.data.formats && Array.isArray(cached.data.formats)) {
          const rawFormats = cached.data.formats;
            // Best pre-muxed mp4 formats (like format 18 or 22 from YouTube)
            const premuxed = rawFormats.filter((f: any) => {
                if (f.format_id === '2' || f.format_id === '0') return true;
                return f.ext === 'mp4' && f.acodec && f.acodec !== 'none' && f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('.m3u8');
            });

            if (premuxed.length > 0) {
                bestStreamUrl = premuxed[0].url; // fallback to worst if no match
                for (const f of premuxed) {
                    const minDim = Math.min(f.height || 0, f.width || 0);
                    if (minDim > 0 && minDim <= qStr) bestStreamUrl = f.url;
                }
            }

            // Universal fallback: any playable video URL
            if (!bestStreamUrl) {
                const anyValidUrl = rawFormats.find((f: any) =>
                    f.vcodec && f.vcodec !== 'none' && f.url && f.url.startsWith('http') && !f.url.includes('manifest') && !f.url.includes('.m3u8')
                );
                if (anyValidUrl) bestStreamUrl = anyValidUrl.url;
            }
        }
    }

  // 3. Fallback: If cache completely misses, fetch it via proxy
  if (!bestStreamUrl) {
      console.log(`[Phase 0] Requesting fast PREVIEW proxy extraction for: ${url}`);
      const isYT = validated.url.includes("youtube.com") || validated.url.includes("youtu.be");
      const isMeta = validated.url.includes("instagram.com") || validated.url.includes("facebook.com") || validated.url.includes("fb.watch");

      // ── PROVEN METHOD: Route through Hetzner VPS (clean IP, not banned by BotGuard) ──
      // Always try Hetzner first unless explicitly forced to skip it (e.g., layer2 or layer4)
      if ((!forceEngine) || forceEngine === "layer1") {
          try {
              const vpsNode = getNextPreviewNode();
              console.log(`[Layer 1.5] PREVIEW Route: Requesting Hetzner VPS ${vpsNode}`);
              const vpsRes = await axios.post(vpsNode, { url: validated.url }, {
                  timeout: 10000,
                  headers: { 'Content-Type': 'application/json' }
              });
              if (vpsRes.data && vpsRes.data.url) {
                  bestStreamUrl = vpsRes.data.url;
                  console.log(`[Layer 1.5] ✅ Hetzner preview returned CDN URL instantly!`);
              }
          } catch(vpsErr: any) {
              console.warn(`[Layer 1.5] Hetzner preview failed: ${vpsErr.message}. Falling back...`);
          }
      }

      // LAYER 2 CLOUDFLARE EDGE SWARM FALLBACK (META ONLY)
      if (!bestStreamUrl && isMeta && (!forceEngine || forceEngine === "layer2")) {
          console.log(`[Layer 2] PREVIEW Route: Meta detected. Connecting Cloudflare Edge Swarm...`);
          try {
              const swarmUrl = "https://ancient-king-7fa9.guitarguitarabhijit.workers.dev/?url=" + encodeURIComponent(validated.url);
              const swarmRes = await axios.get(swarmUrl, { timeout: 10000 });
              
              const body = typeof swarmRes.data === 'string' ? swarmRes.data : JSON.stringify(swarmRes.data);
              
              let match = body.match(/"video_url":"([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video" content="([^"]+)"/);
              if (!match) match = body.match(/<meta property="og:video:url" content="([^"]+)"/);
              
              if (match && match[1]) {
                   const streamUrl = match[1].replace(/\\/g, '');
                   bestStreamUrl = streamUrl;
                   let finalEngine = 'Layer 2 (Free Meta Edge Swarm)';
                   
                   console.log(`[Layer 2] Edge Swarm found preview stream.`);
              }
          } catch (swarmErr: any) {
              console.error(`[Layer 2] Edge Swarm fully crashed:`, swarmErr.message);
              if (forceEngine === "layer2") {
                  return formatNotAvailable(res, `Layer 2 Swarm Extraction Failed: ${swarmErr.message}`, 500);
              }
          }
      }

      // LAYER 4 (ASOCKS + YT-DLP)
      if (!bestStreamUrl && (!forceEngine || forceEngine === "layer4" || forceEngine === "layer3")) {
          // Explicitly block deep fallback if user forced a lighter layer that failed
          if (forceEngine && !["layer4", "layer3"].includes(forceEngine)) {
              console.warn(`[VIBE CODER] Engine ${forceEngine} failed. Aborting deep cascade.`);
              return formatNotAvailable(res, `Forced Engine ${forceEngine} failed to find video.`, 500);
          }
          // If we exhaust fast APIs or explicit Layer 3 forced...
          console.log(`[Layer 4] PREVIEW Route: Falling back to executeYtDlpExtract...`);
          try {
              if (isYT) {
                  const { visitorData, poToken } = await getPoToken();
                  const info = await ytdl.getInfo(validated.url, {
                      requestOptions: {
                          headers: {
                              'Cookie': `po_token=web+${poToken}; visitor_data=${visitorData}`
                          }
                      }
                  });
                  const mergedFormats = info.formats.filter((f: any) => f.hasVideo && f.hasAudio);
                  let selectedFormat = mergedFormats.sort((a: any, b: any) => (b.height || 0) - (a.height || 0)).find((f: any) => (f.height || 0) <= qStr);
                  if (!selectedFormat) selectedFormat = ytdl.chooseFormat(mergedFormats, { quality: 'highest' });
                  if (selectedFormat && selectedFormat.url) bestStreamUrl = selectedFormat.url;
              } else {
                  // Meta / other extract via proxy
                  const data = await executeYtDlpExtract(url, ["--format", "b"]);
                  bestStreamUrl = data.url || (data.requested_downloads && data.requested_downloads[0]?.url);
              }
          } catch(e: any) {
              console.error("[Layer 3] yt-dlp fallback also failed:", e.message);
          }
      }
  }

  // 4. Send response appropriately (pipe vs json)
  if (bestStreamUrl) {
      streamCache.set(url, { url: bestStreamUrl, expires: Date.now() + CACHE_TTL_MS });

      if (isStreamMode) {
          // Use high-speed proxy pipe to bypass client IP restrictions
          const success = await proxyDirectStream(bestStreamUrl);
          if (success) {
              console.log(`[Telemetry] Proxy Stream Success. Bytes piped to client.`);
              return; // Served via proxy!
          }
          console.warn(`[Telemetry] CDN Proxy Stream Failed or Returned 403. Falling back to underlying yt-dlp pipe!`);
          // If proxy fails, fall through to native yt-dlp spawn
      } else {
          // Backward compatibility for old UI flow
          res.json({ streamUrl: bestStreamUrl });
          return;
      }
  }

  // 5. NATIVE PIPE FALLBACK (if CDN direct stream 403s or URL missing entirely)
  if (isStreamMode) {
      if (req.method === 'HEAD') {
          // Fake a 200 OK for HEAD so the browser proceeds to GET
          // Spawning yt-dlp just for a HEAD request is too slow and wasteful
          res.status(200);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Type', 'video/mp4');
          res.end();
          return;
      }
          try {
          const ytdlArgs = ["-f", `best[height<=${qStr}][ext=mp4]/best`, "-o", "-", "--no-warnings", "--force-ipv4"];
          // 🚨 CRITICAL RULE: NEVER USE PROXY FOR VIDEO STREAMING BYTES! 🚨
          // The Native Pipe Fallback MUST use the native gigabit connection.
          const subprocess = spawn(YT_DLP_PATH, [...ytdlArgs, "--socket-timeout", "15", url], { stdio: ["ignore", "pipe", "pipe"] });
          
          res.setHeader("Content-Type", "video/mp4");
          subprocess.stdout?.pipe(res);
          req.on("close", () => subprocess.kill?.("SIGTERM"));
          return;
      } catch (err: any) {
          console.error("Native pipe error:", err);
          res.status(500).end();
          return;
      }
  }

  formatNotAvailable(res, "Preview streaming unavailable right now.");
}
  export function registerDownloaderRoutes(app: Express, isAuthenticated: any): void {
// ============================================================================
// DIAGNOSTIC ENDPOINT: Test ytdl-core BotGuard Bypass on Oracle VM
// ============================================================================
app.get("/api/downloader/test-ytdl", async (req, res) => {
    try {
        // Assuming getPoToken and ytdl are imported or defined elsewhere
        const { visitorData, poToken } = await getPoToken();
        const info = await ytdl.getInfo(req.query.url as string, {
            requestOptions: {
                headers: {
                    'Cookie': `po_token=web+${poToken}; visitor_data=${visitorData}`
                }
            }
        });
        res.json({ success: true, title: info.videoDetails.title, formatsCount: info.formats.length });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

  // Info endpoint — lenient rate limit (10/min) — PUBLIC
  app.get("/api/downloader/info", infoLimiter, handleInfo);

  // Stream/download endpoint — strict rate limit (5/min) — PROTECTED
  app.get("/api/downloader/stream", isAuthenticated, streamLimiter, handleStream);

  // Proxy stream URL for preview — PROTECTED
  app.use("/api/downloader/proxy-stream", handleProxyStream);

  // P2P Tunnel pool health — PUBLIC (used by admin dashboard + monitoring)
  app.get("/api/tunnel/status", (_req, res) => {
    res.json({
      nodes: getTunnelPoolSize(),
      status: getTunnelPoolSize() > 0 ? "active" : "waiting",
    });
  });
}




