import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──
type Screen =
  | 'picker'           // main platform grid
  | 'whatsapp'         // WA choice: Chat or Status?
  | 'wa-chat-guide'    // WA Chat: guide with share text, THEN action
  | 'wa-status-guide'  // WA Status: CSS tutorial steps
  | 'ig-guide'         // Instagram: CSS tutorial steps
  | 'fb-guide'         // Facebook: CSS tutorial steps
  | 'telegram-guide'   // Telegram: guide, THEN action
  | 'twitter-guide';   // Twitter: guide, THEN action

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: string;
  username: string;
  theme: string;
  lang: string;
  t: (key: string) => string;
  shareTemplates: string[];
  onOpenStoryPreview: () => void;
  onGenerateCard?: () => void;
  storyPreviewUrl?: string | null;
  initialScreen?: Screen;
}

const isMobile = () => typeof window !== 'undefined' && (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

async function clipCopy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {
    const el = document.createElement('textarea'); el.value = text;
    document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
  }
}

// ══════════════════════════════════════
// Reusable components
// ══════════════════════════════════════

function PhoneFrame({ children, className = '', expanded = false, glowColor }: { children: React.ReactNode; className?: string; expanded?: boolean; glowColor?: string }) {
  const sizeClass = expanded
    ? 'w-[300px] sm:w-[340px] md:w-[380px]'
    : 'w-[220px] md:w-[240px] lg:w-[280px]';
  const innerH = expanded ? 'h-[520px] sm:h-[580px] md:h-[640px]' : 'h-[340px]';
  return (
    <div className={`relative mx-auto ${sizeClass} rounded-[32px] border-[3px] border-white/[0.08] bg-black overflow-hidden shadow-2xl shadow-black/60 ${className}`}
      style={glowColor ? { boxShadow: `0 0 40px ${glowColor}, 0 25px 50px -12px rgba(0,0,0,0.6)` } : undefined}>
      <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-20 h-[22px] bg-black rounded-full z-20 border border-white/[0.04]" />
      <div className={`relative pt-9 pb-4 ${innerH} overflow-hidden`}>{children}</div>
    </div>
  );
}

function BouncingArrow({ direction = 'down', className = '' }: { direction?: 'down' | 'up' | 'right'; className?: string }) {
  const emoji = direction === 'up' ? '👆' : direction === 'right' ? '👉' : '👇';
  // Bounce toward the target: up→bounce up, down→bounce down, right→bounce right
  const bounce = direction === 'up' ? { y: [0, -6, 0] } : direction === 'right' ? { x: [0, 6, 0] } : { y: [0, 6, 0] };
  return (
    <motion.div animate={bounce} transition={{ duration: 0.8, repeat: Infinity }}
      className={`text-yellow-400 text-lg ${className}`}>{emoji}</motion.div>
  );
}

function GlowRing({ children, color = 'rgba(0,149,246,0.4)' }: { children: React.ReactNode; color?: string }) {
  return (
    <motion.div
      animate={{ boxShadow: [`0 0 0 0px ${color}`, `0 0 0 5px transparent`, `0 0 0 0px ${color}`] }}
      transition={{ duration: 2.2, repeat: Infinity }}
      className="inline-flex rounded-full"
    >{children}</motion.div>
  );
}

// ══════════════════════════════════════
// Instagram Story Tutorial (4 steps) — pixel-accurate IG dark UI
// ══════════════════════════════════════
function IgTutorial({ step, shareLink, lang, username, storyPreviewUrl, expanded }: { step: number; shareLink: string; lang: string; username?: string; storyPreviewUrl?: string | null; onOpenStoryPreview?: () => void; onClose?: () => void; expanded?: boolean }) {
  const bn = lang === 'bn';

  // Step 0 — Instagram home feed → tap + → Story (pixel-perfect dark mode)
  if (step === 0) return (
    <PhoneFrame>
      <div className="bg-black">
        {/* IG top nav bar — pixel-accurate */}
        <div className="flex items-center justify-between px-3.5 py-2">
          {/* Camera icon (left) */}
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-60">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.5"/>
              <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5"/>
            </svg>
            <svg width="89" height="20" viewBox="0 0 89 20" className="opacity-80">
              <text x="0" y="16" fontFamily="system-ui" fontSize="16" fontWeight="700" fontStyle="italic" fill="white">Instagram</text>
            </svg>
          </div>
          <div className="flex items-center gap-3.5">
            {/* Heart icon with notification dot */}
            <div className="relative">
              <span className="text-white/70 text-sm">♡</span>
              <div className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full bg-[#ff3040]" />
            </div>
            {/* DM icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-70">
              <path d="M22 3L9.218 10.083M22 3l-6.782 18L9.218 10.083M22 3L9.218 10.083M9.218 10.083L1 14l8.218-3.917" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {/* Stories row */}
        <div className="flex gap-2.5 px-3 py-2 border-b border-white/[0.06]">
          {/* Your Story — highlighted with arrow pointing directly at it */}
          <div className="flex flex-col items-center gap-1 relative">
            <GlowRing color="rgba(225,48,108,0.6)">
              <div className="w-[52px] h-[52px] rounded-full bg-[#262626] flex items-center justify-center relative">
                <span className="text-white/30 text-lg">👤</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-[#0095f6] border-2 border-black flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold leading-none">+</span>
                </div>
              </div>
            </GlowRing>
            <span className="text-[8px] text-white/50">{bn ? 'তোর Story' : 'Your story'}</span>
            <BouncingArrow direction="up" className="!text-base" />
          </div>
          {/* Other stories (dim) — with IG gradient ring */}
          {['user1', 'user2', 'user3'].map(u => (
            <div key={u} className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[52px] h-[52px] rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <div className="w-full h-full rounded-full bg-black" />
              </div>
              <span className="text-[8px] text-white/30">{u}</span>
            </div>
          ))}
        </div>
        {/* Feed post placeholder (dim — not the focus) */}
        <div className="px-3 py-3 opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#262626]" />
            <span className="text-white/25 text-[10px]">username</span>
            <span className="text-white/10 text-[10px] ml-auto">• • •</span>
          </div>
          <div className="h-[60px] bg-[#1a1a1a] rounded-lg" />
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white/20 text-[11px]">♡</span>
            <span className="text-white/20 text-[11px]">💬</span>
            <span className="text-white/20 text-[11px]">✈</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 1 — Story editor with photo, top toolbar — tap 😊 sticker
  if (step === 1) return (
    <PhoneFrame>
      <div className="bg-black">
        {/* Story editor top toolbar — matches real IG */}
        <div className="flex items-center justify-between px-3 py-2 relative z-10">
          {/* Close X */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {/* Right toolbar icons */}
          <div className="flex items-center gap-3.5">
            {/* Draw icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-60">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="white"/>
            </svg>
            {/* Text Aa */}
            <span className="text-white/60 text-[15px] font-bold">Aa</span>
            {/* STICKER — highlighted with glow + pulse ring */}
            <GlowRing color="rgba(225,48,108,0.7)">
              <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center border border-white/20 ring-2 ring-pink-500/40 animate-pulse">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="white" strokeWidth="1.5"/>
                  <circle cx="9" cy="10" r="1.2" fill="white"/>
                  <circle cx="15" cy="10" r="1.2" fill="white"/>
                  <path d="M8.5 14.5c0 0 1.5 2 3.5 2s3.5-2 3.5-2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
            </GlowRing>
            {/* More ··· */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-40">
              <circle cx="12" cy="5" r="1.5" fill="white"/><circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="12" cy="19" r="1.5" fill="white"/>
            </svg>
          </div>
        </div>
        {/* Arrow below toolbar — pointing up at sticker icon (right-aligned to match sticker position) */}
        <div className="flex justify-end pr-[52px]">
          <BouncingArrow direction="up" className="!text-sm" />
        </div>
        {/* Story canvas — gradient bg simulating photo/video */}
        <div className="mx-2 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
          <div className="h-[210px] flex items-center justify-center">
            <span className="text-white/20 text-[10px]">{bn ? 'তোর photo/video' : 'your photo/video'}</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 2 — Sticker tray expanded, find LINK sticker
  if (step === 2) return (
    <PhoneFrame>
      <div className="bg-[#1a1a1a]">
        {/* Search bar at top like real IG sticker tray */}
        <div className="px-3 pt-3 pb-2">
          <div className="bg-[#363636] rounded-lg px-3 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8e8e8e" strokeWidth="2"/>
              <path d="M20 20l-3-3" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[#8e8e8e] text-[11px]">Search</span>
          </div>
        </div>
        {/* Sticker grid — 4 columns, matches real IG */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-x-3 gap-y-3">
            {/* Row 1 — non-LINK tiles dimmed */}
            <div className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">📍</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">LOCATION</span>
            </div>
            {/* LINK — highlighted with arrow right below */}
            <div className="flex flex-col items-center gap-1 relative">
              <GlowRing color="rgba(0,149,246,0.7)">
                <div className="w-[46px] h-[46px] rounded-2xl bg-[#0095f6]/15 flex items-center justify-center border-2 border-[#0095f6]/60">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#0095f6" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#0095f6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </GlowRing>
              <span className="text-[7px] text-[#0095f6] font-extrabold">LINK</span>
              <BouncingArrow direction="up" className="!text-sm" />
            </div>
            <div className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">@</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">MENTION</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">#</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">HASHTAG</span>
            </div>
            {/* Row 2 */}
            <div className="flex flex-col items-center gap-1 opacity-40">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">🎵</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">MUSIC</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">📊</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">POLL</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">❓</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">QUESTIONS</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-40">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[18px]">GIF</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">GIF</span>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 3 — "Add link" screen — pixel-perfect match to real IG dark mode
  if (step === 3) return (
    <PhoneFrame>
      <div className="bg-[#0a0a0a] min-h-[260px]">
        {/* iOS drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-9 h-[4px] rounded-full bg-[#3a3a3c]" />
        </div>
        {/* Header — Cancel / Add link / Done (with tap circle animation) */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="text-[#3897f0] text-[13px]">{bn ? 'বাতিল' : 'Cancel'}</span>
          <span className="text-white text-[13px] font-bold">{bn ? 'Link যোগ করো' : 'Add link'}</span>
          <div className="flex flex-col items-center gap-0.5">
            <GlowRing color="rgba(56,151,240,0.6)">
              <span className="text-[#3897f0] text-[13px] font-bold">Done</span>
            </GlowRing>
            <BouncingArrow direction="up" className="!text-sm" />
          </div>
        </div>
        {/* URL field with clipboard fly animation */}
        <div className="px-4 pt-4 relative">
          {/* Phase 7: Clipboard fly into URL field */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 1, y: -10, scale: 1 }}
            animate={{ opacity: [1, 1, 0], y: [-10, 20, 30], scale: [1, 0.8, 0.5] }}
            transition={{ duration: 1, ease: 'easeIn' }}
          >
            <span className="text-[16px]">📋</span>
          </motion.div>
          <span className="text-[#86868b] text-[10px] block mb-1">URL</span>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p className="text-white text-[13px] font-normal break-all leading-snug pb-2.5">
              {shareLink.replace('http://', '')}
            </p>
          </motion.div>
          <div className="border-b border-[#3a3a3c]" />
          {/* Helper text */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2">
            <p className="text-[#86868b] text-[10px] leading-relaxed">
              {bn ? 'তোর story দেখবে তারা sticker ট্যাপ করে এই link-এ যাবে।' : 'People who view your story can tap the sticker to visit this link.'}
            </p>
            <span className="text-[#3897f0] text-[10px]">{bn ? 'Preview দেখো' : 'See preview'}</span>
          </motion.div>
        </div>
        {/* + Customise sticker text */}
        <div className="px-4 pt-4 flex items-center gap-2.5">
          <span className="text-[#86868b] text-[18px] font-light">+</span>
          <span className="text-white/60 text-[13px]">{bn ? 'Sticker text কাস্টমাইজ করো' : 'Customise sticker text'}</span>
        </div>
        {/* Spacer to fill phone frame naturally */}
        <div className="h-[40px]" />
      </div>
    </PhoneFrame>
  );

   // Step 4 — IG story editor: real story card + draggable link sticker
  const trimLink = shareLink.replace('https://', '').replace('http://', '');
  const isExp = !!expanded;
  const stickerTxt = isExp ? 'text-[11px]' : 'text-[8px]';
  const stickerMax = isExp ? 'max-w-[200px]' : 'max-w-[130px]';
  const stickerPx = isExp ? 'px-3 py-[5px]' : 'px-2 py-[3px]';
  const stickerIcon = isExp ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';

  // Draggable sticker position — persisted in localStorage
  const storageKey = isExp ? 'ig_sticker_pos_exp' : 'ig_sticker_pos';
  const savedPos = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as { x: number; y: number };
    } catch { /* ignore */ }
    return { x: isExp ? 51 : 53, y: isExp ? -27 : -18 };
  }, [storageKey, isExp]);
  const [isDragging, setIsDragging] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);

  return (
    <PhoneFrame expanded={isExp}>
      <div ref={phoneRef} className="relative overflow-hidden h-full" style={{ touchAction: 'none' }}>
        {/* ── The REAL story card image ── */}
        {storyPreviewUrl ? (
          <img src={storyPreviewUrl} alt="Your story card" className="absolute inset-0 w-full h-full object-cover object-center" draggable={false} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#ec4899] via-[#f43f5e] to-[#fb923c] flex items-center justify-center">
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="text-lg">✨</motion.span>
          </div>
        )}

        {/* ── IG top toolbar — always visible ── */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-2 pt-1.5">
          <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm`}>
            <span className={`text-white ${isExp ? 'text-[9px]' : 'text-[7px]'} font-bold`}>✕</span>
          </div>
          <div className={`flex flex-col items-center ${isExp ? 'gap-1' : 'gap-0.5'}`}>
            <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm`}><span className={`text-white ${isExp ? 'text-[9px]' : 'text-[7px]'} font-bold`}>Aa</span></div>
            <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm`}><span className={`text-white ${isExp ? 'text-[9px]' : 'text-[7px]'}`}>☺</span></div>
            <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm`}><span className={`text-white ${isExp ? 'text-[9px]' : 'text-[7px]'}`}>♪</span></div>
            <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm`}><span className={`text-white ${isExp ? 'text-[9px]' : 'text-[7px]'}`}>⋯</span></div>
          </div>
        </div>

        {/* ── IG bottom bar — only visible when expanded/maximised ── */}
        {isExp && <div className="absolute bottom-0 left-0 right-0 z-10 px-1.5 pb-1.5">
          <div className="flex items-center gap-1">
            <div className="flex-1 relative">
              <GlowRing color="rgba(236,72,153,0.6)">
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`w-full bg-black/40 backdrop-blur-md rounded-full ${isExp ? 'py-[6px] px-2.5' : 'py-[4px] px-2'} flex items-center justify-center gap-0.5`}>
                  <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center`}>
                    <span className={`text-white ${isExp ? 'text-[7px]' : 'text-[6px]'}`}>👤</span>
                  </div>
                  <span className={`text-white ${isExp ? 'text-[10px]' : 'text-[8px]'} font-semibold`}>{bn ? 'তোর story' : 'Your stories'}</span>
                </motion.div>
              </GlowRing>
            </div>
            <div className={`flex-1 bg-black/40 backdrop-blur-md rounded-full ${isExp ? 'py-[6px] px-2.5' : 'py-[4px] px-1.5'} flex items-center justify-center gap-0.5`}>
              <span className={`text-[#1cd14f] ${isExp ? 'text-[10px]' : 'text-[8px]'}`}>★</span>
              <span className={`text-white/80 ${isExp ? 'text-[10px]' : 'text-[8px]'} font-medium`}>{bn ? 'ঘনিষ্ঠ বন্ধু' : 'Close Friends'}</span>
            </div>
            <div className={`${isExp ? 'w-7 h-7' : 'w-5 h-5'} rounded-full bg-white/30 flex items-center justify-center flex-shrink-0`}>
              <span className={`text-white/80 ${isExp ? 'text-[12px]' : 'text-[9px]'}`}>→</span>
            </div>
          </div>
        </div>}

        {/* ── DRAGGABLE link sticker — animated drag-in like someone placing it ── */}
        <motion.div
          className="absolute z-20"
          style={{ left: '50%', top: '50%', cursor: isDragging ? 'grabbing' : 'grab' }}
          initial={{ scale: 0.3, opacity: 0, x: 0, y: -120, rotate: -12 }}
          animate={{
            scale: [0.3, 1.15, 0.95, 1],
            opacity: [0, 0.8, 1, 1],
            x: [0, savedPos.x + 10, savedPos.x - 5, savedPos.x - 50],
            y: [-120, savedPos.y - 15, savedPos.y + 3, savedPos.y],
            rotate: [-12, 4, -1, 0],
          }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.5, 0.75, 1], delay: 0.5 }}
          drag
          dragMomentum={false}
          dragElastic={0}
          dragConstraints={phoneRef}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_, info) => {
            setIsDragging(false);
            setJustPlaced(true);
            setTimeout(() => setJustPlaced(false), 800);
            const newPos = { x: Math.round(savedPos.x + info.offset.x), y: Math.round(savedPos.y + info.offset.y) };
            try { localStorage.setItem(storageKey, JSON.stringify(newPos)); } catch { /* ignore */ }
          }}
        >
          <div className="relative" style={{ transform: 'translateX(-50%) translateY(-50%)' }}>
            {/* The IG link sticker pill */}
            <div className={`bg-white rounded-full ${stickerPx} flex items-center ${isExp ? 'gap-1.5' : 'gap-1'} select-none whitespace-nowrap`}
              style={{ boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.3)' : justPlaced ? '0 0 15px rgba(34,197,94,0.6), 0 0 0 2px rgba(34,197,94,0.4)' : '0 2px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)', transform: isDragging ? 'scale(1.08)' : 'scale(1)', transition: 'box-shadow 0.3s, transform 0.2s' }}>
              <svg viewBox="0 0 24 24" fill="#0095f6" className={`${stickerIcon} flex-shrink-0`}><path d="M13.06 8.11l1.415 1.414a7 7 0 010 9.9l-.354.353a7 7 0 01-9.9-9.9l1.415 1.415a5 5 0 107.07 7.07l.354-.353a5 5 0 000-7.07L11.65 9.524l1.41-1.414zm6.718-6.718a7 7 0 010 9.9l-1.415-1.414a5 5 0 00-7.07-7.07l-.354.353a5 5 0 000 7.07l1.415 1.415-1.415 1.414-1.414-1.414a7 7 0 010-9.9l.354-.354a7 7 0 019.9 0z"/></svg>
              <span className={`text-black ${stickerTxt} font-bold ${stickerMax}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trimLink}</span>
            </div>
            {/* Selection handles */}
            <div className={`absolute -top-0.5 -left-0.5 ${isExp ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full bg-white border border-white shadow-sm`} />
            <div className={`absolute -top-0.5 -right-0.5 ${isExp ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full bg-white border border-white shadow-sm`} />
            <div className={`absolute -bottom-0.5 -left-0.5 ${isExp ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full bg-white border border-white shadow-sm`} />
            <div className={`absolute -bottom-0.5 -right-0.5 ${isExp ? 'w-1.5 h-1.5' : 'w-1 h-1'} rounded-full bg-white border border-white shadow-sm`} />
          </div>
        </motion.div>

        {/* Drag hint — appears after sticker lands */}
        {!isDragging && (
          <motion.div
            className="absolute z-30 bottom-3 left-0 right-0 flex justify-center pointer-events-none"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: [0, 0.8, 0.8, 0], y: [5, 0, 0, -3] }}
            transition={{ duration: 3, delay: 2, ease: 'easeInOut' }}
          >
            <span className="bg-black/60 backdrop-blur-sm text-white/70 text-[8px] px-2.5 py-1 rounded-full font-medium">
              {bn ? '☝️ টেনে সরাও' : '☝️ Drag to reposition'}
            </span>
          </motion.div>
        )}

      </div>
    </PhoneFrame>
  );
}

const IG_STEPS = {
  bn: [
    { title: 'Story camera খোলো', desc: 'Instagram → তোর profile pic ট্যাপ করো, অথবা + → Story' },
    { title: 'Sticker icon ট্যাপ করো', desc: 'উপরে toolbar-এ □😊 square sticker icon' },
    { title: '🔗 LINK ট্যাপ করো', desc: 'Sticker tray-তে "Link" বাছো' },
    { title: 'URL paste করো → Done', desc: 'তোর link আগেই copy আছে 📋 — paste করে Done চাপো' },
    { title: '🎯 Link pill রাখো & পোস্ট!', desc: '☝️ Link pill টা টেনে story photo-র উপর রাখো — এটাই তোর clickable link! তারপর "Your stories" ট্যাপ করো' },
  ],
  en: [
    { title: 'Open Story camera', desc: 'Tap your profile pic at top-left, or + → Story' },
    { title: 'Tap the sticker icon', desc: 'Square sticker icon □😊 in top toolbar' },
    { title: 'Tap "Link"', desc: 'Find the Link sticker in the tray' },
    { title: 'Paste URL → tap Done', desc: 'Your link is already copied 📋 — paste and tap Done' },
    { title: '🎯 Place your clickable link!', desc: '☝️ Drag the link pill onto your story — this becomes your clickable link! Then tap "Your stories"' },
  ],
};

// ══════════════════════════════════════
// WhatsApp Status Tutorial (3 steps) — FIXED with proper pencil FAB
// ══════════════════════════════════════
// WhatsApp Status Tutorial (3 steps) — compact premium dark UI matching IG quality
// ══════════════════════════════════════
function WaStatusTutorial({ step, shareLink, lang }: { step: number; shareLink: string; lang: string }) {
  const bn = lang === 'bn';
  const trimmedLink = shareLink.replace('https://', '').replace('http://', '');

  // Step 0 — WhatsApp home → Status tab → tap pencil (pixel-perfect dark mode)
  if (step === 0) return (
    <PhoneFrame>
      <div className="bg-[#111b21]">
        {/* WA header — exact green #075e54 top bar like real WA dark */}
        <div className="bg-[#1f2c34] px-3 pt-1.5 pb-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#e9edef] text-[14px] font-bold">WhatsApp</span>
            <div className="flex items-center gap-3.5">
              {/* Camera icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#aebac1" strokeWidth="1.5"/>
                <circle cx="12" cy="13" r="3.5" stroke="#aebac1" strokeWidth="1.5"/>
              </svg>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#aebac1" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#aebac1" strokeWidth="2" strokeLinecap="round"/></svg>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#aebac1"/><circle cx="12" cy="12" r="1.5" fill="#aebac1"/><circle cx="12" cy="19" r="1.5" fill="#aebac1"/></svg>
            </div>
          </div>
          {/* Tab bar — tight, with notification badge on Chats */}
          <div className="flex">
            <div className="flex-1 py-1.5 text-center relative">
              <span className="text-[#8696a0] text-[10px] font-bold">Chats</span>
              {/* Notification badge */}
              <div className="absolute top-0.5 right-3 w-[14px] h-[14px] rounded-full bg-[#00a884] flex items-center justify-center">
                <span className="text-[#111b21] text-[7px] font-bold">3</span>
              </div>
            </div>
            <div className="flex-1 py-1.5 text-center relative">
              <span className="text-[#00a884] text-[10px] font-extrabold">Status</span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2.5px] bg-[#00a884] rounded-full" />
            </div>
            <div className="flex-1 py-1.5 text-center"><span className="text-[#8696a0] text-[10px] font-bold">Calls</span></div>
          </div>
        </div>

        {/* My Status — compact row */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2.5">
            <div className="w-[40px] h-[40px] rounded-full bg-[#2a3942] flex items-center justify-center relative">
              <span className="text-[#8696a0] text-sm">👤</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full bg-[#00a884] border-[1.5px] border-[#111b21] flex items-center justify-center">
                <span className="text-white text-[8px] font-bold leading-none">+</span>
              </div>
            </div>
            <div>
              <p className="text-[#e9edef] text-[11px] font-medium">{bn ? 'আমার Status' : 'My Status'}</p>
              <p className="text-[#8696a0] text-[8px]">{bn ? 'ট্যাপ করো update দিতে' : 'Tap to add status update'}</p>
            </div>
          </div>
        </div>

        {/* Recent — very compact, just enough to look real */}
        <div className="px-3">
          <p className="text-[#8696a0] text-[8px] font-medium mb-1.5">{bn ? 'সাম্প্রতিক' : 'Recent updates'}</p>
          {['Rahim', 'Sayanti'].map(name => (
            <div key={name} className="flex items-center gap-2.5 py-1 opacity-25">
              <div className="w-[34px] h-[34px] rounded-full border-2 border-[#00a884] p-[1.5px]">
                <div className="w-full h-full rounded-full bg-[#2a3942]" />
              </div>
              <div>
                <p className="text-[#e9edef] text-[10px]">{name}</p>
                <p className="text-[#8696a0] text-[8px]">Today, 2:45 PM</p>
              </div>
            </div>
          ))}
        </div>

        {/* FABs — compact, right-aligned */}
        <div className="flex justify-end pr-3 pb-2 pt-2">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#233138] flex items-center justify-center opacity-20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#aebac1" strokeWidth="1.5"/><circle cx="12" cy="12" r="3.5" stroke="#aebac1" strokeWidth="1.5"/></svg>
            </div>
            <div className="relative">
              <GlowRing color="rgba(0,168,132,0.6)">
                <div className="w-12 h-12 rounded-2xl bg-[#00a884] flex items-center justify-center shadow-lg shadow-[#00a884]/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
                  </svg>
                </div>
              </GlowRing>
              {/* Pulsing circle tap indicator on pencil FAB */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                animate={{ scale: [0.4, 1, 1.6, 0.4], opacity: [0, 0.9, 0, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              >
                <div className="w-14 h-14 rounded-full border-2 border-[#00a884]/80 bg-[#00a884]/20" />
              </motion.div>
              <motion.div
                className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                animate={{ y: [0, 8, 0, 0], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-[16px]">👆</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 1 — Text status editor — compact, shows paste action clearly
  if (step === 1) return (
    <PhoneFrame>
      <div className="flex flex-col" style={{ background: '#075e54' }}>
        {/* Top toolbar — compact */}
        <div className="flex items-center justify-between px-3 py-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-50">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
              <circle cx="8.5" cy="10" r="1" fill="white"/><circle cx="15.5" cy="10" r="1" fill="white"/>
              <path d="M8 14c0 0 1.5 2 4 2s4-2 4-2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-white/50 text-[13px] font-bold">T</span>
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 opacity-50" />
          </div>
        </div>
        {/* Text area — shows link being typed/pasted with clipboard fly animation */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 relative">
          {/* Phase 7: Clipboard fly animation */}
          <motion.div
            className="absolute top-2 left-1/2 -translate-x-1/2"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: [1, 1, 0], y: [0, 40, 60], scale: [1, 0.8, 0.6] }}
            transition={{ duration: 1.2, ease: 'easeIn' }}
          >
            <span className="text-[18px]">📋</span>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center">
            <p className="text-white text-[14px] font-semibold leading-relaxed break-all">{trimmedLink}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: 'spring', stiffness: 300 }}
            className="bg-emerald-400/20 border border-emerald-400/40 rounded-full px-3.5 py-1 mt-3">
            <span className="text-emerald-300 text-[8px] font-bold">✅ {bn ? 'Link paste হয়েছে!' : 'Link pasted!'}</span>
          </motion.div>
        </div>
        {/* Bottom — send button */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-white/30 text-[9px]">Status</span>
          <GlowRing color="rgba(0,168,132,0.6)">
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="white"/>
              </svg>
            </div>
          </GlowRing>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 2 — Ready to send (brighter green)
  if (step === 2) return (
    <PhoneFrame>
      <div className="flex flex-col" style={{ background: '#00a884' }}>
        <div className="flex items-center justify-between px-3 py-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-50">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/>
              <circle cx="8.5" cy="10" r="1" fill="white"/><circle cx="15.5" cy="10" r="1" fill="white"/>
              <path d="M8 14c0 0 1.5 2 4 2s4-2 4-2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-white/50 text-[13px] font-bold">T</span>
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 opacity-50" />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 gap-2">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center">
            <p className="text-white text-[14px] font-semibold leading-relaxed break-all">{trimmedLink}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="bg-white/25 border border-white/40 rounded-full px-3.5 py-1">
            <span className="text-white text-[9px] font-bold">✓ {bn ? 'Send চাপো!' : 'Tap send!'}</span>
          </motion.div>
        </div>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-white/50 text-[9px]">Status</span>
          <div className="relative">
            <GlowRing color="rgba(255,255,255,0.5)">
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center shadow-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="white"/>
                </svg>
              </div>
            </GlowRing>
            {/* Pulsing circle tap on send button */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
              animate={{ scale: [0.4, 1, 1.6, 0.4], opacity: [0, 0.9, 0, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
            >
              <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-white/20" />
            </motion.div>
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none z-20"
              animate={{ y: [0, 6, 0, 0], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-[14px]">👆</span>
            </motion.div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 3 — Link preview bubble (what it looks like after posting)
  if (step === 3) return (
    <PhoneFrame>
      <div className="bg-[#111b21] min-h-[280px]">
        {/* WA header */}
        <div className="bg-[#1f2c34] px-3 py-2 flex items-center justify-between">
          <span className="text-[#e9edef] text-[13px] font-bold">Status</span>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#aebac1"/><circle cx="12" cy="12" r="1.5" fill="#aebac1"/><circle cx="12" cy="19" r="1.5" fill="#aebac1"/></svg>
          </div>
        </div>
        {/* Status view — link preview rendering */}
        <div className="flex flex-col items-center justify-center px-4 py-6 gap-3">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-center">
            <span className="text-[#00a884] text-[9px] font-bold">{bn ? '✓ Status পোস্ট হয়েছে!' : '✓ Status posted!'}</span>
          </motion.div>
          {/* Link preview card — like WA renders it */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
            className="w-full bg-[#1f2c34] rounded-lg overflow-hidden border border-[#2a3942]">
            <div className="h-[60px] bg-gradient-to-r from-[#00a884]/20 to-[#075e54]/20 flex items-center justify-center">
              <span className="text-[#00a884] text-[20px]">🔗</span>
            </div>
            <div className="px-3 py-2">
              <p className="text-[#e9edef] text-[10px] font-bold">{bn ? 'Anonymous Message পাঠাও' : 'Send Anonymous Messages'}</p>
              <p className="text-[#8696a0] text-[8px] mt-0.5 break-all">{trimmedLink}</p>
            </div>
          </motion.div>
          {/* How friends see it */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="bg-[#00a884]/10 rounded-full px-3 py-1">
            <span className="text-[#00a884] text-[8px] font-bold">{bn ? '↑ বন্ধুরা এরকম দেখবে' : '↑ This is how friends see it'}</span>
          </motion.div>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 4 — Posted status visible to friends (with viewers)
  return (
    <PhoneFrame>
      <div className="bg-[#111b21] min-h-[280px]">
        {/* Status progress bar at top */}
        <div className="px-3 pt-3">
          <div className="h-[2px] bg-[#3a4a54] rounded-full overflow-hidden">
            <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'linear' }}
              className="h-full bg-white/80 rounded-full" />
          </div>
        </div>
        {/* Status header — user info */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center">
            <span className="text-[#8696a0] text-[12px]">👤</span>
          </div>
          <div className="flex-1">
            <p className="text-[#e9edef] text-[10px] font-bold">{bn ? 'আমার Status' : 'My Status'}</p>
            <p className="text-[#8696a0] text-[7px]">{bn ? 'এইমাত্র' : 'Just now'}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#aebac1"/><circle cx="12" cy="12" r="1.5" fill="#aebac1"/><circle cx="12" cy="19" r="1.5" fill="#aebac1"/></svg>
        </div>
        {/* Status content — shows the link text */}
        <div className="flex-1 flex items-center justify-center px-5 py-6" style={{ background: '#075e54' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <p className="text-white text-[14px] font-semibold text-center leading-relaxed break-all">{trimmedLink}</p>
          </motion.div>
        </div>
        {/* Bottom — viewers count */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="#8696a0" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3" stroke="#8696a0" strokeWidth="1.5"/>
            </svg>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-[#8696a0] text-[10px]">
              {bn ? '৩ জন দেখেছে' : '3 viewers'}
            </motion.span>
          </div>
          <div className="flex -space-x-1.5">
            {['🟢', '🔵', '🟡'].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.15 }}
                className="w-5 h-5 rounded-full bg-[#2a3942] border border-[#111b21] flex items-center justify-center text-[8px]">{c}</motion.div>
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const WA_STATUS_STEPS = {
  bn: [
    { title: 'Status tab-এ যাও', desc: 'WhatsApp → নিচে Status ট্যাপ করো' },
    { title: '✏️ Pencil বাটন চাপো', desc: 'নিচে সবুজ pencil icon — text status লিখতে' },
    { title: 'Link paste করো → Send!', desc: 'তোর link আগেই copy আছে 📋 — send চাপো' },
    { title: 'Link preview দেখো', desc: 'এরকম link preview আসবে বন্ধুদের কাছে' },
    { title: 'Status পোস্ট হয়ে গেছে! 🎉', desc: 'বন্ধুরা দেখছে — viewers count চেক করো' },
  ],
  en: [
    { title: 'Go to Status tab', desc: 'WhatsApp → Tap Status at bottom' },
    { title: 'Tap the ✏️ pencil button', desc: 'Green pencil at bottom-right — for text status' },
    { title: 'Paste your link → Send!', desc: 'Link already copied 📋 — tap send' },
    { title: 'See the link preview', desc: 'This is how the link preview appears to friends' },
    { title: 'Status posted! 🎉', desc: 'Friends are viewing — check viewer count' },
  ],
};

// ══════════════════════════════════════
// Facebook Story Tutorial (3 steps)
// ══════════════════════════════════════
// Facebook Story Tutorial (3 steps) — pixel-accurate FB dark UI
// ══════════════════════════════════════
function FbTutorial({ step, shareLink, lang }: { step: number; shareLink: string; lang: string }) {
  const bn = lang === 'bn';

  // Step 0 — Facebook home → Create Story card (pixel-perfect dark mode)
  if (step === 0) return (
    <PhoneFrame>
      <div className="bg-[#18191a]">
        {/* FB top bar */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[#1877f2] text-[22px] font-black leading-none">f</span>
          <div className="flex items-center gap-2.5">
            {/* Search */}
            <div className="w-7 h-7 rounded-full bg-[#3a3b3c] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#e4e6eb" strokeWidth="2"/><path d="M20 20l-3-3" stroke="#e4e6eb" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            {/* Messenger with badge */}
            <div className="w-7 h-7 rounded-full bg-[#3a3b3c] flex items-center justify-center relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#e4e6eb" strokeWidth="2"/></svg>
              <div className="absolute -top-0.5 -right-0.5 w-[12px] h-[12px] rounded-full bg-[#f02849] border-[1.5px] border-[#18191a] flex items-center justify-center">
                <span className="text-white text-[6px] font-bold">2</span>
              </div>
            </div>
          </div>
        </div>
        {/* Navigation icons row — Home, Video, Marketplace, Notifications, Menu */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#3a3b3c]">
          <div className="flex-1 flex justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>
          </div>
          <div className="flex-1 flex justify-center opacity-30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#b0b3b8" strokeWidth="1.5"/><path d="M10 9l5 3-5 3V9z" fill="#b0b3b8"/></svg>
          </div>
          <div className="flex-1 flex justify-center opacity-30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#b0b3b8" strokeWidth="1.5"/></svg>
          </div>
          <div className="flex-1 flex justify-center relative opacity-30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#b0b3b8" strokeWidth="1.5"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="#b0b3b8" strokeWidth="1.5"/></svg>
            <div className="absolute -top-1 right-0 w-[10px] h-[10px] rounded-full bg-[#f02849] flex items-center justify-center">
              <span className="text-white text-[5px] font-bold">5</span>
            </div>
          </div>
          <div className="flex-1 flex justify-center opacity-30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#b0b3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
        </div>
        {/* Stories row */}
        <div className="px-2.5 py-2.5">
          <div className="flex gap-2 overflow-hidden">
            {/* Create Story — highlighted + circle tap indicator */}
            <div className="flex flex-col items-center gap-0.5 relative">
              <GlowRing color="rgba(24,119,242,0.5)">
                <div className="w-[72px] flex-shrink-0 rounded-xl bg-[#242526] overflow-hidden border border-[#1877f2]/30">
                  <div className="h-[80px] bg-[#3a3b3c] relative">
                    <div className="absolute bottom-0 left-0 right-0 h-[32px] bg-[#242526] flex flex-col items-center justify-end pb-1">
                      <div className="w-7 h-7 rounded-full bg-[#1877f2] border-[3px] border-[#242526] flex items-center justify-center -mt-4 mb-0.5">
                        <span className="text-white text-[14px] font-bold leading-none">+</span>
                      </div>
                      <span className="text-[#e4e6eb] text-[7px] font-medium">{bn ? 'Create' : 'Create'}</span>
                    </div>
                  </div>
                </div>
              </GlowRing>
              {/* Pulsing circle tap on Create Story */}
              <motion.div
                className="absolute top-[40px] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                animate={{ scale: [0.4, 1, 1.6, 0.4], opacity: [0, 0.9, 0, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#1877f2]/80 bg-[#1877f2]/15" />
              </motion.div>
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                animate={{ y: [0, -6, 0, 0], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-[12px]">👆</span>
              </motion.div>
            </div>
            {/* Other stories (dim) */}
            {['Rina', 'Joy'].map(name => (
              <div key={name} className="w-[72px] flex-shrink-0 rounded-xl bg-[#242526] overflow-hidden opacity-25">
                <div className="h-[80px] bg-[#3a3b3c] relative">
                  <div className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full border-[3px] border-[#1877f2] bg-[#3a3b3c]" />
                  <div className="absolute bottom-0 left-0 right-0 px-1 pb-1.5">
                    <span className="text-[#e4e6eb] text-[7px]">{name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Post composer (dim) */}
        <div className="mx-3 mt-1 bg-[#242526] rounded-lg p-2.5 flex items-center gap-2.5 opacity-30">
          <div className="w-8 h-8 rounded-full bg-[#3a3b3c]" />
          <span className="text-[#b0b3b8] text-[10px]">{bn ? 'কি মনে হচ্ছে?' : "What's on your mind?"}</span>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 1 — Create Story screen → choose Link sticker / Text
  if (step === 1) return (
    <PhoneFrame>
      <div className="bg-[#18191a]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#3a3b3c]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="#e4e6eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[#e4e6eb] text-[13px] font-bold">{bn ? 'Story তৈরি করো' : 'Create Story'}</span>
          <span className="w-[18px]" />
        </div>
        {/* Create options grid */}
        <div className="px-3 py-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Photo option */}
            <div className="bg-[#242526] rounded-xl p-3 flex flex-col items-center gap-1.5 opacity-30">
              <div className="w-10 h-10 rounded-full bg-[#3a3b3c] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#e4e6eb" strokeWidth="1.5"/><circle cx="12" cy="13" r="4" stroke="#e4e6eb" strokeWidth="1.5"/></svg>
              </div>
              <span className="text-[#e4e6eb] text-[9px] font-medium">Photo</span>
            </div>
            {/* Text option — highlighted + circle tap indicator */}
            <div className="flex flex-col items-center gap-0.5 relative">
              <GlowRing color="rgba(24,119,242,0.6)">
                <div className="bg-[#1877f2]/15 rounded-xl p-3 flex flex-col items-center gap-1.5 border border-[#1877f2]/40">
                  <div className="w-10 h-10 rounded-full bg-[#1877f2]/25 flex items-center justify-center">
                    <span className="text-[#1877f2] text-[18px] font-black">Aa</span>
                  </div>
                  <span className="text-[#1877f2] text-[9px] font-bold">Text</span>
                </div>
              </GlowRing>
              {/* Pulsing circle tap on Text */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                animate={{ scale: [0.4, 1, 1.6, 0.4], opacity: [0, 0.9, 0, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#1877f2]/80 bg-[#1877f2]/15" />
              </motion.div>
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                animate={{ y: [0, -6, 0, 0], opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="text-[12px]">👆</span>
              </motion.div>
            </div>
          </div>
        </div>
        {/* Tip */}
        <div className="mx-3 bg-[#242526] rounded-lg px-3 py-2 text-center">
          <span className="text-[#b0b3b8] text-[9px]">{bn ? 'Text বাছো → link paste করো' : 'Pick Text → paste your link'}</span>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 2 — Text story editor with link pasted
  if (step === 2) return (
    <PhoneFrame>
      <div className="min-h-[280px] flex flex-col" style={{ background: 'linear-gradient(135deg, #1877f2 0%, #6c63ff 100%)' }}>
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <span className="text-white/80 text-xs font-bold">{bn ? 'বাতিল' : 'Discard'}</span>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-[18px] font-black">Aa</span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-60" />
          </div>
        </div>
        {/* Text content — center, with clipboard fly animation */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-2.5 relative">
          {/* Phase 7: Clipboard fly animation */}
          <motion.div
            className="absolute top-2 left-1/2 -translate-x-1/2"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: [1, 1, 0], y: [0, 40, 60], scale: [1, 0.8, 0.6] }}
            transition={{ duration: 1.2, ease: 'easeIn' }}
          >
            <span className="text-[18px]">📋</span>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center">
            <p className="text-white text-[15px] font-bold leading-relaxed break-all">
              {shareLink.replace('https://', '').replace('http://', '')}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, type: 'spring', stiffness: 300 }}
            className="bg-emerald-400/20 border border-emerald-400/40 rounded-full px-4 py-1.5">
            <span className="text-emerald-300 text-[9px] font-bold">✅ {bn ? 'Link paste হয়েছে!' : 'Link pasted!'}</span>
          </motion.div>
        </div>
        {/* Bottom — Share to Story */}
        <div className="px-3.5 py-3">
          <GlowRing color="rgba(255,255,255,0.3)">
            <div className="bg-white rounded-full py-2.5 text-center">
              <span className="text-[#1877f2] text-[12px] font-bold">{bn ? 'Share to Story' : 'Share to Story'}</span>
            </div>
          </GlowRing>
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 3 — Share confirmation dialog
  if (step === 3) return (
    <PhoneFrame>
      <div className="bg-[#18191a] min-h-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#3a3b3c]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="#e4e6eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[#e4e6eb] text-[13px] font-bold">{bn ? 'Preview' : 'Preview'}</span>
          <span className="w-[18px]" />
        </div>
        {/* Story preview card */}
        <div className="mx-3 mt-3 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1877f2 0%, #6c63ff 100%)' }}>
          <div className="px-4 py-5 flex items-center justify-center">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-white text-[13px] font-bold text-center break-all leading-relaxed">
              {shareLink.replace('https://', '').replace('http://', '')}
            </motion.p>
          </div>
        </div>
        {/* Share options */}
        <div className="px-3 mt-3 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-[#242526] rounded-lg opacity-30">
            <span className="text-[14px]">🌐</span>
            <span className="text-[#e4e6eb] text-[10px]">{bn ? 'সবাই' : 'Public'}</span>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
            className="flex items-center gap-2.5 px-3 py-2 bg-[#1877f2]/15 rounded-lg border border-[#1877f2]/30">
            <span className="text-[14px]">👥</span>
            <span className="text-[#e4e6eb] text-[10px] font-bold">{bn ? 'বন্ধুরা' : 'Friends'}</span>
            <span className="text-[#1877f2] text-[8px] ml-auto">✓</span>
          </motion.div>
        </div>
        {/* Share button */}
        <div className="px-3.5 mt-3 pb-3">
          <GlowRing color="rgba(24,119,242,0.5)">
            <div className="bg-[#1877f2] rounded-full py-2.5 text-center w-full">
              <span className="text-white text-[12px] font-bold">{bn ? 'এখনই Share করো' : 'Share Now'}</span>
            </div>
          </GlowRing>
          <BouncingArrow direction="up" className="!text-sm mt-1 flex justify-center" />
        </div>
      </div>
    </PhoneFrame>
  );

  // Step 4 — Live story with views and reactions
  return (
    <PhoneFrame>
      <div className="bg-[#18191a] min-h-[280px]">
        {/* Story progress bar */}
        <div className="px-3 pt-3">
          <div className="h-[2px] bg-[#3a3b3c] rounded-full overflow-hidden">
            <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'linear' }}
              className="h-full bg-white/80 rounded-full" />
          </div>
        </div>
        {/* Story header — user info */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#3a3b3c] flex items-center justify-center">
            <span className="text-[#e4e6eb] text-[12px]">👤</span>
          </div>
          <div className="flex-1">
            <p className="text-[#e4e6eb] text-[10px] font-bold">{bn ? 'তুমি' : 'You'}</p>
            <p className="text-[#b0b3b8] text-[7px]">{bn ? 'এইমাত্র' : 'Just now'}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="#e4e6eb"/><circle cx="12" cy="12" r="1.5" fill="#e4e6eb"/><circle cx="12" cy="19" r="1.5" fill="#e4e6eb"/></svg>
        </div>
        {/* Story content — gradient with link */}
        <div className="mx-2 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1877f2 0%, #6c63ff 100%)' }}>
          <div className="px-5 py-6 flex items-center justify-center">
            <p className="text-white text-[14px] font-bold text-center break-all leading-relaxed">
              {shareLink.replace('https://', '').replace('http://', '')}
            </p>
          </div>
        </div>
        {/* Bottom — views + reactions */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="#b0b3b8" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3" stroke="#b0b3b8" strokeWidth="1.5"/>
            </svg>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-[#b0b3b8] text-[10px]">
              {bn ? '৫ জন দেখেছে' : '5 viewers'}
            </motion.span>
          </div>
          {/* Reaction emojis floating up */}
          <div className="flex items-center gap-1">
            {['😍', '🔥', '👏'].map((emoji, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, y: 10, scale: 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 1 + i * 0.25, type: 'spring', stiffness: 300 }}
                className="text-[14px]">{emoji}</motion.span>
            ))}
          </div>
        </div>
        {/* Success badge */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.5 }}
          className="mx-3 mb-2 bg-[#1877f2]/15 rounded-full px-3 py-1.5 text-center border border-[#1877f2]/20">
          <span className="text-[#1877f2] text-[9px] font-bold">🎉 {bn ? 'Story লাইভ! বন্ধুরা react করছে' : 'Story is live! Friends are reacting'}</span>
        </motion.div>
      </div>
    </PhoneFrame>
  );
}

const FB_STEPS = {
  bn: [
    { title: '"Create Story" ট্যাপ করো', desc: 'Facebook home → story cards উপরে' },
    { title: '🔗 Text story বাছো', desc: 'Text option ট্যাপ করো — link paste করতে' },
    { title: 'Link paste করো', desc: 'তোর link copy আছে 📋 — paste করো' },
    { title: 'Share to Story চাপো', desc: 'Preview দেখো → Share Now ট্যাপ করো' },
    { title: 'Story লাইভ! 🎉', desc: 'বন্ধুরা দেখছে ও react করছে' },
  ],
  en: [
    { title: 'Tap "Create Story"', desc: 'Facebook home → Story cards at top' },
    { title: 'Choose Text story', desc: 'Tap Text option — to paste your link' },
    { title: 'Paste your link', desc: 'Your link is already copied 📋' },
    { title: 'Tap Share to Story', desc: 'Preview it → tap Share Now' },
    { title: 'Story is live! 🎉', desc: 'Friends are viewing & reacting' },
  ],
};


// ══════════════════════════════════════════════
// Phase 6+10: Tutorial memory + share analytics helpers
// ══════════════════════════════════════════════
const TUT_DONE_KEYS: Record<string, string> = {
  'ig-guide': 'bng_tut_done_ig',
  'wa-status-guide': 'bng_tut_done_wa',
  'fb-guide': 'bng_tut_done_fb',
};
const SHARE_STATS_KEY = 'bng_share_stats';

function isTutorialDone(scr: string): boolean {
  try { return !!(TUT_DONE_KEYS[scr] && localStorage.getItem(TUT_DONE_KEYS[scr])); } catch { return false; }
}
function markTutorialDone(scr: string) {
  gEvent('ngl_tutorial_complete', { platform: scr });
  try { const k = TUT_DONE_KEYS[scr]; if (k) localStorage.setItem(k, '1'); } catch {}
  // Phase 10: Clear resume data on completion
  try { localStorage.removeItem('bng_tut_resume_' + scr); } catch {}
}
function getResumeStep(scr: string): number | null {
  try {
    const raw = localStorage.getItem('bng_tut_resume_' + scr);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Only resume if < 30 min old and step is valid (1-4, never step 0)
    if (data.step > 0 && data.step <= 4 && Date.now() - data.ts < 30 * 60 * 1000) return data.step;
    localStorage.removeItem('bng_tut_resume_' + scr);
  } catch {}
  return null;
}
function trackShare(platform: string) {
  try {
    const raw = localStorage.getItem(SHARE_STATS_KEY);
    const stats: Record<string, number> = raw ? JSON.parse(raw) : {};
    stats[platform] = (stats[platform] || 0) + 1;
    localStorage.setItem(SHARE_STATS_KEY, JSON.stringify(stats));
  } catch {}
}
function getMostUsedPlatform(): string | null {
  try {
    const raw = localStorage.getItem(SHARE_STATS_KEY);
    if (!raw) return null;
    const stats: Record<string, number> = JSON.parse(raw);
    let max = 0, top: string | null = null;
    for (const [k, v] of Object.entries(stats)) { if (v > max) { max = v; top = k; } }
    return max >= 2 ? top : null;
  } catch { return null; }
}

// Phase 8: Deep link configs
const DEEP_LINKS: Record<string, { native: string; web: string; label: string }> = {
  'ig-guide': { native: 'instagram://story-camera', web: 'https://www.instagram.com', label: 'Instagram' },
  'wa-status-guide': { native: 'whatsapp://status', web: 'https://web.whatsapp.com', label: 'WhatsApp' },
  'fb-guide': { native: 'fb://story/create', web: 'https://www.facebook.com', label: 'Facebook' },
};

// Phase 21: GA4 event helper
const gEvent = (name: string, params?: Record<string, string>) => { try { (window as any).gtag?.('event', name, params); } catch {} };

// ══════════════════════════════════════════════
// MAIN SHARE MODAL
// ══════════════════════════════════════════════
export default function ShareModal({ isOpen, onClose, shareLink, username, theme, lang, t, shareTemplates, onOpenStoryPreview, onGenerateCard, storyPreviewUrl, initialScreen = 'picker' }: ShareModalProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [quickMode, setQuickMode] = useState(false);
  const [showCopyAnim, setShowCopyAnim] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [pauseFlash, setPauseFlash] = useState<'pause' | 'play' | null>(null);
  const [langOverride, setLangOverride] = useState<'bn' | 'en' | null>(null);
  const [step5Expanded, setStep5Expanded] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const step5PhoneRef = useRef<HTMLDivElement>(null);
  const lastTapTimeRef = useRef(0);

  // Phase 16: Theme-aware accent colors for decorative elements
  const THEME_ACCENTS: Record<string, { gradient: string; shadow: string }> = {
    default: { gradient: 'from-pink-500 via-orange-400 to-yellow-400', shadow: 'shadow-pink-500/20' },
    pink: { gradient: 'from-pink-500 via-rose-400 to-orange-400', shadow: 'shadow-pink-500/20' },
    blue: { gradient: 'from-blue-500 via-indigo-400 to-violet-400', shadow: 'shadow-blue-500/20' },
    green: { gradient: 'from-emerald-500 via-teal-400 to-cyan-400', shadow: 'shadow-emerald-500/20' },
    purple: { gradient: 'from-violet-500 via-purple-400 to-fuchsia-400', shadow: 'shadow-violet-500/20' },
    gold: { gradient: 'from-amber-500 via-orange-400 to-red-400', shadow: 'shadow-amber-500/20' },
    dark: { gradient: 'from-indigo-400 via-violet-300 to-blue-400', shadow: 'shadow-indigo-500/20' },
  };
  const themeAccent = THEME_ACCENTS[theme] || THEME_ACCENTS.default;

  // Phase 17: Platform-colored glow for PhoneFrame
  const PLATFORM_GLOW: Record<string, string> = {
    'ig-guide': 'rgba(228,64,95,0.15)',
    'wa-status-guide': 'rgba(37,211,102,0.15)',
    'fb-guide': 'rgba(24,119,242,0.15)',
  };
  const phoneGlow = PLATFORM_GLOW[screen] || undefined;

  // Phase 16: Auto-scroll to phone when arriving at Step 5; reset expanded when leaving
  useEffect(() => {
    if (tutorialStep === 4 && screen === 'ig-guide' && step5PhoneRef.current) {
      setTimeout(() => step5PhoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
    if (tutorialStep !== 4) setStep5Expanded(false);
  }, [tutorialStep, screen]);

  // Phase 10: Save tutorial progress mid-session for resume
  useEffect(() => {
    if (screen && TUT_DONE_KEYS[screen] && tutorialStep > 0) {
      gEvent('ngl_tutorial_step', { platform: screen, step: String(tutorialStep) });
      try { localStorage.setItem('bng_tut_resume_' + screen, JSON.stringify({ step: tutorialStep, ts: Date.now() })); } catch {}
    }
  }, [tutorialStep, screen]);

  // Phase 20: Keyboard nav — Escape closes expanded, arrows navigate steps
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step5Expanded) { setStep5Expanded(false); return; }
      if (e.key === 'ArrowRight') { setTutorialStep(s => Math.min(s + 1, 4)); }
      if (e.key === 'ArrowLeft') { setTutorialStep(s => Math.max(s - 1, 0)); }
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, step5Expanded]);
  const mobile = isMobile();
  const effectiveLang = langOverride || lang;
  const bn = effectiveLang === 'bn';
  const mostUsed = getMostUsedPlatform();

  const togglePause = () => {
    setAutoAdvancePaused(p => {
      const next = !p;
      setPauseFlash(next ? 'pause' : 'play');
      setTimeout(() => setPauseFlash(null), 600);
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) {
      gEvent('ngl_share_modal_open');
      setScreen(initialScreen);
      setTutorialStep(0);
      setCopied(false);
      setToastMsg(null);
      setStep5Expanded(false);
      // Auto-generate story card for any story tutorial so it's ready by last step
      if (initialScreen === 'ig-guide' || initialScreen === 'wa-status-guide' || initialScreen === 'fb-guide') {
        onGenerateCard?.();
      }
    }
  }, [isOpen, initialScreen]);

  const showToast = (msg: string, duration = 2500) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), duration); };

  const copyLink = async () => {
    await clipCopy(shareLink);
    setCopied(true);
    showToast(bn ? '✓ Link কপি হয়েছে! যেকোনো chat-এ paste করো ✨' : '✓ Link copied! Paste in any chat for a rich preview ✨', 3500);
    setTimeout(() => setCopied(false), 2500);
  };

  const getShareText = () => shareTemplates[Math.floor(Math.random() * shareTemplates.length)];

  const goBack = () => {
    if (screen === 'wa-chat-guide' || screen === 'telegram-guide' || screen === 'twitter-guide') {
      setScreen(screen === 'wa-chat-guide' ? 'whatsapp' : 'picker');
      setTutorialStep(0);
    } else if (screen === 'whatsapp' || screen === 'wa-status-guide' || screen === 'ig-guide' || screen === 'fb-guide') {
      setScreen('picker');
      setTutorialStep(0);
    } else onClose();
  };

  // Phase 5: Smart open — try native deep link on mobile, fallback to web URL
  const smartOpen = (nativeUrl: string, webUrl: string) => {
    if (!mobile) { window.open(webUrl, '_blank'); gEvent('ngl_open_app', { platform: screen, mode: 'desktop' }); return; }
    // Try native deep link first
    const start = Date.now();
    const w = window.open(nativeUrl, '_blank');
    gEvent('ngl_open_app', { platform: screen, mode: 'mobile' });
    // Phase 22: Track return from external app
    const onReturn = () => {
      if (document.visibilityState === 'visible') {
        gEvent('ngl_return_from_app', { platform: screen });
        document.removeEventListener('visibilitychange', onReturn);
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    setTimeout(() => document.removeEventListener('visibilitychange', onReturn), 120000);
    // If native scheme fails (no app), the window either closes fast or never opens
    // Fallback after a short delay
    setTimeout(() => {
      if (!w || w.closed || (Date.now() - start < 1800)) {
        window.open(webUrl, '_blank');
      }
    }, 1500);
  };

  const startTutorial = async (target: Screen) => {
    await clipCopy(shareLink);
    setCopied(true);
    // Phase 10: Check for mid-tutorial resume
    const resumeStep = getResumeStep(target);
    setTutorialStep(resumeStep ?? 0);
    if (resumeStep) showToast(bn ? `⏩ ধাপ ${resumeStep + 1} থেকে আবার শুরু` : `⏩ Resuming from step ${resumeStep + 1}`, 2500);
    // Phase 6: Check if user completed this tutorial before
    setQuickMode(isTutorialDone(target));
    gEvent('ngl_platform_select', { platform: target });
    setScreen(target);
    // Phase 9: Show animated copy confirmation
    setShowCopyAnim(true);
    setTimeout(() => setShowCopyAnim(false), 1200);
    // Pre-generate story card silently so it's ready by the last step
    if (target === 'ig-guide') onGenerateCard?.();
  };

  // Phase 5: Open chat app with native deep link (mobile) → web fallback (desktop)
  const openWaChat = () => {
    const text = getShareText();
    const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (mobile) {
      smartOpen(`whatsapp://send?text=${encodeURIComponent(text)}`, webUrl);
    } else { window.open(webUrl, '_blank'); }
  };
  const openTelegram = () => {
    const tgText = bn ? 'আমাকে anonymous message পাঠাও 👀' : 'Send me anonymous messages 👀';
    const webUrl = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(tgText)}`;
    if (mobile) {
      smartOpen(`tg://msg_url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(tgText)}`, webUrl);
    } else { window.open(webUrl, '_blank'); }
  };
  const openTwitter = () => {
    const text = getShareText();
    const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (mobile) {
      smartOpen(`twitter://post?message=${encodeURIComponent(text)}`, webUrl);
    } else { window.open(webUrl, '_blank'); }
  };

  const getTutorialData = () => {
    const l = effectiveLang as 'bn' | 'en';
    switch (screen) {
      case 'ig-guide': return { steps: IG_STEPS[l], total: 5, Comp: IgTutorial };
      case 'wa-status-guide': return { steps: WA_STATUS_STEPS[l], total: 5, Comp: WaStatusTutorial };
      case 'fb-guide': return { steps: FB_STEPS[l], total: 5, Comp: FbTutorial };
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md">
              {/* Toast */}
              <AnimatePresence>
                {toastMsg && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.9 }}
                    className="mb-3 bg-emerald-500/15 text-emerald-300 text-[11px] font-bold px-4 py-2 rounded-xl border border-emerald-400/15 text-center">
                    {toastMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div key={screen} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}>

                  {/* ══════════ PICKER — game-like bouncy layout ══════════ */}
                  {screen === 'picker' && (
                    <div className="space-y-5 pb-1">
                      {/* Header — personality, not tech */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.04, duration: 0.3 }}
                        className="text-center"
                      >
                        <h3 className="text-white/90 text-[17px] font-black">
                          {bn ? 'কোথায় পাঠাবে?' : 'Where to?'} 🚀
                        </h3>
                      </motion.div>

                      {/* ── Primary platforms — BIG bouncy gradient circles ── */}
                      <div className="flex justify-center items-end gap-5 sm:gap-7 pt-1">
                        {/* Instagram */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 40 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 22 }}
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => startTutorial('ig-guide')}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-white/80 text-[11px] font-bold leading-tight">Instagram</p>
                            <p className="text-white/25 text-[8px]">Story</p>
                            {mostUsed === 'ig' && <span className="text-yellow-400 text-[7px] font-bold">⭐ Popular</span>}
                          </div>
                        </motion.button>

                        {/* WhatsApp */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 40 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.16, type: 'spring', stiffness: 400, damping: 22 }}
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => setScreen('whatsapp')}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          </div>
                          <p className="text-white/80 text-[11px] font-bold">WhatsApp</p>
                          {mostUsed === 'wa-status' && <span className="text-yellow-400 text-[7px] font-bold">⭐ Popular</span>}
                        </motion.button>

                        {/* Facebook */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 40 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.24, type: 'spring', stiffness: 400, damping: 22 }}
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.04 }}
                          onClick={() => startTutorial('fb-guide')}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1877f2, #0a5dc2)' }}>
                            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          </div>
                          <div className="text-center">
                            <p className="text-white/80 text-[11px] font-bold leading-tight">Facebook</p>
                            <p className="text-white/25 text-[8px]">Story</p>
                            {mostUsed === 'fb' && <span className="text-yellow-400 text-[7px] font-bold">⭐ Popular</span>}
                          </div>
                        </motion.button>
                      </div>

                      {/* ── Secondary row — smaller circles, staggered pop ── */}
                      <div className="flex justify-center items-end gap-4 sm:gap-6">
                        {/* Telegram */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 25 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.32, type: 'spring', stiffness: 400, damping: 16 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => startTutorial('telegram-guide')}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#2AABEE]/20 flex items-center justify-center border border-sky-400/15">
                            <svg viewBox="0 0 24 24" fill="#2AABEE" className="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                          </div>
                          <p className="text-sky-400 text-[9px] font-bold">Telegram</p>
                        </motion.button>

                        {/* Twitter/X */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 25 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.38, type: 'spring', stiffness: 400, damping: 16 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => startTutorial('twitter-guide')}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/[0.08] flex items-center justify-center border border-white/[0.08]">
                            <span className="text-white/60 text-lg font-black">𝕏</span>
                          </div>
                          <p className="text-white/50 text-[9px] font-bold">Twitter/X</p>
                        </motion.button>

                        {/* Copy Link */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 25 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.44, type: 'spring', stiffness: 400, damping: 16 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={copyLink}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center border transition-colors ${copied ? 'bg-emerald-500/20 border-emerald-400/20' : 'bg-white/[0.06] border-white/[0.06]'}`}>
                            <span className="text-lg">{copied ? '✅' : '📋'}</span>
                          </div>
                          <p className={`text-[9px] font-bold ${copied ? 'text-emerald-400' : 'text-white/50'}`}>{copied ? (bn ? 'কপি ✓' : 'Copied ✓') : (bn ? 'কপি' : 'Copy')}</p>
                        </motion.button>

                        {/* Story Card */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0, y: 25 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.50, type: 'spring', stiffness: 400, damping: 16 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={() => { gEvent('ngl_skip_to_story_card', { source: 'picker' }); onOpenStoryPreview(); onClose(); }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-violet-500/15 flex items-center justify-center border border-violet-400/15">
                            <span className="text-lg">📸</span>
                          </div>
                          <p className="text-violet-400 text-[9px] font-bold">Story Card</p>
                        </motion.button>
                      </div>

                      {/* Link bar — ghost, subtle */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="flex justify-center"
                      >
                        <button onClick={onClose} className="text-white/20 hover:text-white/40 text-[10px] font-medium transition-colors">
                          {bn ? '✕ বন্ধ করো' : '✕ close'}
                        </button>
                      </motion.div>
                    </div>
                  )}


                  {/* ══════════ WHATSAPP CHOICE ══════════ */}
                  {screen === 'whatsapp' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button onClick={goBack} className="text-white/40 hover:text-white/70 text-sm">←</button>
                        <h3 className="text-white/90 text-[15px] font-bold">💬 WhatsApp</h3>
                      </div>
                      <p className="text-white/40 text-[11px]">{bn ? 'কোথায় share করবে?' : 'Where do you want to share?'}</p>

                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => startTutorial('wa-chat-guide')}
                        className="w-full bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4 flex items-center gap-4 hover:bg-emerald-500/20 transition-all">
                        <span className="text-3xl">💬</span>
                        <div className="text-left flex-1">
                          <p className="text-emerald-400 text-[13px] font-bold">{bn ? 'Chat-এ পাঠাও' : 'Send in Chat'}</p>
                          <p className="text-white/30 text-[10px] mt-0.5">{bn ? 'friend/group-এ link + preview' : 'friend/group — link preview shows'}</p>
                        </div>
                        <span className="text-white/20">→</span>
                      </motion.button>

                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => startTutorial('wa-status-guide')}
                        className="w-full bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4 flex items-center gap-4 hover:bg-emerald-500/20 transition-all">
                        <span className="text-3xl">📖</span>
                        <div className="text-left flex-1">
                          <p className="text-emerald-400 text-[13px] font-bold">{bn ? 'Status-এ দাও' : 'Post on Status'}</p>
                          <p className="text-white/30 text-[10px] mt-0.5">{bn ? 'step by step guide দেখাবো' : 'step by step guide included'}</p>
                        </div>
                        <span className="text-white/20">→</span>
                      </motion.button>
                    </div>
                  )}


                  {/* ══════════ CHAT GUIDES (WA/TG/Twitter) ══════════ */}
                  {/* No auto-redirect! Shows share text first, then CTA */}
                  {(screen === 'wa-chat-guide' || screen === 'telegram-guide' || screen === 'twitter-guide') && (() => {
                    const platformName = screen === 'wa-chat-guide' ? 'WhatsApp' : screen === 'telegram-guide' ? 'Telegram' : 'Twitter/X';
                    const platformIcon = screen === 'wa-chat-guide' ? '💬' : screen === 'telegram-guide' ? '✈️' : '𝕏';
                    const openFn = screen === 'wa-chat-guide' ? openWaChat : screen === 'telegram-guide' ? openTelegram : openTwitter;
                    const accentBg = screen === 'wa-chat-guide' ? 'bg-[#00a884]' : screen === 'telegram-guide' ? 'bg-[#2AABEE]' : 'bg-white/90';
                    const accentText = screen === 'twitter-guide' ? 'text-black' : 'text-white';
                    const shareText = getShareText();
                    const shortLink = shareLink.replace('https://www.', '').replace('https://', '').replace('http://', '');

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <button onClick={goBack} className="text-white/40 hover:text-white/70 text-sm">←</button>
                          <h3 className="text-white/90 text-[15px] font-bold">{platformIcon} {platformName}</h3>
                        </div>

                        {/* What will be shared */}
                        <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
                          <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-2">
                            {bn ? '📝 এই message পাঠানো হবে:' : '📝 This message will be sent:'}
                          </p>
                          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.04]">
                            <p className="text-white/70 text-[11px] leading-relaxed whitespace-pre-line">{shareText}</p>
                          </div>
                        </div>

                        {/* How it works */}
                        <div className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06]">
                          <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-2">
                            {bn ? '✨ বন্ধুরা এরকম দেখবে:' : '✨ Your friends will see:'}
                          </p>
                          <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${themeAccent.gradient} flex-shrink-0 flex items-center justify-center mt-0.5`}>
                              <span className="text-white text-[10px] font-bold">B</span>
                            </div>
                            <div className="flex-1 bg-white/[0.06] rounded-xl rounded-tl-sm p-2.5">
                              <p className="text-white/50 text-[9px] font-bold mb-1">bongbari.com</p>
                              <p className="text-white/80 text-[10px] font-bold">
                                {bn ? `@${username} কে anonymous message পাঠাও` : `Send @${username} anonymous messages`}
                              </p>
                              <p className="text-white/30 text-[9px] mt-1">{shortLink}</p>
                            </div>
                          </div>
                          <p className="text-white/20 text-[8px] mt-2 text-center italic">
                            {bn ? '↑ link preview automatic আসবে' : '↑ link preview appears automatically'}
                          </p>
                        </div>

                        {/* CTA — different for mobile vs desktop */}
                        {mobile ? (
                          <div className="space-y-2">
                            <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await clipCopy(shareText); showToast(bn ? '✓ Link কপি ও app খুলছে...' : '✓ Copied & opening app...'); openFn(); }}
                              className={`w-full ${accentBg} ${accentText} font-extrabold py-3.5 rounded-2xl text-[12px] hover:brightness-110 transition-all shadow-lg`}>
                              {bn ? `📤 ${platformName} খোলো` : `📤 Open ${platformName}`}
                            </motion.button>
                            <p className="text-white/20 text-[8px] text-center">
                              {bn ? '💡 message auto-paste হবে' : '💡 message is ready to paste'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <motion.button whileTap={{ scale: 0.97 }} onClick={async () => { await clipCopy(shareText); showToast(bn ? '✓ Message কপি হয়েছে!' : '✓ Message copied!'); }}
                              className="w-full bg-white/[0.08] text-white font-bold py-3.5 rounded-2xl text-[12px] hover:bg-white/[0.12] transition-all border border-white/[0.08]">
                              📋 {bn ? 'Message কপি করো' : 'Copy Message'}
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => { openFn(); }}
                              className="w-full bg-white/[0.04] text-white/50 font-bold py-2.5 rounded-2xl text-[10px] hover:bg-white/[0.08] transition-all border border-white/[0.04]">
                              🌐 {bn ? `${platformName === 'WhatsApp' ? 'WhatsApp Web' : platformName} খোলো` : `Open ${platformName === 'WhatsApp' ? 'WhatsApp Web' : platformName}`}
                            </motion.button>
                            <p className="text-white/20 text-[8px] text-center leading-relaxed">
                              💻 {bn
                                ? `Message কপি করে paste করো`
                                : `Copy the message above and paste it`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}


                  {/* ══════════ STORY TUTORIALS (IG/WA Status/FB) ══════════ */}
                  {(screen === 'ig-guide' || screen === 'wa-status-guide' || screen === 'fb-guide') && (() => {
                    const data = getTutorialData();
                    if (!data) return null;
                    const { steps, total, Comp } = data;
                    const isLast = tutorialStep >= total - 1;
                    const stepData = steps[tutorialStep];
                    const deepLink = DEEP_LINKS[screen];

                    // Phase 7: Swipe handlers
                    const onSwipeStart = (e: React.TouchEvent) => {
                      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    };
                    const onSwipeEnd = (e: React.TouchEvent) => {
                      if (!touchRef.current) return;
                      const dx = e.changedTouches[0].clientX - touchRef.current.x;
                      const dy = e.changedTouches[0].clientY - touchRef.current.y;
                      touchRef.current = null;
                      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                        if (dx < 0 && tutorialStep < total - 1) {
                          setTutorialStep(s => s + 1);
                        } else if (dx > 0 && tutorialStep > 0) {
                          setTutorialStep(s => s - 1);
                        }
                      }
                    };

                    // Phase 6+10+17: Complete action (mark done + track + celebrate + navigate)
                    const onComplete = (action: 'app' | 'card') => {
                      markTutorialDone(screen);
                      trackShare(screen.replace('-guide', ''));
                      // Phase 10+17: Show celebration with stronger feedback
                      setShowCelebration(true);
                      try { navigator.vibrate?.([50, 30, 50]); } catch {}
                      const platformEmoji = screen === 'ig-guide' ? '📸' : screen === 'wa-status-guide' ? '💬' : '🔵';
                      showToast(`${platformEmoji} ${bn ? 'তুমি রেডি! 🚀' : "You're all set! 🚀"}`, 3000);
                      setTimeout(() => {
                        setShowCelebration(false);
                        if (action === 'app' && deepLink) {
                          smartOpen(deepLink.native, deepLink.web);
                        } else {
                          onOpenStoryPreview(); onClose();
                        }
                      }, 1500);
                    };

                    // Phase 6: Quick mode for returning users
                    if (quickMode && tutorialStep === 0) return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <button onClick={goBack} className="text-white/40 hover:text-white/70 text-sm">←</button>
                          <h3 className="text-white/90 text-[14px] font-bold flex-1">
                            {screen === 'ig-guide' ? '📸 Instagram' : screen === 'wa-status-guide' ? '📖 WhatsApp' : '🔵 Facebook'}
                          </h3>
                        </div>
                        <div className="text-center py-4">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                            <span className="text-4xl">✅</span>
                          </motion.div>
                          <p className="text-white/80 text-[14px] font-bold mt-3">
                            {bn ? 'তুমি এটা আগে করেছো!' : "You've done this before!"}
                          </p>
                          <p className="text-emerald-400 text-[11px] mt-1">
                            ✓ {bn ? 'Link copy আছে — সরাসরি paste করো' : 'Link copied — just paste it'}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {deepLink && (
                            <motion.button whileTap={{ scale: 0.97 }}
                              onClick={() => onComplete('app')}
                              className={`w-full bg-gradient-to-r ${themeAccent.gradient} text-white font-bold py-2 rounded-xl text-[10px] hover:brightness-110 transition-all shadow-md`}>
                              📲 {bn ? `${deepLink.label} খোলো` : `Open ${deepLink.label}`}
                            </motion.button>
                          )}
                          <button onClick={() => onComplete('card')}
                            className="w-full bg-white/[0.06] text-white/60 font-semibold py-1.5 rounded-xl text-[9px] hover:bg-white/[0.1] transition-all">
                            📸 {bn ? 'Story Card বানাও' : 'Create Story Card'}
                          </button>
                          <button onClick={() => setQuickMode(false)}
                            className="w-full text-white/20 text-[8px] font-medium text-center hover:text-white/35 transition-colors">
                            {bn ? 'সব ধাপ দেখাও →' : 'Show all steps →'}
                          </button>
                        </div>
                      </div>
                    );

                    return (
                      <div className="space-y-1.5 relative">
                        {/* Phase 10: Celebration overlay */}
                        <AnimatePresence>
                          {showCelebration && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl overflow-hidden">
                              {/* Confetti particles */}
                              {Array.from({ length: 20 }).map((_, i) => (
                                <motion.div key={i}
                                  className="absolute w-2 h-2 rounded-full"
                                  style={{ background: ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][i % 6], left: `${10 + Math.random() * 80}%` }}
                                  initial={{ top: '50%', opacity: 1, scale: 0 }}
                                  animate={{ top: `${-10 + Math.random() * 30}%`, opacity: [1, 1, 0], scale: [0, 1, 0.5], x: (Math.random() - 0.5) * 100 }}
                                  transition={{ duration: 1 + Math.random() * 0.5, delay: Math.random() * 0.3, ease: 'easeOut' }}
                                />
                              ))}
                              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5 }}
                                className="text-center z-10">
                                <span className="text-5xl block">🎉</span>
                                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                  className="text-white font-bold text-[15px] mt-2">
                                  {bn ? 'তুমি তৈয়ার! 🚀' : "You're all set! 🚀"}
                                </motion.p>
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.5 }}
                                  className="text-white/60 text-[11px] mt-1">
                                  {bn ? 'এখন Story পোস্ট করো' : 'Now post your Story'}
                                </motion.p>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Phase 9: Copy animation overlay */}
                        <AnimatePresence>
                          {showCopyAnim && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
                              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.6 }}
                                className="bg-emerald-500/20 rounded-3xl p-6 border border-emerald-400/20 text-center">
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                                  className="text-4xl block">✅</motion.span>
                                <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                  className="text-emerald-300 text-[12px] font-bold mt-2">
                                  {bn ? 'Link কপি হয়ে গেছে!' : 'Link copied!'}
                                </motion.p>
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                  className="text-white/40 text-[9px] mt-1">
                                  {bn ? 'এবার follow করো ↓' : 'Now follow the steps ↓'}
                                </motion.p>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2">
                          <button onClick={goBack} className="bg-white/[0.06] hover:bg-white/[0.12] text-white/50 hover:text-white/80 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all flex items-center gap-1">
                            <span className="text-[9px]">←</span> {bn ? 'পিছনে' : 'Back'}
                          </button>
                          <h3 className="text-white/80 text-[12px] font-bold flex-1 text-center">
                            {screen === 'ig-guide' ? '📸 Instagram Story' : screen === 'wa-status-guide' ? '📖 WhatsApp Status' : '🔵 Facebook Story'}
                          </h3>
                          <span className="text-emerald-400/60 text-[7px] font-bold w-10 text-right">{copied ? (bn ? '✓ কপি' : '✓ copied') : ''}</span>
                        </div>

                        {/* Progress bar — clickable segments + controls */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {/* Pause/Play button */}
                            <button onClick={togglePause} className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors" title={autoAdvancePaused ? 'Play (Space)' : 'Pause (Space)'}>
                              <span className="text-white/40 text-[8px]">{autoAdvancePaused ? '▶' : '⏸'}</span>
                            </button>
                            {/* Bars */}
                            <div className="flex gap-1 flex-1">
                              {Array.from({ length: total }).map((_, i) => (
                                <div key={i} className="flex-1 h-[5px] rounded-full bg-white/10 overflow-hidden cursor-pointer"
                                  onClick={() => { setTutorialStep(i); setAutoAdvancePaused(true); }}>
                                  {i < tutorialStep ? (
                                    <div className="w-full h-full bg-white/70 rounded-full" />
                                  ) : i === tutorialStep ? (
                                    <motion.div key={`bar-${tutorialStep}-${autoAdvancePaused}`} initial={{ width: '0%' }} animate={{ width: autoAdvancePaused ? undefined : '100%' }}
                                      transition={{ duration: 6, ease: 'linear' }} className="h-full rounded-full bg-white/80"
                                      onAnimationComplete={() => {
                                        if (!autoAdvancePaused && !isLast) {
                                          setTutorialStep(s => s + 1);
                                          try { navigator.vibrate?.(10); } catch {}
                                        }
                                      }}
                                    />
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            {/* Step counter */}
                            <span className="text-white/25 text-[8px] font-mono flex-shrink-0">{tutorialStep + 1}/{total}</span>
                          </div>
                          {/* Language toggle */}
                          <div className="flex items-center justify-center">
                            <div className="inline-flex bg-white/[0.04] rounded-full p-0.5 gap-0.5">
                              <button onClick={() => setLangOverride('en')} className={`text-[7px] px-2 py-0.5 rounded-full font-medium transition-all ${effectiveLang === 'en' ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/40'}`}>EN</button>
                              <button onClick={() => setLangOverride('bn')} className={`text-[7px] px-2 py-0.5 rounded-full font-medium transition-all ${effectiveLang === 'bn' ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/40'}`}>বাং</button>
                            </div>
                          </div>
                        </div>

                        <div className="text-center flex flex-col items-center justify-center">
                          <h4 className="text-white/90 text-[12px] font-bold leading-tight">{stepData.title}</h4>
                          <p className="text-white/40 text-[9px] mt-0.5 leading-snug max-w-[280px]">{stepData.desc}</p>
                        </div>
                        {/* Step 4 (index 3): Copy link pill */}
                        <div className={`${tutorialStep === 3 ? 'min-h-[24px]' : ''} flex items-center justify-center`}>
                          {screen === 'ig-guide' && tutorialStep === 3 && (
                            <div className="flex items-center justify-center gap-2">
                              <code className="text-emerald-300 text-[9px] bg-white/[0.06] px-2 py-1 rounded-lg break-all max-w-[160px] truncate">{shareLink}</code>
                              <button onClick={async () => { await clipCopy(shareLink); setCopied(true); showToast(bn ? '✅ Link কপি হয়ে গেছে!' : '✅ Link copied!'); }}
                                className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg font-bold hover:bg-emerald-500/30 transition-colors flex-shrink-0">
                                {bn ? '📋 কপি' : '📋 Copy'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded phone overlay — double-tap to enter, Escape/tap-outside to exit */}
                        <AnimatePresence>
                          {step5Expanded && screen === 'ig-guide' && tutorialStep === 4 && (
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md"
                              onClick={(e) => { if (e.target === e.currentTarget) setStep5Expanded(false); }}
                            >
                              <motion.div
                                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                className="relative"
                                style={phoneGlow ? { filter: `drop-shadow(0 0 30px ${phoneGlow})` } : undefined}
                              >
                                {/* Close hint */}
                                <motion.div
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                  className="absolute -top-8 left-0 right-0 text-center"
                                >
                                  <span className="text-white/30 text-[9px]">{bn ? 'বাইরে ট্যাপ করো বা Esc চাপো' : 'Tap outside or press Esc to close'}</span>
                                </motion.div>
                                <IgTutorial step={4} shareLink={shareLink} lang={effectiveLang} username={username} storyPreviewUrl={storyPreviewUrl} expanded={true} />
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Mockup — fixed-width container with stable arrows */}
                        {!(step5Expanded && screen === 'ig-guide' && tutorialStep === 4) && (
                          <div className="relative max-w-[340px] md:max-w-[420px] mx-auto"
                            onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}
                          >
                            {/* Pause flash overlay — IG Stories style */}
                            <AnimatePresence>
                              {pauseFlash && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.25 }}
                                  className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
                                >
                                  <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                    <span className="text-white/80 text-lg">{pauseFlash === 'pause' ? '⏸' : '▶'}</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Left arrow */}
                            {tutorialStep > 0 && (
                              <button
                                onClick={() => setTutorialStep(s => s - 1)}
                                style={{ position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', zIndex: 40, padding: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255,255,255,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                              </button>
                            )}

                            <div className="flex justify-center items-center" ref={step5PhoneRef}
                              onClick={() => {
                                // Step 4 (IG only): double-tap to expand/maximize
                                if (screen === 'ig-guide' && tutorialStep === 4) {
                                  const now = Date.now();
                                  if (now - lastTapTimeRef.current < 350) {
                                    setStep5Expanded(e => !e);
                                    lastTapTimeRef.current = 0;
                                    return;
                                  }
                                  lastTapTimeRef.current = now;
                                }
                                togglePause();
                              }}
                              style={phoneGlow ? { filter: `drop-shadow(0 0 30px ${phoneGlow})` } : undefined}
                            >
                              <AnimatePresence mode="wait">
                                <motion.div key={tutorialStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.18, ease: 'easeOut' }}>
                                  <Comp step={tutorialStep} shareLink={shareLink} lang={effectiveLang} username={username} storyPreviewUrl={storyPreviewUrl} onOpenStoryPreview={onOpenStoryPreview} onClose={onClose} expanded={screen === 'ig-guide' && tutorialStep === 4 ? step5Expanded : undefined} />
                                </motion.div>
                              </AnimatePresence>
                            </div>

                            {/* Right arrow */}
                            {!isLast && (
                              <button
                                onClick={() => setTutorialStep(s => s + 1)}
                                style={{ position: 'absolute', right: -40, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', zIndex: 40, padding: 0 }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255,255,255,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Double-tap hint for Step 5 (IG only) */}
                        {screen === 'ig-guide' && tutorialStep === 4 && !step5Expanded && (
                          <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                            className="text-white/15 text-[7px] text-center mt-0.5"
                          >
                            {bn ? 'ডবল ট্যাপ করো বড় করতে' : 'Double-tap to expand'}
                          </motion.p>
                        )}

                        {/* Slim nav: primary CTA on last step + Story Card link */}
                        <div className="flex flex-col gap-1 min-h-[36px] mt-1">
                          {isLast && deepLink && (
                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onComplete('app')}
                              className={`w-full bg-gradient-to-r ${themeAccent.gradient} text-white font-bold py-2.5 rounded-xl text-[11px] hover:brightness-110 transition-all shadow-lg ${themeAccent.shadow}`}>
                              📲 {bn ? `${deepLink.label} খোলো` : `Open ${deepLink.label}`}
                            </motion.button>
                          )}
                          <button onClick={() => { gEvent('ngl_skip_to_story_card', { source: 'tutorial' }); if (isLast) onComplete('card'); else { onOpenStoryPreview(); onClose(); } }}
                            className="w-full text-white/20 text-[8px] font-medium text-center hover:text-white/35 transition-colors">
                            📸 {bn ? 'Story Card' : 'Story Card'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
