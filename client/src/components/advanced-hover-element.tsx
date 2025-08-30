import { motion } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useAdvancedScrollAnimations } from "@/hooks/useAdvancedScrollAnimations";

interface AdvancedHoverElementProps {
  children: ReactNode;
  className?: string;
  animationType?: 'popOut' | 'slideLeft' | 'slideRight' | 'morph' | 'custom';
  customVariants?: any;
  hoverScale?: number;
  depth?: number;
  glowColor?: string;
  perspective?: boolean;
}

export const AdvancedHoverElement = ({
  children,
  className = "",
  animationType = 'popOut',
  customVariants,
  hoverScale = 1.05,
  depth = 20,
  glowColor = 'rgba(255, 204, 0, 0.3)',
  perspective = true
}: AdvancedHoverElementProps) => {
  const mouseRef = useRef({ x: 0, y: 0 });
  const {
    ref,
    isVisible,
    variants,
    easing
  } = useAdvancedScrollAnimations();

  // Get appropriate animation variant
  const getVariants = () => {
    if (customVariants) return customVariants;
    
    switch (animationType) {
      case 'slideLeft':
        return variants.slideIn.left;
      case 'slideRight':
        return variants.slideIn.right;
      case 'morph':
        return variants.morph;
      default:
        return variants.popOut;
    }
  };

  // Professional hover interactions
  const hoverVariants = {
    hover: {
      scale: hoverScale,
      y: -depth,
      rotateX: perspective ? -10 : 0,
      rotateY: perspective ? 5 : 0,
      boxShadow: [
        `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.1)`,
        `0 ${depth / 2}px ${depth}px ${glowColor}`,
        `inset 0 1px 0 rgba(255,255,255,0.1)`
      ].join(', '),
      filter: 'brightness(1.1) saturate(1.2) contrast(1.1)',
      transition: {
        duration: 0.4,
        ease: easing.easeOut,
        boxShadow: { duration: 0.3 },
        filter: { duration: 0.2 }
      }
    },
    tap: {
      scale: hoverScale * 0.95,
      y: -depth * 0.3,
      transition: {
        duration: 0.1,
        ease: easing.easeOut
      }
    }
  };

  // Advanced mouse tracking for 3D tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!perspective) return;
    
    const element = e.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    
    element.style.transform = `
      perspective(1000px) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg) 
      scale(${hoverScale})
      translateZ(${depth}px)
    `;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!perspective) return;
    
    e.currentTarget.style.transform = `
      perspective(1000px) 
      rotateX(0deg) 
      rotateY(0deg) 
      scale(1)
      translateZ(0px)
    `;
  };

  return (
    <motion.div
      ref={ref as any}
      className={`relative ${className}`}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      whileHover="hover"
      whileTap="tap"
      variants={getVariants()}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'transform',
      }}
    >
      {/* Ambient glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
        variants={{
          hover: {
            opacity: 0.6,
            scale: 1.2,
            transition: { duration: 0.3 }
          }
        }}
      />
      
      {/* Content with advanced layering */}
      <motion.div
        className="relative z-10"
        variants={{
          hover: {
            translateZ: depth / 2,
            transition: { duration: 0.3 }
          }
        }}
      >
        {children}
      </motion.div>
      
      {/* Reflection effect */}
      <motion.div
        className="absolute inset-0 rounded-inherit opacity-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
        variants={{
          hover: {
            opacity: 1,
            transition: { duration: 0.2 }
          }
        }}
      />
    </motion.div>
  );
};