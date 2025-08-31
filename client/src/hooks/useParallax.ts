import { useEffect, useState, useRef, useCallback } from 'react';

// Mobile detection for performance optimization
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const useParallax = (speed: number = 0.5) => {
  const [offset, setOffset] = useState(0);
  const rafId = useRef<number>();
  const ticking = useRef(false);
  const lastScrollY = useRef(0);
  const mobile = useRef(isMobile());

  const updateOffset = useCallback(() => {
    // Reduce animation intensity on mobile for performance
    const finalSpeed = mobile.current ? speed * 0.3 : speed;
    setOffset(lastScrollY.current * finalSpeed);
    ticking.current = false;
  }, [speed]);

  const handleScroll = useCallback(() => {
    lastScrollY.current = window.pageYOffset;
    
    if (!ticking.current) {
      rafId.current = requestAnimationFrame(updateOffset);
      ticking.current = true;
    }
  }, [updateOffset]);

  useEffect(() => {
    // Use passive listeners for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll]);

  return offset;
};

export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirection && Math.abs(scrollY - lastScrollY) > 10) {
        setScrollDirection(direction);
      }
      setLastScrollY(scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollDirection, lastScrollY]);

  return scrollDirection;
};

export const useInView = (threshold: number = 0.1) => {
  const [isInView, setIsInView] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return [setRef, isInView] as const;
};