import { useState, useEffect } from 'react';

export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTime = Date.now();
    let scrollTimeout: NodeJS.Timeout;

    const updateScrollProgress = () => {
      const currentTime = Date.now();
      const currentScrollY = window.scrollY;
      
      // Calculate scroll progress
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(currentScrollY / scrollHeight, 1);
      setScrollProgress(progress);

      // Calculate scroll velocity
      const deltaY = currentScrollY - lastScrollY;
      const deltaTime = currentTime - lastTime;
      const velocity = Math.abs(deltaY / deltaTime);
      setScrollVelocity(velocity);

      // Track scrolling state
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsScrolling(false), 100);

      lastScrollY = currentScrollY;
      lastTime = currentTime;
    };

    window.addEventListener('scroll', updateScrollProgress);
    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return { scrollProgress, scrollVelocity, isScrolling };
};