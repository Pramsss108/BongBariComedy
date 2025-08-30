import { useRef, useEffect } from 'react';

export const useMagneticEffect = (strength: number = 0.3) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      let circle = element.querySelector('.hover-circle') as HTMLElement;
      if (!circle) {
        circle = document.createElement('div');
        circle.className = 'hover-circle';
        circle.style.cssText = `
          position: absolute;
          width: 25px;
          height: 25px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
          transform: translate(-50%, -50%);
        `;
        element.appendChild(circle);
      }
      
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
    };

    const handleMouseLeave = () => {
      const circle = element.querySelector('.hover-circle') as HTMLElement;
      if (circle && circle.parentNode) {
        circle.parentNode.removeChild(circle);
      }
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return ref;
};