/**
 * SocialDownloaderPage.tsx — Redesigned from Stitch MCP import
 * (project/15186276301225783934, screen/3d6883fccc5242d2a2ad40fe0688a9a2)
 *
 * Mobile-first, no menu/nav collision, Space Grotesk typography,
 * purple→cyan gradient hero, inline fetch button, large preview card.
 */

import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Play, Scissors, Youtube, Instagram, Facebook,
  Loader2, AlertCircle, Music, Film, CheckCircle2, Search, X,
} from "lucide-react";
import { TrimSlider } from "@/components/TrimSlider";
import {
  canRunFfmpeg, trimMedia, formatTime, loadFfmpeg,
} from "@/lib/ffmpeg-trim-engine";
import "./SocialDownloaderPage.css";

// ── API Base ─────────────────────────────────────────────────────
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (window.location.hostname === "localhost" ? "http://localhost:5000" : "https://bongbaricomedy.onrender.com");

function apiUrl(p: string) { return `${API_BASE}${p}`; }

// ── Types ────────────────────────────────────────────────────────
interface VideoFormat { id: string; label: string; ext: string; height?: number; }
interface VideoInfo {
  title: string; thumbnail: string | null; duration: number;
  durationString: string; uploader: string; platform: string; formats: VideoFormat[];
}
type Phase = "idle" | "fetching" | "ready" | "downloading" | "trimming" | "error";

function detectPlatform(url: string): "youtube" | "instagram" | "facebook" | null {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(url)) return "facebook";
  return null;
}

// ── Main Page ────────────────────────────────────────────────────
export default function SocialDownloaderPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("mp4-720");
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [trimMode, setTrimMode] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [trimProgress, setTrimProgress] = useState(0);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const platform = detectPlatform(url);

  // ── Fetch info ─────────────────────────────────────────────────
  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    console.log(`\n[Vibe Coder Tracker] 🔎 STEP 1: Fetching video metadata...`);
    console.log(`[Vibe Coder Tracker] 📝 Note: Metadata (titles/thumbnails) is tiny (2KB). Safe to use Render!`);
    setPhase("fetching"); setErrorMsg(""); setVideoInfo(null);
    setShowPreview(false); setPreviewUrl(""); setTrimMode(false);
    const wakeTimer = setTimeout(() => setServerWaking(true), 4000);
    try {
      const res = await fetch(apiUrl(`/api/downloader/info?url=${encodeURIComponent(url.trim())}`));
      clearTimeout(wakeTimer); setServerWaking(false);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Could not fetch video info.");
      
      console.log(`[Vibe Coder Tracker] ✅ Metadata fetch success! Phase 1 complete.`);
      setVideoInfo(data);
      setSelectedFormat(data.formats[0]?.id ?? "mp4-720");
      setStartTime(0); setEndTime(Math.floor(data.duration)); setPhase("ready");
      try { (window as any).gtag?.("event", "downloader_fetch", { platform: data.platform ?? "unknown" }); } catch {}
    } catch (err: any) {
      clearTimeout(wakeTimer); setServerWaking(false);
      setErrorMsg(err.message ?? "Failed to fetch video info."); setPhase("error");
    }
  }, [url]);

  // ── Download ───────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!videoInfo) return;

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to download videos. This protects our free service from bots.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    setPhase("downloading"); setDownloadProgress(0);
    console.log(`\n[Vibe Coder Tracker] 🎥 STEP 2: USER INITIATED FULL DOWNLOAD!`);
    console.log(`[Vibe Coder Tracker] 🛡️ Initializing Ambuja Cement Architecture (Render Fallback)...`);
    
    try {
      try { (window as any).gtag?.("event", "downloader_download", { format: selectedFormat }); } catch {}

      // Fallback to our own proven Render yt-dlp backend
      // Protected by auth
      const backendUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=${selectedFormat}`);
      window.location.href = backendUrl;
      
      setPhase("ready");
    } catch(e: any) { 
      setErrorMsg(e.message || "Download failed."); 
      setPhase("error");
    }
  }, [videoInfo, url, selectedFormat, isAuthenticated, setLocation]);

  // ── Preview ────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    setShowPreview(!showPreview);
    if (!showPreview && !previewUrl) {
      try {
        const res = await fetch(apiUrl(`/api/downloader/proxy-stream?url=${encodeURIComponent(url)}`));
        const data = await res.json();
        if (data.streamUrl) setPreviewUrl(data.streamUrl);
      } catch {}
    }
  }, [showPreview, previewUrl, url]);

  // ── Trim ───────────────────────────────────────────────────────
  const handleTrim = useCallback(async () => {
    if (!videoInfo) return;

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to trim and download videos. This protects our free service from bots.",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    if (!canRunFfmpeg()) { setErrorMsg("Your device doesn't have enough memory for browser trimming."); return; }
    setPhase("trimming"); setTrimProgress(0); setFfmpegLoading(true);
    try {
      try { (window as any).gtag?.("event", "downloader_trim", { duration_seconds: endTime - startTime }); } catch {}
      const dlRes = await fetch(apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=mp4-720`));
      if (!dlRes.ok) throw new Error("Could not download video for trimming.");
      const videoBlob = await dlRes.blob();
      setFfmpegLoading(false);
      const trimmed = await trimMedia({
        videoBlob, startSec: startTime, endSec: endTime,
        outputExt: selectedFormat === "mp3" ? "mp3" : "mp4",
        onProgress: (ratio) => setTrimProgress(Math.round(ratio * 100)),
      });
      const ext = selectedFormat === "mp3" ? "mp3" : "mp4";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(trimmed);
      a.download = `bongbari_trimmed_${formatTime(startTime)}-${formatTime(endTime)}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setPhase("ready");
    } catch (err: any) {
      setFfmpegLoading(false);
      setErrorMsg(err.message ?? "Trimming failed."); setPhase("error");
    }
  }, [videoInfo, url, startTime, endTime, selectedFormat]);

  const isWorking = phase === "fetching" || phase === "downloading" || phase === "trimming";

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <title>Free Video Downloader — YouTube, Instagram, Facebook | BongBari Tools</title>
      <meta name="description" content="Download YouTube, Instagram and Facebook public videos for free. Preview, trim in-browser, and save as MP4 or MP3. No account needed." />

      <div className="dl-page font-serif">
        <header className="dl-main-header">
          <Link href="/tools">
            <button className="dl-back-btn group">
              <span className="group-hover:-translate-x-0.5 transition-transform text-xs">←</span>
              <span className="hidden md:inline font-tech text-[9px] uppercase tracking-wider">Tools</span>
            </button>
          </Link>

          <div className="dl-header-title">
            <span className="dl-brand-italic">BongBari</span>
            <div className="dl-tool-info">
              <span className="dl-tool-name">Downloader</span>
              <span className="dl-version-badge">V12</span>
            </div>
          </div>

          <div className="dl-header-right">
            <div className="dl-mode-pill">
              <span className="dl-mode-icon">🚀</span>
              <span className="hidden sm:inline ml-1">Cloud</span>
            </div>
          </div>
        </header>

        {/* Background glow orbs */}
        <div className="dl-bg-orb dl-bg-orb--purple" />
        <div className="dl-bg-orb dl-bg-orb--cyan" />

        <div className="dl-wrap">
          {/* ── HERO ─────────────────────────────────────────── */}
          <header className="dl-hero">
            <h1 className="dl-hero__title">
              <span className="dl-hero__gradient">BongBari</span> Downloader
            </h1>
            <p className="dl-hero__sub">
              The ultimate video processing suite for Bengali content creators. Save, trim,
              and remix your favorite comedy moments instantly.
            </p>

            {/* Platform pills */}
            <div className="dl-platforms">
              <span className={`dl-platform-pill ${platform === "youtube" ? "dl-platform-pill--active" : ""}`}>
                <Youtube size={14} /> YouTube
              </span>
              <span className={`dl-platform-pill ${platform === "instagram" ? "dl-platform-pill--active" : ""}`}>
                <Instagram size={14} /> Instagram
              </span>
              <span className={`dl-platform-pill ${platform === "facebook" ? "dl-platform-pill--active" : ""}`}>
                <Facebook size={14} /> Facebook
              </span>
            </div>
          </header>

          {/* ── URL INPUT CARD ────────────────────────────────── */}
          <div className="dl-input-card">
            <div className="dl-input-row">
              <input
                id="downloader-url-input"
                type="url"
                className="dl-url-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); if (phase === "error") { setPhase("idle"); setErrorMsg(""); } }}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                disabled={isWorking}
              />
              <button
                id="downloader-fetch-btn"
                className="dl-fetch-btn"
                onClick={handleFetch}
                disabled={!url.trim() || isWorking}
              >
                {phase === "fetching" ? (
                  <Loader2 size={18} className="dl-spin" />
                ) : (
                  <><Search size={16} /> Fetch Video</>
                )}
              </button>
            </div>

            {serverWaking && (
              <div className="dl-wake-notice">
                <Loader2 size={14} className="dl-spin" />
                Server waking up (free tier ~15s). Please wait…
              </div>
            )}
            <p className="dl-disclaimer">Public videos only · Respect copyright · yt-dlp powered</p>
          </div>

          {/* ── ERROR ──────────────────────────────────────────── */}
          {phase === "error" && errorMsg && (
            <div className="dl-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
              <button onClick={() => { setPhase("idle"); setErrorMsg(""); }} className="dl-error__close"><X size={14} /></button>
            </div>
          )}

          {/* ── VIDEO RESULT CARD ─────────────────────────────── */}
          {videoInfo && (phase === "ready" || phase === "downloading" || phase === "trimming") && (
            <div className="dl-result-card dl-slide-up">
              {/* Thumbnail section */}
              <div className="dl-thumb-wrap" onClick={handlePreview}>
                {videoInfo.thumbnail ? (
                  <img src={videoInfo.thumbnail} alt={videoInfo.title} className="dl-thumb" />
                ) : (
                  <div className="dl-thumb dl-thumb--empty"><Film size={48} /></div>
                )}
                <div className="dl-thumb-overlay">
                  <div className="dl-play-circle"><Play size={28} fill="#fff" /></div>
                </div>
                <span className="dl-duration-badge">{videoInfo.durationString}</span>
              </div>

              {/* Video meta */}
              <div className="dl-meta">
                <h2 className="dl-video-title">{videoInfo.title}</h2>
                <p className="dl-uploader">@{videoInfo.uploader}</p>

                {/* Format pills */}
                <div className="dl-format-row">
                  {videoInfo.formats.map((f) => (
                    <button
                      key={f.id}
                      className={`dl-format-pill ${selectedFormat === f.id ? "dl-format-pill--on" : ""}`}
                      onClick={() => setSelectedFormat(f.id)}
                      disabled={phase !== "ready"}
                    >
                      {f.ext === "mp3" ? <Music size={12} /> : <Film size={12} />}
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Action bar */}
                <div className="dl-actions">
                  <button className="dl-btn dl-btn--download" onClick={handleDownload} disabled={phase !== "ready"}>
                    {phase === "downloading" ? (
                      <><Loader2 size={16} className="dl-spin" /> {downloadProgress > 0 ? `${downloadProgress}%` : "Starting…"}</>
                    ) : (
                      <><Download size={16} /> Download {selectedFormat === "mp3" ? "Audio" : "Full"}</>
                    )}
                  </button>
                  <button
                    className={`dl-btn dl-btn--trim ${trimMode ? "dl-btn--trim-active" : ""}`}
                    onClick={() => setTrimMode(!trimMode)}
                    disabled={phase !== "ready"}
                  >
                    <Scissors size={14} /> {trimMode ? "Cancel" : "Trim First"}
                  </button>
                </div>

                {/* Progress */}
                {phase === "downloading" && downloadProgress > 0 && (
                  <div className="dl-progress">
                    <div className="dl-progress__track">
                      <div className="dl-progress__fill" style={{ width: `${downloadProgress}%` }} />
                    </div>
                    <span className="dl-progress__label">{downloadProgress}% · Don't close this tab</span>
                  </div>
                )}
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="dl-preview dl-slide-up">
                  {previewUrl ? (
                    <video ref={videoRef} src={previewUrl} controls className="dl-preview__video" preload="metadata" />
                  ) : (
                    <div className="dl-preview__empty">
                      <AlertCircle size={18} /> Preview unavailable. You can still download.
                    </div>
                  )}
                </div>
              )}

              {/* ── TRIM PANEL ─────────────────────────────────── */}
              {trimMode && videoInfo.duration > 0 && (
                <div className="dl-trim-panel dl-slide-up">
                  <div className="dl-trim-panel__head">
                    <Scissors size={16} />
                    <span>Precision Trimmer</span>
                    <span className="dl-trim-panel__badge">100% In-Browser</span>
                  </div>

                  <TrimSlider
                    duration={videoInfo.duration}
                    startTime={startTime} endTime={endTime}
                    onStartChange={setStartTime} onEndChange={setEndTime}
                  />

                  <button className="dl-btn dl-btn--trim-go" onClick={handleTrim} disabled={phase !== "ready" || endTime <= startTime}>
                    {phase === "trimming" ? (
                      ffmpegLoading ? (
                        <><Loader2 size={14} className="dl-spin" /> Loading Trim Engine…</>
                      ) : (
                        <><Loader2 size={14} className="dl-spin" /> Trimming… {trimProgress}%</>
                      )
                    ) : (
                      <><Scissors size={14} /> Trim &amp; Download ({formatTime(startTime)} → {formatTime(endTime)})</>
                    )}
                  </button>

                  <p className="dl-trim-notice">⚡ No file is uploaded. Trimming happens in your browser via WebAssembly.</p>

                  {!canRunFfmpeg() && (
                    <div className="dl-device-warn">
                      <AlertCircle size={14} /> Low device memory — download the full video and trim locally instead.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CROSS-PLATFORM SUPPORT ────────────────────────── */}
          <section className="dl-platforms-grid">
            <h3 className="dl-platforms-grid__title">Cross-Platform Support</h3>
            <div className="dl-platforms-cards">
              {[
                { icon: <Youtube size={28} />, name: "YouTube", desc: "Download Shorts, Videos, and Audio in high resolution.", color: "dl-cp--yt" },
                { icon: <Instagram size={28} />, name: "Instagram", desc: "Extract Reels and IGTV content with zero loss in quality.", color: "dl-cp--ig" },
                { icon: <Facebook size={28} />, name: "Facebook", desc: "High-speed fetching for public FB videos and story clips.", color: "dl-cp--fb" },
              ].map((p) => (
                <div className={`dl-cp-card ${p.color}`} key={p.name}>
                  <div className="dl-cp-card__icon">{p.icon}</div>
                  <h4 className="dl-cp-card__name">{p.name}</h4>
                  <p className="dl-cp-card__desc">{p.desc}</p>
                  <span className="dl-cp-card__badge"><CheckCircle2 size={12} /> Supported</span>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="dl-footer">
            © 2024 BongBari Media Group. Made for the Bong Community.
          </footer>
        </div>
      </div>
    </>
  );
}
