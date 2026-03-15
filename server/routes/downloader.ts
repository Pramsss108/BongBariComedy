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

const ytBin = os.platform() === "win32" ? "yt-dlp.exe" : "yt-dlp";
const YT_DLP_PATH = path.resolve(process.cwd(), "node_modules", "youtube-dl-exec", "bin", ytBin);

// Masterplan Phase 2/3: Bulletproof yt-dlp execution
// Replaces youtube-dl-exec which breaks on Windows paths with spaces
function executeYtDlp(url: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // 20MB buffer for huge json manifests
    execFile(YT_DLP_PATH, [...args, url], { maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
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
// Helpers
// ---------------------------------------------------------------------------
function formatNotAvailable(res: Response, msg: string, code = 422): void {
  res.status(code).json({ error: msg });
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
    const info = await executeYtDlp(validated.url, [
      "--dump-single-json",
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate",
      "--prefer-free-formats",
      "--youtube-skip-dash-manifest",
      "--format", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
    ]);

    // Build a clean, safe response — never send raw yt-dlp output to client
    const formats: { id: string; label: string; ext: string; height?: number }[] = [];

    // Always offer 720p mp4
    formats.push({ id: "mp4-720", label: "MP4 720p", ext: "mp4", height: 720 });
    // 1080p only if the source can serve it
    if (info.height && info.height >= 1080) {
      formats.push({ id: "mp4-1080", label: "MP4 1080p", ext: "mp4", height: 1080 });
    }
    // MP3 always available
    formats.push({ id: "mp3", label: "MP3 Audio", ext: "mp3" });

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
    console.error("[downloader/info] Error Name:", err?.name);
    console.error("[downloader/info] Error Message:", err?.message);
    if (err?.stderr) {
        console.error("[downloader/info] STDERR:", err.stderr);
    }
    console.error("=========================================================\n");
    
    formatNotAvailable(
      res,
      "Could not fetch video info. This video may be private, age-restricted, or geo-blocked.",
    );
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

  // Map our clean format IDs to yt-dlp format strings
  const formatMap: Record<string, { ytFormat: string; ext: string; isAudio: boolean }> = {
    "mp4-720": {
      ytFormat: "best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best",
      ext: "mp4",
      isAudio: false,
    },
    "mp4-1080": {
      ytFormat: "best[height<=1080][ext=mp4]/best[height<=1080]/best[ext=mp4]/best",
      ext: "mp4",
      isAudio: false,
    },
    mp3: {
      ytFormat: "bestaudio/best",
      ext: "mp3",
      isAudio: true,
    },
  };

  const chosen = formatMap[format];
  if (!chosen) {
    res.status(400).json({ error: "Invalid format. Choose mp4-720, mp4-1080, or mp3." });
    return;
  }

  // Build a safe filename from the URL
  const safeTitle = `bongbari_download_${Date.now()}`;
  const filename = `${safeTitle}.${chosen.ext}`;

  // Set download headers BEFORE streaming starts
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", chosen.isAudio ? "audio/mpeg" : "video/mp4");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering on Render

  // 5 minute timeout
  req.socket.setTimeout(300_000);

  try {
    const ytdlArgs: string[] = [
      "--format", chosen.ytFormat,
      "--no-warnings",
      "--no-call-home",
      "--no-check-certificate",
    ];

    if (chosen.isAudio) {
      ytdlArgs.push("--extract-audio", "--audio-format", "mp3", "--audio-quality", "0");
    }

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
export function registerDownloaderRoutes(app: Express): void {
  // Info endpoint — lenient rate limit (10/min)
  app.get("/api/downloader/info", infoLimiter, handleInfo);

  // Stream/download endpoint — strict rate limit (5/min)
  app.get("/api/downloader/stream", streamLimiter, handleStream);

  // Proxy stream URL for preview
  app.get("/api/downloader/proxy-stream", infoLimiter, handleProxyStream);
}
