import { useMagicalCursor } from '@/hooks/useMagicalCursor';
import { useState, useEffect } from 'react';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

const MagicalCursor = () => {
  const [isOnMobile, setIsOnMobile] = useState(false);
  const { cursorPosition, particles, isMoving, isClicking } = useMagicalCursor();

  useEffect(() => {
    setIsOnMobile(isMobile());
    
    // Force cursor to appear over iframes with JavaScript - targeting first video specifically
    const style = document.createElement('style');
    style.id = 'magical-cursor-force';
    style.textContent = `
      .magical-belan-portal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        mix-blend-mode: multiply !important;
      }
      
      /* Target ALL iframes and their containers */
      iframe, video, embed, object {
        z-index: 1 !important;
        position: relative !important;
      }
      
      /* Specifically target the first video container */
      .relative.aspect-video,
      .relative.aspect-video iframe,
      [class*="aspect-video"] iframe {
        z-index: 1 !important;
        isolation: auto !important;
      }
      
      /* Force stacking context reset for YouTube containers */
      div:has(iframe[src*="youtube.com"]),
      div:has(iframe[src*="youtu.be"]) {
        z-index: 1 !important;
        isolation: auto !important;
        position: relative !important;
      }
    `;
    
    if (!document.getElementById('magical-cursor-force')) {
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById('magical-cursor-force');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Don't render cursor on mobile devices
  if (isOnMobile) {
    return null;
  }

  return (
    <div className="magical-belan-portal">
      {/* Super Responsive CSS Belan - reacts like cursor arrow */}
      <div
        className="belan-cursor-responsive"
        style={{
          position: 'absolute',
          transform: `translate3d(${cursorPosition.x - 18}px, ${cursorPosition.y - 12}px, 0) rotate(45deg) ${
            isClicking ? 'scale(1.3)' : isMoving ? 'scale(1.15)' : 'scale(1)'
          }`,
          opacity: isClicking ? 1 : isMoving ? 1 : 0.7,
          transition: 'opacity 0.05s ease, transform 0.02s ease',
          willChange: 'transform, opacity',
          filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.4)) ${isClicking ? 'brightness(1.2)' : ''}`,
          zIndex: 2147483647,
          width: '36px',
          height: '24px'
        }}
      >
        {/* Enhanced Main wooden body - larger and more responsive */}
        <div
          style={{
            position: 'absolute',
            width: '28px',
            height: '10px',
            background: isClicking 
              ? 'linear-gradient(45deg, #FFD700 0%, #FFA500 40%, #FF6347 100%)' 
              : 'linear-gradient(45deg, #CD853F 0%, #D2691E 40%, #8B4513 100%)',
            borderRadius: '5px',
            left: '4px',
            top: '7px',
            boxShadow: isClicking 
              ? '0 4px 8px rgba(255,215,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4)'
              : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: isClicking ? '1px solid #DAA520' : '1px solid #654321',
            transition: 'all 0.02s ease'
          }}
        />
        
        {/* Enhanced Left handle - larger and more responsive */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '6px',
            background: 'linear-gradient(45deg, #8B4513 0%, #654321 50%, #4A2C17 100%)',
            borderRadius: '4px',
            left: '-2px',
            top: '9px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid #3D2016'
          }}
        />
        
        {/* Enhanced Right handle - larger and more responsive */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '6px',
            background: 'linear-gradient(45deg, #8B4513 0%, #654321 50%, #4A2C17 100%)',
            borderRadius: '4px',
            left: '26px',
            top: '9px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid #3D2016'
          }}
        />
        
        {/* Extended cursor tip for better click targeting */}
        <div
          style={{
            position: 'absolute',
            width: isClicking ? '6px' : '4px',
            height: isClicking ? '6px' : '4px',
            background: isClicking ? '#FF4500' : '#FFCC00',
            borderRadius: '50%',
            left: isClicking ? '15px' : '16px',
            top: isClicking ? '9px' : '10px',
            boxShadow: isClicking 
              ? '0 0 8px rgba(255, 69, 0, 0.9), 0 0 16px rgba(255, 69, 0, 0.4)'
              : '0 0 4px rgba(255, 204, 0, 0.6)',
            opacity: isClicking ? 1 : isMoving ? 1 : 0.8,
            transition: 'all 0.02s ease'
          }}
        />
        
        {/* Extended top tip for better click area and smoother responsiveness */}
        <div
          style={{
            position: 'absolute',
            width: '3px',
            height: '8px',
            background: isClicking ? '#FF6347' : '#D2691E',
            borderRadius: '1.5px',
            left: '16.5px',
            top: '2px',
            opacity: isClicking ? 0.9 : 0.6,
            transition: 'all 0.02s ease'
          }}
        />
      </div>

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
              willChange: 'transform, opacity',
              zIndex: 2147483647
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