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
          transform: `translate3d(${cursorPosition.x - 15}px, ${cursorPosition.y - 10}px, 0) rotate(45deg) ${
            isClicking ? 'scale(1.3)' : isMoving ? 'scale(1.15)' : 'scale(1)'
          }`,
          opacity: isClicking ? 1 : isMoving ? 1 : 0.7,
          transition: 'opacity 0.01s ease, transform 0.005s ease',
          willChange: 'transform, opacity',
          filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.4)) ${isClicking ? 'brightness(1.2)' : ''}`,
          zIndex: 2147483647,
          width: '30px',
          height: '20px'
        }}
      >
        {/* Static belan body - no response */}
        <div
          style={{
            position: 'absolute',
            width: '24px',
            height: '8px',
            background: 'linear-gradient(45deg, #CD853F 0%, #D2691E 40%, #8B4513 100%)',
            borderRadius: '4px',
            left: '3px',
            top: '6px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid #654321'
          }}
        />
        
        {/* Static Left handle - no response */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '5px',
            background: 'linear-gradient(45deg, #8B4513 0%, #654321 50%, #4A2C17 100%)',
            borderRadius: '3px',
            left: '-1px',
            top: '7.5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid #3D2016'
          }}
        />
        
        {/* Static Right handle - no response */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '5px',
            background: 'linear-gradient(45deg, #8B4513 0%, #654321 50%, #4A2C17 100%)',
            borderRadius: '3px',
            left: '25px',
            top: '7.5px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid #3D2016'
          }}
        />
        
        {/* Super responsive front tip - ONLY responsive area */}
        <div
          style={{
            position: 'absolute',
            width: isClicking ? '8px' : '5px',
            height: isClicking ? '8px' : '5px',
            background: isClicking ? '#FF4500' : '#FFCC00',
            borderRadius: '50%',
            left: isClicking ? '12px' : '13px',
            top: isClicking ? '1px' : '2px',
            boxShadow: isClicking 
              ? '0 0 12px rgba(255, 69, 0, 0.9), 0 0 20px rgba(255, 69, 0, 0.5)'
              : '0 0 6px rgba(255, 204, 0, 0.8)',
            opacity: isClicking ? 1 : isMoving ? 1 : 0.9,
            transition: 'all 0.005s ease',
            transform: isClicking ? 'scale(1.2)' : 'scale(1)'
          }}
        />
        
        {/* Sharp front tip extension - part of responsive area */}
        <div
          style={{
            position: 'absolute',
            width: isClicking ? '4px' : '3px',
            height: isClicking ? '8px' : '6px',
            background: isClicking ? '#FF6347' : '#D2691E',
            borderRadius: '2px',
            left: isClicking ? '15px' : '15.5px',
            top: isClicking ? '-2px' : '-1px',
            opacity: isClicking ? 1 : 0.7,
            transition: 'all 0.005s ease',
            transform: isClicking ? 'scale(1.1)' : 'scale(1)'
          }}
        />
        
        {/* Extended responsive zone around front tip only */}
        <div
          style={{
            position: 'absolute',
            width: '30px',
            height: '30px',
            background: 'transparent',
            left: '5px',
            top: '-10px',
            borderRadius: '15px',
            pointerEvents: 'none'
          }}
          title="Front tip responsive area"
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