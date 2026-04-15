import { Play, Pause, Heart, MessageCircle, Send, Bookmark, Volume2, VolumeX, Eye, Loader2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect, memo } from "react";

// ── Profile pic — inlined as base64 to avoid path/CDN/deployment failures ──
const PROFILE_PIC_B64 = 'data:image/jpeg;base64,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';

// ── Single-player: only one reel plays at a time ──
// Global event target shared by every InstagramReel instance
const reelBus = new EventTarget();
let _activeReelId: string | null = null;
const notifyPlay = (id: string) => { _activeReelId = id; reelBus.dispatchEvent(new CustomEvent('reel-play', { detail: id })); };

interface InstagramReelProps {
  reelId: string;
  caption: string;
  thumbnail: string;
  permalink: string;
  videoUrl?: string;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  index?: number;
  rank?: number;
}

const InstagramReel = memo(({ reelId, caption, thumbnail, permalink, videoUrl, likeCount, commentCount, viewCount, index = 0, rank }: InstagramReelProps) => {
  // BULLETPROOF: Always have a displayable view count — estimate from likes if missing
  const displayViewCount = (viewCount && viewCount > 0)
    ? viewCount
    : (likeCount && likeCount > 0 ? Math.round(likeCount * 18) : 0);

  const [imgError, setImgError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showFlash, setShowFlash] = useState<'play' | 'pause' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  // Batch 2: View badge entrance + count-up
  const viewBadgeRef = useRef<HTMLDivElement>(null);
  const [isViewVisible, setIsViewVisible] = useState(false);
  const [animatedCount, setAnimatedCount] = useState(0);
  const countDone = useRef(false);
  // Batch 3: Profile picture fallback chain (0=local, 1=CDN, 2+=IG logo)
  const [pfpError, setPfpError] = useState(0);
  // Batch 4: Tap ripple + video reveal
  const [ripple, setRipple] = useState<{x: number; y: number} | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const thumbUrl = (!imgError && thumbnail) ? thumbnail : `https://picsum.photos/seed/${reelId}/400/711`;

  const preloaded = useRef(false);
  const onHover = useCallback(() => {
    if (videoUrl && !preloaded.current) {
      preloaded.current = true;
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.as = 'video';
      l.href = videoUrl;
      document.head.appendChild(l);
    }
  }, [videoUrl]);

  const flash = useCallback((type: 'play' | 'pause') => {
    setShowFlash(type);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setShowFlash(null), 500);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent) => {
    // Batch 4 Phase 4.1: Ripple from touch point
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setRipple({ x: e.clientX - rect.left - 25, y: e.clientY - rect.top - 25 });
      setTimeout(() => setRipple(null), 500);
    }
    if (!videoUrl) { window.open(permalink, '_blank', 'noopener,noreferrer'); return; }
    if (playing && !paused) { videoRef.current?.pause(); setPaused(true); flash('pause'); }
    else if (playing && paused) { videoRef.current?.play().catch(() => {}); setPaused(false); flash('play'); }
    else { notifyPlay(reelId); setPlaying(true); setPaused(false); setBuffering(true); setVideoReady(false); }
  }, [videoUrl, permalink, playing, paused, flash]);

  useEffect(() => { if (playing && !paused && videoRef.current) videoRef.current.play().catch(() => {}); }, [playing, paused]);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  // Single-player: pause this reel when another one starts
  useEffect(() => {
    const handler = (e: Event) => {
      const activeId = (e as CustomEvent).detail;
      if (activeId !== reelId && playing) {
        videoRef.current?.pause();
        setPlaying(false);
        setPaused(false);
        setVideoReady(false);
      }
    };
    reelBus.addEventListener('reel-play', handler);
    return () => reelBus.removeEventListener('reel-play', handler);
  }, [reelId, playing]);

  // Batch 2: IntersectionObserver for view badge entrance
  useEffect(() => {
    const el = viewBadgeRef.current;
    if (!el || isViewVisible) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIsViewVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [isViewVisible]);

  // Batch 2: Count-up animation (400ms ease-out cubic)
  useEffect(() => {
    if (!isViewVisible || !displayViewCount || countDone.current) return;
    countDone.current = true;
    const dur = 400, start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setAnimatedCount(Math.floor((1 - Math.pow(1 - p, 3)) * displayViewCount));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isViewVisible, displayViewCount]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(videoRef.current.muted); }
  }, []);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };

  const share = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.share ? navigator.share({ title: caption || 'Bong Bari Reel', url: permalink }).catch(() => {}) : navigator.clipboard?.writeText(permalink);
  }, [caption, permalink]);

  return (
    <div
      className="yt-card-container group"
      data-testid={`instagram-reel-${reelId}`}
      style={{ animationDelay: `${index * 80}ms` }}
      onMouseEnter={onHover}
    >
      <div className="yt-gold-border-wrap">
        <div className="rounded-[12px] p-[3px] bg-black relative z-[1]" style={{ backfaceVisibility: 'hidden' }}>
          <div
            ref={containerRef}
            className="relative w-full aspect-[9/16] rounded-[10px] overflow-hidden cursor-pointer bg-black select-none active:scale-[0.97] transition-transform duration-75"
            style={{ backfaceVisibility: 'hidden', WebkitMaskImage: '-webkit-radial-gradient(white, black)', transform: 'translateZ(0)' }}
            onClick={handleTap}
          >
            {/* ── VIDEO — Batch 4 Phase 4.3: fade-in reveal ── */}
            {playing && videoUrl && !videoError && (
              <video
                ref={videoRef}
                src={videoUrl}
                className={`absolute inset-0 w-full h-full object-cover z-[1] ${videoReady ? 'video-reveal' : 'opacity-0'}`}
                autoPlay muted={muted} loop playsInline poster={thumbUrl} preload="metadata"
                onCanPlay={() => { setBuffering(false); setVideoReady(true); }}
                onWaiting={() => setBuffering(true)}
                onPlaying={() => { setBuffering(false); setVideoReady(true); }}
                onError={() => { setVideoError(true); setPlaying(false); setBuffering(false); }}
              />
            )}

            {/* ── THUMBNAIL — stays visible during loading for crossfade ── */}
            {(!playing || !videoReady || videoError) && (
              <img
                src={thumbUrl} alt={caption || 'Instagram Reel'}
                loading={index < 4 ? "eager" : "lazy"} decoding="async"
                fetchPriority={index < 2 ? "high" : "auto"}
                className={`absolute inset-0 w-full h-full object-cover yt-thumb-img ${playing && videoReady ? 'opacity-0' : ''} transition-opacity duration-200`}
                onError={() => !imgError && setImgError(true)}
              />
            )}

            {!playing && <div className="yt-shimmer" />}

            {/* Top vignette */}
            <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-[2]" />
            {/* Bottom vignette */}
            <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-[2]" />

            {/* ── RANK BADGE (top-left) ── */}
            {rank && (
              <div className="absolute top-2 left-2 z-[8] w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-sm sm:text-base text-black"
                style={{
                  background: 'linear-gradient(135deg, #F4C430 0%, #FFD700 50%, #DAA520 100%)',
                  boxShadow: '0 0 12px rgba(244,196,48,0.6), 0 2px 8px rgba(0,0,0,0.5)',
                }}>
                {rank}
              </div>
            )}

            {/* ── VIEW COUNT — Batch 2: warm white + amber accent, animated entrance (BULLETPROOF: always shows for ranked/popular reels) ── */}
            {displayViewCount > 0 && (
              <div ref={viewBadgeRef}
                className={`absolute top-2.5 z-[7] flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isViewVisible ? 'view-badge-animate' : 'opacity-0'}`}
                style={{
                  ...(rank ? { left: '2.75rem' } : { right: '0.625rem' }),
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(244,196,48,0.3)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.5), 0 0 8px rgba(244,196,48,0.08)',
                }}>
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 view-badge-eye-pulse" style={{ color: '#F4C430' }} />
                <span className="text-[13px] sm:text-sm font-bold tracking-wide" style={{ color: '#FAFAFA' }}>
                  {fmt(isViewVisible ? animatedCount : 0)}
                </span>
              </div>
            )}

            {/* ── MUTE (top-right when playing, pushed down if view badge is top-right) ── */}
            {playing && (
              <button
                onClick={toggleMute}
                className="absolute z-[20] w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{
                  top: (displayViewCount > 0 && !rank) ? '2.5rem' : '0.625rem',
                  right: '0.625rem',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(8px)',
                }}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX className="w-4 h-4 text-white/90" /> : <Volume2 className="w-4 h-4 text-white/90" />}
              </button>
            )}

            {/* ── LOADING — Batch 4 Phase 4.2: shimmer sweep over thumbnail ── */}
            {playing && buffering && (
              <>
                <div className="reel-shimmer-overlay" />
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[17] pointer-events-none">
                  <span className="text-[10px] font-medium text-white/60 tracking-wide">Loading...</span>
                </div>
              </>
            )}

            {/* Batch 4 Phase 4.1: Tap ripple */}
            {ripple && <div className="card-tap-ripple" style={{ left: ripple.x, top: ripple.y }} />}

            {/* Batch 4 Phase 4.5: Error state — graceful fallback */}
            {videoError && (
              <a href={permalink} target="_blank" rel="noopener noreferrer"
                className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[17] text-[10px] font-medium text-white/70 hover:text-white underline transition-colors"
                onClick={(e) => e.stopPropagation()}>
                Watch on Instagram →
              </a>
            )}

            {/* ── FLASH INDICATOR (play/pause) ── */}
            {showFlash && (
              <div className="absolute inset-0 flex items-center justify-center z-[15] pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-ping"
                  style={{ animationDuration: '0.5s', animationIterationCount: '1' }}>
                  {showFlash === 'pause' ? <Pause className="w-7 h-7 text-white fill-white" /> : <Play className="w-7 h-7 text-white fill-white ml-0.5" />}
                </div>
              </div>
            )}

            {/* ── INITIAL PLAY BUTTON (before first play) ── */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full animate-pulse"
                    style={{ background: 'radial-gradient(circle, rgba(225,48,108,0.25) 0%, transparent 70%)' }} />
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(244,196,48,0.92) 0%, rgba(218,165,32,0.88) 100%)',
                      boxShadow: '0 0 24px rgba(244,196,48,0.5), 0 4px 16px rgba(0,0,0,0.4)',
                    }}>
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-black text-black ml-0.5" />
                  </div>
                </div>
              </div>
            )}

            {/* ── PAUSED OVERLAY ── */}
            {playing && paused && !showFlash && !buffering && (
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-[10] pointer-events-none">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(244,196,48,0.88) 0%, rgba(218,165,32,0.82) 100%)',
                    boxShadow: '0 0 30px rgba(244,196,48,0.5)',
                  }}>
                  <Play className="w-8 h-8 fill-black text-black ml-0.5" />
                </div>
              </div>
            )}

            {/* ══════ RIGHT SIDEBAR — Instagram style ══════ */}
            <div className="absolute right-1 sm:right-1.5 bottom-14 sm:bottom-[68px] z-[10] flex flex-col items-center gap-3 sm:gap-3.5"
              onClick={(e) => e.stopPropagation()}>

              {/* ♥ Heart / Likes — Batch 5.2 sidebar-heartbeat on hover */}
              <div className="flex flex-col items-center gap-0.5">
                <button className="sidebar-heart group/btn w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center active:scale-125 transition-transform duration-150" aria-label="Like">
                  <Heart className="w-[26px] h-[26px] sm:w-7 sm:h-7 text-white group-hover/btn:text-red-400 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                </button>
                {likeCount != null && likeCount > 0 && (
                  <span className="text-[11px] sm:text-xs font-bold text-white leading-none"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                    {fmt(likeCount)}
                  </span>
                )}
              </div>

              {/* 💬 Comment — Batch 5.2 sidebar-bounce on hover */}
              <div className="flex flex-col items-center gap-0.5">
                <button className="sidebar-comment group/btn w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center active:scale-125 transition-transform duration-150" aria-label="Comment">
                  <MessageCircle className="w-[26px] h-[26px] sm:w-7 sm:h-7 text-white group-hover/btn:text-blue-400 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
                </button>
                {commentCount != null && commentCount > 0 && (
                  <span className="text-[11px] sm:text-xs font-bold text-white leading-none"
                    style={{ textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                    {fmt(commentCount)}
                  </span>
                )}
              </div>

              {/* ✈ Share — Batch 5.2 sidebar-share tilt on hover */}
              <button onClick={share}
                className="sidebar-share group/btn w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center active:scale-125 transition-transform duration-150" aria-label="Share">
                <Send className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-white group-hover/btn:text-green-400 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] rotate-[20deg]" />
              </button>

              {/* 🔖 Bookmark — Batch 5.2 sidebar-bookmark pop on hover */}
              <a href={permalink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="sidebar-bookmark group/btn w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center active:scale-125 transition-transform duration-150" aria-label="Save">
                <Bookmark className="w-[22px] h-[22px] sm:w-6 sm:h-6 text-white group-hover/btn:text-yellow-400 transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]" />
              </a>

              {/* Batch 3: Profile Picture with IG Stories ring (fallback chain) */}
              <a href={permalink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="pfp-wrapper relative mt-0.5 active:scale-110 transition-all duration-200 hover:scale-110"
                aria-label="View on Instagram">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9">
                  {/* IG Stories gradient ring */}
                  <div className="pfp-ring absolute -inset-[3px] rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #833AB4, #C13584, #E1306C, #FD1D1D, #F77737, #FCAF45)',
                      boxShadow: '0 2px 10px rgba(131,58,180,0.4)',
                    }} />
                  {/* Dark gap between ring and pic */}
                  <div className="absolute -inset-[1px] rounded-full bg-black" />
                  {/* Profile pic: base64 inline → IG CDN → gradient fallback */}
                  {pfpError < 2 ? (
                    <img
                      src={pfpError === 0 ? PROFILE_PIC_B64 : `https://instagram.com/thebongbari/avatar`}
                      alt="thebongbari"
                      className="relative w-full h-full rounded-full object-cover z-[1]"
                      onError={() => setPfpError(prev => prev + 1)}
                    />
                  ) : (
                    <div className="relative w-full h-full rounded-full flex items-center justify-center z-[1]"
                      style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 30%, #FD1D1D 60%, #F77737 100%)' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-[18px] sm:h-[18px] fill-white drop-shadow-sm">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </a>
            </div>

            {/* ══════ BOTTOM — username + caption — Batch 5.4 typography upgrade ══════ */}
            <div className="absolute bottom-0 left-0 right-12 sm:right-14 z-[5] px-2.5 sm:px-3 pb-2.5 sm:pb-3 pointer-events-none">
              <p className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-white mb-0.5"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
                thebongbari
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="#0095F6"/>
                  <path d="M17.5 27.5L11 21l2.1-2.1 4.4 4.4L27.9 13l2.1 2.1L17.5 27.5z" fill="white"/>
                </svg>
              </p>
              <h3 className="caption-fade text-white font-medium text-[10px] sm:text-[11px] leading-snug line-clamp-2"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                {caption || "Instagram Reel"}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

InstagramReel.displayName = 'InstagramReel';
export default InstagramReel;
