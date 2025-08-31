import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/navigation";
import { ScrollProgress } from "@/components/scroll-progress";
import { FloatingElements } from "@/components/floating-elements";
import MagicalCursor from "@/components/MagicalCursor";
import { useGlobalCursor } from "@/hooks/useGlobalCursor";
import { useParallaxScroll } from "@/hooks/useParallaxScroll";
import { useRickshawSound } from "@/hooks/useRickshawSound";
import { useMagicalHoverSounds } from "@/hooks/useMagicalHoverSounds";
import { useSimpleCharmSound } from "@/hooks/useSimpleCharmSound";
import { CharmSoundSelector } from "@/components/CharmSoundSelector";
import { useState } from "react";
import Home from "@/pages/home";
import About from "@/pages/about";
import WorkWithUs from "@/pages/work-with-us";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import BlogPost from "@/pages/blog-post";
import NotFound from "@/pages/not-found";

function Router() {
  const [showCharmSelector, setShowCharmSelector] = useState(false);
  
  // Initialize professional site-wide cursor effect
  useGlobalCursor();
  
  // Initialize fast engaging parallax scroll effects
  useParallaxScroll();
  
  // Initialize authentic Bengali rickshaw sound on taps
  useRickshawSound({ enabled: true, volume: 0.3, cooldownMs: 200 });
  
  // Initialize magical hover sounds to complement cursor effects
  useMagicalHoverSounds({ enabled: true, volume: 0.12 });
  
  // Initialize custom charm sound that follows mouse movement
  useSimpleCharmSound({ 
    enabled: true, 
    volume: 0.06, 
    audioFile: '/public-objects/sounds/folder/charm.mp3' // Your custom charm sound
  });
  
  
  return (
    <div className="min-h-screen bg-brand-yellow relative">
      <ScrollProgress />
      <FloatingElements />
      <MagicalCursor />
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/work-with-us" component={WorkWithUs} />
        <Route path="/contact" component={Contact} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/admin" component={Admin} />
        <Route path="/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
      
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
