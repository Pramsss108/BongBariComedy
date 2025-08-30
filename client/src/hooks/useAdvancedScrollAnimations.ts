import { useEffect, useRef, useState } from 'react';
import { useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';

interface ScrollAnimationConfig {
  threshold?: number;
  rootMargin?: string;
  dampening?: number;
  stiffness?: number;
}

export const useAdvancedScrollAnimations = (config: ScrollAnimationConfig = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -10% 0px',
    dampening = 25,
    stiffness = 100
  } = config;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down');
  
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  // Advanced easing curves from 50-year veteran
  const professionalEasing = {
    ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    easeInOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
    easeOut: [0, 0, 0.2, 1] as [number, number, number, number],
    bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
    anticipate: [0.175, 0.885, 0.32, 1.275] as [number, number, number, number]
  };

  // Track scroll direction
  useEffect(() => {
    const unsubscribe = scrollY.onChange((current) => {
      const direction = current > lastScrollY.current ? 'down' : 'up';
      setScrollDirection(direction);
      lastScrollY.current = current;
    });
    return unsubscribe;
  }, [scrollY]);

  // Advanced intersection observer with ratio tracking
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        setIntersectionRatio(entry.intersectionRatio);
      },
      { 
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        rootMargin 
      }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [rootMargin]);

  // Create smooth spring physics
  const springConfig = { damping: dampening, stiffness, restDelta: 0.001 };
  const smoothProgress = useSpring(intersectionRatio, springConfig);

  // Professional animation variants
  const popOutVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: scrollDirection === 'down' ? 100 : -100,
      rotateX: scrollDirection === 'down' ? 15 : -15,
      filter: 'blur(10px)',
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 1.2,
        ease: professionalEasing.anticipate,
        staggerChildren: 0.1,
      }
    },
    hover: {
      scale: 1.05,
      y: -10,
      rotateX: -5,
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      filter: 'brightness(1.1) saturate(1.2)',
      transition: {
        duration: 0.4,
        ease: professionalEasing.easeOut
      }
    }
  };

  const slideInVariants = {
    left: {
      hidden: { opacity: 0, x: -100, rotateY: -30 },
      visible: { 
        opacity: 1, 
        x: 0, 
        rotateY: 0,
        transition: { duration: 0.8, ease: professionalEasing.bounce }
      }
    },
    right: {
      hidden: { opacity: 0, x: 100, rotateY: 30 },
      visible: { 
        opacity: 1, 
        x: 0, 
        rotateY: 0,
        transition: { duration: 0.8, ease: professionalEasing.bounce }
      }
    }
  };

  const morphVariants = {
    hidden: {
      opacity: 0,
      scale: 0.5,
      borderRadius: '50%',
      rotate: 180,
    },
    visible: {
      opacity: 1,
      scale: 1,
      borderRadius: '0%',
      rotate: 0,
      transition: {
        duration: 1.5,
        ease: professionalEasing.anticipate,
        borderRadius: { duration: 1, ease: professionalEasing.easeInOut },
        rotate: { duration: 1.2, ease: professionalEasing.bounce }
      }
    }
  };

  return {
    ref,
    isVisible,
    intersectionRatio,
    smoothProgress,
    scrollDirection,
    variants: {
      popOut: popOutVariants,
      slideIn: slideInVariants,
      morph: morphVariants,
    },
    easing: professionalEasing,
    springConfig
  };
};