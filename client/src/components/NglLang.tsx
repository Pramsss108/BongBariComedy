import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Detect if user is likely Bengali ───
function detectBengali(): boolean {
  try {
    // 1. Check browser language
    const lang = navigator.language || (navigator as any).userLanguage || '';
    if (lang.startsWith('bn')) return true;

    // 2. Check all browser languages
    const langs = navigator.languages || [];
    if (langs.some(l => l.startsWith('bn'))) return true;

    // 3. Check timezone (IST/BST = likely Bengali)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Dhaka')) return true;
    // Kolkata timezone alone is not enough — many Indians speak English
    // Only auto-detect Bengali if browser explicitly has 'bn'

    // Default: English (user can toggle to Bengali)
    return false;
  } catch {
    return false;
  }
}

type Lang = 'bn' | 'en';

interface LangContextType {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'bn',
  toggle: () => {},
  t: (k) => k,
});

// ─── All translations ───
// bn = Bengali (mix of Bengali + English, casual)
// en = Pure English
const translations: Record<string, Record<Lang, string>> = {
  // Landing
  'landing.tagline': {
    bn: 'anonymous messages পাঠাও — কেউ জানবে না কে পাঠিয়েছে 🤫',
    en: 'send anonymous messages — nobody will know who sent it 🤫',
  },
  'landing.cta': { bn: 'শুরু করো!', en: 'Get Started!' },
  'landing.free': { bn: 'চিরকাল ফ্রি', en: 'Free forever' },
  'landing.noApp': { bn: 'কোনো app লাগবে না', en: 'No app needed' },
  'landing.alreadyHave': { bn: 'আগে থেকেই account আছে?', en: 'Already have an account?' },

  // Create
  'create.title': { bn: 'একটা username বাছো', en: 'Choose a username' },
  'create.subtitle': { bn: 'এটা তোর anonymous link-এ থাকবে', en: 'This will be in your anonymous link' },
  'create.placeholder': { bn: 'username', en: 'username' },
  'create.min3': { bn: 'কমপক্ষে ৩ characters লাগবে', en: 'Minimum 3 characters' },
  'create.checking': { bn: 'checking...', en: 'checking...' },
  'create.available': { bn: '✓ পাওয়া যাচ্ছে!', en: '✓ available!' },
  'create.taken': { bn: 'নেওয়া হয়ে গেছে', en: 'already taken' },
  'create.continue': { bn: 'এগিয়ে যাও →', en: 'Continue →' },
  'create.creating': { bn: 'তৈরি হচ্ছে...', en: 'Creating...' },
  'create.linkPreview': { bn: 'তোর link:', en: 'Your link:' },
  'create.error': { bn: 'সার্ভার পাওয়া যাচ্ছে না, আবার চেষ্টা করো', en: 'Server unavailable, try again later' },
  'create.welcomeTitle': { bn: 'স্বাগতম! 🎉', en: 'Welcome! 🎉' },
  'create.photoPrompt': { bn: 'প্রোফাইল ফটো দাও, বন্ধুরা চিনবে', en: 'Add a profile photo so friends recognize you' },
  'create.tapToUpload': { bn: 'ট্যাপ করো', en: 'Tap to upload' },
  'create.choosePhoto': { bn: 'ফটো বাছো', en: 'Choose Photo' },
  'create.saveAndContinue': { bn: 'সেভ করো & এগিয়ে যাও →', en: 'Save & Continue →' },
  'create.skipPhoto': { bn: 'পরে করবো →', en: 'Skip for now →' },

  // Login (re-authenticate with secret key)
  'login.title': { bn: 'Secret Key দিয়ে Login', en: 'Login with Secret Key' },
  'login.subtitle': { bn: 'Account তৈরি করার সময় যে key সেভ করেছিলে', en: 'Enter the key you saved when creating your account' },
  'login.userPlaceholder': { bn: 'username', en: 'username' },
  'login.keyPlaceholder': { bn: 'secret key paste করো', en: 'paste your secret key' },
  'login.btn': { bn: 'Login →', en: 'Login →' },
  'login.loggingIn': { bn: 'Login হচ্ছে...', en: 'Logging in...' },
  'login.wrongKey': { bn: 'ভুল secret key!', en: 'Wrong secret key!' },
  'login.switchToLogin': { bn: 'আগে থেকেই account আছে? Login করো →', en: 'Already have an account? Login →' },
  'login.switchToCreate': { bn: '← নতুন account তৈরি করো', en: '← Create new account' },
  'login.pinTitle': { bn: 'PIN দিয়ে Login', en: 'Login with PIN' },
  'login.pinSubtitle': { bn: 'Account তৈরি করার সময় যে 6-digit PIN দিয়েছিলে', en: 'Enter the 6-digit PIN you set when creating your account' },
  'login.useKeyInstead': { bn: 'Secret key দিয়ে login করো →', en: 'Use secret key instead →' },
  'login.usePinInstead': { bn: 'PIN দিয়ে login করো →', en: 'Use PIN instead →' },

  // Create — PIN
  'create.pinLabel': { bn: '�️ 6-digit PIN বানাও — account safe থাকবে', en: '🛡️ Set a 6-digit PIN — keeps your account safe' },
  'create.pinHint': { bn: 'PIN দিলে যেকোনো device থেকে login করতে পারবে', en: 'You can log in from any device with your PIN' },

  // Create — WhatsApp phone (Phase 35)
  'create.phoneLabel': { bn: '📱 WhatsApp নম্বর দাও — account recover করতে পারবে', en: '📱 Add WhatsApp number — recover your account anytime' },
  'create.phoneHint': { bn: '📱 WhatsApp-এ Reference code পাঠাবো — verify করো!', en: '📱 We\'ll send a Reference code to your WhatsApp — verify it!' },
  'create.phonePlaceholder': { bn: '10-digit নম্বর', en: '10-digit number' },

  // OTP verification (Phase 35)
  'otp.title': { bn: 'WhatsApp চেক করো 📱', en: 'Check your WhatsApp 📱' },
  'otp.subtitle': { bn: 'তোমার WhatsApp-এ একটা Reference number পাঠিয়েছি', en: 'We sent a Reference number to your WhatsApp' },
  'otp.sentTo': { bn: 'পাঠানো হয়েছে:', en: 'Sent to:' },
  'otp.enterRef': { bn: 'Reference number লেখো', en: 'Enter Reference Number' },
  'otp.placeholder': { bn: '6-digit number', en: '6-digit number' },
  'otp.verify': { bn: 'Verify করো ✓', en: 'Verify ✓' },
  'otp.verifying': { bn: 'চেক হচ্ছে...', en: 'Verifying...' },
  'otp.verified': { bn: '✅ Verified!', en: '✅ Verified!' },
  'otp.resend': { bn: 'আবার পাঠাও', en: 'Resend code' },
  'otp.resendWait': { bn: 'Xs পর আবার পাঠাতে পারবে', en: 'Resend in Xs' },
  'otp.skip': { bn: 'পরে করবো →', en: 'Skip for now →' },
  'otp.wrongCode': { bn: 'ভুল Reference number! আবার চেষ্টা করো', en: 'Wrong Reference number! Try again' },
  'otp.expired': { bn: 'Reference number expire হয়ে গেছে — Resend করো', en: 'Reference number expired — tap Resend' },
  'otp.sendFailed': { bn: 'পাঠানো যায়নি — আবার চেষ্টা করো', en: 'Could not send — please try again' },
  'otp.whatsappNote': { bn: '💡 WhatsApp message-এ "Reference: XXXXXX" লেখা থাকবে — সেই number দাও', en: '💡 Look for a WhatsApp message with "Reference: XXXXXX" — enter that number' },

  // Dashboard — Phone verification (Phase B)
  'dash.phoneTitle': { bn: '📱 WhatsApp Verification', en: '📱 WhatsApp Verification' },
  'dash.phoneNone': { bn: 'WhatsApp নম্বর যোগ করো — account recover করতে পারবে', en: 'Add WhatsApp number — recover your account anytime' },
  'dash.phoneUnverified': { bn: 'নম্বর verify করো', en: 'Verify your number' },
  'dash.phoneVerified': { bn: 'Verified ✅', en: 'Verified ✅' },
  'dash.phoneAdd': { bn: 'নম্বর যোগ করো', en: 'Add number' },
  'dash.phoneVerifyBtn': { bn: 'Verify করো', en: 'Verify now' },
  'dash.phoneSendRef': { bn: 'Reference Code পাঠাও', en: 'Send Reference Code' },
  'dash.phoneChange': { bn: 'নম্বর বদলাও', en: 'Change number' },
  'dash.phoneInputHint': { bn: '10-digit WhatsApp নম্বর', en: '10-digit WhatsApp number' },
  'dash.phoneInvalid': { bn: 'সঠিক নম্বর দাও (10 digit, 6-9 দিয়ে শুরু)', en: 'Enter valid number (10 digits, starts with 6-9)' },
  'dash.phoneDesc': { bn: 'WhatsApp-এ Reference code পাঠাবো', en: 'We\'ll send a Reference code via WhatsApp' },

  // Dashboard
  'dash.logout': { bn: 'বের হও', en: 'Logout' },
  'dash.step1': { bn: 'Step 1: তোর link copy করো', en: 'Step 1: Copy your link' },
  'dash.step2': { bn: 'Step 2: Story-তে share করো', en: 'Step 2: Share on your story' },
  'dash.share': { bn: 'Share করো! 🔗', en: 'Share! 🔗' },
  'dash.whatsapp': { bn: 'WhatsApp 💬', en: 'WhatsApp 💬' },
  'dash.instagram': { bn: 'Instagram 📸', en: 'Instagram 📸' },
  'dash.copied': { bn: '✓ কপি হয়েছে!', en: '✓ Copied!' },
  'dash.copy': { bn: '📋 কপি', en: '📋 Copy' },
  'dash.emptyTitle': { bn: 'তোর inbox খালি!', en: 'Your inbox is empty!' },
  'dash.emptySubtitle': { bn: 'Link share করো, messages আসবে', en: 'Share your link to get messages' },
  'dash.copyLink': { bn: 'Link কপি করো 📋', en: 'Copy Link 📋' },
  'dash.msgCount': { bn: 'টা message', en: ' message(s)' },
  'dash.deleteHint': { bn: '🗑️ চাপো delete করতে', en: 'tap 🗑️ to delete' },
  'dash.moreMsg': { bn: 'আরো message পেতে link copy করো', en: 'Copy link for more messages' },
  'dash.promptPlaceholder': { bn: 'তোর prompt লেখো...', en: 'Write your prompt...' },
  'dash.save': { bn: 'সেভ', en: 'Save' },
  'dash.cancel': { bn: 'বাদ দাও', en: 'Cancel' },
  'dash.igAlert': { bn: 'Link কপি হয়েছে! 📋\n\nInstagram Story → Link sticker → paste করো', en: 'Link copied! 📋\n\nGo to Instagram Story → Link sticker → Paste' },
  'dash.showKey': { bn: 'Secret Key দেখো (re-login এর জন্য)', en: 'Show Secret Key (for re-login)' },
  'dash.hideKey': { bn: 'Secret Key লুকাও', en: 'Hide Secret Key' },
  'dash.keyWarning': { bn: '⚠️ এই key সেভ করো! অন্য device থেকে login করতে লাগবে।', en: '⚠️ Save this key! You need it to login again on another device.' },
  'dash.diceAI': { bn: 'AI দিয়ে নতুন prompt (🎲)', en: 'AI-powered random prompt (🎲)' },
  'dash.banish': { bn: 'Profile মুছে ফেলো (সব শেষ করো)', en: 'Delete Profile (destroy everything)' },
  'dash.banishWarning': { bn: 'এটা করলে তোর account, সব messages, সব data — সব permanently মুছে যাবে। undo করা যাবে না!', en: 'This will permanently delete your account, all messages, all data. This cannot be undone!' },
  'dash.banishConfirmLabel': { bn: 'confirm করতে তোর username টাইপ করো:', en: 'Type your username to confirm:' },
  'dash.banishBtn': { bn: '🔥 সব মুছে দাও', en: '🔥 Delete Everything' },
  'dash.farewellTitle': { bn: 'আমরা তোমাকে হারিয়ে দুঃখিত 😢', en: "We're sad to see you go 😢" },
  'dash.farewellSubtitle': { bn: 'তোমার anonymous messages, থিম, সব কিছু — চিরকালের জন্য মুছে যাবে।', en: 'Your anonymous messages, themes, everything — gone forever.' },
  'dash.farewellConfirm': { bn: 'হ্যাঁ, সত্যিই মুছে দাও', en: 'Yes, really delete' },
  'dash.farewellCancel': { bn: 'না, ফিরে যাই 💜', en: "No, take me back 💜" },
  'dash.newPrompt': { bn: 'নতুন prompt সেট হয়েছে!', en: 'New prompt set!' },
  'dash.enhance': { bn: 'উন্নত করো', en: 'Enhance' },
  'dash.enhancing': { bn: 'করছি...', en: 'Enhancing...' },
  'dash.offline': { bn: 'তুমি offline 📡 — internet চেক করো', en: "You're offline 📡 — check your internet" },
  'dash.retry': { bn: 'আবার চেষ্টা করো', en: 'Tap to retry' },
  'dash.retrying': { bn: 'আবার চেষ্টা হচ্ছে', en: 'Retrying' },

  // Dashboard — Themes (Phase 28)
  'dash.chooseTheme': { bn: '🎨 থিম বাছো', en: '🎨 Choose Theme' },
  // Dashboard — Photos (Phase 29)
  'dash.uploadPhoto': { bn: 'ফটো আপলোড করো', en: 'Upload Photo' },
  'dash.removePhoto': { bn: 'ফটো মুছো', en: 'Remove Photo' },
  // Dashboard — Hints (Phase 26)
  'dash.freeHintBadge': { bn: '🆓 NGL $9.99/week চার্জ করে — তোর জন্য ফ্রি!', en: '🆓 NGL charges $9.99/week for this — FREE for you!' },
  // Dashboard — Reactions (Phase 27)
  'dash.tapReact': { bn: 'react করতে চাপো', en: 'Tap to react' },

  // Dashboard — Phase 31+32: Story Card + QR
  'dash.storyCard': { bn: 'Story Card', en: 'Story Card' },
  'dash.qrCode': { bn: 'QR Code', en: 'QR Code' },
  // Dashboard — Phase 33: Streak
  'dash.streak': { bn: 'দিনের streak', en: 'day streak' },
  // Landing — Phase 34: Live Stats
  'landing.liveStats': { bn: '🔥 {{count}} anonymous messages পাঠানো হয়েছে!', en: '🔥 {{count}} anonymous messages sent!' },

  // Send page
  'send.notFound': { bn: 'খুঁজে পাওয়া যায়নি 😕', en: 'User not found 😕' },
  'send.getOwn': { bn: 'তোমার নিজের link তৈরি করো!', en: 'Create your own link!' },
  'send.placeholder': { bn: 'তোর message লেখো...', en: 'type your message here...' },
  'send.anon': { bn: '🔒 anonymous', en: '🔒 anonymous' },
  'send.btn': { bn: 'পাঠাও! 🚀', en: 'Send! 🚀' },
  'send.sending': { bn: 'পাঠাচ্ছে...', en: 'Sending...' },
  'send.sent': { bn: 'পাঠানো হয়েছে!', en: 'Sent!' },
  'send.fakeCount': { bn: 'জন friends এইমাত্র button চাপলো', en: 'friends just tapped the button' },
  'send.getOwnBtn': { bn: 'তোমারও messages পাও! 🎭', en: 'Get your own messages! 🎭' },
  'send.another': { bn: 'আরেকটা message পাঠাও', en: 'Send another message' },
  'send.powered': { bn: 'powered by', en: 'powered by' },

  // Help / FAQ
  'help.title': { bn: 'কিভাবে কাজ করে?', en: 'How does it work?' },
  'help.q1': { bn: 'এটা কি?', en: 'What is this?' },
  'help.a1': { bn: 'তোর নিজের secret link। এটা share করো — friends তোকে message পাঠাবে, কিন্তু তুই কখনো জানতে পারবে না কে পাঠিয়েছে! Mystery game এর মতো।', en: 'Your own secret link. Share it with friends — they can send you messages, but you will NEVER know who sent them. Like a mystery game!' },
  'help.q2': { bn: 'কিভাবে শুরু করবো?', en: 'How do I start?' },
  'help.a2': { bn: 'Username বাছো → Link কপি করো → WhatsApp বা Instagram Story-তে share করো → Inbox চেক করো!', en: 'Pick a username → Copy your link → Share on WhatsApp or Instagram story → Check your inbox for messages!' },
  'help.q3': { bn: 'সত্যিই anonymous?', en: 'Is it really secret?' },
  'help.a3': { bn: 'হ্যাঁ! কে message পাঠিয়েছে সেটা কোথাও save হয় না। তুই শুধু message পড়তে পারবে।', en: 'Yes! We never save who sends you a message. You can only read the message — the sender stays hidden forever.' },
  'help.q4': { bn: 'কি কি features আছে?', en: 'What cool stuff can I do?' },
  'help.a4': { bn: '🎲 AI prompt বানায় মজার প্রশ্ন, 🎨 ৭টা থিম, 📸 Story Card + QR code, 😍 message-এ emoji react, 🔥 daily streak!', en: '🎲 AI makes fun questions for you, 🎨 7 cool themes to style your page, 📸 Story Card with QR code for sharing, 😍 React to messages with emojis, 🔥 Daily streak counter!' },
  'help.q5': { bn: '📸 Story Card কি?', en: 'What is Story Card?' },
  'help.a5': { bn: 'তোর link + QR code দিয়ে একটা সুন্দর card! Download করে Instagram/WhatsApp story-তে post করো। Friends QR scan করে message পাঠাবে!', en: 'A beautiful card with your link + QR code! Download it and post on your Instagram or WhatsApp story. Friends scan the QR or tap to send you messages!' },
  'help.q6': { bn: 'ফ্রি?', en: 'Is it really free?' },
  'help.a6': { bn: '100% ফ্রি! কোনো app download, কোনো signup fee নেই। NGL app $9.99/week চার্জ করে — আমাদের সব ফ্রি!', en: '100% free forever! No app download, no signup fee. The NGL app charges $9.99 per week — we give you everything for FREE!' },
  'help.q7': { bn: 'অন্য phone থেকে login?', en: 'Login from another phone?' },
  'help.a7': { bn: 'Account বানানোর সময় 6-digit PIN দাও → যেকোনো phone-এ Login page → username + PIN দাও, ব্যস!', en: 'When you create your account, set a 6-digit PIN. Then on any phone, go to Login → type your username + PIN. Done!' },
  'help.q8': { bn: 'Data safe?', en: 'Is my data safe?' },
  'help.a8': { bn: 'হ্যাঁ! তোর messages permanent database-এ আছে। কিছু হারাবে না! 🔒', en: 'Yes! Your messages are saved in a real database. Nothing gets lost, ever! 🔒' },
  'help.close': { bn: 'বুঝেছি! ✌️', en: 'Got it! ✌️' },
};

export function NglLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    // Check localStorage first
    const saved = localStorage.getItem('bong_ngl_lang');
    if (saved === 'en' || saved === 'bn') return saved;
    // Auto-detect
    return detectBengali() ? 'bn' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('bong_ngl_lang', lang);
  }, [lang]);

  const toggle = () => setLang(prev => prev === 'bn' ? 'en' : 'bn');

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  };

  return (
    <LangContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useNglLang() {
  return useContext(LangContext);
}

// ─── Compact toggle button component ───
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, toggle } = useNglLang();
  return (
    <button
      onClick={toggle}
      className={`bg-white/25 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/40 transition-colors shadow-sm ${className}`}
      title={lang === 'en' ? 'বাংলায় দেখো' : 'Switch to English'}
    >
      {lang === 'en' ? 'EN' : 'বাং'}
    </button>
  );
}

// ─── Floating help — premium multi-step guided onboarding ───
export function FloatingHelp() {
  const { lang, t } = useNglLang();
  const [open, setOpen] = useState(() => !localStorage.getItem('bong_ngl_tutorial'));
  const [step, setStep] = useState(0);

  // Dev helper: window.resetTutorial()
  useEffect(() => {
    (window as any).resetTutorial = () => {
      localStorage.removeItem('bong_ngl_tutorial');
      setStep(0);
      setOpen(true);
      console.log('Tutorial reset — modal opened');
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    localStorage.setItem('bong_ngl_tutorial', '1');
  };

  type Slide = { emoji: string; gradient: string; title: string; subtitle: string; lines: string[]; cta: string; badge?: string };

  const slides: Slide[] = lang === 'bn' ? [
    // ── 1. Welcome ──
    {
      emoji: '👋', gradient: 'from-violet-600 to-purple-500',
      title: 'Bong NGL-এ স্বাগতম!',
      subtitle: '"Not Gonna Lie" — সত্য বলার game!',
      badge: '✦ by Bong Bari',
      lines: [
        '🎭 NGL মানে "Not Gonna Lie" — মিথ্যা বলবো না',
        '🌍 পৃথিবীতে viral হওয়া anonymous Q&A game',
        '💜 Bong Bari-র version — বাঙালিদের জন্য, বাঙালি style-এ',
        '⚡ কোনো app নেই, কোনো signup fee নেই — just open & play!',
      ],
      cta: 'কিভাবে কাজ করে? →',
    },
    // ── 2. How it works ──
    {
      emoji: '🔮', gradient: 'from-fuchsia-500 to-pink-500',
      title: 'The Mystery Game',
      subtitle: 'তোর বন্ধুরা সত্যিই কি ভাবে — জানার সময়!',
      lines: [
        '🔗 তোর নিজের secret link তৈরি হবে',
        '📤 বন্ধুদের share করো — WhatsApp, Instagram, যেকোনো জায়গায়',
        '💌 তারা তোকে anonymous message পাঠাবে',
        '🤫 কে পাঠিয়েছে — তুই কখনো জানবে না!',
        '🔓 কিন্তু AI hints দেবে — কে হতে পারে 👀',
      ],
      cta: 'শুরু কিভাবে? →',
    },
    // ── 3. Steps ──
    {
      emoji: '🚀', gradient: 'from-pink-500 to-rose-500',
      title: '3 Steps — ব্যস!',
      subtitle: 'শুরু করা এতটাই সহজ:',
      lines: [
        '1️⃣ Username বাছো → তোর unique link ready!',
        '2️⃣ Link copy করো → WhatsApp / Instagram story-তে share করো',
        '3️⃣ Inbox open করো → secret messages পড়ো 🎉',
      ],
      cta: 'কি কি খেলা আছে? →',
    },
    // ── 4. Game categories ──
    {
      emoji: '🎮', gradient: 'from-amber-500 to-orange-500',
      title: 'Q&A Games খেলো',
      subtitle: 'প্রতিটা game আলাদা vibe — বন্ধুদের challenge দাও!',
      lines: [
        '🤔 Ask Me Anything — যেকোনো কিছু জিজ্ঞেস করো',
        '🙈 Never Have I Ever — কে কি করেছে, সত্য বলো!',
        '💬 Confessions — গোপন কথা anonymous-এ বলো',
        '✨ Describe Me in 3 Words — তোকে ৩ শব্দে বর্ণনা করো',
        '🎲 Random AI Prompt — AI মজার প্রশ্ন তৈরি করবে!',
      ],
      cta: 'আরো features আছে! →',
    },
    // ── 5. Creative tools ──
    {
      emoji: '🎨', gradient: 'from-teal-500 to-cyan-500',
      title: 'তোর Page সাজাও',
      subtitle: 'শুধু Q&A না — তোর page তোর style!',
      lines: [
        '🎨 ৭টা premium থিম — Neon, Sunset, Ocean, Galaxy & more',
        '📸 Profile photo upload করো — বন্ধুরা চিনবে',
        '✏️ Custom prompt লেখো — তোর নিজের প্রশ্ন set করো',
        '🌐 বাংলা ↔ English — যেকোনো সময় switch করো',
      ],
      cta: 'sharing tools দেখাও →',
    },
    // ── 6. Sharing & engagement ──
    {
      emoji: '📤', gradient: 'from-indigo-500 to-violet-500',
      title: 'Share & Grow',
      subtitle: 'যত share — তত messages!',
      lines: [
        '📸 Story Card — সুন্দর card download করো, story-তে দাও',
        '📱 QR Code — scan করেই message পাঠানো যায়!',
        '😍 Emoji React — প্রতিটা message-এ react করো',
        '🔥 Daily Streak — কতদিন ধরে খেলছো track করো',
        '📋 One-tap Copy — link copy just one click!',
      ],
      cta: 'security কেমন? →',
    },
    // ── 7. Privacy & safety ──
    {
      emoji: '🛡️', gradient: 'from-emerald-500 to-green-500',
      title: 'Privacy & Safety',
      subtitle: 'তোর data, তোর control!',
      lines: [
        '🔒 কে message পাঠিয়েছে — কোথাও save হয় না',
        '🗑️ যেকোনো message delete করতে পারো',
        '🔑 6-digit PIN — তোর account safe',
        '💾 Messages permanent database-এ — কিছু হারাবে না',
        '🚫 কোনো ads নেই, কোনো tracking নেই!',
      ],
      cta: 'শেষ কথা →',
    },
    // ── 8. Why Bong NGL ──
    {
      emoji: '💎', gradient: 'from-sky-500 to-blue-500',
      title: '100% ফ্রি — চিরকাল!',
      subtitle: 'NGL app $9.99/week নেয়। আমরা নিই না কেন?',
      badge: '🔥 1 Million+ views',
      lines: [
        '💰 NGL Pro = $9.99/week শুধু hint দেখতে',
        '🆓 Bong NGL = সব feature, সব hint — ফ্রি!',
        '📱 কোনো app download লাগবে না — browser-এই চলবে',
        '🎬 Bong Bari-র video 2 দিনে 1 Million views cross করেছে!',
        '💜 বাঙালিদের জন্য বাঙালিদের তৈরি — with love!',
      ],
      cta: 'চলো শুরু করি! 🚀',
    },
  ] : [
    // ── 1. Welcome ──
    {
      emoji: '👋', gradient: 'from-violet-600 to-purple-500',
      title: 'Welcome to Bong NGL!',
      subtitle: '"Not Gonna Lie" — the truth-telling game!',
      badge: '✦ by Bong Bari',
      lines: [
        '🎭 NGL means "Not Gonna Lie" — an anonymous Q&A game',
        '🌍 The viral game that took over the internet',
        '💜 Bong Bari\'s version — made for desi vibes',
        '⚡ No app, no signup fee — just open & play!',
      ],
      cta: 'How does it work? →',
    },
    // ── 2. How it works ──
    {
      emoji: '🔮', gradient: 'from-fuchsia-500 to-pink-500',
      title: 'The Mystery Game',
      subtitle: 'Find out what your friends REALLY think!',
      lines: [
        '🔗 You get your own secret link',
        '📤 Share it with friends — WhatsApp, Instagram, anywhere',
        '💌 They send you anonymous messages',
        '🤫 You will NEVER know who sent them!',
        '🔓 But AI hints will help you guess 👀',
      ],
      cta: 'How do I start? →',
    },
    // ── 3. Steps ──
    {
      emoji: '🚀', gradient: 'from-pink-500 to-rose-500',
      title: '3 Easy Steps',
      subtitle: 'Getting started is super simple:',
      lines: [
        '1️⃣ Pick a username → your unique link is ready!',
        '2️⃣ Copy link → share on WhatsApp / Instagram story',
        '3️⃣ Open inbox → read your secret messages 🎉',
      ],
      cta: 'What games can I play? →',
    },
    // ── 4. Game categories ──
    {
      emoji: '🎮', gradient: 'from-amber-500 to-orange-500',
      title: 'Play Q&A Games',
      subtitle: 'Each game has a different vibe — challenge your friends!',
      lines: [
        '🤔 Ask Me Anything — go wild, no limits',
        '🙈 Never Have I Ever — spill the secrets!',
        '💬 Confessions — say it anonymously',
        '✨ Describe Me in 3 Words — what do they really think?',
        '🎲 Random AI Prompt — AI creates fun questions for you!',
      ],
      cta: 'More features! →',
    },
    // ── 5. Creative tools ──
    {
      emoji: '🎨', gradient: 'from-teal-500 to-cyan-500',
      title: 'Style Your Page',
      subtitle: "Not just Q&A — make your page look amazing!",
      lines: [
        '🎨 7 premium themes — Neon, Sunset, Ocean, Galaxy & more',
        '📸 Upload your profile photo — friends recognize you',
        '✏️ Custom prompts — write your own questions',
        '🌐 Bengali ↔ English — switch anytime',
      ],
      cta: 'Sharing tools →',
    },
    // ── 6. Sharing & engagement ──
    {
      emoji: '📤', gradient: 'from-indigo-500 to-violet-500',
      title: 'Share & Grow',
      subtitle: 'More shares = more messages!',
      lines: [
        '📸 Story Card — download a beautiful card for your story',
        '📱 QR Code — friends scan & send messages instantly!',
        '😍 Emoji React — react to every message you get',
        '🔥 Daily Streak — track how many days you\'ve played',
        '📋 One-tap Copy — copy your link in one click!',
      ],
      cta: 'Is it safe? →',
    },
    // ── 7. Privacy & safety ──
    {
      emoji: '🛡️', gradient: 'from-emerald-500 to-green-500',
      title: 'Privacy & Safety',
      subtitle: 'Your data, your control!',
      lines: [
        '🔒 Sender identity is NEVER saved — true anonymity',
        '🗑️ Delete any message anytime',
        '🔑 6-digit PIN keeps your account safe',
        '💾 Messages in real database — nothing gets lost',
        '🚫 No ads, no tracking, no creepy stuff!',
      ],
      cta: 'One last thing →',
    },
    // ── 8. Why Bong NGL ──
    {
      emoji: '💎', gradient: 'from-sky-500 to-blue-500',
      title: '100% Free — Forever!',
      subtitle: 'NGL app charges $9.99/week. We charge $0.',
      badge: '🔥 1 Million+ views',
      lines: [
        '💰 NGL Pro = $9.99/week just for hints',
        '🆓 Bong NGL = every feature, every hint — FREE!',
        '📱 No app download — works right in your browser',
        '🎬 Bong Bari\'s video hit 1 Million views in just 2 days!',
        '💜 Made with love — for the desi community!',
      ],
      cta: "Let's go! 🚀",
    },
  ];

  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => { setStep(0); setOpen(true); }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl bg-white/[0.06] backdrop-blur-md text-white font-bold text-lg shadow-2xl border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.12] transition-all active:scale-90"
        title={t('help.title')}
      >
        <span className="text-base">❓</span>
      </motion.button>

      {/* ─── Full-screen onboarding modal ─── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            onClick={handleClose}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-md max-h-[90dvh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{ background: '#0d0b1a', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Animated progress bar */}
              <div className="h-1 w-full bg-white/[0.06] flex-shrink-0">
                <motion.div
                  className={`h-full bg-gradient-to-r ${slide.gradient}`}
                  initial={false}
                  animate={{ width: `${((step + 1) / slides.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Top bar: step count + skip */}
              <div className="flex items-center justify-between px-5 pt-4 flex-shrink-0">
                <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
                  {step + 1} / {slides.length}
                </span>
                <button
                  onClick={handleClose}
                  className="text-white/30 text-xs font-bold hover:text-white transition-colors px-2 py-1"
                >SKIP</button>
              </div>

              {/* Slide content — animated swap */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-4 sm:px-6 pt-4 pb-5 flex-1 overflow-y-auto"
                >
                  {/* Emoji icon with ambient glow */}
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${slide.gradient} blur-xl opacity-40`} />
                    <div className={`relative w-16 h-16 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-3xl">{slide.emoji}</span>
                    </div>
                  </div>
                  {/* Badge (optional) */}
                  {slide.badge && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex justify-center mb-3"
                    >
                      <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-r ${slide.gradient} text-white/90 shadow-lg`}>
                        {slide.badge}
                      </span>
                    </motion.div>
                  )}
                  <h2 className="text-white font-black text-xl text-center tracking-tight mb-1.5">{slide.title}</h2>
                  <p className="text-white/40 text-sm text-center mb-5">{slide.subtitle}</p>
                  <div className="space-y-2">
                    {slide.lines.map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07 }}
                        className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                      >
                        <span className="text-white/60 text-[13px] leading-relaxed">{line}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation: dots + prev/next */}
              <div className="px-5 pb-5 pt-1 flex-shrink-0">
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? `w-6 bg-gradient-to-r ${slide.gradient}`
                          : i < step ? 'w-1.5 bg-white/30' : 'w-1.5 bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {step > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep(s => s - 1)}
                      className="flex-1 bg-white/[0.06] text-white/50 font-bold py-3.5 rounded-2xl text-sm border border-white/[0.06] hover:bg-white/[0.1] transition-all"
                    >←</motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => isLast ? handleClose() : setStep(s => s + 1)}
                    className={`flex-[3] bg-gradient-to-r ${slide.gradient} text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-lg transition-all`}
                  >
                    {slide.cta}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
