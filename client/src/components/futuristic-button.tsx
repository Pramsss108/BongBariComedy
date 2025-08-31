import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FuturisticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'youtube' | 'instagram' | 'default';
}

export const FuturisticButton = ({ 
  children, 
  onClick, 
  className = "", 
  disabled = false,
  variant = 'default'
}: FuturisticButtonProps) => {

  const variantStyles = {
    youtube: {
      background: 'linear-gradient(135deg, #FF4500 0%, #FF6347 100%)',
      shadow: '0 4px 15px rgba(255, 69, 0, 0.25)',
      hoverShadow: '0 6px 20px rgba(255, 69, 0, 0.35)',
      hoverGlow: '0 0 25px rgba(255, 69, 0, 0.3)'
    },
    instagram: {
      background: 'linear-gradient(135deg, #E91E63 0%, #9C27B0 100%)',
      shadow: '0 4px 15px rgba(233, 30, 99, 0.25)',
      hoverShadow: '0 6px 20px rgba(233, 30, 99, 0.35)',
      hoverGlow: '0 0 25px rgba(233, 30, 99, 0.3)'
    },
    default: {
      background: 'linear-gradient(135deg, #2196F3 0%, #21CBF3 100%)',
      shadow: '0 4px 15px rgba(33, 150, 243, 0.25)',
      hoverShadow: '0 6px 20px rgba(33, 150, 243, 0.35)',
      hoverGlow: '0 0 25px rgba(33, 150, 243, 0.3)'
    }
  };

  const style = variantStyles[variant];

  return (
    <motion.button
      className={`
        relative overflow-hidden px-6 py-3 rounded-full text-white font-bold text-lg
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        border-0 outline-none focus:outline-none
        min-w-[200px] max-w-full
        ${className}
      `}
      style={{
        background: style.background,
        boxShadow: style.shadow,
      }}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{
        scale: 1.05,
        boxShadow: `${style.hoverShadow}, ${style.hoverGlow}`,
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
    >
      {/* Subtle shine overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40" />
      
      {/* Gentle animated shine effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          repeatDelay: 4,
          ease: "easeInOut"
        }}
      />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-3">
        {children}
      </span>
    </motion.button>
  );
};