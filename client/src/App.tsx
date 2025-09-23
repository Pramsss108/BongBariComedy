import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { FloatingElements } from "@/components/floating-elements";
import MagicalCursor from "@/components/MagicalCursor";
import { useGlobalCursor } from "@/hooks/useGlobalCursor";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";
import { useRickshawSound } from "@/hooks/useRickshawSound";
import { useMagicalHoverSounds } from "@/hooks/useMagicalHoverSounds";
import { useSimpleCharmSound } from "@/hooks/useSimpleCharmSound";
import { CharmSoundSelector } from "@/components/CharmSoundSelector";
import { useState, useEffect, Suspense, lazy } from "react";
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Navigation from "@/components/navigation";
import { ensureAudioUnlocked } from "@/lib/audioUnlock";
import GreetingConsent from "@/components/GreetingConsent";
import { isAudioUnlocked, resumeAudioNow } from "@/lib/audioUnlock";
import BongBot from "@/components/BongBot";

// Lazy load components for code splitting
const About = lazy(() => import("@/pages/about"));
const WorkWithUs = lazy(() => import("@/pages/work-with-us"));
const Contact = lazy(() => import("@/pages/contact"));
const Blog = lazy(() => import("@/pages/blog"));
const FreeTools = lazy(() => import("./pages/free-tools"));
const Admin = lazy(() => import("@/pages/admin"));
const Login = lazy(() => import("@/pages/login"));
const BlogPost = lazy(() => import("@/pages/blog-post"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AdminChatbot = lazy(() => import("@/pages/AdminChatbot").then(m => ({ default: m.AdminChatbot })));
const AdminHomepage = lazy(() => import("@/pages/AdminHomepage").then(m => ({ default: m.AdminHomepage })));
const AdminModeration = lazy(() => import("@/pages/AdminModeration"));
const CommunityFeed = lazy(() => import("@/pages/community-feed"));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  );
}

function Router() {
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
      try { localStorage.removeItem('bbc.audioDecision'); } catch {}
    }
    return !localStorage.getItem('bbc.audioDecision');
  });

  // Show greeting immediately when pending (no click gating)
  
  // Initialize professional site-wide cursor effect
  useGlobalCursor();
  
  // Initialize fast engaging parallax scroll effects
  useParallaxScroll();
  
  // Initialize authentic Bengali rickshaw sound on taps (disabled when chatbot is open or logged in)
  useRickshawSound({ enabled: !isChatbotOpen && !isAuthenticated, volume: 0.3, cooldownMs: 200 });
  
  // Initialize magical hover sounds to complement cursor effects (disabled when logged in)
  useMagicalHoverSounds({ enabled: !isAuthenticated, volume: 0.12 });
  
  // Initialize custom charm sound that follows mouse movement (disabled when logged in)
  useSimpleCharmSound({ 
    enabled: !isAuthenticated, 
    volume: 0.06, 
    audioFile: '/sounds/charm.mp3' // Your custom charm sound
  });

  // Ensure audio unlock listeners attached
  useEffect(() => { ensureAudioUnlocked(); }, []);

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
  
  // Apply cursor styles based on current auth state
  useEffect(() => {
    if (isAuthenticated) {
      // Professional cursor for admin
      document.body.classList.add('admin-logged-in');
      document.body.style.cursor = 'default';
      document.documentElement.style.cursor = 'default';
      
      // Remove belan cursor elements
      const belanElements = document.querySelectorAll('.magical-belan-portal, .particle-container, .global-cursor-follower');
      belanElements.forEach(el => el.remove());
      
      // Apply professional cursor styles
      const style = document.createElement('style');
      style.id = 'admin-cursor-override';
      style.textContent = `
        * { cursor: default !important; }
        button, a, [role="button"] { cursor: pointer !important; }
        input, textarea, [contenteditable] { cursor: text !important; }
      `;
      if (!document.getElementById('admin-cursor-override')) {
        document.head.appendChild(style);
      }
    } else {
      // Remove professional cursor styles for public
      document.body.classList.remove('admin-logged-in');
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      
      const overrideStyle = document.getElementById('admin-cursor-override');
      if (overrideStyle) {
        overrideStyle.remove();
      }
    }
    
    // Notify cursor component of auth state change
    window.dispatchEvent(new Event('auth-state-changed'));
    
    return () => {
      // Cleanup
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      const overrideStyle = document.getElementById('admin-cursor-override');
      if (overrideStyle) {
        overrideStyle.remove();
      }
    };
  }, [isAuthenticated]);
  
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-brand-yellow relative m-0 p-0">
  <GreetingConsent open={showGreeting} onDecision={handleDecision} />
      <FloatingElements />
      {/* Show MagicalCursor (belan) only for public audience, not for logged-in admin */}
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
        <Route>
          <Suspense fallback={<LoadingFallback />}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
      
      {/* Professional Bong Bot - Available on all pages */}
      <BongBot onOpenChange={setIsChatbotOpen} />
      
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
    <TooltipProvider>
      <GlobalErrorBanner />
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
