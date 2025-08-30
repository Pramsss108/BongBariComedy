import { useRef, useEffect } from 'react';

export const useMagneticEffect = (strength: number = 0.3) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => {
      let globalCircle = document.querySelector('.trendy-cursor-circle') as HTMLElement;
      if (!globalCircle) {
        globalCircle = document.createElement('div');
        globalCircle.className = 'trendy-cursor-circle';
        globalCircle.style.cssText = `
          position: fixed;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, rgba(0, 0, 0, 0.4) 0%, rgba(68, 68, 68, 0.3) 100%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%) scale(0);
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          backdrop-filter: blur(2px);
          border: 1px solid rgba(0, 0, 0, 0.2);
        `;
        document.body.appendChild(globalCircle);
      }
      globalCircle.style.transform = 'translate(-50%, -50%) scale(1.2)';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const globalCircle = document.querySelector('.trendy-cursor-circle') as HTMLElement;
      if (globalCircle) {
        globalCircle.style.left = `${e.clientX}px`;
        globalCircle.style.top = `${e.clientY}px`;
      }
    };

    const handleMouseLeave = () => {
      const globalCircle = document.querySelector('.trendy-cursor-circle') as HTMLElement;
      if (globalCircle) {
        globalCircle.style.transform = 'translate(-50%, -50%) scale(0)';
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