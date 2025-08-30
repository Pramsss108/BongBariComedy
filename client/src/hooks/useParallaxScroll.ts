import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;
      const fastRate = scrolled * -0.8;
      const superFastRate = scrolled * -1.2;

      // Smooth parallax for YouTube shorts
      const youtubeShorts = document.querySelectorAll('.youtube-short');
      youtubeShorts.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = index % 2 === 0 ? fastRate : superFastRate;
        el.style.transform = `translateY(${speed * 0.15}px) scale(${1 + Math.abs(speed) * 0.0001})`;
      });

      // Blog cards parallax - Faster movement
      const blogCards = document.querySelectorAll('.blog-post, .card');
      blogCards.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = rate * (0.6 + index * 0.2);
        el.style.transform = `translateY(${speed * 0.15}px) rotateX(${speed * 0.02}deg)`;
      });

      // Navigation parallax - Faster
      const nav = document.querySelector('nav');
      if (nav) {
        (nav as HTMLElement).style.transform = `translateY(${rate * 0.2}px)`;
      }

      // Header elements - Much faster movement
      const headers = document.querySelectorAll('h1, h2, h3');
      headers.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = fastRate * (0.4 + index * 0.1);
        el.style.transform = `translateY(${speed * 0.08}px) scale(${1 + Math.abs(speed) * 0.0003})`;
      });

      // Smooth buttons floating effect (exclude CTA section)
      const buttons = document.querySelectorAll('button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"]), .magnetic-button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"])');
      buttons.forEach((element, index) => {
        const el = element as HTMLElement;
        const floatSpeed = Math.sin(scrolled * 0.01 + index) * 2;
        el.style.transform = `translateY(${floatSpeed}px) scale(${1 + Math.abs(floatSpeed) * 0.001})`;
      });

      // Background sections depth - Exclude CTA section completely
      const sections = document.querySelectorAll('section:not([data-testid="cta-section"])');
      sections.forEach((element, index) => {
        const el = element as HTMLElement;
        // Skip if this is the CTA section or contains CTA buttons
        if (el.querySelector('[data-testid="button-youtube"]') || el.querySelector('[data-testid="button-instagram"]')) {
          return;
        }
        const depth = rate * (0.2 + index * 0.1);
        el.style.transform = `translateY(${depth * 0.06}px) scale(${1 + Math.abs(depth) * 0.0002})`;
      });
    };

    // Smooth scroll with momentum
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};