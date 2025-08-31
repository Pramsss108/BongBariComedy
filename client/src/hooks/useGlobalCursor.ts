import { useEffect } from 'react';

// Mobile detection utility
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const useGlobalCursor = () => {
  useEffect(() => {
    // Don't create cursor on mobile devices
    if (isMobile()) {
      return;
    }
    // Remove any existing cursors first to prevent multiple circles
    const existingCursors = document.querySelectorAll('.global-cursor-follower, .global-cursor-ring');
    existingCursors.forEach(el => el.remove());

    // Create BIG rolling pin cursor!
    const cursor = document.createElement('img');
    cursor.className = 'global-cursor-follower';
    cursor.src = '@assets/rolling-pin_1756659784180.png';
    cursor.alt = 'Rolling Pin Cursor';
    cursor.style.cssText = `
      position: fixed;
      width: 48px;
      height: 48px;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) rotate(45deg);
      transition: opacity 0.2s ease;
      opacity: 0;
    `;

    document.body.appendChild(cursor);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      
      cursor.style.left = `${clientX}px`;
      cursor.style.top = `${clientY}px`;
      cursor.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      cursor.style.opacity = '0';
    };

    const handleMouseEnter = () => {
      cursor.style.opacity = '1';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
    };
  }, []);
};