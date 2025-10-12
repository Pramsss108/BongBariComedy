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
import SEOHead from "@/components/seo-head";
// Removed PromoMarquee (promo API disabled)
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { Youtube, Instagram, Phone, Mail, Twitter, Send, Home as HomeIcon, Users, TrendingUp, Smile, Edit3, Volume2, VolumeX } from "lucide-react";
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
  // Compact hero mode when viewport height is small; helps keep video + titles + CTAs above fold
  const [compactHero, setCompactHero] = useState(false);
  // Fine-grained scale (0.85 - 1) applied to hero cluster to guarantee fold fit
  const [heroScale, setHeroScale] = useState(1);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [heroReady, setHeroReady] = useState(false);
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
      } catch {}
    };
    const timeouts = [450, 1100, 2100];
    timeouts.forEach(t => setTimeout(attemptVolume, t));
  }, [videoKey, isMuted, enteredSite]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const force = params.get('compact');
    const assess = () => {
      if (force === '1') {
        setCompactHero(true);
      } else {
        // Force compact mode for better above-fold visibility
        setCompactHero(true);
      }
    };
    assess();
    window.addEventListener('resize', assess);
    return () => window.removeEventListener('resize', assess);
  }, []);

  // Measure hero content height and scale down if it exceeds available viewport after nav.
  useLayoutEffect(() => {
    const compute = () => {
      const el = heroRef.current;
      if (!el) return;
      // Approximate nav + top margin height (adjust if nav height changes)
      const navEstimate = 86; // px
      const available = window.innerHeight - navEstimate - 8; // keep a tiny breathing space
      const rect = el.getBoundingClientRect();
      // Reset scale first to measure intrinsic height
      el.style.setProperty('--hero-scale', '1');
      let scale = 1;
      if (rect.height > available) {
        // allow deeper compression
        scale = Math.max(0.74, available / rect.height);
      }
      setHeroScale(scale);
      setHeroReady(true);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [compactHero]);

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

  // Watch all form values to check if all required fields are filled
  const watchedValues = form.watch();
  const hasEmail = watchedValues.email && watchedValues.email.trim() !== "";
  // Check if phone has actual digits after the country code
  const phoneDigits = watchedValues.phone?.split(' ').slice(1).join('') || '';
  const hasPhone = phoneDigits.trim() !== "" && phoneDigits.length > 0;
  const hasContactMethod = hasEmail || hasPhone; // At least one contact method required
  const isFormValid = watchedValues.name && 
                     watchedValues.company && 
                     hasContactMethod && // Either email OR phone required
                     watchedValues.name.trim() !== "" &&
                     watchedValues.company.trim() !== "";

  const collaborationMutation = useMutation({
    mutationFn: (data: CollaborationRequest) => apiRequest('/api/collaboration-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    onSuccess: (response: any) => {
      // Play funny "sent successfully" sound
      playFunnySubmissionSound();
      
      toast({
        title: "Success!",
        description: "Your collaboration request has been submitted. We'll get back to you soon!"
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  });


  const onSubmit = (data: CollaborationRequest) => {
    collaborationMutation.mutate(data);
  };

  // Fallback data in case API fails
  const fallbackVideoData = [
    {
      videoId: "pdjQpcVqxMU",
      thumbnail: "https://img.youtube.com/vi/pdjQpcVqxMU/hqdefault.jpg",
      title: "Bong Bari Comedy Short 1",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "8gdxQ_dgFv8", 
      thumbnail: "https://img.youtube.com/vi/8gdxQ_dgFv8/hqdefault.jpg",
      title: "Bong Bari Comedy Short 2",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "rGOvg5PJtXA",
      thumbnail: "https://img.youtube.com/vi/rGOvg5PJtXA/hqdefault.jpg",
      title: "Bong Bari Comedy Short 3",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "Gyo_QpZQuPU",
      thumbnail: "https://img.youtube.com/vi/Gyo_QpZQuPU/hqdefault.jpg",
      title: "Bong Bari Comedy Short 4",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "GJfHWL0ro_A",
      thumbnail: "https://img.youtube.com/vi/GJfHWL0ro_A/hqdefault.jpg",
      title: "Bong Bari Comedy Short 5",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "NRdGq7Ncqw0",
      thumbnail: "https://img.youtube.com/vi/NRdGq7Ncqw0/hqdefault.jpg",
      title: "Bong Bari Comedy Short 6",
      publishedAt: "2024-01-01T00:00:00Z"
    }
  ];

  // Fallback if API returns undefined OR an empty array
  const latestVideoData = (Array.isArray(latestVideos) && latestVideos.length > 0)
    ? latestVideos.slice(0, 3)
    : fallbackVideoData.slice(0, 3);

  const popularVideoData = (Array.isArray(popularVideos) && popularVideos.length > 0)
    ? popularVideos.slice(0, 3)
    : fallbackVideoData.slice(3, 6);

  // On mount, trigger refresh in the background (invisible to user)
  useEffect(() => {
    axios.post("/api/youtube/refresh").catch(() => {});
  }, []);

  // Latest published memes (public feed)
  const { data: latestMemes = [] } = useQuery({
    queryKey: ["/api/memes/public"],
    queryFn: async () => {
      const r = await fetch(buildApiUrl('/api/memes/public?limit=6'));
      if (!r.ok) return [];
      return r.json();
    }
  });

  return (
    <>
      <SEOHead
        title="Bong Bari - Bengali Comedy Shorts | বং বাড়ি"
        description="Bong Bari (বং বাড়ি) - Hilarious Bengali mother-son comedy shorts from Kolkata. Watch funny family moments, relatable content, and Bengali humor."
        ogTitle="Bong Bari - Bengali Comedy Shorts"
        ogDescription="Hilarious Bengali mother-son comedy shorts from Kolkata"
      />
      
  <ParallaxContainer>
        <main className="relative z-10 bg-brand-yellow min-h-screen">
          <div className="mobile-container">

          {/* HERO CLUSTER (scales to fit) */}
          <div
            ref={heroRef}
            style={{
              transform: `scale(${heroScale})`,
              transformOrigin: 'top center',
              transition: 'transform 220ms ease'
            }}
            aria-hidden={!heroReady ? 'true' : 'false'}
            className="mb-6"
          >
            <motion.div
              className={`text-center pt-1.5 sm:pt-2.5 lg:pt-3 pb-0.5 sm:pb-1 lg:pb-1.5 transition-all ${compactHero ? 'scale-[0.99] sm:scale-[0.97] origin-top' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <h1 className={`font-bold text-gray-900 leading-tight ${compactHero ? 'text-[1.15rem] sm:text-2xl md:text-[1.75rem] lg:text-[2.15rem] mb-[2px]' : 'text-[1.45rem] sm:text-[1.95rem] md:text-[2.35rem] lg:text-[2.85rem] mb-1 sm:mb-2'}`}>
                Welcome to <span className="text-brand-blue">Bong Bari</span>
              </h1>
              <h2 className={`font-bold text-gray-800 bangla-text leading-tight ${compactHero ? 'text-base sm:text-xl md:text-[1.35rem] lg:text-[1.85rem]' : 'text-lg sm:text-xl md:text-[1.55rem] lg:text-[2rem]'}`}>
                <span className="text-brand-red">বং বাড়িতে</span> স্বাগতম
              </h2>
            </motion.div>
            {/* PromoMarquee removed: placeholder strip could go here later */}
            <motion.div
              className="w-full mx-auto mobile-spacing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {(() => {
                const landscapeId = heroVideoOverride || (latestVideos && latestVideos[0]?.videoId) || fallbackVideoData[0].videoId;
                // Gate iframe: before entering site (decision) show a placeholder skeleton so layout height stable
                return (
                  <div className="mobile-video-container shadow-md lg:shadow-lg border border-brand-blue/70 bg-black relative">
                    {!enteredSite && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                          <div className="w-[80%] h-[80%] bg-gray-600/40 rounded-lg animate-pulse" />
                        </div>
                      </div>
                    )}
                    {enteredSite && (
                    <iframe
                      key={videoKey}
                      ref={iframeRef}
                      src={`https://www.youtube-nocookie.com/embed/${landscapeId}?rel=0&modestbranding=1&playsinline=1&autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                      title="Featured Bengali Comedy Video"
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      loading="lazy"
                      onLoad={() => {
                        requestAnimationFrame(() => {
                          const el = heroRef.current; if (!el) return; const navEstimate = 86; const available = window.innerHeight - navEstimate - 8; const rect = el.getBoundingClientRect();
                          const needed = rect.height > available ? Math.max(0.78, available / rect.height) : 1; setHeroScale(needed);
                        });
                      }}
                      allowFullScreen
                    ></iframe>
                    )}
                    <button
                      type="button"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      onClick={() => {
                        setIsMuted(m => !m);
                        setVideoKey(k => k + 1); // remount to apply new mute param reliably
                      }}
                      className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  </div>
                );
              })()}
            </motion.div>
            <motion.div
              className={`text-center ${compactHero ? 'mb-1.5 sm:mb-2' : 'mb-2.5 sm:mb-3 lg:mb-4'} transition-all`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
            >
          <p className={`text-gray-700 max-w-2xl mx-auto font-medium px-2 ${compactHero ? 'text-[10px] sm:text-[11px] md:text-xs lg:text-sm leading-snug' : 'text-[11px] sm:text-xs md:text-sm lg:text-base leading-snug'}`}
            style={{ marginBottom: compactHero ? '1px' : '2px' }}>
                Experience authentic Bengali family comedy that feels like home
              </p>
          <p className={`text-gray-700 bangla-text max-w-2xl mx-auto font-medium px-2 ${compactHero ? 'text-[9px] sm:text-[10px] md:text-[11px] lg:text-sm leading-tight' : 'text-[10px] sm:text-[11px] md:text-xs lg:text-sm leading-tight'}`}
                style={{ marginTop: 0 }}
              >
                ঘরোয়া পরিবেশের মজার গল্প যা আপনার নিজের বাড়ির মতোই লাগবে
              </p>
            </motion.div>
            <motion.div
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3.5 ${compactHero ? 'mb-4 sm:mb-6' : 'mb-6 sm:mb-8'} transition-all`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.6 }}
            >
              <Button
                onClick={() => setLocation('/tools')}
                className={`bg-brand-red hover:bg-brand-red/90 text-white font-semibold shadow-md hover:shadow-lg transition rounded-full ${compactHero ? 'px-5 py-2.5 text-[11px] sm:text-sm' : 'px-5 py-3 text-xs sm:text-sm'}`}
              >
                Bong Kahini
                <span className="ml-2 hidden sm:inline text-xs font-normal">Free AI Tool</span>
              </Button>
              <Button
                onClick={() => {
                  const subscribeUrl = channelId
                    ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1`
                    : `https://www.youtube.com/@BongBari?sub_confirmation=1`;
                  window.open(subscribeUrl, '_blank', 'noopener,noreferrer');
                }}
                className={`bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold shadow-md hover:shadow-lg transition rounded-full ${compactHero ? 'px-5 py-2.5 text-[11px] sm:text-sm' : 'px-5 py-3 text-xs sm:text-sm'}`}
              >
                Subscribe
              </Button>
              <Button
                onClick={() => setLocation('/work-with-us')}
                variant="outline"
                className={`border-2 border-brand-blue text-brand-blue hover:bg-brand-blue/10 font-semibold rounded-full ${compactHero ? 'px-5 py-2.5 text-[11px] sm:text-sm' : 'px-5 py-3 text-xs sm:text-sm'}`}
              >
                Collab?
              </Button>
            </motion.div>
          </div>

          {/* Latest Comedy Section (FOMO) */}
          <ParallaxSection speed={0.4} delay={0.2}>
            <section className="mb-6 sm:mb-8 lg:mb-10" data-testid="latest-comedy-section">
            <motion.h3 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-brand-blue mb-2 sm:mb-3 hover-wobble cursor-pointer transition-all duration-300" 
              data-testid="latest-comedy-title-english"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Latest Comedy
            </motion.h3>
            <motion.h4 
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-800 mb-2 sm:mb-3 bangla-text hover-bounce cursor-pointer transition-all duration-300" 
              data-testid="latest-comedy-title-bengali"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              সর্বশেষ কমেডি
            </motion.h4>
            <motion.p 
              className="text-center text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base italic" 
              data-testid="latest-comedy-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              New content keeps them coming back - Don't miss out!
            </motion.p>
            
            <div className="flex flex-col items-center">
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 max-w-6xl mx-auto mt-2" data-testid="latest-videos-grid">
                {[0,1,2].map((i) => {
                  const video = latestVideoData[i] || fallbackVideoData[i];
                  return (
                    <motion.div
                      key={video.videoId}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.6, 
                        delay: i * 0.1,
                        ease: [0.25, 0.25, 0.25, 1]
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <YouTubeShort
                        videoId={video.videoId}
                        thumbnail={video.thumbnail}
                        title={video.title}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
            </section>
          </ParallaxSection>

          {/* Most Loved Comedy Section (Social Proof) */}
          <ParallaxSection speed={0.4} delay={0.3}>
            <section className="mb-3 sm:mb-4 lg:mb-6" data-testid="loved-comedy-section">
            <motion.h3 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-brand-red mb-2 sm:mb-3 hover-wobble cursor-pointer transition-all duration-300" 
              data-testid="loved-comedy-title-english"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              ⭐ Most Loved Comedy
            </motion.h3>
            <motion.h4 
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-800 mb-2 sm:mb-3 bangla-text hover-bounce cursor-pointer transition-all duration-300" 
              data-testid="loved-comedy-title-bengali"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              ⭐ সবচেয়ে প্রিয় কমেডি
            </motion.h4>
            <motion.p 
              className="text-center text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base italic" 
              data-testid="loved-comedy-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              If others love it → you'll love it too!
            </motion.p>
            
            <div className="flex flex-col items-center">
              <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 max-w-6xl mx-auto mt-2" data-testid="loved-videos-grid">
                {[0,1,2].map((i) => {
                  const video = popularVideoData[i] || fallbackVideoData[3+i];
                  return (
                    <motion.div
                      key={video.videoId}
                      initial={{ opacity: 0, y: 50, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        duration: 0.6, 
                        delay: i * 0.1,
                        ease: [0.25, 0.25, 0.25, 1]
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <YouTubeShort
                        videoId={video.videoId}
                        thumbnail={video.thumbnail}
                        title={video.title}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
            </section>
          </ParallaxSection>


          
          
            {/* Latest Memes */}
            {latestMemes.length > 0 && (
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
            )}
          {/* Collaboration Form */}
          <ParallaxSection speed={0.2} delay={0.4}>
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
                <h3 className="font-bold text-brand-blue mb-1 sm:mb-2 hover-pulse cursor-pointer transition-all duration-300" data-testid="collaboration-title-english" style={{fontSize: 'clamp(2.5rem, 8vw, 8rem)'}}>
                  Work with Us
                </h3>
                <h4 className="font-bold text-gray-800 bangla-text hover-wobble cursor-pointer transition-all duration-300" data-testid="collaboration-title-bengali" style={{fontSize: 'clamp(2rem, 6vw, 6rem)'}}>
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
                        className={`w-full py-4 sm:py-3 rounded-full font-semibold text-base sm:text-lg hover-lift min-h-[52px] touch-manipulation transition-all duration-400 no-rickshaw-sound ${
                          !isFormValid 
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
          </ParallaxSection>
          
          </div>
        </main>
        
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
      </ParallaxContainer>
      
    </>
  );
};

export default Home;
