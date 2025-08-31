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

    // Create BIG CSS Belan cursor!
    const cursor = document.createElement('div');
    cursor.className = 'global-cursor-follower';
    cursor.style.cssText = `
      position: fixed;
      width: 48px;
      height: 16px;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) rotate(45deg);
      transition: opacity 0.2s ease;
      opacity: 0;
    `;
    
    // Create main wooden body
    const body = document.createElement('div');
    body.style.cssText = `
      position: absolute;
      width: 40px;
      height: 12px;
      background-color: #D2691E;
      border-radius: 6px;
      left: 4px;
      top: 2px;
    `;
    
    // Create left handle
    const leftHandle = document.createElement('div');
    leftHandle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 6px;
      background-color: #8B4513;
      border-radius: 3px;
      left: -2px;
      top: 5px;
    `;
    
    // Create right handle
    const rightHandle = document.createElement('div');
    rightHandle.style.cssText = `
      position: absolute;
      width: 8px;
      height: 6px;
      background-color: #8B4513;
      border-radius: 3px;
      left: 42px;
      top: 5px;
    `;
    
    cursor.appendChild(body);
    cursor.appendChild(leftHandle);
    cursor.appendChild(rightHandle);

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