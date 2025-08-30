import { useRef } from 'react';

export const useMagneticEffect = (strength: number = 0.3) => {
  const ref = useRef<HTMLElement>(null);
  // Now just returns ref - global cursor handles everything
  return ref;
};