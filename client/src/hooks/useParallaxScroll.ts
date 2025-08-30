import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;
      const fastRate = scrolled * -0.8;
      const superFastRate = scrolled * -1.2;

      // Fast parallax for YouTube shorts
      const youtubeShorts = document.querySelectorAll('.youtube-short');
      youtubeShorts.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = index % 2 === 0 ? fastRate : superFastRate;
        el.style.transform = `translateY(${speed * 0.1}px) scale(${1 + Math.abs(speed) * 0.0001})`;
      });

      // Blog cards parallax
      const blogCards = document.querySelectorAll('.blog-post, .card');
      blogCards.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = rate * (0.3 + index * 0.1);
        el.style.transform = `translateY(${speed * 0.05}px) rotateX(${speed * 0.01}deg)`;
      });

      // Navigation parallax
      const nav = document.querySelector('nav');
      if (nav) {
        (nav as HTMLElement).style.transform = `translateY(${rate * 0.1}px)`;
      }

      // Header elements
      const headers = document.querySelectorAll('h1, h2, h3');
      headers.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = fastRate * (0.2 + index * 0.05);
        el.style.transform = `translateY(${speed * 0.03}px) scale(${1 + Math.abs(speed) * 0.0002})`;
      });

      // Buttons floating effect
      const buttons = document.querySelectorAll('button, .magnetic-button');
      buttons.forEach((element, index) => {
        const el = element as HTMLElement;
        const floatSpeed = Math.sin(scrolled * 0.01 + index) * 2;
        el.style.transform = `translateY(${floatSpeed}px) scale(${1 + Math.abs(floatSpeed) * 0.001})`;
      });

      // Background sections depth
      const sections = document.querySelectorAll('section');
      sections.forEach((element, index) => {
        const el = element as HTMLElement;
        const depth = rate * (0.1 + index * 0.05);
        el.style.transform = `translateY(${depth * 0.02}px) scale(${1 + Math.abs(depth) * 0.0001})`;
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