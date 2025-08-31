import { useEffect, useRef, useCallback } from 'react';

export const useParallaxScroll = () => {
  const rafId = useRef<number>();
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const isMobile = useRef(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

  // Cache DOM elements for better performance
  const elementsCache = useRef<{
    floating: Element[];
    youtubeShorts: Element[];
    blogCards: Element[];
    nav: Element | null;
    headers: Element[];
    buttons: Element[];
    sections: Element[];
  }>({
    floating: [],
    youtubeShorts: [],
    blogCards: [],
    nav: null,
    headers: [],
    buttons: [],
    sections: []
  });

  const updateElements = useCallback(() => {
    // Skip expensive DOM queries on mobile for better performance
    if (isMobile.current) return;
    
    const cache = elementsCache.current;
    cache.floating = Array.from(document.querySelectorAll('.floating-bg-element'));
    cache.youtubeShorts = Array.from(document.querySelectorAll('.youtube-short'));
    cache.blogCards = Array.from(document.querySelectorAll('.blog-post, .card'));
    cache.nav = document.querySelector('nav');
    cache.headers = Array.from(document.querySelectorAll('h1, h2, h3'));
    cache.buttons = Array.from(document.querySelectorAll('button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"]), .magnetic-button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"])'));
    cache.sections = Array.from(document.querySelectorAll('section:not([data-testid="cta-section"])'));
  }, []);

  const handleParallax = useCallback(() => {
    // Disable complex parallax on mobile for buttery smooth performance
    if (isMobile.current) {
      ticking.current = false;
      return;
    }

    const scrolled = lastScrollY.current;
    const rate = scrolled * -0.15; // Reduced for smoother performance
    const fastRate = scrolled * -0.25; // Reduced for smoother performance
    const cache = elementsCache.current;

    // ULTRA FAST floating background elements - minimal calculations
    cache.floating.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = (index % 2 + 1) * 0.08; // Even simpler speed calculation
      const sideSpeed = (scrolled * 0.001 + index) * 6; // More simplified movement
      
      el.style.transform = `translate3d(${sideSpeed}px, ${scrolled * speed}px, 0)`;
      el.style.opacity = `${0.06 + (index % 3) * 0.015}`;
    });

    // ULTRA FAST YouTube shorts - minimal calculations
    cache.youtubeShorts.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = fastRate * 0.08;
      el.style.transform = `translate3d(0, ${speed}px, 0)`;
    });

    // ULTRA FAST headers only
    cache.headers.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = fastRate * 0.04;
      el.style.transform = `translate3d(0, ${speed}px, 0)`;
    });

    // Skip other elements for maximum performance
    ticking.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    lastScrollY.current = window.pageYOffset;
    
    if (!ticking.current) {
      rafId.current = requestAnimationFrame(handleParallax);
      ticking.current = true;
    }
  }, [handleParallax]);

  useEffect(() => {
    // Initial setup
    updateElements();
    
    // Throttled scroll event
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Update elements cache periodically
    const interval = setInterval(updateElements, 5000);
    
    // Initial call
    handleParallax();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, handleParallax, updateElements]);
};