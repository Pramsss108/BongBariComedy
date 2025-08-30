import { useRef, useEffect, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'rotate';
  distance?: number;
}

export const useScrollReveal = (options: ScrollRevealOptions = {}) => {
  const {
    threshold = 0.1,
    delay = 0,
    duration = 0.8,
    direction = 'up',
    distance = 50
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay * 1000);
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold, delay]);

  const getInitialTransform = () => {
    switch (direction) {
      case 'up': return `translateY(${distance}px)`;
      case 'down': return `translateY(-${distance}px)`;
      case 'left': return `translateX(${distance}px)`;
      case 'right': return `translateX(-${distance}px)`;
      case 'scale': return 'scale(0.8)';
      case 'rotate': return 'rotate(-10deg) scale(0.8)';
      default: return `translateY(${distance}px)`;
    }
  };

  const style = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0) translateX(0) scale(1) rotate(0)' : getInitialTransform(),
    transition: `all ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
  };

  return { ref, style, isVisible };
};