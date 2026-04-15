import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/magnetic-button";
import { FuturisticButton } from "@/components/futuristic-button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import InstagramReel from "@/components/instagram-reel";
import MobileNavBar from "@/components/mobile-navbar";
import SEOHead from "@/components/seo-head";
import Footer from "@/components/footer";
// Removed PromoMarquee (promo API disabled)
// Parallax removed for performance
import { Instagram, Send, Home as HomeIcon, Users, TrendingUp, Smile, Edit3, Play, Heart, Video, Eye, Handshake, Award, Flame } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertCollaborationRequestSchema, type CollaborationRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { buildApiUrl } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface InstagramReelData {
  reelId: string;
  caption: string;
  thumbnail: string;
  permalink: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  videoUrl: string;
}

/** Phase 19: Magnetic cursor-following tilt card — desktop only */
function TiltCard({ children, variants, tiltEnabled, ...props }: {
  children: React.ReactNode;
  variants: any;
  tiltEnabled: boolean;
  [key: string]: any;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  return (
    <motion.div
      ref={ref}
      variants={variants}
      style={tiltEnabled ? { perspective: 800, rotateX: springX, rotateY: springY } : undefined}
      onMouseMove={tiltEnabled ? (e: React.MouseEvent) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const cx = (e.clientX - rect.left) / rect.width - 0.5;
        const cy = (e.clientY - rect.top) / rect.height - 0.5;
        rotateX.set(cy * -8);
        rotateY.set(cx * 8);
      } : undefined}
      onMouseLeave={tiltEnabled ? () => { rotateX.set(0); rotateY.set(0); } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** v4: Scroll-linked blur-to-sharp section title — like footer's BrandReveal */
function SectionRevealTitle({ title, subtitle, accentColor = 'brand-yellow', badge, badgeIcon: BadgeIcon, children }: {
  title: React.ReactNode;
  subtitle?: string;
  accentColor?: string;
  badge?: string;
  badgeIcon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const textOpacity = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.7, 0.85], [0, 0.5, 1, 1, 0.8]);
  // Skip blur on mobile for perf — only opacity transition
  const blurVal = useTransform(scrollYProgress, [0, 0.15, 0.3], isMobile ? [0, 0, 0] : [6, 2, 0]);
  const filterStr = useTransform(blurVal, (v) => v > 0 ? `blur(${v}px)` : 'none');
  const subOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.85], [0, 1, 1, 0.6]);

  return (
    <div ref={ref} className="relative mb-3 sm:mb-8">
      {badge && (
        <motion.div
          className="flex justify-center mb-2 sm:mb-3"
          style={{ opacity: subOpacity }}
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
            {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
            {badge}
          </span>
        </motion.div>
      )}
      <motion.div
        className="text-center"
        style={{ opacity: textOpacity, filter: filterStr }}
      >
        {title}
      </motion.div>
      {subtitle && (
        <motion.p
          className={`text-center text-xs sm:text-sm sm:text-base mt-1 sm:mt-2 ${/[\u0980-\u09FF]/.test(subtitle) ? 'font-bengali bengali-subtitle-glow' : 'text-gray-400 tracking-wide'}`}
          style={{ opacity: subOpacity }}
        >
          {subtitle}
        </motion.p>
      )}
      {children}
    </div>
  );
}

const Home = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { playFunnySubmissionSound } = useFunnySubmissionSound({ enabled: true, volume: 0.25 });
  const [typewriterText, setTypewriterText] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [heroPaused, setHeroPaused] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroBuffering, setHeroBuffering] = useState(true);

  // Instagram profile link
  const igProfileUrl = 'https://instagram.com/thebongbari';

  // --- Phase B: Device tier + Hero scroll-linked cinematic ---
  const device = useDeviceTier();

  // --- Language toggle (EN / BN) ---
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en';
  });
  useEffect(() => { localStorage.setItem('bbc.lang', lang); }, [lang]);

  // Sync language when changed from mobile dock menu
  useEffect(() => {
    const handleLangChange = () => {
      const stored = localStorage.getItem('bbc.lang') as 'en' | 'bn';
      if (stored && stored !== lang) setLang(stored);
    };
    window.addEventListener('lang-change', handleLangChange);
    return () => window.removeEventListener('lang-change', handleLangChange);
  }, [lang]);

  const tx = lang === 'en' ? {
    heroSubtitle: 'Funny stories from a Bengali household',
    bridgeLabel: 'Discover Our World',
    bridgeTitlePrefix: 'Welcome to',
    bridgeTitleAccent: 'Our World',
    latestBadge: 'New This Week',
    latestTitlePrefix: 'Latest',
    latestTitleAccent: 'Comedy',
    latestSubtitle: 'Latest Comedy Collection',
    lovedBadge: 'Fan Favorites',
    lovedTitlePrefix: 'Most',
    lovedTitleAccent: 'Loved',
    lovedSubtitle: "Viewers' Favorites",
    workBadge: 'Collaborate',
    workTitlePrefix: "Let's Create",
    workTitleAccent: 'Together',
    workSubtitle: 'Work with Us',
    workDescription: "Partner with Bengal's leading comedy brand. Brands, creators, and agencies welcome.",
    formName: 'Name',
    formPhone: 'Phone',
    formCompany: 'Company / Brand',
    formMessage: 'Message',
    formSubmit: 'Send Message',
    formFill: 'Fill Name, Company & Contact Info *',
    viewAll: 'View All on Instagram',
    trustVideos: '145+ Reels',
    trustViews: '1M+ Views',
    trustCreator: 'Top Creator',
  } : {
    heroSubtitle: 'ঘরোয়া পরিবেশের মজার গল্প',
    bridgeLabel: 'আমাদের জগৎ আবিষ্কার করুন',
    bridgeTitlePrefix: 'আমাদের',
    bridgeTitleAccent: 'জগতে স্বাগতম',
    latestBadge: 'এই সপ্তাহে নতুন',
    latestTitlePrefix: 'সর্বশেষ',
    latestTitleAccent: 'কমেডি',
    latestSubtitle: 'সর্বশেষ কমেডি কালেকশন',
    lovedBadge: 'ভক্তদের পছন্দ',
    lovedTitlePrefix: 'সবচেয়ে',
    lovedTitleAccent: 'প্রিয়',
    lovedSubtitle: 'দর্শকদের পছন্দের তালিকা',
    workBadge: 'সহযোগিতা',
    workTitlePrefix: 'একসাথে',
    workTitleAccent: 'তৈরি করি',
    workSubtitle: 'আমাদের সাথে কাজ করুন',
    workDescription: 'বাংলার শীর্ষ কমেডি ব্র্যান্ডের সাথে পার্টনার করুন। ব্র্যান্ড, ক্রিয়েটর এবং এজেন্সি সবাই স্বাগত।',
    formName: 'নাম',
    formPhone: 'ফোন',
    formCompany: 'কোম্পানি / ব্র্যান্ড',
    formMessage: 'বার্তা',
    formSubmit: 'বার্তা পাঠান',
    formFill: 'নাম, কোম্পানি ও যোগাযোগ তথ্য দিন *',
    viewAll: 'ইনস্টাগ্রামে সব দেখুন',
    trustVideos: '১৪৫+ রিলস',
    trustViews: '১০ লক্ষ+ ভিউ',
    trustCreator: 'শীর্ষ ক্রিয়েটর',
  };

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'], // 0 when hero top hits viewport top, 1 when hero bottom hits viewport top
  });

  // Phase 6: Video scale-down (desktop: scale 1→0.92, tablet: 1→0.95, mobile: opacity-only)
  const heroVideoScale = useTransform(
    heroProgress,
    [0, 1],
    device.isMobile ? [1, 1] : device.isTablet ? [1, 0.95] : [1, 0.92]
  );
  const heroVideoOpacity = useTransform(heroProgress, [0, 0.8], [1, 0.6]);

  // Phase 8: CTA fade-out on scroll (buttons sink below fold)
  const heroCTAOpacity = useTransform(heroProgress, [0, 0.5], [1, 0]);
  const heroCTAY = useTransform(
    heroProgress,
    [0, 0.5],
    device.isMobile ? [0, 10] : [0, 30]
  );

  // Phase 10: Blur transition zone opacity (desktop only)
  const blurZoneOpacity = useTransform(heroProgress, [0.6, 0.85, 1], [0, 1, 0]);

  // --- Phase D: Depth & Parallax ---

  // Phase 7: Hero title parallax split (words separate on scroll)
  const titleAuthenticY = useTransform(heroProgress, [0, 1], device.isMobile ? [0, 0] : device.isTablet ? [0, 8] : [0, 15]);
  const titleComedyY = useTransform(heroProgress, [0, 1], device.isMobile ? [0, 0] : device.isTablet ? [0, -8] : [0, -15]);

  // Phase 26: Radial glow pulse (Work with Us section)
  const workRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: workProgress } = useScroll({ target: workRef, offset: ['start end', 'end start'] });
  const radialGlowOpacity = useTransform(
    workProgress,
    [0, 0.3, 0.5, 0.7, 1],
    device.isMobile ? [0.3, 0.3, 0.3, 0.3, 0.3] : device.isTablet ? [0.2, 0.25, 0.28, 0.25, 0.2] : [0.2, 0.3, 0.35, 0.3, 0.2]
  );



  const { data: latestReels, isLoading: isLoadingLatest } = useQuery<InstagramReelData[]>({
    queryKey: ['/api/instagram/latest'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: popularReels, isLoading: isLoadingPopular } = useQuery<InstagramReelData[]>({
    queryKey: ['/api/instagram/popular'],
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes (popular changes less frequently)
  });

  /* --- FALLBACK DATA & VAR MAPPING --- */
  /* --- FALLBACK DATA & VAR MAPPING --- */
  // Latest fallback — seed data when API not yet loaded
  const latestFallback: InstagramReelData[] = [
    { reelId: "seed_1", caption: "Bong Bari Comedy — Latest Reel", thumbnail: "", permalink: "https://instagram.com/thebongbari", publishedAt: new Date().toISOString(), likeCount: 0, commentCount: 0, viewCount: 0, videoUrl: "" },
  ];
  // Popular fallback
  const popularFallback: InstagramReelData[] = [
    { reelId: "seed_2", caption: "Most Loved Reel", thumbnail: "", permalink: "https://instagram.com/thebongbari", publishedAt: new Date().toISOString(), likeCount: 0, commentCount: 0, viewCount: 0, videoUrl: "" },
  ];

  const latestReelData = (latestReels && latestReels.length > 0) ? latestReels : latestFallback;
  // Popular: sort by viewCount descending so highest-view reels come first, keep ALL 4
  const safePopularReelData = (popularReels && popularReels.length > 0)
    ? [...popularReels].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    : popularFallback;

  /* --- LOGIC RESTORATION --- */
  const form = useForm<CollaborationRequest>({
    resolver: zodResolver(insertCollaborationRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      message: ""
    }
  });

  /* --- MISSING VARS MAPPING (Batch Fix) --- */
  const latestMemes: any[] = []; // Fallback for unused meme section
  const { isValid: isFormValid } = form.formState;
  const hasPhone = !!form.watch("phone");
  const hasEmail = !!form.watch("email");

  const collaborationMutation = useMutation({
    mutationFn: async (data: CollaborationRequest) => {
      await apiRequest("/api/collaboration", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: () => {
      toast({ title: "Message Sent!", description: "We will reach out to you soon." });
      form.reset();
      playFunnySubmissionSound();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    }
  });

  const onSubmit = (data: CollaborationRequest) => {
    collaborationMutation.mutate(data);
  };

  // Hero uses the MOST VIRAL reel (Batch 1 Phase 1.1) — fallback to latest
  const heroReel = (safePopularReelData[0]?.viewCount > 0 ? safePopularReelData[0] : latestReelData[0]);
  const heroThumbnail = heroReel?.thumbnail || '';
  const heroPermalink = heroReel?.permalink || igProfileUrl;
  const heroShortcode = heroPermalink.match(/\/reel\/([^/]+)\//)?.[1] || '';

  // Batch 1 Phase 1.5: Preload hero video for instant playback
  useEffect(() => {
    if (heroReel?.videoUrl) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = heroReel.videoUrl;
      document.head.appendChild(link);
      return () => { document.head.removeChild(link); };
    }
  }, [heroReel?.videoUrl]);

  // Batch 4 Phase 4.4: Show "Tap to Watch" only if video hasn't started after 2s
  const [showHeroCTA, setShowHeroCTA] = useState(false);
  useEffect(() => {
    if (heroPlaying && !heroBuffering) { setShowHeroCTA(false); return; }
    const t = setTimeout(() => setShowHeroCTA(true), 2000);
    return () => clearTimeout(t);
  }, [heroPlaying, heroBuffering]);

  return (
    <>
      <SEOHead title="Bong Bari Comedy | Home" description="Authentic Bengali Family Comedy" />

      {/* Premium Language Toggle — fixed floating pill (desktop only — mobile uses dock menu) */}
      <div className="hidden sm:block fixed top-4 right-4 z-[100]">
        <div className="lang-toggle-pill relative flex items-center bg-black/70 backdrop-blur-xl border border-white/[0.08] rounded-full p-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <div
            className="lang-toggle-indicator absolute top-[3px] h-[calc(100%-6px)] w-[calc(50%-2px)] rounded-full bg-gradient-to-r from-brand-yellow/15 to-amber-500/15 border border-brand-yellow/25 transition-all duration-300"
            style={{ left: lang === 'en' ? '3px' : 'calc(50% - 1px)' }}
          />
          <button onClick={() => setLang('en')} className={`relative z-10 px-3 py-1.5 text-[11px] font-bold rounded-full transition-colors duration-200 ${lang === 'en' ? 'text-brand-yellow' : 'text-white/35 hover:text-white/55'}`}>
            EN
          </button>
          <button onClick={() => setLang('bn')} className={`relative z-10 px-3 py-1.5 text-[11px] font-bold rounded-full font-bengali transition-colors duration-200 ${lang === 'bn' ? 'text-brand-yellow' : 'text-white/35 hover:text-white/55'}`}>
            বাং
          </button>
        </div>
      </div>

      {/* Main Layout - "700 Years UX" - PREMIUM GLASS & MESH GRADIENT */}
      <div className="home-content-wrapper min-h-screen bg-transparent relative selection:bg-brand-yellow selection:text-black font-sans overflow-x-hidden scroll-smooth">

        {/* Premium Background Glow — Phase 3: parallax depth on scroll
            Desktop: fixed full-viewport blobs with parallax
            Mobile: absolute blobs clipped inside content wrapper (no footer bleed) */}
        {device.isMobile ? (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[3%] left-[-15%] w-[65%] h-[30%] bg-brand-yellow/[0.06] rounded-full blur-[100px]" />
            <div className="absolute top-[25%] right-[-15%] w-[50%] h-[25%] bg-indigo-500/[0.04] rounded-full blur-[100px]" />
            <div className="absolute top-[50%] left-[-10%] w-[55%] h-[20%] bg-brand-yellow/[0.04] rounded-full blur-[120px]" />
            <div className="absolute top-[70%] right-[-10%] w-[45%] h-[20%] bg-violet-500/[0.03] rounded-full blur-[120px]" />
            <div className="absolute top-[88%] left-[10%] w-[50%] h-[15%] bg-amber-500/[0.025] rounded-full blur-[100px]" />
          </div>
        ) : (
        <div className="fixed inset-0 pointer-events-none" style={{ contain: 'strict', zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[80px] transform-gpu" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[80px] transform-gpu" />
        </div>
        )}

        <main className="relative z-10 w-full flex flex-col items-center">

          {/* ===== HERO — AIDA First View ===== */}
          {/* Phase 5: Sticky pin wrapper — hero stays pinned on desktop/tablet while content scrolls over */}
          <div ref={heroRef} className={device.isMobile ? 'w-full' : 'relative w-full'} style={device.isMobile ? undefined : { height: '115vh' }}>
            <section
              className={`w-full flex flex-col items-center ${device.isMobile ? 'justify-center' : 'justify-center'} px-4 sm:px-6 lg:px-8 ${device.isMobile ? 'pt-2 pb-0' : 'pt-20 pb-6'} relative ${device.isMobile ? '' : 'sticky top-0'}`}
              style={{ minHeight: device.isMobile ? undefined : '100svh', height: device.isMobile ? 'calc(100dvh - 56px - 70px)' : undefined }}
              data-testid="hero-section"
            >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={device.prefersReducedMotion ? undefined : { scale: heroVideoScale, opacity: heroVideoOpacity }}
              className={`hero-cinema-container relative w-full max-w-xl md:max-w-2xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] cursor-pointer ${device.isMobile ? 'mb-2' : 'mb-5'} aspect-video flex-shrink-0`}
              onClick={() => {
                if (heroPlaying && !heroPaused) {
                  heroVideoRef.current?.pause();
                  setHeroPaused(true);
                } else if (heroPlaying && heroPaused) {
                  heroVideoRef.current?.play();
                  setHeroPaused(false);
                } else if (!heroPlaying && heroReel?.videoUrl) {
                  setHeroPlaying(true);
                  setHeroPaused(false);
                  setHeroBuffering(true);
                } else if (!heroPlaying) {
                  window.open(heroPermalink, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              {/* Blurred background — Ken Burns slow zoom+pan animation (Batch 1 Phase 1.2) */}
              <img src={heroThumbnail} alt="" aria-hidden="true" decoding="async"
                className="absolute inset-0 w-full h-full object-cover blur-2xl brightness-[0.35] pointer-events-none hero-ken-burns" />
              {/* Dark overlay on blurred bg */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />

              {/* Batch 1 Phase 1.4: Bokeh ambient dots */}
              <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
                <div className="hero-bokeh hero-bokeh-1" />
                <div className="hero-bokeh hero-bokeh-2" />
                <div className="hero-bokeh hero-bokeh-3" />
                <div className="hero-bokeh hero-bokeh-4" />
              </div>

              {/* Premium: Cinematic vignette + shimmer sweep */}
              <div className="hero-vignette" />
              <div className="hero-shimmer" />

              {heroPlaying && heroReel?.videoUrl ? (
                <>
                  {/* Portrait video centered inside landscape container */}
                  <video
                    ref={heroVideoRef}
                    src={heroReel.videoUrl}
                    className="relative z-[2] h-full mx-auto object-contain"
                    style={{ aspectRatio: '9/16' }}
                    autoPlay muted loop playsInline poster={heroThumbnail} preload="auto"
                    onCanPlay={() => setHeroBuffering(false)}
                    onWaiting={() => setHeroBuffering(true)}
                    onPlaying={() => setHeroBuffering(false)}
                  />
                  {/* Loading spinner */}
                  {heroBuffering && (
                    <div className="absolute inset-0 flex items-center justify-center z-[16] pointer-events-none">
                      <div className="reel-loading-spinner" />
                    </div>
                  )}
                  {/* Cinematic side gradients — premium opaque panels */}
                  <div className="absolute inset-y-0 left-0 w-[28%] z-[3] pointer-events-none"
                    style={{ background: 'linear-gradient(to right, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 50%, transparent 100%)' }} />
                  <div className="absolute inset-y-0 right-0 w-[28%] z-[3] pointer-events-none"
                    style={{ background: 'linear-gradient(to left, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 50%, transparent 100%)' }} />


                  {/* Paused overlay */}
                  {heroPaused && (
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(244,196,48,0.88) 0%, rgba(218,165,32,0.82) 100%)', boxShadow: '0 0 30px rgba(244,196,48,0.5)' }}>
                        <Play className="w-8 h-8 md:w-10 md:h-10 fill-black text-black ml-1" />
                      </div>
                    </div>
                  )}
                  {/* Bottom gradient for stats readability */}
                  <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-[4]" />
                  {/* Hero stats — center-bottom, large + prominent (Batch 2) */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none">
                    {heroReel?.viewCount != null && heroReel.viewCount > 0 && (
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                        style={{
                          background: 'rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(14px)',
                          border: '1px solid rgba(244,196,48,0.25)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(244,196,48,0.06)',
                        }}>
                        <Eye className="w-5 h-5 view-badge-eye-pulse" style={{ color: '#F4C430' }} />
                        <span className="text-lg font-bold text-white tracking-wide">
                          {heroReel.viewCount >= 1_000_000 ? (heroReel.viewCount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M' : heroReel.viewCount >= 1000 ? (heroReel.viewCount / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : heroReel.viewCount} views
                        </span>
                      </div>
                    )}
                    {heroReel?.likeCount != null && heroReel.likeCount > 0 && (
                      <span className="flex items-center gap-1 text-sm font-medium text-white/70">
                        <Heart className="w-3.5 h-3.5 text-white/60" />
                        {heroReel.likeCount >= 1_000_000 ? (heroReel.likeCount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M' : heroReel.likeCount >= 1000 ? (heroReel.likeCount / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : heroReel.likeCount}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Thumbnail centered as portrait inside landscape */}
                  <img src={heroThumbnail} alt="Featured Comedy Reel"
                    className="relative z-[2] h-full mx-auto object-contain" style={{ aspectRatio: '9/16' }} />
                  {/* Side gradients */}
                  <div className="absolute inset-y-0 left-0 w-[28%] z-[3] pointer-events-none"
                    style={{ background: 'linear-gradient(to right, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 50%, transparent 100%)' }} />
                  <div className="absolute inset-y-0 right-0 w-[28%] z-[3] pointer-events-none"
                    style={{ background: 'linear-gradient(to left, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 50%, transparent 100%)' }} />



                  <div className="absolute inset-0 z-[4] flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute -inset-3 rounded-full blur-xl animate-pulse" style={{ background: 'radial-gradient(circle, rgba(225,48,108,0.3) 0%, transparent 70%)' }} />
                      <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, rgba(244,196,48,0.9) 0%, rgba(218,165,32,0.85) 100%)', boxShadow: '0 0 24px rgba(244,196,48,0.5), 0 4px 16px rgba(0,0,0,0.4)' }}>
                        <Play className="w-6 h-6 md:w-7 md:h-7 ml-1 fill-black text-black" />
                      </div>
                    </div>
                  </div>
                  {/* Batch 4 Phase 4.4: Show CTA only after delay */}
                  {showHeroCTA && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-semibold border border-white/15 text-white/90">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#E1306C', boxShadow: '0 0 6px rgba(225,48,108,0.7)' }} />Tap to Watch
                    </span>
                  </div>
                  )}
                  {/* View count — center-bottom above "Tap to Watch" (Batch 2) */}
                  {heroReel?.viewCount != null && heroReel.viewCount > 0 && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full pointer-events-none"
                      style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(14px)',
                        border: '1px solid rgba(244,196,48,0.25)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(244,196,48,0.06)',
                      }}>
                      <Eye className="w-5 h-5 view-badge-eye-pulse" style={{ color: '#F4C430' }} />
                      <span className="text-lg font-bold text-white tracking-wide">
                        {heroReel.viewCount >= 1_000_000 ? (heroReel.viewCount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M' : heroReel.viewCount >= 1000 ? (heroReel.viewCount / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : heroReel.viewCount} views
                      </span>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            <motion.div className={`text-center ${device.isMobile ? 'space-y-1' : 'space-y-3'} w-full max-w-2xl mx-auto`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <h1 className={`${device.isMobile ? 'text-xl' : 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl'} font-extrabold tracking-tight text-white leading-tight`}>
                <motion.span className="inline-block" style={device.prefersReducedMotion ? undefined : { y: titleAuthenticY }}>Authentic</motion.span>{' '}
                <span className="relative inline-block pb-1">
                  <span className="text-[#F4C430] drop-shadow-[0_0_18px_rgba(244,196,48,0.22)]">Bengali</span>
                  {/* Animated SVG pen-stroke underline — draws itself on load */}
                  <svg
                    className="bengali-underline-svg absolute -bottom-1 left-0 w-full overflow-visible pointer-events-none"
                    height="10" viewBox="0 0 100 10" preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1,6 C15,2 35,9 52,5 C69,1 85,8 99,4"
                      fill="none" stroke="#F4C430" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="130" strokeDashoffset="130"
                      opacity="0.8"
                      style={{ animation: 'bengali-brush 0.9s cubic-bezier(.4,0,.2,1) 0.5s forwards' }}
                    />
                    {/* Glow layer */}
                    <path
                      d="M1,6 C15,2 35,9 52,5 C69,1 85,8 99,4"
                      fill="none" stroke="#F4C430" strokeWidth="5"
                      strokeLinecap="round" strokeLinejoin="round"
                      strokeDasharray="130" strokeDashoffset="130"
                      opacity="0.15"
                      style={{ filter: 'blur(2px)', animation: 'bengali-brush 0.9s cubic-bezier(.4,0,.2,1) 0.5s forwards' }}
                    />
                  </svg>
                </span>
                {' '}<motion.span className="inline-block" style={device.prefersReducedMotion ? undefined : { y: titleComedyY }}>Comedy</motion.span>
              </h1>
              <p className={`${device.isMobile ? 'text-xs' : 'text-sm sm:text-base md:text-lg'} font-medium ${lang === 'bn' ? 'font-bengali bengali-subtitle-glow' : 'text-gray-400'}`}>{tx.heroSubtitle}</p>
              <motion.div
                className="flex flex-row justify-center items-center gap-3 pt-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={device.prefersReducedMotion ? undefined : { opacity: heroCTAOpacity, y: heroCTAY }}
              >
                <button onClick={() => setLocation('/tools')} className={`flex items-center justify-center gap-2 ${device.isMobile ? 'px-4 py-2.5 text-xs' : 'px-5 py-3 text-sm'} rounded-full bg-[#1a1a2e]/80 hover:bg-[#1a1a2e] border border-white/15 text-white font-semibold backdrop-blur-md transition-all active:scale-95 hover:border-white/30 whitespace-nowrap`}>
                  <Flame className="w-4 h-4 text-[#F4C430]" />Bong Kahini
                </button>
                <button onClick={() => window.open(igProfileUrl, '_blank', 'noopener,noreferrer')} className={`flex items-center justify-center gap-2 ${device.isMobile ? 'px-4 py-2.5 text-xs' : 'px-5 py-3 text-sm'} rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold shadow-[0_4px_20px_rgba(168,85,247,0.5)] transition-all active:scale-95 whitespace-nowrap`}>
                  <Instagram className="w-5 h-5" />Follow
                </button>
              </motion.div>
            </motion.div>

            {/* Scroll indicator removed — above-the-fold video + CTA is enough visual anchor */}
            </section>

            {/* Phase 10: Soft transition zone between hero and content (desktop/tablet only) */}
            {!device.isMobile && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[150px] pointer-events-none z-20"
                style={{ opacity: blurZoneOpacity }}
              >
                <div className="w-full h-full bg-gradient-to-b from-transparent via-[#050505]/30 to-transparent" />
              </motion.div>
            )}
          </div>
          {/* End Phase 5 sticky wrapper */}

          {/* v4 Phase 1: Hero→Content Bridge — cinematic parallax reveal */}
          {/* On mobile: pushed well below hero fold with parallax + staggered entrance */}
          <motion.div
            className={`w-full ${device.isMobile ? 'py-6' : 'py-6 md:py-10'} flex flex-col items-center justify-center text-center`}
            initial={{ opacity: 0, y: device.isMobile ? 40 : 12, scale: device.isMobile ? 0.95 : 1 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ margin: device.isMobile ? '-10px' : '-30px', once: false }}
            transition={device.isMobile ? { type: 'spring', stiffness: 200, damping: 20, mass: 0.8 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {!device.isMobile && (
              <motion.p
                className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-white/30 font-semibold mb-3"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: '-20px' }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {tx.bridgeLabel}
              </motion.p>
            )}
            <motion.h2
              className={`${device.isMobile ? 'text-lg' : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'} font-extrabold tracking-tight leading-tight`}
              initial={{ opacity: 0, y: device.isMobile ? 20 : 10, filter: 'blur(8px)', scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              viewport={{ margin: '-10px', once: false }}
              transition={device.isMobile ? { type: 'spring', stiffness: 180, damping: 18, mass: 0.7 } : { duration: 0.5, delay: 0.1 }}
            >
              <span className="text-white">{tx.bridgeTitlePrefix} </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-amber-400 to-yellow-500">{tx.bridgeTitleAccent}</span>
            </motion.h2>
            <motion.div
              className={`${device.isMobile ? 'w-10 mt-2' : 'w-16 mt-4'} h-[2px] bg-gradient-to-r from-transparent via-brand-yellow/50 to-transparent`}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ margin: '-20px' }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </motion.div>

          {/* ===== LATEST COMEDY — Premium Cinematic Showcase ===== */}
          <motion.section
            className={`w-full max-w-7xl mx-auto ${device.isMobile ? 'px-3 pt-1 pb-4' : 'px-6 md:px-12 pt-4 pb-10 md:pt-6 md:pb-14'} relative overflow-visible`}
            data-testid="latest-comedy-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: device.isMobile ? '-10px' : '-60px', once: false }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: device.isMobile ? 0.3 : 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: device.isMobile ? 0.04 : 0.1 } },
            }}
          >

            {/* v4 Phase 6: Premium section header with scroll-linked blur */}
            <SectionRevealTitle
              badge={tx.latestBadge}
              badgeIcon={Flame}
              title={
                <h2 className="text-base sm:text-3xl md:text-4xl font-extrabold text-white leading-none tracking-tight">
                  {tx.latestTitlePrefix}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-yellow-400 to-amber-500">{tx.latestTitleAccent}</span>
                </h2>
              }
              subtitle={tx.latestSubtitle}
            >
              <motion.div className="flex justify-center mt-3">
                <a
                  href={igProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  {tx.viewAll} <span className="text-brand-yellow/60">→</span>
                </a>
              </motion.div>
            </SectionRevealTitle>

            {/* Phase 12: Card grid cascade — stagger adapts to device tier */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-5 relative z-10"
              data-testid="latest-videos-grid"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: device.isMobile ? 0.04 : device.isTablet ? 0.08 : 0.1 } } }}
              onViewportEnter={(entry) => { const el = (entry?.target ?? null) as HTMLElement | null; if (el) el.classList.add('grid-visible'); }}
            >
              {[0, 1, 2, 3].map((i) => {
                const reel = latestReelData[i];
                if (!reel) return null;
                const cardY = device.isMobile ? 16 : device.isTablet ? 18 : 24;
                // Phase 13: Scroll entrance tilt — desktop cards enter with subtle rotateX then spring flat
                const scrollTilt = device.isDesktop && !device.prefersReducedMotion ? 4 : 0;
                return (
                  <TiltCard
                    key={reel.reelId + i}
                    variants={{
                      hidden: { opacity: 0, y: cardY, scale: device.isMobile ? 0.96 : 1, rotateX: scrollTilt },
                      visible: { opacity: 1, y: 0, scale: 1, rotateX: 0, transition: device.isMobile ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    tiltEnabled={device.isDesktop && !device.prefersReducedMotion}
                    style={device.isDesktop ? { perspective: 600 } : undefined}
                  >
                    <InstagramReel reelId={reel.reelId} caption={reel.caption} thumbnail={reel.thumbnail} permalink={reel.permalink} videoUrl={reel.videoUrl} likeCount={reel.likeCount} commentCount={reel.commentCount} viewCount={reel.viewCount} index={i} />
                  </TiltCard>
                );
              })}
            </motion.div>
          </motion.section>

          {/* v4 Phase 5: Breathing spacer between Latest & Most Loved */}
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-1 sm:py-2">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="w-1 h-1 rounded-full bg-brand-yellow/30" />
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </div>

          {/* ===== MOST LOVED — Premium Cinematic Showcase ===== */}
          <motion.section
            className={`w-full max-w-7xl mx-auto ${device.isMobile ? 'px-3 pt-1 pb-4' : 'px-6 md:px-12 pt-4 pb-10 md:pt-6 md:pb-14'} relative overflow-visible`}
            data-testid="loved-comedy-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: device.isMobile ? '-10px' : '-60px', once: false }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: device.isMobile ? 0.3 : 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: device.isMobile ? 0.04 : 0.1 } },
            }}
          >

            {/* v4 Phase 7: Premium Most Loved header */}
            <SectionRevealTitle
              badge={tx.lovedBadge}
              badgeIcon={Heart}
              accentColor="brand-red"
              title={
                <h2 className="text-base sm:text-3xl md:text-4xl font-extrabold text-white leading-none tracking-tight">
                  {tx.lovedTitlePrefix}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-red-500">{tx.lovedTitleAccent}</span>
                </h2>
              }
              subtitle={tx.lovedSubtitle}
            >
              <motion.div className="flex justify-center mt-3">
                <a
                  href={igProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  {tx.viewAll} <span className="text-rose-400/60">→</span>
                </a>
              </motion.div>
            </SectionRevealTitle>

            {/* Phase 17: Card grid cascade reverse — Most Loved enters from right */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-5 relative z-10"
              data-testid="loved-videos-grid"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: device.isMobile ? 0.04 : device.isTablet ? 0.08 : 0.1 } } }}
              onViewportEnter={(entry) => { const el = (entry?.target ?? null) as HTMLElement | null; if (el) el.classList.add('grid-visible'); }}
            >
              {[0, 1, 2, 3].map((i) => {
                const reel = safePopularReelData[i];
                if (!reel) return null;
                const cardY = device.isMobile ? 16 : device.isTablet ? 18 : 24;
                // Phase 13: Scroll entrance tilt (reverse cascade — slight rotateX tilt on enter)
                const scrollTilt = device.isDesktop && !device.prefersReducedMotion ? -3 : 0;
                return (
                  <TiltCard
                    key={reel.reelId + i}
                    variants={{
                      hidden: { opacity: 0, y: cardY, x: device.isMobile ? 0 : 15, scale: device.isMobile ? 0.96 : 1, rotateX: scrollTilt },
                      visible: { opacity: 1, y: 0, x: 0, scale: 1, rotateX: 0, transition: device.isMobile ? { duration: 0.3, ease: [0.22, 1, 0.36, 1] } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    tiltEnabled={device.isDesktop && !device.prefersReducedMotion}
                    style={device.isDesktop ? { perspective: 600 } : undefined}
                  >
                    <InstagramReel reelId={reel.reelId} caption={reel.caption} thumbnail={reel.thumbnail} permalink={reel.permalink} videoUrl={reel.videoUrl} likeCount={reel.likeCount} commentCount={reel.commentCount} viewCount={reel.viewCount} index={i} rank={i + 1} />
                  </TiltCard>
                );
              })}
            </motion.div>
          </motion.section>

          {/* v4 Phase 5: Breathing spacer between Most Loved & Work with Us */}
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-1 sm:py-2">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <div className="w-1 h-1 rounded-full bg-rose-400/30" />
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </div>

          {/* ===== WORK WITH US — Premium Collaboration Portal ===== */}
          {device.isMobile ? (
            /* Mobile: Minimal CTA row — premium slide-up entrance */
            <motion.div
              className="w-full px-4 py-1"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ margin: '-10px', once: false }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >              <button
                onClick={() => setLocation('/work-with-us')}
                className="w-full relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-brand-yellow/30 via-white/[0.08] to-violet-500/20 active:scale-[0.98] transition-transform"
              >
                <div className="rounded-2xl bg-[#0a0a0a]/95 backdrop-blur-xl flex items-center gap-4 px-5 py-4 relative overflow-hidden">
                  <div className="absolute top-[-50%] right-[-30%] w-[50%] h-[120%] bg-brand-yellow/[0.04] rounded-full blur-[60px] pointer-events-none" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-yellow/20 to-brand-yellow/5 border border-brand-yellow/15 flex items-center justify-center flex-shrink-0">
                    <Handshake className="w-5 h-5 text-brand-yellow" />
                  </div>
                  <div className="flex-1 text-left relative z-10">
                    <p className="text-[14px] font-semibold text-white leading-tight">Work With Us</p>
                    <p className="text-[11px] text-white/35 mt-0.5">Brand collabs & partnerships</p>
                  </div>
                  <svg className="w-4 h-4 text-white/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            </motion.div>
          ) : (
          <motion.div ref={workRef} className="py-10 w-full px-4 sm:px-6 lg:px-8 relative" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ margin: '-60px' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <section className="max-w-4xl mx-auto relative pb-8" data-testid="collaboration-section">
              <motion.div className="absolute inset-0 -z-10 bg-radial-glow" style={{ opacity: radialGlowOpacity }} />
              <SectionRevealTitle
                badge={tx.workBadge}
                badgeIcon={Handshake}
                title={
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                    {tx.workTitlePrefix}{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-amber-400 to-yellow-500">{tx.workTitleAccent}</span>
                  </h2>
                }
                subtitle={tx.workSubtitle}
              >
                {/* v4 Phase 11: Trust signal strip */}
                <motion.div
                  className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-5"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{}}
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
                >
                  {[
                    { icon: Video, label: tx.trustVideos, color: 'text-red-400' },
                    { icon: Eye, label: tx.trustViews, color: 'text-blue-400' },
                    { icon: Award, label: tx.trustCreator, color: 'text-brand-yellow' },
                  ].map((s) => (
                    <motion.div
                      key={s.label}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]"
                      variants={{
                        hidden: { opacity: 0, scale: 0.8 },
                        visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
                      }}
                    >
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      <span className="text-[11px] sm:text-xs font-semibold text-white/50">{s.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
                <motion.p
                  className="mt-4 text-center text-gray-400 max-w-lg mx-auto text-sm leading-relaxed"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {tx.workDescription}
                </motion.p>
              </SectionRevealTitle>
              /* Desktop: Full form card */
              <motion.div
                className="form-shimmer-card relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] shadow-2xl border border-white/[0.07] text-white backdrop-blur-2xl"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                onViewportEnter={(entry) => {
                  const el = (entry?.target ?? null) as HTMLElement | null;
                  if (el) el.classList.add('form-revealed');
                }}
              >
                <div className="p-8 md:p-12">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="collaboration-form">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">{tx.formName} <span className="text-brand-yellow/60">*</span></FormLabel>
                            <FormControl><Input placeholder="Your Name" data-testid="input-name" className="wws-input h-[48px] text-[13px] text-white placeholder:text-white/25 border-0" {...field} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">Email {!hasPhone ? <span className="text-brand-yellow/60">*</span> : <span className="text-white/20">(Optional)</span>}</FormLabel>
                            <FormControl><Input type="email" placeholder="your@email.com" data-testid="input-email" className="wws-input h-[48px] text-[13px] text-white placeholder:text-white/25 border-0" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">{tx.formPhone} {!hasEmail ? <span className="text-brand-yellow/60">*</span> : <span className="text-white/20">(Optional)</span>}</FormLabel>
                            <FormControl>
                              <div className="wws-input flex items-center h-[48px] p-0 overflow-hidden">
                                <Select value={field.value?.split(' ')[0] || "+91"} onValueChange={(code) => { const n = field.value?.split(' ').slice(1).join(' ') || ''; field.onChange(code + (n ? ' ' + n : '')); }}>
                                  <SelectTrigger className="w-[88px] flex-shrink-0 text-[13px] text-white/70 border-0 bg-transparent h-full rounded-none focus:ring-0 focus:ring-offset-0" data-testid="select-country-code"><SelectValue /></SelectTrigger>
                                  <SelectContent position="popper" className="z-[9990] bg-[#111]/95 backdrop-blur-2xl border-white/[0.08]">
                                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                                    <SelectItem value="+880">🇧🇩 +880</SelectItem>
                                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                                    <SelectItem value="+86">🇨🇳 +86</SelectItem>
                                    <SelectItem value="+81">🇯🇵 +81</SelectItem>
                                    <SelectItem value="+49">🇩🇪 +49</SelectItem>
                                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                                    <SelectItem value="+61">🇦🇺 +61</SelectItem>
                                    <SelectItem value="+971">🇦🇪 +971</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />
                                <Input placeholder="Phone number" data-testid="input-phone" type="tel" value={field.value?.split(' ').slice(1).join(' ') || ''} onChange={(e) => { const n = e.target.value.replace(/[^0-9]/g, ''); const c = field.value?.split(' ')[0] || '+91'; field.onChange(c + (n ? ' ' + n : '')); }} onKeyPress={(e) => { if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') e.preventDefault(); }} className="flex-1 min-w-0 border-0 bg-transparent h-full text-[13px] text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:ring-offset-0" />
                              </div>
                            </FormControl>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="company" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">{tx.formCompany} <span className="text-brand-yellow/60">*</span></FormLabel>
                            <FormControl><Input placeholder="Your Company or Brand" data-testid="input-company" className="wws-input h-[48px] text-[13px] text-white placeholder:text-white/25 border-0" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold">{tx.formMessage} <span className="text-white/20">(Optional)</span></FormLabel>
                          <FormControl><Textarea rows={3} className="wws-input min-h-[100px] resize-none text-[13px] text-white placeholder:text-white/25 border-0" placeholder="Tell us about your collaboration idea..." data-testid="textarea-message" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <MagneticButton
                        disabled={collaborationMutation.isPending || !isFormValid}
                        className={`wws-submit w-full h-12 rounded-xl font-semibold text-sm transition-all duration-300 no-rickshaw-sound overflow-hidden ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''} ${collaborationMutation.isPending ? 'opacity-50' : ''}`}
                        data-testid="button-submit-collaboration"
                        strength={isFormValid ? 0.3 : 0}
                        onClick={() => isFormValid && form.handleSubmit(onSubmit)()}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {collaborationMutation.isPending ? "Sending..." : isFormValid ? tx.formSubmit : tx.formFill}
                      </MagneticButton>
                    </form>
                  </Form>
                </div>
              </motion.div>
            </section>
          </motion.div>
          )}
        </main>
      </div>

      <Footer />
    </>
  );
};

export default Home;
