import { useMagicalCursor } from '@/hooks/useMagicalCursor';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

const MagicalCursor = () => {
  const [isOnMobile, setIsOnMobile] = useState(false);
  const [forceHide, setForceHide] = useState(false);
  const { cursorPosition, particles, isMoving, isClicking } = useMagicalCursor();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setIsOnMobile(isMobile());
    
    // Listen for auth state changes to update cursor immediately
    const handleAuthChange = () => {
      setForceHide(false); // Force re-render
      setTimeout(() => setForceHide(false), 10);
    };
    
    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
  }, []);

  useEffect(() => {
    // Clean up cursor elements when authenticated
    if (isAuthenticated) {
      const belanElements = document.querySelectorAll('.magical-belan-portal, .particle-container');
      belanElements.forEach(el => el.remove());
    }
    
    // Only inject styles if not authenticated (admin not logged in)
    if (!isAuthenticated) {
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
    }
    
    return () => {
      const existingStyle = document.getElementById('magical-cursor-force');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isAuthenticated]);

  // Don't render cursor on mobile devices or when admin is logged in
  if (isOnMobile || isAuthenticated) {
    return null;
  }

  return (
    <div className="magical-belan-portal">
      {/* Super Responsive CSS Belan - reacts like cursor arrow */}
      <div
        className="belan-cursor-responsive"
        style={{
          position: 'absolute',
          transform: `translate3d(${cursorPosition.x - 4}px, ${cursorPosition.y - 12}px, 0) scale(${isClicking ? 1.1 : 1})`,
          opacity: 1,
          willChange: 'transform',
          filter: isClicking ? 'brightness(1.2)' : 'none',
          zIndex: 2147483647,
          imageRendering: 'crisp-edges',
          backfaceVisibility: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {/* Main belan cylinder body - vertical */}
        <div
          style={{
            position: 'absolute',
            width: '8px',
            height: '16px',
            background: '#B8860B',
            borderRadius: '4px',
            left: '0px',
            top: '4px',
            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
            border: '1px solid #8B4513'
          }}
        />
        
        {/* Top handle - thin rod */}
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '6px',
            background: '#A0522D',
            borderRadius: '2px',
            left: '2px',
            top: '0px',
            border: '0.5px solid #654321'
          }}
        />
        
        {/* Bottom handle - thin rod */}
        <div
          style={{
            position: 'absolute',
            width: '4px',
            height: '6px',
            background: '#A0522D',
            borderRadius: '2px',
            left: '2px',
            top: '18px',
            border: '0.5px solid #654321'
          }}
        />
        
        {/* Click indicator dot */}
        <div
          style={{
            position: 'absolute',
            width: '2px',
            height: '2px',
            background: isClicking ? '#FF4500' : 'rgba(255, 204, 0, 0.8)',
            borderRadius: '50%',
            left: '3px',
            top: '11px',
            boxShadow: isClicking 
              ? '0 0 4px rgba(255, 69, 0, 0.8)'
              : '0 0 2px rgba(255, 204, 0, 0.6)',
            opacity: isClicking ? 1 : 0.9,
            transform: `scale(${isClicking ? 1.2 : 1})`,
            willChange: 'transform'
          }}
        />
        
        {/* Wood grain lines on main body */}
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '1px',
            background: 'rgba(139, 69, 19, 0.4)',
            left: '1px',
            top: '8px'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '1px',
            background: 'rgba(139, 69, 19, 0.4)',
            left: '1px',
            top: '12px'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '6px',
            height: '1px',
            background: 'rgba(139, 69, 19, 0.4)',
            left: '1px',
            top: '16px'
          }}
        />
        
        
      </div>

      {/* Optimized magical trail */}
      {particles.map(particle => {
        const sparkleIntensity = 0.5 + 0.5 * Math.sin(particle.sparklePhase);
        
        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none select-none"
            style={{
              transform: `translate3d(${particle.x}px, ${particle.y}px, 0) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
              willChange: 'transform',
              zIndex: 2147483647,
              backfaceVisibility: 'hidden'
            }}
          >
            {particle.type === 'laugh' ? (
              /* Funny laugh emoji */
              <div 
                className="text-3xl"
                style={{
                  filter: `drop-shadow(0 0 3px gold) brightness(${0.8 + 0.3 * sparkleIntensity})`,
                  textRendering: 'optimizeSpeed'
                }}
              >
                😂
              </div>
            ) : (
              /* Sparkly star particles */
              <div
                className="relative"
                style={{
                  fontSize: '20px',
                  filter: `brightness(${0.8 + 0.3 * sparkleIntensity})`,
                  textShadow: '0 0 3px gold',
                  textRendering: 'optimizeSpeed'
                }}
              >
                ✨
                {/* Optimized sparkle effect */}
                {sparkleIntensity > 0.8 && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      fontSize: '16px',
                      filter: 'blur(0.5px)',
                      opacity: 0.5,
                      textRendering: 'optimizeSpeed'
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