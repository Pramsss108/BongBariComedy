import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, X, MessageCircle, Users, Video, Phone, Info, Layers } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Footer from '@/components/footer';

/* ════════════════════════════════════════════════════════════════
   FAQ — Scrollable with Parallax (v3)
   • Normal page flow: navbar → hero → pills → parallax question list → CTA → footer
   • Internal scroll container for questions with per-card parallax
   • Compact accordion, Bengali support, glassmorphism search
   ════════════════════════════════════════════════════════════════ */

// ── Types ──
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  title: string;
  titleBn: string;
  icon: React.ReactNode;
}

// ── Data ──
const faqCategories: FAQCategory[] = [
  { id: 'about', title: 'About Bong Bari', titleBn: 'বং বাড়ি সম্পর্কে', icon: <Info className="w-4 h-4" /> },
  { id: 'content', title: 'Content & Videos', titleBn: 'কন্টেন্ট ও ভিডিও', icon: <Video className="w-4 h-4" /> },
  { id: 'collaboration', title: 'Collaboration', titleBn: 'সহযোগিতা', icon: <Users className="w-4 h-4" /> },
  { id: 'audience', title: 'For Our Audience', titleBn: 'দর্শকদের জন্য', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'contact', title: 'Contact & Support', titleBn: 'যোগাযোগ ও সহায়তা', icon: <Phone className="w-4 h-4" /> },
];

// ── Accent lookup ──
const catAccent: Record<string, { dot: string; ring: string; bg: string; bgSolid: string; text: string; border: string; glow: string }> = {
  about:         { dot: 'bg-orange-400',  ring: 'ring-orange-400/40',  bg: 'bg-orange-500/8',   bgSolid: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-400/20',  glow: 'shadow-orange-500/10' },
  content:       { dot: 'bg-blue-400',    ring: 'ring-blue-400/40',    bg: 'bg-blue-500/8',     bgSolid: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-400/20',    glow: 'shadow-blue-500/10' },
  collaboration: { dot: 'bg-emerald-400', ring: 'ring-emerald-400/40', bg: 'bg-emerald-500/8',  bgSolid: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-400/20', glow: 'shadow-emerald-500/10' },
  audience:      { dot: 'bg-violet-400',  ring: 'ring-violet-400/40',  bg: 'bg-violet-500/8',   bgSolid: 'bg-violet-500/15',  text: 'text-violet-400',  border: 'border-violet-400/20',  glow: 'shadow-violet-500/10' },
  contact:       { dot: 'bg-rose-400',    ring: 'ring-rose-400/40',    bg: 'bg-rose-500/8',     bgSolid: 'bg-rose-500/15',    text: 'text-rose-400',    border: 'border-rose-400/20',    glow: 'shadow-rose-500/10' },
};

const faqData: FAQItem[] = [
  // About Bong Bari Category
  {
    id: '1',
    category: 'about',
    question: 'What is Bong Bari Comedy?',
    answer: 'Bong Bari Comedy is a Bengali comedy channel dedicated to creating authentic, relatable, and hilarious content for Bengali audiences worldwide. We specialize in sketch comedy, parodies, and entertaining videos that celebrate Bengali culture and humor.'
  },
  {
    id: '2',
    category: 'about',
    question: 'Who is behind Bong Bari Comedy?',
    answer: 'Bong Bari Comedy is created by passionate Bengali content creators who understand the nuances of Bengali humor and culture. Our team consists of writers, actors, and video producers committed to delivering quality entertainment.'
  },
  {
    id: '3',
    category: 'about',
    question: 'What makes Bong Bari Comedy unique?',
    answer: 'We focus on authentic Bengali humor that resonates with both traditional and modern audiences. Our content bridges generational gaps while maintaining cultural authenticity, making us relatable to Bengalis across the globe.'
  },
  {
    id: '4',
    category: 'about',
    question: 'When did Bong Bari Comedy start?',
    answer: 'Bong Bari Comedy began its journey to bring quality Bengali comedy content to digital platforms. We have been consistently creating and sharing content that entertains and connects with our Bengali audience community.'
  },

  // Content & Videos Category
  {
    id: '5',
    category: 'content',
    question: 'What type of content do you create?',
    answer: 'We create sketch comedy videos, parodies, cultural commentary, festival specials, family-friendly humor, and relatable everyday situations that Bengali audiences can connect with. Our content ranges from traditional Bengali scenarios to modern-day situations.'
  },
  {
    id: '6',
    category: 'content',
    question: 'How often do you upload new videos?',
    answer: 'We strive to upload fresh content regularly to keep our audience entertained. Follow our YouTube channel and social media pages for the latest updates on new video releases and behind-the-scenes content.'
  },
  {
    id: '7',
    category: 'content',
    question: 'Can I suggest video ideas or topics?',
    answer: 'Absolutely! We love hearing from our audience. You can suggest video ideas through our social media channels, YouTube comments, or contact form. We value community input and often incorporate viewer suggestions into our content.'
  },
  {
    id: '8',
    category: 'content',
    question: 'Do you create content in English too?',
    answer: 'While our primary focus is Bengali content, we occasionally create bilingual content or add subtitles to reach a broader audience. Our main strength lies in authentic Bengali humor and cultural references.'
  },
  {
    id: '9',
    category: 'content',
    question: 'Are your videos family-friendly?',
    answer: 'Yes! We prioritize creating clean, family-friendly content that can be enjoyed by viewers of all ages. Our humor is wholesome and suitable for family viewing while maintaining its entertainment value.'
  },

  // Collaboration Category
  {
    id: '10',
    category: 'collaboration',
    question: 'Do you accept brand partnerships and sponsorships?',
    answer: 'Yes, we are open to brand collaborations that align with our content style and audience interests. We work with brands that resonate with Bengali culture and our community values. Contact us through our business inquiry channels for partnership opportunities.'
  },
  {
    id: '11',
    category: 'collaboration',
    question: 'How can I collaborate with Bong Bari Comedy?',
    answer: 'We welcome collaborations with other content creators, artists, musicians, and creative individuals. Whether you\'re interested in guest appearances, cross-promotions, or joint projects, reach out to us through our collaboration contact form or business email.'
  },
  {
    id: '12',
    category: 'collaboration',
    question: 'Do you work with upcoming artists and creators?',
    answer: 'Absolutely! We believe in supporting emerging talent in the Bengali creative community. If you\'re an upcoming artist, comedian, or content creator, we\'d love to explore collaboration opportunities that benefit both parties.'
  },
  {
    id: '13',
    category: 'collaboration',
    question: 'What are your collaboration rates and terms?',
    answer: 'Our collaboration terms vary based on the project scope, deliverables, and partnership type. We offer flexible arrangements including revenue sharing, fixed fees, or cross-promotional agreements. Contact us with your specific requirements for detailed discussions.'
  },

  // Audience Category
  {
    id: '14',
    category: 'audience',
    question: 'Who is your target audience?',
    answer: 'Our content is designed for Bengali speakers and Bengali culture enthusiasts worldwide. We cater to a diverse age group, from teenagers to adults, who appreciate authentic Bengali humor and cultural content.'
  },
  {
    id: '15',
    category: 'audience',
    question: 'How can I stay updated with your latest content?',
    answer: 'Subscribe to our YouTube channel, follow us on social media platforms (Facebook, Instagram, Twitter), and visit our website regularly. You can also enable notifications to get alerts for new video uploads and announcements.'
  },
  {
    id: '16',
    category: 'audience',
    question: 'Do you interact with your audience?',
    answer: 'Yes! We actively engage with our community through comments, social media interactions, live sessions, and community posts. We value our audience feedback and try to respond to comments and messages regularly.'
  },
  {
    id: '17',
    category: 'audience',
    question: 'Can I share your videos on social media?',
    answer: 'Absolutely! We encourage sharing our content on social media platforms. Please make sure to credit Bong Bari Comedy and include links to our original videos. Sharing helps us reach more Bengali comedy enthusiasts!'
  },

  // Contact & Support Category
  {
    id: '18',
    category: 'contact',
    question: 'How can I contact Bong Bari Comedy for business inquiries?',
    answer: 'For business inquiries, sponsorships, collaborations, or media requests, please use our dedicated business contact form on the "Work with Us" page or email us through our official business channels. We typically respond within 2-3 business days.'
  },
  {
    id: '19',
    category: 'contact',
    question: 'Do you respond to fan messages and emails?',
    answer: 'We appreciate all fan messages and try our best to respond when possible. While we may not be able to reply to every message individually due to volume, we read and value all feedback from our community.'
  },
  {
    id: '20',
    category: 'contact',
    question: 'Where can I find your latest updates and announcements?',
    answer: 'Follow our official social media accounts and website for the latest updates, announcements, behind-the-scenes content, and upcoming project news. We regularly post updates about new videos, collaborations, and community events.'
  },
  {
    id: '21',
    category: 'contact',
    question: 'How can I report technical issues with your website or videos?',
    answer: 'If you encounter any technical issues with our website, video playback, or other technical problems, please contact us through our support channels with details about the issue, your device/browser information, and screenshots if applicable.'
  }
];

// Bengali translations — Kolkata style (formal আপনি/তুমি)
const faqBn: Record<string, { q: string; a: string }> = {
  '1': { q: 'বং বাড়ি কমেডি কী?', a: 'বং বাড়ি কমেডি হলো একটি বাংলা কমেডি চ্যানেল যেটি সারা বিশ্বের বাঙালি দর্শকদের জন্য আসল, মজার কন্টেন্ট তৈরি করে। আমরা স্কেচ কমেডি, প্যারোডি এবং বিনোদনমূলক ভিডিও তৈরি করি যা বাংলা সংস্কৃতি ও হাস্যরসকে তুলে ধরে।' },
  '2': { q: 'বং বাড়ি কমেডির পেছনে কারা আছেন?', a: 'বং বাড়ি কমেডি তৈরি করেন কিছু আবেগী বাঙালি কন্টেন্ট ক্রিয়েটর যাঁরা বাংলা হাস্যরস ও সংস্কৃতির সূক্ষ্মতা ভালো করে বোঝেন। আমাদের টিমে আছেন লেখক, অভিনেতা এবং ভিডিও প্রোডিউসার।' },
  '3': { q: 'বং বাড়ি কমেডি কেন আলাদা?', a: 'আমরা আসল বাংলা হাস্যরসে মনোযোগ দিই যা পুরোনো ও নতুন দুই প্রজন্মের দর্শকদের কাছে পৌঁছায়। আমাদের কন্টেন্ট প্রজন্মের ব্যবধান কমায় এবং সাংস্কৃতিক সত্যতা বজায় রাখে।' },
  '4': { q: 'বং বাড়ি কমেডি কবে শুরু হয়েছিল?', a: 'বং বাড়ি কমেডি ডিজিটাল প্ল্যাটফর্মে মানসম্পন্ন বাংলা কমেডি কন্টেন্ট আনার উদ্দেশ্যে যাত্রা শুরু করেছিল। আমরা ধারাবাহিকভাবে এমন কন্টেন্ট তৈরি করে চলেছি যা আমাদের বাঙালি দর্শকদের আনন্দ দেয়।' },
  '5': { q: 'আপনারা কী ধরনের কন্টেন্ট তৈরি করেন?', a: 'আমরা স্কেচ কমেডি, প্যারোডি, সাংস্কৃতিক ভাষ্য, উৎসব স্পেশাল, পরিবার-বান্ধব হাস্যরস এবং দৈনন্দিন জীবনের মজার পরিস্থিতি নিয়ে ভিডিও তৈরি করি।' },
  '6': { q: 'নতুন ভিডিও কত ঘন ঘন আপলোড হয়?', a: 'আমরা নিয়মিতভাবে নতুন কন্টেন্ট আপলোড করার চেষ্টা করি। সর্বশেষ আপডেটের জন্য আমাদের ইউটিউব চ্যানেল ও সোশ্যাল মিডিয়া ফলো করুন।' },
  '7': { q: 'আমি কি ভিডিওর আইডিয়া দিতে পারি?', a: 'অবশ্যই! আমরা দর্শকদের মতামত শুনতে ভালোবাসি। আপনি সোশ্যাল মিডিয়া, ইউটিউব কমেন্ট বা কন্টাক্ট ফর্মের মাধ্যমে ভিডিওর আইডিয়া পাঠাতে পারেন।' },
  '8': { q: 'আপনারা কি ইংরেজিতেও কন্টেন্ট তৈরি করেন?', a: 'আমাদের মূল ফোকাস বাংলা কন্টেন্ট, তবে মাঝে মাঝে দ্বিভাষিক কন্টেন্ট তৈরি করি বা সাবটাইটেল যোগ করি। আমাদের আসল শক্তি হলো খাঁটি বাংলা হাস্যরস।' },
  '9': { q: 'আপনাদের ভিডিও কি পরিবারের সবার জন্য উপযুক্ত?', a: 'হ্যাঁ! আমরা পরিবার-বান্ধব কন্টেন্ট তৈরি করি যা সব বয়সের দর্শক উপভোগ করতে পারেন। আমাদের হাস্যরস স্বাস্থ্যকর ও সবার জন্য মানানসই।' },
  '10': { q: 'আপনারা কি ব্র্যান্ড পার্টনারশিপ নেন?', a: 'হ্যাঁ, আমরা এমন ব্র্যান্ডের সাথে কাজ করতে আগ্রহী যারা আমাদের কন্টেন্ট ও দর্শকদের পছন্দের সাথে মানানসই। পার্টনারশিপের জন্য আমাদের বিজনেস চ্যানেলে যোগাযোগ করুন।' },
  '11': { q: 'বং বাড়ি কমেডির সাথে কোলাবোরেশন কীভাবে করবো?', a: 'আমরা অন্যান্য কন্টেন্ট ক্রিয়েটর, শিল্পী ও সৃজনশীল মানুষদের সাথে কোলাবোরেশন স্বাগত জানাই। আমাদের কোলাবোরেশন ফর্ম বা বিজনেস ইমেইলে যোগাযোগ করুন।' },
  '12': { q: 'আপনারা কি নতুন শিল্পীদের সাথে কাজ করেন?', a: 'অবশ্যই! আমরা বাংলা সৃজনশীল সম্প্রদায়ের উদীয়মান প্রতিভাদের সাপোর্ট করতে চাই। আপনি নতুন শিল্পী বা ক্রিয়েটর হলে আমাদের সাথে যোগাযোগ করুন।' },
  '13': { q: 'কোলাবোরেশনের শর্ত ও খরচ কেমন?', a: 'শর্তাবলী প্রজেক্টের ধরন ও পার্টনারশিপের ওপর নির্ভর করে। আমরা রেভিনিউ শেয়ারিং, ফিক্সড ফি বা ক্রস প্রোমোশন — বিভিন্ন ব্যবস্থা অফার করি। বিস্তারিত জানতে যোগাযোগ করুন।' },
  '14': { q: 'আপনাদের টার্গেট দর্শক কারা?', a: 'আমাদের কন্টেন্ট সারা বিশ্বের বাংলাভাষী ও বাংলা সংস্কৃতিপ্রেমীদের জন্য। টিনএজার থেকে প্রাপ্তবয়স্ক — সব বয়সের মানুষ আমাদের কন্টেন্ট উপভোগ করেন।' },
  '15': { q: 'নতুন কন্টেন্টের আপডেট কীভাবে পাবো?', a: 'আমাদের ইউটিউব চ্যানেল সাবস্ক্রাইব করুন, সোশ্যাল মিডিয়ায় ফলো করুন এবং নিয়মিত ওয়েবসাইট দেখুন। নোটিফিকেশন চালু রাখলে নতুন ভিডিওর খবর সাথে সাথে পাবেন।' },
  '16': { q: 'আপনারা কি দর্শকদের সাথে যোগাযোগ রাখেন?', a: 'হ্যাঁ! আমরা কমেন্ট, সোশ্যাল মিডিয়া, লাইভ সেশন ও কমিউনিটি পোস্টের মাধ্যমে দর্শকদের সাথে সক্রিয়ভাবে যুক্ত থাকি।' },
  '17': { q: 'আমি কি আপনাদের ভিডিও শেয়ার করতে পারি?', a: 'অবশ্যই! সোশ্যাল মিডিয়ায় শেয়ার করতে আমরা উৎসাহিত করি। শুধু বং বাড়ি কমেডির ক্রেডিট দিন এবং মূল ভিডিওর লিংক দিন।' },
  '18': { q: 'ব্যবসায়িক বিষয়ে কীভাবে যোগাযোগ করবো?', a: 'ব্যবসায়িক প্রশ্ন, স্পন্সরশিপ বা মিডিয়া রিকোয়েস্টের জন্য "Work with Us" পেজের ফর্ম ব্যবহার করুন বা অফিসিয়াল ইমেইলে লিখুন। আমরা সাধারণত ২-৩ কার্যদিবসের মধ্যে উত্তর দিই।' },
  '19': { q: 'আপনারা কি ফ্যান মেসেজের উত্তর দেন?', a: 'আমরা সব ফ্যান মেসেজ পড়ি এবং যতটা সম্ভব উত্তর দেওয়ার চেষ্টা করি। বেশি মেসেজের কারণে সবাইকে উত্তর দেওয়া সম্ভব না হলেও প্রতিটি মতামত আমরা পড়ি।' },
  '20': { q: 'সর্বশেষ আপডেট কোথায় পাবো?', a: 'আমাদের অফিসিয়াল সোশ্যাল মিডিয়া ও ওয়েবসাইটে সর্বশেষ আপডেট, নেপথ্যের গল্প ও আসন্ন প্রজেক্টের খবর পাবেন।' },
  '21': { q: 'ওয়েবসাইটে সমস্যা হলে কীভাবে জানাবো?', a: 'ওয়েবসাইট বা ভিডিও সংক্রান্ত কোনো সমস্যা হলে আমাদের সাপোর্ট চ্যানেলে যোগাযোগ করুন। সমস্যার বিবরণ ও স্ক্রিনশট দিলে দ্রুত সমাধান করতে পারবো।' },
};

// ── Component ──
export default function FAQ() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Parallax scroll for background elements
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3]);

  // Language
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en';
  });
  useEffect(() => { localStorage.setItem('bbc.lang', lang); }, [lang]);
  useEffect(() => {
    const sync = () => setLang((localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en');
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // ── Filtering ──
  const filteredFAQs = faqData.filter(item => {
    const bn = faqBn[item.id];
    const matchesSearch = !searchTerm || item.question.toLowerCase().includes(searchTerm.toLowerCase()) || item.answer.toLowerCase().includes(searchTerm.toLowerCase()) || (bn && (bn.q.includes(searchTerm) || bn.a.includes(searchTerm)));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset on filter change
  useEffect(() => {
    setActiveId(null);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCategory, searchTerm]);

  // Handlers
  const handleChatWithBot = () => {
    window.dispatchEvent(new CustomEvent('openChatbot', { detail: { message: 'Hi! I have a question from the FAQ page.' } }));
  };
  const handleContactSupport = () => navigate('/work-with-us');
  const clearSearch = () => { setSearchTerm(''); searchRef.current?.focus(); };

  const toggleQuestion = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id);
  }, []);

  // Keyboard: / to search, Esc to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (searchTerm) setSearchTerm('');
        else if (activeId) setActiveId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchTerm, activeId]);

  // Translations
  const tx = lang === 'en' ? {
    title: 'Frequently Asked Questions',
    subtitle: 'Find answers to everything about Bong Bari Comedy',
    searchPlaceholder: 'Search questions...',
    allCats: 'All',
    noResults: 'No questions found',
    noResultsSub: 'Try a different search or category',
    clearSearch: 'Clear search',
    chatBot: 'Chat with AI',
    contactUs: 'Contact Support',
    still: 'Still have questions?',
    stillSub: "Can't find what you're looking for? We're here to help!",
    results: 'results',
  } : {
    title: 'প্রশ্নোত্তর',
    subtitle: 'বং বাড়ি কমেডি সম্পর্কে সব উত্তর এখানে',
    searchPlaceholder: 'প্রশ্ন অনুসন্ধান করুন...',
    allCats: 'সব',
    noResults: 'কোনো প্রশ্ন পাওয়া যায়নি',
    noResultsSub: 'অন্য অনুসন্ধান বা ক্যাটাগরি ব্যবহার করুন',
    clearSearch: 'অনুসন্ধান মুছুন',
    chatBot: 'AI বট',
    contactUs: 'যোগাযোগ',
    still: 'আরো প্রশ্ন আছে?',
    stillSub: 'যা খুঁজছেন পাচ্ছেন না? আমরা সাহায্য করতে প্রস্তুত!',
    results: 'টি ফলাফল',
  };

  return (
    <div className="bg-transparent text-white">

      {/* Premium Language Toggle — fixed floating pill (matches homepage) */}
      <div className="fixed top-4 right-4 z-[100]">
        <div className="lang-toggle-pill relative flex items-center bg-black/70 backdrop-blur-xl border border-white/[0.08] rounded-full p-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div
            className="lang-toggle-indicator absolute top-[3px] h-[calc(100%-6px)] w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-brand-yellow/15 to-amber-500/15 border border-brand-yellow/25 transition-all duration-300"
            style={{ left: lang === 'en' ? '3px' : 'calc(50% - 1px)' }}
          />
          <button onClick={() => setLang('en')} className={`relative z-10 px-3 py-1.5 text-[11px] font-bold rounded-full transition-colors duration-200 ${lang === 'en' ? 'text-brand-yellow' : 'text-white/35 hover:text-white/55'}`}>EN</button>
          <button onClick={() => setLang('bn')} className={`relative z-10 px-3 py-1.5 text-[11px] font-bold rounded-full font-bengali transition-colors duration-200 ${lang === 'bn' ? 'text-brand-yellow' : 'text-white/35 hover:text-white/55'}`}>বাং</button>
        </div>
      </div>

      {/* ═══════ FIRST FOLD — fits exactly one viewport ═══════ */}
      <div ref={sectionRef} className="h-[100dvh] flex flex-col relative">
        {/* Parallax ambient blobs */}
        <motion.div style={{ y: bgY, opacity: bgOpacity }} className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] bg-brand-yellow/[0.06] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[45%] h-[50%] bg-indigo-500/[0.05] rounded-full blur-[140px]" />
        </motion.div>

        {/* ── Header: compact title row + search + pills ── */}
        <div className="relative z-10 flex-shrink-0 pt-[72px] sm:pt-[84px] px-5 sm:px-8 max-w-5xl mx-auto w-full">

          {/* 1️⃣ Title + Search in one premium row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3 mb-2"
          >
            {/* Left: title block — premium */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-[3px] h-7 rounded-full bg-gradient-to-b from-brand-yellow via-amber-400 to-amber-600/50 shadow-[0_0_8px_rgba(244,196,48,0.3)]" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-extrabold tracking-tight leading-none">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-brand-yellow to-amber-300">{tx.title}</span>
                  </h1>
                  <p className={`text-[11px] sm:text-xs mt-1 ${lang === 'bn' ? 'font-bengali bengali-subtitle-glow' : 'text-gray-500'}`}>
                    {tx.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: search bar */}
            <div className="relative w-full sm:w-72 lg:w-80 flex-shrink-0">
              <div className="relative group">
                {/* 2️⃣ Premium glow ring on focus */}
                <div className="absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 bg-gradient-to-r from-brand-yellow/20 via-brand-yellow/5 to-brand-yellow/20 blur-[2px] transition-opacity duration-500" />
                <div className="relative rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] group-focus-within:border-brand-yellow/25 transition-all duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-gray-600 group-focus-within:text-brand-yellow/60 transition-colors" />
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder={tx.searchPlaceholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 rounded-xl bg-transparent text-white text-[13px] focus:outline-none placeholder:text-gray-600"
                  />
                  {searchTerm && (
                    <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {searchTerm && (
                <span className="absolute -bottom-4 right-1 text-[10px] text-gray-600 tabular-nums">
                  {filteredFAQs.length} {tx.results}
                </span>
              )}
            </div>
          </motion.div>

          {/* 3️⃣ Category pills with subtle divider line above */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-3" />
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`faq-pill ${selectedCategory === 'all' ? 'faq-pill--active-gold' : ''}`}
            >
              <Layers className="w-3 h-3" />
              <span>{tx.allCats}</span>
              <span className="faq-pill-count">{faqData.length}</span>
            </button>
            {faqCategories.map(cat => {
              const count = faqData.filter(f => f.category === cat.id).length;
              const isActive = selectedCategory === cat.id;
              const a = catAccent[cat.id];
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`faq-pill ${isActive ? `${a.bg} ${a.text} ${a.border} border` : ''}`}
                >
                  {cat.icon}
                  <span className="whitespace-nowrap">{lang === 'bn' ? cat.titleBn : cat.title}</span>
                  <span className="faq-pill-count">{count}</span>
                </button>
              );
            })}
            </div>
          </motion.div>
        </div>

        {/* ── Question list fills remaining viewport ── */}
        <div className="relative z-10 flex-1 min-h-0 max-w-5xl mx-auto w-full px-5 sm:px-8 pt-3 pb-4">
          {/* 4️⃣ Premium container with inner glow */}
          <div className="h-full rounded-2xl bg-white/[0.015] border border-white/[0.06] backdrop-blur-sm overflow-hidden faq-parallax-container relative">
            {/* 5️⃣ Top fade gradient for scroll depth illusion */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-t-2xl" />
            {/* 6️⃣ Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10 pointer-events-none rounded-b-2xl" />
            <div
              ref={scrollContainerRef}
              className="h-full overflow-y-auto overscroll-contain faq-scroll-zone pt-4 pb-6"
              onWheel={e => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory + searchTerm}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="p-3 sm:p-4"
                >
                  {filteredFAQs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-3">
                        <span className="text-2xl">🤔</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{tx.noResults}</h3>
                      <p className="text-xs text-gray-500 mb-3">{tx.noResultsSub}</p>
                      {searchTerm && (
                        <button onClick={clearSearch} className="text-xs text-brand-yellow border border-brand-yellow/15 px-4 py-1.5 rounded-full hover:bg-brand-yellow/10 transition-colors">
                          {tx.clearSearch}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredFAQs.map((item, idx) => (
                        <FAQCard
                          key={item.id}
                          item={item}
                          isOpen={activeId === item.id}
                          onToggle={toggleQuestion}
                          index={idx}
                          accent={catAccent[item.category] || catAccent.about}
                          category={faqCategories.find(c => c.id === item.category)}
                          lang={lang}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ BELOW THE FOLD — CTA + Footer (scroll to see) ═══════ */}
      <section className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/[0.06] via-transparent to-indigo-500/[0.04]" />
          <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-6 sm:px-10 py-10 sm:py-12 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{tx.still}</h2>
            <p className={`text-sm max-w-md mx-auto mb-6 ${lang === 'bn' ? 'font-bengali text-gray-400' : 'text-gray-400'}`}>
              {tx.stillSub}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleChatWithBot}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 hover:bg-brand-yellow/20 transition-all active:scale-[0.97]"
              >
                <MessageCircle className="w-4 h-4" />
                {tx.chatBot}
              </button>
              <button
                onClick={handleContactSupport}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] text-gray-300 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white transition-all active:scale-[0.97]"
              >
                <Phone className="w-4 h-4" />
                {tx.contactUs}
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

/* ═══════ FAQ Question Card with Parallax ═══════ */
function FAQCard({ item, isOpen, onToggle, index, accent, category, lang }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: (id: string) => void;
  index: number;
  accent: typeof catAccent['about'];
  category?: FAQCategory;
  lang: 'en' | 'bn';
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }}
      className="faq-card-wrapper"
    >
      <div className={`faq-card group relative ${isOpen ? `faq-card--open ${accent.border}` : ''}`}>
        {/* Accent bar (left edge glow on open) */}
        <div className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-all duration-300 ${isOpen ? `${accent.dot} opacity-100` : 'opacity-0'}`} />

        <button
          onClick={() => onToggle(item.id)}
          className="w-full text-left flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4"
        >
          {/* Category dot */}
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${accent.dot} ${isOpen ? 'scale-150 opacity-100' : 'opacity-30 group-hover:opacity-50'}`} />

          {/* Category label (desktop) — abbreviated */}
          <span className={`hidden sm:inline text-[9px] font-bold uppercase tracking-widest flex-shrink-0 w-[4.5rem] truncate transition-colors duration-200 ${isOpen ? accent.text : 'text-gray-600 group-hover:text-gray-500'}`}>
            {category ? (lang === 'bn' ? category.titleBn.split(' ')[0] : category.id.toUpperCase()) : ''}
          </span>

          {/* Question */}
          <span className={`flex-1 text-[13px] sm:text-[13.5px] font-medium leading-snug transition-colors duration-200 ${isOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} ${lang === 'bn' ? 'font-bengali' : ''}`}>
            {lang === 'bn' && faqBn[item.id] ? faqBn[item.id].q : item.question}
          </span>

          {/* Chevron */}
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0"
          >
            <ChevronDown className={`w-4 h-4 transition-colors duration-200 ${isOpen ? 'text-brand-yellow' : 'text-gray-700 group-hover:text-gray-500'}`} />
          </motion.span>
        </button>

        {/* Answer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pl-8 sm:pl-[5rem]">
                <div className={`pl-4 border-l-2 ${accent.border} py-1`}>
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-[13px] text-gray-400 leading-[1.85] ${lang === 'bn' ? 'font-bengali' : ''}`}
                  >
                    {lang === 'bn' && faqBn[item.id] ? faqBn[item.id].a : item.answer}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}