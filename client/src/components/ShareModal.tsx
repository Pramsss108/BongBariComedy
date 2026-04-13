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
    ? 'w-[280px] sm:w-[340px] md:w-[380px]'
    : 'w-[200px] sm:w-[220px] md:w-[240px] lg:w-[280px]';
  const innerH = expanded ? 'h-[480px] sm:h-[580px] md:h-[640px]' : 'h-[290px] sm:h-[320px] md:h-[340px]';
  return (
    <div className={`relative mx-auto ${sizeClass} rounded-[28px] border-[2.5px] border-white/[0.08] bg-black overflow-hidden shadow-2xl shadow-black/60 ${className}`}
      style={glowColor ? { boxShadow: `0 0 40px ${glowColor}, 0 25px 50px -12px rgba(0,0,0,0.6)` } : undefined}>
      <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-16 h-[18px] bg-black rounded-full z-20 border border-white/[0.04]" />
      <div className={`relative pt-7 pb-2 ${innerH}`}>{children}</div>
    </div>
  );
}

// ── Phase 20: Shared animation constants ──
const ANIM = { ENTRY_DELAY: 0.3, BOUNCE_DUR: 1.2, GLOW_DUR: 2.0, ENTRY_DUR: 0.5 } as const;

function BouncingArrow({ direction = 'down', className = '' }: { direction?: 'down' | 'up' | 'right'; className?: string }) {
  const emoji = direction === 'up' ? '👆' : direction === 'right' ? '👉' : '👇';
  const bounce = direction === 'up' ? { y: [0, -6, 0] } : direction === 'right' ? { x: [0, 6, 0] } : { y: [0, 6, 0] };
  return (
    <motion.div animate={bounce} transition={{ duration: ANIM.BOUNCE_DUR, repeat: Infinity }}
      className={`text-yellow-400 text-lg ${className}`}>{emoji}</motion.div>
  );
}

function GlowRing({ children, color = 'rgba(0,149,246,0.4)' }: { children: React.ReactNode; color?: string }) {
  return (
    <motion.div
      animate={{ boxShadow: [`0 0 0 0px ${color}`, `0 0 0 5px transparent`, `0 0 0 0px ${color}`] }}
      transition={{ duration: ANIM.GLOW_DUR, repeat: Infinity }}
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
      <div className="bg-[#0a0a0a] h-full overflow-hidden">
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
          {/* Phase 7: Clipboard fly into URL field — auto-loops */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 1, y: -10, scale: 1 }}
            animate={{ opacity: [1, 1, 0], y: [-10, 20, 30], scale: [1, 0.8, 0.5] }}
            transition={{ duration: 1, ease: 'easeIn', repeat: Infinity, repeatDelay: 3 }}
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

        {/* ── IG bottom bar — ALWAYS visible with "Your stories" highlighted ── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-1.5 pb-1.5">
          {/* Instruction hint */}
          <div className="flex justify-center mb-1.5">
            <motion.span
              className="bg-black/85 backdrop-blur-sm text-yellow-300 text-[8px] px-2.5 py-1 rounded-full font-bold shadow-lg border border-yellow-400/25"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {bn ? '👇 "Your Stories" ট্যাপ করো' : '👇 Tap "Your stories" to post!'}
            </motion.span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex-1 relative">
              {/* Finger pointing at button */}
              <motion.div
                className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className={`${isExp ? 'text-[24px]' : 'text-[20px]'}`} style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))' }}>👇</span>
              </motion.div>
              <GlowRing color="rgba(236,72,153,0.6)">
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className={`w-full bg-black/40 backdrop-blur-md rounded-full ${isExp ? 'py-[6px] px-2.5' : 'py-[4px] px-2'} flex items-center justify-center gap-0.5 border-2 border-pink-400/70 shadow-[0_0_14px_rgba(236,72,153,0.5)]`}>
                  <div className={`${isExp ? 'w-5 h-5' : 'w-4 h-4'} rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center`}>
                    <span className={`text-white ${isExp ? 'text-[7px]' : 'text-[6px]'}`}>👤</span>
                  </div>
                  <span className={`text-white ${isExp ? 'text-[10px]' : 'text-[8px]'} font-semibold`}>{bn ? 'তোর story' : 'Your stories'}</span>
                </motion.div>
              </GlowRing>
              {/* Ripple */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                animate={{ boxShadow: ['0 0 0 0px rgba(236,72,153,0.5)', '0 0 0 6px rgba(236,72,153,0)', '0 0 0 0px rgba(236,72,153,0.5)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </div>
            <div className={`flex-1 bg-black/40 backdrop-blur-md rounded-full ${isExp ? 'py-[6px] px-2.5' : 'py-[4px] px-1.5'} flex items-center justify-center gap-0.5 opacity-25`}>
              <span className={`text-[#1cd14f] ${isExp ? 'text-[10px]' : 'text-[8px]'}`}>★</span>
              <span className={`text-white/80 ${isExp ? 'text-[10px]' : 'text-[8px]'} font-medium`}>{bn ? 'ঘনিষ্ঠ বন্ধু' : 'Close Friends'}</span>
            </div>
            <div className={`${isExp ? 'w-7 h-7' : 'w-5 h-5'} rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 opacity-25`}>
              <span className={`text-white/80 ${isExp ? 'text-[12px]' : 'text-[9px]'}`}>→</span>
            </div>
          </div>
        </div>

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
      <div className="bg-[#111b21] h-full overflow-hidden">
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
          {/* Phase 7: Clipboard fly animation — auto-loops */}
          <motion.div
            className="absolute top-2 left-1/2 -translate-x-1/2"
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: [1, 1, 0], y: [0, 40, 60], scale: [1, 0.8, 0.6] }}
            transition={{ duration: 1.2, ease: 'easeIn', repeat: Infinity, repeatDelay: 3 }}
          >
            <span className="text-[18px]">📋</span>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-center">
            <p className="text-white text-[14px] font-semibold leading-relaxed break-all">{trimmedLink}</p>
          </motion.div>
          <motion.div animate={{ opacity: [0, 1, 1, 1, 0], scale: [0, 1.05, 1, 1.05, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
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
      <div className="bg-[#111b21] h-full overflow-hidden">
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
      <div className="bg-[#111b21] h-full overflow-hidden">
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
function FbTutorial({ step, shareLink, lang, username, storyPreviewUrl }: { step: number; shareLink: string; lang: string; username?: string; storyPreviewUrl?: string | null; onOpenStoryPreview?: () => void; onClose?: () => void; expanded?: boolean }) {
  const bn = lang === 'bn';
  const trimLink = shareLink.replace('https://', '').replace('http://', '');

  // ═══ Step 0 — 3-panel manual sequence: Profile → Settings → Account Center ═══
  if (step === 0) {
    // Sub-panels — slow auto-loop (0→1→2→0→...) every 4s, clickable breadcrumb to override
    const [subPanel, setSubPanel] = useState(0);
    useEffect(() => {
      const timer = setTimeout(() => setSubPanel(p => (p + 1) % 3), 4000);
      return () => clearTimeout(timer);
    }, [subPanel]);

    return (
      <PhoneFrame>
        <div className="bg-[#0a0a0a] h-full overflow-hidden relative">
          {/* Breadcrumb nav — clickable dots */}
          <div className="flex items-center justify-center gap-2 px-2 py-1.5 bg-white/[0.03] border-b border-white/[0.06]">
            {[
              { icon: '☰', label: bn ? 'মেনু' : 'Menu' },
              { icon: '⚙️', label: bn ? 'সেটিংস' : 'Settings' },
              { icon: '🔗', label: 'Account Center' },
            ].map((item, i) => (
              <span key={i} className="contents">
                {i > 0 && <span className="text-white/15 text-[7px]">›</span>}
                <button
                  onClick={() => setSubPanel(i)}
                  className={`text-[7px] px-1.5 py-0.5 rounded font-semibold transition-all duration-300 ${
                    subPanel === i ? 'bg-white/12 text-white/90' :
                    subPanel > i ? 'bg-white/6 text-white/40' : 'text-white/20'
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              </span>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Panel A: IG Profile page — find the ☰ hamburger ── */}
            {subPanel === 0 && (
              <motion.div key="panelA" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
                className="h-full">
                {/* IG profile top bar */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-white text-[11px] font-bold">@{username || 'you'}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/30 text-[12px]">＋</span>
                    {/* ☰ hamburger — THE TARGET */}
                    <GlowRing color="rgba(0,149,246,0.7)">
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-7 h-7 rounded-lg bg-[#0095f6]/15 flex items-center justify-center border border-[#0095f6]/40">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M3 12h18M3 18h18"/>
                        </svg>
                      </motion.div>
                    </GlowRing>
                  </div>
                </div>
                {/* Profile area (dimmed) */}
                <div className="px-3 flex items-center gap-3 opacity-25 py-1.5">
                  <div className="w-14 h-14 rounded-full bg-[#262626] flex items-center justify-center">
                    <span className="text-white/30 text-xl">👤</span>
                  </div>
                  <div className="flex-1 flex gap-4 justify-center">
                    {['Posts', 'Followers', 'Following'].map(l => (
                      <div key={l} className="text-center">
                        <span className="text-white text-[10px] font-bold block">–</span>
                        <span className="text-white/40 text-[7px]">{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 mt-1 opacity-20">
                  <div className="bg-[#262626] rounded-lg py-1.5 text-center"><span className="text-white/40 text-[9px]">Edit profile</span></div>
                </div>
                {/* Grid placeholder */}
                <div className="grid grid-cols-3 gap-[1px] mt-2 opacity-15 px-0.5">
                  {[0,1,2,3,4,5].map(i => <div key={i} className="aspect-square bg-[#1a1a1a]" />)}
                </div>
                {/* Bottom tab bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-2 border-t border-white/[0.06] bg-black/80">
                  {['🏠', '🔍', '🎬', '🛍', '👤'].map((icon, i) => (
                    <span key={i} className={`text-[14px] ${i === 4 ? 'opacity-90' : 'opacity-20'}`}>{icon}</span>
                  ))}
                </div>
                {/* Label below phone */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
                  <span className="bg-black/80 text-yellow-300 text-[9px] px-3 py-1 rounded-full font-bold border border-yellow-400/20">
                    {bn ? '☰ মেনু ট্যাপ করো' : 'Tap ☰ menu'}
                  </span>
                </motion.div>
              </motion.div>
            )}

            {/* ── Panel B: Settings menu — tap "Settings and privacy" ── */}
            {subPanel === 1 && (
              <motion.div key="panelB" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
                className="h-full px-1">
                {/* Header */}
                <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  <span className="text-white text-[11px] font-bold">{bn ? 'মেনু' : 'Menu'}</span>
                </div>
                {/* Menu rows */}
                <div className="py-1 space-y-0.5">
                  {/* Settings and privacy — HIGHLIGHTED */}
                  <GlowRing color="rgba(0,149,246,0.5)">
                    <motion.div animate={{ backgroundColor: ['rgba(0,149,246,0.05)', 'rgba(0,149,246,0.12)', 'rgba(0,149,246,0.05)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-[#0095f6]/20 w-full">
                      <span className="text-[14px]">⚙️</span>
                      <span className="text-white text-[10px] font-bold flex-1">{bn ? 'Settings and privacy' : 'Settings and privacy'}</span>
                      <BouncingArrow direction="right" className="!text-sm" />
                    </motion.div>
                  </GlowRing>
                  {/* Other rows dimmed */}
                  {[
                    { icon: '🧵', label: 'Threads' },
                    { icon: '📊', label: 'Your activity' },
                    { icon: '📦', label: 'Archive' },
                    { icon: '⬜', label: 'QR code' },
                    { icon: '⭐', label: 'Favourites' },
                    { icon: '🔖', label: 'Saved' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2.5 px-3 py-1.5 opacity-20">
                      <span className="text-[12px]">{row.icon}</span>
                      <span className="text-white/50 text-[9px]">{row.label}</span>
                    </div>
                  ))}
                </div>
                {/* Label */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                  <span className="bg-black/80 text-yellow-300 text-[9px] px-3 py-1 rounded-full font-bold border border-yellow-400/20">
                    {bn ? '⚙️ Settings ট্যাপ করো' : 'Tap ⚙️ Settings'}
                  </span>
                </motion.div>
              </motion.div>
            )}

            {/* ── Panel C: Account Center — the existing FB link view ── */}
            {subPanel === 2 && (
              <motion.div key="panelC" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}
                className="h-full">
                {/* Meta logo + header */}
                <div className="px-3.5 pt-2 pb-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0082fb] to-[#0064e0] flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
                    </div>
                    <div>
                      <span className="text-white text-[10px] font-bold block leading-tight">Meta Account Center</span>
                      <span className="text-white/30 text-[7px]">{bn ? 'অ্যাকাউন্ট সেটিংস' : 'Manage account settings'}</span>
                    </div>
                  </div>
                  <span className="text-white/20 text-[7px] font-semibold tracking-wide uppercase">{bn ? 'সংযুক্ত অ্যাকাউন্ট' : 'LINKED ACCOUNTS'}</span>
                </div>
                {/* Account cards */}
                <div className="px-3.5 space-y-1.5">
                  {/* Instagram — connected ✓ */}
                  <div className="bg-white/[0.04] rounded-xl px-3 py-2 flex items-center gap-2.5 border border-white/[0.04]">
                    <div className="w-8 h-8 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                      <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="6" stroke="white" strokeWidth="1.5"/><circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-[9px] font-bold block">Instagram</span>
                      <span className="text-white/35 text-[7px] truncate block">@{username || 'your_username'}</span>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-[9px]">✓</span>
                    </div>
                  </div>
                  {/* Facebook — LINK IT (highlighted) */}
                  <motion.div
                    animate={{ boxShadow: ['0 0 0 0px rgba(24,119,242,0.4)', '0 0 0 4px rgba(24,119,242,0)', '0 0 0 0px rgba(24,119,242,0.4)'] }}
                    transition={{ duration: ANIM.GLOW_DUR, repeat: Infinity }}
                    className="rounded-xl"
                  >
                    <div className="bg-[#1877f2]/10 rounded-xl px-3 py-2 flex items-center gap-2.5 border border-[#1877f2]/30 relative">
                      <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center shadow-md shadow-blue-500/30">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-[9px] font-bold block">Facebook</span>
                        <span className="text-[#5b9bf6] text-[7px] font-medium">{bn ? 'ট্যাপ করে সংযুক্ত করো' : 'Tap to link account'}</span>
                      </div>
                      <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: ANIM.BOUNCE_DUR, repeat: Infinity, ease: 'easeInOut' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#5b9bf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </motion.div>
                      {/* Arrow inside card */}
                      <motion.div className="absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        <span className="text-[14px]">👆</span>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>
    );
  }

  // ═══ Step 1 — Open Instagram → Tap + → Story (EXACT IG home copy) ═══
  if (step === 1) return (
    <PhoneFrame>
      <div className="bg-black h-full overflow-hidden">
        {/* IG top nav bar — pixel-accurate (copied from IgTutorial step 0) */}
        <div className="flex items-center justify-between px-3.5 py-2">
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
            <div className="relative">
              <span className="text-white/70 text-sm">♡</span>
              <div className="absolute -top-0.5 -right-0.5 w-[6px] h-[6px] rounded-full bg-[#ff3040]" />
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-70">
              <path d="M22 3L9.218 10.083M22 3l-6.782 18L9.218 10.083M22 3L9.218 10.083M9.218 10.083L1 14l8.218-3.917" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {/* Stories row */}
        <div className="flex gap-2.5 px-3 py-2 border-b border-white/[0.06]">
          {/* Your Story — highlighted with arrow (Phase 17: responsive sizes) */}
          <div className="flex flex-col items-center gap-1 relative">
            <GlowRing color="rgba(225,48,108,0.6)">
              <div className="w-[48px] h-[48px] sm:w-[52px] sm:h-[52px] rounded-full bg-[#262626] flex items-center justify-center relative">
                <span className="text-white/30 text-lg">👤</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] rounded-full bg-[#0095f6] border-2 border-black flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold leading-none">+</span>
                </div>
              </div>
            </GlowRing>
            <span className="text-[8px] text-white/50">{bn ? 'তোর Story' : 'Your story'}</span>
            <BouncingArrow direction="up" className="!text-base" />
          </div>
          {/* Other stories (dim) — with IG gradient ring (Phase 17: responsive) */}
          {['user1', 'user2', 'user3'].map(u => (
            <div key={u} className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[48px] h-[48px] sm:w-[52px] sm:h-[52px] rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                <div className="w-full h-full rounded-full bg-black" />
              </div>
              <span className="text-[8px] text-white/30">{u}</span>
            </div>
          ))}
        </div>
        {/* Feed post placeholder (dim) */}
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

  // ═══ Step 2 — Story editor top toolbar → tap sticker icon (EXACT IG copy) ═══
  if (step === 2) return (
    <PhoneFrame>
      <div className="bg-black h-full overflow-hidden">
        {/* Story editor top toolbar — matches real IG (copied from IgTutorial step 1) */}
        <div className="flex items-center justify-between px-3 py-2 relative z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="flex items-center gap-3.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-60">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="white"/>
            </svg>
            <span className="text-white/60 text-[15px] font-bold">Aa</span>
            {/* STICKER — highlighted with glow + pulse ring (EXACT IG copy) */}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-40">
              <circle cx="12" cy="5" r="1.5" fill="white"/><circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="12" cy="19" r="1.5" fill="white"/>
            </svg>
          </div>
        </div>
        {/* Arrow below toolbar — pointing up at sticker (right-aligned like IG) */}
        <div className="flex justify-end pr-[52px]">
          <BouncingArrow direction="up" className="!text-sm" />
        </div>
        {/* Story canvas */}
        <div className="mx-2 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}>
          <div className="h-[210px] flex items-center justify-center">
            <span className="text-white/20 text-[10px]">{bn ? 'তোর photo/video' : 'your photo/video'}</span>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );

  // ═══ Step 3 — Sticker tray → tap LINK sticker (EXACT IG sticker tray copy) ═══
  if (step === 3) return (
    <PhoneFrame>
      <div className="bg-[#1a1a1a] h-full overflow-hidden">
        {/* Search bar (copied from IG) */}
        <div className="px-3 pt-3 pb-2">
          <div className="bg-[#363636] rounded-lg px-3 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#8e8e8e" strokeWidth="2"/>
              <path d="M20 20l-3-3" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[#8e8e8e] text-[11px]">Search</span>
          </div>
        </div>
        {/* Sticker grid — 4 columns (EXACT IG layout & sizes) */}
        <div className="px-3 pb-2">
          <div className="grid grid-cols-4 gap-x-3 gap-y-3">
            <div className="flex flex-col items-center gap-1 opacity-20">
              <div className="w-[46px] h-[46px] rounded-2xl bg-[#262626] flex items-center justify-center">
                <span className="text-[22px]">📍</span>
              </div>
              <span className="text-[7px] text-[#a8a8a8]">LOCATION</span>
            </div>
            {/* LINK — Phase 18: scale-110 pop + z-10 + "tap" hint */}
            <div className="flex flex-col items-center gap-1 relative z-10">
              <GlowRing color="rgba(0,149,246,0.7)">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1.1, opacity: 1 }}
                  transition={{ delay: ANIM.ENTRY_DELAY, duration: ANIM.ENTRY_DUR, type: 'spring', stiffness: 300 }}
                  className="w-[46px] h-[46px] rounded-2xl bg-[#0095f6]/15 flex items-center justify-center border-2 border-[#0095f6]/60"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#0095f6" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#0095f6" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </motion.div>
              </GlowRing>
              <span className="text-[7px] text-[#0095f6] font-extrabold">LINK</span>
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="text-[6px] text-[#0095f6]/70 font-semibold">tap ↑</motion.span>
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

  // ═══ Step 4 — "Add link" screen → paste URL → Done (EXACT IG copy) ═══
  if (step === 4) return (
    <PhoneFrame>
      <div className="bg-[#0a0a0a] h-full overflow-hidden">
        {/* iOS drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div className="w-9 h-[4px] rounded-full bg-[#3a3a3c]" />
        </div>
        {/* Header — Cancel / Add link / Done (copied from IG step 3) */}
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
        {/* URL field with clipboard fly animation — Phase 19: slower + "Pasted!" badge */}
        <div className="px-4 pt-4 relative">
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
            initial={{ opacity: 1, y: -10, scale: 1 }}
            animate={{ opacity: [1, 1, 1, 0], y: [-10, 10, 22, 30], scale: [1, 0.9, 0.7, 0.4] }}
            transition={{ duration: 1.6, ease: 'easeIn', repeat: Infinity, repeatDelay: 3 }}
          >
            <span className="text-[16px]">📋</span>
          </motion.div>
          <span className="text-[#86868b] text-[10px] block mb-1">URL</span>
          {/* Phase 19: letter-by-letter reveal */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ANIM.ENTRY_DELAY }}>
            <p className="text-white text-[13px] font-normal break-all leading-snug pb-1">
              {trimLink.split('').map((ch: string, i: number) => (
                <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.03 }}>{ch}</motion.span>
              ))}
            </p>
          </motion.div>
          {/* Phase 19: "Pasted!" micro-badge */}
          <motion.div
            animate={{ opacity: [0, 1, 1, 1, 0.7], scale: [0.7, 1.05, 1, 1.05, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2 py-0.5 mb-1.5"
          >
            <span className="text-emerald-400 text-[8px] font-bold">✓ {bn ? 'Paste হয়েছে!' : 'Pasted!'}</span>
          </motion.div>
          <div className="border-b border-[#3a3a3c]" />
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
      </div>
    </PhoneFrame>
  );

  // ═══ Step 5 — Story + DRAGGABLE link sticker (exact IG step 4 copy) + "Your Stories" ═══
  if (step === 5) {
    const fbStorageKey = 'fb_sticker_pos';
    const fbSavedPos = useMemo(() => {
      try {
        const raw = localStorage.getItem(fbStorageKey);
        if (raw) return JSON.parse(raw) as { x: number; y: number };
      } catch { /* ignore */ }
      return { x: 53, y: -18 };
    }, []);
    const [fbDragging, setFbDragging] = useState(false);
    const [fbJustPlaced, setFbJustPlaced] = useState(false);
    const fbPhoneRef = useRef<HTMLDivElement>(null);

    return (
      <PhoneFrame>
        <div ref={fbPhoneRef} className="relative overflow-hidden h-full" style={{ touchAction: 'none' }}>
          {/* Story background — CLEAR premium (no blur, like IG step 4) */}
          {storyPreviewUrl ? (
            <img src={storyPreviewUrl} alt="Story card" className="absolute inset-0 w-full h-full object-cover object-center" draggable={false} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#ec4899] via-[#f43f5e] to-[#fb923c] flex items-center justify-center">
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="text-lg">✨</motion.span>
            </div>
          )}
          {/* Subtle bottom gradient for button readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Story editor top toolbar (like IG step 4) */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between px-2 pt-1.5">
            <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-[7px] font-bold">✕</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-[7px] font-bold">Aa</span></div>
              <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-[7px]">☺</span></div>
              <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-[7px]">♪</span></div>
              <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"><span className="text-white text-[7px]">⋯</span></div>
            </div>
          </div>

          {/* ── DRAGGABLE link sticker — animated drag-in (exact copy from IG step 4) ── */}
          <motion.div
            className="absolute z-20"
            style={{ left: '50%', top: '50%', cursor: fbDragging ? 'grabbing' : 'grab' }}
            initial={{ scale: 0.3, opacity: 0, x: 0, y: -120, rotate: -12 }}
            animate={{
              scale: [0.3, 1.15, 0.95, 1],
              opacity: [0, 0.8, 1, 1],
              x: [0, fbSavedPos.x + 10, fbSavedPos.x - 5, fbSavedPos.x - 50],
              y: [-120, fbSavedPos.y - 15, fbSavedPos.y + 3, fbSavedPos.y],
              rotate: [-12, 4, -1, 0],
            }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], times: [0, 0.5, 0.75, 1], delay: 0.5 }}
            drag
            dragMomentum={false}
            dragElastic={0}
            dragConstraints={fbPhoneRef}
            onDragStart={() => setFbDragging(true)}
            onDragEnd={(_, info) => {
              setFbDragging(false);
              setFbJustPlaced(true);
              setTimeout(() => setFbJustPlaced(false), 800);
              const newPos = { x: Math.round(fbSavedPos.x + info.offset.x), y: Math.round(fbSavedPos.y + info.offset.y) };
              try { localStorage.setItem(fbStorageKey, JSON.stringify(newPos)); } catch { /* ignore */ }
            }}
          >
            <div className="relative" style={{ transform: 'translateX(-50%) translateY(-50%)' }}>
              {/* The link sticker pill */}
              <div className="bg-white rounded-full px-2 py-[3px] flex items-center gap-1 select-none whitespace-nowrap"
                style={{ boxShadow: fbDragging ? '0 8px 25px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.3)' : fbJustPlaced ? '0 0 15px rgba(34,197,94,0.6), 0 0 0 2px rgba(34,197,94,0.4)' : '0 2px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)', transform: fbDragging ? 'scale(1.08)' : 'scale(1)', transition: 'box-shadow 0.3s, transform 0.2s' }}>
                <svg viewBox="0 0 24 24" fill="#0095f6" className="w-2.5 h-2.5 flex-shrink-0"><path d="M13.06 8.11l1.415 1.414a7 7 0 010 9.9l-.354.353a7 7 0 01-9.9-9.9l1.415 1.415a5 5 0 107.07 7.07l.354-.353a5 5 0 000-7.07L11.65 9.524l1.41-1.414zm6.718-6.718a7 7 0 010 9.9l-1.415-1.414a5 5 0 00-7.07-7.07l-.354.353a5 5 0 000 7.07l1.415 1.415-1.415 1.414-1.414-1.414a7 7 0 010-9.9l.354-.354a7 7 0 019.9 0z"/></svg>
                <span className="text-black text-[8px] font-bold max-w-[130px]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trimLink}</span>
              </div>
              {/* Selection handles */}
              <div className="absolute -top-0.5 -left-0.5 w-1 h-1 rounded-full bg-white border border-white shadow-sm" />
              <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-white border border-white shadow-sm" />
              <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 rounded-full bg-white border border-white shadow-sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 rounded-full bg-white border border-white shadow-sm" />
            </div>
          </motion.div>

          {/* Drag hint — appears after sticker lands */}
          {!fbDragging && (
            <motion.div
              className="absolute z-30 bottom-14 left-0 right-0 flex justify-center pointer-events-none"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: [0, 0.8, 0.8, 0], y: [5, 0, 0, -3] }}
              transition={{ duration: 3, delay: 2, ease: 'easeInOut' }}
            >
              <span className="bg-black/60 backdrop-blur-sm text-white/70 text-[8px] px-2.5 py-1 rounded-full font-medium">
                {bn ? '☝️ টেনে সরাও' : '☝️ Drag to reposition'}
              </span>
            </motion.div>
          )}

          {/* Bottom share bar — THE FOCUS of this step */}
          <div className="absolute bottom-0 left-0 right-0 z-10 px-2 pb-2">
            {/* Instruction banner — clean, well-spaced above buttons */}
            <div className="flex justify-center mb-2">
              <motion.span
                className="bg-black/85 backdrop-blur-sm text-yellow-300 text-[9px] px-3 py-1.5 rounded-full font-bold shadow-lg border border-yellow-400/25"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {bn ? '☝️ "Your Stories" আঙুল ধরে রাখো (2 সেকেন্ড)' : '☝️ Hold "Your Stories" for 2 seconds'}
              </motion.span>
            </div>
            {/* Button row with centered finger */}
            <div className="flex items-center gap-1.5">
              {/* "Your stories" — PROMINENT with finger above */}
              <div className="flex-1 relative">
                {/* Finger centered over button */}
                <motion.div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                  animate={{ y: [0, 5, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-[28px]" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.7))' }}>👇</span>
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-black/50 backdrop-blur-md rounded-full py-[6px] px-3 flex items-center justify-center gap-1.5 border-2 border-pink-400/70 shadow-[0_0_14px_rgba(236,72,153,0.5)]"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center">
                    <span className="text-white text-[7px]">👤</span>
                  </div>
                  <span className="text-white text-[9px] font-bold">{bn ? 'তোর story' : 'Your stories'}</span>
                </motion.div>
                {/* Ripple effect */}
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  animate={{ boxShadow: ['0 0 0 0px rgba(236,72,153,0.5)', '0 0 0 8px rgba(236,72,153,0)', '0 0 0 0px rgba(236,72,153,0.5)'] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              </div>
              <div className="bg-black/30 backdrop-blur-md rounded-full py-[5px] px-2 flex items-center justify-center gap-0.5 opacity-25">
                <span className="text-[#1cd14f] text-[7px]">★</span>
                <span className="text-white/70 text-[7px]">{bn ? 'বন্ধু' : 'Friends'}</span>
              </div>
              <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 opacity-25"><span className="text-white/50 text-[8px]">→</span></div>
            </div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ═══ Step 6 — "Share this to" bottom sheet — check Facebook Story ═══
  if (step === 6) return (
    <PhoneFrame>
      <div className="bg-[#0a0a0a] h-full overflow-hidden flex flex-col">
        {/* Dim story background */}
        <div className="flex-1 relative">
          {storyPreviewUrl ? (
            <img src={storyPreviewUrl} alt="Story" className="absolute inset-0 w-full h-full object-cover object-center opacity-20 blur-sm" draggable={false} />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#ec4899] via-[#f43f5e] to-[#fb923c] opacity-20 blur-sm" />
          )}
        </div>
        {/* iOS bottom sheet */}
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 22, stiffness: 280 }}
          className="bg-white rounded-t-[22px] px-3.5 pt-2 pb-3 shadow-2xl shadow-black/60"
        >
          {/* Handle */}
          <div className="flex justify-center mb-1.5"><div className="w-9 h-1 rounded-full bg-gray-300" /></div>
          <h3 className="text-[#1c1c1e] text-[14px] font-bold text-center mb-2">{bn ? 'শেয়ার করো' : 'Share this to'}</h3>
          {/* IG story row — always checked */}
          <div className="flex items-center gap-2.5 py-2 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full p-[2px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-[13px]">👤</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[#1c1c1e] text-[12px] font-bold block">{bn ? 'তোর story' : 'Your story'}</span>
              <span className="text-[#8e8e93] text-[9px]">{bn ? 'Instagram-এ share হবে' : 'Shared to Instagram'}</span>
            </div>
            <div className="w-[22px] h-[22px] rounded-full bg-[#34c759] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
          {/* Facebook Story row — highlighted with pulse background */}
          <motion.div
            animate={{ backgroundColor: ['rgba(24,119,242,0.04)', 'rgba(24,119,242,0.1)', 'rgba(24,119,242,0.04)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex items-center gap-2.5 py-2 rounded-lg px-1 -mx-1 border-l-2 border-[#1877f2]"
          >
            <div className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[#1c1c1e] text-[12px] font-bold block truncate">{bn ? 'Facebook Story' : 'Facebook Story'}</span>
              <span className="text-[#8e8e93] text-[9px]">{username || (bn ? 'বন্ধুদের কাছে' : 'Friends')}</span>
            </div>
            <motion.div
              animate={{ scale: [0, 1.3, 1, 1, 1.08, 1], opacity: [0, 1, 1, 1, 1, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[22px] h-[22px] rounded-full bg-[#1877f2] flex items-center justify-center flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </motion.div>
          </motion.div>
          {/* Share button */}
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}>
            <div className="bg-[#6259de] rounded-2xl py-2.5 text-center w-full mt-3 shadow-lg shadow-purple-500/20">
              <span className="text-white text-[14px] font-bold">Share</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PhoneFrame>
  );

  // ═══ Step 7 — Premium Celebration Screen ═══
  const confetti = ['🎉', '🎊', '✨', '💙', '🥳', '✨', '💜', '🎊', '⭐', '💙', '🎉', '✨'];
  return (
    <PhoneFrame>
      <div className="bg-[#0d0d0f] h-full overflow-hidden relative flex flex-col items-center justify-center">
        {/* Radial gradient glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[200px] h-[200px] rounded-full bg-emerald-500/8 blur-[60px]" />
          <div className="absolute bottom-[20%] left-[20%] w-[120px] h-[120px] rounded-full bg-blue-500/6 blur-[50px]" />
          <div className="absolute bottom-[30%] right-[15%] w-[100px] h-[100px] rounded-full bg-purple-500/5 blur-[40px]" />
        </div>

        {/* Floating confetti — bigger, more visible */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((e, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, scale: 0.3 }}
              animate={{
                opacity: [0, 0.9, 0.9, 0],
                y: [60, 10, -40, -90],
                scale: [0.3, 1, 1.2, 0.5],
                rotate: [0, i % 2 === 0 ? 30 : -30, i % 2 === 0 ? -15 : 15, 0],
              }}
              transition={{ duration: 3 + (i % 4) * 0.4, repeat: Infinity, delay: i * 0.25, ease: 'easeOut' }}
              className="absolute text-[18px] sm:text-[20px]"
              style={{ left: `${5 + (i * 8) % 85}%`, top: `${20 + (i * 7) % 50}%` }}
            >
              {e}
            </motion.span>
          ))}
        </div>

        {/* Pulsing glow behind checkmark */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[12%] left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 blur-[30px] pointer-events-none"
        />

        {/* Animated checkmark circle — larger, bolder */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 0.9, 1], opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="relative mb-2 z-10"
        >
          <svg width="64" height="64" viewBox="0 0 64 64">
            <defs>
              <linearGradient id="ckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="32" cy="32" r="27"
              fill="none" stroke="url(#ckGrad)" strokeWidth="3.5" strokeLinecap="round"
              initial={{ strokeDasharray: '169.6', strokeDashoffset: 169.6 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: 'easeInOut' }}
            />
            <motion.path
              d="M20 32l8 8 16-16"
              fill="none" stroke="url(#ckGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
              initial={{ strokeDasharray: 36, strokeDashoffset: 36 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.4, delay: 1.1, ease: 'easeOut' }}
            />
          </svg>
        </motion.div>

        {/* Success text */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="text-white text-[15px] font-extrabold text-center mb-0.5 z-10"
        >
          {bn ? 'Story লাইভ হয়ে গেছে! 🎉' : 'Story is Live! 🎉'}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-white/50 text-[9px] text-center mb-3 px-6 z-10"
        >
          {bn ? 'তোর NGL link এখন দুটো platform-এই দেখা যাচ্ছে' : 'Your NGL link is now visible on both platforms'}
        </motion.p>

        {/* ── Dual platform visual — glass card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, type: 'spring', damping: 20 }}
          className="bg-white/[0.06] backdrop-blur-md rounded-2xl border border-white/10 px-5 py-3 flex items-center gap-4 mb-3 z-10 shadow-xl shadow-black/30"
        >
          {/* IG icon — proper SVG */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.9, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shadow-lg shadow-pink-500/20">
              <div className="w-full h-full rounded-full bg-[#1a1a1c] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                </svg>
              </div>
            </div>
            <span className="text-white/70 text-[7px] font-semibold">Instagram</span>
          </motion.div>

          {/* Animated connecting line + check */}
          <div className="flex flex-col items-center gap-0.5">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 2.1, duration: 0.3 }}
              className="w-8 h-[1px] bg-gradient-to-r from-pink-400/40 via-emerald-400/60 to-blue-400/40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [0, 1.4, 1] }}
              transition={{ delay: 2.3, duration: 0.4 }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/25 flex items-center justify-center border border-emerald-400/50 shadow-sm shadow-emerald-400/20">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </motion.div>
          </div>

          {/* FB icon — proper SVG */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.0, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-full p-[2px] bg-[#1877f2] shadow-lg shadow-blue-500/25">
              <div className="w-full h-full rounded-full bg-[#1a1a1c] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.988h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </div>
            </div>
            <span className="text-white/70 text-[7px] font-semibold">Facebook</span>
          </motion.div>
        </motion.div>

        {/* ── Mini story card with glass frame + LIVE badge ── */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 2.4, type: 'spring', damping: 20 }}
          className="w-[70%] rounded-xl overflow-hidden relative z-10 shadow-xl shadow-black/40 border border-white/10"
          style={{ height: '18%' }}
        >
          {storyPreviewUrl ? (
            <img src={storyPreviewUrl} alt="Story" className="w-full h-full object-cover object-center" draggable={false} />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#ec4899] via-[#f43f5e] to-[#fb923c] flex items-center justify-center">
              <span className="text-white/90 text-[9px] font-bold">{bn ? 'তোর NGL Story' : 'Your NGL Story'}</span>
            </div>
          )}
          {/* Glass overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          {/* LIVE badge */}
          <motion.div
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.7 }}
            className="absolute top-1.5 right-1.5 bg-[#1877f2] rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg shadow-blue-500/40"
          >
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-white text-[6px] font-bold uppercase tracking-wider">Live</span>
          </motion.div>
        </motion.div>
      </div>
    </PhoneFrame>
  );
}

// ── Phase 16: Rewritten FB_STEPS — emoji + action verbs + noob-friendly paths ──
const FB_STEPS = {
  bn: [
    { title: '☰ IG ↔ FB সংযুক্ত করো', desc: '☰ Menu → ⚙️ Settings → 🔗 Account Center → "Facebook" ট্যাপ করে অ্যাকাউন্ট link করো' },
    { title: '📸 Story শুরু করো', desc: 'Instagram খোলো → তোর প্রোফাইল pic-এ (+) ট্যাপ করো → নতুন Story শুরু হবে' },
    { title: '😊 Sticker বাটন চাপো', desc: 'উপরের toolbar-এ □😊 (চারকোনা smiley) sticker icon-এ ট্যাপ করো' },
    { title: '🔗 LINK স্টিকার বেছে নাও', desc: 'Sticker tray-তে 🔗 LINK খুঁজে বের করো → ট্যাপ করো' },
    { title: '📋 Link পেস্ট করো → Done', desc: 'তোর NGL link auto-copy আছে — URL বক্সে paste করো → ✅ Done চাপো' },
    { title: '👆 "Your Stories" ধরে রাখো', desc: '"Your Stories" বাটনে 2 সেকেন্ড আঙুল ধরে রাখো — share menu ভেসে আসবে!' },
    { title: '✅ Facebook Story টিক দাও', desc: '"Facebook Story" row-তে ✅ চেকমার্ক দাও → নীল Share বাটনে ট্যাপ করো' },
    { title: '🎉 দুই জায়গায় লাইভ!', desc: '🥳 তোর NGL story এখন Instagram + Facebook দুটোতেই live! বন্ধুরা দুই দিক থেকে দেখবে' },
  ],
  en: [
    { title: '☰ Link IG ↔ Facebook', desc: '☰ Menu → ⚙️ Settings → 🔗 Account Center → Tap "Facebook" to connect your accounts' },
    { title: '📸 Start a Story', desc: 'Open Instagram → Tap your profile pic (+) at top-left → A new Story camera opens' },
    { title: '😊 Tap Sticker Button', desc: 'Top toolbar → Tap the □😊 sticker icon (square smiley face)' },
    { title: '🔗 Pick the LINK Sticker', desc: 'In the sticker tray, find 🔗 LINK → Tap it' },
    { title: '📋 Paste Your Link → Done', desc: 'Your NGL link is auto-copied — paste into the URL box → Tap ✅ Done' },
    { title: '👆 Hold "Your Stories"', desc: 'Press & hold "Your Stories" button for 2 sec — a share menu pops up!' },
    { title: '✅ Check Facebook Story', desc: 'Tick ✅ the "Facebook Story" row → Tap the blue Share button' },
    { title: '🎉 Live on Both!', desc: '🥳 Your NGL story is now live on Instagram AND Facebook! Friends see it from both' },
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
    if (data.step > 0 && data.step <= 7 && Date.now() - data.ts < 30 * 60 * 1000) return data.step;
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
  'fb-guide': { native: 'instagram://story-camera', web: 'https://www.instagram.com', label: 'Instagram' },
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
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(true);
  const [pauseFlash, setPauseFlash] = useState<'pause' | 'play' | null>(null);
  const [langOverride, setLangOverride] = useState<'bn' | 'en' | null>(null);
  const [fullscreenExpanded, setFullscreenExpanded] = useState(false);
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
    if (step5PhoneRef.current) {
      setTimeout(() => step5PhoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
    setFullscreenExpanded(false);
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
      if (e.key === 'Escape' && fullscreenExpanded) { setFullscreenExpanded(false); return; }
      const data = getTutorialData();
      const maxStep = data ? data.total - 1 : 7;
      if (e.key === 'ArrowRight') { setTutorialStep(s => Math.min(s + 1, maxStep)); }
      if (e.key === 'ArrowLeft') { setTutorialStep(s => Math.max(s - 1, 0)); }
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
      if (e.key === 'f' || e.key === 'F') { setFullscreenExpanded(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, fullscreenExpanded]);
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
      setFullscreenExpanded(false);
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
      case 'fb-guide': return { steps: FB_STEPS[l], total: 8, Comp: FbTutorial };
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
            <div className="pointer-events-auto w-full max-w-md max-h-[95vh] overflow-y-auto scrollbar-hide">
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
                          className="flex flex-col items-center gap-2 group focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-2 group focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-2 group focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                          className="flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-xl"
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
                        <button onClick={onClose} className="text-white/20 hover:text-white/40 text-[10px] font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
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
                      const didSwipe = Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2;
                      touchRef.current = null;
                      if (didSwipe) {
                        (window as any).__ngl_swiped = true;
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
                      <div className="space-y-3 relative">
                        {/* Phase 10: Celebration overlay */}
                        <AnimatePresence>
                          {showCelebration && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
                              {/* Confetti particles */}
                              {Array.from({ length: 30 }).map((_, i) => (
                                <motion.div key={i}
                                  className="absolute w-3 h-3 rounded-full"
                                  style={{ background: ['#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'][i % 6], left: `${5 + Math.random() * 90}%` }}
                                  initial={{ top: '55%', opacity: 1, scale: 0 }}
                                  animate={{ top: `${-5 + Math.random() * 40}%`, opacity: [1, 1, 0], scale: [0, 1.2, 0.6], x: (Math.random() - 0.5) * 200 }}
                                  transition={{ duration: 1.2 + Math.random() * 0.6, delay: Math.random() * 0.4, ease: 'easeOut' }}
                                />
                              ))}
                              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5 }}
                                className="text-center z-10">
                                <span className="text-7xl block">🎉</span>
                                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                  className="text-white font-bold text-xl mt-3">
                                  {bn ? 'তুমি তৈয়ার! 🚀' : "You're all set! 🚀"}
                                </motion.p>
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.5 }}
                                  className="text-white/60 text-sm mt-1.5">
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
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Header — clean minimal */}
                        <div className="flex items-center">
                          <button onClick={goBack} className="text-white/40 hover:text-white/70 text-sm transition-colors px-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                          </button>
                          <h3 className="text-white/90 text-[13px] font-semibold flex-1 text-center tracking-tight">
                            {screen === 'ig-guide' ? 'Instagram Story' : screen === 'wa-status-guide' ? 'WhatsApp Status' : 'Facebook Story'}
                          </h3>
                          {/* Language toggle — minimal */}
                          <div className="inline-flex bg-white/[0.04] rounded-full p-0.5 gap-0.5">
                            <button onClick={() => setLangOverride('en')} className={`text-[8px] px-2 py-0.5 rounded-full font-medium transition-all ${effectiveLang === 'en' ? 'bg-white/10 text-white/60' : 'text-white/20 hover:text-white/35'}`}>EN</button>
                            <button onClick={() => setLangOverride('bn')} className={`text-[8px] px-2 py-0.5 rounded-full font-medium transition-all ${effectiveLang === 'bn' ? 'bg-white/10 text-white/60' : 'text-white/20 hover:text-white/35'}`}>বাং</button>
                          </div>
                        </div>

                        {/* Progress dots — clean minimal */}
                        <div className="flex items-center justify-center gap-1.5">
                          {Array.from({ length: total }).map((_, i) => (
                            <button key={i}
                              onClick={() => setTutorialStep(i)}
                              className={`h-[3px] rounded-full transition-all duration-300 ${
                                i < tutorialStep ? 'bg-white/50 w-4' :
                                i === tutorialStep ? 'bg-white w-6' : 'bg-white/15 w-4'
                              }`}
                            />
                          ))}
                          <span className="text-white/20 text-[9px] font-mono ml-1">{tutorialStep + 1}/{total}</span>
                        </div>

                        {/* Step title + desc */}
                        <div className="text-center px-2">
                          <h4 className="text-white/90 text-[13px] font-semibold leading-tight">{stepData.title}</h4>
                          <p className="text-white/35 text-[10px] mt-1 leading-relaxed max-w-[300px] mx-auto">{stepData.desc}</p>
                        </div>

                        {/* Copy pill — only on IG step 3 */}
                        {screen === 'ig-guide' && tutorialStep === 3 && (
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-emerald-300/80 text-[9px] bg-white/[0.04] px-2.5 py-1 rounded-lg break-all max-w-[160px] truncate">{shareLink}</code>
                            <button onClick={async () => { await clipCopy(shareLink); setCopied(true); showToast(bn ? '✅ Link কপি হয়ে গেছে!' : '✅ Link copied!'); }}
                              className="text-[9px] bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-lg font-semibold hover:bg-emerald-500/25 transition-colors">
                              {bn ? 'কপি' : 'Copy'}
                            </button>
                          </div>
                        )}

                        {/* Fullscreen overlay — double-tap / F key / expand icon to enter */}
                        <AnimatePresence>
                          {fullscreenExpanded && (
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-lg"
                              onClick={(e) => { if (e.target === e.currentTarget) setFullscreenExpanded(false); }}
                            >
                              {/* Close button */}
                              <motion.button
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                onClick={() => setFullscreenExpanded(false)}
                                className="absolute top-4 right-4 z-[80] w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </motion.button>

                              {/* Close hint */}
                              <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="absolute top-4 left-0 right-0 text-center pointer-events-none"
                              >
                                <span className="text-white/30 text-[9px]">{bn ? 'ট্যাপ করো বা Esc চাপো' : 'Tap outside or press Esc'}</span>
                              </motion.div>

                              {/* Step counter */}
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                                className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                                <span className="text-white/25 text-[10px] font-mono">{tutorialStep + 1}/{total}</span>
                              </motion.div>

                              {/* Tap zones — left 30% prev, right 30% next */}
                              <div className="absolute inset-0 z-[71] flex pointer-events-none">
                                {tutorialStep > 0 && (
                                  <div className="w-[30%] h-full pointer-events-auto cursor-pointer group"
                                    onClick={(e) => { e.stopPropagation(); setTutorialStep(s => s - 1); }}>
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div className="flex-1 pointer-events-auto cursor-default" />
                                {!isLast && (
                                  <div className="w-[30%] h-full pointer-events-auto cursor-pointer group"
                                    onClick={(e) => { e.stopPropagation(); setTutorialStep(s => s + 1); }}>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Expanded phone mockup */}
                              <motion.div
                                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                className="relative z-[72]"
                                style={phoneGlow ? { filter: `drop-shadow(0 0 30px ${phoneGlow})` } : undefined}
                              >
                                <Comp step={tutorialStep} shareLink={shareLink} lang={effectiveLang} username={username} storyPreviewUrl={storyPreviewUrl} onOpenStoryPreview={onOpenStoryPreview} onClose={onClose} expanded={true} />
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Mockup — flex row with inline arrows (no overflow clipping) */}
                        {!fullscreenExpanded && (
                          <div className="flex items-center justify-center gap-1 sm:gap-2 mx-auto"
                            onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}
                          >
                            {/* Left arrow */}
                            <div className="w-8 sm:w-9 flex-shrink-0 flex items-center justify-center">
                              {tutorialStep > 0 && (
                                <button
                                  onClick={() => setTutorialStep(s => s - 1)}
                                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] hover:shadow-[0_0_8px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all min-w-[44px] min-h-[44px]"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                              )}
                            </div>

                            {/* Phone mockup */}
                            <div className="relative flex-shrink-0" ref={step5PhoneRef}
                              onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd}
                              onClick={() => {
                                if ((window as any).__ngl_swiped) { (window as any).__ngl_swiped = false; return; }
                                // Double-tap to expand fullscreen
                                const now = Date.now();
                                if (now - lastTapTimeRef.current < 350) {
                                  setFullscreenExpanded(e => !e);
                                  lastTapTimeRef.current = 0;
                                  return;
                                }
                                lastTapTimeRef.current = now;
                              }}
                              style={phoneGlow ? { filter: `drop-shadow(0 0 30px ${phoneGlow})` } : undefined}
                            >
                              {/* Expand icon — top-right corner */}
                              <motion.button
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                                onClick={(e) => { e.stopPropagation(); setFullscreenExpanded(true); }}
                                className="absolute top-2 right-2 z-[55] w-6 h-6 rounded-md bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors"
                                title={bn ? 'বড় করো (F)' : 'Expand (F)'}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                </svg>
                              </motion.button>

                              <AnimatePresence mode="wait">
                                <motion.div key={tutorialStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                  transition={{ duration: 0.18, ease: 'easeOut' }}>
                                  <Comp step={tutorialStep} shareLink={shareLink} lang={effectiveLang} username={username} storyPreviewUrl={storyPreviewUrl} onOpenStoryPreview={onOpenStoryPreview} onClose={onClose} />
                                </motion.div>
                              </AnimatePresence>
                            </div>

                            {/* Right arrow */}
                            <div className="w-8 sm:w-9 flex-shrink-0 flex items-center justify-center">
                              {!isLast && (
                                <button
                                  onClick={() => setTutorialStep(s => s + 1)}
                                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.18] hover:shadow-[0_0_8px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all min-w-[44px] min-h-[44px]"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bottom actions — clean, only when needed */}
                        <div className="flex flex-col items-center gap-2 pt-1">
                          {isLast && deepLink && (
                            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onComplete('app')}
                              className={`w-full bg-gradient-to-r ${themeAccent.gradient} text-white font-semibold py-2.5 rounded-xl text-[11px] hover:brightness-110 transition-all`}>
                              {bn ? `${deepLink.label} খোলো` : `Open ${deepLink.label}`}
                            </motion.button>
                          )}
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
