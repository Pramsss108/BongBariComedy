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
import YouTubeShort from "@/components/youtube-short";
import MobileNavBar from "@/components/mobile-navbar";
import SEOHead from "@/components/seo-head";
import Footer from "@/components/footer";
// Removed PromoMarquee (promo API disabled)
// Parallax removed for performance
import { Youtube, Send, Home as HomeIcon, Users, TrendingUp, Smile, Edit3, Volume2, VolumeX, Play, Sparkles, Heart, Star, Video, Eye, Handshake } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertCollaborationRequestSchema, type CollaborationRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { buildApiUrl } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const textOpacity = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.7, 0.85], [0, 0.5, 1, 1, 0.8]);
  const blurVal = useTransform(scrollYProgress, [0, 0.15, 0.3], [6, 2, 0]);
  const filterStr = useTransform(blurVal, (v) => `blur(${v}px)`);
  const subOpacity = useTransform(scrollYProgress, [0.1, 0.3, 0.7, 0.85], [0, 1, 1, 0.6]);

  return (
    <div ref={ref} className="relative mb-6 sm:mb-8">
      {badge && (
        <motion.div
          className="flex justify-center mb-3"
          style={{ opacity: subOpacity }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
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
          className={`text-center text-sm sm:text-base mt-2 ${/[\u0980-\u09FF]/.test(subtitle) ? 'font-bengali bengali-subtitle-glow' : 'text-gray-400 tracking-wide'}`}
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
  // Mute state for hero video (autoplay allowed only when muted initially)
  const [isMuted, setIsMuted] = useState(true); // start muted until user clicks Yes/No
  // Key to force iframe remount when toggling mute for reliable param application
  const [videoKey, setVideoKey] = useState(0);
  // Ref to iframe for postMessage API control
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Has greeting decision occurred? (user entered site)
  const [enteredSite, setEnteredSite] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('bbc.audioDecision');
  });

  // Listen for decision broadcast
  useEffect(() => {
    const handler = () => {
      setEnteredSite(true);
      const decision = localStorage.getItem('bbc.audioDecision');
      if (decision === 'granted') {
        setIsMuted(false);
        setVideoKey(k => k + 1); // reload iframe with sound
      } else {
        setIsMuted(true); // keep muted
        setVideoKey(k => k + 1);
      }
    };
    window.addEventListener('bbc:audio-decision', handler);
    return () => window.removeEventListener('bbc:audio-decision', handler);
  }, []);
  // After decision, try to set volume/play if unmuted
  useEffect(() => {
    if (!enteredSite) return; // don't run before entry
    const attemptVolume = () => {
      const iframe = iframeRef.current; if (!iframe) return;
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [70] }), '*');
        if (!isMuted) {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
      } catch { }
    };
    const timeouts = [450, 1100, 2100];
    timeouts.forEach(t => setTimeout(attemptVolume, t));
  }, [videoKey, isMuted, enteredSite]);

  // Support overriding hero video via query (?heroVideo=ID) or env var
  const heroVideoOverride = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('heroVideo') : null)
    || (import.meta as any).env?.VITE_HERO_LANDSCAPE_VIDEO_ID;

  // Resolve YouTube Channel ID from URL (?channelId=) or Vite env (VITE_YOUTUBE_CHANNEL_ID)
  const channelId = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('channelId') : null)
    || (import.meta as any).env?.VITE_YOUTUBE_CHANNEL_ID
    || '';

  // --- Phase B: Device tier + Hero scroll-linked cinematic ---
  const device = useDeviceTier();

  // --- Language toggle (EN / BN) ---
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en';
  });
  useEffect(() => { localStorage.setItem('bbc.lang', lang); }, [lang]);

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
    viewAll: 'View All on YouTube',
    trustVideos: '500+ Videos',
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
    viewAll: 'ইউটিউবে সব দেখুন',
    trustVideos: '৫০০+ ভিডিও',
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
  // Phase 3: Background glow parallax (page-level scroll)
  const { scrollYProgress: pageProgress } = useScroll();
  const glowYellowY = useTransform(pageProgress, [0, 1], device.isMobile ? [0, 0] : device.isTablet ? [0, -60] : [0, -120]);
  const glowIndigoY = useTransform(pageProgress, [0, 1], device.isMobile ? [0, 0] : device.isTablet ? [0, 60] : [0, 120]);



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



  const { data: latestVideos, isLoading: isLoadingLatest } = useQuery<YouTubeVideo[]>({
    queryKey: [channelId ? `/api/youtube/latest?channelId=${encodeURIComponent(channelId)}` : '/api/youtube/latest'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: popularVideos, isLoading: isLoadingPopular } = useQuery<YouTubeVideo[]>({
    queryKey: [channelId ? `/api/youtube/popular?channelId=${encodeURIComponent(channelId)}` : '/api/youtube/popular'],
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes (popular videos change less frequently)
  });

  /* --- FALLBACK DATA & VAR MAPPING --- */
  /* --- FALLBACK DATA & VAR MAPPING --- */
  // Latest fallback — 4 different real BongBari shorts
  const latestFallback: YouTubeVideo[] = [
    { videoId: "JetnSt8yP74", title: "Ke Kise Kom? | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-01" },
    { videoId: "C2r8L_Yfsss", title: "Bangla Comedy Short | Bong Bari", thumbnail: "https://i.ytimg.com/vi/C2r8L_Yfsss/hqdefault.jpg", publishedAt: "2024-01-02" },
    { videoId: "K9_yPDdlcAI", title: "Funny Skit | Bong Bari", thumbnail: "https://i.ytimg.com/vi/K9_yPDdlcAI/hqdefault.jpg", publishedAt: "2024-01-03" },
    { videoId: "XmDPpvMzWkI", title: "Laugh Riot | Bong Bari", thumbnail: "https://i.ytimg.com/vi/XmDPpvMzWkI/hqdefault.jpg", publishedAt: "2024-01-04" },
  ];
  // Popular fallback — 4 different videos (older viral ones)
  const popularFallback: YouTubeVideo[] = [
    { videoId: "bHoZ-JFAVcA", title: "Most Loved | Bong Bari", thumbnail: "https://i.ytimg.com/vi/bHoZ-JFAVcA/hqdefault.jpg", publishedAt: "2023-06-01" },
    { videoId: "7kPy6y5sFWk", title: "Fan Favourite | Bong Bari", thumbnail: "https://i.ytimg.com/vi/7kPy6y5sFWk/hqdefault.jpg", publishedAt: "2023-06-02" },
    { videoId: "VGwrZPbsAF8", title: "Viral Comedy | Bong Bari", thumbnail: "https://i.ytimg.com/vi/VGwrZPbsAF8/hqdefault.jpg", publishedAt: "2023-06-03" },
    { videoId: "Dz27AZE8Bnk", title: "Weekend Vibes | Bong Bari", thumbnail: "https://i.ytimg.com/vi/Dz27AZE8Bnk/hqdefault.jpg", publishedAt: "2023-06-04" },
  ];

  const latestVideoData = (latestVideos && latestVideos.length > 0) ? latestVideos : latestFallback;
  const popularVideoData = (popularVideos && popularVideos.length > 0) ? popularVideos : popularFallback;

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

  const landscapeId = heroVideoOverride || latestVideos?.[0]?.videoId || "JetnSt8yP74";
  const isVideoLoading = isLoadingLatest && !heroVideoOverride;

  return (
    <>
      <SEOHead title="Bong Bari Comedy | Home" description="Authentic Bengali Family Comedy" />

      {/* Premium Language Toggle — fixed floating pill */}
      <div className="fixed top-4 right-4 z-[100]">
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
      <div className="home-content-wrapper min-h-screen bg-[#050505] relative selection:bg-brand-yellow selection:text-black font-sans overflow-x-hidden pb-24 sm:pb-0 scroll-smooth">

        {/* Premium Background Glow — Phase 3: parallax depth on scroll */}
        <div className="fixed inset-0 pointer-events-none">
          <motion.div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[80px]" style={{ y: glowYellowY, willChange: 'transform' }} />
          <motion.div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[80px]" style={{ y: glowIndigoY, willChange: 'transform' }} />
        </div>

        <main className="relative z-10 w-full flex flex-col items-center">

          {/* ===== HERO — AIDA First View ===== */}
          {/* Phase 5: Sticky pin wrapper — hero stays pinned on desktop/tablet while content scrolls over */}
          <div ref={heroRef} className={device.isMobile ? 'w-full' : 'relative w-full'} style={device.isMobile ? undefined : { height: '115vh' }}>
            <section
              className={`w-full flex flex-col items-center ${device.isMobile ? 'justify-start' : 'justify-center'} px-4 sm:px-6 lg:px-8 pt-20 sm:pt-20 pb-28 sm:pb-6 relative ${device.isMobile ? '' : 'sticky top-0'}`}
              style={{ minHeight: device.isMobile ? 'calc(100dvh - 80px)' : '100svh' }}
              data-testid="hero-section"
            >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={device.prefersReducedMotion ? undefined : { scale: heroVideoScale, opacity: heroVideoOpacity }}
              className={`relative w-full max-w-xl md:max-w-2xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/10 cursor-pointer mb-4 md:mb-5 aspect-video flex-shrink-0 transition-all duration-500 ${enteredSite ? 'ring-2 ring-brand-yellow/40 shadow-[0_0_30px_rgba(244,196,48,0.15)]' : 'hover:shadow-[0_0_40px_rgba(244,196,48,0.2)] hover:-translate-y-1'}`}
              onClick={() => setEnteredSite(true)}
            >
              {!enteredSite ? (
                <>
                  <img src={`https://i.ytimg.com/vi/${landscapeId}/hqdefault.jpg`} alt="Featured Comedy" className="w-full h-full object-cover brightness-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div className="absolute -inset-3 bg-red-600/30 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-14 h-14 md:w-16 md:h-16 bg-[#E53935] rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(229,57,53,0.6)]">
                        <Play className="w-6 h-6 md:w-7 md:h-7 ml-1 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-[11px] font-semibold text-white/80 border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Tap to Watch
                    </span>
                  </div>
                </>
              ) : (
                <iframe
                  key={videoKey}
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${landscapeId}?rel=0&modestbranding=1&playsinline=1&autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                  title="Featured Content"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
              {enteredSite && (
                <button onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); setVideoKey(k => k + 1); }} className="absolute bottom-3 right-3 z-20 bg-black/60 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition-all border border-white/20 active:scale-95">
                  {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              )}
            </motion.div>

            <motion.div className="text-center space-y-2 md:space-y-3 w-full max-w-2xl mx-auto" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
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
              <p className={`text-sm sm:text-base md:text-lg font-medium ${lang === 'bn' ? 'font-bengali bengali-subtitle-glow' : 'text-gray-400'}`}>{tx.heroSubtitle}</p>
              <motion.div
                className="flex flex-row justify-center items-center gap-3 pt-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={device.prefersReducedMotion ? undefined : { opacity: heroCTAOpacity, y: heroCTAY }}
              >
                <button onClick={() => setLocation('/tools')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#1a1a2e]/80 hover:bg-[#1a1a2e] border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95 hover:border-white/30 whitespace-nowrap">
                  <Sparkles className="w-4 h-4 text-[#F4C430]" />Bong Kahini
                </button>
                <button onClick={() => { const u = channelId ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1` : `https://www.youtube.com/@BongBari?sub_confirmation=1`; window.open(u, '_blank', 'noopener,noreferrer'); }} className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#E53935] hover:bg-[#c62828] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(229,57,53,0.5)] transition-all active:scale-95 whitespace-nowrap">
                  <Youtube className="w-5 h-5 fill-white" />Subscribe
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

          {/* v4 Phase 1: Hero→Content Bridge — fills the gap with a cinematic reveal */}
          <motion.div
            className="w-full py-6 md:py-10 flex flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: '-30px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.p
              className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-white/30 font-semibold mb-3"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ margin: '-20px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {tx.bridgeLabel}
            </motion.p>
            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
              initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ margin: '-20px' }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <span className="text-white">{tx.bridgeTitlePrefix} </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-amber-400 to-yellow-500">{tx.bridgeTitleAccent}</span>
            </motion.h2>
            <motion.div
              className="w-16 h-[2px] bg-gradient-to-r from-transparent via-brand-yellow/50 to-transparent mt-4"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ margin: '-20px' }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </motion.div>

          {/* ===== LATEST COMEDY — Premium Cinematic Showcase ===== */}
          <motion.section
            className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-4 pb-10 md:pt-6 md:pb-14 relative overflow-visible"
            data-testid="latest-comedy-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: '-60px' }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: device.isMobile ? 0.06 : 0.1 } },
            }}
          >

            {/* v4 Phase 6: Premium section header with scroll-linked blur */}
            <SectionRevealTitle
              badge={tx.latestBadge}
              badgeIcon={Sparkles}
              title={
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-none tracking-tight">
                  {tx.latestTitlePrefix}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow via-yellow-400 to-amber-500">{tx.latestTitleAccent}</span>
                </h2>
              }
              subtitle={tx.latestSubtitle}
            >
              <motion.div className="flex justify-center mt-3">
                <a
                  href={channelId ? `https://www.youtube.com/channel/${channelId}` : `https://www.youtube.com/@BongBari`}
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
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 relative z-10"
              data-testid="latest-videos-grid"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: device.isMobile ? 0.04 : device.isTablet ? 0.08 : 0.1 } } }}
              onViewportEnter={(entry) => { const el = (entry?.target ?? null) as HTMLElement | null; if (el) el.classList.add('grid-visible'); }}
            >
              {[0, 1, 2, 3].map((i) => {
                const video = latestVideoData[i];
                if (!video) return null;
                const cardY = device.isMobile ? 12 : device.isTablet ? 18 : 24;
                // Phase 13: Scroll entrance tilt — desktop cards enter with subtle rotateX then spring flat
                const scrollTilt = device.isDesktop && !device.prefersReducedMotion ? 4 : 0;
                return (
                  <TiltCard
                    key={video.videoId + i}
                    variants={{
                      hidden: { opacity: 0, y: cardY, rotateX: scrollTilt },
                      visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    tiltEnabled={device.isDesktop && !device.prefersReducedMotion}
                    style={device.isDesktop ? { perspective: 600 } : undefined}
                  >
                    <YouTubeShort videoId={video.videoId} thumbnail={video.thumbnail} title={video.title} index={i} />
                  </TiltCard>
                );
              })}
            </motion.div>
          </motion.section>

          {/* v4 Phase 5: Breathing spacer between Latest & Most Loved */}
          <motion.div
            className="w-full max-w-7xl mx-auto px-6 md:px-12 py-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: '-20px' }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-brand-yellow/30"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </motion.div>

          {/* ===== MOST LOVED — Premium Cinematic Showcase ===== */}
          <motion.section
            className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-4 pb-10 md:pt-6 md:pb-14 relative overflow-visible"
            data-testid="loved-comedy-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: '-60px' }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: device.isMobile ? 0.06 : 0.1 } },
            }}
          >

            {/* v4 Phase 7: Premium Most Loved header */}
            <SectionRevealTitle
              badge={tx.lovedBadge}
              badgeIcon={Heart}
              accentColor="brand-red"
              title={
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-none tracking-tight">
                  {tx.lovedTitlePrefix}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-500 to-red-500">{tx.lovedTitleAccent}</span>
                </h2>
              }
              subtitle={tx.lovedSubtitle}
            >
              <motion.div className="flex justify-center mt-3">
                <a
                  href={channelId ? `https://www.youtube.com/channel/${channelId}/videos?view=0&sort=p` : `https://www.youtube.com/@BongBari/videos?view=0&sort=p`}
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
              className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 relative z-10"
              data-testid="loved-videos-grid"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: device.isMobile ? 0.04 : device.isTablet ? 0.08 : 0.1 } } }}
              onViewportEnter={(entry) => { const el = (entry?.target ?? null) as HTMLElement | null; if (el) el.classList.add('grid-visible'); }}
            >
              {[0, 1, 2, 3].map((i) => {
                const video = popularVideoData[i];
                if (!video) return null;
                const cardY = device.isMobile ? 12 : device.isTablet ? 18 : 24;
                // Phase 13: Scroll entrance tilt (reverse cascade — slight rotateX tilt on enter)
                const scrollTilt = device.isDesktop && !device.prefersReducedMotion ? -3 : 0;
                return (
                  <TiltCard
                    key={video.videoId + i}
                    variants={{
                      hidden: { opacity: 0, y: cardY, x: device.isMobile ? 0 : 15, rotateX: scrollTilt },
                      visible: { opacity: 1, y: 0, x: 0, rotateX: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
                    }}
                    tiltEnabled={device.isDesktop && !device.prefersReducedMotion}
                    style={device.isDesktop ? { perspective: 600 } : undefined}
                  >
                    <YouTubeShort videoId={video.videoId} thumbnail={video.thumbnail} title={video.title} index={i} rank={i + 1} />
                  </TiltCard>
                );
              })}
            </motion.div>
          </motion.section>

          {/* v4 Phase 5: Breathing spacer between Most Loved & Work with Us */}
          <motion.div
            className="w-full max-w-7xl mx-auto px-6 md:px-12 py-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: '-20px' }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-rose-400/30"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
          </motion.div>

          {/* ===== WORK WITH US — Premium Collaboration Portal ===== */}
          <motion.div ref={workRef} className="py-6 sm:py-10 w-full px-4 sm:px-6 lg:px-8 relative" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ margin: '-60px' }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            <section className="max-w-4xl mx-auto relative pb-4 sm:pb-8" data-testid="collaboration-section">
              <motion.div className="absolute inset-0 -z-10 bg-radial-glow" style={{ opacity: radialGlowOpacity }} />

              {/* v4 Phase 8: Premium Work with Us header — confident, not desperate */}
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
                    { icon: Star, label: tx.trustCreator, color: 'text-brand-yellow' },
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
              {/* Form card — delayed entrance + Phase 23 field reveal */}
              <motion.div
                className="form-shimmer-card relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-black/60 shadow-2xl border border-white/10 text-white backdrop-blur-sm"
                initial={{ opacity: 0, y: device.isMobile ? 15 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={device.isDesktop ? { scale: 1.01, transition: { duration: 0.2 } } : undefined}
                onViewportEnter={(entry) => {
                  const el = (entry?.target ?? null) as HTMLElement | null;
                  if (el) el.classList.add('form-revealed');
                }}
              >
                <div className="p-5 sm:p-8 md:p-12">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="collaboration-form">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>{tx.formName} <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="Your Name" data-testid="input-name" className="focus:ring-2 focus:ring-[#00E5FF]/40 focus:border-[#00E5FF]/40 transition-all" {...field} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Email {!hasPhone ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}</FormLabel>
                            <FormControl><Input type="email" placeholder="your@email.com" data-testid="input-email" className="focus:ring-2 focus:ring-[#00E5FF]/40 focus:border-[#00E5FF]/40 transition-all" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>{tx.formPhone} {!hasEmail ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}</FormLabel>
                          <FormControl>
                              <div className="flex gap-2 w-full" style={{ minWidth: 0 }}>
                                <Select value={field.value?.split(' ')[0] || "+91"} onValueChange={(code) => { const n = field.value?.split(' ').slice(1).join(' ') || ''; field.onChange(code + (n ? ' ' + n : '')); }}>
                                  <SelectTrigger className="w-[90px] flex-shrink-0 text-sm" data-testid="select-country-code"><SelectValue /></SelectTrigger>
                                  <SelectContent position="popper" className="z-[9999]">
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
                              <Input placeholder="Enter phone number" data-testid="input-phone" type="tel" value={field.value?.split(' ').slice(1).join(' ') || ''} onChange={(e) => { const n = e.target.value.replace(/[^0-9]/g, ''); const c = field.value?.split(' ')[0] || '+91'; field.onChange(c + (n ? ' ' + n : '')); }} onKeyPress={(e) => { if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') e.preventDefault(); }} className="flex-1 min-w-0" />
                            </div>
                          </FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="company" render={({ field }) => (
                        <FormItem><FormLabel>{tx.formCompany} <span className="text-red-500">*</span></FormLabel>
                          <FormControl><Input placeholder="Your Company or Brand" data-testid="input-company" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem><FormLabel>{tx.formMessage} <span className="text-gray-400">(Optional)</span></FormLabel>
                          <FormControl><Textarea rows={4} className="min-h-[120px] resize-none text-base" placeholder="Tell us about your collaboration idea..." data-testid="textarea-message" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <MagneticButton
                        disabled={collaborationMutation.isPending || !isFormValid}
                        className={`submit-btn-premium w-full py-4 rounded-2xl sm:rounded-full font-semibold text-base transition-all duration-300 no-rickshaw-sound overflow-hidden ${!isFormValid ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60' : 'bg-brand-red text-white hover:bg-red-600 hover:shadow-[0_0_20px_rgba(229,57,53,0.5)]'} ${collaborationMutation.isPending ? 'opacity-50' : ''}`}
                        data-testid="button-submit-collaboration"
                        strength={window.innerWidth < 768 ? 0 : (isFormValid ? 0.3 : 0)}
                        onClick={() => isFormValid && form.handleSubmit(onSubmit)()}
                      >
                        <Send className="mr-2 h-5 w-5" />
                        {collaborationMutation.isPending ? "Sending..." : isFormValid ? tx.formSubmit : tx.formFill}
                      </MagneticButton>
                    </form>
                  </Form>
                </div>
              </motion.div>
            </section>
          </motion.div>
        </main>
      </div>

      <Footer />
    </>
  );
};

export default Home;
