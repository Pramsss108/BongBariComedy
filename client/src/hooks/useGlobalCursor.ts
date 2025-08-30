import { useEffect } from 'react';

export const useGlobalCursor = () => {
  useEffect(() => {
    // Create massive futuristic cursor follower
    const cursor = document.createElement('div');
    cursor.className = 'global-cursor-follower';
    cursor.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.6) 0%, rgba(68, 68, 68, 0.4) 50%, rgba(255, 204, 0, 0.2) 100%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      backdrop-filter: blur(3px);
      border: 2px solid rgba(0, 0, 0, 0.3);
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 204, 0, 0.1);
      opacity: 0;
    `;

    // Create massive cursor glow
    const cursorGlow = document.createElement('div');
    cursorGlow.className = 'global-cursor-glow';
    cursorGlow.style.cssText = `
      position: fixed;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.15) 0%, rgba(255, 204, 0, 0.1) 30%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: all 0.3s ease-out;
      opacity: 0;
      filter: blur(2px);
    `;

    document.body.appendChild(cursor);
    document.body.appendChild(cursorGlow);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      
      cursor.style.left = `${clientX}px`;
      cursor.style.top = `${clientY}px`;
      cursor.style.opacity = '1';
      
      cursorGlow.style.left = `${clientX}px`;
      cursorGlow.style.top = `${clientY}px`;
      cursorGlow.style.opacity = '0.7';

      // Check if hovering over interactive elements - catch EVERYTHING
      const target = e.target as HTMLElement;
      const isInteractive = target.matches('button, a, input, textarea, select, [role="button"], .magnetic-button, .hover-target, .card, .youtube-short, nav a, .blog-post, .form-control, [data-testid*="button"], [data-testid*="link"], [data-testid*="card"], .clickable, .interactive') || 
                           target.closest('button, a, .card, .youtube-short, nav, .blog-post, .magnetic-button, [role="button"]');
      
      if (isInteractive) {
        // PREMIUM ₹1 MILLION WEBSITE EFFECT!
        cursor.style.transform = 'translate(-50%, -50%) scale(3)';
        cursor.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(255, 204, 0, 0.8) 20%, rgba(255, 215, 0, 0.6) 40%, rgba(255, 68, 68, 0.4) 70%, rgba(68, 68, 255, 0.3) 100%)';
        cursor.style.boxShadow = `
          0 0 60px rgba(255, 204, 0, 0.8),
          0 0 120px rgba(255, 215, 0, 0.6),
          0 0 180px rgba(255, 68, 68, 0.4),
          0 0 240px rgba(68, 68, 255, 0.3),
          inset 0 0 30px rgba(255, 255, 255, 0.2)
        `;
        cursor.style.border = '4px solid rgba(255, 215, 0, 0.8)';
        
        cursorGlow.style.transform = 'translate(-50%, -50%) scale(3.5)';
        cursorGlow.style.background = 'radial-gradient(circle, rgba(255, 204, 0, 0.4) 0%, rgba(255, 215, 0, 0.3) 20%, rgba(255, 68, 68, 0.2) 40%, rgba(68, 68, 255, 0.15) 60%, transparent 80%)';
        cursorGlow.style.filter = 'blur(8px)';
        cursorGlow.style.boxShadow = '0 0 200px rgba(255, 204, 0, 0.5), 0 0 400px rgba(255, 215, 0, 0.3)';
      } else {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.6) 0%, rgba(68, 68, 68, 0.4) 50%, rgba(255, 204, 0, 0.2) 100%)';
        cursor.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 204, 0, 0.1)';
        cursor.style.border = '2px solid rgba(0, 0, 0, 0.3)';
        
        cursorGlow.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorGlow.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 0%, rgba(255, 204, 0, 0.1) 30%, transparent 70%)';
        cursorGlow.style.filter = 'blur(2px)';
      }
    };

    const handleMouseLeave = () => {
      cursor.style.opacity = '0';
      cursorGlow.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      cursor.style.opacity = '1';
      cursorGlow.style.opacity = '0.5';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      if (cursorGlow.parentNode) cursorGlow.parentNode.removeChild(cursorGlow);
    };
  }, []);
};