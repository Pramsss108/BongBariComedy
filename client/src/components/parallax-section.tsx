import { motion } from 'framer-motion';
import { useParallax, useInView } from '@/hooks/useParallax';
import { ReactNode } from 'react';

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
  const offset = useParallax(speed);
  const [ref, inView] = useInView(0.2);

  const getTransform = () => {
    switch (direction) {
      case 'up':
        return `translateY(${offset}px)`;
      case 'down':
        return `translateY(${-offset}px)`;
      case 'left':
        return `translateX(${offset}px)`;
      case 'right':
        return `translateX(${-offset}px)`;
      default:
        return `translateY(${offset}px)`;
    }
  };

  const variants = {
    hidden: { 
      opacity: 0, 
      y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0,
      x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      x: 0,
      transition: { 
        duration: 0.8, 
        delay,
        ease: [0.25, 0.25, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={variants}
      className={className}
      style={{ transform: getTransform() }}
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