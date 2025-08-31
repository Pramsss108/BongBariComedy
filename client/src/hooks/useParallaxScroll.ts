import { useEffect, useRef, useCallback } from 'react';

export const useParallaxScroll = () => {
  const rafId = useRef<number>();
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

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
    const scrolled = lastScrollY.current;
    const rate = scrolled * -0.3; // Reduced intensity
    const fastRate = scrolled * -0.5; // Reduced intensity
    const windowHeight = window.innerHeight;
    const cache = elementsCache.current;

    // Optimized floating background elements - reduced calculations
    cache.floating.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = (index % 3 + 1) * 0.2; // Reduced speed
      const sideSpeed = Math.sin(scrolled * 0.005 + index) * 15; // Reduced movement
      const rotationSpeed = scrolled * 0.02 * (index % 2 === 0 ? 1 : -1); // Reduced rotation
      
      el.style.transform = `translate3d(${sideSpeed}px, ${scrolled * speed}px, 0) rotate(${rotationSpeed}deg) scale(${1 + Math.sin(scrolled * 0.005 + index) * 0.05})`;
      el.style.opacity = `${0.1 + Math.sin(scrolled * 0.01 + index) * 0.03}`;
    });

    // Simplified YouTube shorts
    cache.youtubeShorts.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = index % 2 === 0 ? fastRate : fastRate * 1.2;
      const floatOffset = Math.sin(scrolled * 0.01 + index) * 3;
      el.style.transform = `translate3d(0, ${speed * 0.15 + floatOffset}px, 0)`;
    });

    // Simplified blog cards
    cache.blogCards.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = rate * (0.4 + index * 0.1);
      el.style.transform = `translate3d(0, ${speed * 0.1}px, 0)`;
    });

    // Simplified navigation
    if (cache.nav) {
      (cache.nav as HTMLElement).style.transform = `translate3d(0, ${rate * 0.1}px, 0)`;
    }

    // Simplified headers
    cache.headers.forEach((element, index) => {
      const el = element as HTMLElement;
      const speed = fastRate * (0.3 + index * 0.05);
      const floatY = Math.sin(scrolled * 0.005 + index) * 2;
      el.style.transform = `translate3d(0, ${speed * 0.08 + floatY}px, 0)`;
    });

    // Simplified buttons
    cache.buttons.forEach((element, index) => {
      const el = element as HTMLElement;
      const floatSpeed = Math.sin(scrolled * 0.005 + index) * 1;
      el.style.transform = `translate3d(0, ${floatSpeed}px, 0)`;
    });

    // Simplified sections - no blur effects for crisp text
    cache.sections.forEach((element, index) => {
      const el = element as HTMLElement;
      // Skip CTA sections
      if (el.querySelector('[data-testid="button-youtube"]') || el.querySelector('[data-testid="button-instagram"]')) {
        return;
      }
      
      const depth = rate * (0.1 + index * 0.05);
      el.style.transform = `translate3d(0, ${depth * 0.04}px, 0)`;
      
      // Keep everything crisp and clear - no blur effects
      el.style.filter = 'none';
      el.style.opacity = '1';
    });

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