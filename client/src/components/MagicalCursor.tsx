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
          transform: `translate3d(${cursorPosition.x - 12}px, ${cursorPosition.y - 4}px, 0) rotate(0deg) ${
            isClicking ? 'scale(1.1)' : isMoving ? 'scale(1.05)' : 'scale(1)'
          }`,
          opacity: isClicking ? 1 : isMoving ? 1 : 0.7,
          transition: 'opacity 0.01s ease, transform 0.005s ease',
          willChange: 'transform, opacity',
          filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.4)) ${isClicking ? 'brightness(1.2)' : ''}`,
          zIndex: 2147483647
        }}
      >
        {/* Main belan cylinder body - realistic */}
        <div
          style={{
            position: 'absolute',
            width: '14px',
            height: '7px',
            background: 'linear-gradient(180deg, #E8C4A0 0%, #D2691E 15%, #B8860B 40%, #A0522D 60%, #8B4513 85%, #654321 100%)',
            borderRadius: '3.5px',
            left: '6px',
            top: '0px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
            border: '0.5px solid rgba(101, 67, 33, 0.8)'
          }}
        />
        
        {/* Left handle - realistic thin */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '4px',
            background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
            borderRadius: '2px',
            left: '0px',
            top: '1.5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.1)',
            border: '0.5px solid rgba(61, 32, 22, 0.9)'
          }}
        />
        
        {/* Right handle - realistic thin */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '4px',
            background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
            borderRadius: '2px',
            left: '20px',
            top: '1.5px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.5), inset 0 0.5px 0 rgba(255,255,255,0.1)',
            border: '0.5px solid rgba(61, 32, 22, 0.9)'
          }}
        />
        
        {/* Front tip - click indicator */}
        <div
          style={{
            position: 'absolute',
            width: isClicking ? '3px' : '2px',
            height: isClicking ? '3px' : '2px',
            background: isClicking ? '#FF4500' : 'rgba(255, 204, 0, 0.6)',
            borderRadius: '50%',
            left: '12px',
            top: '-2px',
            boxShadow: isClicking 
              ? '0 0 6px rgba(255, 69, 0, 0.9), 0 0 10px rgba(255, 69, 0, 0.5)'
              : '0 0 3px rgba(255, 204, 0, 0.8)',
            opacity: isClicking ? 1 : isMoving ? 1 : 0.9,
            transition: 'all 0.005s ease',
            transform: isClicking ? 'scale(1.2)' : 'scale(1)'
          }}
        />
        
        {/* Wood grain detail line */}
        <div
          style={{
            position: 'absolute',
            width: '10px',
            height: '0.5px',
            background: 'rgba(139, 69, 19, 0.3)',
            left: '8px',
            top: '3px',
            opacity: 0.5
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