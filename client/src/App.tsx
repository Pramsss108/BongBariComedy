import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import { FloatingElements } from "@/components/floating-elements";
import MagicalCursor from "@/components/MagicalCursor";
import { useGlobalCursor } from "@/hooks/useGlobalCursor";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";
import { useRickshawSound } from "@/hooks/useRickshawSound";
import { useMagicalHoverSounds } from "@/hooks/useMagicalHoverSounds";
import { useSimpleCharmSound } from "@/hooks/useSimpleCharmSound";
import { CharmSoundSelector } from "@/components/CharmSoundSelector";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import About from "@/pages/about";
import WorkWithUs from "@/pages/work-with-us";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import BlogPost from "@/pages/blog-post";
import NotFound from "@/pages/not-found";
import BongBot from "@/components/BongBot";
import { AdminChatbot } from "@/pages/AdminChatbot";
import { AdminHomepage } from "@/pages/AdminHomepage";

function Router() {
  const [showCharmSelector, setShowCharmSelector] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  
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
    audioFile: '/public-objects/sounds/folder/charm.mp3' // Your custom charm sound
  });
  
  // Apply professional cursor style when logged in - with immediate update
  useEffect(() => {
    const updateCursor = () => {
      if (isAuthenticated) {
        // Add class for professional arrow cursor for serious work
        document.body.classList.add('admin-logged-in');
        document.body.style.cursor = 'default !important';
        document.documentElement.style.cursor = 'default !important';
        
        // Remove any belan cursor elements immediately
        const belanElements = document.querySelectorAll('.magical-belan-portal, .particle-container, .global-cursor-follower');
        belanElements.forEach(el => {
          el.remove();
        });
        
        // Apply professional cursor to all elements
        const style = document.createElement('style');
        style.id = 'admin-cursor-override';
        style.textContent = `
          * {
            cursor: default !important;
          }
          button, a, [role="button"] {
            cursor: pointer !important;
          }
          input, textarea, [contenteditable] {
            cursor: text !important;
          }
        `;
        document.head.appendChild(style);
      } else {
        // Remove class to allow belan cursor for public audience
        document.body.classList.remove('admin-logged-in');
        document.body.style.cursor = '';
        document.documentElement.style.cursor = '';
        
        // Remove admin cursor override
        const overrideStyle = document.getElementById('admin-cursor-override');
        if (overrideStyle) {
          overrideStyle.remove();
        }
      }
    };
    
    // Apply immediately
    updateCursor();
    
    // Force re-render of cursor elements
    window.dispatchEvent(new Event('auth-state-changed'));
    
    return () => {
      // Cleanup on unmount
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      const overrideStyle = document.getElementById('admin-cursor-override');
      if (overrideStyle) {
        overrideStyle.remove();
      }
    };
  }, [isAuthenticated]);
  
  return (
    <div className="min-h-screen bg-brand-yellow relative">
      <FloatingElements />
      {/* Show MagicalCursor (belan) only for public audience, not for logged-in admin */}
      {!isAuthenticated && <MagicalCursor />}
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/work-with-us" component={WorkWithUs} />
        <Route path="/contact" component={Contact} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/chatbot" component={AdminChatbot} />
        <Route path="/admin/homepage" component={AdminHomepage} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
      
      {/* Professional Bong Bot - Available on all pages */}
      <BongBot onOpenChange={setIsChatbotOpen} />
      
    </div>
  );
}

function AppContent() {
  return (
    <TooltipProvider>
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
