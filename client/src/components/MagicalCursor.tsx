import { useMagicalCursor } from '@/hooks/useMagicalCursor';
import { useState, useEffect } from 'react';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

const MagicalCursor = () => {
  const [isOnMobile, setIsOnMobile] = useState(false);
  const { cursorPosition, particles, isMoving } = useMagicalCursor();

  useEffect(() => {
    setIsOnMobile(isMobile());
  }, []);

  // Don't render cursor on mobile devices
  if (isOnMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 hidden sm:block">
      {/* Faint transparent belan (rolling pin) that follows cursor smoothly */}
      <div
        className="absolute bg-gray-400"
        style={{
          width: '24px',
          height: '8px',
          borderRadius: '12px',
          transform: `translate3d(${cursorPosition.x - 12}px, ${cursorPosition.y - 4}px, 0) rotate(45deg)`,
          opacity: isMoving ? 0.15 : 0.03,
          transition: 'opacity 0.1s ease',
          willChange: 'transform, opacity'
        }}
      />

      {/* Long magical glittery trail */}
      {particles.map(particle => {
        const sparkleIntensity = 0.5 + 0.5 * Math.sin(particle.sparklePhase);
        
        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none select-none"
            style={{
              transform: `translate3d(${particle.x}px, ${particle.y}px, 0) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
              willChange: 'transform, opacity'
            }}
          >
            {particle.type === 'laugh' ? (
              /* Funny laugh emoji */
              <div 
                className="text-4xl"
                style={{
                  filter: `drop-shadow(0 0 4px gold) brightness(${0.8 + 0.4 * sparkleIntensity})`
                }}
              >
                😂
              </div>
            ) : (
              /* Sparkly star particles */
              <div
                className="relative"
                style={{
                  fontSize: '24px',
                  filter: `brightness(${0.8 + 0.4 * sparkleIntensity})`,
                  textShadow: '0 0 4px gold'
                }}
              >
                ✨
                {/* Extra sparkle effect */}
                {sparkleIntensity > 0.7 && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      fontSize: '18px',
                      filter: 'blur(1px)',
                      opacity: 0.6
                    }}
                  >
                    ⭐
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MagicalCursor;