import { useEffect } from 'react';

export const useGlobalCursor = () => {
  useEffect(() => {
    // Remove any existing cursors first 
    const existingCursors = document.querySelectorAll('.professional-cursor-container, .global-cursor-follower');
    existingCursors.forEach(el => el.remove());

    // Create $4000 Professional Magical Cursor Container
    const cursorContainer = document.createElement('div');
    cursorContainer.className = 'professional-cursor-container';
    cursorContainer.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Main subtle cursor circle
    const mainCursor = document.createElement('div');
    mainCursor.className = 'professional-cursor';
    mainCursor.style.cssText = `
      width: 30px;
      height: 30px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 204, 0, 0.3);
      border-radius: 50%;
      backdrop-filter: blur(5px);
      position: relative;
      animation: professionalPulse 2s ease-in-out infinite;
    `;

    // Elegant glitter effects
    const glitter1 = document.createElement('div');
    glitter1.className = 'professional-glitter';
    glitter1.innerHTML = '✨';
    glitter1.style.cssText = `
      position: absolute;
      top: -8px;
      left: 20px;
      font-size: 10px;
      opacity: 0;
      animation: elegantTwinkle 2.5s ease-in-out infinite;
    `;

    const glitter2 = document.createElement('div');
    glitter2.className = 'professional-glitter';
    glitter2.innerHTML = '⭐';
    glitter2.style.cssText = `
      position: absolute;
      bottom: -8px;
      right: 18px;
      font-size: 8px;
      opacity: 0;
      animation: elegantTwinkle 2.5s ease-in-out infinite;
      animation-delay: 0.8s;
    `;

    const glitter3 = document.createElement('div');
    glitter3.className = 'professional-glitter';
    glitter3.innerHTML = '✨';
    glitter3.style.cssText = `
      position: absolute;
      top: 12px;
      left: -10px;
      font-size: 9px;
      opacity: 0;
      animation: elegantTwinkle 2.5s ease-in-out infinite;
      animation-delay: 1.6s;
    `;

    cursorContainer.appendChild(mainCursor);
    cursorContainer.appendChild(glitter1);
    cursorContainer.appendChild(glitter2);
    cursorContainer.appendChild(glitter3);
    
    document.body.appendChild(cursorContainer);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      cursorContainer.style.left = `${clientX - 15}px`;
      cursorContainer.style.top = `${clientY - 15}px`;
      cursorContainer.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      cursorContainer.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      cursorContainer.style.opacity = '1';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      
      if (cursorContainer.parentNode) {
        cursorContainer.parentNode.removeChild(cursorContainer);
      }
    };
  }, []);
};