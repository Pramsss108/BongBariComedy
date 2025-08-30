import { motion } from "framer-motion";
import { useMagneticEffect } from "@/hooks/useMagneticEffect";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  strength?: number;
}

export const MagneticButton = ({ 
  children, 
  className, 
  onClick, 
  variant = "default",
  size = "default",
  strength = 0.3 
}: MagneticButtonProps) => {
  const magneticRef = useMagneticEffect(strength);

  return (
    <motion.div
      ref={magneticRef as any}
      whileHover={{ 
        scale: 1.1,
        boxShadow: "0 0 30px rgba(255, 204, 0, 0.8), 0 0 60px rgba(255, 68, 68, 0.4)",
      }}
      whileTap={{ 
        scale: 0.9,
        rotate: 5
      }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 10
      }}
      className="inline-block relative"
      style={{
        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
      }}
    >
      <Button
        variant={variant}
        size={size}
        className={`relative overflow-hidden border-2 border-transparent hover:border-white/30 ${className}`}
        onClick={onClick}
        style={{
          background: `linear-gradient(45deg, ${className?.includes('bg-brand-red') ? '#FF4444, #FF6666' : '#4444FF, #6666FF'})`,
          boxShadow: `0 4px 15px rgba(${className?.includes('bg-brand-red') ? '255, 68, 68' : '68, 68, 255'}, 0.4)`
        }}
      >
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/20 via-brand-yellow/30 to-white/20"
          initial={{ x: "-200%" }}
          whileHover={{ x: "200%" }}
          transition={{ duration: 0.6 }}
        />
        
        {/* Pulsing glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Content */}
        <motion.span 
          className="relative z-10 flex items-center font-bold"
          whileHover={{ 
            scale: 1.05,
            textShadow: "0 0 10px rgba(255, 255, 255, 0.8)"
          }}
        >
          {children}
        </motion.span>
      </Button>
    </motion.div>
  );
};