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

  const variantStyles = {
    youtube: {
      background: 'linear-gradient(135deg, #ff0000 0%, #ff4444 50%, #cc0000 100%)',
      shadow: '0 10px 30px rgba(255, 0, 0, 0.4)',
      hoverShadow: '0 15px 40px rgba(255, 0, 0, 0.6)',
      borderGradient: 'conic-gradient(from 0deg, #ff0000, #ff4444, #cc0000, #ff6666, #ff0000)',
      particles: ['🔥', '❤️', '⭐', '✨', '😂']
    },
    instagram: {
      background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
      shadow: '0 10px 30px rgba(131, 58, 180, 0.4)',
      hoverShadow: '0 15px 40px rgba(131, 58, 180, 0.6)',
      borderGradient: 'conic-gradient(from 0deg, #833ab4, #fd1d1d, #fcb045, #ff7b00, #833ab4)',
      particles: ['💫', '🌟', '💖', '✨', '😂']
    },
    default: {
      background: 'linear-gradient(135deg, #0066ff 0%, #00ccff 50%, #0099cc 100%)',
      shadow: '0 10px 30px rgba(0, 102, 255, 0.4)',
      hoverShadow: '0 15px 40px rgba(0, 102, 255, 0.6)',
      borderGradient: 'conic-gradient(from 0deg, #0066ff, #00ccff, #0099cc, #66ddff, #0066ff)',
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
    
    // Create 40 particles for bigger burst
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
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
    
    // Play satisfying pop sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
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
      {/* Rotating gradient border wrapper */}
      <motion.div
        className="relative inline-block p-1 rounded-full"
        style={{
          background: style.borderGradient
        }}
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <AnimatePresence>
          {!isExploding && (
            <motion.button
            ref={buttonRef}
            className={`
              relative overflow-hidden px-12 py-6 rounded-full text-white font-extrabold text-2xl
              transition-all duration-500 ease-out
              hover:scale-110 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              border-2 border-white/30
              ${className}
            `}
            style={{
              background: style.background,
              boxShadow: style.shadow,
              minWidth: '400px',
              minHeight: '80px'
            }}
            onClick={handleClick}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            whileHover={{
              boxShadow: style.hoverShadow,
              filter: 'brightness(1.1)',
              transition: { duration: 0.3 }
            }}
          >
            {/* Glass overlay effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-transparent to-white/10" />
            
            {/* Premium shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: '-100%', skewX: -20 }}
              animate={{ x: '200%', skewX: -20 }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            />
            
            {/* Content */}
            <span className="relative z-20 flex items-center justify-center gap-4">
              {children}
            </span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

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
                  <span className="text-3xl">{particle.emoji}</span>
                ) : (
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: particle.color,
                      boxShadow: `0 0 15px ${particle.color}`
                    }}
                  />
                )}
              </motion.div>
            ))}
            
            {/* Central explosion flash */}
            <motion.div
              className="absolute inset-0 rounded-full bg-white"
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};