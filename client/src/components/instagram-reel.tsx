import { Play, Pause, Heart, MessageCircle, Send, Bookmark, Volume2, VolumeX, Eye, Loader2 } from "lucide-react";
import { useState, useRef, useCallback, useEffect, memo } from "react";

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
                  {/* Profile pic: local → IG CDN → gradient fallback */}
                  {pfpError < 2 ? (
                    <img
                      src={pfpError === 0 ? '/data/profile-pic.jpg' : `https://instagram.com/thebongbari/avatar`}
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
