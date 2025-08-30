import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.8;
      const fastRate = scrolled * -1.5;
      const superFastRate = scrolled * -2.2;

      // Fast parallax for YouTube shorts - Much faster movement
      const youtubeShorts = document.querySelectorAll('.youtube-short');
      youtubeShorts.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = index % 2 === 0 ? fastRate : superFastRate;
        el.style.transform = `translateY(${speed * 0.25}px) scale(${1 + Math.abs(speed) * 0.0002})`;
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

      // Buttons floating effect - Enhanced movement (exclude CTA section)
      const buttons = document.querySelectorAll('button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"]), .magnetic-button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"])');
      buttons.forEach((element, index) => {
        const el = element as HTMLElement;
        const floatSpeed = Math.sin(scrolled * 0.02 + index) * 4;
        el.style.transform = `translateY(${floatSpeed}px) scale(${1 + Math.abs(floatSpeed) * 0.002})`;
      });

      // Background sections depth - Faster depth movement
      const sections = document.querySelectorAll('section');
      sections.forEach((element, index) => {
        const el = element as HTMLElement;
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