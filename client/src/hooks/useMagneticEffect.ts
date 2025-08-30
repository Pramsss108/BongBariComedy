import { useRef, useEffect } from 'react';

export const useMagneticEffect = (strength: number = 0.3) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => {
      // Show global cursor follower
      let globalCircle = document.querySelector('.global-cursor-circle') as HTMLElement;
      if (!globalCircle) {
        globalCircle = document.createElement('div');
        globalCircle.className = 'global-cursor-circle';
        globalCircle.style.cssText = `
          position: fixed;
          width: 25px;
          height: 25px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%);
        `;
        document.body.appendChild(globalCircle);
      }
      globalCircle.style.display = 'block';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const globalCircle = document.querySelector('.global-cursor-circle') as HTMLElement;
      if (globalCircle) {
        globalCircle.style.left = `${e.clientX}px`;
        globalCircle.style.top = `${e.clientY}px`;
      }
    };

    const handleMouseLeave = () => {
      const globalCircle = document.querySelector('.global-cursor-circle') as HTMLElement;
      if (globalCircle) {
        globalCircle.style.display = 'none';
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return ref;
};