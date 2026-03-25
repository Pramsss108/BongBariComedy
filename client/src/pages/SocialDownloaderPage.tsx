/**
 * SocialDownloaderPage.tsx — Redesigned from Stitch MCP import
 * (project/15186276301225783934, screen/3d6883fccc5242d2a2ad40fe0688a9a2)
 *
 * Mobile-first, no menu/nav collision, Space Grotesk typography,
 * purple→cyan gradient hero, inline fetch button, large preview card.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Play, Pause, ArrowLeft, Scissors, Youtube, Instagram, Facebook,
  Loader2, AlertCircle, Music, Film, CheckCircle2, Search, X, Clock,
  Lock, CloudOff, Hourglass, HelpCircle, Volume2, VolumeX, ShieldCheck,
} from "lucide-react";
import { TrimSlider } from "@/components/TrimSlider";

import { DownloadHistory, saveToHistory } from "@/components/DownloadHistory";

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10); // get deciseconds (1 digit)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
}

import { buildApiUrl } from "@/lib/queryClient";
import "./SocialDownloaderPage.css";

const apiUrl = buildApiUrl;

// Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
interface VideoFormat { id: string; label: string; ext: string; height?: number; }
interface VideoInfo {
  engine?: string; // e.g. "Layer 1 (Hetzner VPS)", "Layer 2 (Ghost Mirror)"
  previewUrl?: string | null;
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

function proxyImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    return `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Native File Save API Helper Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function performSecureDownload(
  downloadUrl: string,
  fallbackName: string,
  onProgress: (p: number) => void
): Promise<void> {
  console.log(`[Vibe Coder Tracker] 🚀 Fetching file securely via Stream API...`);
  
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `Server returned ${response.status}: ${response.statusText}`;
    try {
      const j = JSON.parse(errText);
      if (j.error) errMsg = j.error;
    } catch (e) {}
    throw new Error(errMsg);
  }

  // Parse Headers
  const contentLengthHeader = response.headers.get('Content-Length');
  const contentDisposition = response.headers.get('Content-Disposition');
  const contentType = response.headers.get('Content-Type') || 'video/mp4';
  
  let filename = fallbackName;
  if (contentDisposition && contentDisposition.includes('filename=')) {
    const matches = /filename="([^"]+)"/.exec(contentDisposition);
    if (matches && matches[1]) filename = matches[1];
  }

  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  
  let blob: Blob;

  // Stream reader for progress
  if (response.body && totalBytes > 0) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress(Math.round((received / totalBytes) * 100));
      }
    }
    blob = new Blob(chunks as any[], { type: contentType });
  } else {
    // Indeterminate full download
    onProgress(50);
    blob = await response.blob();
    onProgress(100);
  }

  console.log(`[Vibe Coder Tracker] ✅ Stream loaded (Size: ${(blob.size/1024/1024).toFixed(2)} MB). Prompting Save As...`);

  // Try File System Access API (Native Windows "Save As")
  if ('showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop() || (contentType.includes('audio') ? 'mp3' : 'mp4');
      const description = contentType.includes('audio') ? 'Audio File' : 'Video File';
      
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: description,
          accept: { [contentType]: [`.${ext}`] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Success!
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User cancelled the popup
      console.warn('[Vibe Coder] Native picker failed, using fallback <a> link.', err);
    }
  }

  // Fallback: Silent download via blob URL
  const urlObj = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlObj;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(urlObj), 10000);
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main Page Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export default function SocialDownloaderPage() {
  const { user, isAuthenticated, sessionId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [forceEngine, setForceEngine] = useState<string>("auto");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState(""); // Phase 13: Technical error mapping (e.g. COBALT_DOWN, RATE_LIMIT)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("mp4-720");
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [formatTab, setFormatTab] = useState<"video" | "audio">("video");
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [trimMode, setTrimMode] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Default to unmuted, handle autoplay rejection cleanly
  const [isCaching, setIsCaching] = useState(false); // CapCut: Block 1 Cache state
  const [cacheProgress, setCacheProgress] = useState(0); // CapCut: Block 1 Cache progress
  const [isScrubbing, setIsScrubbing] = useState(false); // Phase 1: Intent-based UI state
  const [trimProgress, setTrimProgress] = useState<number | string>(0);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ step: number, msg: string, pct: number } | null>(null);
  const [serverWaking, setServerWaking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | string>(0);
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
  const [showShortcuts, setShowShortcuts] = useState(false); // Phase 13: Floating Shortcuts UI
  const videoRef = useRef<HTMLVideoElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // CapCut Pro Controls: Keyboard Shortcuts globally bound to Trimming Context
  useEffect(() => {
    if (!trimMode || !videoRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const video = videoRef.current;
      if (!video) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) {
          if (video.currentTime < startTime || video.currentTime >= endTime) {
             video.currentTime = startTime;
          }
          video.play().catch(console.error);
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        // Jog 0.1s back
        video.currentTime = Math.max(startTime, video.currentTime - 0.1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        // Jog 0.1s forward
        video.currentTime = Math.min(endTime, video.currentTime + 0.1);
      } else if (e.key.toLowerCase() === "i" || e.key === "[") {
        e.preventDefault();
        setStartTime(video.currentTime);
      } else if (e.key.toLowerCase() === "o" || e.key === "]") {
        e.preventDefault();
        setEndTime(video.currentTime);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        // Smart Mark: If closer to start, move start. If closer to end, move end.
        const midPoint = (startTime + endTime) / 2;
        if (video.currentTime < midPoint) {
            setStartTime(video.currentTime);
        } else {
            setEndTime(video.currentTime);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trimMode, startTime, endTime]);

  const platform = detectPlatform(url);
  const isVertical = url.toLowerCase().includes("/shorts/") || url.toLowerCase().includes("/reel/") || url.toLowerCase().includes("/reels/");
  // Ã¢â€â‚¬Ã¢â€â‚¬ Fetch info Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    console.log(`\n[Vibe Coder Tracker] Ã°Å¸â€Å½ STEP 1: Fetching video metadata...`);
    console.log(`[Vibe Coder Tracker] 📝 Note: Metadata (titles/thumbnails) is tiny (2KB). Safe to use Render!`);
    setPhase("fetching"); setErrorMsg(""); setErrorCode(""); setVideoInfo(null);
    setShowPreview(false); setPreviewUrl(""); setTrimMode(false);
    
    // Smooth deterministic live progress simulation to improve UX during proxy latency
    let progressInterval: number;
    let progress = 0;
    setExtractProgress({ step: 1, msg: "Analyzing media URL...", pct: 5 });

    const extractionSteps = [
        { threshold: 0, msg: "Analyzing media URL..." },
        { threshold: 20, msg: "Bypassing AS/BotGuard Flags..." },
        { threshold: 45, msg: "Negotiating Request Headers..." },
        { threshold: 75, msg: "Resolving Media Formats..." }
    ];

    progressInterval = window.setInterval(() => {
        progress += Math.floor(Math.random() * 8) + 2; // jump 2-9% each step
        if (progress > 95) progress = 95; // cap at 95% until actually done
        
        let currentMsg = extractionSteps[0].msg;
        for (let i = extractionSteps.length - 1; i >= 0; i--) {
            if (progress >= extractionSteps[i].threshold) {
                currentMsg = extractionSteps[i].msg;
                break;
            }
        }
        setExtractProgress({ step: 1, msg: currentMsg, pct: progress });
    }, 400);

    try {
      // 60 seconds timeout to allow all proxy rotations/fallbacks
      abortRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 60000);

      const res = await fetch(apiUrl(`/api/downloader/info?url=${encodeURIComponent(url.trim())}${forceEngine !== 'auto' ? `&forceEngine=${forceEngine}` : ''}`), {
          signal: abortRef.current.signal
      });
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      setExtractProgress(null);
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
         const error = new Error(data.error || "Could not fetch video info.") as any;
         error.code = data.code;
         throw error;
      }
      
      console.log(`[Vibe Coder Tracker] ✅ Metadata fetch success! Phase 1 complete.`);
      setVideoInfo(data);
      setSelectedFormat(data.formats[0]?.id ?? "mp4-720");
      setStartTime(0); 
      setEndTime(Math.floor(data.duration)); 
      setActualDuration(Math.floor(data.duration));
      setPhase("ready");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      try { (window as any).gtag?.("event", "downloader_fetch", { platform: data.platform ?? "unknown" }); } catch {}
    } catch (err: any) {
      clearInterval(progressInterval);
      setExtractProgress(null);
      setPhase("error");
      if (err.name === 'AbortError') {
          setErrorMsg("Extraction timed out. Rotating IPs or platform blocking. Please try again to trigger a new IP.");
          setErrorCode("TIMEOUT");
      } else {
          setErrorMsg(err.message || 'Extraction failed');
          setErrorCode(err.code || "UNKNOWN");
      }
    }
  }, [url]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Download Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleDownload = useCallback(async () => {
    if (!videoInfo) return;

    setPhase("downloading"); setDownloadProgress(0);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    console.log(`\n[Vibe Coder Tracker] 🎬 STEP 2: USER INITIATED FULL DOWNLOAD!`);
    console.log(`[Vibe Coder Tracker] 🛡️ Initializing Ambuja Cement Architecture (Render Fallback)...`);
    
    try {
      try { (window as any).gtag?.("event", "downloader_download", { format: selectedFormat }); } catch {}

      // Protected by auth - Phase 15: Attach sessionId to query param for browser nav
      const safeTitle = videoInfo?.title ? videoInfo.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50) : "bongbari_download";
      const encodedTitle = encodeURIComponent(safeTitle);
      const backendUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=${selectedFormat}&title=${encodedTitle}&sessionId=${sessionId}${forceEngine !== 'auto' ? `&forceEngine=${forceEngine}` : ''}`);

        // PHASE 3: Native Browser Download + Raw CDN (0% Server Load)
        // By bypassing 'fetch' and Blob creation, we avoid CORS from Google's CDNs
        // AND we save giant amounts of RAM since the browser download manager handles saving directly to disk.
        const a = document.createElement('a');
        a.href = backendUrl;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress(100);
        setTimeout(() => setPhase("ready"), 1500);

      saveToHistory({
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail || "",
        url: url,
        type: "video"
      });

      setPhase("ready");
    } catch(e: any) {
      setErrorMsg(e.message || "Download failed."); 
      setPhase("error");
    }
  }, [videoInfo, url, selectedFormat, isAuthenticated, setLocation]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ CapCut Block 1: Blob Caching Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  
  // Phase 19: Cache Cleanup Protocol
  useEffect(() => {
    // When the component unmounts, or when we are fetching a NEW video (which clears previewUrl), 
    // we must destroy the old Blob from RAM to prevent leaks.
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  // Phase 6/7: Advanced GPU Loop for Video Looping Constraints (0-latency boundary checks)
  useEffect(() => {
    if (!trimMode || !videoRef.current || !isPlaying) return;
    let rafId: number;
    const enforceLoopBounds = () => {
      const vid = videoRef.current;
      // Use !isScrubbing to ensure we don't snap the playhead if the user is dragging the trim handles
      if (vid && !isScrubbing) {
        // Only enforce the END boundary so users can preview the lead-up to the cut by playing from before the start point
        if (vid.currentTime >= endTime) {
           vid.currentTime = startTime;
        }
      }
      rafId = requestAnimationFrame(enforceLoopBounds);
    };
    rafId = requestAnimationFrame(enforceLoopBounds);
    return () => cancelAnimationFrame(rafId);
  }, [trimMode, startTime, endTime, isPlaying, isScrubbing]);
  const loadVideoToCache = useCallback(async (enterTrimMode = false) => {
    // If entering Trim Mode, we strictly need a local Blob cache to ensure 0ms seek latency.
    if (enterTrimMode) {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        setShowPreview(true);
        if (!trimMode) setTrimMode(true);
        return;
      }
    } else {
      // Normal Play Preview (doesn't need Blob, can play directly from stream)
      if (previewUrl) {
        setShowPreview(true);
        return;
      }
    }

    try {
      // V16 PROVEN METHOD: All URLs go through proxy-stream, which routes
      // YouTube through the Hetzner VPS (clean IP) for instant CDN resolution.
      // No iframes, no HEAD checks â€” just mount the <video> element directly.
      setIsCaching(true);
      setCacheProgress(30);
      // Phase 3: Use direct CDN URL if available (bypasses Render entirely!)
      const autoProxyUrl = videoInfo?.previewUrl 
        ? videoInfo.previewUrl 
        : apiUrl(`/api/downloader/proxy-stream?url=${encodeURIComponent(url)}&format=mp4-480&mode=stream&sessionId=${sessionId||""}${forceEngine !== "auto" ? `&forceEngine=${forceEngine}` : ""}`);
      setCacheProgress(100);
      setPreviewUrl(autoProxyUrl);
      setShowPreview(true);
      if (enterTrimMode && !trimMode) setTrimMode(true);
    } catch (err: any) {
        toast({ title: "Preview Error", description: err.message, variant: "destructive" });
    } finally {
      setIsCaching(false);
      setCacheProgress(100);
    }
  }, [url, isAuthenticated, sessionId, previewUrl, trimMode, toast, setLocation, videoInfo]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Preview Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handlePreview = useCallback(() => {
    if (!showPreview) {
       loadVideoToCache(false);
    } else {
       setShowPreview(false);
    }
  }, [showPreview, loadVideoToCache]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Trim (Powered by super fast yt-dlp section download backend) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleTrim = useCallback(async () => {
    if (!videoInfo) return;

    setPhase("trimming"); setTrimProgress(0);
      let simInterval: number | undefined = undefined;
      try {
        let simProgress = 0;
        simInterval = window.setInterval(() => {
            simProgress += Math.floor(Math.random() * 4) + 1;
            if (simProgress > 95) simProgress = 95;
            setTrimProgress(`Server Processing... ${simProgress}%`);
        }, 1200);

        try { (window as any).gtag?.("event", "downloader_trim", { duration_seconds: endTime - startTime }); } catch {}

        const safeTitle = videoInfo?.title ? videoInfo.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50) : "bongbari_download";
        const trimName = `${safeTitle}_clip_${startTime.toFixed(2)}s_to_${endTime.toFixed(2)}s`;
        const encodedTitle = encodeURIComponent(trimName);

        const backendTrimUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=${selectedFormat}&title=${encodedTitle}&start=${startTime}&end=${endTime}&sessionId=${sessionId}${forceEngine !== 'auto' ? `&forceEngine=${forceEngine}` : ''}`);

        // Perform secure streaming fetch + Native 'Save As' Dialog Tracker
        await performSecureDownload(backendTrimUrl, `${trimName}.mp4`, (realPct) => {
            window.clearInterval(simInterval);
            setTrimProgress(`Downloading... ${realPct}%`);
        });

        saveToHistory({
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail || "",
          url: url,
          type: "trim"
        });

        setPhase("ready");

      } catch (err: any) {
        setErrorMsg(err.message ?? "Trimming failed."); setPhase("error");
      } finally {
        if (simInterval) window.clearInterval(simInterval);
      }
    }, [videoInfo, url, startTime, endTime, selectedFormat, sessionId, isAuthenticated, setLocation]);

    const isWorking = phase === "fetching" || phase === "downloading" || phase === "trimming";


  // Ã¢â€â‚¬Ã¢â€â‚¬ RENDER Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  return (
    <>
      <title>Free Video Downloader — YouTube, Instagram, Facebook | BongBari Tools</title>
      <meta name="description" content="Download YouTube, Instagram and Facebook public videos for free. Preview, trim in-browser, and save as MP4 or MP3. No account needed." />

      <div className="dl-page font-serif md:h-screen md:overflow-hidden md:flex md:flex-col">
        {/* Check SocialDownloaderPage.css for mobile-first styles, we add md: overrides here */}
        
        <header className="dl-main-header shrink-0">
          <Link href="/tools">
            <button className="dl-back-btn group">
              <span className="group-hover:-translate-x-0.5 transition-transform text-xs">←</span>
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

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ DESKTOP: SPLIT VIEW LAYOUT (md:flex) Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="md:flex md:flex-1 md:overflow-hidden relative z-10 w-full max-w-[1600px] mx-auto">
          
          {/* LEFT PANEL: VISUALS (Hero / Video Preview) */}
          <div className="hidden md:flex md:w-[55%] lg:w-[60%] flex-col justify-center items-center p-8 border-r border-white/5 bg-black/20 backdrop-blur-sm relative overflow-hidden">
            
            {/* If video loaded: Show Big Preview */}
            {videoInfo ? (
               <div className={`w-full animate-in fade-in zoom-in duration-500 ${isVertical ? "max-w-[320px] mx-auto flex flex-col items-center" : "max-w-2xl"}`}>
                  
                  {/* Title Moved to Top */}
                  <div className="mb-4 text-center w-full">
                      <h2 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 truncate px-4">
                          {videoInfo.title}
                      </h2>
                      <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                          <p className="text-white/40 text-xs">@{videoInfo.uploader} • {videoInfo.platform}</p>
                          {videoInfo.engine && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-purple-500/30 text-[10px] text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
                              <ShieldCheck className="w-3 h-3" />
                              {videoInfo.engine}
                            </span>
                          )}
                      </div>
                  </div>

                  <div className={`${isVertical ? "aspect-[9/16] w-full max-h-[70vh] max-w-[400px] mx-auto" : "aspect-video w-full max-w-4xl"} ${trimMode ? "rounded-t-xl" : "rounded-xl"} overflow-hidden border border-white/10 shadow-2xl bg-black relative group flex flex-col items-center justify-center transition-all duration-300`}>
                    {isDesktop && showPreview && previewUrl ? (
                      previewUrl.startsWith("youtube-embed:") ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${previewUrl.replace("youtube-embed:", "")}?autoplay=1&mute=0&rel=0`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          ref={trimMode ? undefined : videoRef}
                          src={previewUrl}
                          controls={!trimMode}
                          className="w-full h-full object-contain"
                          autoPlay={!trimMode}
                          muted={trimMode}
                          onLoadedMetadata={(e) => {
                              const d = e.currentTarget.duration;
                              if (d && !isNaN(d) && d !== Infinity && actualDuration === 0) {
                                  setActualDuration(d);
                                  if (endTime === 0) setEndTime(d);
                              }
                          }}
                          onPlay={() => !trimMode && setIsPlaying(true)}
                          onPause={() => !trimMode && setIsPlaying(false)}
                        />
                      )
                    ) : (
                      <div className="w-full h-full relative cursor-pointer" onClick={() => loadVideoToCache(false)}>
                          <img src={proxyImage(videoInfo.thumbnail) || ""} alt={videoInfo.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform shadow-2xl">
                                {isCaching ? <Loader2 size={40} className="text-white animate-spin" /> : <Play size={40} className="fill-white text-white ml-2" />}
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-white/90 font-bold tracking-widest text-xs uppercase bg-black/60 px-5 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-xl group-hover:bg-purple-600/50 transition-colors">
                                  {isCaching ? `Loading Studio... ${cacheProgress}%` : "Play Video"}
                                </span>
                                {isCaching && (
                                  <div className="w-32 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300" style={{ width: `${cacheProgress}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 rounded-md text-xs font-mono border border-white/10 shadow-lg">
                          {videoInfo.durationString}
                        </div>
                      </div>
                    )}
                  </div>



               </div>
            ) : (
              /* If no video: Show Hero Text */
              <div className="text-center max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
                 <div className="mb-6 inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                    <div className="flex -space-x-2">
                       <div className="w-8 h-8 rounded-full bg-[#ff0000] flex items-center justify-center border-2 border-black"><Youtube size={16} className="text-white fill-white"/></div>
                       <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center border-2 border-black"><Instagram size={16} className="text-white"/></div>
                       <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center border-2 border-black"><Facebook size={16} className="text-white fill-white"/></div>
                    </div>
                 </div>
                 <h1 className="text-5xl lg:text-6xl font-black text-white/90 tracking-tight leading-none mb-6">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">Universal</span><br/>Downloader
                 </h1>
                 <p className="text-lg text-slate-400 leading-relaxed">
                    The ultimate video processing suite. Save, trim, and remix content from YouTube, Instagram, and Facebook instantly.
                 </p>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: CONTROLS (Input / Actions) */}
          <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col md:h-full overflow-y-auto custom-scrollbar">
             
             {/* Mobile-only Hero (hidden on desktop) */}
             <div className="md:hidden pt-8 pb-6 text-center px-4">
                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2 tracking-tight">Universal<br/>Downloader</h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto mb-4">
                  Save, trim, and download any video from YouTube, Instagram, Facebook, and more platforms.
                </p>
                {/* Platform pills mobile */}
                <div className="flex justify-center gap-2 mb-2">
                   <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 flex items-center gap-1.5"><Youtube size={12}/> YouTube</span>
                   <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 flex items-center gap-1.5"><Instagram size={12}/> IG</span>
                   <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 flex items-center gap-1.5"><Facebook size={12}/> FB</span>
                </div>
             </div>

             <div className="p-4 md:p-8 flex flex-col gap-6 min-h-full">
                {/* 1. INPUT CARD */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-1 md:p-1.5 shadow-xl relative z-20">
                    <div className="flex gap-2">
                      <input
                        id="downloader-url-input"
                        type="url"
                        className="flex-1 bg-transparent [color-scheme:dark] border-none outline-none text-white focus:bg-transparent [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white px-4 text-base md:text-sm placeholder:text-white/20 font-mono h-12"
                        placeholder="Paste link here..."
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); if (phase === "error") { setPhase("idle"); setErrorMsg(""); setErrorCode(""); } }}
                        onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                        disabled={isWorking}
                      />
                      <button
                        id="downloader-fetch-btn"
                        className="h-12 px-6 rounded-xl bg-white text-black font-bold text-sm tracking-wide hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        onClick={handleFetch}
                        disabled={!url.trim() || isWorking}
                      >
                        {phase === "fetching" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        <span className="hidden sm:inline">Fetch</span>
                      </button>
                    </div>
                  </div>

                  {/* Developer Engine Override */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 opacity-50 hover:opacity-100 transition-opacity">
                    <span>⚙️ Developer Engine Override:</span>
                    <select
                      value={forceEngine}
                      onChange={(e) => setForceEngine(e.target.value)}
                      className="bg-[#0f0f11] border border-white/10 text-white/90 py-1 px-2 rounded outline-none cursor-pointer hover:bg-black transition-colors"
                    >
                      <option className="bg-[#0f0f11] text-white font-semibold" value="auto">🌟 Smart Auto-Fallback (Production Default)</option>
                      
                      <optgroup label="📸 Meta (Instagram / Facebook)" className="text-pink-400 bg-black/90 italic font-semibold">
                        <option className="bg-[#0f0f11] text-red-500 font-bold not-italic" value="layer6">🔥 PAID [WORKING]: Layer 6 - ASocks Residential ($0.003/REQ)</option>
                        <option className="bg-[#0f0f11] text-yellow-400 not-italic" value="layer1">⚡ FREE [VARIABLE]: Layer 1 - Hetzner Cobalt</option>
                        <option className="bg-[#0f0f11] text-slate-500 not-italic" disabled>❌ BLOCKED: Layer 2 - CF Swarm (Datacenter IP Blocked)</option>
                      </optgroup>

                      <optgroup label="🟥 YouTube" className="text-red-500 bg-black/90 italic font-semibold">
                        <option className="bg-[#0f0f11] text-green-400 not-italic" value="layer2">☁️ FREE [WORKING]: Layer 2 - CF Swarm Edge</option>
                        <option className="bg-[#0f0f11] text-green-400 not-italic" value="layer4">🤖 FREE [WORKING]: Layer 4 - YTDL-Core Spoofer</option>
                        <option className="bg-[#0f0f11] text-orange-400 not-italic" value="layer3">🌐 FREE [BUILDING]: Layer 3 - Native IPv6 Direct</option>
                      </optgroup>
                    </select>
                  </div>

                  

                  

                {/* 2. STATUS / ERROR (Phase 13: Enhanced Error Handling) */}
                {phase === "fetching" && extractProgress && (
                   <div className="mt-4 p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 animate-in slide-in-from-top-2">
                       <div className="flex items-center gap-3 mb-3">
                           <Loader2 size={18} className="animate-spin text-cyan-400" />
                           <span className="text-sm font-medium text-cyan-100">{extractProgress.msg}</span>
                       </div>
                       <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner">
                           <div 
                               className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500" 
                                 style={{ width: `${extractProgress.pct}%` }}
                             />
                         </div>
                         <div className="flex justify-between items-center mt-2">
                             <p className="text-[10px] text-cyan-400/60 uppercase tracking-wide">Secure Connection / Core Engine</p>
                             <p className="text-[10px] text-cyan-400 font-mono font-bold animate-pulse">{extractProgress.pct}%</p>
                         </div>
                   </div>
                )}

                {phase === "error" && errorMsg && (
                  <div className={`p-4 rounded-xl flex gap-3 text-sm items-start animate-in slide-in-from-top-2 border ${
                      errorCode === "RATE_LIMIT" ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-200" :
                      errorCode === "COBALT_DOWN" ? "bg-orange-500/10 border-orange-500/20 text-orange-200" :
                      "bg-red-500/10 border-red-500/20 text-red-200"
                  }`}>
                    {errorCode === "PRIVATE_VIDEO" || errorCode === "AGE_RESTRICTED" ? <Lock size={16} className="mt-0.5 shrink-0" /> :
                     errorCode === "COBALT_DOWN" ? <CloudOff size={16} className="mt-0.5 shrink-0" /> :
                     errorCode === "RATE_LIMIT" ? <Hourglass size={16} className="mt-0.5 shrink-0" /> :
                     <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    
                    <div className="flex-1">
                      <div className="font-bold text-xs uppercase tracking-wider opacity-90 mb-1">
                          {errorCode === "PRIVATE_VIDEO" ? "Access Denied" :
                           errorCode === "AGE_RESTRICTED" ? "Login Required" :
                           errorCode === "COBALT_DOWN" ? "Service Overload" :
                           errorCode === "RATE_LIMIT" ? "Please Wait" : "Error"}
                      </div>
                      {errorMsg}
                    </div>
                    <button onClick={() => { setPhase("idle"); setErrorMsg(""); setErrorCode(""); }}><X size={14} /></button>
                  </div>
                )}

                {/* 3. RESULT CARD (Only Info/Duration/Format - Visual is on left for desktop) */}
                {videoInfo && (phase === "ready" || phase === "downloading" || phase === "trimming") && (
                   <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
                      
                      {/* Mobile Thumbnail (Hidden on Desktop) */}
                        <div className={`md:hidden ${isVertical ? "aspect-[9/16] w-2/3 mx-auto max-h-[50vh]" : "aspect-video"} relative rounded-xl overflow-hidden bg-black/40 border border-white/10 group`} onClick={() => loadVideoToCache(false)}>
                            {!isDesktop && showPreview && previewUrl ? (
                              previewUrl.startsWith("youtube-embed:") ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${previewUrl.replace("youtube-embed:", "")}?autoplay=1&mute=0`}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              ) : (
                                <video src={previewUrl} controls className="w-full h-full object-contain" autoPlay muted={trimMode}
                                  ref={videoRef}
                                  onLoadedMetadata={(e) => {
                                    const d = e.currentTarget.duration;
                                    if (d && !isNaN(d) && d !== Infinity && actualDuration === 0) {
                                        setActualDuration(d);
                                        if (endTime === 0) setEndTime(d);
                                    }
                                  }}
                                />
                              )
                            ) : (
                              <>
                                {videoInfo.thumbnail && <img src={proxyImage(videoInfo.thumbnail)} className="w-full h-full object-cover opacity-60" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                                      {isCaching ? <Loader2 size={24} className="text-white animate-spin" /> : <Play size={24} className="fill-white text-white ml-1" />}
                                  </div>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full border border-white/10 text-white/90">
                                      {isCaching ? `Loading... ${cacheProgress}%` : "Tap to Play"}
                                    </span>
                                    {isCaching && (
                                      <div className="w-20 h-1 bg-black/50 rounded-full overflow-hidden border border-white/10">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300" style={{ width: `${cacheProgress}%` }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[10px] rounded text-white shadow-lg">{videoInfo.durationString}</div>
                              </>
                            )}
                        </div>

                      {/* Action Buttons */}
                      {(videoInfo.duration && videoInfo.duration > 300) ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                          <span className="flex items-center justify-center font-bold gap-2 text-red-100 mb-1">
                            <Clock size={16} /> Video too long (Max 5 mins)
                          </span>
                          <span className="text-xs opacity-60 text-red-200/80">Server limit exceeded.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          <button 
                            className="h-14 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                            onClick={() => setShowFormatModal(true)} disabled={phase !== "ready"}
                          >
                             {phase === "downloading" ? (
                                 <><Loader2 size={18} className="animate-spin" /> {typeof downloadProgress === 'number' && downloadProgress > 0 ? `${downloadProgress}%` : downloadProgress}</>
                             ) : (
                               <><Download size={18} /> Download Menu</>
                             )}
                          </button>
                          
                          <button
                            className={`h-10 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold transition-all ${
                               trimMode ? "border-purple-500/50 text-purple-300 bg-purple-500/10" : "border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
                            }`}
                              onClick={() => {
                                if (!trimMode) {
                                  loadVideoToCache(true);
                                } else {
                                  setTrimMode(false);
                                }
                              }}
                            disabled={phase !== "ready" || isCaching}
                          >
                            {isCaching ? (
                              <><Loader2 size={14} className="animate-spin text-purple-400" /> <span className="text-purple-400">Loading Studio... {cacheProgress}%</span></>
                            ) : (
                              <><Scissors size={14} /> {trimMode ? "Close Trimmer" : "Trim Video"}</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {phase === "downloading" && typeof downloadProgress === 'number' && downloadProgress > 0 && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden rounded-t-lg">
                           <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                        </div>
                      )}

                   </div>
                )}
                
                {/* 4. FOOTER (Only visible on Right Panel when no video on Desktop) */}
                <div className="mt-auto pt-8 border-t border-white/5 text-center md:text-left">
                  <p className="text-[10px] uppercase tracking-widest text-white/20">© 2024 BongBari Media Group</p>
                </div>
             </div>
          </div>
        </div>

        {/* Floating Download History Bot */}
        <DownloadHistory />

        {/* Phase-wise Execution: Deferred Format Selection Modal */}
        {showFormatModal && videoInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm animate-in zoom-in-95 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-lg text-white">Select Format</h3>
                 <button onClick={() => setShowFormatModal(false)} className="text-white/50 hover:text-white bg-white/5 rounded-full p-1"><X size={18}/></button>
               </div>
               
               <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 mb-4">
                  <button 
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formatTab === "video" ? "bg-purple-500/30 text-purple-300" : "text-slate-500 hover:text-slate-300"}`}
                    onClick={() => setFormatTab("video")}
                  >
                    Video
                  </button>
                  <button 
                    className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${formatTab === "audio" ? "bg-cyan-500/30 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}
                    onClick={() => setFormatTab("audio")}
                  >
                    Audio
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {videoInfo.formats
                    .filter(f => formatTab === "audio" ? ["mp3", "m4a", "wav"].includes(f.ext) : !["mp3", "m4a", "wav"].includes(f.ext))
                    .map((f) => (
                    <button
                      key={f.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
                        selectedFormat === f.id
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedFormat(f.id)}
                    >
                        <span className="flex items-center gap-2">
                          {formatTab === "audio" ? <Music size={16} /> : <Film size={16} />} {f.label}
                        </span>
                        {selectedFormat === f.id && <CheckCircle2 size={16} className="text-purple-400" />}
                      </button>
                    ))}
                </div>

                <button 
                  className="w-full mt-6 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold text-base shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  onClick={() => {
                     setShowFormatModal(false);
                     handleDownload();
                  }}
                >
                  <Download size={18} /> Confirm Download
                </button>
            </div>
          </div>
        )}

          {/* FULLSCREEN STUDIO MODE OVERLAY */}
        {trimMode && videoInfo && (
           <div className="fixed inset-0 z-[100] bg-black flex flex-col font-serif animate-in fade-in zoom-in-95 duration-300">
              {/* App Bar */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-black/50 backdrop-blur-md relative z-50">
                 <div className="flex items-center gap-2">
                     <Link href="/tools">
                         <button className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
                            <ArrowLeft size={16} /> Tools
                         </button>
                     </Link>
                     <button onClick={() => setTrimMode(false)} className="text-white/60 hover:text-white flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors hidden sm:flex">
                        Dashboard
                     </button>
                   </div>

                 <div className="font-tech text-purple-400 font-bold tracking-widest text-xs flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
                    <Scissors size={14} /> BONGBARI STUDIO
                 </div>

                 <button
                    onClick={() => setShowShortcuts(!showShortcuts)}
                    className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all shadow-lg group"
                 >
                    <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
                 </button>

                 {showShortcuts && (
                  <div className="absolute top-16 right-6 w-[320px] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-tech text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-bold tracking-widest text-sm">BONGBARI PREMIUM</h3>
                      <button onClick={() => setShowShortcuts(false)} className="text-white/40 hover:text-white"><X size={16}/></button>
                    </div>
                    <p className="text-xs text-white/70 mb-5 leading-relaxed font-sans">
                      Desktop-grade non-linear editing in your browser. Frame-accurate precision, local-memory rendering, zero watermarks.
                    </p>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center"><span className="text-white/50">Play / Pause</span><span className="bg-white/10 px-2 py-1 rounded text-white font-bold">Space</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/50">Mark Start (In)</span><span className="bg-white/10 px-2 py-1 rounded text-white font-bold">I</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/50">Mark End (Out)</span><span className="bg-white/10 px-2 py-1 rounded text-white font-bold">O</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/50">Smart Mark</span><span className="bg-white/10 px-2 py-1 rounded text-white font-bold">M</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/50">Step Frame</span><span className="bg-white/10 px-2 py-1 rounded text-white font-bold">← / →</span></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Video Area */}
              <div className="flex-1 relative flex items-center justify-center min-h-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black cursor-pointer" onClick={() => {
                 if (videoRef.current) {
                   if (videoRef.current.paused) videoRef.current.play();
                   else videoRef.current.pause();
                 }
              }}>
                 {previewUrl && previewUrl.startsWith("youtube-embed:") ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${previewUrl.replace("youtube-embed:", "")}?autoplay=1&mute=${isMuted ? 1 : 0}&rel=0`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                  <video
                    ref={videoRef}
                    src={previewUrl || proxyImage(videoInfo.thumbnail!)}
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    autoPlay
                    playsInline
                    muted={isMuted}
                    onLoadedMetadata={(e) => {
                        const d = e.currentTarget.duration;
                        if (actualDuration === 0 && d && !isNaN(d) && d !== Infinity) {
                            setActualDuration(d);
                            if (endTime === 0) setEndTime(d);
                        }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}

                  />
                  )}
                 {isPlaying && (
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                      <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center drop-shadow-2xl">
                          <Pause size={32} className="text-white" />
                      </div>
                   </div>
                 )}
                 {!isPlaying && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all pointer-events-none">
                      <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center drop-shadow-2xl group-hover:scale-110 transition-transform pointer-events-auto">
                          <Play size={40} className="fill-white text-white ml-2" />
                      </div>
                   </div>
                 )}
                 
                 {/* Volume Overlay Control */}
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) {
                            videoRef.current.muted = !isMuted;
                            setIsMuted(!isMuted);
                        }
                    }}
                    className="absolute top-4 left-4 z-[250] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all shadow-lg"
                 >
                     {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                 </button>
              </div>

              {/* Trimmer Area */}
              <div className="shrink-0 bg-black/60 backdrop-blur-3xl border-t border-white/10 p-3 md:p-4 flex flex-col items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[200]">
                 <div className="w-full max-w-5xl mx-auto flex items-center gap-4">
                      <button
                        className="w-12 h-12 shrink-0 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-900/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                              if (videoRef.current.paused) {
                                if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
                                   videoRef.current.currentTime = startTime;
                                }
                                videoRef.current.play().catch(console.error);
                              } else {
                                videoRef.current.pause();
                              }
                            }
                          }}
                        >
                          {!isPlaying ? <Play size={20} className="ml-1 fill-white" /> : <Pause size={20} className="fill-white" />}
                      </button>
                      <div className="flex-1 px-4">
                          <TrimSlider                                videoRef={videoRef}                              duration={actualDuration || videoInfo.duration || 0}
                              startTime={startTime} 
                              endTime={endTime}
                              videoUrl={previewUrl && !previewUrl.startsWith("youtube-embed:") ? previewUrl : (videoInfo.thumbnail || "")}
                              onStartChange={(t) => {
                                setStartTime(t);
                                if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); }
                              }}
                              onEndChange={(t) => {
                                setEndTime(t);
                                if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); }
                              }}
                              onScrub={(t) => {
                                if (videoRef.current) {
                                  videoRef.current.pause();
                                  videoRef.current.currentTime = t;
                                }
                              }}
                              onScrubbingChange={setIsScrubbing}
                          />
                      </div>
                 </div>
                 
                      <div className="flex items-center gap-3">
                         <div className="flex flex-col">
                            <span className="text-[10px] text-white/50 mb-1 ml-1 uppercase tracking-wider font-bold">Output Format</span>
                            <select 
                               className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none drop-shadow-md cursor-pointer"
                               value={selectedFormat}
                               onChange={(e) => setSelectedFormat(e.target.value)}
                            >
                               {videoInfo?.formats.map((f: any) => (
                                  <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                                     {f.label} {['mp3', 'm4a', 'aac', 'wav'].includes(f.ext) ? 'Ã°Å¸Å½Âµ' : '🎬'}
                                  </option>
                               ))}
                            </select>
                         </div>
                         <button
                            className="h-12 px-6 md:px-10 bg-gradient-to-r mt-5 from-purple-600 to-cyan-600 text-white font-bold text-base rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                            onClick={handleTrim}
                            disabled={phase !== "ready" || endTime <= startTime || !videoRef.current}
                         >
                            {phase === "trimming" ? <Loader2 size={18} className="animate-spin" /> : <Scissors size={18} />}
                            {phase === "trimming" ? (typeof trimProgress === 'number' && trimProgress > 0 ? `Processing... ${trimProgress}%` : trimProgress) : `Download Clip (${formatTime(startTime)} - ${formatTime(endTime)})`}
                         </button>
                      </div>
              </div>
           </div>
        )}

      </div>
    </>
  );
}


