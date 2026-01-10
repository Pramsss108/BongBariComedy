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
  const fallbackVideoData: YouTubeVideo[] = [
    { videoId: "JetnSt8yP74", title: "Ke Kise Kom? | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-01" },
    { videoId: "JetnSt8yP74", title: "Funny Bengali Drama | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-02" },
    { videoId: "JetnSt8yP74", title: "Comedy Skit | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-03" },
    { videoId: "JetnSt8yP74", title: "Laugh Riot | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-04" },
    { videoId: "JetnSt8yP74", title: "Family Fun | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-05" },
    { videoId: "JetnSt8yP74", title: "Weekend Vibes | Bong Bari", thumbnail: "https://i.ytimg.com/vi/JetnSt8yP74/hqdefault.jpg", publishedAt: "2024-01-06" },
  ];

  const latestVideoData = latestVideos || [];
  const popularVideoData = popularVideos || [];

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

      {/* Mobile Sticky Nav - Glass Pill Restored */}
      <MobileNavBar />

      {/* Main Layout - "700 Years UX" - PREMIUM GLASS & MESH GRADIENT */}
      <div className="min-h-screen bg-black relative selection:bg-brand-yellow selection:text-black font-sans overflow-x-hidden pb-32 sm:pb-0">

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

          {/* HERO SECTION - Responsive Breakpoints (Mobile First vs Desktop) */}
          {/* Mobile: Top Padding 16 (pt-16) to show button above fold */}
          {/* Desktop: Top Padding 24 (md:pt-24) for spacious look */}
          <div className="relative w-full flex flex-col items-center justify-start pt-16 md:pt-24 pb-12 px-0 sm:px-4 hero-section">

            {/* 2. Video Container - Responsive Sizing */}
            {/* Mobile: Full Width + Aspect Video */}
            {/* Desktop: Max-width 4xl (to prevent "Crushed" look) + margins */}
            <div
              className="relative w-full md:max-w-4xl lg:max-w-5xl aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl z-10 bg-black group mb-6 md:mb-10 cursor-pointer border border-white/10 ring-1 ring-white/5 mx-auto"
              style={{ boxShadow: '0 0 50px -12px rgba(0,0,0,0.5)' }} /* Deep Ambient Shadow */
              onClick={() => setEnteredSite(true)}
            >
              {!enteredSite ? (
                <>
                  <img
                    src={`https://i.ytimg.com/vi/${landscapeId}/hqdefault.jpg`}
                    alt="Featured Comedy"
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  {/* Premium Dark Glass Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors backdrop-blur-[2px]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm transform group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                    <span className="text-white text-xs sm:text-sm font-medium drop-shadow-md bg-black/60 px-4 py-2 rounded-full backdrop-blur-md">
                      Tap to Watch (Unmute)
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

              {/* Mute Toggle (Only visible if playing) */}
              {enteredSite && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); setVideoKey(k => k + 1); }}
                  className="absolute bottom-6 right-6 z-20 bg-black/60 hover:bg-brand-red text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20 hover:scale-110 active:scale-95"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              )}
            </div>

            {/* 3. Subtitles & CTAs - "Ultra-Premium Glass Interface" */}
            <motion.div
              className="flex flex-col items-center gap-4 md:gap-6 px-4 w-full max-w-sm md:max-w-md mx-auto mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="text-center space-y-2 md:space-y-3 relative">
                {/* Glow Effect behind Text */}
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full pointer-events-none mix-blend-screen" />
                
                {/* English Title - Crisp White on Dark */}
                <h1 
                  className="relative font-bold tracking-tight leading-none text-white drop-shadow-2xl text-2xl md:text-4xl" 
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                >
                  Authentic <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500">Bengali</span> Comedy
                </h1>
                
                {/* Bangla Subtitle - Silver/Metallic */}
                <p 
                  className="bangla-text text-zinc-400 font-medium leading-relaxed text-lg md:text-xl" 
                  style={{ letterSpacing: '0.01em' }}
                >
                  ঘরোয়া পরিবেশের মজার গল্প
                </p>
              </div>

              {/* CTAs - Side-by-Side on Mobile (Fit Above Fold) / Stacked on Tiny screens */}
              <div className="flex flex-row md:flex-col gap-3 w-full items-center justify-center mt-2">
                {/* Bong Kahini - "The Glass Pill" */}
                 <Button
                  onClick={() => setLocation('/tools')}
                  className="flex-1 md:w-full relative overflow-hidden group backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 py-6 md:py-7 text-base md:text-lg font-bold rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <Sparkles className="w-4 h-4 md:w-5 md:h-5 mr-2 text-yellow-400 fill-yellow-400/20" />
                    <span className="tracking-wide">Bong Kahini</span>
                </Button>

                {/* Subscribe - "Neon Red Pulse" */}
                <Button
                  onClick={() => {
                    const subscribeUrl = channelId
                      ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`
                      : `https://www.youtube.com/@BongBari?sub_confirmation=1`;
                    window.open(subscribeUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 md:w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 py-6 md:py-7 text-base md:text-lg font-bold rounded-xl md:rounded-2xl shadow-lg shadow-red-900/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                   <Youtube className="w-5 h-5 md:w-6 md:h-6 fill-white mr-2" />
                   Subscribe
                </Button>
              </div>
            </motion.div >
          </div >

          {/* Latest Comedy Section (Horizontal Scroll on Mobile) */}
          <div className="py-8 w-full max-w-7xl mx-auto px-0 sm:px-4">
            {/* Latest Comedy Section - Modern Left Align */}
            <section className="mb-4 sm:mb-8 w-full max-w-6xl mx-auto" data-testid="latest-comedy-section">

              <div className="flex flex-col mb-4 px-3 items-start text-left">
                <div className="flex flex-col sm:flex-row items-baseline gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
                    Latest Comedy
                  </h3>
                  <span className="text-zinc-500 text-xs sm:text-sm tracking-wide font-medium">
                    সর্বশেষ কমেডি
                  </span>
                </div>
                <div className="h-1 w-12 bg-blue-500/50 rounded-full mt-1"></div>
              </div>

              <div className="w-full px-2">
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full mx-auto min-h-[200px]"
                  data-testid="latest-videos-grid"
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const video = latestVideoData[i] || fallbackVideoData[i];
                    return (
                      <div
                        key={video.videoId + i}
                        className={`transition-opacity duration-300 hover:opacity-90`}
                      >
                        <YouTubeShort
                          videoId={video.videoId}
                          thumbnail={video.thumbnail}
                          title={video.title}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          {/* Most Loved Comedy Section (Horizontal Scroll on Mobile) */}
          <div className="py-8 w-full max-w-7xl mx-auto px-0 sm:px-4">
            <section className="mb-3 sm:mb-4 lg:mb-6" data-testid="loved-comedy-section">
              <div className="flex flex-col mb-4 px-2 items-start text-left">
                <div className="flex flex-col sm:flex-row items-baseline gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                    Most Loved
                  </h3>
                  <span className="text-zinc-500 text-xs sm:text-sm tracking-wide font-medium">
                    জনপ্রিয় কমেডি
                  </span>
                </div>
                <div className="h-1 w-12 bg-purple-500/50 rounded-full mt-1"></div>
              </div>
              <motion.p
                className="text-left text-gray-500 mb-6 text-xs sm:text-sm italic px-2"
                data-testid="loved-comedy-subtitle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                If others love it → you'll love it too!
              </motion.p>

              <div className="w-full px-2">
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full mx-auto min-h-[200px]"
                  data-testid="loved-videos-grid"
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const video = popularVideoData[i] || fallbackVideoData[5 - i] || fallbackVideoData[0]; // Logic to vary data if possible
                    return (
                      <div
                        key={video.videoId + i}
                        className={`transition-opacity duration-300 hover:opacity-90`}
                      >
                        <YouTubeShort
                          videoId={video.videoId}
                          thumbnail={video.thumbnail}
                          title={video.title}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>





          {/* Latest Memes */}
          {
            latestMemes.length > 0 && (
              <section className="py-6 sm:py-8 lg:py-12">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-blue mb-4">Latest Memes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latestMemes.map((m: any) => (
                    <div key={m.id} className="bg-white rounded-lg p-4 shadow">
                      <div className="text-xs text-gray-500 mb-1">{m.dateKey}</div>
                      <p className="text-gray-800 whitespace-pre-wrap">{m.idea}</p>
                    </div>
                  ))}
                </div>
              </section>
            )
          }
          {/* Collaboration Form */}
          <div className="py-8">
            <section className="mb-2 sm:mb-3 py-1 sm:py-2" data-testid="collaboration-section">
              <div className="max-w-4xl mx-auto">
                {/* Work with Us Header with Yellow Background */}
                <motion.div
                  className="bg-brand-yellow rounded-xl sm:rounded-2xl p-2 sm:p-3 lg:p-4 mb-0 text-center shadow-lg transition-all duration-400"
                  whileHover={{
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                >
                  <h3 className="font-bold text-brand-blue mb-1 sm:mb-2 hover-pulse cursor-pointer transition-all duration-300" data-testid="collaboration-title-english" style={{ fontSize: 'clamp(2.5rem, 8vw, 8rem)' }}>
                    Work with Us
                  </h3>
                  <h4 className="font-bold text-gray-800 bangla-text hover-wobble cursor-pointer transition-all duration-300" data-testid="collaboration-title-bengali" style={{ fontSize: 'clamp(2rem, 6vw, 6rem)' }}>
                    আমাদের সাথে কাজ করুন
                  </h4>
                </motion.div>

                <motion.div
                  whileHover={{
                    scale: 1.01,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Card className="bg-white shadow-lg transition-all duration-300 hover:shadow-2xl">
                    <CardContent className="p-3 sm:p-4 lg:p-6">
                      <p className="text-center text-gray-700 mb-2 sm:mb-3 text-base sm:text-lg">
                        Ready to collaborate? Let's create some amazing Bengali comedy content together!
                      </p>
                      <p className="text-center text-gray-700 mb-3 sm:mb-4 bangla-text text-base sm:text-lg">
                        কোলাবোরেট করতে প্রস্তুত? চলুন একসাথে দুর্দান্ত বাংলা কমেডি কন্টেন্ট তৈরি করি!
                      </p>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6" data-testid="collaboration-form">
                          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name / নাম <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Your Name"
                                      data-testid="input-name"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email {!hasPhone ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder="your@email.com"
                                      data-testid="input-email"
                                      {...field}
                                      value={field.value ?? ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone / ফোন {!hasEmail ? <span className="text-red-500">*</span> : <span className="text-gray-400">(Optional)</span>}</FormLabel>
                                  <FormControl>
                                    <div className="flex gap-2">
                                      <Select
                                        value={field.value?.split(' ')[0] || "+91"}
                                        onValueChange={(code) => {
                                          const number = field.value?.split(' ').slice(1).join(' ') || '';
                                          field.onChange(code + (number ? ' ' + number : ''));
                                        }}
                                      >
                                        <SelectTrigger className="w-24" data-testid="select-country-code">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
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
                                      <Input
                                        placeholder="Enter phone number"
                                        data-testid="input-phone"
                                        type="tel"
                                        value={field.value?.split(' ').slice(1).join(' ') || ''}
                                        onChange={(e) => {
                                          // Only allow numbers - remove any non-digit characters
                                          const numbersOnly = e.target.value.replace(/[^0-9]/g, '');
                                          const code = field.value?.split(' ')[0] || '+91';
                                          field.onChange(code + (numbersOnly ? ' ' + numbersOnly : ''));
                                        }}
                                        onKeyPress={(e) => {
                                          // Prevent typing non-numeric characters
                                          if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                                            e.preventDefault();
                                          }
                                        }}
                                        className="flex-1"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company / Brand <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Your Company or Brand"
                                    data-testid="input-company"
                                    {...field}
                                    value={field.value ?? ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message / বার্তা <span className="text-gray-400">(Optional)</span></FormLabel>
                                <FormControl>
                                  <Textarea
                                    rows={4}
                                    className="min-h-[120px] resize-none text-base"
                                    placeholder="Tell us about your collaboration idea... (Optional)"
                                    data-testid="textarea-message"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <MagneticButton
                            disabled={collaborationMutation.isPending || !isFormValid}
                            className={`w-full py-4 sm:py-3 rounded-full font-semibold text-base sm:text-lg hover-lift min-h-[52px] touch-manipulation transition-all duration-400 no-rickshaw-sound ${!isFormValid
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                              : 'bg-brand-red text-white hover:bg-red-600 hover:scale-110 hover:-translate-y-3 hover:shadow-2xl'
                              } ${collaborationMutation.isPending ? 'opacity-50' : ''}`}
                            data-testid="button-submit-collaboration"
                            strength={isFormValid ? 0.5 : 0}
                            onClick={() => isFormValid && form.handleSubmit(onSubmit)()}
                          >
                            <Send className="mr-2 h-5 w-5" />
                            {collaborationMutation.isPending ? "Sending..." : isFormValid ? "Send Message" : "Fill Name, Company & Contact Info *"}
                          </MagneticButton>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-brand-blue text-white py-4 sm:py-6 mt-0" data-testid="footer">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          {/* Enhanced Social Buttons */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <button
              className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 sm:px-5 py-3 sm:py-2 rounded-full text-sm sm:text-base flex items-center gap-2 transition-all duration-400 hover:scale-150 hover:-translate-y-4 hover:rotate-6 hover:shadow-2xl active:scale-95 min-h-[44px] touch-manipulation shadow-md"
              onClick={() => window.open('https://youtube.com/@bongbari', '_blank')}
              data-testid="button-youtube-footer"
            >
              <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">YouTube</span>
            </button>
            <button
              className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white px-4 sm:px-5 py-3 sm:py-2 rounded-full text-sm sm:text-base flex items-center gap-2 transition-all duration-400 hover:scale-150 hover:-translate-y-4 hover:-rotate-6 hover:shadow-2xl active:scale-95 min-h-[44px] touch-manipulation shadow-md"
              onClick={() => window.open('https://instagram.com/thebongbari', '_blank')}
              data-testid="button-instagram-footer"
            >
              <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Instagram</span>
            </button>
          </div>

          <p className="text-base sm:text-lg font-medium" data-testid="footer-text">
            © Bong Bari 2025 Kolkata
          </p>
          <p className="text-sm sm:text-base opacity-80 mt-1 sm:mt-2 bangla-text" data-testid="footer-text-bengali">
            © বং বাড়ি ২০২৫ কলকাতা
          </p>
          <div className="mt-4 text-xs opacity-80" style={{ fontSize: '0.85rem' }}>
            <a href="/privacy" className="mx-1 underline hover:text-yellow-200">Privacy Policy</a> |
            <a href="/terms" className="mx-1 underline hover:text-yellow-200">Terms &amp; Conditions</a> |
            <a href="mailto:team@bongbari.com" className="mx-1 underline hover:text-yellow-200">team@bongbari.com</a>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Home;
