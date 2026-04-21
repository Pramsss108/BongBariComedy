import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { buildApiUrl } from '@/lib/queryClient';
import { useNglLang, LangToggle, FloatingHelp, InboxShimmer } from '@/components/NglLang';
import ShareModal from '@/components/ShareModal';
import QRCode from 'qrcode';
import { sfxNewMessage, sfxDicePop, sfxTap, getNglMuted, setNglMuted } from '@/lib/nglSfx';
import NglUpgradeModal from '@/components/NglUpgradeModal';
import { haptic } from '@/lib/useHaptic';
import { PullToRefresh } from '@/components/PullToRefresh';

interface NglMessage {
  id: string;
  text: string;
  emoji: string;
  reaction: string | null;
  senderLang: string | null;
  senderTz: string | null;
  senderDevice: string | null;
  // Phase 40: Advanced sender intelligence
  senderBrowser: string | null;
  senderOs: string | null;
  senderCity: string | null;
  senderRegion: string | null;
  senderCountry: string | null;
  senderIsp: string | null;
  senderScreenRes: string | null;
  senderConnectionType: string | null;
  senderBatteryLevel: string | null;
  senderDarkMode: string | null;
  senderReferrer: string | null;
  senderLocalTime: string | null;
  // B3: Message pinning — 0 = not pinned, >0 = pinned (higher = newer pin)
  pinned?: number;
  createdAt: string;
}

// Theme gradient definitions
const NGL_THEMES: Record<string, { bg: string; accent: string; label: string; emoji: string; pro?: boolean }> = {
  // ── FREE: Clean, single-tone, functional — no wow factor ──
  default: { bg: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%)', accent: 'from-gray-500 via-gray-400 to-gray-500', label: 'Basic', emoji: '⬜' },
  blush:   { bg: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 50%, #f9a8d4 100%)', accent: 'from-pink-300 via-pink-400 to-pink-300', label: 'Blush', emoji: '🩷' },
  sky:     { bg: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 50%, #7dd3fc 100%)', accent: 'from-sky-300 via-sky-400 to-sky-300', label: 'Sky', emoji: '☁️' },
  sage:    { bg: 'linear-gradient(135deg, #86efac 0%, #4ade80 50%, #86efac 100%)', accent: 'from-green-300 via-green-400 to-green-300', label: 'Sage', emoji: '🍃' },
  // ── PRO: Multi-stop, complex, jaw-dropping — aspirational ──
  aurora:    { bg: 'linear-gradient(135deg, #06b6d4 0%, #10b981 20%, #8b5cf6 50%, #ec4899 80%, #f43f5e 100%)', accent: 'from-cyan-400 via-violet-500 to-pink-500', label: 'Aurora', emoji: '🌌', pro: true },
  sunset:    { bg: 'linear-gradient(135deg, #fbbf24 0%, #f97316 25%, #ef4444 50%, #db2777 75%, #7c3aed 100%)', accent: 'from-amber-400 via-red-500 to-violet-600', label: 'Sunset', emoji: '🌅', pro: true },
  cherry:    { bg: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 20%, #f9a8d4 45%, #ec4899 75%, #be185d 100%)', accent: 'from-pink-200 via-pink-400 to-pink-700', label: 'Cherry', emoji: '🌸', pro: true },
  neon:      { bg: 'linear-gradient(135deg, #0ff0fc 0%, #7c3aed 30%, #f43f5e 60%, #fbbf24 100%)', accent: 'from-cyan-300 via-violet-600 to-rose-500', label: 'Neon', emoji: '⚡', pro: true },
  midnight:  { bg: 'linear-gradient(135deg, #020617 0%, #0f172a 25%, #1e1b4b 50%, #312e81 75%, #020617 100%)', accent: 'from-slate-900 via-indigo-900 to-slate-900', label: 'Midnight', emoji: '🌑', pro: true },
  velvet:    { bg: 'linear-gradient(135deg, #fda4af 0%, #e11d48 30%, #9f1239 60%, #fbbf24 100%)', accent: 'from-rose-300 via-rose-700 to-amber-400', label: 'Velvet', emoji: '🥀', pro: true },
};

// ── 20 Bilingual Prompt Phrases — premium copy, no emojis ──
const PROMPT_POOL: { bn: string; en: string }[] = [
  { bn: 'আমার সম্পর্কে anonymous কিছু বলো', en: 'send me an anonymous message' },
  { bn: 'আমাকে তিন শব্দে বর্ণনা করো', en: 'describe me in three words' },
  { bn: 'আমার সম্পর্কে তোর honest opinion কি?', en: "what's your honest opinion of me?" },
  { bn: 'আমার সাথে তোর সবচেয়ে ভালো memory কি?', en: 'what is your favourite memory with me?' },
  { bn: 'আমাকে প্রথম দেখে কি মনে হয়েছিল?', en: 'what did you think when you first met me?' },
  { bn: 'তুই কখনো আমার কাছে কিছু লুকিয়েছিস?', en: 'are you hiding something from me?' },
  { bn: 'আমাকে একটা dare দে', en: 'give me a dare' },
  { bn: 'আমার সবচেয়ে annoying habit কোনটা?', en: 'what is my most annoying habit?' },
  { bn: 'তুই আমার জায়গায় থাকলে কি করতিস?', en: 'what would you do if you were me?' },
  { bn: 'আমাকে নিয়ে একটা confession কর', en: 'confess something about me' },
  { bn: 'তুই কি আমাকে trust করিস?', en: 'do you really trust me?' },
  { bn: 'Never have I ever — আমাকে catch কর', en: 'never have I ever — catch me' },
  { bn: 'আমার life-এ কি change করা উচিত?', en: 'what should I change in my life?' },
  { bn: 'তোর মনে আমার বিশেষ জায়গা আছে?', en: 'do I hold a special place in your life?' },
  { bn: 'আমার best quality আর worst — দুটোই বল', en: 'my best and worst quality — tell both' },
  { bn: 'তুই আমাকে কোন গান দিয়ে describe করবি?', en: 'describe me with a song' },
  { bn: 'আমার জীবনে তুই কেন important?', en: 'why do I matter in your life?' },
  { bn: 'rate me 1-10 honestly — কোনো ভান নয়', en: 'rate me 1-10 honestly — no filter' },
  { bn: 'আমাকে একটা কথা বল যেটা কখনো বলিসনি', en: 'tell me something you never told me' },
  { bn: 'যদি আমি কাল disappear হয়ে যাই — কি করবি?', en: 'if I disappear tomorrow, what would you do?' },
];

const REACTION_CHOICES = ['like', 'insight', 'boost', 'focus', 'star'];

// Decode HTML entities from legacy data stored in DB (e.g. &#x27; → ')
function decodeEntities(str: string): string {
  if (!str || (!str.includes('&') )) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

// Confetti burst
function fireConfetti(container: HTMLElement) {
  const colors = ['#f8477a', '#f4843e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#fff'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    const isRect = Math.random() > 0.5;
    el.style.cssText = `position:fixed;width:${isRect ? 10 : 8}px;height:${isRect ? 4 : 8}px;border-radius:${isRect ? '2px' : '50%'};background:${colors[i%colors.length]};pointer-events:none;z-index:9999;left:50%;top:40%;`;
    container.appendChild(el);
    const angle = (Math.random() * 360) * Math.PI / 180;
    const v = 250 + Math.random() * 350;
    const dx = Math.cos(angle) * v;
    const dy = Math.sin(angle) * v - 250;
    el.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px,${dy}px) scale(0) rotate(${Math.random()*720}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    setTimeout(() => el.remove(), 1500);
  }
}

export default function NglDashboard() {
  const [, params] = useRoute('/ngl/at/:username');
  const username = params?.username || '';
  const [, navigate] = useLocation();
  const { t, lang } = useNglLang();
  // Phase 23: GA4 event helper
  const gEvent = (name: string, params?: Record<string, string>) => { try { (window as any).gtag?.('event', name, params); } catch {} };

  const [tab, setTab] = useState<'play' | 'inbox'>('play');
  const [messages, setMessages] = useState<NglMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const getRandomPrompt = (l: 'bn' | 'en') => PROMPT_POOL[Math.floor(Math.random() * PROMPT_POOL.length)][l];
  const defaultPrompt = getRandomPrompt(lang as 'bn' | 'en');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [hasServerPrompt, setHasServerPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [diceLoading, setDiceLoading] = useState(false);
  const [diceFlash, setDiceFlash] = useState(false);
  const [diceToast, setDiceToast] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [showBanish, setShowBanish] = useState(false);
  const [banishConfirm, setBanishConfirm] = useState('');
  const [banishing, setBanishing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [theme, setTheme] = useState('default');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [settingTheme, setSettingTheme] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [hintRevealId, setHintRevealId] = useState<string | null>(null);
  // Reveal-to-read: messages start blurred; tap to reveal (persists across reloads).
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('bng_ngl_revealed_v1') || '[]')); } catch { return new Set(); }
  });
  const revealMessage = (id: string) => {
    setRevealedIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem('bng_ngl_revealed_v1', JSON.stringify(Array.from(next).slice(-500))); } catch {}
      haptic('tap');
      return next;
    });
  };
  const [storyPreview, setStoryPreview] = useState<string | null>(null);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [storyColorIdx, setStoryColorIdx] = useState(0);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [storyShowQR, setStoryShowQR] = useState(true);
  const [storyCustomPrompt, setStoryCustomPrompt] = useState<string | null>(null);
  const [storyEditingText, setStoryEditingText] = useState(false);
  const [storyTextDraft, setStoryTextDraft] = useState('');
  const [storySharing, setStorySharing] = useState(false);
  const [storyToast, setStoryToast] = useState<string | null>(null);
  const [ogTitle, setOgTitle] = useState<string | null>(null);
  const [ogDescription, setOgDescription] = useState<string | null>(null);
  const [ogEditing, setOgEditing] = useState(false);
  const [ogTitleDraft, setOgTitleDraft] = useState('');
  const [ogDescDraft, setOgDescDraft] = useState('');
  const [ogSaving, setOgSaving] = useState(false);
  const [ogSaved, setOgSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalScreen, setShareModalScreen] = useState<'picker' | 'whatsapp' | 'ig-guide' | 'wa-status-guide' | 'fb-guide'>('picker');
  const [verifiedPhoneForPayment, setVerifiedPhoneForPayment] = useState('');
  const prevMsgCountRef = useRef(0);
  const confettiDone = useRef(false);
  // Inbox polling refs — production-grade silent background fetches
  const isInitialLoadRef = useRef(true);
  const lastFetchAtRef = useRef(0);
  const consecutiveFailsRef = useRef(0);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Phone verification state (Phase B) ──
  const [phoneStatus, setPhoneStatus] = useState<'loading' | 'none' | 'otp_sent' | 'verified'>('loading');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [phoneLastVerifiedAt, setPhoneLastVerifiedAt] = useState<string | null>(null);
  const [phoneLastRemovedAt, setPhoneLastRemovedAt] = useState<string | null>(null);
  const [phoneDevOtpMode, setPhoneDevOtpMode] = useState(false);
  const [phoneShowForm, setPhoneShowForm] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneInputError, setPhoneInputError] = useState('');
  const [phoneOtpDigits, setPhoneOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const phoneOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [phoneOtpStatus, setPhoneOtpStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'>('idle');
  const [phoneOtpError, setPhoneOtpError] = useState('');
  const [phoneOtpCooldown, setPhoneOtpCooldown] = useState(0);
  const phoneOtpCooldownRef = useRef<ReturnType<typeof setInterval>>();

  // B4: Inbox pagination state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // C8: Inbox search
  const [searchQuery, setSearchQuery] = useState('');

  // C10: Export state
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  // C3: Sound mute toggle (hydrates from localStorage)
  const [muted, setMuted] = useState<boolean>(() => getNglMuted());

  // Part 3: Premium flag (loaded from server profile)
  const [isPremium, setIsPremium] = useState<boolean>(false);
  // Part 3: Upgrade modal + post-upgrade celebration
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeToast, setUpgradeToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Phone removal loading state — disables UI until backend confirms full delete
  const [phoneRemoving, setPhoneRemoving] = useState(false);

  // Dynamically resolve base URL whether in dev (localhost) or prod
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.bongbari.com';
  const shareLink = `${baseUrl}/ngl/q/${username}`;

  const SHARE_TEMPLATES = lang === 'bn' ? [
    `আমাকে anonymous message পাঠাও 👀 কে পাঠিয়েছে জানা যাবে না 🤫\n\n${shareLink}`,
    `সত্যি কথা বলো, আমি জানবো না কে বলেছে 🔥\n\n${shareLink}`,
    `তোর সাহস থাকলে anonymous-এ বল 😏\n\n${shareLink}`,
    // A4: 3 more BN templates — professional / fun / mysterious vibes
    `মনে যা আছে বলে ফেল — নাম লাগবে না 💭 100% secret 🔒\n\n${shareLink}`,
    `আমাকে 3 শব্দে describe কর ✨ কেউ জানবে না তুই বলেছিস 🙊\n\n${shareLink}`,
    `আমার সম্পর্কে honest opinion দে — hide করা থাকবে 🫣\n\n${shareLink}`,
  ] : [
    `Send me anonymous messages 👀 You'll remain hidden 🤫\n\n${shareLink}`,
    `Tell me the truth, I won't know who said it 🔥\n\n${shareLink}`,
    `If you dare, say it anonymously 😏\n\n${shareLink}`,
    // A4: 3 more EN templates — professional / fun / mysterious vibes
    `Say what's on your mind — no name needed 💭 100% secret 🔒\n\n${shareLink}`,
    `Describe me in 3 words ✨ Nobody will know it's you 🙊\n\n${shareLink}`,
    `Drop your honest opinion about me — stays anonymous 🫣\n\n${shareLink}`,
  ];

  // Auth check
  useEffect(() => {
    const saved = localStorage.getItem('bong_ngl');
    if (!saved) { navigate('/ngl/create', { replace: true }); return; }
    try {
      const { username: u, secretKey: k } = JSON.parse(saved);
      if (u !== username) { navigate(`/ngl/at/${u}`, { replace: true }); return; }
      setSecretKey(k);
    } catch { navigate('/ngl/create', { replace: true }); }
  }, [username, navigate]);

  // Phase 25: Track dashboard load performance
  useEffect(() => {
    const t0 = performance.now();
    return () => {
      const dur = Math.round(performance.now() - t0);
      if (dur > 500) gEvent('perf_dashboard_load', { duration: String(dur) });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load profile
  useEffect(() => {
    if (!username) return;
    fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}`))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          if (d.prompt) { setPrompt(d.prompt); setHasServerPrompt(true); }
          if (d.theme) setTheme(d.theme);
          if (d.photo) setPhoto(d.photo);
          if (d.streakDays) setStreakDays(d.streakDays);
          if (d.ogTitle) setOgTitle(d.ogTitle);
          if (d.ogDescription) setOgDescription(d.ogDescription);
          // Part 3: Premium flag (0/1 from backend; treat undefined as 0)
          setIsPremium(!!d.isPremium);
        }
      })
      .catch(() => {});
    // Load phone verification status
    if (secretKey) {
      fetch(`${buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/phone`)}?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'X-NGL-Key': secretKey },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) { setPhoneStatus('none'); return; }
          const backendState = d.state as 'none' | 'otp_sent' | 'verified' | undefined;
          const nextState = backendState || 'none';
          setPhoneStatus(nextState);
          setPhoneMasked(d.phone || '');
          setPhoneDevOtpMode(!!d.devOtpMode);
          setPhoneLastVerifiedAt(d.lastVerifiedAt || null);
          setPhoneLastRemovedAt(d.lastRemovedAt || null);
          if (nextState === 'verified') {
            setVerifiedPhoneForPayment((d.phoneRaw || '').replace(/\D/g, '').slice(-10));
          } else {
            setVerifiedPhoneForPayment('');
          }
        })
        .catch(() => setPhoneStatus('none'));
    }
  }, [username, secretKey]);

  // Sync prompt language: translate prompt when language toggles
  useEffect(() => {
    // 1) If prompt is in the hardcoded pool → instant O(1) swap (no AI needed)
    const match = PROMPT_POOL.find(p => p.bn === prompt || p.en === prompt);
    if (match) {
      setPrompt(match[lang as 'bn' | 'en']);
      return;
    }
    // 2) Non-pool prompt (AI-generated or custom) → translate via server AI
    //    Show a temporary "..." indicator, then replace with real translation
    const originalPrompt = prompt;
    fetch(buildApiUrl('/api/ngl/prompts/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: originalPrompt, to: lang }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.translated && typeof data.translated === 'string' && data.translated !== originalPrompt) {
          setPrompt(data.translated);
          savePrompt(data.translated).catch(() => {});
        }
      })
      .catch(() => {}); // offline — keep original prompt as-is
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => { setIsOffline(false); setError(''); loadInbox({ manual: true }); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Load inbox — production-grade: distinguishes initial/manual vs background polls
  // Background polls are SILENT (no shimmer, no error UI, no retry chain) to prevent
  // the "automatically refreshing" feel when backend hiccups.
  const loadInbox = useCallback(async (opts: { manual?: boolean; retry?: number } = {}) => {
    const { manual = false, retry = 0 } = opts;
    if (!secretKey || !username) return;
    const isInitial = isInitialLoadRef.current;
    const isForeground = manual || isInitial;

    // Throttle background polls — never hammer backend
    if (!isForeground && Date.now() - lastFetchAtRef.current < 5000) return;
    lastFetchAtRef.current = Date.now();

    // Cancel any in-flight request before starting a new one
    if (inFlightAbortRef.current) inFlightAbortRef.current.abort();
    const ac = new AbortController();
    inFlightAbortRef.current = ac;

    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/inbox`), {
        headers: { 'X-NGL-Key': secretKey },
        signal: ac.signal,
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        setError('');
        consecutiveFailsRef.current = 0;
        setHasMore(!!data.hasMore);
        if (msgs.length > 0 && !confettiDone.current && prevMsgCountRef.current === 0) {
          confettiDone.current = true;
          if (containerRef.current) fireConfetti(containerRef.current);
        }
        if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
          setNewMsgCount(prev => prev + (msgs.length - prevMsgCountRef.current));
          sfxNewMessage();
        }
        prevMsgCountRef.current = msgs.length;
      } else if (res.status === 403) {
        setError('ERR_WRONG_KEY');
        localStorage.removeItem('bong_ngl');
      } else if (isForeground) {
        setError('ERR_SERVER');
      }
    } catch (e: any) {
      // Aborted — ignore silently
      if (e?.name === 'AbortError') return;
      consecutiveFailsRef.current += 1;
      // Background polls: silent fail, no UI flicker
      if (!isForeground) {
        if (isForeground) setLoading(false);
        return;
      }
      // Foreground (initial / manual): retry with exponential backoff up to 3x
      if (retry < 3) {
        const delay = Math.pow(2, retry + 1) * 1000;
        setError('ERR_RETRYING');
        setTimeout(() => { setError(''); loadInbox({ manual: true, retry: retry + 1 }); }, delay);
        return;
      }
      // Final fallback — only show connection error after retries exhausted
      if (navigator.onLine) setError('ERR_CONNECTION');
      else setIsOffline(true);
    } finally {
      if (isForeground) setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [secretKey, username]);

  // Polling — only when Inbox tab is active, tab visible, online, no modals open
  useEffect(() => {
    // Always do initial fetch once
    if (isInitialLoadRef.current) loadInbox({ manual: true });

    // Skip polling when not actively viewing inbox or any blocking modal is open
    const blocked = tab !== 'inbox' || isOffline || phoneShowForm || showSettings || showShareModal || showUpgrade || showThemePicker;
    if (blocked) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') loadInbox();
      }, 30000); // 30s — Instagram/Twitter parity
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Refetch on tab focus if last fetch is stale (>15s)
        if (Date.now() - lastFetchAtRef.current > 15000) loadInbox();
        startPolling();
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    if (document.visibilityState === 'visible') startPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadInbox, tab, isOffline, phoneShowForm, showSettings, showShareModal, showUpgrade, showThemePicker]);

  const handleCopy = async () => {
    gEvent('ngl_copy_link');
    haptic('tap');
    let ok = false;
    try { await navigator.clipboard.writeText(shareLink); ok = true; } catch {
      try {
        const el = document.createElement('textarea'); el.value = shareLink;
        document.body.appendChild(el); el.select();
        ok = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {}
    }
    if (ok) { haptic('success'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleShare = async () => {
    haptic('tap');
    const text = SHARE_TEMPLATES[Math.floor(Math.random() * SHARE_TEMPLATES.length)];
    if (navigator.share) {
      try { await navigator.share({ title: 'Bong NGL', text, url: shareLink }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleWhatsApp = () => {
    const text = SHARE_TEMPLATES[Math.floor(Math.random() * SHARE_TEMPLATES.length)];
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleInstagram = async () => {
    const text = lang === 'bn'
      ? `আমাকে anonymous message পাঠাও 👀\n${shareLink}`
      : `Send me anonymous messages 👀\n${shareLink}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    alert(t('dash.igAlert'));
  };

  const handleDelete = async (id: string) => {
    haptic('warn');
    try {
      await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/message/${id}`), {
        method: 'DELETE',
        headers: { 'X-NGL-Key': secretKey },
      });
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  // B3: Pin / unpin a message. Optimistic UI — reverts on server failure.
  const handleTogglePin = async (id: string) => {
    const current = messages.find(m => m.id === id);
    if (!current) return;
    const nextPinned = !(current.pinned && current.pinned > 0);

    // Enforce max-3 client-side too (server also enforces)
    if (nextPinned) {
      const currentPinned = messages.filter(m => m.pinned && m.pinned > 0).length;
      if (currentPinned >= 3) {
        alert(t('dash.pinLimitReached'));
        return;
      }
    }

    // Optimistic update
    setMessages(prev => prev.map(m => m.id === id ? { ...m, pinned: nextPinned ? Date.now() : 0 } : m));
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/message/${id}/pin`), {
        method: 'PUT',
        headers: { 'X-NGL-Key': secretKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      if (!res.ok) throw new Error('pin failed');
      gEvent('ngl_pin_message', { state: nextPinned ? 'on' : 'off' });
    } catch {
      // Revert
      setMessages(prev => prev.map(m => m.id === id ? { ...m, pinned: current.pinned || 0 } : m));
    }
  };

  // B2: Block the sender of a specific message by fingerprint.
  const handleBlockSender = async (id: string) => {
    if (!confirm(t('dash.blockConfirm'))) return;
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/message/${id}/block`), {
        method: 'POST',
        headers: { 'X-NGL-Key': secretKey, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        gEvent('ngl_block_sender');
        alert(t('dash.blocked'));
        // Also remove the offending message from inbox
        handleDelete(id);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.message || t('dash.genericError'));
      }
    } catch {
      alert(t('dash.networkError'));
    }
  };

  // B4: Pagination handler (state declared earlier)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = messages.length;
      const res = await fetch(
        buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/inbox?limit=20&offset=${offset}`),
        { headers: { 'X-NGL-Key': secretKey } },
      );
      if (res.ok) {
        const data = await res.json();
        const more = (data.messages || []) as NglMessage[];
        setMessages(prev => {
          const seen = new Set(prev.map(m => m.id));
          return [...prev, ...more.filter(m => !seen.has(m.id))];
        });
        setHasMore(!!data.hasMore);
      }
    } catch {
      setError('ERR_NETWORK');
    }
    setLoadingMore(false);
  };

  // C10: Export inbox as JSON download (client-side, uses loaded messages)
  const handleExport = async () => {
    if (exporting) return;
    gEvent('ngl_export_data');
    setExporting(true);
    try {
      // Fetch full inbox (up to 200) — then build JSON blob
      const res = await fetch(
        buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/inbox?limit=200&offset=0`),
        { headers: { 'X-NGL-Key': secretKey } },
      );
      let allMessages: NglMessage[] = messages;
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) allMessages = data.messages;
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        username,
        totalMessages: allMessages.length,
        messages: allMessages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bong-ngl-${username}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch {
      // silent failure — button re-enables
    }
    setExporting(false);
  };

  // C3: Toggle sound on/off
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setNglMuted(next);
    if (!next) sfxTap(); // audible confirmation when turning ON
  };

  const handleDice = async () => {
    gEvent('ngl_prompt_shuffle');
    haptic('tap');
    setDiceLoading(true);
    sfxDicePop();
    const pool = PROMPT_POOL.filter(p => p[lang as 'bn' | 'en'] !== prompt);
    const pick = pool[Math.floor(Math.random() * pool.length)][lang as 'bn' | 'en'];
    let nextPrompt = pick;
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/prompts/random?lang=${lang}`));
      if (res.ok) {
        const data = await res.json().catch(() => ({} as any));
        if (data?.prompt && typeof data.prompt === 'string') nextPrompt = data.prompt;
      }
    } catch {
      // offline — keep local pick
    }
    // Optimistic UI update so the button always feels alive, even if PUT fails.
    setPrompt(nextPrompt);
    setDiceFlash(true);
    setDiceToast(true);
    setTimeout(() => setDiceFlash(false), 1200);
    setTimeout(() => setDiceToast(false), 2500);
    // Persist in background (non-blocking); ignore failure.
    savePrompt(nextPrompt).catch(() => {});
    setDiceLoading(false);
  };

  const handleBanish = async () => {
    if (banishConfirm.toLowerCase() !== username.toLowerCase()) return;
    setBanishing(true);
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}`), {
        method: 'DELETE',
        headers: { 'X-NGL-Key': secretKey },
      });
      if (res.ok) {
        localStorage.removeItem('bong_ngl');
        navigate('/ngl');
      }
    } catch {}
    setBanishing(false);
  };

  const savePrompt = async (newPrompt: string) => {
    if (!secretKey) return;
    setSavingPrompt(true);
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/prompt`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ prompt: newPrompt }),
      });
      if (res.ok) { const data = await res.json(); setPrompt(data.prompt); setHasServerPrompt(true); setEditingPrompt(false); }
    } catch {}
    setSavingPrompt(false);
  };

  const handlePromptSave = () => { if (promptDraft.trim().length >= 3) savePrompt(promptDraft.trim()); };

  const handleEnhance = async () => {
    if (!promptDraft.trim() || promptDraft.trim().length < 3 || enhancing) return;
    setEnhancing(true);
    try {
      const res = await fetch(buildApiUrl('/api/ngl/prompts/enhance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptDraft.trim(), lang }),
      });
      const data = await res.json();
      if (data.enhanced) setPromptDraft(data.enhanced);
    } catch {}
    setEnhancing(false);
  };

  // ── Phone verification helpers (Phase B) ──
  const isValidPhone = (p: string) => /^[6-9]\d{9}$/.test(p);

  const startPhoneCooldown = (seconds: number) => {
    setPhoneOtpCooldown(seconds);
    if (phoneOtpCooldownRef.current) clearInterval(phoneOtpCooldownRef.current);
    phoneOtpCooldownRef.current = setInterval(() => {
      setPhoneOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(phoneOtpCooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendPhoneOtp = async (phone: string) => {
    setPhoneOtpStatus('sending');
    setPhoneOtpError('');
    try {
      const res = await fetch(buildApiUrl('/api/ngl/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, phone, key: secretKey }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPhoneOtpStatus('sent');
        setPhoneStatus('otp_sent');
        setPhoneMasked(data.phone || `+91 ${phone.slice(0, 5)}•••••`);
        setPhoneDevOtpMode(!!data.devOtpMode);
        startPhoneCooldown(60);
      } else if (res.status === 429) {
        setPhoneOtpStatus('sent');
        setPhoneStatus('otp_sent');
        const waitMatch = (data.message || '').match(/(\d+)s/);
        startPhoneCooldown(waitMatch ? parseInt(waitMatch[1]) : 30);
        setPhoneMasked(`+91 ${phone.slice(0, 5)}•••••`);
      } else {
        setPhoneOtpStatus('error');
        setPhoneOtpError(t('otp.sendFailed'));
      }
    } catch {
      setPhoneOtpStatus('error');
      setPhoneOtpError(t('otp.sendFailed'));
    }
  };

  const handlePhoneSendOtp = () => {
    // Hidden dev shortcut: if a valid secret code is entered in phone field,
    // backend unlocks test mode silently with no UI hint.
    (async () => {
      try {
        const unlockRes = await fetch(buildApiUrl('/api/ngl/dev/unlock-test-mode'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, key: secretKey, code: phoneInput }),
        });
        if (unlockRes.ok) {
          const unlockData = await unlockRes.json().catch(() => null);
          localStorage.setItem('ngl_test_mode', '1');
          if (unlockData?.testToken) localStorage.setItem('ngl_test_token', String(unlockData.testToken));
          setPhoneInput('');
          setPhoneInputError('');
          setPhoneShowForm(false);
          return;
        }
      } catch {
        // Silent by design; fallback to normal OTP flow.
      }

      if (!isValidPhone(phoneInput)) {
        setPhoneInputError(t('dash.phoneInvalid'));
        return;
      }
      setPhoneInputError('');
      sendPhoneOtp(phoneInput);
    })();
  };

  const handlePhoneResend = () => {
    if (phoneOtpCooldown > 0) return;
    setPhoneOtpDigits(['', '', '', '', '', '']);
    setPhoneOtpError('');
    sendPhoneOtp(phoneInput);
  };

  const handlePhoneReset = async () => {
    if (phoneRemoving) return;
    setPhoneRemoving(true);
    try {
      const res = await fetch(buildApiUrl('/api/ngl/otp/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, key: secretKey }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(lang === 'bn' ? 'নম্বর মুছতে ব্যর্থ' : 'Failed to remove phone. Try again.');
        return;
      }
      // Re-fetch authoritative state from backend to confirm delete fully persisted
      try {
        const verifyRes = await fetch(`${buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/phone`)}?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'X-NGL-Key': secretKey },
        });
        const verifyData = verifyRes.ok ? await verifyRes.json().catch(() => null) : null;
        if (verifyData && verifyData.state && verifyData.state !== 'none') {
          // Backend still has the phone — abort UI clear, surface error
          setError(lang === 'bn' ? 'সার্ভার থেকে মুছতে দেরি হচ্ছে। আবার চেষ্টা করো।' : 'Server delete still pending. Please try again.');
          return;
        }
      } catch { /* network hiccup — fall through and clear local state */ }
      // Full clean — reset every phone-related piece of UI state
      setPhoneStatus('none');
      setPhoneMasked('');
      setPhoneOtpStatus('idle');
      setPhoneOtpDigits(['', '', '', '', '', '']);
      setPhoneOtpError('');
      setPhoneInput('');
      setPhoneInputError('');
      setPhoneShowForm(false);
      setPhoneLastVerifiedAt(null);
      setPhoneLastRemovedAt(data?.lastRemovedAt || new Date().toISOString());
      setPhoneDevOtpMode(false);
      setVerifiedPhoneForPayment('');
      // Also clear any stashed test-mode flags so PRO/test surfaces reset
      try {
        localStorage.removeItem('ngl_test_mode');
        localStorage.removeItem('ngl_test_token');
      } catch { /* ignore */ }
    } catch {
      setError(lang === 'bn' ? 'নম্বর মুছতে ব্যর্থ' : 'Failed to remove phone. Try again.');
    } finally {
      setPhoneRemoving(false);
    }
  };

  const handlePhoneVerifyOtp = async () => {
    const code = phoneOtpDigits.join('');
    if (code.length !== 6) return;
    setPhoneOtpStatus('verifying');
    setPhoneOtpError('');
    try {
      const res = await fetch(buildApiUrl('/api/ngl/otp/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp: code, key: secretKey }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setPhoneOtpStatus('verified');
        setPhoneStatus('verified');
        setPhoneLastVerifiedAt(data.lastVerifiedAt || new Date().toISOString());
        setPhoneShowForm(false);
        setVerifiedPhoneForPayment(phoneInput.replace(/\D/g, '').slice(-10));
        // Reset after animation
        setTimeout(() => { setPhoneOtpStatus('idle'); setPhoneOtpDigits(['', '', '', '', '', '']); }, 1500);
      } else {
        setPhoneOtpStatus('sent');
        const msg = data.message || '';
        setPhoneOtpError(msg.toLowerCase().includes('expire') ? t('otp.expired') : t('otp.wrongCode'));
        setPhoneOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => phoneOtpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setPhoneOtpStatus('sent');
      setPhoneOtpError(t('otp.sendFailed'));
    }
  };

  const handlePhoneOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...phoneOtpDigits];
    newDigits[index] = digit;
    setPhoneOtpDigits(newDigits);
    setPhoneOtpError('');
    if (digit && index < 5) phoneOtpRefs.current[index + 1]?.focus();
    if (digit && index === 5 && newDigits.every(d => d)) {
      setTimeout(() => handlePhoneVerifyOtp(), 150);
    }
  };

  const handlePhoneOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !phoneOtpDigits[index] && index > 0) phoneOtpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handlePhoneVerifyOtp();
  };

  const handlePhoneOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted.length) return;
    const newDigits = [...phoneOtpDigits];
    for (let i = 0; i < pasted.length && i < 6; i++) newDigits[i] = pasted[i];
    setPhoneOtpDigits(newDigits);
    phoneOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) setTimeout(() => handlePhoneVerifyOtp(), 150);
  };

  const handleLogout = () => { localStorage.removeItem('bong_ngl'); navigate('/ngl'); };

  // ── Story Card Color Palettes (3 free + 5 PRO) ──
  const STORY_PALETTES: Array<{ label: string; colors: string[] | null; pro?: boolean }> = [
    { label: '🎨 Theme', colors: null },                                                    // FREE — uses current theme
    { label: '🌸 Cherry', colors: ['#fce7f3', '#f9a8d4', '#ec4899', '#be185d'] },           // FREE
    { label: '☁️ Minimal', colors: ['#e5e7eb', '#9ca3af', '#4b5563', '#1f2937'] },          // FREE
    { label: '🌌 Aurora', colors: ['#06b6d4', '#10b981', '#8b5cf6', '#ec4899'], pro: true },
    { label: '🌅 Sunset', colors: ['#fbbf24', '#f97316', '#ef4444', '#7c3aed'], pro: true },
    { label: '⚡ Neon', colors: ['#0ff0fc', '#7c3aed', '#f43f5e', '#fbbf24'], pro: true },
    { label: '🌑 Midnight', colors: ['#020617', '#0f172a', '#1e1b4b', '#312e81'], pro: true },
    { label: '🥀 Velvet', colors: ['#fda4af', '#e11d48', '#9f1239', '#fbbf24'], pro: true },
  ];

  // Phase 31+32: Generate Story Card with embedded QR code — returns data URL
  const buildStoryCanvas = async (paletteIdx: number, opts?: { customPrompt?: string; showQR?: boolean }): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    // Pick colors
    const palette = STORY_PALETTES[paletteIdx];
    let gradientColors: string[];
    if (!palette || !palette.colors) {
      const themeGrad = NGL_THEMES[theme] || NGL_THEMES.default;
      gradientColors = themeGrad.bg.match(/#[a-fA-F0-9]{6}/g) || ['#667eea', '#f8477a', '#ee6b3b'];
    } else {
      gradientColors = palette.colors;
    }

    // Contrast-safe text system: pick true opposite text color for max readability.
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const relativeLuminance = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      const toLinear = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const R = toLinear(r);
      const G = toLinear(g);
      const B = toLinear(b);
      return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };
    const contrastRatio = (a: string, b: string) => {
      const L1 = relativeLuminance(a);
      const L2 = relativeLuminance(b);
      const light = Math.max(L1, L2);
      const dark = Math.min(L1, L2);
      return (light + 0.05) / (dark + 0.05);
    };
    const avgRgb = gradientColors.reduce((acc, hex) => {
      const { r, g, b } = hexToRgb(hex);
      return { r: acc.r + r, g: acc.g + g, b: acc.b + b };
    }, { r: 0, g: 0, b: 0 });
    const bgSample = `#${Math.round(avgRgb.r / gradientColors.length).toString(16).padStart(2, '0')}${Math.round(avgRgb.g / gradientColors.length).toString(16).padStart(2, '0')}${Math.round(avgRgb.b / gradientColors.length).toString(16).padStart(2, '0')}`;
    const contrastOnWhite = contrastRatio(bgSample, '#ffffff');
    const contrastOnDark = contrastRatio(bgSample, '#0b1020');
    const useDarkText = contrastOnDark >= contrastOnWhite;

    const textMain = useDarkText ? '#0b1020' : '#ffffff';
    const textSoft = useDarkText ? 'rgba(11,16,32,0.92)' : 'rgba(255,255,255,0.96)';
    const textMuted = useDarkText ? 'rgba(11,16,32,0.82)' : 'rgba(255,255,255,0.86)';
    const textFaint = useDarkText ? 'rgba(11,16,32,0.72)' : 'rgba(255,255,255,0.76)';
    const glassCard = useDarkText ? 'rgba(255,255,255,0.34)' : 'rgba(7,10,20,0.30)';
    const glassStroke = useDarkText ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.30)';
    const avatarBg = useDarkText ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.22)';
    const ctaBg = useDarkText ? '#0b1020' : '#ffffff';
    const ctaText = useDarkText ? '#ffffff' : '#0b1020';
    const qrDark = '#0b1020';
    const qrLight = '#ffffff';
    const qrContainerBg = 'rgba(255,255,255,0.96)';

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradientColors.forEach((c: string, i: number) => bgGrad.addColorStop(i / (gradientColors.length - 1), c));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle pattern dots for depth
    ctx.fillStyle = useDarkText ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
    for (let px = 0; px < canvas.width; px += 40) {
      for (let py = 0; py < canvas.height; py += 40) {
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Glass card
    ctx.fillStyle = glassCard;
    const cardX = 80, cardY = 430, cardW = 920, cardH = 650, cardR = 50;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
    ctx.fill();
    ctx.strokeStyle = glassStroke;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Avatar circle
    ctx.fillStyle = avatarBg;
    ctx.beginPath();
    ctx.arc(540, 360, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textMain;
    ctx.font = '900 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(username[0]?.toUpperCase() || '?', 540, 383);

    // Username
    ctx.font = '900 56px system-ui, sans-serif';
    ctx.fillStyle = textMain;
    ctx.textAlign = 'center';
    ctx.shadowColor = useDarkText ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.fillText(`@${username}`, 540, 550);
    ctx.shadowBlur = 0;

    // PRO badge
    ctx.fillStyle = useDarkText ? '#5b21b6' : '#a78bfa';
    ctx.beginPath();
    ctx.roundRect(490, 570, 100, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('PRO', 540, 595);

    // Prompt — BIG, bold, auto-wrapped for max readability (NGL/Sendit-style)
    const rawPrompt = (opts?.customPrompt ?? prompt) || '';
    const promptText = decodeEntities(rawPrompt).trim().slice(0, 140);
    // Word-wrap helper that picks the largest font-size that fits within maxLines
    const wrapText = (text: string, maxWidth: number, maxLines: number, startSize: number, minSize: number) => {
      let size = startSize;
      while (size >= minSize) {
        ctx.font = `900 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let current = '';
        for (const w of words) {
          const test = current ? `${current} ${w}` : w;
          if (ctx.measureText(test).width <= maxWidth) {
            current = test;
          } else {
            if (current) lines.push(current);
            current = w;
          }
        }
        if (current) lines.push(current);
        if (lines.length <= maxLines) return { lines, size };
        size -= 4;
      }
      // Fallback at min size with ellipsis on last line
      ctx.font = `900 ${minSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let current = '';
      for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (ctx.measureText(test).width <= maxWidth) current = test;
        else { if (current) lines.push(current); current = w; if (lines.length === maxLines) break; }
      }
      if (lines.length < maxLines && current) lines.push(current);
      if (lines.length === maxLines) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s\S*$/, '') + '…';
      return { lines, size: minSize };
    };

    const wrapped = wrapText(`“${promptText}”`, 820, 3, 58, 36);
    ctx.fillStyle = textMain;
    ctx.shadowColor = useDarkText ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 10;
    const lineHeight = Math.round(wrapped.size * 1.18);
    const totalHeight = wrapped.lines.length * lineHeight;
    const blockTop = 670 + (160 - totalHeight) / 2; // vertically center inside reserved 160px zone
    wrapped.lines.forEach((line, i) => {
      ctx.fillText(line, 540, blockTop + i * lineHeight + wrapped.size * 0.85);
    });
    ctx.shadowBlur = 0;

    // Messages count (only show if > 0 AND there's room — single line space)
    if (messages.length > 0 && wrapped.lines.length === 1) {
      ctx.fillStyle = textMuted;
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillText(`🔥 ${messages.length} messages received`, 540, 800);
    }

    // CTA button
    ctx.fillStyle = ctaBg;
    ctx.beginPath();
    ctx.roundRect(240, 850, 600, 80, 40);
    ctx.fill();
    ctx.fillStyle = ctaText;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(lang === 'bn' ? 'আমাকে anonymous message পাঠাও! →' : 'Send me anonymous messages! →', 540, 900);

    // ── QR code embedded (if enabled) ──
    const qrEnabled = opts?.showQR !== false;
    if (qrEnabled) {
      try {
        const qrDataUrl = await QRCode.toDataURL(shareLink, {
          width: 280,
          margin: 2,
          color: { dark: qrDark, light: qrLight },
          errorCorrectionLevel: 'H',
        });
        const qrImg = new Image();
        await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); qrImg.src = qrDataUrl; });
        // QR container with rounded rect bg
        ctx.fillStyle = qrContainerBg;
        ctx.beginPath();
        ctx.roundRect(390, 1040, 300, 300, 30);
        ctx.fill();
        ctx.drawImage(qrImg, 400, 1050, 280, 280);
      } catch {}

      // "Scan to send" label under QR
      ctx.fillStyle = textMuted;
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillText(lang === 'bn' ? 'স্ক্যান করো 📱' : 'Scan to send 📱', 540, 1380);
    }

    // Link below QR (or centered if no QR)
    ctx.fillStyle = textFaint;
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.fillText(shareLink.replace('https://', ''), 540, qrEnabled ? 1430 : 1120);

    // Branding
    ctx.fillStyle = textFaint;
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('বং NGL by Bong Bari', 540, 1820);

    return canvas.toDataURL('image/png');
  };

  // ── Story card helpers ──
  const storyOpts = () => ({ customPrompt: storyCustomPrompt ?? undefined, showQR: storyShowQR });
  const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

  const openStoryPreview = async () => {
    setGeneratingCard(true);
    setStoryCustomPrompt(null);
    setStoryShowQR(true);
    setStoryEditingText(false);
    try {
      const dataUrl = await buildStoryCanvas(storyColorIdx, { showQR: true });
      setStoryPreview(dataUrl);
      setShowStoryCardModal(true);
    } catch {
      showStoryToast(lang === 'bn' ? 'Story card তৈরি করা গেল না' : 'Could not generate story card');
    } finally {
      setGeneratingCard(false);
    }
  };

  // Silently generate story card image (no modal) — for tutorial preview
  const generateCardSilently = async () => {
    if (storyPreview) return; // already generated
    try {
      const dataUrl = await buildStoryCanvas(storyColorIdx, { showQR: true });
      setStoryPreview(dataUrl);
    } catch {
      // Non-blocking warmup; ignore failures silently.
    }
  };

  const regenerateCard = async (paletteIdx?: number, opts?: { customPrompt?: string; showQR?: boolean }) => {
    setGeneratingCard(true);
    try {
      await new Promise(r => setTimeout(r, 50));
      const idx = paletteIdx ?? storyColorIdx;
      const o = opts ?? storyOpts();
      const dataUrl = await buildStoryCanvas(idx, o);
      setStoryPreview(dataUrl);
    } catch {
      showStoryToast(lang === 'bn' ? 'Story card আপডেট করা গেল না' : 'Could not update story card');
    } finally {
      setGeneratingCard(false);
    }
  };

  const changeStoryColor = async (idx: number) => {
    setStoryColorIdx(idx);
    await regenerateCard(idx);
  };

  const toggleStoryQR = async () => {
    const next = !storyShowQR;
    setStoryShowQR(next);
    await regenerateCard(undefined, { ...storyOpts(), showQR: next });
  };

  const saveStoryText = async () => {
    const trimmed = storyTextDraft.trim();
    if (!trimmed) return;
    setStoryCustomPrompt(trimmed);
    setStoryEditingText(false);
    await regenerateCard(undefined, { ...storyOpts(), customPrompt: trimmed });
  };

  const showStoryToast = (msg: string, ms = 2500) => { setStoryToast(msg); setTimeout(() => setStoryToast(null), ms); };

  const downloadStoryCard = async () => {
    if (!storyPreview) return;
    const filename = `bong-ngl-${username}-story.png`;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    try {
      // Convert dataURL → Blob (better quality, supports Web Share + saves correctly on iOS)
      const res = await fetch(storyPreview);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      // iOS Safari: anchor download is unreliable → prefer Web Share so user can "Save Image"
      if (isIOS && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Bong NGL Story Card' });
          showStoryToast(lang === 'bn' ? '✓ Save করা হয়েছে!' : '✓ Saved!');
          return;
        } catch { /* user cancelled — fall through to blob URL */ }
      }

      // Standard path: blob URL + revoke (works on all desktops + Android)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showStoryToast(lang === 'bn' ? '⬇️ Download হয়েছে!' : '⬇️ Downloaded!');
    } catch {
      // Last-resort fallback: open in new tab so user can long-press / right-click → save
      try {
        const w = window.open();
        if (w) { w.document.write(`<img src="${storyPreview}" style="max-width:100%" alt="story"/>`); }
        showStoryToast(lang === 'bn' ? '👇 Image hold করে Save করো' : '👇 Long-press image to save');
      } catch {
        showStoryToast(lang === 'bn' ? 'Download fail হলো' : 'Download failed');
      }
    }
  };

  const shareStoryCard = async () => {
    if (!storyPreview) return;
    setStorySharing(true);
    try {
      const res = await fetch(storyPreview);
      const blob = await res.blob();
      const file = new File([blob], `bong-ngl-${username}-story.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Bong NGL Story Card' });
        showStoryToast(lang === 'bn' ? '✓ Share হয়েছে!' : '✓ Shared!');
      } else {
        downloadStoryCard();
      }
    } catch {
      // User cancelled or fallback
      downloadStoryCard();
    }
    setStorySharing(false);
  };

  const copyLinkFromStory = async () => {
    try { await navigator.clipboard.writeText(shareLink); } catch {
      const el = document.createElement('textarea'); el.value = shareLink;
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    }
    showStoryToast(lang === 'bn' ? '✓ Link কপি! chat-এ paste করো ✨' : '✓ Link copied! Paste in any chat ✨', 3000);
  };

  const saveOgMeta = async () => {
    setOgSaving(true);
    setOgSaved(false);
    try {
      const r = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/og`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ ogTitle: ogTitleDraft.trim() || null, ogDescription: ogDescDraft.trim() || null }),
      });
      if (r.ok) {
        const d = await r.json();
        setOgTitle(d.ogTitle);
        setOgDescription(d.ogDescription);
        setOgSaved(true);
        setTimeout(() => setOgSaved(false), 3000);
      }
    } catch {}
    setOgSaving(false);
  };

  // Phase 27: React to a message
  const handleReact = async (msgId: string, reaction: string | null) => {
    gEvent('ngl_reaction', { reaction: reaction || 'remove' });
    sfxTap();
    try {
      const currentMsg = messages.find(m => m.id === msgId);
      const newReaction = currentMsg?.reaction === reaction ? null : reaction;
      await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/message/${msgId}/react`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ reaction: newReaction }),
      });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: newReaction } : m));
    } catch {}
    setReactingId(null);
  };

  // Phase 28: Set theme — NO auto-close, user taps ✕ when done
  const handleSetTheme = async (newTheme: string) => {
    if (newTheme === theme) return; // already selected
    gEvent('ngl_theme_change', { theme: newTheme });
    setSettingTheme(true);
    setTheme(newTheme); // optimistic instant switch
    try {
      await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/theme`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {}
    setSettingTheme(false);
    // picker stays open so user can browse themes freely
  };

  // Phase 29: Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 100_000) {
      // Compress: draw to canvas
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          // Crop to square center
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          uploadPhoto(dataUrl);
        };
      };
      reader.readAsDataURL(file);
    } else {
      // Small enough — still crop to square
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          uploadPhoto(dataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const uploadPhoto = async (dataUrl: string) => {
    setUploadingPhoto(true);
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/photo`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ photo: dataUrl }),
      });
      if (res.ok) setPhoto(dataUrl);
    } catch {}
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/photo`), {
        method: 'DELETE',
        headers: { 'X-NGL-Key': secretKey },
      });
      if (res.ok) setPhoto(null);
    } catch {}
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=hidden, 1=confirm username, 2=farewell

  return (
    <>
      <SEOHead
        title={`@${username} Dashboard — Bong NGL`}
        description="View your anonymous messages inbox."
        url={`https://www.bongbari.com/ngl/at/${username}`}
      />
      <div
        ref={containerRef}
        className="fixed inset-0 z-50 w-full overflow-hidden flex flex-col items-center"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: '#0a0a14',
        }}
      >
        {/* Theme ambient glow — top */}
        <div
          className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none blur-[140px] z-0"
          style={{
            background: NGL_THEMES[theme]?.bg || NGL_THEMES.default.bg,
            opacity: 0.12,
            transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Bottom vignette for depth */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />

        {/* Content layer */}
        <div className="relative z-10 h-full w-full flex flex-col items-center overflow-hidden">
        {/* Hidden photo input */}
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        {/* ── Top bar ── glass minimal with gradient underline */}
        <div className="w-full flex items-center justify-between px-4 sm:px-6 pt-2 pb-1.5 flex-shrink-0 max-w-2xl relative">
          <Link href="/tools" className="text-white/40 text-[11px] font-bold hover:text-white transition-colors flex items-center gap-1">
            <span className="text-[13px]">←</span> Back
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="relative text-white/50 hover:text-white/90 hover:bg-white/[0.04] rounded-lg transition-all p-1.5" aria-label="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              {phoneStatus !== 'verified' && phoneStatus !== 'loading' && (
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.5 }}
                  className="absolute top-0.5 right-0.5 w-[7px] h-[7px] rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                />
              )}
            </button>
          </div>
        </div>

        {/* Stats integrated into profile card — no separate strip */}

        {/* ── Tab bar ── compact pill style */}
        <div className="flex w-full max-w-2xl px-4 sm:px-6 mb-1 flex-shrink-0">
          <div className="flex w-full bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.06]">
            <button
              onClick={() => { gEvent('ngl_tab_switch', { tab: 'play' }); haptic('tap'); setTab('play'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-extrabold rounded-lg transition-all duration-300 ${tab === 'play' ? `bg-gradient-to-r ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} text-white shadow-lg` : 'text-white/30 hover:text-white/50'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {lang === 'bn' ? 'হোম' : 'Home'}
            </button>
            <button
              onClick={() => { gEvent('ngl_tab_switch', { tab: 'inbox' }); haptic('tap'); setTab('inbox'); setNewMsgCount(0); }}
              data-tour="inbox-tab"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-extrabold rounded-lg transition-all duration-300 relative ${tab === 'inbox' ? `bg-gradient-to-r ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} text-white shadow-lg` : 'text-white/30 hover:text-white/50'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {lang === 'bn' ? 'ইনবক্স' : 'Inbox'}
              {(messages.length > 0 || newMsgCount > 0) && (
                <motion.span
                  key={messages.length}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -top-1 -right-1 text-white text-[9px] w-4.5 h-4.5 min-w-[18px] rounded-full flex items-center justify-center font-black ${newMsgCount > 0 ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/40' : 'bg-white/20'}`}
                >
                  {messages.length > 99 ? '99+' : messages.length}
                </motion.span>
              )}
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 w-full max-w-2xl px-4 sm:px-6 pb-4 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {tab === 'play' ? (
              <motion.div
                key="play"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-2.5 pt-1"
              >
                {/* ═══ HERO: Compact identity ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 px-1"
                >
                  <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                    <div className="w-12 h-12 rounded-2xl p-[2px] transition-all duration-500 shadow-md shadow-black/20" style={{ background: NGL_THEMES[theme]?.bg || NGL_THEMES.default.bg }}>
                      {photo ? (
                        <img src={photo} alt={username} className="w-full h-full rounded-[10px] object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-[10px] bg-[#0a0a14] flex items-center justify-center text-white font-black text-lg">
                          {username[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white/60">{uploadingPhoto ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 animate-spin"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}</span>
                    </div>
                    {photo && (
                      <button onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }} className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a14] border border-white/10 flex items-center justify-center text-white/30 hover:text-red-400/60 transition-colors text-[8px] min-w-[44px] min-h-[44px] -m-[10px]">✕</button>
                    )}
                    {phoneStatus === 'verified' && (
                      <span className="absolute -top-0.5 -right-0.5 w-[10px] h-[10px] rounded-full bg-emerald-400 border-2 border-[#0a0a14] shadow-sm shadow-emerald-400/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <p className="font-black text-white text-[17px] leading-none tracking-tight truncate">@{username}</p>
                    {isPremium && (
                      <span className="text-[10px] font-black italic tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent select-none flex-shrink-0">✓ PRO</span>
                    )}
                  </div>
                  {/* Crown CTA — free users only, draws eye to upgrade */}
                  {!isPremium && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { gEvent('ngl_pro_cta_click', { source: 'crown' }); setShowUpgrade(true); }}
                      className="relative flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 transition-shadow"
                      title={lang === 'bn' ? 'PRO তে আপগ্রেড — ₹98/মাস' : 'Upgrade to PRO — ₹98/mo'}
                    >
                      <svg viewBox="0 0 24 24" fill="white" className="w-[15px] h-[15px] relative z-10 drop-shadow-sm">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3h14v2H5z"/>
                      </svg>
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-120%', '220%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
                      />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-white/30 hover:text-white/60 hover:bg-white/[0.05]"
                    title={lang === 'bn' ? 'শেয়ার করো' : 'Share'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </motion.button>
                </motion.div>

                {/* Stats strip — minimal, only if present */}
                {(streakDays > 0 || messages.length > 0) && (
                  <div className="flex items-center justify-center gap-2 px-1 -mt-1">
                    {streakDays > 0 && (
                      <span className="text-[10px] font-bold text-amber-300/70 inline-flex items-center gap-1">
                        <span>🔥</span>{streakDays}d
                      </span>
                    )}
                    {streakDays > 0 && messages.length > 0 && <span className="text-white/15 text-[10px]">·</span>}
                    {messages.length > 0 && (
                      <span className="text-[10px] font-bold text-white/30">{messages.length} {lang === 'bn' ? 'বার্তা' : 'msgs'}</span>
                    )}
                  </div>
                )}

                {/* ═══ PROMPT: What people see — THE STAR of the page ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                  data-tour="prompt"
                  className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${diceFlash ? 'ring-1 ring-emerald-400/20' : ''}`}
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0.12) 100%)', boxShadow: '0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                  {/* Accent bar — left edge */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} opacity-60`} />

                  <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                    <AnimatePresence mode="wait">
                      {editingPrompt ? (
                        <motion.div key="edit" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <input
                            type="text" value={promptDraft} onChange={e => setPromptDraft(e.target.value.slice(0, 200))}
                            autoFocus placeholder={t('dash.promptPlaceholder')}
                            className="w-full text-white font-semibold text-[18px] sm:text-[20px] border-b border-white/15 outline-none pb-3 bg-transparent placeholder:text-white/15"
                            onKeyDown={e => e.key === 'Enter' && handlePromptSave()}
                          />
                          <div className="flex gap-2 mt-4 items-center flex-wrap">
                            <button onClick={handlePromptSave} disabled={savingPrompt || promptDraft.trim().length < 3} className="text-[11px] font-bold bg-white/10 text-white px-5 py-2 rounded-full disabled:opacity-20 border border-white/10 hover:bg-white/15 transition-all active:scale-[0.97]">{savingPrompt ? '...' : t('dash.save')}</button>
                            <button onClick={handleEnhance} disabled={enhancing || promptDraft.trim().length < 3} className="text-[11px] font-bold bg-violet-500/25 text-violet-200 px-5 py-2 rounded-full disabled:opacity-20 border border-violet-400/15 hover:bg-violet-500/35 transition-all active:scale-[0.97] flex items-center gap-1">
                              {enhancing ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>✨</motion.span> : '✨'}
                              {enhancing ? t('dash.enhancing') : t('dash.enhance')}
                            </button>
                            <button onClick={() => setEditingPrompt(false)} className="text-[11px] text-white/25 px-3 py-2 hover:text-white/40 transition-colors">{t('dash.cancel')}</button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key={prompt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <p className="flex items-center gap-1.5 text-white/35 text-[9.5px] font-bold uppercase tracking-[0.18em] mb-2.5">
                            <span className="inline-block w-1 h-1 rounded-full bg-fuchsia-400/70"></span>
                            {lang === 'bn' ? 'মানুষ যা দেখবে' : 'What people see'}
                          </p>
                          <p
                            className="font-semibold text-white/90 text-[17px] sm:text-[19px] leading-snug cursor-pointer select-none hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-lg"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingPrompt(true); setPromptDraft(decodeEntities(prompt)); } }}
                            onDoubleClick={() => { setEditingPrompt(true); setPromptDraft(decodeEntities(prompt)); }}
                            onTouchEnd={(e) => {
                              const now = Date.now();
                              const last = (e.currentTarget as any)._lastTap || 0;
                              if (now - last < 350) { setEditingPrompt(true); setPromptDraft(decodeEntities(prompt)); }
                              (e.currentTarget as any)._lastTap = now;
                            }}
                          >
                            {decodeEntities(prompt)}
                          </p>
                          <div className="flex items-center gap-2.5 mt-4">
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={handleDice}
                              disabled={savingPrompt || diceLoading}
                              aria-label="Shuffle prompt"
                              className={`flex items-center gap-1.5 h-[32px] px-4 rounded-lg text-[11px] font-bold transition-all border disabled:opacity-30 ${diceLoading ? 'bg-violet-500/20 text-violet-200 border-violet-400/20' : 'bg-white/[0.05] text-white/40 hover:bg-white/[0.1] hover:text-white/60 border-white/[0.06]'}`}
                            >
                              <motion.span animate={diceLoading ? { rotate: 360 } : { rotate: 0 }} transition={diceLoading ? { duration: 0.6, repeat: Infinity, ease: 'linear' } : { duration: 0 }} className="inline-block">
                                {diceLoading ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m12.14 0l-2.83-2.83M9.76 9.76L6.93 6.93"/></svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
                                )}
                              </motion.span>
                              {lang === 'bn' ? 'AI বদলাও' : 'AI Shuffle'}
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.92 }}
                              onClick={() => { setEditingPrompt(true); setPromptDraft(decodeEntities(prompt)); }}
                              aria-label="Edit prompt"
                              className="flex items-center gap-1.5 h-[32px] px-4 rounded-lg text-[11px] font-bold bg-white/[0.05] text-white/40 hover:bg-white/[0.1] hover:text-white/60 border border-white/[0.06] transition-all"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> {lang === 'bn' ? 'লেখো' : 'Edit'}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* ═══ SHARE: Premium link pill with handle + copy ═══ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.14 }}
                  data-tour="share-link"
                  className={`w-full flex items-center rounded-xl overflow-hidden transition-all duration-300 h-[38px] ${copied ? 'ring-1 ring-emerald-400/30' : ''}`}
                  style={{ background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2 px-3 h-full">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 flex-shrink-0 ${copied ? 'text-emerald-400' : 'text-white/25'}`}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    <span className={`text-[12px] font-mono truncate select-none ${copied ? 'text-emerald-300' : 'text-white/50'}`}>
                      bongbari.com<span className="text-white/25">/ngl/q/</span><span className={copied ? 'text-emerald-200 font-bold' : 'text-white font-bold'}>{username}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 h-full flex items-center px-3.5 text-[10px] font-extrabold tracking-wider cursor-pointer transition-all duration-200 ${copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white hover:from-violet-400 hover:via-fuchsia-400 hover:to-pink-400 hover:shadow-[0_0_16px_rgba(217,70,239,0.5)] active:scale-95'}`}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                        {lang === 'bn' ? 'হয়েছে' : 'COPIED'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        {lang === 'bn' ? 'কপি' : 'COPY'}
                      </span>
                    )}
                  </button>
                </motion.div>

                {/* ═══ SHARE CARDS: 4 premium icon buttons ═══ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: lang === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp', color: 'from-green-500/20 to-green-600/10 border-green-500/15', action: () => { gEvent('ngl_share_card', { platform: 'whatsapp' }); setShareModalScreen('whatsapp'); setShowShareModal(true); }, renderIcon: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg> },
                    { label: lang === 'bn' ? 'IG স্টোরি' : 'IG Story', color: 'from-pink-500/20 to-purple-600/10 border-pink-500/15', action: () => { gEvent('ngl_share_card', { platform: 'ig-story' }); setShareModalScreen('ig-guide'); setShowShareModal(true); }, renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-pink-400"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg> },
                    { label: lang === 'bn' ? 'স্টোরি কার্ড' : 'Story Card', color: 'from-violet-500/20 to-indigo-600/10 border-violet-500/15', action: () => { gEvent('ngl_share_card', { platform: 'story-card' }); openStoryPreview(); }, renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-violet-400"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
                    { label: lang === 'bn' ? 'আরো' : 'More', color: 'from-blue-500/20 to-cyan-600/10 border-blue-500/15', action: () => { gEvent('ngl_share_card', { platform: 'more' }); setShareModalScreen('picker'); setShowShareModal(true); }, renderIcon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-400"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg> },
                  ].map((item, i) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.3, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.18 + i * 0.08 }}
                      whileTap={{ scale: 0.88 }}
                      whileHover={{ scale: 1.04 }}
                      onClick={item.action}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-2xl bg-gradient-to-b ${item.color} border hover:brightness-125 active:brightness-150 transition-all focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2`}
                    >
                      <span className="w-6 h-6 flex items-center justify-center">{item.renderIcon()}</span>
                      <span className="text-[10px] sm:text-[9px] font-bold text-white/50 leading-none">{item.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Dice toast */}
                <AnimatePresence>
                  {diceToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.9 }}
                      className="bg-emerald-500/15 text-emerald-300 text-[11px] font-bold px-4 py-1.5 rounded-full border border-emerald-400/15 text-center"
                    >
                      {t('dash.newPrompt')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              /* ── INBOX TAB ── */
              <motion.div
                key="inbox"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="pb-2"
              >
                <PullToRefresh onRefresh={async () => { haptic('success'); await loadInbox({ manual: true }); }} lang={lang} />
                {(error || isOffline) && error !== '' && (
                  <div className="text-center mb-3 bg-red-500/10 rounded-2xl py-2.5 px-4 border border-red-500/10">
                    <p className="text-red-300 text-[11px] font-semibold">
                      {isOffline
                        ? '📡 ' + t('dash.offline')
                        : error === 'ERR_WRONG_KEY' ? t('dash.wrongKeyError')
                        : error === 'ERR_RETRYING' ? t('dash.retrying') + '...'
                        : error === 'ERR_CONNECTION' ? t('dash.connectionError')
                        : error === 'ERR_NETWORK' ? t('dash.networkError')
                        : error === 'ERR_SERVER' ? t('dash.serverError')
                        : error}
                    </p>
                    {!isOffline && error && error !== 'ERR_WRONG_KEY' && (
                      <button
                        onClick={() => { setError(''); setLoading(true); loadInbox({ manual: true }); }}
                        className="mt-1.5 bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
                      >
                        🔄 {t('dash.retry')}
                      </button>
                    )}
                  </div>
                )}

                {loading ? (
                  <InboxShimmer />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    {/* Premium icon — glass mailbox */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                      className="relative mb-5"
                    >
                      <div className="w-[72px] h-[72px] rounded-3xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(140deg, rgba(168,85,247,0.16) 0%, rgba(236,72,153,0.10) 60%, rgba(255,255,255,0.03) 100%)', boxShadow: '0 6px 30px rgba(168,85,247,0.18), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white/70">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-3xl border border-fuchsia-400/30"
                      />
                    </motion.div>

                    <p className="text-white font-extrabold text-[17px] tracking-tight">{t('dash.emptyTitle')}</p>
                    <p className="text-white/35 text-[12px] mt-1.5 max-w-[260px] leading-relaxed">{t('dash.emptySubtitle')}</p>

                    <div className="flex gap-2 mt-6">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className={`bg-gradient-to-r ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} text-white font-extrabold px-6 py-3 rounded-full text-[12px] shadow-lg shadow-fuchsia-500/20`}
                      >
                        {copied ? t('dash.copied') : t('dash.copyLink')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setShareModalScreen('picker'); setShowShareModal(true); }}
                        aria-label="Share"
                        className="bg-white/[0.06] text-white/60 font-bold px-4 py-3 rounded-full text-[12px] border border-white/[0.06] hover:bg-white/[0.10] transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1 px-1 gap-2">
                      <p className="text-white/40 text-[11px] font-bold whitespace-nowrap">
                        {messages.length} {t('dash.msgCount')}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {/* C3: Sound toggle */}
                        <button
                          onClick={toggleMute}
                          aria-label={muted ? t('dash.soundOff') : t('dash.soundOn')}
                          title={muted ? t('dash.soundOff') : t('dash.soundOn')}
                          className="text-white/40 hover:text-white/80 w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center"
                        >
                          {muted ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                          )}
                        </button>
                        {/* C10: Data export */}
                        <button
                          onClick={handleExport}
                          disabled={exporting || messages.length === 0}
                          aria-label={t('dash.export')}
                          title={t('dash.export')}
                          className="text-white/40 hover:text-white/80 text-[10px] font-semibold px-2.5 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {exporting ? t('dash.exporting') : exported ? t('dash.exported') : t('dash.export')}
                        </button>
                      </div>
                    </div>
                    {/* C8: Search bar */}
                    {messages.length > 3 && (
                      <div className="relative mb-1">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t('dash.search')}
                          aria-label={t('dash.search')}
                          className="w-full bg-white/[0.04] border border-white/[0.05] rounded-2xl px-4 py-2 text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            aria-label={t('dash.clearSearch')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-[14px] w-5 h-5 rounded-full flex items-center justify-center"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                    {(() => {
                      const q = searchQuery.trim().toLowerCase();
                      const filtered = q
                        ? messages.filter(m => (m.text || '').toLowerCase().includes(q))
                        : messages;
                      if (q && filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-white/30 text-[12px] font-medium">
                            {t('dash.noSearchResults')}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {(searchQuery.trim()
                      ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
                      : messages
                    ).map((msg, i) => {
                      const hasHints = msg.senderLang || msg.senderDevice || msg.senderCity || msg.senderCountry;
                      const isRevealed = hintRevealId === msg.id;
                      // Build specific location string: "Dum Dum, Kolkata" or "Kolkata, West Bengal" or "India"
                      const locationParts: string[] = [];
                      if (msg.senderCity) locationParts.push(msg.senderCity);
                      else if (msg.senderRegion) locationParts.push(msg.senderRegion);
                      if (msg.senderCountry && locationParts.length === 0) locationParts.push(msg.senderCountry);
                      const locationStr = locationParts.join(', ');
                      // Check if there are extra details worth expanding
                      const hasExtras = !!(msg.senderBrowser || msg.senderOs || msg.senderIsp || msg.senderLocalTime || msg.senderConnectionType || msg.senderScreenRes || msg.senderReferrer);

                      return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', stiffness: 300, damping: 25 }}
                        className="relative bg-white/[0.04] rounded-2xl border border-white/[0.05] overflow-hidden group hover:bg-white/[0.06] transition-all"
                      >
                        {/* Theme accent left bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-40"
                          style={{ background: NGL_THEMES[theme]?.bg || NGL_THEMES.default.bg }}
                        />
                        <div className="p-4 sm:p-5 pl-5">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                            <span className="w-5 h-5 text-white/35">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H6l-3 3v-6.5A8.5 8.5 0 1 1 21 11.5z" />
                              </svg>
                            </span>
                            <button
                              onClick={() => setReactingId(reactingId === msg.id ? null : msg.id)}
                              className="text-white/20 hover:text-pink-400/60 transition-all text-sm hover:scale-110 active:scale-90 mt-1"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M12 21s-7-4.4-9.2-8.2C1 9.4 2.5 6 6 6c2 0 3.3 1 4 2 0.7-1 2-2 4-2 3.5 0 5 3.4 3.2 6.8C19 16.6 12 21 12 21z" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const isRevealed2 = revealedIds.has(msg.id);
                              return (
                                <div className="relative mb-2">
                                  <p
                                    className={`text-white text-[15px] font-semibold leading-[1.65] break-words transition-[filter,transform] duration-500 ease-out ${isRevealed2 ? '' : 'blur-[7px] select-none'} ${isRevealed2 ? '' : 'cursor-pointer'}`}
                                    style={isRevealed2 ? undefined : { transform: 'scale(0.985)' }}
                                    onClick={() => { if (!isRevealed2) revealMessage(msg.id); }}
                                  >
                                    {decodeEntities(msg.text)}
                                  </p>
                                  {!isRevealed2 && (
                                    <button
                                      onClick={() => revealMessage(msg.id)}
                                      aria-label={lang === 'bn' ? 'ট্যাপ করে দেখো' : 'Tap to reveal'}
                                      className="absolute inset-0 flex items-center justify-center rounded-lg group/rev"
                                    >
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 text-[11px] font-extrabold tracking-wide group-hover/rev:bg-black/70 transition-all">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                        {lang === 'bn' ? 'ট্যাপ করে দেখো' : 'Tap to reveal'}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Subtle hint pills — NGL-style but better */}
                            {hasHints && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {locationStr && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    Loc: {locationStr}
                                  </span>
                                )}
                                {msg.senderDevice && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    Device: {msg.senderDevice}
                                  </span>
                                )}
                                {msg.senderLang && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    Lang: {msg.senderLang}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Minimal "more" toggle — no scary language */}
                            {hasExtras && (
                              <button
                                onClick={() => setHintRevealId(isRevealed ? null : msg.id)}
                                className="mt-1.5 text-white/25 hover:text-white/40 text-[10px] font-medium transition-colors"
                              >
                                {isRevealed ? '− less' : '+ more'}
                              </button>
                            )}

                            {/* Part 3 PRO FOMO: locked deep-reveal card (shown only to free users with sender data) */}
                            {!isPremium && hasHints && (
                              <button
                                onClick={() => { gEvent('ngl_pro_cta_click', { source: 'message_card' }); setShowUpgrade(true); }}
                                className="mt-2 w-full text-left bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 border border-fuchsia-400/20 rounded-xl px-3 py-2 hover:from-fuchsia-500/15 hover:via-violet-500/15 hover:to-indigo-500/15 transition-all group/pro"
                                aria-label={t('pro.lockedCity')}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-3.5 h-3.5 text-fuchsia-300/80">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                      <rect x="4" y="11" width="16" height="10" rx="2" />
                                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                    </svg>
                                  </span>
                                  <span className="text-fuchsia-200/80 text-[10px] font-semibold flex-1 truncate">
                                    {t('pro.lockedCity')}
                                  </span>
                                  <span className="text-fuchsia-300/60 text-[9px] font-bold group-hover/pro:text-fuchsia-300 transition-colors">→</span>
                                </div>
                              </button>
                            )}

                            {/* Expanded details — clean grid, no detective vibes */}
                            <AnimatePresence>
                              {isRevealed && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {msg.senderRegion && msg.senderCountry && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Region: {msg.senderRegion}, {msg.senderCountry}
                                      </span>
                                    )}
                                    {msg.senderOs && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        OS: {msg.senderOs}
                                      </span>
                                    )}
                                    {msg.senderBrowser && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Browser: {msg.senderBrowser}
                                      </span>
                                    )}
                                    {msg.senderIsp && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        ISP: {msg.senderIsp}
                                      </span>
                                    )}
                                    {msg.senderConnectionType && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Net: {msg.senderConnectionType}
                                      </span>
                                    )}
                                    {msg.senderLocalTime && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Time: {msg.senderLocalTime}
                                      </span>
                                    )}
                                    {msg.senderScreenRes && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Res: {msg.senderScreenRes}
                                      </span>
                                    )}
                                    {msg.senderReferrer && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Ref: {msg.senderReferrer}
                                      </span>
                                    )}
                                    {msg.senderBatteryLevel && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Battery: {msg.senderBatteryLevel}
                                      </span>
                                    )}
                                    {msg.senderDarkMode && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        Mode: {msg.senderDarkMode}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/[0.04]">
                              <p className="text-white/20 text-[10px] font-medium">{timeAgo(msg.createdAt)}</p>
                              {msg.reaction && (
                                <motion.span key={msg.reaction} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[9px] uppercase tracking-wide text-white/45 bg-white/[0.05] px-1.5 py-0.5 rounded-full border border-white/[0.06]">{msg.reaction}</motion.span>
                              )}
                              {msg.pinned && msg.pinned > 0 && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-300/80 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-400/15">
                                  {t('dash.pinned')}
                                </span>
                              )}
                              <div className="flex-1" />
                              {/* B3: Pin toggle */}
                              <button
                                onClick={() => handleTogglePin(msg.id)}
                                aria-label={msg.pinned && msg.pinned > 0 ? t('dash.unpin') : t('dash.pin')}
                                title={msg.pinned && msg.pinned > 0 ? t('dash.unpin') : t('dash.pin')}
                                className={`transition-all text-[11px] hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 sm:opacity-60 sm:hover:opacity-100 ${msg.pinned && msg.pinned > 0 ? 'text-amber-400/80' : 'text-white/15 hover:text-amber-400/60'}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                  <path d="M16 3v8l4 4-4 4-4-4V3z" />
                                </svg>
                              </button>
                              {/* B2: Block sender */}
                              <button
                                onClick={() => handleBlockSender(msg.id)}
                                aria-label={t('dash.block')}
                                title={t('dash.block')}
                                className="text-white/10 hover:text-orange-400/60 transition-all text-[10px] hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 sm:opacity-100"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="M7 7l10 10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                aria-label={t('dash.deleteHint')}
                                className="text-white/10 hover:text-red-400/50 transition-all text-[10px] hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 sm:opacity-100"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Reaction picker */}
                        <AnimatePresence>
                          {reactingId === msg.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -5, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -5, scale: 0.9 }}
                              className="flex gap-1 mt-2 justify-center bg-[#161222] rounded-full py-1.5 px-2 mx-4 mb-3 border border-white/[0.06]"
                            >
                              {REACTION_CHOICES.map(reactionKey => (
                                <button
                                  key={reactionKey}
                                  onClick={() => handleReact(msg.id, reactionKey)}
                                  className={`text-[9px] uppercase tracking-wide hover:scale-105 active:scale-95 transition-transform px-2 py-1 rounded-full border ${msg.reaction === reactionKey ? 'bg-white/10 border-white/20 text-white/80' : 'border-white/[0.06] text-white/40 hover:text-white/65'}`}
                                >
                                  {reactionKey}
                                </button>
                              ))}
                              {msg.reaction && (
                                <button onClick={() => handleReact(msg.id, null)} className="text-[10px] text-white/30 hover:text-red-400/60 px-1.5 font-bold">✕</button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </div>
                      </motion.div>
                    )})}
                    <div className="text-center pt-2 pb-4">
                      {hasMore ? (
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="bg-white/[0.06] hover:bg-white/[0.1] text-white/60 text-[11px] font-semibold px-4 py-2 rounded-full border border-white/[0.06] transition-colors disabled:opacity-50"
                        >
                          {loadingMore ? t('dash.loadingMore') : `↓ ${t('dash.loadMore')}`}
                        </button>
                      ) : (
                        <button onClick={handleCopy} className="text-white/20 text-[10px] font-semibold hover:text-white/40 transition-colors">
                          {copied ? t('dash.copied') : t('dash.moreMsg')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <FloatingHelp />

        {/* ═══════════════════════════════════════════ */}
        {/* ──── DELETE MODAL — Step 1: Confirm ────── */}
        {/* ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {deleteStep === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
              onClick={() => setDeleteStep(0)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative z-10 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-[#1a1020]/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 border border-red-500/10 shadow-2xl shadow-red-900/20">
                  {/* Skull icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/10">
                      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" opacity="0.6"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-white text-center font-black text-lg mb-1">Delete everything?</h3>
                  <p className="text-red-300/60 text-center text-[11px] mb-5 leading-relaxed">{t('dash.banishWarning')}</p>

                  {/* Username confirmation */}
                  <p className="text-white/30 text-[10px] font-bold mb-1.5 uppercase tracking-wider">{t('dash.banishConfirmLabel')}</p>
                  <input
                    type="text"
                    value={banishConfirm}
                    onChange={e => setBanishConfirm(e.target.value)}
                    placeholder={username}
                    autoFocus
                    className="w-full bg-white/[0.04] text-white text-sm font-mono px-4 py-3 rounded-2xl outline-none border border-white/[0.06] focus:border-red-500/30 placeholder:text-white/10 transition-colors mb-4"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 bg-white/[0.08] text-white/50 text-[11px] font-bold py-3 rounded-2xl hover:bg-white/10 transition-all border border-white/[0.06] active:scale-[0.97]"
                    >
                      {t('dash.cancel')}
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (banishConfirm.toLowerCase() === username.toLowerCase()) {
                          setDeleteStep(2);
                        }
                      }}
                      disabled={banishConfirm.toLowerCase() !== username.toLowerCase()}
                      className="flex-1 bg-red-500/20 text-red-300 text-[11px] font-bold py-3 rounded-2xl disabled:opacity-15 hover:bg-red-500/30 transition-all border border-red-500/15"
                    >
                      {t('dash.banishBtn')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════ */}
        {/* ── DELETE MODAL — Step 2: Farewell ─────── */}
        {/* ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {deleteStep === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 30 }}
                transition={{ type: 'spring', stiffness: 250, damping: 22 }}
                className="relative z-10 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-[#12091e]/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-6 border border-violet-500/10 shadow-2xl">
                  {/* Farewell icon */}
                  <div className="flex justify-center mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center text-white/60"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <path d="M4 7h16" />
                        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                        <path d="M6 7l1 12h10l1-12" />
                      </svg>
                    </motion.div>
                  </div>

                  <h3 className="text-white text-center font-black text-lg mb-1">{t('dash.farewellTitle')}</h3>
                  <p className="text-white/30 text-center text-[11px] mb-6 leading-relaxed max-w-[260px] mx-auto">{t('dash.farewellSubtitle')}</p>

                  {/* Farewell card */}
                  <div className="bg-white/[0.04] rounded-2xl p-4 mb-5 border border-white/[0.06]">
                    <div className="flex items-center gap-3 mb-2">
                      {photo ? (
                        <img src={photo} alt={username} className="w-10 h-10 rounded-full object-cover opacity-50" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/20 font-black text-sm">{username[0]?.toUpperCase()}</div>
                      )}
                      <div>
                        <p className="text-white/40 text-xs font-bold">@{username}</p>
                        <p className="text-white/15 text-[9px]">{messages.length} messages · {streakDays}d streak</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/[0.04] my-2" />
                    <p className="text-white/15 text-[10px] text-center italic">all of this will be erased...</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setDeleteStep(0); }}
                      className="w-full bg-violet-500/20 text-violet-300 text-[12px] font-extrabold py-3.5 rounded-2xl hover:bg-violet-500/30 transition-all border border-violet-400/15"
                    >
                      {t('dash.farewellCancel')}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        setBanishing(true);
                        await handleBanish();
                        setBanishing(false);
                      }}
                      disabled={banishing}
                      className="w-full bg-red-500/10 text-red-400/60 text-[11px] font-bold py-3 rounded-2xl hover:bg-red-500/20 hover:text-red-400/80 transition-all border border-red-500/10 disabled:opacity-30"
                    >
                      {banishing ? '...' : t('dash.farewellConfirm')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Share Modal ── */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          shareLink={shareLink}
          username={username}
          theme={theme}
          lang={lang}
          t={t}
          shareTemplates={SHARE_TEMPLATES}
          onOpenStoryPreview={openStoryPreview}
          onGenerateCard={generateCardSilently}
          storyPreviewUrl={storyPreview}
          initialScreen={shareModalScreen}
        />

        {/* ── Part 3: PRO Upgrade Modal ── */}
        <NglUpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          username={username}
          secretKey={secretKey}
          verifiedPhone={verifiedPhoneForPayment}
          onSuccess={(_premiumUntil) => {
            setIsPremium(true);
            setShowUpgrade(false);
            setUpgradeToast(true);
            gEvent('ngl_pro_activated');
            setTimeout(() => setUpgradeToast(false), 4000);
          }}
        />

        {/* PRO activated toast */}
        <AnimatePresence>
          {upgradeToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-black px-5 py-3 rounded-2xl shadow-2xl shadow-fuchsia-500/50 text-[14px]"
            >
              {t('pro.activated')}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Settings Modal — Premium centered glass (Linear/Notion-grade) ═══ */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowSettings(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60" />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-[360px] rounded-t-2xl sm:rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #141020 0%, #0c0a16 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)',
                }}
              >
                {/* Subtle gradient top border accent */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.3), transparent)' }} />
                {/* Mobile drag handle */}
                <div className="sm:hidden flex justify-center pt-2 pb-0">
                  <div className="w-9 h-[3px] rounded-full bg-white/12" />
                </div>

                {/* Header — clean title only, no avatar */}
                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-2.5">
                  <h2 className="text-[15px] font-extrabold text-white tracking-tight leading-none">{lang === 'bn' ? 'সেটিংস' : 'Settings'}</h2>
                  <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-all" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* ─── Group 1: Main settings (iOS grouped card) ─── */}
                <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.028)', border: '0.5px solid rgba(255,255,255,0.04)' }}>

                  {/* WhatsApp */}
                  <button
                    onClick={() => { setShowSettings(false); setTimeout(() => { localStorage.setItem('ngl_otp_seen', '1'); setPhoneShowForm(true); setPhoneOtpStatus('idle'); setPhoneOtpDigits(['', '', '', '', '', '']); setPhoneOtpError(''); setPhoneInputError(''); setPhoneInput(''); }, 200); }}
                    className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px] hover:bg-white/[0.025] active:bg-white/[0.04] transition-all text-left group"
                  >
                    <div className={`w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0 ${phoneStatus === 'verified' ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className={`w-[14px] h-[14px] ${phoneStatus === 'verified' ? 'text-emerald-400' : 'text-amber-300'}`}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-white/90 flex-1">WhatsApp</span>
                    <span className="text-[11px] text-white/30 mr-1">
                      {phoneStatus === 'verified' && phoneMasked ? phoneMasked : phoneStatus === 'otp_sent' ? 'Pending' : (lang === 'bn' ? 'যাচাই' : 'Verify')}
                    </span>
                    {phoneStatus !== 'verified' && <span className="w-[6px] h-[6px] rounded-full bg-amber-400 flex-shrink-0 mr-0.5" />}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white/20 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Inset divider */}
                  <div className="h-px bg-white/[0.04] ml-12" />

                  {/* Theme */}
                  <button onClick={() => { setShowSettings(false); setTimeout(() => setShowThemePicker(true), 200); }} className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px] hover:bg-white/[0.025] transition-all text-left group">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] text-violet-300"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-white/90 flex-1">{lang === 'bn' ? 'থিম' : 'Theme'}</span>
                    <div className="w-[18px] h-[18px] rounded-full flex-shrink-0 mr-1 ring-1 ring-white/10" style={{ background: NGL_THEMES[theme]?.bg || NGL_THEMES.default.bg }} />
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white/20 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Inset divider */}
                  <div className="h-px bg-white/[0.04] ml-12" />

                  {/* Sound */}
                  <button onClick={toggleMute} className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px] hover:bg-white/[0.025] transition-all text-left">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-[14px] h-[14px] ${muted ? 'text-sky-300/40' : 'text-sky-300'}`}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>{muted ? <><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></> : <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>}</svg>
                    </div>
                    <span className="text-[13px] font-semibold text-white/90 flex-1">{lang === 'bn' ? 'শব্দ' : 'Sound'}</span>
                    <div className={`relative w-[36px] h-[20px] rounded-full transition-colors duration-200 ${muted ? 'bg-white/10' : 'bg-emerald-500'}`}>
                      <motion.div
                        animate={{ x: muted ? 2 : 18 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm"
                      />
                    </div>
                  </button>

                  {/* Inset divider */}
                  <div className="h-px bg-white/[0.04] ml-12" />

                  {/* Language */}
                  <div className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px]">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] text-indigo-300"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-white/90 flex-1">{lang === 'bn' ? 'ভাষা' : 'Language'}</span>
                    <LangToggle />
                  </div>
                </div>

                {/* ─── Upgrade CTA (only if not premium) ─── */}
                {!isPremium && (
                  <button onClick={() => { setShowSettings(false); setTimeout(() => setShowUpgrade(true), 200); }} className="mx-3 mb-2 w-[calc(100%-24px)] h-[40px] rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition-all hover:brightness-110 active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef, #ec4899)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {lang === 'bn' ? 'প্রো তে আপগ্রেড করো' : 'Upgrade to Pro'}
                  </button>
                )}

                {/* ─── Group 2: Account / Danger (iOS grouped card) ─── */}
                <div className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.028)', border: '0.5px solid rgba(255,255,255,0.04)' }}>

                  {/* Logout */}
                  <button onClick={() => { setShowSettings(false); handleLogout(); }} className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px] hover:bg-white/[0.025] transition-all text-left group">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-red-500/12 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] text-red-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-red-400/80 flex-1">{t('dash.logout')}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white/15 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>

                  {/* Inset divider */}
                  <div className="h-px bg-white/[0.04] ml-12" />

                  {/* Delete profile */}
                  <button onClick={() => { setShowSettings(false); setDeleteStep(1); setBanishConfirm(''); }} className="w-full flex items-center gap-2.5 pl-3 pr-3 h-[44px] hover:bg-red-500/[0.025] transition-all text-left group">
                    <div className="w-[26px] h-[26px] rounded-[7px] bg-white/[0.03] flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/10 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px] text-white/20 group-hover:text-red-400/60 transition-colors">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/>
                      </svg>
                    </div>
                    <span className="text-[13px] font-semibold text-white/25 group-hover:text-red-400/60 transition-colors flex-1">{lang === 'bn' ? 'প্রোফাইল মুছো' : 'Delete profile'}</span>
                  </button>
                </div>

                {/* Footer */}
                <p className="text-center text-[9px] text-white/12 font-medium py-2 tracking-wide">BongBari NGL</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Theme Picker Modal ═══ */}
        <AnimatePresence>
          {showThemePicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowThemePicker(false)}
            >
              <div className="absolute inset-0 bg-black/60" />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full sm:max-w-[360px] rounded-t-2xl sm:rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #141020 0%, #0c0a16 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.3), transparent)' }} />
                <div className="sm:hidden flex justify-center pt-2 pb-0">
                  <div className="w-9 h-[3px] rounded-full bg-white/12" />
                </div>

                <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-2">
                  <h2 className="text-[15px] font-extrabold text-white tracking-tight leading-none">{lang === 'bn' ? 'থিম বাছো' : 'Choose Theme'}</h2>
                  <button onClick={() => setShowThemePicker(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/[0.06] transition-colors" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* FREE section label */}
                <div className="px-5 pb-1.5">
                  <span className="text-[9px] font-bold text-white/25 uppercase tracking-[0.15em]">Free</span>
                </div>

                {/* Free themes grid */}
                <div className="px-4 pb-3 grid grid-cols-4 gap-2">
                  {Object.entries(NGL_THEMES).filter(([, t]) => !t.pro).map(([key, t]) => {
                    const isActive = key === theme;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSetTheme(key)}
                        className={`relative flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/[0.08] ring-1 ring-white/20' : 'hover:bg-white/[0.04]'}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl ring-2 transition-all ${isActive ? 'ring-white/60 scale-105' : 'ring-white/[0.06]'}`}
                          style={{ background: t.bg }}
                        />
                        <span className="text-[10px] font-semibold text-white/50">{t.emoji} {t.label}</span>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* PRO divider */}
                <div className="mx-4 flex items-center gap-2 pb-1.5">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.25), rgba(236,72,153,0.25), transparent)' }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="url(#proGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><defs><linearGradient id="proGrad"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    PRO Exclusive
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(236,72,153,0.25), rgba(139,92,246,0.25), transparent)' }} />
                </div>

                {/* PRO themes grid — bigger cards, more visual impact */}
                <div className="px-4 pb-3 grid grid-cols-3 gap-2.5">
                  {Object.entries(NGL_THEMES).filter(([, t]) => t.pro).map(([key, t]) => {
                    const isLocked = !isPremium;
                    const isActive = key === theme;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (isLocked) {
                            setShowThemePicker(false);
                            setTimeout(() => setShowUpgrade(true), 200);
                          } else {
                            handleSetTheme(key);
                          }
                        }}
                        className={`relative flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-colors ${isActive ? 'bg-white/[0.08] ring-1 ring-white/20' : 'hover:bg-white/[0.04]'}`}
                      >
                        <div className="relative">
                          <div
                            className={`w-[52px] h-[52px] rounded-xl ring-2 transition-all ${isActive ? 'ring-white/60 scale-105' : 'ring-white/[0.08]'} ${isLocked ? 'opacity-70' : ''}`}
                            style={{ background: t.bg }}
                          />
                          {isLocked && (
                            <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/30">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/70">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-white/60">{t.emoji} {t.label}</span>
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Unlock CTA for non-premium */}
                {!isPremium && (
                  <div className="px-4 pb-3">
                    <button onClick={() => { setShowThemePicker(false); setTimeout(() => setShowUpgrade(true), 200); }} className="w-full h-[34px] rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5 transition-colors hover:brightness-110 active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef, #ec4899)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {lang === 'bn' ? 'PRO থিম আনলক করো' : 'Unlock PRO Themes'}
                    </button>
                  </div>
                )}

                {settingTheme && (
                  <div className="text-center text-[10px] text-white/30 pb-2 font-medium">{lang === 'bn' ? 'সেভ হচ্ছে…' : 'Saving…'}</div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Phone Verification Modal — Ultra-Compact Premium ═══ */}
        <AnimatePresence>
          {phoneShowForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
              onClick={() => { setPhoneShowForm(false); if (phoneOtpStatus !== 'sent' && phoneOtpStatus !== 'verifying') setPhoneOtpStatus('idle'); }}
            >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="relative w-full max-w-[340px] mx-4 mb-4 sm:mb-0 bg-[#0e0e1a]/95 backdrop-blur-xl rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Top accent line */}
                <div className={`h-0.5 bg-gradient-to-r ${phoneStatus === 'verified' ? 'from-emerald-500 to-teal-400' : NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent}`} />

                {/* Close */}
                <button
                  onClick={() => { setPhoneShowForm(false); if (phoneOtpStatus !== 'sent' && phoneOtpStatus !== 'verifying') setPhoneOtpStatus('idle'); }}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/30 hover:text-white/60 transition-all z-10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>

                <div className="px-4 py-3.5">
                  {/* Compact header — icon + title inline */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${phoneStatus === 'verified' ? 'bg-emerald-500/15' : 'bg-white/[0.06]'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={phoneStatus === 'verified' ? '#10b981' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${phoneStatus === 'verified' ? '' : 'text-white/40'}`}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-bold text-[13px] leading-none">{t('dash.phoneTitle')}</h3>
                      <p className="text-white/25 text-[9px] mt-0.5">{t('dash.phoneDesc')}</p>
                    </div>
                  </div>

                  {/* ── Verified state ── */}
                  {phoneStatus === 'verified' && phoneOtpStatus !== 'verified' && (
                    <div className="space-y-2.5">
                      {/* Compact verified row */}
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-500/[0.06] px-3 py-2.5 border border-emerald-500/[0.08]">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 text-[11px] font-bold">{lang === 'bn' ? 'ভেরিফায়েড' : 'Verified'}</span>
                            <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3"><circle cx="8" cy="8" r="6" fill="#10b981" opacity="0.3"/><path d="M5.5 8l2 2 3.5-3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          <p className="text-white/40 text-[12px] font-mono truncate">{phoneMasked || '+91 •••••'}</p>
                        </div>
                      </div>
                      {/* Actions row */}
                      <div className="flex gap-2">
                        <button
                          onClick={handlePhoneReset}
                          disabled={phoneRemoving}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-white/55 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all disabled:opacity-50 disabled:cursor-wait"
                        >
                          {phoneRemoving ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                          )}
                          {phoneRemoving ? (lang === 'bn' ? 'মুছছি…' : 'Removing…') : (lang === 'bn' ? 'নম্বর বদলাও' : 'Change number')}
                        </button>
                        <button
                          onClick={() => { setPhoneShowForm(false); setPhoneOtpStatus('idle'); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-white/55 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          {lang === 'bn' ? 'বন্ধ করো' : 'Close'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Phone input ── */}
                  {phoneStatus !== 'verified' && (phoneOtpStatus === 'idle' || phoneOtpStatus === 'error') && (
                    <div className="space-y-2.5">
                      <div className="flex gap-1.5">
                        <div className="flex items-center bg-white/[0.05] rounded-lg px-2.5 text-white/40 text-[11px] font-mono border border-white/[0.05] flex-shrink-0">+91</div>
                        <input type="tel" inputMode="numeric" maxLength={10} value={phoneInput}
                          onChange={e => { setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneInputError(''); }}
                          placeholder={t('dash.phoneInputHint')}
                          autoFocus
                          className="flex-1 bg-white/[0.05] text-white text-[13px] px-3 py-2.5 rounded-lg border border-white/[0.05] outline-none focus:border-white/15 placeholder:text-white/15 font-mono transition-colors"
                        />
                      </div>
                      {phoneInputError && <p className="text-red-400/70 text-[9px] font-medium px-0.5">{phoneInputError}</p>}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePhoneSendOtp}
                        disabled={phoneInput.length < 10}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2.5 rounded-lg text-[11px] disabled:opacity-25 transition-all shadow-md shadow-emerald-500/10"
                      >{t('dash.phoneSendRef')}</motion.button>
                    </div>
                  )}

                  {/* ── OTP entry ── */}
                  {(phoneOtpStatus === 'sent' || phoneOtpStatus === 'sending' || phoneOtpStatus === 'verifying') && (
                    <div className="space-y-3">
                      {/* WhatsApp hint — compact */}
                      <div className="flex items-center gap-2 bg-emerald-500/[0.06] rounded-lg px-3 py-2 border border-emerald-500/[0.06]">
                        <svg viewBox="0 0 24 24" fill="#25D366" className="w-3.5 h-3.5 flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
                        <p className="text-emerald-300/70 text-[9px] leading-snug">{t('otp.whatsappNote')}</p>
                      </div>

                      {/* 6-digit — tighter */}
                      <div className="flex justify-center gap-2">
                        {phoneOtpDigits.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => { phoneOtpRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1} value={digit}
                            onChange={e => handlePhoneOtpDigitChange(i, e.target.value)}
                            onKeyDown={e => handlePhoneOtpKeyDown(i, e)}
                            onPaste={i === 0 ? handlePhoneOtpPaste : undefined}
                            className={`w-9 h-11 text-center text-white font-bold text-base rounded-lg outline-none transition-all border ${
                              phoneOtpError ? 'border-red-500/30 bg-red-500/[0.06]' :
                              digit ? 'border-emerald-400/25 bg-white/[0.06]' :
                              'border-white/[0.06] bg-white/[0.03]'
                            } focus:border-emerald-400/50 focus:bg-white/[0.06]`}
                          />
                        ))}
                      </div>

                      {phoneOtpError && <p className="text-red-400/70 text-[9px] font-medium text-center">{phoneOtpError}</p>}

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePhoneVerifyOtp}
                        disabled={phoneOtpStatus === 'verifying' || phoneOtpDigits.join('').length < 6}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2.5 rounded-lg text-[11px] disabled:opacity-25 transition-all shadow-md shadow-emerald-500/10"
                      >{phoneOtpStatus === 'verifying' ? t('otp.verifying') : t('otp.verify')}</motion.button>

                      <div className="flex items-center justify-center gap-2.5">
                        <button onClick={handlePhoneResend} disabled={phoneOtpCooldown > 0}
                          className="text-[9px] font-bold text-white/35 hover:text-white/55 disabled:text-white/12 transition-colors"
                        >{phoneOtpCooldown > 0 ? t('otp.resendWait').replace('X', String(phoneOtpCooldown)) : t('otp.resend')}</button>
                        <span className="text-white/8 text-[8px]">|</span>
                        <button onClick={() => { setPhoneShowForm(false); setPhoneOtpStatus('idle'); }}
                          className="text-[9px] font-bold text-white/20 hover:text-white/40 transition-colors"
                        >{t('otp.skip')}</button>
                      </div>
                    </div>
                  )}

                  {/* ── Success flash ── */}
                  {phoneOtpStatus === 'verified' && (
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-1.5 py-3"
                    >
                      <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
                        <circle cx="20" cy="20" r="18" fill="#10b981" opacity="0.12"/>
                        <circle cx="20" cy="20" r="13" fill="#10b981" opacity="0.2"/>
                        <path d="M13 20.5l4.5 4.5 9-9" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-emerald-400 font-bold text-[12px]">{t('otp.verified')}</p>
                      <p className="text-white/25 text-[10px] font-mono">{phoneMasked}</p>
                      <button
                        onClick={() => { setPhoneShowForm(false); setPhoneOtpStatus('idle'); }}
                        className="mt-1 text-[9px] font-bold text-white/25 hover:text-white/45 transition-colors"
                      >{lang === 'bn' ? 'বন্ধ করো' : 'Close'}</button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Story Card Modal (Premium single-panel architecture) ── */}
        <AnimatePresence>
          {storyPreview && showStoryCardModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
              onClick={() => { setShowStoryCardModal(false); setStoryPreview(null); setStoryEditingText(false); }}
            >
              <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="relative z-10 w-full max-w-[360px] sm:max-w-[600px] my-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Premium frame — slim modern */}
                <div className="relative rounded-[24px] border border-white/[0.08] bg-[#0d0d10]/95 backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.85)] overflow-hidden">
                  {/* Ambient gradient glow */}
                  <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-pink-500/15 via-rose-500/8 to-transparent blur-3xl" />
                  <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 w-60 h-60 rounded-full bg-gradient-to-tr from-indigo-500/12 via-blue-500/6 to-transparent blur-3xl" />

                  {/* Header — compact */}
                  <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-[11px] shadow-md shadow-pink-500/40">📸</span>
                      <h3 className="text-white text-[13px] font-extrabold tracking-tight">
                        {lang === 'bn' ? 'তোর Story Card' : 'Your Story Card'}
                      </h3>
                    </div>
                    <button
                      onClick={() => { setShowStoryCardModal(false); setStoryPreview(null); setStoryEditingText(false); }}
                      aria-label="Close"
                      className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 text-xs font-bold hover:bg-white/[0.14] hover:text-white transition-all border border-white/[0.06]"
                    >✕</button>
                  </div>

                  {/* Toast */}
                  <AnimatePresence>
                    {storyToast && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="relative mx-4 mt-2.5 bg-emerald-500/15 text-emerald-300 text-[10.5px] font-bold px-3 py-1.5 rounded-lg border border-emerald-400/20 text-center">
                        {storyToast}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Body — slim grid */}
                  <div className="relative grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
                    {/* ── Preview ── */}
                    <div className="flex items-start justify-center sm:justify-start">
                      <div className="relative w-full max-w-[220px] rounded-xl overflow-hidden shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] border border-white/[0.08] ring-1 ring-white/[0.04]">
                        <img
                          src={storyPreview}
                          alt="Story card preview"
                          className={`w-full h-auto transition-opacity duration-200 ${generatingCard ? 'opacity-40' : 'opacity-100'}`}
                          style={{ aspectRatio: '9/16' }}
                        />
                        {generatingCard && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="text-2xl">✨</motion.span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Controls ── */}
                    <div className="flex flex-col gap-3 min-w-0">
                      {/* Theme — with PRO locks */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/50 text-[9.5px] font-extrabold uppercase tracking-[0.16em]">{lang === 'bn' ? '🎨 থিম' : '🎨 Theme'}</p>
                          <span className="text-white/35 text-[10px] font-bold flex items-center gap-1">
                            {STORY_PALETTES[storyColorIdx]?.pro && !isPremium && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            )}
                            {STORY_PALETTES[storyColorIdx]?.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {STORY_PALETTES.map((p, i) => {
                            const dotColors = p.colors || (NGL_THEMES[theme]?.bg.match(/#[a-fA-F0-9]{6}/g) || ['#667eea', '#f8477a']);
                            const active = storyColorIdx === i;
                            const locked = !!p.pro && !isPremium;
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (locked) {
                                    gEvent('ngl_pro_cta_click', { source: 'story_palette' });
                                    setShowStoryCardModal(false);
                                    setTimeout(() => setShowUpgrade(true), 180);
                                    return;
                                  }
                                  changeStoryColor(i);
                                }}
                                disabled={generatingCard}
                                title={locked ? `${p.label} (PRO)` : p.label}
                                aria-label={locked ? `${p.label} — PRO only` : p.label}
                                className={`relative w-8 h-8 rounded-full transition-all active:scale-90 ${
                                  active
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d10] scale-110 shadow-lg shadow-black/50'
                                    : 'ring-1 ring-white/15 hover:ring-white/40 hover:scale-110'
                                } ${locked ? 'opacity-70' : ''}`}
                                style={{ background: `linear-gradient(135deg, ${dotColors[0]}, ${dotColors[Math.floor(dotColors.length / 2)] || dotColors[0]}, ${dotColors[dotColors.length - 1]})` }}
                              >
                                {active && !locked && (
                                  <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">✓</span>
                                )}
                                {locked && (
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/35 rounded-full">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {!isPremium && (
                          <button
                            onClick={() => { gEvent('ngl_pro_cta_click', { source: 'story_unlock' }); setShowStoryCardModal(false); setTimeout(() => setShowUpgrade(true), 180); }}
                            className="mt-2 w-full h-7 rounded-lg text-[10px] font-extrabold text-white flex items-center justify-center gap-1 transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef, #ec4899)' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            {lang === 'bn' ? '5টি PRO থিম আনলক করো' : 'Unlock 5 PRO themes'}
                          </button>
                        )}
                      </div>

                      {/* Customize — slim toggles */}
                      <div>
                        <p className="text-white/50 text-[9.5px] font-extrabold uppercase tracking-[0.16em] mb-2">{lang === 'bn' ? '✨ কাস্টমাইজ' : '✨ Customize'}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => { setStoryEditingText(!storyEditingText); setStoryTextDraft(storyCustomPrompt ?? decodeEntities(prompt)); }}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[10.5px] font-extrabold transition-all border ${
                              storyEditingText ? 'bg-white/[0.16] text-white border-white/25 shadow-inner' : 'bg-white/[0.05] text-white/65 border-white/[0.08] hover:bg-white/[0.10] hover:text-white'
                            }`}
                          >
                            ✏️ {lang === 'bn' ? 'Text' : 'Edit Text'}
                          </button>
                          <button
                            onClick={toggleStoryQR}
                            disabled={generatingCard}
                            className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[10.5px] font-extrabold transition-all border ${
                              storyShowQR ? 'bg-white/[0.16] text-white border-white/25 shadow-inner' : 'bg-white/[0.05] text-white/65 border-white/[0.08] hover:bg-white/[0.10] hover:text-white'
                            }`}
                          >
                            {storyShowQR ? '🔳 QR On' : '▫️ QR Off'}
                          </button>
                        </div>

                        {/* Inline text editor with char counter */}
                        <AnimatePresence>
                          {storyEditingText && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 6 }} exit={{ height: 0, opacity: 0, marginTop: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="relative">
                                <textarea
                                  value={storyTextDraft}
                                  onChange={e => setStoryTextDraft(e.target.value.slice(0, 140))}
                                  maxLength={140}
                                  rows={2}
                                  placeholder={lang === 'bn' ? 'নতুন প্রশ্ন লেখো (max 140)…' : 'Type new question (max 140)…'}
                                  className="w-full bg-white/[0.06] text-white text-[11.5px] leading-snug px-3 py-2 pr-14 rounded-lg border border-white/[0.10] outline-none focus:border-white/30 placeholder:text-white/25 resize-none"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveStoryText(); } }}
                                />
                                <div className={`absolute bottom-1.5 right-12 text-[9px] font-bold ${storyTextDraft.length > 120 ? 'text-amber-400' : 'text-white/30'}`}>
                                  {storyTextDraft.length}/140
                                </div>
                                <button
                                  onClick={saveStoryText}
                                  disabled={generatingCard || !storyTextDraft.trim()}
                                  className="absolute bottom-1.5 right-1.5 w-9 h-7 bg-emerald-500/30 text-emerald-200 font-extrabold text-xs rounded-md border border-emerald-500/40 hover:bg-emerald-500/50 transition-all disabled:opacity-30 active:scale-95 flex items-center justify-center"
                                  aria-label="Apply"
                                >✓</button>
                              </div>
                              <p className="text-white/30 text-[9px] mt-1 px-0.5">{lang === 'bn' ? 'ছোট প্রশ্ন = বড় সুন্দর text। Auto line-break হবে।' : 'Shorter = bigger text. Auto line-break.'}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Spacer */}
                      <div className="flex-1 min-h-[4px]" />

                      {/* Action buttons — docked */}
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        {isMobileDevice && (
                          <button
                            onClick={shareStoryCard}
                            disabled={generatingCard || storySharing}
                            className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-white font-extrabold py-2.5 rounded-xl text-[12px] hover:brightness-110 transition-all shadow-md shadow-pink-500/30 active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {storySharing ? '⏳' : '📤'} {lang === 'bn' ? 'Story-তে Share' : 'Share to Story'}
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={downloadStoryCard}
                            disabled={generatingCard}
                            className="bg-gradient-to-br from-white to-white/90 text-black font-extrabold py-2.5 rounded-xl text-[11.5px] hover:brightness-95 transition-all shadow-md shadow-white/10 active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {lang === 'bn' ? 'Download' : 'Download'}
                          </button>
                          <button
                            onClick={copyLinkFromStory}
                            className="bg-white/[0.08] text-white font-extrabold py-2.5 rounded-xl text-[11.5px] hover:bg-white/[0.16] transition-all border border-white/[0.10] active:scale-[0.98] flex items-center justify-center gap-1.5"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            {lang === 'bn' ? 'Link কপি' : 'Copy Link'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>{/* end content z-10 layer */}
      </div>
    </>
  );
}
