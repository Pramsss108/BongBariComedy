import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const rate = scrolled * -1.5;           // 3x faster
          const fastRate = scrolled * -2.5;       // 3x faster  
          const superFastRate = scrolled * -4.0;  // 3x faster
          const hyperRate = scrolled * -6.0;      // New ultra fast rate

          // Ultra Fast parallax for YouTube shorts
          const youtubeShorts = document.querySelectorAll('.youtube-short');
          youtubeShorts.forEach((element, index) => {
            const el = element as HTMLElement;
            const speed = index % 2 === 0 ? fastRate : hyperRate;
            const scale = 1 + Math.abs(speed) * 0.0008; // 8x more scaling
            el.style.transform = `translateY(${speed * 0.3}px) scale(${scale}) rotateX(${speed * 0.02}deg)`;
          });

          // Fast Blog cards parallax with rotation
          const blogCards = document.querySelectorAll('.blog-post, .card');
          blogCards.forEach((element, index) => {
            const el = element as HTMLElement;
            const speed = fastRate * (0.8 + index * 0.3); // Much faster
            const scale = 1 + Math.abs(speed) * 0.0006;
            el.style.transform = `translateY(${speed * 0.2}px) scale(${scale}) rotateY(${speed * 0.015}deg)`;
          });

          // Dynamic Navigation parallax
          const nav = document.querySelector('nav');
          if (nav) {
            const scale = 1 + Math.abs(rate) * 0.0004;
            (nav as HTMLElement).style.transform = `translateY(${rate * 0.25}px) scale(${scale})`;
          }

          // Header elements with bounce
          const headers = document.querySelectorAll('h1, h2, h3');
          headers.forEach((element, index) => {
            const el = element as HTMLElement;
            const speed = superFastRate * (0.6 + index * 0.2);
            const bounce = Math.sin(scrolled * 0.03 + index) * 3;
            const scale = 1 + Math.abs(speed) * 0.0005;
            el.style.transform = `translateY(${speed * 0.15 + bounce}px) scale(${scale}) rotateZ(${speed * 0.01}deg)`;
          });

          // Enhanced Buttons floating with wave motion
          const buttons = document.querySelectorAll('button, .magnetic-button');
          buttons.forEach((element, index) => {
            const el = element as HTMLElement;
            const floatSpeed = Math.sin(scrolled * 0.04 + index) * 8; // 4x stronger
            const waveX = Math.cos(scrolled * 0.02 + index) * 2;
            const scale = 1 + Math.abs(floatSpeed) * 0.002;
            el.style.transform = `translate(${waveX}px, ${floatSpeed}px) scale(${scale}) rotateZ(${floatSpeed * 0.2}deg)`;
          });

          // Background sections with dramatic depth
          const sections = document.querySelectorAll('section');
          sections.forEach((element, index) => {
            const el = element as HTMLElement;
            const depth = rate * (0.4 + index * 0.2); // Much deeper
            const scale = 1 + Math.abs(depth) * 0.0003;
            el.style.transform = `translateY(${depth * 0.1}px) scale(${scale}) perspective(1000px) rotateX(${depth * 0.005}deg)`;
          });

          ticking = false;
        });
        ticking = true;
      }
    };

    // High-performance scroll with throttling
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};