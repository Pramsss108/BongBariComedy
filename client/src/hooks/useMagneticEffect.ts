import { useRef, useEffect } from 'react';

export const useMagneticEffect = (strength: number = 0.3) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * strength * 0.3; // Strong magnetic pull
      const deltaY = (e.clientY - centerY) * strength * 0.3; // Strong magnetic pull
      
      element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.15) rotate(${deltaX * 0.1}deg)`; // Dramatic scale + rotation
      element.style.filter = `brightness(1.2) saturate(1.3) drop-shadow(0 0 20px rgba(255, 204, 0, 0.6))`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
      element.style.filter = 'brightness(1) saturate(1) drop-shadow(none)';
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