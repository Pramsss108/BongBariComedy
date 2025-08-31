import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  opacity: number;
  type: 'spark' | 'emoji';
  emoji?: string;
  color: string;
}

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
  const [isExploding, setIsExploding] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const variantStyles = {
    youtube: {
      gradient: 'from-red-500 via-red-600 to-red-700',
      glow: 'shadow-red-500/50',
      neon: 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]',
      particles: ['🔥', '❤️', '⭐', '✨']
    },
    instagram: {
      gradient: 'from-purple-500 via-pink-500 to-orange-500',
      glow: 'shadow-purple-500/50',
      neon: 'drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]',
      particles: ['💫', '🌟', '💖', '✨']
    },
    default: {
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      glow: 'shadow-cyan-500/50',
      neon: 'drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]',
      particles: ['⚡', '✨', '💎', '🌟']
    }
  };

  const style = variantStyles[variant];

  const createBurstEffect = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newParticles: Particle[] = [];
    
    // Create 30 particles
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 3 + Math.random() * 4;
      const isEmoji = Math.random() < 0.3; // 30% chance for emoji
      
      newParticles.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        scale: 0.5 + Math.random() * 0.8,
        rotation: Math.random() * 360,
        opacity: 1,
        type: isEmoji ? 'emoji' : 'spark',
        emoji: isEmoji ? style.particles[Math.floor(Math.random() * style.particles.length)] : undefined,
        color: isEmoji ? '' : ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]
      });
    }
    
    setParticles(newParticles);
    
    // Play sound effect (note: would need actual sound file)
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const handleClick = () => {
    if (disabled || isExploding) return;
    
    setIsExploding(true);
    createBurstEffect();
    
    // Button reappears after explosion
    setTimeout(() => {
      setIsExploding(false);
      setParticles([]);
    }, 1000);
    
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="relative inline-block">
      <AnimatePresence>
        {!isExploding && (
          <motion.button
            ref={buttonRef}
            className={`
              relative overflow-hidden px-8 py-4 rounded-full text-white font-bold text-lg
              bg-gradient-to-r ${style.gradient}
              shadow-2xl ${style.glow}
              border-2 border-white/20
              backdrop-blur-sm
              transition-all duration-300 ease-out
              hover:scale-105 hover:shadow-3xl hover:${style.glow}
              active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            style={{
              filter: style.neon,
              background: `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%), linear-gradient(to right, var(--tw-gradient-stops))`
            }}
            onClick={handleClick}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            whileHover={{
              boxShadow: [
                `0 0 20px rgba(255,255,255,0.3)`,
                `0 0 40px rgba(255,255,255,0.2)`,
                `0 0 20px rgba(255,255,255,0.3)`
              ],
              transition: { duration: 1.5, repeat: Infinity }
            }}
          >
            {/* Glass overlay effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-transparent to-white/10" />
            
            {/* Inner glow */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-r from-white/10 via-transparent to-white/5" />
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            />
            
            {/* Content */}
            <span className="relative z-10 flex items-center justify-center gap-3">
              {children}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Particle burst effect */}
      <AnimatePresence>
        {isExploding && (
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute"
                initial={{
                  x: particle.x,
                  y: particle.y,
                  scale: particle.scale,
                  rotate: particle.rotation,
                  opacity: particle.opacity
                }}
                animate={{
                  x: particle.x + particle.vx * 50,
                  y: particle.y + particle.vy * 50,
                  scale: 0,
                  rotate: particle.rotation + 360,
                  opacity: 0
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {particle.type === 'emoji' ? (
                  <span className="text-2xl">{particle.emoji}</span>
                ) : (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: particle.color,
                      boxShadow: `0 0 10px ${particle.color}`
                    }}
                  />
                )}
              </motion.div>
            ))}
            
            {/* Central explosion flash */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white"
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};