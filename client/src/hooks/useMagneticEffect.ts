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
      
      // Find or create circle element
      let circle = element.querySelector('.hover-circle') as HTMLElement;
      if (!circle) {
        circle = document.createElement('div');
        circle.className = 'hover-circle';
        circle.style.cssText = `
          position: absolute;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          pointer-events: none;
          transition: all 0.1s ease;
          z-index: 10;
        `;
        element.appendChild(circle);
      }
      
      circle.style.left = `${x - 10}px`;
      circle.style.top = `${y - 10}px`;
      circle.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      const circle = element.querySelector('.hover-circle') as HTMLElement;
      if (circle) {
        circle.style.opacity = '0';
        setTimeout(() => {
          if (circle.parentNode) {
            circle.parentNode.removeChild(circle);
          }
        }, 100);
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