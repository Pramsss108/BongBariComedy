import { motion } from "framer-motion";
import { useMagneticEffect } from "@/hooks/useMagneticEffect";
import { Button } from "@/components/ui/button";
import { ReactNode, useState, useRef } from "react";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  strength?: number;
  disabled?: boolean;
  premium?: boolean;
}

export const MagneticButton = ({ 
  children, 
  className, 
  onClick, 
  variant = "default",
  size = "default",
  strength = 0.3,
  disabled = false,
  premium = false
}: MagneticButtonProps) => {
  const magneticRef = useMagneticEffect(strength);
  const [isClicked, setIsClicked] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    
    setIsClicked(true);
    
    if (premium) {
      // Create epic particle burst
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100
      }));
      
      setParticles(newParticles);
      
      // Play epic sound effect
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJevrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSMELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmsmBTWM0vHGdSME=');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore audio play errors
      } catch (error) {
        // Fallback: create beep sound using Web Audio API
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
          
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
          // Audio not available
        }
      }
      
      // Clear particles after animation
      setTimeout(() => setParticles([]), 1000);
    }
    
    // Reset click state
    setTimeout(() => setIsClicked(false), 200);
    
    // Call original onClick
    if (onClick) onClick();
  };

  const baseClasses = premium 
    ? "relative overflow-hidden group transform transition-all duration-300 ease-out hover:scale-110 active:scale-95"
    : "relative overflow-hidden transition-colors duration-150 hover:shadow-md hover:shadow-brand-yellow/20";

  const premiumClasses = premium 
    ? `
      bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 
      hover:from-purple-500 hover:via-pink-500 hover:to-blue-500
      text-white font-bold text-lg
      shadow-2xl hover:shadow-purple-500/50
      border-2 border-white/20
      backdrop-blur-sm
      animate-pulse hover:animate-none
      before:absolute before:inset-0 
      before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
      before:translate-x-[-100%] before:transition-transform before:duration-700
      hover:before:translate-x-[100%]
      after:absolute after:inset-0 after:bg-gradient-to-r 
      after:from-yellow-400/0 after:via-yellow-400/20 after:to-yellow-400/0
      after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500
    ` 
    : "";

  return (
    <div
      ref={magneticRef as any}
      className="inline-block relative hover-target"
    >
      {premium && (
        <>
          {/* Futuristic Glow Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-75 blur-lg animate-pulse scale-110"></div>
          
          {/* Particle Burst Effects */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full pointer-events-none"
              initial={{ 
                x: particle.x, 
                y: particle.y, 
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                x: particle.x + (Math.random() - 0.5) * 200,
                y: particle.y + (Math.random() - 0.5) * 200,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0] 
              }}
              transition={{ 
                duration: 0.8,
                ease: "easeOut"
              }}
              style={{
                filter: 'drop-shadow(0 0 6px currentColor)',
                zIndex: 1000
              }}
            />
          ))}
        </>
      )}
      
      <motion.div
        animate={{
          scale: isClicked ? [1, 1.1, 1] : 1,
          rotate: isClicked && premium ? [0, 5, -5, 0] : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          className={`${baseClasses} ${premiumClasses} ${className}`}
          onClick={handleClick}
          style={premium ? {
            background: isClicked 
              ? 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #fecca7)'
              : undefined,
            animation: premium ? 'shimmer 2s infinite linear' : undefined
          } : undefined}
        >
          {premium && (
            <>
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full"></div>
              
              {/* Dynamic Border */}
              <div className="absolute inset-0 rounded-full border-2 border-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-60"></div>
            </>
          )}
          
          <span className="relative z-10 flex items-center justify-center gap-3">
            {children}
          </span>
        </Button>
      </motion.div>
    </div>
  );
};