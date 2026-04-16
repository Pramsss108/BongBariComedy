import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { buildApiUrl } from '@/lib/queryClient';
import { useNglLang, LangToggle, FloatingHelp } from '@/components/NglLang';

// Bilingual default prompts for send page
const SEND_DEFAULTS = {
  bn: 'আমার সম্পর্কে anonymous কিছু বলো 👀',
  en: 'send me anonymous messages! 👀',
};

// ─── Bilingual prompt pairs (criss-cross translation) ───
// Maps Bengali ↔ English so toggling language shows the equivalent prompt
const PROMPT_PAIRS: [string, string][] = [
  ['আমার সম্পর্কে anonymous কিছু বলো 👀', 'send me anonymous messages! 👀'],
  ['আমাকে ৩ শব্দে বর্ণনা করো ✨', 'describe me in 3 words ✨'],
  ['আমার সম্পর্কে তোর honest opinion কি? 🤔', "what's your honest opinion about me? 🤔"],
  ['আমার সাথে তোর সবচেয়ে ভালো memory কি? 💭', 'what is your best memory with me? 💭'],
  ['আমাকে প্রথম দেখেই কি মনে হয়েছিল? 👋', 'what did you think when you first met me? 👋'],
  ['তুই কখনো আমার কাছে কি লুকিয়ে রেখেছিস? 🤫', 'are you hiding something from me? 🤫'],
  ['আমাকে একটা dare দে! 🔥', 'give me a dare! 🔥'],
  ['আমার সবচেয়ে annoying habit কি? 😅', 'what is my most annoying habit? 😅'],
  ['তুই আমার জায়গায় থাকলে কি করতিস? 🤷', 'what would you do if you were me? 🤷'],
  ['আমাকে নিয়ে একটা confession করো 💬', 'confess something about me 💬'],
  ['তুই কি আমাকে trust করিস? 🔒', 'do you trust me? 🔒'],
  ['Never have I ever... আমাকে catch করো 🙈', 'never have I ever... catch me 🙈'],
  ['আমার life-এ কি change করা উচিত? 💡', 'what should I change in my life? 💡'],
  ['তোর মনে আমার বিশেষ জায়গা আছে? 💜', 'do I have a special place in your heart? 💜'],
  ['আমার best quality কি? আর worst? ⚖️', 'what is my best and worst quality? ⚖️'],
  ['তুই আমাকে কোন গান দিয়ে describe করবি? 🎵', 'describe me with a song 🎵'],
  ['আমার জীবনে তুই কেন important? 🌟', 'why are you important in my life? 🌟'],
  ['rate me 1-10 honestly — কোনো ভান নয়! 📊', 'rate me 1-10 honestly — no cap! 📊'],
  ['আমাকে একটা কথা বলো যেটা তুই কখনো বলিসনি 🗝️', 'tell me something you never told me 🗝️'],
  ['যদি আমি কাল disappear হয়ে যাই — কি করবি? 😢', 'if I disappear tomorrow — what would you do? 😢'],
];

// Build lookup maps for O(1) translation
const bnToEn = new Map(PROMPT_PAIRS.map(([bn, en]) => [bn, en]));
const enToBn = new Map(PROMPT_PAIRS.map(([bn, en]) => [en, bn]));

/**
 * Translate a prompt to the target language if a known pair exists.
 * If no match found, returns the original prompt (custom prompts stay as-is).
 */
function translatePrompt(prompt: string, targetLang: 'bn' | 'en'): string {
  if (targetLang === 'en') {
    return bnToEn.get(prompt) || prompt;
  }
  return enToBn.get(prompt) || prompt;
}

// Decode HTML entities from legacy data in DB
function decodeEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

export default function NglSend() {
  const [, params] = useRoute('/ngl/q/:username');
  const username = params?.username || '';
  const { t, lang } = useNglLang();

  const [profile, setProfile] = useState<{ username: string; prompt: string; createdAt: string; theme?: string; photo?: string | null } | null>(null);

  // Theme definitions (same as dashboard)
  const NGL_THEMES: Record<string, { bg: string; accent: string }> = {
    default: { bg: 'linear-gradient(135deg, #667eea 0%, #f8477a 30%, #ee6b3b 60%, #f4843e 100%)', accent: 'from-pink-500 via-orange-400 to-yellow-400' },
    pink: { bg: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%)', accent: 'from-pink-500 via-rose-400 to-orange-400' },
    blue: { bg: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', accent: 'from-blue-500 via-indigo-400 to-violet-400' },
    green: { bg: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)', accent: 'from-emerald-500 via-teal-400 to-cyan-400' },
    purple: { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', accent: 'from-violet-500 via-purple-400 to-fuchsia-400' },
    gold: { bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #dc2626 100%)', accent: 'from-amber-500 via-orange-400 to-red-400' },
    dark: { bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)', accent: 'from-indigo-400 via-violet-300 to-blue-400' },
  };

  const themeBg = NGL_THEMES[profile?.theme || 'default']?.bg || NGL_THEMES.default.bg;
  const themeAccent = NGL_THEMES[profile?.theme || 'default']?.accent || NGL_THEMES.default.accent;
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;
    fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}`))
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => setProfile(d))
      .catch(() => setNotFound(true));
  }, [username]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      // Phase 40: Collect all legal client-side metadata silently
      const meta: Record<string, string> = {};
      
      // Screen resolution
      try { meta.screen = `${window.screen.width}x${window.screen.height}`; } catch {}
      
      // Connection type (WiFi/4G/5G)
      try {
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn?.effectiveType) meta.connection = conn.effectiveType.toUpperCase();
      } catch {}
      
      // Battery level
      try {
        const batt = await (navigator as any).getBattery?.();
        if (batt) meta.battery = `${Math.round(batt.level * 100)}%${batt.charging ? ' ⚡' : ''}`;
      } catch {}
      
      // Dark/Light mode preference
      try {
        meta.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light';
      } catch {}
      
      // Referrer (where they came from — WhatsApp, IG, etc.)
      try {
        const ref = document.referrer;
        if (ref) {
          if (ref.includes('instagram')) meta.referrer = 'Instagram';
          else if (ref.includes('whatsapp') || ref.includes('wa.me')) meta.referrer = 'WhatsApp';
          else if (ref.includes('facebook') || ref.includes('fb.')) meta.referrer = 'Facebook';
          else if (ref.includes('t.co') || ref.includes('twitter') || ref.includes('x.com')) meta.referrer = 'Twitter/X';
          else if (ref.includes('telegram') || ref.includes('t.me')) meta.referrer = 'Telegram';
          else if (ref.includes('snapchat')) meta.referrer = 'Snapchat';
          else if (ref.includes('google')) meta.referrer = 'Google';
          else meta.referrer = 'Direct Link';
        } else {
          meta.referrer = 'Direct Link';
        }
      } catch {}
      
      // Local time of sender
      try {
        const now = new Date();
        const hours = now.getHours();
        const mins = now.getMinutes().toString().padStart(2, '0');
        const period = hours >= 5 && hours < 12 ? 'Morning' : hours >= 12 && hours < 17 ? 'Afternoon' : hours >= 17 && hours < 21 ? 'Evening' : 'Night';
        meta.localTime = `${hours > 12 ? hours - 12 : hours || 12}:${mins} ${hours >= 12 ? 'PM' : 'AM'} (${period})`;
      } catch {}
      
      const res = await fetch(buildApiUrl(`/api/ngl/u/${encodeURIComponent(username)}/send`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        },
        body: JSON.stringify({ text: message.trim(), meta }),
      });
      const data = await res.json();
      if (res.ok) { setSentText(message.trim()); setSent(true); } else { setError(data.error || data.message || 'Failed to send'); }
    } catch { setError('Connection error'); }
    setSending(false);
  };

  const [sentText, setSentText] = useState('');

  const resetForm = () => { setSent(false); setMessage(''); setSentText(''); setError(''); };

  // Loading — Premium skeleton pulse
  if (!profile && !notFound) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center px-4" style={{ background: themeBg }}>
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }} 
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[32px] w-full max-w-[420px] flex flex-col gap-5 shadow-2xl"
        >
          <div className="flex gap-4 items-center">
            <div className="w-[52px] h-[52px] rounded-full bg-white/20" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-24 bg-white/20 rounded-full" />
              <div className="h-3 w-16 bg-white/10 rounded-full" />
            </div>
          </div>
          <div className="h-6 w-3/4 bg-white/20 rounded-full" />
          <div className="h-32 w-full bg-white/10 rounded-2xl mt-2" />
        </motion.div>
      </div>
    );
  }

  // Not found — Clean elegant 404
  if (notFound) {
    return (
      <>
        <div className="h-dvh w-full flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ background: themeBg }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[32px] w-full max-w-[400px] text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
          >
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="text-6xl mb-6 drop-shadow-lg"
            >
              😕
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">@{username}</h1>
            <p className="text-white/70 mb-8 text-sm font-medium">{t('send.notFound')}</p>
            <Link href="/ngl">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-gray-900 px-8 py-4 w-full rounded-full font-extrabold shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.3)] transition-all"
              >
                {t('send.getOwn')}
              </motion.button>
            </Link>
          </motion.div>
        </div>
        <FloatingHelp />
      </>
    );
  }

  // Sent confirmation — ultra premium celebration sequence
  if (sent) {
    return (
      <>
        <SEOHead title={`Sent to @${username} — Bong NGL`} description="Your anonymous message has been sent!" url={`https://www.bongbari.com/ngl/q/${username}`} />
        <div className="h-dvh w-full overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 relative" style={{ background: themeBg, paddingBottom: 'env(safe-area-inset-bottom)' }}>
          
          {/* Success Confetti/Orbs */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 2, 3], opacity: [0.5, 0, 0] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[10px] border-white/20 rounded-full"
          />

          <motion.div
            initial={{ y: 50, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center w-full max-w-[400px] relative z-10"
          >
            {/* Animated checkmark with premium glow */}
            <motion.div
              initial={{ rotate: -45, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 15 }}
              className="relative inline-flex items-center justify-center w-24 h-24 mb-6"
            >
              <div className="absolute inset-0 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.3)] rounded-full z-0 flex items-center justify-center">
                <span className="text-5xl relative z-10 block translate-y-[-2px]">✅</span>
              </div>
              <motion.div
                className="absolute inset-[-10px] rounded-full blur-xl z-[-1]"
                style={{ background: 'rgba(255,255,255,0.4)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
            
            <motion.h1 
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl font-black text-white mb-2 drop-shadow-md tracking-tight"
            >
              {t('send.sent')}
            </motion.h1>

            {/* Show what was sent — sleek receipt */}
            {sentText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", damping: 25 }}
                className="bg-white/10 backdrop-blur-xl rounded-[24px] p-5 mb-8 border border-white/20 mx-auto w-full shadow-[0_15px_35px_rgba(0,0,0,0.2)]"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.2em]">
                    {lang === 'bn' ? 'তোর message' : 'your message'}
                  </p>
                  <div className="h-px bg-white/20 flex-grow max-w-[40px]"></div>
                </div>
                <p className="text-white text-base sm:text-lg leading-relaxed break-words font-bold">"{sentText}"</p>
                <div className="mt-4 inline-block bg-white/10 rounded-full px-3 py-1">
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider">🔒 Sent to @{username}</p>
                </div>
              </motion.div>
            )}

            <Link href="/ngl">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative group overflow-hidden bg-white text-black font-black text-base px-8 py-4 sm:py-5 rounded-full shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] mb-4 w-full"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10">{t('send.getOwnBtn')}</span>
              </motion.button>
            </Link>

            <motion.button 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              onClick={resetForm} 
              className="text-white/60 text-[13px] font-bold uppercase tracking-wider hover:text-white transition-colors block mx-auto mt-4 px-4 py-2"
            >
              {t('send.another')}
            </motion.button>
          </motion.div>
        </div>
        <FloatingHelp />
      </>
    );
  }

  // Main send form — ultra premium glass card
  return (
    <>
      <SEOHead
        title={`Send @${username} anonymous messages — Bong NGL`}
        description={profile?.prompt ? `${profile.prompt} — tap to send anonymously 👀` : "Send an anonymous message — they won't know who sent it! 👀"}
        url={`https://www.bongbari.com/ngl/q/${username}`}
        image={`http://158.101.175.37:5000/api/ngl/og/${encodeURIComponent(username)}/image`}
      />
      <div className="h-dvh w-full overflow-hidden relative" style={{ background: themeBg, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        
        {/* Animated Background Orbs for Premium Depth */}
        <motion.div
          animate={{ x: [-20, 20, -20], y: [-20, 20, -20] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none hidden sm:block"
        />
        <motion.div
          animate={{ x: [20, -20, 20], y: [20, -20, 20] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 right-10 w-72 h-72 bg-black/10 rounded-full blur-3xl pointer-events-none hidden sm:block"
        />

        <div className="min-h-full flex flex-col items-center justify-center px-4 py-6 relative z-10">
          {/* Lang toggle */}
          <LangToggle className="absolute top-4 right-4 sm:right-6 z-20" />

          <motion.div
            initial={{ y: 40, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-[420px]"
          >
            {/* Premium glass card */}
            <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40 relative overflow-hidden group">
              {/* Animated top gradient wire */}
              <motion.div 
                animate={{ backgroundPosition: ['0% 0%', '100% 0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
                style={{ background: `linear-gradient(90deg, transparent, rgba(236,72,153,0.8), rgba(249,115,22,0.8), transparent)`, backgroundSize: '200% 100%' }}
              />

              {/* Profile header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-shrink-0">
                  <motion.div
                    className="absolute inset-[-3px] rounded-full opacity-80"
                    style={{ background: 'conic-gradient(from 0deg, #ec4899, #f97316, #fbbf24, #10b981, #3b82f6, #ec4899)' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="absolute inset-[-3px] rounded-full bg-white z-[1] m-[1px]" />
                  {profile?.photo ? (
                    <img src={profile.photo} alt={username} className="relative z-10 w-[52px] h-[52px] rounded-full object-cover shadow-sm ring-2 ring-white" />
                  ) : (
                    <div className="relative z-10 w-[52px] h-[52px] rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white font-black text-xl shadow-sm ring-2 ring-white">
                      {username[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-black text-gray-900 text-lg tracking-tight leading-tight">@{username}</p>
                  <div className="flex items-center gap-1 opacity-70">
                    <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">bong ngl anon</p>
                  </div>
                </div>
              </div>

              {/* Prompt — criss-cross translates when user toggles lang */}
              <p className="font-extrabold text-gray-900 text-xl sm:text-2xl mb-5 leading-snug">
                {decodeEntities(
                  profile?.prompt
                    ? translatePrompt(profile.prompt, lang as 'bn' | 'en')
                    : SEND_DEFAULTS[lang as 'bn' | 'en'] || SEND_DEFAULTS.en
                )}
              </p>

              {/* Textarea — premium focused */}
              <div className="relative mb-5 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-400 to-orange-400 rounded-[24px] opacity-0 group-focus-within:opacity-30 blur transition-opacity duration-500"></div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 500))}
                  placeholder={t('send.placeholder')}
                  rows={4}
                  autoFocus
                  className="relative w-full resize-none rounded-[22px] border-2 border-gray-100 p-5 text-lg text-gray-800 outline-none focus:border-transparent focus:ring-4 focus:ring-pink-500/10 transition-all placeholder:text-gray-300 bg-gray-50/80 focus:bg-white shadow-inner font-medium"
                />
                <div className="flex justify-between items-center mt-2 px-2">
                  <p className={`text-[11px] font-bold tracking-wide transition-colors ${message.length > 450 ? 'text-orange-500' : message.length > 490 ? 'text-red-500' : 'text-gray-400'}`}>{message.length}/500</p>
                  <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    🔒 {t('send.anon')}
                  </span>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <p className="text-red-600 text-sm text-center mb-4 bg-red-50 border border-red-100 rounded-xl py-2.5 px-4 font-bold">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Send button — premium animated */}
              <motion.button
                whileHover={{ scale: message.trim() ? 1.03 : 1 }}
                whileTap={{ scale: message.trim() ? 0.95 : 1 }}
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className={`relative w-full py-4 rounded-full font-black text-lg overflow-hidden transition-all duration-300 ${
                  message.trim() && !sending
                    ? 'shadow-[0_10px_25px_rgba(0,0,0,0.3)]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {message.trim() && !sending && (
                  <>
                    <div className="absolute inset-0 bg-gray-900" />
                    <motion.div
                      className="absolute inset-0 opacity-20"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
                      animate={{ x: ['-200%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                )}
                <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                  {sending ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                  ) : (
                    <>
                      {t('send.btn')}
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* Powered by */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-white/40 text-xs mt-6 font-bold uppercase tracking-widest drop-shadow-md">
              {t('send.powered')} <Link href="/" className="underline hover:text-white transition-colors">Bong Bari</Link>
            </motion.p>

            <FloatingHelp />
          </motion.div>
        </div>
      </div>
    </>
  );
}
