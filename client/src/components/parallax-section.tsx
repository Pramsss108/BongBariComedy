import { motion } from 'framer-motion';
import { useParallax, useInView } from '@/hooks/useParallax';
import { ReactNode, useMemo } from 'react';

// Mobile detection for performance optimization
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
}

export const ParallaxSection = ({ 
  children, 
  speed = 0.5, 
  className = '', 
  direction = 'up',
  delay = 0
}: ParallaxSectionProps) => {
  // Always call hooks in the same order - fix hooks issue
  const offset = useParallax(speed);
  const [ref, inView] = useInView(0.2);
  const mobile = useMemo(() => isMobile(), []);

  const getTransform = () => {
    // Disable parallax transform on mobile for butter smooth performance
    if (mobile) return 'translate3d(0, 0, 0)';
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${offset}px, 0)`;
      case 'down':
        return `translate3d(0, ${-offset}px, 0)`;
      case 'left':
        return `translate3d(${offset}px, 0, 0)`;
      case 'right':
        return `translate3d(${-offset}px, 0, 0)`;
      default:
        return `translate3d(0, ${offset}px, 0)`;
    }
  };

  const variants = {
    hidden: { 
      opacity: 0, 
      y: direction === 'up' ? (mobile ? 20 : 50) : direction === 'down' ? (mobile ? -20 : -50) : 0,
      x: direction === 'left' ? (mobile ? 20 : 50) : direction === 'right' ? (mobile ? -20 : -50) : 0,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      x: 0,
      transition: { 
        duration: mobile ? 0.4 : 0.8, 
        delay: mobile ? delay * 0.5 : delay,
        ease: mobile ? [0.25, 0.46, 0.45, 0.94] : [0.25, 0.25, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      className={`${className} ${mobile ? 'parallax-mobile-optimized' : 'parallax-desktop'}`}
      style={{ 
        transform: getTransform(),
        willChange: mobile ? 'auto' : 'transform',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </motion.div>
  );
};

export const ParallaxContainer = ({ 
  children, 
  className = '' 
}: { 
  children: ReactNode; 
  className?: string; 
}) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      {children}
    </div>
  );
};