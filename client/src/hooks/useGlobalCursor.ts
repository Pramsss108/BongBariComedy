import { useEffect } from 'react';

export const useGlobalCursor = () => {
  useEffect(() => {
    // Create professional zoom cursor - clean and transparent
    const cursor = document.createElement('div');
    cursor.className = 'global-cursor-follower';
    cursor.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      background: rgba(0, 0, 0, 0.1);
      border: 2px solid rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: all 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 0;
    `;

    // Create subtle outer ring
    const cursorRing = document.createElement('div');
    cursorRing.className = 'global-cursor-ring';
    cursorRing.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9998;
      transform: translate(-50%, -50%);
      transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      opacity: 0;
    `;

    document.body.appendChild(cursor);
    document.body.appendChild(cursorRing);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      
      cursor.style.left = `${clientX}px`;
      cursor.style.top = `${clientY}px`;
      cursor.style.opacity = '1';
      
      cursorRing.style.left = `${clientX}px`;
      cursorRing.style.top = `${clientY}px`;
      cursorRing.style.opacity = '0.8';

      // Check if hovering over ANY interactive element - super responsive
      const target = e.target as HTMLElement;
      const isInteractive = target.matches('button, a, input, textarea, select, [role="button"], .magnetic-button, .hover-target, .card, .youtube-short, nav a, .blog-post, .form-control, [data-testid*="button"], [data-testid*="link"], [data-testid*="card"], .clickable, .interactive, label[for]') || 
                           target.closest('button, a, .card, .youtube-short, nav, .blog-post, .magnetic-button, [role="button"], label[for]');
      
      if (isInteractive) {
        // Professional zoom hover - bigger but not too big
        cursor.style.transform = 'translate(-50%, -50%) scale(2.8)';
        cursor.style.background = 'rgba(0, 0, 0, 0.15)';
        cursor.style.border = '2px solid rgba(0, 0, 0, 0.4)';
        
        cursorRing.style.transform = 'translate(-50%, -50%) scale(3.5)';
        cursorRing.style.border = '1px solid rgba(0, 0, 0, 0.3)';
        cursorRing.style.opacity = '0.6';
      } else {
        // Clean normal cursor
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.background = 'rgba(0, 0, 0, 0.1)';
        cursor.style.border = '2px solid rgba(0, 0, 0, 0.3)';
        
        cursorRing.style.transform = 'translate(-50%, -50%) scale(1)';
        cursorRing.style.border = '1px solid rgba(0, 0, 0, 0.2)';
        cursorRing.style.opacity = '0.4';
      }
    };

    const handleMouseLeave = () => {
      cursor.style.opacity = '0';
      cursorRing.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      cursor.style.opacity = '1';
      cursorRing.style.opacity = '0.4';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      if (cursorRing.parentNode) cursorRing.parentNode.removeChild(cursorRing);
    };
  }, []);
};