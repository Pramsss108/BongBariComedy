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
      rgbGradient: 'linear-gradient(45deg, #ff0000, #ff4444, #cc0000, #ff6666)',
      borderGradient: 'conic-gradient(from 0deg, #ff0000 0%, #ff4444 25%, #cc0000 50%, #ff6666 75%, #ff0000 100%)',
      glowColors: '#ff0000, #ff4444, #cc0000',
      glow: 'shadow-red-500/50',
      neon: 'drop-shadow-[0_0_25px_rgba(239,68,68,1)]',
      particles: ['🔥', '❤️', '⭐', '✨', '😂']
    },
    instagram: {
      gradient: 'from-purple-500 via-pink-500 to-orange-500',
      rgbGradient: 'linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045, #833ab4)',
      borderGradient: 'conic-gradient(from 0deg, #833ab4 0%, #fd1d1d 33%, #fcb045 66%, #833ab4 100%)',
      glowColors: '#833ab4, #fd1d1d, #fcb045',
      glow: 'shadow-purple-500/50',
      neon: 'drop-shadow-[0_0_25px_rgba(168,85,247,1)]',
      particles: ['💫', '🌟', '💖', '✨', '😂']
    },
    default: {
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      rgbGradient: 'linear-gradient(45deg, #0066ff, #00ccff, #0099cc, #66ddff)',
      borderGradient: 'conic-gradient(from 0deg, #0066ff 0%, #00ccff 33%, #0099cc 66%, #0066ff 100%)',
      glowColors: '#0066ff, #00ccff, #0099cc',
      glow: 'shadow-cyan-500/50',
      neon: 'drop-shadow-[0_0_25px_rgba(6,182,212,1)]',
      particles: ['⚡', '✨', '💎', '🌟', '😂']
    }
  };

  const style = variantStyles[variant];

  const createBurstEffect = () => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newParticles: Particle[] = [];
    
    // Create 50 particles for bigger burst
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const speed = 4 + Math.random() * 6;
      const isEmoji = Math.random() < 0.4; // 40% chance for emoji
      
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
        color: isEmoji ? '' : ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF1493', '#00FF7F', '#FF4500'][Math.floor(Math.random() * 8)]
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
      
      // Create a more satisfying "pop" sound
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15);
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
      {/* Main Animated Border Ring - Thick Glowing Circle */}
      <motion.div
        className="absolute inset-[-8px] rounded-full p-3"
        style={{
          background: style.borderGradient,
          filter: 'blur(0px)'
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="w-full h-full rounded-full bg-transparent" />
      </motion.div>
      
      {/* Secondary glow ring - Medium blur circle */}
      <motion.div
        className="absolute inset-[-15px] rounded-full opacity-90"
        style={{
          background: style.borderGradient,
          filter: 'blur(12px)'
        }}
        animate={{
          rotate: -360,
          scale: [1, 1.08, 1]
        }}
        transition={{
          rotate: { duration: 2.5, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      {/* Third ring - Super glow circle */}
      <motion.div
        className="absolute inset-[-25px] rounded-full opacity-70"
        style={{
          background: style.borderGradient,
          filter: 'blur(20px)'
        }}
        animate={{
          rotate: 360,
          scale: [1, 1.12, 1]
        }}
        transition={{
          rotate: { duration: 3.5, repeat: Infinity, ease: "linear" },
          scale: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      {/* Fourth ring - Massive outer glow */}
      <motion.div
        className="absolute inset-[-35px] rounded-full opacity-50"
        style={{
          background: style.borderGradient,
          filter: 'blur(30px)'
        }}
        animate={{
          rotate: -360,
          scale: [1, 1.2, 1]
        }}
        transition={{
          rotate: { duration: 5, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      />
      
      <AnimatePresence>
        {!isExploding && (
          <motion.button
            ref={buttonRef}
            className={`
              relative overflow-hidden px-12 py-6 rounded-full text-white font-bold text-xl
              shadow-2xl ${style.glow}
              backdrop-blur-sm
              transition-all duration-500 ease-out
              hover:scale-110 hover:shadow-3xl
              active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              z-10
              ${className}
            `}
            style={{
              background: style.rgbGradient,
              filter: style.neon,
              minWidth: '450px',
              minHeight: '90px'
            }}
            onClick={handleClick}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            whileHover={{
              boxShadow: [
                `0 0 30px rgba(255,255,255,0.4)`,
                `0 0 60px rgba(255,255,255,0.3)`,
                `0 0 90px rgba(255,255,255,0.2)`,
                `0 0 30px rgba(255,255,255,0.4)`
              ],
              filter: [
                style.neon,
                `${style.neon} brightness(1.3)`,
                style.neon
              ],
              transition: { duration: 1, repeat: Infinity }
            }}
          >
            {/* Animated RGB background */}
            <motion.div 
              className="absolute inset-0 rounded-full opacity-80"
              style={{
                background: style.rgbGradient
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            
            {/* Glass overlay effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/30 via-transparent to-white/20" />
            
            {/* Inner premium glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 via-transparent to-white/15" />
            
            {/* Premium shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
              initial={{ x: '-100%', skewX: -20 }}
              animate={{ x: '200%', skewX: -20 }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            />
            
            {/* Content */}
            <span className="relative z-20 flex items-center justify-center gap-4 text-2xl font-extrabold">
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
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: particle.color,
                      boxShadow: `0 0 15px ${particle.color}, 0 0 30px ${particle.color}`
                    }}
                  />
                )}
              </motion.div>
            ))}
            
            {/* Central explosion flash */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white"
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 5, opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
            
            {/* Secondary explosion ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-white"
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};