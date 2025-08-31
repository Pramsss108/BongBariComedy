import { useEffect } from 'react';

export const useParallaxScroll = () => {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.5;
      const fastRate = scrolled * -0.8;
      const superFastRate = scrolled * -1.2;
      const windowHeight = window.innerHeight;
      
      // Dynamic floating background elements
      const floatingElements = document.querySelectorAll('.floating-bg-element');
      floatingElements.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = (index % 3 + 1) * 0.3; // Different speeds for each element
        const sideSpeed = Math.sin(scrolled * 0.01 + index) * 30; // Side-to-side movement
        const rotationSpeed = scrolled * 0.05 * (index % 2 === 0 ? 1 : -1); // Rotation
        
        el.style.transform = `
          translateY(${scrolled * speed}px) 
          translateX(${sideSpeed}px) 
          rotate(${rotationSpeed}deg) 
          scale(${1 + Math.sin(scrolled * 0.01 + index) * 0.1})
        `;
        el.style.opacity = `${0.1 + Math.sin(scrolled * 0.02 + index) * 0.05}`;
      });

      // Smooth parallax for YouTube shorts - faster movement
      const youtubeShorts = document.querySelectorAll('.youtube-short');
      youtubeShorts.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = index % 2 === 0 ? fastRate : superFastRate;
        const floatOffset = Math.sin(scrolled * 0.02 + index) * 5; // Floating effect
        el.style.transform = `translateY(${speed * 0.25 + floatOffset}px) scale(${1 + Math.abs(speed) * 0.0002}) rotate(${scrolled * 0.01}deg)`;
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

      // Header elements - Much faster movement with floating
      const headers = document.querySelectorAll('h1, h2, h3');
      headers.forEach((element, index) => {
        const el = element as HTMLElement;
        const speed = fastRate * (0.4 + index * 0.1);
        const floatY = Math.sin(scrolled * 0.01 + index) * 3;
        const floatX = Math.cos(scrolled * 0.015 + index) * 2;
        el.style.transform = `translateY(${speed * 0.12 + floatY}px) translateX(${floatX}px) scale(${1 + Math.abs(speed) * 0.0005})`;
      });

      // Smooth buttons floating effect (exclude CTA section)
      const buttons = document.querySelectorAll('button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"]), .magnetic-button:not([data-testid="button-youtube"]):not([data-testid="button-instagram"])');
      buttons.forEach((element, index) => {
        const el = element as HTMLElement;
        const floatSpeed = Math.sin(scrolled * 0.01 + index) * 2;
        el.style.transform = `translateY(${floatSpeed}px) scale(${1 + Math.abs(floatSpeed) * 0.001})`;
      });

      // Background sections depth with blur preview effect
      const sections = document.querySelectorAll('section:not([data-testid="cta-section"])');
      sections.forEach((element, index) => {
        const el = element as HTMLElement;
        // Skip if this is the CTA section or contains CTA buttons
        if (el.querySelector('[data-testid="button-youtube"]') || el.querySelector('[data-testid="button-instagram"]')) {
          return;
        }
        
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top;
        const elementHeight = rect.height;
        const depth = rate * (0.2 + index * 0.1);
        
        // Calculate blur based on distance from viewport
        let blurAmount = 0;
        let opacity = 1;
        
        // If element is below viewport (upcoming section)
        if (elementTop > windowHeight * 0.8) {
          const distance = (elementTop - windowHeight * 0.8) / windowHeight;
          blurAmount = Math.min(distance * 8, 6); // Max 6px blur
          opacity = Math.max(0.4, 1 - distance * 0.3); // Min 40% opacity
        }
        // If element is above viewport (past section)
        else if (elementTop + elementHeight < windowHeight * 0.2) {
          const distance = (windowHeight * 0.2 - (elementTop + elementHeight)) / windowHeight;
          blurAmount = Math.min(distance * 4, 3); // Max 3px blur
          opacity = Math.max(0.6, 1 - distance * 0.2); // Min 60% opacity
        }
        
        el.style.transform = `translateY(${depth * 0.06}px) scale(${1 + Math.abs(depth) * 0.0002})`;
        el.style.filter = `blur(${blurAmount}px)`;
        el.style.opacity = opacity.toString();
        el.style.transition = 'filter 0.3s ease, opacity 0.3s ease';
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