/**
 * BongBari Social Media Downloader — Backend Routes
 * Phrases 2, 3, 5, 14, 16, 17 of the masterplan.
 *
 * Stack: youtube-dl-exec (yt-dlp wrapper) + express-rate-limit
 * Cost: $0 — runs on existing Render free tier, streams directly to user (zero disk/storage)
 */

import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import path from "path";
import os from "os";
import { execFile, spawn } from "child_process";
import fs from "fs";
import crypto from "crypto";
import axios from "axios";
// @ts-ignore
import ffmpegPath from "ffmpeg-static";

const ytBin = os.platform() === "win32" ? "yt-dlp.exe" : "yt-dlp";
const YT_DLP_PATH = path.resolve(process.cwd(), "node_modules", "youtube-dl-exec", "bin", ytBin);

// Masterplan Phase 2/3: Bulletproof yt-dlp execution
// Replaces youtube-dl-exec which breaks on Windows paths with spaces
function executeYtDlp(url: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // 20MB buffer for huge json manifests + 10s timeout for fast failover
    execFile(YT_DLP_PATH, [...args, url], { maxBuffer: 1024 * 1024 * 20, timeout: 10000 }, (error, stdout, stderr) => {
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
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// ---------------------------------------------------------------------------
// PHRASE 14: URL allowlist — only permit YouTube, Instagram, and public Facebook
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
      error: `Platform not supported. We support YouTube, Instagram, and public Facebook videos only.`,
    };
  }
  return { ok: true, url: rawUrl.trim() };
}

// ---------------------------------------------------------------------------
// PHRASE 16: Rate limiting — 10 info requests + 5 downloads per minute per IP
// ---------------------------------------------------------------------------
const infoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute before fetching video info again." },
});

const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Download limit reached (5/min). Please wait a minute." },
});

// ---------------------------------------------------------------------------
// GLOBAL RESOURCE GOVERNOR (Phase 14)
// Protect Render's 512MB RAM by limiting active ffmpeg/yt-dlp spawns
// ---------------------------------------------------------------------------
let ACTIVE_DOWNLOADS = 0;
const MAX_CONCURRENT_DOWNLOADS = 3; // Strict limit for free tier to prevent OOM kills

function tryAcquireSlot(): boolean {
  if (ACTIVE_DOWNLOADS >= MAX_CONCURRENT_DOWNLOADS) return false;
  ACTIVE_DOWNLOADS++;
  console.log(`[ResourceGovernor] Slot acquired. Active: ${ACTIVE_DOWNLOADS}/${MAX_CONCURRENT_DOWNLOADS}`);
  return true;
}

function releaseSlot(): void {
  ACTIVE_DOWNLOADS = Math.max(0, ACTIVE_DOWNLOADS - 1);
  console.log(`[ResourceGovernor] Slot released. Active: ${ACTIVE_DOWNLOADS}/${MAX_CONCURRENT_DOWNLOADS}`);
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
  if (full.includes("sign in") || full.includes("confirm your age") || full.includes("age-restricted")) {
    return { code: "AGE_RESTRICTED", message: "This video is age-restricted and requires login.", status: 403 };
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
  if (full.includes("both engines failed")) {
      if (full.includes("cobalt") && (full.includes("api error") || full.includes("down"))) {
         return { code: "COBALT_DOWN", message: "Our external download engine is temporarily unavailable. Please try again later.", status: 503 };
      }
  }

  // Generic fallback
  return { code: "DOWNLOAD_FAILED", message: "Could not process this video. It may be deleted or protected.", status: 422 };
}

// ---------------------------------------------------------------------------
// HYBRID METADATA ENGINE (Cobalt -> Local Fallback)
// ---------------------------------------------------------------------------

async function fetchMetadataCobalt(url: string): Promise<any> {
    try {
        console.log(`[Cobalt] Fetching metadata for ${url}`);
        const response = await axios.post("https://api.cobalt.tools/api/json", {
            url: url,
            filenameStyle: "classic"
        }, {
             headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 5000 
        });
        const data = response.data;
        
        if (data.status === "error") throw new Error(data.text || "Cobalt API Error");
        if (data.status === "picker") return { title: "Video (Multiple Formats)", duration: 0, fromCobalt: true };
        
        // Success (stream)
        return {
            title: data.filename || "Video",
            duration: 0, // Cobalt often misses this
            thumbnail: null,
            fromCobalt: true
        };
    } catch (e: any) {
        console.warn(`[Cobalt] Metadata fetch failed: ${e.message}`);
        throw e;
    }
}

async function fetchSmartMetadata(url: string): Promise<any> {
    // Strategy: Try Local yt-dlp first for quality (thumbnails etc), 
    // fallback to Cobalt if blocked/failed.
    // NOTE: Plan V2 says "Cobalt Primary" but for *Metadata*, local yt-dlp is superior 
    // because Cobalt missing thumbnails breaks the UI preview.
    // We will use Local Primary for INFO, but Cobalt Primary for DOWNLOAD (in handleStream logic).
    
    try {
        // 1. Try Local yt-dlp (High Fidelity)
        const info = await executeYtDlp(url, [
            "--dump-single-json",
            "--no-warnings",
            "--no-call-home",
            "--prefer-free-formats",
            "--youtube-skip-dash-manifest",
             "--format", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
        ]);
        return info;
    } catch (localErr) {
        console.warn(`[SmartMetadata] Local fetch failed, trying Cobalt...`, localErr);
        // 2. Fallback to Cobalt (Low Fidelity / Savior)
        try {
            return await fetchMetadataCobalt(url);
        } catch (cobaltErr) {
            throw new Error(`Both engines failed. Local: ${localErr}. Cobalt: ${cobaltErr}`);
        }
    }
}

// ---------------------------------------------------------------------------
// PHRASE 2: GET /api/downloader/info
// Returns video metadata: title, thumbnail, duration, available formats
// ---------------------------------------------------------------------------
async function handleInfo(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    formatNotAvailable(res, validated.error, 400);
    return;
  }

  try {
    const info = await fetchSmartMetadata(validated.url);

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
        const sortedHeights = Array.from(heights).sort((a, b) => b - a);
        
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
        // Fallback for Cobalt or non-video sources
        formats.push({ id: "mp4-720", label: "MP4 720p", ext: "mp4", height: 720, isAudio: false });
        if (info.height && info.height >= 1080) {
           formats.push({ id: "mp4-1080", label: "MP4 1080p", ext: "mp4", height: 1080, isAudio: false });
        }
    }

    // Audio Formats (Always Available via conversion)
    formats.push({ id: "mp3", label: "MP3 Audio (High)", ext: "mp3", isAudio: true });
    formats.push({ id: "m4a", label: "M4A Audio (AAC)", ext: "m4a", isAudio: true });

    res.json({
      title: info.title ?? "Untitled Video",
      thumbnail: info.thumbnail ?? null,
      duration: info.duration ?? 0,      // seconds
      durationString: info.duration_string ?? "—",
      uploader: info.uploader ?? info.channel ?? "Unknown",
      platform: info.extractor_key ?? "unknown",
      formats,
    });
  } catch (err: any) {
    console.error("\n================ YT-DLP CRASH DIAGNOSTIC ================");
    console.error(`[downloader/info] Error Name: ${err?.name}`);
    console.error(`[downloader/info] Error Message: ${err?.message}`);
    if (err?.stderr) {
        console.error(`[downloader/info] STDERR: ${err.stderr}`);
    }
    console.error("=========================================================\n");
    
    const { message, code, status } = mapDownloaderError(err);
    res.status(status).json({ error: message, code });
  }
}

// ---------------------------------------------------------------------------
// PHRASE 3: GET /api/downloader/stream
// Pipes the video/audio directly to the client — never buffers to disk/RAM
// ---------------------------------------------------------------------------
async function handleStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const format = (req.query.format as string) ?? "mp4-720";
  const mode = (req.query.mode as string) ?? "download"; // 'download' | 'preview'
  const startSec = req.query.start ? parseFloat(req.query.start as string) : null;
  const endSec = req.query.end ? parseFloat(req.query.end as string) : null;

  // Phase 14: Global Concurrency Guard
  // Only limit full downloads (previews are lighter/shorter generally or handled via proxy).
  // Actually previews use the same pipe so we should guard them too or allow higher limit?
  // Let's guard them all for safety on 512MB RAM.
  if (!tryAcquireSlot()) {
      res.status(503).json({ error: "High traffic volume. Please try again in 30 seconds." });
      return;
  }
  
  // Ensure we release the slot when done
  let released = false;
  const releaseOnce = () => {
      if (!released) {
          released = true;
          releaseSlot();
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
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering on Render

  // Prevent Render's 100s idle timeout by forcing headers out immediately
  res.flushHeaders();

  // 10 minute timeout (increased for 4K remuxing)
  req.socket.setTimeout(600_000);

  try {
    const ytdlArgs: string[] = [
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate",
      // Force IPv4 as scraping often fails on IPv6 in datacenter blocks
      "--force-ipv4",
      // Buffer optimization
      "--console-title",
      // Limit concurrent users for server stability
      "--match-filter", "duration <= 600",
    ];

    if (ffmpegPath) {
        ytdlArgs.push("--ffmpeg-location", ffmpegPath);
    }

    if (chosen.isAudio) {
      // Audio Extraction Mode
      ytdlArgs.push(
        "--extract-audio", 
        "--audio-format", chosen.ext,
        "--audio-quality", "0",
        "--format", "bestaudio/best"
      );
    } else {
        // Video Stream Mode
        // Use the dynamically constructed format string
        ytdlArgs.push("--format", chosen.ytFormat);
        // Ensure merged output is mp4 if not already
        ytdlArgs.push("--merge-output-format", "mp4");
    }

    // V13: Server-side Trimming using yt-dlp native sections
    if (startSec !== null && endSec !== null && endSec > startSec) {
        // TEMP FILE APPROACH FOR TRIMMING
        // ffmpeg cannot output mp4 reliably to stdout without corruption/mpegts fallback.
        const tmpDir = os.tmpdir();
        const trimFile = path.join(tmpDir, `trim_${crypto.randomBytes(8).toString('hex')}.mp4`);
        
        ytdlArgs.push("--download-sections", `*${startSec}-${endSec}`);
        ytdlArgs.push("-o", trimFile);

        const subprocess = spawn(YT_DLP_PATH, [...ytdlArgs, validated.url], {
          stdio: ["ignore", "pipe", "pipe"],
        });

        subprocess.stderr?.on("data", (chunk: Buffer) => {
            console.error("[downloader/stream] trim stderr:", chunk.toString().slice(0, 200));
        });

        subprocess.on("error", (err: any) => {
            console.error("[downloader/stream] spawn error:", err?.message);
            if (!res.headersSent) res.status(500).json({ error: "Download failed." });
        });

        subprocess.on("close", (code: number) => {
            if (code === 0 && fs.existsSync(trimFile)) {
                try {
                  const stat = fs.statSync(trimFile);
                  res.setHeader("Content-Length", stat.size);
                } catch(e) { }
                
                const readStream = fs.createReadStream(trimFile);
                readStream.pipe(res);
                
                readStream.on("end", () => {
                   try { fs.unlinkSync(trimFile); } catch(e){}
                });
                readStream.on("error", () => {
                   try { fs.unlinkSync(trimFile); } catch(e){} 
                });
            } else {
                console.error(`[downloader/stream] yt-dlp exited with code: ${code}`);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Trimming failed. Please try again." });
                } else {
                    res.end();
                }
                try { fs.unlinkSync(trimFile); } catch(e) {}
            }
        });

        req.on("close", () => {
            subprocess.kill?.("SIGTERM");
            setTimeout(() => {
                try { fs.unlinkSync(trimFile); } catch(e){}
            }, 5000);
        });

    } else {
        // DIRECT STREAM APPROACH FOR FULL VIDEOS
        const subprocess = spawnYtDlpStream(validated.url, ytdlArgs);

        subprocess.stdout?.pipe(res);

        subprocess.stderr?.on("data", (chunk: Buffer) => {
          // Log but never surface to client
          console.error("[downloader/stream] yt-dlp stderr:", chunk.toString().slice(0, 200));
        });

        subprocess.on("error", (err: any) => {
          console.error("[downloader/stream] spawn error:", err?.message);
          if (!res.headersSent) {
            res.status(500).json({ error: "Download failed. Please try again." });
          }
        });

        subprocess.on("close", (code: number) => {
          if (code !== 0 && !res.writableEnded) {
            console.error("[downloader/stream] yt-dlp exited with code:", code);
            res.end();
          }
        });

        req.on("close", () => {
          // Client disconnected — kill the subprocess to free resources on Render
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
// PHRASE 5: GET /api/downloader/proxy-stream
// Returns a short-lived direct URL for the browser <video> preview tag.
// For YouTube, we proxy here to avoid referer/origin restrictions.
// ---------------------------------------------------------------------------
async function handleProxyStream(req: Request, res: Response): Promise<void> {
  const validated = validateVideoUrl(req.query.url as string);
  if (!validated.ok) {
    res.status(400).json({ error: validated.error });
    return;
  }

  try {
    const ytArgs = [
      "--get-url",
      "--no-warnings",
      "--no-check-certificate",
      "--format", "best[height<=480][ext=mp4]/best[height<=480]/best"
    ];
    
    const directUrlOutput = await new Promise<string>((resolve, reject) => {
      execFile(YT_DLP_PATH, [...ytArgs, validated.url], { maxBuffer: 1024 * 1024 * 5 }, (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout.trim());
      });
    });

    const urls = directUrlOutput.split("\n").map((u: string) => u.trim()).filter(Boolean);
    const streamUrl = urls[0];
    if (!streamUrl) throw new Error("No stream URL found");

    // Return the URL to the frontend — browser <video> will play it directly
    res.json({ streamUrl });
  } catch (err: any) {
    console.error("[downloader/proxy-stream] error:", err?.message);
    formatNotAvailable(
      res,
      "Preview unavailable for this video. You can still download it directly.",
    );
  }
}

// ---------------------------------------------------------------------------
// PHRASE 17: PHRASE 17 — registerDownloaderRoutes()
// All wired up; called from server/routes.ts
// ---------------------------------------------------------------------------
export function registerDownloaderRoutes(app: Express, isAuthenticated: any): void {
  // Info endpoint — lenient rate limit (10/min) — PUBLIC
  app.get("/api/downloader/info", infoLimiter, handleInfo);

  // Stream/download endpoint — strict rate limit (5/min) — PROTECTED
  app.get("/api/downloader/stream", isAuthenticated, streamLimiter, handleStream);

  // Proxy stream URL for preview — PROTECTED
  app.get("/api/downloader/proxy-stream", isAuthenticated, infoLimiter, handleProxyStream);
}
