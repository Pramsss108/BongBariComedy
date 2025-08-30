import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.6;
      const fastRate = scrolled * -1.2;
      const superFastRate = scrolled * -1.8;

      // Optimized parallax for YouTube shorts - Smooth fast movement
      const youtubeShorts = document.querySelectorAll('.youtube-short');
      youtubeShorts.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = index % 2 === 0 ? fastRate : superFastRate;
        const yOffset = speed * 0.2;
        const scale = 1 + Math.abs(speed) * 0.00015;
        el.style.transform = `translate3d(0, ${yOffset}px, 0) scale(${scale})`;
      });

      // Blog cards parallax - Optimized movement
      const blogCards = document.querySelectorAll('.blog-post, .card');
      blogCards.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = rate * (0.5 + index * 0.15);
        const yOffset = speed * 0.12;
        const rotateX = speed * 0.015;
        el.style.transform = `translate3d(0, ${yOffset}px, 0) rotateX(${rotateX}deg)`;
      });

      // Navigation parallax - Subtle movement
      const nav = document.querySelector('nav');
      if (nav) {
        const yOffset = rate * 0.15;
        (nav as HTMLElement).style.transform = `translate3d(0, ${yOffset}px, 0)`;
      }

      // Header elements - Smooth movement
      const headers = document.querySelectorAll('h1, h2, h3');
      headers.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = fastRate * (0.3 + index * 0.08);
        const yOffset = speed * 0.06;
        const scale = 1 + Math.abs(speed) * 0.0002;
        el.style.transform = `translate3d(0, ${yOffset}px, 0) scale(${scale})`;
      });

      // Buttons floating effect - Optimized
      const buttons = document.querySelectorAll('button, .magnetic-button');
      buttons.forEach((element, index) => {
        const el = element as HTMLElement;
        const floatSpeed = Math.sin(scrolled * 0.015 + index) * 3;
        const scale = 1 + Math.abs(floatSpeed) * 0.0015;
        el.style.transform = `translate3d(0, ${floatSpeed}px, 0) scale(${scale})`;
      });

      // Background sections depth - Optimized
      const sections = document.querySelectorAll('section');
      sections.forEach((element, index) => {
        const el = element as HTMLElement;
        const isCollaborationSection = el.getAttribute('data-testid') === 'collaboration-section';
        
        if (isCollaborationSection) {
          // Make "Work with Us" section scroll much faster to appear sooner
          const fastDepth = rate * -2.5;
          const yOffset = fastDepth * 0.15;
          const scale = 1 + Math.abs(fastDepth) * 0.0002;
          el.style.transform = `translate3d(0, ${yOffset}px, 0) scale(${scale})`;
        } else {
          // Normal speed for other sections
          const depth = rate * (0.15 + index * 0.08);
          const yOffset = depth * 0.05;
          const scale = 1 + Math.abs(depth) * 0.00015;
          el.style.transform = `translate3d(0, ${yOffset}px, 0) scale(${scale})`;
        }
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