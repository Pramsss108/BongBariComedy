import { useEffect } from 'react';

export const useGlobalCursor = () => {
  useEffect(() => {
    // Remove any existing cursors first to prevent multiple circles
    const existingCursors = document.querySelectorAll('.global-cursor-follower, .global-cursor-ring');
    existingCursors.forEach(el => el.remove());

    // Create BIG cursor circle - 3x bigger!
    const cursor = document.createElement('div');
    cursor.className = 'global-cursor-follower';
    cursor.style.cssText = `
      position: fixed;
      width: 60px;
      height: 60px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
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