import { useEffect } from 'react';

export const useGlobalCursor = () => {
  useEffect(() => {
    // Create cursor follower
    const cursor = document.createElement('div');
    cursor.className = 'global-cursor-follower';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(68, 68, 68, 0.2) 100%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      backdrop-filter: blur(1px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      opacity: 0;
    `;

    // Create cursor glow
    const cursorGlow = document.createElement('div');
    cursorGlow.className = 'global-cursor-glow';
    cursorGlow.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: all 0.2s ease-out;
      opacity: 0;
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
      cursorGlow.style.opacity = '0.5';

      // Check if hovering over interactive elements
      const target = e.target as HTMLElement;
      const isInteractive = target.matches('button, a, input, textarea, [role="button"], .magnetic-button, .hover-target');
      
      if (isInteractive) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        cursor.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.6) 0%, rgba(68, 68, 68, 0.4) 100%)';
        cursorGlow.style.transform = 'translate(-50%, -50%) scale(1.3)';
        cursorGlow.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 0%, transparent 70%)';
      } else {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(68, 68, 68, 0.2) 100%)';
        cursorGlow.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorGlow.style.background = 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 0%, transparent 70%)';
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