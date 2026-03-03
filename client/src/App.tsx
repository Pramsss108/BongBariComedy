import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

import MagicalCursor from "@/components/MagicalCursor";
import { useGlobalCursor } from "@/hooks/useGlobalCursor";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";
import { useRickshawSound } from "@/hooks/useRickshawSound";
import { useMagicalHoverSounds } from "@/hooks/useMagicalHoverSounds";
import { useSimpleCharmSound } from "@/hooks/useSimpleCharmSound";
import { CharmSoundSelector } from "@/components/CharmSoundSelector";
import { useState, useEffect, Suspense, lazy } from "react";
import React from "react";
import Home from "@/pages/home";
import Navigation from "@/components/navigation";
import MobileNavBar from "@/components/mobile-navbar";
import { ensureAudioUnlocked } from "@/lib/audioUnlock";
import GreetingConsent from "@/components/GreetingConsent";
import { isAudioUnlocked, resumeAudioNow } from "@/lib/audioUnlock";
import BongBot from "@/components/BongBot";
import { useAuth } from "@/hooks/useAuth";
import FloatingFAQButton from "@/components/FloatingFAQButton";
import { DebugOverlay } from "@/components/DebugOverlay";
import "@/lib/layout-sentry"; // Auto-registers window.runLayoutAudit

// Deploy note: trivial comment to force GitHub Pages rebuild (FORCE_PAGES_DEPLOY)

// Lazy load components for code splitting
const About = lazy(() => import("@/pages/about"));
const WorkWithUs = lazy(() => import("@/pages/work-with-us"));
const Contact = lazy(() => import("@/pages/contact"));
const Blog = lazy(() => import("@/pages/blog"));
const FreeTools = lazy(() => import("./pages/free-tools"));
const FreeToolsHumanizer = lazy(() => import("./pages/free-tools-humanizer"));
const Admin = lazy(() => import("@/pages/admin"));
const Login = lazy(() => import("@/pages/login"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminChatbot = lazy(() => import("@/pages/AdminChatbot"));
const AdminHomepage = lazy(() => import("@/pages/AdminHomepage").then(m => ({ default: m.AdminHomepage })));
const AdminModeration = lazy(() => import("@/pages/AdminModeration"));
const CommunityFeed = lazy(() => import("@/pages/community-feed"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const VoiceHub = lazy(() => import("@/pages/VoiceHub"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="w-full h-screen bg-black flex flex-col items-center justify-center space-y-4 p-4">
      {/* 💀 SKELETON DECEPTION (Black Ops Phase 7.4) */}
      <div className="w-full max-w-4xl aspect-video bg-gray-800/50 rounded-xl animate-pulse" />
      <div className="w-2/3 h-8 bg-gray-800/50 rounded animate-pulse" />
      <div className="w-1/2 h-4 bg-gray-800/50 rounded animate-pulse" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const [showCharmSelector, setShowCharmSelector] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const [showGreeting, setShowGreeting] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    // In local development, always show greeting on the main URL (root) without needing query params
    // This makes http://localhost:5173/ behave like http://localhost:5173/?resetAudio=1
    const forceRootInDev = (import.meta as any).env?.DEV && window.location.pathname === '/';
    const hasReset = forceRootInDev || params.get('resetAudio') === '1' || window.location.hash.includes('reset-audio');
    if (hasReset) {
      try { localStorage.removeItem('bbc.audioDecision'); } catch { }
    }
    return !localStorage.getItem('bbc.audioDecision');
  });

  // Show greeting immediately when pending (no click gating)

  // Initialize professional site-wide cursor effect
  useGlobalCursor();

  // Initialize fast engaging parallax scroll effects
  // useParallaxScroll();

  // Initialize authentic Bengali rickshaw sound on taps (disabled when chatbot is open or logged in)
  // useRickshawSound({ enabled: !isChatbotOpen && !isAuthenticated, volume: 0.3, cooldownMs: 200 });

  // Initialize magical hover sounds to complement cursor effects (disabled when logged in)
  // useMagicalHoverSounds({ enabled: !isAuthenticated, volume: 0.12 });

  // Initialize custom charm sound that follows mouse movement (disabled when logged in)
  // useSimpleCharmSound({
  //   enabled: !isAuthenticated,
  //   volume: 0.06,
  //   audioFile: '/sounds/charm.mp3' // Your custom charm sound
  // });

  // Ensure audio unlock listeners attached
  useEffect(() => { ensureAudioUnlocked(); }, []);

  // Toggle body class for cursor: when logged in, switch to normal cursor
  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.add('admin-logged-in');
    } else {
      document.body.classList.remove('admin-logged-in');
    }
    return () => document.body.classList.remove('admin-logged-in');
  }, [isAuthenticated]);

  // 🏴‍☠️ TAB NUDGE (Black Ops Phase 7.3): Guilt-trip users who switch tabs
  useEffect(() => {
    const originalTitle = document.title;
    const handleVisibilityChange = () => {
      document.title = document.hidden ? "🥺 Wait, come back!" : "Bong Bari - Bengali Comedy Channel";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Handle greeting consent decisions
  const handleDecision = async (d: 'granted' | 'denied') => {
    localStorage.setItem('bbc.audioDecision', d);
    setShowGreeting(false);
    if (d === 'granted' && !isAudioUnlocked()) {
      await resumeAudioNow();
    }
    // Notify any listeners (e.g., Home hero) that user has fully entered site
    window.dispatchEvent(new Event('bbc:audio-decision'));
  };

  // Remove the auto-refresh logic from here - it will be handled in login/logout actions only

  return (
    <>
      {location !== '/voice-hub' && <Navigation />}
      <div className="min-h-screen bg-brand-yellow relative m-0 p-0">
        <GreetingConsent open={showGreeting} onDecision={handleDecision} />
        {/* Custom belan cursor - hidden for logged-in users (normal cursor instead) */}
        {!isAuthenticated && <MagicalCursor />}
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about">
            <Suspense fallback={<LoadingFallback />}>
              <About />
            </Suspense>
          </Route>
          <Route path="/work-with-us">
            <Suspense fallback={<LoadingFallback />}>
              <WorkWithUs />
            </Suspense>
          </Route>
          <Route path="/contact">
            <Suspense fallback={<LoadingFallback />}>
              <Contact />
            </Suspense>
          </Route>
          <Route path="/blog">
            <Suspense fallback={<LoadingFallback />}>
              <Blog />
            </Suspense>
          </Route>
          <Route path="/tools">
            <Suspense fallback={<LoadingFallback />}>
              <FreeTools />
            </Suspense>
          </Route>
          <Route path="/tools/humanizer">
            <Suspense fallback={<LoadingFallback />}>
              <FreeToolsHumanizer />
            </Suspense>
          </Route>
          <Route path="/community/feed">
            <Suspense fallback={<LoadingFallback />}>
              <CommunityFeed />
            </Suspense>
          </Route>
          <Route path="/blog/:slug">
            <Suspense fallback={<LoadingFallback />}>
              <BlogPost />
            </Suspense>
          </Route>
          <Route path="/admin">
            <Suspense fallback={<LoadingFallback />}>
              <Admin />
            </Suspense>
          </Route>
          <Route path="/admin/chatbot">
            <Suspense fallback={<LoadingFallback />}>
              <AdminChatbot />
            </Suspense>
          </Route>
          <Route path="/admin/homepage">
            <Suspense fallback={<LoadingFallback />}>
              <AdminHomepage />
            </Suspense>
          </Route>
          <Route path="/admin/moderation">
            <Suspense fallback={<LoadingFallback />}>
              <AdminModeration />
            </Suspense>
          </Route>
          <Route path="/login">
            <Suspense fallback={<LoadingFallback />}>
              <Login />
            </Suspense>
          </Route>
          <Route path="/privacy">
            <Suspense fallback={<LoadingFallback />}>
              <PrivacyPolicy />
            </Suspense>
          </Route>
          <Route path="/terms">
            <Suspense fallback={<LoadingFallback />}>
              <TermsPage />
            </Suspense>
          </Route>
          <Route path="/faq">
            <Suspense fallback={<LoadingFallback />}>
              <FAQ />
            </Suspense>
          </Route>
          <Route path="/voice-hub">
            <Suspense fallback={<LoadingFallback />}>
              <VoiceHub />
            </Suspense>
          </Route>
          <Route>
            <Suspense fallback={<LoadingFallback />}>
              <NotFound />
            </Suspense>
          </Route>
        </Switch>

        {/* Professional Bong Bot - Triggered via Header on Mobile */}
        <BongBot onOpenChange={setIsChatbotOpen} />

        {/* Floating FAQ Button - REMOVED per cleanup request */}
        {/* <FloatingFAQButton /> */}

        {/* Mobile Navigation Dock - Hidden on full-screen tool pages */}
        {location !== '/tools/humanizer' && location !== '/voice-hub' && <MobileNavBar />}

        {/* Production Debug overlay - Available via Console/Hidden Trigger */}
        <DebugOverlay />
      </div>
    </>
  );
}

// Global error overlay/banner
function GlobalErrorBanner() {
  const [error, setError] = React.useState(null);
  useEffect(() => {
    const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
      setError(
        // For ErrorEvent
        (event as ErrorEvent).error ||
        // For PromiseRejectionEvent
        (event as PromiseRejectionEvent).reason ||
        // Fallbacks
        (event as any).message ||
        'Unknown error'
      );
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', handler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', handler);
    };
  }, []);
  if (!error) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#b91c1c', color: 'white', padding: '12px', fontWeight: 'bold',
      fontFamily: 'monospace', textAlign: 'center',
    }}>
      ⚠️ Runtime error: {String(error)}
    </div>
  );
}

function AppContent() {
  return (
    <>
      <Router />
    </>
  );
}

function App() {
  // Remove initial loader when React mounts
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.remove();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
