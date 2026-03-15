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
  Loader2, AlertCircle, Music, Film, CheckCircle2, Search, X, Clock,
  Lock, CloudOff, Hourglass, // Added for Phase 13 Error Handling
} from "lucide-react";
import { TrimSlider } from "@/components/TrimSlider";

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

import { buildApiUrl } from "@/lib/queryClient";
import "./SocialDownloaderPage.css";

const apiUrl = buildApiUrl;

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
  const { user, isAuthenticated, sessionId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorCode, setErrorCode] = useState(""); // Phase 13: Technical error mapping (e.g. COBALT_DOWN, RATE_LIMIT)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("mp4-720");
  const [formatTab, setFormatTab] = useState<"video" | "audio">("video");
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
  const isVertical = url.toLowerCase().includes("/shorts/") || url.toLowerCase().includes("/reel/") || url.toLowerCase().includes("/reels/");
  // ── Fetch info ─────────────────────────────────────────────────
  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    console.log(`\n[Vibe Coder Tracker] 🔎 STEP 1: Fetching video metadata...`);
    console.log(`[Vibe Coder Tracker] 📝 Note: Metadata (titles/thumbnails) is tiny (2KB). Safe to use Render!`);
    setPhase("fetching"); setErrorMsg(""); setErrorCode(""); setVideoInfo(null);
    setShowPreview(false); setPreviewUrl(""); setTrimMode(false);
    const wakeTimer = setTimeout(() => setServerWaking(true), 4000);
    try {
      const res = await fetch(apiUrl(`/api/downloader/info?url=${encodeURIComponent(url.trim())}`));
      clearTimeout(wakeTimer); setServerWaking(false);
      const data = await res.json();
      if (!res.ok || data.error) {
         const error = new Error(data.error || "Could not fetch video info.") as any;
         error.code = data.code;
         throw error;
      }
      
      console.log(`[Vibe Coder Tracker] ✅ Metadata fetch success! Phase 1 complete.`);
      setVideoInfo(data);
      setSelectedFormat(data.formats[0]?.id ?? "mp4-720");
      setStartTime(0); setEndTime(Math.floor(data.duration)); setPhase("ready");
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      try { (window as any).gtag?.("event", "downloader_fetch", { platform: data.platform ?? "unknown" }); } catch {}
    } catch (err: any) {
      clearTimeout(wakeTimer); setServerWaking(false);
      setErrorMsg(err.message ?? "Failed to fetch video info."); 
      setErrorCode(err.code || "UNKNOWN"); 
      setPhase("error");
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
      setLocation("/login");
      return;
    }

    setPhase("downloading"); setDownloadProgress(0);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    console.log(`\n[Vibe Coder Tracker] 🎥 STEP 2: USER INITIATED FULL DOWNLOAD!`);
    console.log(`[Vibe Coder Tracker] 🛡️ Initializing Ambuja Cement Architecture (Render Fallback)...`);
    
    try {
      try { (window as any).gtag?.("event", "downloader_download", { format: selectedFormat }); } catch {}

      // Fallback to our own proven Render yt-dlp backend
      // Protected by auth - Phase 15: Attach sessionId to query param for browser nav
      const backendUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=${selectedFormat}&sessionId=${sessionId}`);
      window.location.href = backendUrl;
      
      setPhase("ready");
    } catch(e: any) { 
      setErrorMsg(e.message || "Download failed."); 
      setPhase("error");
    }
  }, [videoInfo, url, selectedFormat, isAuthenticated, setLocation]);

  // ── Preview ────────────────────────────────────────────────────
  const handlePreview = useCallback(() => {
    setShowPreview(!showPreview);
    if (!showPreview && !previewUrl) {
      if (!isAuthenticated) {
        toast({ title: "Login Required", description: "Login to preview videos.", variant: "destructive" });
        setLocation("/login");
        return; 
      }
      // Use direct stream proxy (mode=preview, force 480p) for reliable playback
      const streamUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=mp4-480&mode=preview&sessionId=${sessionId}`);
      setPreviewUrl(streamUrl);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    } else {
       if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
    }
  }, [showPreview, previewUrl, url, isAuthenticated, sessionId]);

  // ── Trim (Powered by super fast yt-dlp section download backend) ────
  const handleTrim = useCallback(async () => {
    if (!videoInfo) return;

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to trim and download videos.",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setPhase("trimming"); setTrimProgress(100); 
    try {
      try { (window as any).gtag?.("event", "downloader_trim", { duration_seconds: endTime - startTime }); } catch {}
      
      const encodedTitle = videoInfo?.title ? encodeURIComponent(videoInfo.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)) : "bongbari_download";
      
      const backendTrimUrl = apiUrl(`/api/downloader/stream?url=${encodeURIComponent(url)}&format=${selectedFormat}&title=${encodedTitle}&start=${startTime}&end=${endTime}&sessionId=${sessionId}`);
      
      // Navigate to trigger standard browser file save dialog
      window.location.href = backendTrimUrl;
      
      // It finishes instantly since it's just opening a link
      setTimeout(() => setPhase("ready"), 1000);
      
    } catch (err: any) {
      setErrorMsg(err.message ?? "Trimming failed."); setPhase("error");
    }
  }, [videoInfo, url, startTime, endTime, selectedFormat, sessionId, isAuthenticated, setLocation]);

  const isWorking = phase === "fetching" || phase === "downloading" || phase === "trimming";

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      <title>Free Video Downloader — YouTube, Instagram, Facebook | BongBari Tools</title>
      <meta name="description" content="Download YouTube, Instagram and Facebook public videos for free. Preview, trim in-browser, and save as MP4 or MP3. No account needed." />

      <div className="dl-page font-serif md:h-screen md:overflow-hidden md:flex md:flex-col">
        {/* Check SocialDownloaderPage.css for mobile-first styles, we add md: overrides here */}
        
        <header className="dl-main-header shrink-0">
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

        {/* ── DESKTOP: SPLIT VIEW LAYOUT (md:flex) ── */}
        <div className="md:flex md:flex-1 md:overflow-hidden relative z-10 w-full max-w-[1600px] mx-auto">
          
          {/* LEFT PANEL: VISUALS (Hero / Video Preview) */}
          <div className="hidden md:flex md:w-[55%] lg:w-[60%] flex-col justify-center items-center p-8 border-r border-white/5 bg-black/20 backdrop-blur-sm relative overflow-hidden">
            
            {/* If video loaded: Show Big Preview */}
            {videoInfo ? (
               <div className={`w-full animate-in fade-in zoom-in duration-500 ${isVertical ? "max-w-[320px] mx-auto flex flex-col items-center" : "max-w-2xl"}`}>
                  
                  {/* Title Moved to Top */}
                  <div className="mb-4 text-center w-full">
                      <h2 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 truncate px-4">
                          {videoInfo.title}
                      </h2>
                      <p className="text-white/40 text-sm mt-1">@{videoInfo.uploader} • {videoInfo.platform}</p>
                  </div>

                  <div className={`${isVertical ? "aspect-[9/16] w-full max-h-[60vh] max-w-[350px] mx-auto" : "aspect-video w-full"} ${trimMode ? "rounded-t-xl" : "rounded-xl"} overflow-hidden border border-white/10 shadow-2xl bg-black relative group flex flex-col items-center justify-center transition-all duration-300`}>
                    {showPreview && previewUrl ? (
                      <video ref={videoRef} src={previewUrl} controls className="w-full h-full object-contain" autoPlay />
                    ) : (
                      <div className="w-full h-full relative cursor-pointer" onClick={handlePreview}>
                        <img src={videoInfo.thumbnail || ""} alt={videoInfo.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                            <Play size={40} className="fill-white text-white ml-2" />
                          </div>
                        </div>
                        <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/80 rounded-md text-xs font-mono border border-white/10">
                          {videoInfo.durationString}
                        </div>
                      </div>
                    )}
                  </div>

                   {/* PHASE 15: INTEGRATED TRIMMER (One View) */}
                   {trimMode && videoInfo.duration > 0 && (
                        <div className={`mt-0 bg-black/80 border-x border-b border-white/10 rounded-b-xl p-4 animate-in slide-in-from-top-2 shadow-2xl relative z-10 w-full ${isVertical ? "max-w-[350px] mx-auto" : ""}`}>
                         <div className="flex items-center justify-between mb-4 text-xs text-white/50">
                            <span className="flex items-center gap-1 text-purple-300"><Scissors size={12}/> STUDIO MODE</span>
                            <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">WASM: ON</span>
                         </div>
                         <TrimSlider
                           duration={videoInfo.duration}
                           startTime={startTime} endTime={endTime}
                           onStartChange={(t) => {
                             setStartTime(t);
                             if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); }
                           }}
                           onEndChange={(t) => {
                             setEndTime(t);
                             if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.pause(); }
                           }}
                         />
                         <div className="flex gap-2 mt-4">
                            <button
                               className="flex-1 h-10 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                               onClick={handleTrim} 
                               disabled={phase !== "ready" || endTime <= startTime}
                            >
                                {phase === "trimming" ? <Loader2 size={12} className="animate-spin" /> : <Scissors size={12} />}
                                {phase === "trimming" ? `Processing... ${trimProgress}%` : `Download Clip (${formatTime(startTime)} - ${formatTime(endTime)})`}
                            </button>
                            <button 
                                className="px-4 h-10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold rounded-lg transition-colors"
                                onClick={() => setTrimMode(false)}
                            >
                                Close
                            </button>
                         </div>
                      </div>
                   )}

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
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">BongBari</span><br/>Downloader
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
                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-2 tracking-tight">BongBari<br/>Downloader</h1>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto mb-4">
                  Save, trim, and remix shorts & videos from your favorite platforms.
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
                        className="flex-1 bg-transparent border-none outline-none text-white px-4 text-base md:text-sm placeholder:text-white/20 font-mono h-12"
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

                {/* 2. STATUS / ERROR (Phase 13: Enhanced Error Handling) */}
                {serverWaking && (
                   <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-400/10 px-4 py-2 rounded-lg border border-yellow-400/20">
                      <Loader2 size={12} className="animate-spin" /> Server waking up (free tier ~15s). Please wait…
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
                        <div className={`md:hidden ${isVertical ? "aspect-[9/16] w-2/3 mx-auto h-[50vh]" : "aspect-video"} relative rounded-xl overflow-hidden bg-black/40 border border-white/10`} onClick={handlePreview}>
                         {videoInfo.thumbnail && <img src={videoInfo.thumbnail} className="w-full h-full object-cover" />}
                         <div className="absolute inset-0 flex items-center justify-center"><Play size={32} className="fill-white text-white drop-shadow-lg" /></div>
                         <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-[10px] rounded text-white">{videoInfo.durationString}</div>
                      </div>

                      {/* Format Selection */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between ml-1 mb-2">
                            <label className="text-xs uppercase tracking-widest text-white/40 font-bold">Select Format</label>
                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                              <button 
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${formatTab === "video" ? "bg-purple-500/30 text-purple-300" : "text-slate-500 hover:text-slate-300"}`}
                                onClick={() => setFormatTab("video")}
                              >
                                Video
                              </button>
                              <button 
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${formatTab === "audio" ? "bg-cyan-500/30 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}
                                onClick={() => setFormatTab("audio")}
                              >
                                Audio
                              </button>
                            </div>
                          </div>
                          
                           <div className="grid grid-cols-2 gap-2">
                              {videoInfo.formats
                                .filter(f => formatTab === "audio" ? ["mp3", "m4a", "wav"].includes(f.ext) : !["mp3", "m4a", "wav"].includes(f.ext))
                                .map((f) => (
                                <button
                                  key={f.id}
                                  className={`h-12 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                                    selectedFormat === f.id
                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                  onClick={() => setSelectedFormat(f.id)}
                                  disabled={phase !== "ready"}
                                >
                                    {formatTab === "audio" ? <Music size={14} /> : <Film size={14} />} {f.label}
                                  </button>
                                ))}
                           </div>
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
                            onClick={handleDownload} disabled={phase !== "ready"}
                          >
                             {phase === "downloading" ? (
                               <><Loader2 size={18} className="animate-spin" /> {downloadProgress > 0 ? `${downloadProgress}%` : "Running..."}</>
                             ) : (
                               <><Download size={18} /> Download {selectedFormat === "mp3" ? "Audio" : "Video"}</>
                             )}
                          </button>
                          
                          <button
                            className={`h-10 rounded-lg border border-dashed flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold transition-all ${
                               trimMode ? "border-purple-500/50 text-purple-300 bg-purple-500/10" : "border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
                            }`}
                            onClick={() => setTrimMode(!trimMode)}
                            disabled={phase !== "ready"}
                          >
                            <Scissors size={14} /> {trimMode ? "Close Trimmer" : "Trim Video"}
                          </button>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {phase === "downloading" && downloadProgress > 0 && (
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
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

      </div>
    </>
  );
}
