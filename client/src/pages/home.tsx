import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
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
// Removed PromoMarquee (promo API disabled)
// Parallax removed for performance
import { Youtube, Instagram, Phone, Mail, Twitter, Send, Home as HomeIcon, Users, TrendingUp, Smile, Edit3, Volume2, VolumeX, Play, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertCollaborationRequestSchema, type CollaborationRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import axios from "axios";
import { buildApiUrl } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}


const Home = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

      {/* Main Layout - "700 Years UX" - PREMIUM GLASS & MESH GRADIENT */}
      <div className="min-h-screen bg-black relative selection:bg-brand-yellow selection:text-black font-sans overflow-x-hidden pb-24 sm:pb-0">

        {/* 1. Dynamic Aurora Background (Premium & Powerful) */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          {/* Deep Base */}
          <div className="absolute inset-0 bg-neutral-950" />
          {/* Moving Orbs (Simulated Mesh) */}
          <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] bg-yellow-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft delay-1000" />
          <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <main className="relative z-10 w-full flex flex-col items-center">

          {/* ===== HERO — AIDA First View ===== */}
          <section className="w-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-6 relative" style={{ minHeight: '100svh' }} data-testid="hero-section">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={`relative w-full max-w-xl md:max-w-2xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/10 cursor-pointer mb-4 md:mb-5 aspect-video flex-shrink-0 transition-all duration-500 ${enteredSite ? 'ring-2 ring-[#E53935]/60' : 'hover:shadow-[0_0_40px_rgba(229,57,53,0.3)] hover:-translate-y-1'}`}
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

            <motion.div className="text-center space-y-2 md:space-y-3 w-full max-w-2xl mx-auto" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Authentic{' '}
                <span className="relative inline-block pb-1">
                  <span className="text-[#F4C430] drop-shadow-[0_2px_12px_rgba(244,196,48,0.5)]">Bengali</span>
                  {/* Animated SVG pen-stroke underline — draws itself on load */}
                  <svg
                    className="absolute -bottom-1 left-0 w-full overflow-visible pointer-events-none"
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
                {' '}Comedy
              </h1>
              <p className="font-bengali text-sm sm:text-base md:text-lg text-gray-400 font-medium">ঘরোয়া পরিবেশের মজার গল্প</p>
              <div className="flex flex-row justify-center items-center gap-3 pt-1">
                <button onClick={() => setLocation('/tools')} className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#1a1a2e]/80 hover:bg-[#1a1a2e] border border-white/15 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95 hover:border-white/30 whitespace-nowrap">
                  <Sparkles className="w-4 h-4 text-[#F4C430]" />Bong Kahini
                </button>
                <button onClick={() => { const u = channelId ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1` : `https://www.youtube.com/@BongBari?sub_confirmation=1`; window.open(u, '_blank', 'noopener,noreferrer'); }} className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#E53935] hover:bg-[#c62828] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(229,57,53,0.5)] transition-all active:scale-95 whitespace-nowrap">
                  <Youtube className="w-5 h-5 fill-white" />Subscribe
                </button>
              </div>
            </motion.div>

            {/* Scroll indicator removed — above-the-fold video + CTA is enough visual anchor */}
          </section>

          {/* ===== LATEST COMEDY ===== */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
            <section data-testid="latest-comedy-section">
              <motion.div className="flex flex-col mb-10 items-start text-left w-full" initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00E5FF] to-blue-400 mb-2 tracking-tight">LATEST COMEDY</h2>
                <div className="h-1.5 w-28 bg-gradient-to-r from-[#00E5FF] to-blue-400 rounded-full" />
                <p className="bangla-text text-base text-gray-400 mt-2 font-semibold">সর্বশেষ কমেডি কালেকশন</p>
              </motion.div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-testid="latest-videos-grid">
                {[0, 1, 2, 3].map((i) => {
                  const video = latestVideoData[i];
                  if (!video) return null;
                  return (
                    <div key={video.videoId + i} className="rounded-3xl p-[1px] bg-gradient-to-br from-[#00E5FF]/30 via-blue-500/10 to-indigo-500/25 hover:from-[#00E5FF]/55 hover:to-indigo-500/45 transition-all duration-500 h-full shadow-[0_0_18px_rgba(0,229,255,0.08)] hover:shadow-[0_0_35px_rgba(0,229,255,0.22)]">
                      <motion.div className="rounded-3xl overflow-hidden bg-zinc-950/90 cursor-pointer h-full hover:bg-zinc-950 transition-colors duration-300" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}>
                        <YouTubeShort videoId={video.videoId} thumbnail={video.thumbnail} title={video.title} />
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ===== MOST LOVED ===== */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
            <section data-testid="loved-comedy-section">
              <motion.div className="flex flex-col mb-10 items-start text-left w-full" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, ease: 'easeOut' }}>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#D500F9] to-pink-400 mb-2 tracking-tight">MOST LOVED</h2>
                <div className="h-1.5 w-28 bg-gradient-to-r from-[#D500F9] to-pink-400 rounded-full" />
                <p className="bangla-text text-base text-gray-400 mt-2 font-semibold">দর্শকদের পছন্দের তালিকা</p>
              </motion.div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" data-testid="loved-videos-grid">
                {[0, 1, 2, 3].map((i) => {
                  const video = popularVideoData[i];
                  if (!video) return null;
                  return (
                    <div key={video.videoId + i} className="rounded-3xl p-[1px] bg-gradient-to-br from-[#D500F9]/30 via-pink-500/10 to-rose-500/25 hover:from-[#D500F9]/55 hover:to-rose-500/45 transition-all duration-500 h-full shadow-[0_0_18px_rgba(213,0,249,0.08)] hover:shadow-[0_0_35px_rgba(213,0,249,0.22)]">
                      <motion.div className="relative rounded-3xl overflow-hidden bg-zinc-950/90 cursor-pointer h-full hover:bg-zinc-950 transition-colors duration-300" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}>
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-pink-500/40 text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />POPULAR
                        </div>
                        <YouTubeShort videoId={video.videoId} thumbnail={video.thumbnail} title={video.title} />
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ===== WORK WITH US ===== */}
          <motion.div className="py-8 w-full px-4 sm:px-6 lg:px-8" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, ease: 'easeOut' }}>
            <section className="max-w-4xl mx-auto relative pb-8 sm:pb-16" data-testid="collaboration-section">
              <div className="absolute inset-0 -z-10 bg-radial-glow opacity-30"></div>
              {/* Section heading — above the card, not inside it */}
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-md tracking-tight">Work with Us</h2>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bengali font-bold text-yellow-400/90">আমাদের সাথে কাজ করুন</h3>
                <p className="mt-3 sm:mt-4 text-center text-gray-300 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base md:text-lg">
                  Ready to collaborate? Let's create some amazing Bengali comedy content together!<br />
                  <span className="font-bengali text-xs sm:text-sm md:text-base text-gray-400">কোলাবোরেট করতে প্রস্তুত? চলুন একসাথে দুর্দান্ত বাংলা কমেডি কন্টেন্ট তৈরি করি!</span>
                </p>
              </div>
              {/* Form card — only the form fields inside */}
              <motion.div className="relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-black/60 shadow-2xl border border-white/10 text-white backdrop-blur-sm" whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}>
                <div className="p-5 sm:p-8 md:p-12">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="collaboration-form">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem><FormLabel>Name / নাম <span className="text-red-500">*</span></FormLabel>
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
                        <FormItem><FormLabel>Phone / ফোন {!hasEmail ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}</FormLabel>
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
                        <FormItem><FormLabel>Company / Brand <span className="text-red-500">*</span></FormLabel>
                          <FormControl><Input placeholder="Your Company or Brand" data-testid="input-company" {...field} value={field.value ?? ''} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem><FormLabel>Message / বার্তা <span className="text-gray-400">(Optional)</span></FormLabel>
                          <FormControl><Textarea rows={4} className="min-h-[120px] resize-none text-base" placeholder="Tell us about your collaboration idea..." data-testid="textarea-message" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                      <MagneticButton
                        disabled={collaborationMutation.isPending || !isFormValid}
                        className={`w-full py-4 rounded-2xl sm:rounded-full font-semibold text-base transition-all duration-300 no-rickshaw-sound overflow-hidden ${!isFormValid ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60' : 'bg-brand-red text-white hover:bg-red-600 hover:shadow-[0_0_20px_rgba(229,57,53,0.5)]'} ${collaborationMutation.isPending ? 'opacity-50' : ''}`}
                        data-testid="button-submit-collaboration"
                        strength={window.innerWidth < 768 ? 0 : (isFormValid ? 0.3 : 0)}
                        onClick={() => isFormValid && form.handleSubmit(onSubmit)()}
                      >
                        <Send className="mr-2 h-5 w-5" />
                        {collaborationMutation.isPending ? "Sending..." : isFormValid ? "Send Message" : "Fill Name, Company & Contact Info *"}
                      </MagneticButton>
                    </form>
                  </Form>
                </div>
              </motion.div>
            </section>
          </motion.div>
        </main>
      </div>

      {/* ── PREMIUM GLASS FOOTER ── */}
      <footer className="relative mt-0" data-testid="footer">
        {/* Top glow edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F4C430]/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F4C430]/6 to-transparent pointer-events-none" />

        <div className="bg-black/60 backdrop-blur-2xl border-t border-white/[0.07]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-28 sm:pb-10">

            {/* ── 3-column grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 mb-10 text-center sm:text-left">

              {/* Brand */}
              <div className="flex flex-col items-center sm:items-start gap-3">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="Bong Bari logo" className="w-9 h-9 rounded-xl ring-1 ring-white/10" />
                  <span className="text-white font-bold text-lg tracking-tight">বং বাড়ি</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed max-w-[200px] font-bengali">
                  ঘরোয়া পরিবেশের মজার গল্প
                </p>
                <p className="text-gray-600 text-[11px]">Authentic Bengali Comedy · Kolkata</p>
              </div>

              {/* Navigation */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-white/30 text-[9px] uppercase tracking-[0.15em] font-semibold mb-1">Explore</p>
                {([['/', 'Home'], ['/about', 'About'], ['/blog', 'Blog'], ['/faq', 'FAQ'], ['/tools', 'Free Tools'], ['/work-with-us', 'Collaborate']] as [string, string][]).map(([href, label]) => (
                  <a key={href} href={href} className="text-gray-400 hover:text-[#F4C430] text-sm transition-colors duration-200 leading-none py-0.5">{label}</a>
                ))}
              </div>

              {/* Social + Contact */}
              <div className="flex flex-col items-center sm:items-end gap-3">
                <p className="text-white/30 text-[9px] uppercase tracking-[0.15em] font-semibold">Connect</p>
                <button
                  onClick={() => window.open('https://youtube.com/@bongbari', '_blank')}
                  data-testid="button-youtube-footer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E53935]/10 hover:bg-[#E53935]/25 border border-[#E53935]/25 hover:border-[#E53935]/50 text-[#E53935] text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 w-[140px] justify-center"
                >
                  <Youtube className="w-4 h-4 fill-[#E53935] shrink-0" />
                  YouTube
                </button>
                <button
                  onClick={() => window.open('https://instagram.com/thebongbari', '_blank')}
                  data-testid="button-instagram-footer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/25 hover:border-purple-500/50 text-purple-400 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 w-[140px] justify-center"
                >
                  <Instagram className="w-4 h-4 shrink-0" />
                  Instagram
                </button>
                <a href="mailto:team@bongbari.com" className="text-gray-600 hover:text-[#F4C430] text-xs transition-colors duration-200 mt-1">team@bongbari.com</a>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />

            {/* Bottom bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-left">
                <p className="text-gray-500 text-xs font-medium" data-testid="footer-text">© Bong Bari 2025 Kolkata</p>
                <p className="text-gray-700 text-[11px] bangla-text mt-0.5" data-testid="footer-text-bengali">© বং বাড়ি ২০২৫ কলকাতা</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <a href="/privacy" className="hover:text-[#F4C430] transition-colors duration-200">Privacy Policy</a>
                <span className="text-white/10">|</span>
                <a href="/terms" className="hover:text-[#F4C430] transition-colors duration-200">Terms &amp; Conditions</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Home;
