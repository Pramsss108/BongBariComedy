import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { buildApiUrl } from '@/lib/queryClient';
import { useNglLang, LangToggle, FloatingHelp, InboxShimmer } from '@/components/NglLang';
import ShareModal from '@/components/ShareModal';
import QRCode from 'qrcode';
import { sfxNewMessage, sfxDicePop, sfxTap, getNglMuted, setNglMuted } from '@/lib/nglSfx';

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
  default: { bg: 'linear-gradient(135deg, #667eea 0%, #f8477a 30%, #ee6b3b 60%, #f4843e 100%)', accent: 'from-pink-500 via-orange-400 to-yellow-400', label: 'OG', emoji: '🔥' },
  pink: { bg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)', accent: 'from-pink-500 via-rose-400 to-orange-400', label: 'Rose', emoji: '💗' },
  blue: { bg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', accent: 'from-blue-500 via-indigo-400 to-violet-400', label: 'Ocean', emoji: '🌊' },
  green: { bg: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)', accent: 'from-emerald-500 via-teal-400 to-cyan-400', label: 'Mint', emoji: '🌿' },
  purple: { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', accent: 'from-violet-500 via-purple-400 to-fuchsia-400', label: 'Galaxy', emoji: '🔮' },
  gold: { bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #dc2626 100%)', accent: 'from-amber-500 via-orange-400 to-red-400', label: 'Gold', emoji: '👑' },
  dark: { bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', accent: 'from-indigo-400 via-violet-300 to-blue-400', label: 'Dark', emoji: '🖤' },
  // Part 3 (PRO): Exclusive themes gated by isPremium
  neon: { bg: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 40%, #8b5cf6 100%)', accent: 'from-cyan-400 via-blue-500 to-purple-500', label: 'Neon', emoji: '⚡', pro: true },
  rosegold: { bg: 'linear-gradient(135deg, #fb7185 0%, #f9a8d4 50%, #fbbf24 100%)', accent: 'from-rose-400 via-pink-300 to-amber-300', label: 'Rose Gold', emoji: '🌹', pro: true },
  midnight: { bg: 'linear-gradient(135deg, #000000 0%, #1e1b4b 50%, #000000 100%)', accent: 'from-slate-700 via-indigo-900 to-black', label: 'Midnight', emoji: '🌑', pro: true },
};

// ── 20 Bilingual Prompt Phrases (Bengali + English) ──
const PROMPT_POOL: { bn: string; en: string }[] = [
  { bn: 'আমার সম্পর্কে anonymous কিছু বলো 👀', en: 'send me anonymous messages! 👀' },
  { bn: 'আমাকে ৩ শব্দে বর্ণনা করো ✨', en: 'describe me in 3 words ✨' },
  { bn: 'আমার সম্পর্কে তোর honest opinion কি? 🤔', en: "what's your honest opinion about me? 🤔" },
  { bn: 'আমার সাথে তোর সবচেয়ে ভালো memory কি? 💭', en: 'what is your best memory with me? 💭' },
  { bn: 'আমাকে প্রথম দেখেই কি মনে হয়েছিল? 👋', en: 'what did you think when you first met me? 👋' },
  { bn: 'তুই কখনো আমার কাছে কি লুকিয়ে রেখেছিস? 🤫', en: 'are you hiding something from me? 🤫' },
  { bn: 'আমাকে একটা dare দে! 🔥', en: 'give me a dare! 🔥' },
  { bn: 'আমার সবচেয়ে annoying habit কি? 😅', en: 'what is my most annoying habit? 😅' },
  { bn: 'তুই আমার জায়গায় থাকলে কি করতিস? 🤷', en: 'what would you do if you were me? 🤷' },
  { bn: 'আমাকে নিয়ে একটা confession করো 💬', en: 'confess something about me 💬' },
  { bn: 'তুই কি আমাকে trust করিস? 🔒', en: 'do you trust me? 🔒' },
  { bn: 'Never have I ever... আমাকে catch করো 🙈', en: 'never have I ever... catch me 🙈' },
  { bn: 'আমার life-এ কি change করা উচিত? 💡', en: 'what should I change in my life? 💡' },
  { bn: 'তোর মনে আমার বিশেষ জায়গা আছে? 💜', en: 'do I have a special place in your heart? 💜' },
  { bn: 'আমার best quality কি? আর worst? ⚖️', en: 'what is my best and worst quality? ⚖️' },
  { bn: 'তুই আমাকে কোন গান দিয়ে describe করবি? 🎵', en: 'describe me with a song 🎵' },
  { bn: 'আমার জীবনে তুই কেন important? 🌟', en: 'why are you important in my life? 🌟' },
  { bn: 'rate me 1-10 honestly — কোনো ভান নয়! 📊', en: 'rate me 1-10 honestly — no cap! 📊' },
  { bn: 'আমাকে একটা কথা বলো যেটা তুই কখনো বলিসনি 🗝️', en: 'tell me something you never told me 🗝️' },
  { bn: 'যদি আমি কাল disappear হয়ে যাই — কি করবি? 😢', en: 'if I disappear tomorrow — what would you do? 😢' },
];

const REACTION_EMOJIS = ['❤️', '😂', '🔥', '💀', '🫣'];

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
  const [storyScreen, setStoryScreen] = useState<'preview' | 'customize'>('preview');
  const [ogTitle, setOgTitle] = useState<string | null>(null);
  const [ogDescription, setOgDescription] = useState<string | null>(null);
  const [ogEditing, setOgEditing] = useState(false);
  const [ogTitleDraft, setOgTitleDraft] = useState('');
  const [ogDescDraft, setOgDescDraft] = useState('');
  const [ogSaving, setOgSaving] = useState(false);
  const [ogSaved, setOgSaved] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalScreen, setShareModalScreen] = useState<'picker' | 'whatsapp' | 'ig-guide' | 'wa-status-guide' | 'fb-guide'>('picker');
  const prevMsgCountRef = useRef(0);
  const confettiDone = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Phone verification state (Phase B) ──
  const [phoneStatus, setPhoneStatus] = useState<'loading' | 'none' | 'unverified' | 'verified'>('loading');
  const [phoneMasked, setPhoneMasked] = useState('');
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
      fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/phone`), {
        headers: { 'X-NGL-Key': secretKey },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) { setPhoneStatus('none'); return; }
          if (d.verified) {
            setPhoneStatus('verified');
            setPhoneMasked(d.phone || '');
          } else if (d.phone) {
            setPhoneStatus('unverified');
            setPhoneMasked(d.phone || '');
          } else {
            setPhoneStatus('none');
          }
        })
        .catch(() => setPhoneStatus('none'));
    }
  }, [username, secretKey]);

  // Sync prompt language: translate prompt when language toggles
  useEffect(() => {
    // Always try to translate if the current prompt is in the pool (even server-saved ones)
    const match = PROMPT_POOL.find(p => p.bn === prompt || p.en === prompt);
    if (match) {
      setPrompt(match[lang as 'bn' | 'en']);
    } else if (!hasServerPrompt) {
      // Only randomize if it's not a custom server prompt
      setPrompt(getRandomPrompt(lang as 'bn' | 'en'));
    }
    // Custom prompts that aren't in the pool stay as-is
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => { setIsOffline(false); setError(''); loadInbox(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Load inbox with silent auto-retry
  const loadInbox = useCallback(async (retry = 0) => {
    if (!secretKey || !username) return;
    try {
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/inbox`), {
        headers: { 'X-NGL-Key': secretKey },
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        setError('');
        setHasMore(!!data.hasMore);
        if (msgs.length > 0 && !confettiDone.current && prevMsgCountRef.current === 0) {
          confettiDone.current = true;
          if (containerRef.current) fireConfetti(containerRef.current);
        }
        if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
          setNewMsgCount(prev => prev + (msgs.length - prevMsgCountRef.current));
          // C3: soft ping on new messages (respects mute + reduced-motion)
          sfxNewMessage();
        }
        prevMsgCountRef.current = msgs.length;
      } else if (res.status === 403) {
        setError('ERR_WRONG_KEY');
        localStorage.removeItem('bong_ngl');
      }
    } catch {
      // Auto-retry with user feedback
      if (retry < 3) {
        const delay = Math.pow(2, retry + 1) * 1000;
        setLoading(false);
        setError('ERR_RETRYING');
        setTimeout(() => { setError(''); setLoading(true); loadInbox(retry + 1); }, delay);
        return;
      } else {
        if (navigator.onLine) setError('ERR_CONNECTION');
      }
    }
    setLoading(false);
  }, [secretKey, username]);

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 10000);
    return () => clearInterval(interval);
  }, [loadInbox]);

  const handleCopy = async () => {
    gEvent('ngl_copy_link');
    let ok = false;
    try { await navigator.clipboard.writeText(shareLink); ok = true; } catch {
      try {
        const el = document.createElement('textarea'); el.value = shareLink;
        document.body.appendChild(el); el.select();
        ok = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {}
    }
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleShare = async () => {
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
    setDiceLoading(true);
    sfxDicePop();
    // Pick a random prompt from local pool (instant) — avoid repeating current
    const pool = PROMPT_POOL.filter(p => p[lang as 'bn' | 'en'] !== prompt);
    const pick = pool[Math.floor(Math.random() * pool.length)][lang as 'bn' | 'en'];
    try {
      // Try AI endpoint first
      const res = await fetch(buildApiUrl(`/api/ngl/prompts/random?lang=${lang}`));
      const data = await res.json();
      if (data.prompt) {
        await savePrompt(data.prompt);
      } else {
        // Fallback to local pool
        await savePrompt(pick);
      }
    } catch {
      // Offline fallback — use local pool instantly
      await savePrompt(pick);
    }
    // Visual feedback
    setDiceFlash(true);
    setDiceToast(true);
    setTimeout(() => setDiceFlash(false), 1200);
    setTimeout(() => setDiceToast(false), 2500);
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
        setPhoneMasked(data.phone || `+91 ${phone.slice(0, 5)}•••••`);
        startPhoneCooldown(60);
      } else if (res.status === 429) {
        setPhoneOtpStatus('sent');
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
    if (!isValidPhone(phoneInput)) {
      setPhoneInputError(t('dash.phoneInvalid'));
      return;
    }
    setPhoneInputError('');
    sendPhoneOtp(phoneInput);
  };

  const handlePhoneResend = () => {
    if (phoneOtpCooldown > 0) return;
    setPhoneOtpDigits(['', '', '', '', '', '']);
    setPhoneOtpError('');
    sendPhoneOtp(phoneInput);
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
        setPhoneShowForm(false);
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

  // ── Story Card Color Palettes ──
  const STORY_PALETTES = [
    { label: '🔥 Theme', colors: null }, // uses current theme
    { label: '🌸 Rose', colors: ['#ec4899', '#f43f5e', '#fb923c'] },
    { label: '🌊 Ocean', colors: ['#0ea5e9', '#6366f1', '#8b5cf6'] },
    { label: '🌿 Mint', colors: ['#10b981', '#14b8a6', '#06b6d4'] },
    { label: '👑 Gold', colors: ['#f59e0b', '#ef4444', '#dc2626'] },
    { label: '🖤 Dark', colors: ['#1e1b4b', '#312e81', '#0f172a'] },
    { label: '🦄 Neon', colors: ['#d946ef', '#8b5cf6', '#06b6d4'] },
    { label: '🍊 Sunset', colors: ['#f97316', '#ef4444', '#ec4899'] },
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

    // Detect brightness of palette → pick contrasting text color
    const hexBrightness = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    const avgBrightness = gradientColors.reduce((sum, c) => sum + hexBrightness(c), 0) / gradientColors.length;
    const isLight = avgBrightness > 140;
    const textMain = isLight ? '#1a1a2e' : '#ffffff';
    const textSoft = isLight ? 'rgba(26,26,46,0.65)' : 'rgba(255,255,255,0.85)';
    const textMuted = isLight ? 'rgba(26,26,46,0.45)' : 'rgba(255,255,255,0.5)';
    const textFaint = isLight ? 'rgba(26,26,46,0.30)' : 'rgba(255,255,255,0.3)';
    const glassCard = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
    const glassStroke = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)';
    const avatarBg = isLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.25)';
    const ctaBg = isLight ? '#1a1a2e' : '#ffffff';
    const ctaText = isLight ? '#ffffff' : '#1a1a2e';
    const qrDark = isLight ? '#1a1a2e' : '#1a1a2e';
    const qrLight = isLight ? '#ffffff' : '#ffffff';
    const qrContainerBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.95)';

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradientColors.forEach((c: string, i: number) => bgGrad.addColorStop(i / (gradientColors.length - 1), c));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle pattern dots for depth
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
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
    ctx.fillText(`@${username}`, 540, 550);

    // PRO badge
    ctx.fillStyle = isLight ? '#6d28d9' : '#8b5cf6';
    ctx.beginPath();
    ctx.roundRect(490, 570, 100, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('PRO', 540, 595);

    // Prompt
    ctx.fillStyle = textSoft;
    ctx.font = '600 36px system-ui, sans-serif';
    const rawPrompt = opts?.customPrompt ?? prompt;
    const promptText = decodeEntities(rawPrompt).slice(0, 60) + (rawPrompt.length > 60 ? '...' : '');
    ctx.fillText(`"${promptText}"`, 540, 680);

    // Messages count (only show if > 0)
    if (messages.length > 0) {
      ctx.fillStyle = textMuted;
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.fillText(`🔥 ${messages.length} messages received`, 540, 760);
    }

    // CTA button
    ctx.fillStyle = ctaBg;
    ctx.beginPath();
    ctx.roundRect(240, 850, 600, 80, 40);
    ctx.fill();
    ctx.fillStyle = ctaText;
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText('Send me anonymous messages! →', 540, 900);

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
      ctx.fillText('Scan to send 📱', 540, 1380);
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
    const dataUrl = await buildStoryCanvas(storyColorIdx, { showQR: true });
    setStoryPreview(dataUrl);
    setShowStoryCardModal(true);
    setGeneratingCard(false);
  };

  // Silently generate story card image (no modal) — for tutorial preview
  const generateCardSilently = async () => {
    if (storyPreview) return; // already generated
    const dataUrl = await buildStoryCanvas(storyColorIdx, { showQR: true });
    setStoryPreview(dataUrl);
  };

  const regenerateCard = async (paletteIdx?: number, opts?: { customPrompt?: string; showQR?: boolean }) => {
    setGeneratingCard(true);
    await new Promise(r => setTimeout(r, 50));
    const idx = paletteIdx ?? storyColorIdx;
    const o = opts ?? storyOpts();
    const dataUrl = await buildStoryCanvas(idx, o);
    setStoryPreview(dataUrl);
    setGeneratingCard(false);
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

  const downloadStoryCard = () => {
    if (!storyPreview) return;
    const a = document.createElement('a');
    a.href = storyPreview;
    a.download = `bong-ngl-${username}-story.png`;
    a.click();
    showStoryToast(lang === 'bn' ? '⬇️ Card download হয়েছে!' : '⬇️ Card downloaded!');
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
        <div className="w-full flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 flex-shrink-0 max-w-2xl relative">
          <Link href="/tools" className="text-white/40 text-[11px] font-bold hover:text-white transition-colors flex items-center gap-1">
            <span className="text-[13px]">←</span> Back
          </Link>
          <div className="flex items-center gap-2">
            {photo ? (
              <img src={photo} alt={username} className="w-6 h-6 rounded-full object-cover ring-1.5 ring-white/20" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-black">
                {username[0]?.toUpperCase()}
              </div>
            )}
            <p className="text-white/80 font-bold text-[11px]">@{username}</p>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button onClick={handleLogout} className="text-white/40 text-[11px] font-bold hover:text-white/70 transition-colors">{t('dash.logout')}</button>
          </div>
        </div>

        {/* Stats integrated into profile card — no separate strip */}

        {/* ── Tab bar ── compact pill style */}
        <div className="flex w-full max-w-2xl px-4 sm:px-6 mb-1.5 flex-shrink-0">
          <div className="flex w-full bg-white/[0.04] rounded-xl p-0.5 border border-white/[0.06]">
            <button
              onClick={() => { gEvent('ngl_tab_switch', { tab: 'play' }); setTab('play'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-extrabold rounded-lg transition-all duration-300 ${tab === 'play' ? `bg-gradient-to-r ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} text-white shadow-lg` : 'text-white/30 hover:text-white/50'}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {lang === 'bn' ? 'হোম' : 'Home'}
            </button>
            <button
              onClick={() => { gEvent('ngl_tab_switch', { tab: 'inbox' }); setTab('inbox'); setNewMsgCount(0); }}
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
                className="flex flex-col gap-4"
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
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-[17px] leading-none tracking-tight">@{username}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isPremium ? (
                        <span className="text-[7px] font-extrabold text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1.5 py-[1.5px] rounded-full tracking-wide">✓ PRO</span>
                      ) : (
                        <button
                          onClick={() => { gEvent('ngl_pro_cta_click', { source: 'header' }); alert(t('pro.upgradeSoon')); }}
                          className="text-[7px] font-extrabold text-fuchsia-200 bg-white/[0.05] hover:bg-white/[0.1] border border-fuchsia-400/20 px-1.5 py-[1.5px] rounded-full tracking-wide transition-all"
                        >
                          💎 {t('pro.upgradeCta').replace('💎 ', '')}
                        </button>
                      )}
                      {streakDays > 0 && <span className="text-[7px] font-extrabold text-amber-300 bg-amber-500/15 px-1.5 py-[1.5px] rounded-full">🔥 {streakDays}d</span>}
                      {messages.length > 0 && <span className="text-[7px] font-extrabold text-white/30 bg-white/[0.05] px-1.5 py-[1.5px] rounded-full">{messages.length} {lang === 'bn' ? 'বার্তা' : 'msgs'}</span>}
                    </div>
                  </div>
                  {/* Native share icon — small, top right */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all bg-white/[0.04] hover:bg-white/[0.08]"
                    title={lang === 'bn' ? 'শেয়ার করো' : 'Share'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px] text-white/40">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                      <polyline points="16 6 12 2 8 6"/>
                      <line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </motion.button>
                </motion.div>

                {/* ═══ PROMPT: What people see — THE STAR of the page ═══ */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${diceFlash ? 'ring-1 ring-emerald-400/20' : ''}`}
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0.12) 100%)', boxShadow: '0 2px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                  {/* Accent bar — left edge */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} opacity-60`} />

                  <div className="p-5 pl-6 sm:p-6 sm:pl-7">
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
                          <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.14em] mb-2">
                            {lang === 'bn' ? '👀 মানুষ যা দেখবে' : '👀 What people see'}
                          </p>
                          <p
                            className="font-semibold text-white/90 text-[18px] sm:text-[22px] leading-snug cursor-pointer select-none hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2 rounded-lg"
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

                {/* ═══ PHONE VERIFY: Prominent row ═══ */}
                {phoneStatus !== 'loading' && phoneStatus !== 'verified' && (phoneStatus === 'unverified' || phoneStatus === 'none') && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { localStorage.setItem('ngl_otp_seen', '1'); setPhoneShowForm(true); setPhoneOtpStatus('idle'); setPhoneOtpDigits(['', '', '', '', '', '']); setPhoneOtpError(''); setPhoneInputError(''); setPhoneInput(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.15] hover:bg-red-500/[0.12] transition-all group"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                      className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                    </motion.div>
                    <div className="flex-1 text-left">
                      <p className="text-[12px] font-bold text-red-300">{lang === 'bn' ? 'ফোন ভেরিফাই করো' : 'Verify your phone'}</p>
                      <p className="text-[10px] text-red-400/50">{lang === 'bn' ? 'বেনামী বার্তা পেতে' : 'Required for anonymous messages'}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400/40 group-hover:text-red-400/60 transition-colors flex-shrink-0">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </motion.button>
                )}
                {phoneStatus === 'verified' && phoneMasked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    onClick={() => { localStorage.setItem('ngl_otp_seen', '1'); setPhoneShowForm(true); setPhoneOtpStatus('idle'); setPhoneOtpDigits(['', '', '', '', '', '']); setPhoneOtpError(''); setPhoneInputError(''); }}
                    className="flex items-center gap-2 px-2 py-1 cursor-pointer group"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" fill="#10b981" opacity="0.2"/>
                      <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-[11px] font-mono text-emerald-400/60 group-hover:text-emerald-400/80 transition-colors">{phoneMasked}</span>
                  </motion.div>
                )}

                {/* ═══ SHARE: Link row — flat inline, no container ═══ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.14 }}
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-1 py-0.5 cursor-pointer group"
                >
                  <p className={`flex-1 text-[13px] font-mono truncate transition-colors duration-300 select-none ${copied ? 'text-emerald-400' : 'text-white/30 group-hover:text-white/50'}`}>
                    {shareLink.replace(/^https?:\/\/(www\.)?/, '')}
                  </p>
                  <span className={`flex-shrink-0 transition-all duration-300 ${copied ? 'text-emerald-400 scale-110' : 'text-white/20 group-hover:text-white/40'}`}>
                    {copied ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </span>
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
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-gradient-to-b ${item.color} border hover:brightness-125 active:brightness-150 transition-all focus-visible:outline-2 focus-visible:outline-white/20 focus-visible:outline-offset-2`}
                    >
                      <span className="w-6 h-6 flex items-center justify-center">{item.renderIcon()}</span>
                      <span className="text-[10px] sm:text-[9px] font-bold text-white/50 leading-none">{item.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* ═══ UTILITY: Ghost strip ═══ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.52 }}
                  className="flex items-center justify-end px-1"
                >
                  <button
                    onClick={() => { setDeleteStep(1); setBanishConfirm(''); }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white/[0.08] hover:text-red-400/40 hover:bg-red-500/8 active:bg-red-500/15 transition-all flex-shrink-0 group"
                    title={t('dash.banish')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <path d="M19 6l-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </motion.div>

                {/* Dice toast */}
                <AnimatePresence>
                  {diceToast && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.9 }}
                      className="bg-emerald-500/15 text-emerald-300 text-[11px] font-bold px-4 py-1.5 rounded-full border border-emerald-400/15 text-center"
                    >
                      ✨ {t('dash.newPrompt')}
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
                        onClick={() => { setError(''); setLoading(true); loadInbox(); }}
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
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="text-5xl mb-4"
                    >
                      📭
                    </motion.div>
                    <p className="text-white font-extrabold text-lg mb-1">{t('dash.emptyTitle')}</p>
                    <p className="text-white/30 text-[11px] mb-2 max-w-[240px] leading-relaxed">{t('dash.emptySubtitle')}</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-white/15 text-[10px] mb-6 max-w-[200px]"
                    >
                      {lang === 'bn' ? '💡 তোর লিংক শেয়ার করো — বন্ধুরা anonymous message পাঠাবে!' : '💡 Share your link — friends will send anonymous messages!'}
                    </motion.p>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopy}
                        className={`bg-gradient-to-r ${NGL_THEMES[theme]?.accent || NGL_THEMES.default.accent} text-white font-extrabold px-5 py-3 rounded-full text-[12px] shadow-lg`}
                      >
                        {copied ? t('dash.copied') : t('dash.copyLink')}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setShareModalScreen('picker'); setShowShareModal(true); }}
                        className="bg-white/[0.08] text-white/60 font-bold px-4 py-3 rounded-full text-[12px] border border-white/[0.06] hover:bg-white/[0.12]"
                      >
                        📤
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1 px-1 gap-2">
                      <p className="text-white/40 text-[11px] font-bold whitespace-nowrap">
                        📬 {messages.length} {t('dash.msgCount')}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {/* C3: Sound toggle */}
                        <button
                          onClick={toggleMute}
                          aria-label={muted ? t('dash.soundOff') : t('dash.soundOn')}
                          title={muted ? t('dash.soundOff') : t('dash.soundOn')}
                          className="text-white/40 hover:text-white/80 text-[12px] w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-all flex items-center justify-center"
                        >
                          {muted ? '🔇' : '🔊'}
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
                            <span className="text-xl">{msg.emoji || '💬'}</span>
                            <button
                              onClick={() => setReactingId(reactingId === msg.id ? null : msg.id)}
                              className="text-white/20 hover:text-pink-400/60 transition-all text-sm hover:scale-110 active:scale-90 mt-1"
                            >
                              {msg.reaction || '🤍'}
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[15px] font-semibold leading-[1.65] break-words mb-2">{decodeEntities(msg.text)}</p>

                            {/* Subtle hint pills — NGL-style but better */}
                            {hasHints && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {locationStr && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    📍 {locationStr}
                                  </span>
                                )}
                                {msg.senderDevice && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    {['iPhone','iPad','Samsung','Xiaomi','OPPO','Vivo','OnePlus','Realme','Google Pixel','Huawei','Nokia','Motorola','Android'].includes(msg.senderDevice) ? '📱' : '💻'} {msg.senderDevice}
                                  </span>
                                )}
                                {msg.senderLang && (
                                  <span className="inline-flex items-center gap-1 bg-white/[0.06] text-white/50 text-[10px] font-medium px-2 py-0.5 rounded-full">
                                    🗣️ {msg.senderLang}
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
                                onClick={() => { gEvent('ngl_pro_cta_click', { source: 'message_card' }); alert(t('pro.upgradeSoon')); }}
                                className="mt-2 w-full text-left bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 border border-fuchsia-400/20 rounded-xl px-3 py-2 hover:from-fuchsia-500/15 hover:via-violet-500/15 hover:to-indigo-500/15 transition-all group/pro"
                                aria-label={t('pro.lockedCity')}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px]">🔒</span>
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
                                        🌍 {msg.senderRegion}, {msg.senderCountry}
                                      </span>
                                    )}
                                    {msg.senderOs && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        ⚙️ {msg.senderOs}
                                      </span>
                                    )}
                                    {msg.senderBrowser && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        🌐 {msg.senderBrowser}
                                      </span>
                                    )}
                                    {msg.senderIsp && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        📡 {msg.senderIsp}
                                      </span>
                                    )}
                                    {msg.senderConnectionType && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        📶 {msg.senderConnectionType}
                                      </span>
                                    )}
                                    {msg.senderLocalTime && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        ⏰ {msg.senderLocalTime}
                                      </span>
                                    )}
                                    {msg.senderScreenRes && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        📐 {msg.senderScreenRes}
                                      </span>
                                    )}
                                    {msg.senderReferrer && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        🔗 via {msg.senderReferrer}
                                      </span>
                                    )}
                                    {msg.senderBatteryLevel && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        🔋 {msg.senderBatteryLevel}
                                      </span>
                                    )}
                                    {msg.senderDarkMode && (
                                      <span className="inline-flex items-center gap-1 bg-white/[0.04] text-white/40 text-[9px] font-medium px-2 py-0.5 rounded-full">
                                        {msg.senderDarkMode === 'Dark' ? '🌙' : '☀️'} {msg.senderDarkMode}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/[0.04]">
                              <p className="text-white/20 text-[10px] font-medium">{timeAgo(msg.createdAt)}</p>
                              {msg.reaction && (
                                <motion.span key={msg.reaction} initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs">{msg.reaction}</motion.span>
                              )}
                              {msg.pinned && msg.pinned > 0 && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-500/10 text-amber-300/80 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-400/15">
                                  📌 {t('dash.pinned')}
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
                                📌
                              </button>
                              {/* B2: Block sender */}
                              <button
                                onClick={() => handleBlockSender(msg.id)}
                                aria-label={t('dash.block')}
                                title={t('dash.block')}
                                className="text-white/10 hover:text-orange-400/60 transition-all text-[10px] hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 sm:opacity-100"
                              >
                                🚫
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                aria-label={t('dash.deleteHint')}
                                className="text-white/10 hover:text-red-400/50 transition-all text-[10px] hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 sm:opacity-100"
                              >
                                🗑️
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
                              {REACTION_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className={`text-lg hover:scale-125 active:scale-90 transition-transform px-1 py-0.5 rounded-full ${msg.reaction === emoji ? 'bg-white/10 scale-110' : ''}`}
                                >
                                  {emoji}
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
                  {/* Sad emoji */}
                  <div className="flex justify-center mb-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, -5, 5, 0] }}
                      transition={{ delay: 0.2, type: 'spring' }}
                      className="text-5xl"
                    >
                      😢
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
                          onClick={() => { setPhoneStatus('none'); setPhoneOtpStatus('idle'); setPhoneInput(''); }}
                          className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white/30 hover:text-white/55 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                          {lang === 'bn' ? 'নম্বর বদলাও' : 'Change number'}
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

        {/* ── Story Card Preview Modal (Phase 3) — 2-screen flow ── */}
        <AnimatePresence>
          {storyPreview && showStoryCardModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4"
              onClick={() => { setShowStoryCardModal(false); setStoryPreview(null); setStoryEditingText(false); setStoryScreen('preview'); }}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative z-10 flex flex-col items-center gap-2 w-full max-w-[300px]"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="w-full flex items-center justify-between">
                  {storyScreen === 'customize' ? (
                    <button onClick={() => setStoryScreen('preview')} className="text-white/60 text-[11px] font-bold hover:text-white/90 transition-all flex items-center gap-1">
                      ← {lang === 'bn' ? 'Preview' : 'Back'}
                    </button>
                  ) : (
                    <h3 className="text-white/80 text-[12px] font-bold">📸 {lang === 'bn' ? 'তোর Story Card' : 'Your Story Card'}</h3>
                  )}
                  <button
                    onClick={() => { setShowStoryCardModal(false); setStoryPreview(null); setStoryEditingText(false); setOgEditing(false); setStoryScreen('preview'); }}
                    className="w-7 h-7 rounded-full bg-white/[0.08] backdrop-blur-md flex items-center justify-center text-white/50 text-[11px] font-bold hover:bg-white/15 hover:text-white transition-all border border-white/[0.06]"
                  >✕</button>
                </div>

                {/* Toast */}
                <AnimatePresence>
                  {storyToast && (
                    <motion.div initial={{ opacity: 0, y: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.9 }}
                      className="w-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold px-4 py-2 rounded-xl border border-emerald-400/15 text-center">
                      {storyToast}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ═══════ SCREEN 1: Preview + Actions ═══════ */}
                {storyScreen === 'preview' && (
                  <>
                    {/* Preview card — large and clean */}
                    <div className="relative w-full max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/[0.06]">
                      <img
                        src={storyPreview}
                        alt="Story card"
                        className={`w-full h-auto transition-opacity duration-200 ${generatingCard ? 'opacity-40' : 'opacity-100'}`}
                        style={{ aspectRatio: '9/16' }}
                      />
                      {generatingCard && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="text-2xl">✨</motion.span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isMobileDevice ? (
                      <div className="w-full flex flex-col gap-1.5">
                        <button
                          onClick={shareStoryCard}
                          disabled={generatingCard || storySharing}
                          className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-extrabold py-3 rounded-2xl text-[12px] hover:brightness-110 transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {storySharing ? '⏳' : '📤'} {lang === 'bn' ? 'Story-তে Share করো' : 'Share to Story'}
                        </button>
                        <div className="w-full grid grid-cols-3 gap-1.5">
                          <button
                            onClick={downloadStoryCard}
                            className="bg-white/[0.06] text-white/50 font-bold py-2 rounded-xl text-[10px] hover:bg-white/[0.1] transition-all border border-white/[0.06] active:scale-[0.97] flex items-center justify-center gap-1"
                          >
                            ⬇️ Download
                          </button>
                          <button
                            onClick={copyLinkFromStory}
                            className="bg-white/[0.06] text-white/50 font-bold py-2 rounded-xl text-[10px] hover:bg-white/[0.1] transition-all border border-white/[0.06] active:scale-[0.97] flex items-center justify-center gap-1"
                          >
                            📋 Link
                          </button>
                          <button
                            onClick={() => setStoryScreen('customize')}
                            className="bg-white/[0.06] text-white/50 font-bold py-2 rounded-xl text-[10px] hover:bg-white/[0.1] transition-all border border-white/[0.06] active:scale-[0.97] flex items-center justify-center gap-1"
                          >
                            ✨ Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col gap-1.5">
                        <div className="w-full grid grid-cols-2 gap-1.5">
                          <button
                            onClick={downloadStoryCard}
                            className="bg-white/[0.1] backdrop-blur-xl text-white font-extrabold py-3 rounded-2xl text-[11px] hover:bg-white/[0.15] transition-all border border-white/[0.08] active:scale-[0.97] flex items-center justify-center gap-1.5"
                          >
                            ⬇️ Download
                          </button>
                          <button
                            onClick={() => setStoryScreen('customize')}
                            className="bg-white/[0.1] backdrop-blur-xl text-white font-extrabold py-3 rounded-2xl text-[11px] hover:bg-white/[0.15] transition-all border border-white/[0.08] active:scale-[0.97] flex items-center justify-center gap-1.5"
                          >
                            ✨ Customize
                          </button>
                        </div>
                        <button
                          onClick={copyLinkFromStory}
                          className="w-full bg-white/[0.04] text-white/40 font-bold py-2 rounded-xl text-[9px] hover:bg-white/[0.08] transition-all border border-white/[0.04] active:scale-[0.97] flex items-center justify-center gap-1"
                        >
                          📋 {lang === 'bn' ? 'Link কপি করো' : 'Copy Link'}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* ═══════ SCREEN 2: Customize ═══════ */}
                {storyScreen === 'customize' && (
                  <>
                    {/* Small preview thumbnail */}
                    <div className="relative w-full max-h-[25vh] rounded-xl overflow-hidden shadow-lg border border-white/[0.06]">
                      <img
                        src={storyPreview}
                        alt="Story card"
                        className={`w-full h-full object-cover object-top transition-opacity duration-200 ${generatingCard ? 'opacity-40' : 'opacity-100'}`}
                        style={{ aspectRatio: '9/16' }}
                      />
                      {generatingCard && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="text-xl">✨</motion.span>
                        </div>
                      )}
                    </div>

                    {/* ── Edit Text + QR toggle ── */}
                    <div className="w-full flex gap-1.5">
                      <button
                        onClick={() => { setStoryEditingText(!storyEditingText); setStoryTextDraft(storyCustomPrompt ?? decodeEntities(prompt)); }}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          storyEditingText ? 'bg-white/15 text-white border-white/20' : 'bg-white/[0.05] text-white/40 border-white/[0.06] hover:bg-white/[0.08]'
                        }`}
                      >
                        ✏️ {lang === 'bn' ? 'Text বদলাও' : 'Edit Text'}
                      </button>
                      <button
                        onClick={toggleStoryQR}
                        disabled={generatingCard}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                          storyShowQR ? 'bg-white/15 text-white border-white/20' : 'bg-white/[0.05] text-white/40 border-white/[0.06] hover:bg-white/[0.08]'
                        }`}
                      >
                        {storyShowQR ? '🔳 QR On' : '▫️ QR Off'}
                      </button>
                    </div>

                    {/* ── Inline text editor ── */}
                    <AnimatePresence>
                      {storyEditingText && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="w-full overflow-hidden"
                        >
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={storyTextDraft}
                              onChange={e => setStoryTextDraft(e.target.value)}
                              maxLength={60}
                              placeholder={lang === 'bn' ? 'নতুন text লেখো...' : 'Type new text...'}
                              className="flex-1 bg-white/[0.06] text-white text-[11px] px-3 py-2 rounded-xl border border-white/[0.08] outline-none focus:border-white/20 placeholder:text-white/20"
                              autoFocus
                              onKeyDown={e => e.key === 'Enter' && saveStoryText()}
                            />
                            <button
                              onClick={saveStoryText}
                              disabled={generatingCard || !storyTextDraft.trim()}
                              className="px-3 py-2 bg-emerald-500/20 text-emerald-400 font-bold text-[10px] rounded-xl border border-emerald-500/15 hover:bg-emerald-500/30 transition-all disabled:opacity-30 active:scale-[0.97]"
                            >✓</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── Theme palette ── */}
                    <div className="w-full">
                      <p className="text-white/30 text-[9px] font-bold mb-1.5">{lang === 'bn' ? '🎨 Theme বাছো' : '🎨 Pick a theme'}</p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {STORY_PALETTES.map((p, i) => {
                          const dotColors = p.colors || (NGL_THEMES[theme]?.bg.match(/#[a-fA-F0-9]{6}/g) || ['#667eea', '#f8477a']);
                          return (
                            <button
                              key={i}
                              onClick={() => changeStoryColor(i)}
                              disabled={generatingCard}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all border min-h-[44px] ${
                                storyColorIdx === i
                                  ? 'bg-white/15 text-white border-white/20'
                                  : 'bg-white/[0.04] text-white/35 border-white/[0.04] hover:bg-white/[0.08] hover:text-white/50'
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${dotColors[0]}, ${dotColors[dotColors.length - 1]})` }}
                              />
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Chat Preview / OG editing ── */}
                    <div className="w-full">
                      <button
                        onClick={() => { setOgEditing(!ogEditing); setOgTitleDraft(ogTitle || ''); setOgDescDraft(ogDescription || ''); }}
                        className="w-full flex items-center justify-between py-1.5 text-white/30 hover:text-white/50 transition-all"
                      >
                        <span className="text-[10px] font-bold">💬 {lang === 'bn' ? 'Chat Preview কাস্টমাইজ করো' : 'Customize Chat Preview'}</span>
                        <span className="text-[10px]">{ogEditing ? '▲' : '▼'}</span>
                      </button>
                      <AnimatePresence>
                        {ogEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2.5 pb-2">
                              <p className="text-white/20 text-[9px] leading-relaxed">
                                {lang === 'bn'
                                  ? 'WhatsApp/Telegram-এ link paste করলে যে preview দেখায় সেটা customize করো'
                                  : 'Customize the preview that appears when your link is pasted in WhatsApp/Telegram'}
                              </p>

                              {/* Live OG Chat Bubble Preview */}
                              <div className="bg-white/[0.04] rounded-2xl p-3 border border-white/[0.05]">
                                <p className="text-white/25 text-[8px] font-bold uppercase tracking-wider mb-2">
                                  💬 {lang === 'bn' ? 'Chat-এ এমন দেখাবে:' : 'Preview in chat:'}
                                </p>
                                <div className="flex items-start gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex-shrink-0 flex items-center justify-center mt-0.5">
                                    <span className="text-white text-[8px] font-bold">B</span>
                                  </div>
                                  <div className="flex-1 bg-white/[0.06] rounded-xl rounded-tl-sm overflow-hidden border border-white/[0.04]">
                                    <div className="bg-white/[0.04] px-2.5 py-1.5 border-b border-white/[0.04]">
                                      <p className="text-white/70 text-[10px] font-bold truncate">{ogTitleDraft || `Send @${username} anonymous messages!`}</p>
                                      <p className="text-white/35 text-[8px] mt-0.5 line-clamp-2">{ogDescDraft || (lang === 'bn' ? 'Tap to send an anonymous message 👀' : 'Tap to send an anonymous message 👀')}</p>
                                    </div>
                                    <p className="text-white/20 text-[7px] px-2.5 py-1 font-mono truncate">{shareLink.replace('https://', '').replace('http://', '').split('/').slice(0, 2).join('/')}</p>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-white/30 text-[9px] font-bold block mb-1">Title</label>
                                <input
                                  type="text"
                                  value={ogTitleDraft}
                                  onChange={e => setOgTitleDraft(e.target.value)}
                                  maxLength={200}
                                  placeholder={`Send @${username} anonymous messages!`}
                                  className="w-full bg-white/[0.06] text-white text-[11px] px-3 py-2 rounded-xl border border-white/[0.08] outline-none focus:border-white/20 placeholder:text-white/15"
                                />
                              </div>
                              <div>
                                <label className="text-white/30 text-[9px] font-bold block mb-1">Description</label>
                                <input
                                  type="text"
                                  value={ogDescDraft}
                                  onChange={e => setOgDescDraft(e.target.value)}
                                  maxLength={500}
                                  placeholder={lang === 'bn' ? 'Tap to send an anonymous message 👀' : 'Tap to send an anonymous message 👀'}
                                  className="w-full bg-white/[0.06] text-white text-[11px] px-3 py-2 rounded-xl border border-white/[0.08] outline-none focus:border-white/20 placeholder:text-white/15"
                                />
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={async () => { await saveOgMeta(); showStoryToast(lang === 'bn' ? '✓ Chat preview save হয়েছে!' : '✓ Chat preview saved!'); }}
                                  disabled={ogSaving}
                                  className="flex-1 bg-emerald-500/15 text-emerald-400 font-bold py-2 rounded-xl text-[10px] border border-emerald-500/10 hover:bg-emerald-500/25 transition-all disabled:opacity-40 active:scale-[0.97]"
                                >
                                  {ogSaving ? '⏳' : ogSaved ? '✓ Saved!' : (lang === 'bn' ? '💾 Save করো' : '💾 Save')}
                                </button>
                                <button
                                  onClick={() => { setOgTitleDraft(''); setOgDescDraft(''); }}
                                  className="px-3 py-2 bg-white/[0.04] text-white/30 font-bold rounded-xl text-[10px] border border-white/[0.04] hover:bg-white/[0.08] transition-all active:scale-[0.97]"
                                >
                                  Reset
                                </button>
                              </div>
                              <p className="text-white/15 text-[8px] text-center">
                                {lang === 'bn' ? '⏱ Chat preview update হতে ২৪ ঘণ্টা পর্যন্ত লাগতে পারে' : '⏱ Chat preview changes may take up to 24h to appear'}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>{/* end content z-10 layer */}
      </div>
    </>
  );
}
