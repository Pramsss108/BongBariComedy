import { useState, useEffect } from 'react';

export interface DeviceTier {
  /** 1=small phone, 2=standard phone, 3=large phone/small tablet, 4=tablet, 5=desktop */
  tier: 1 | 2 | 3 | 4 | 5;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  isLowEnd: boolean;
  width: number;
}

function computeTier(): DeviceTier {
  if (typeof window === 'undefined') {
    return { tier: 5, isMobile: false, isTablet: false, isDesktop: true, isTouch: false, prefersReducedMotion: false, isLowEnd: false, width: 1920 };
  }

  const w = window.innerWidth;
  const tier: 1 | 2 | 3 | 4 | 5 =
    w <= 374 ? 1 :
    w <= 430 ? 2 :
    w <= 768 ? 3 :
    w <= 1024 ? 4 : 5;

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Low-end heuristic: <4 cores OR <4GB memory (if available)
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;
  const isLowEnd = cores < 4 || memory < 4;

  return {
    tier,
    isMobile: tier <= 3,
    isTablet: tier === 4,
    isDesktop: tier === 5,
    isTouch,
    prefersReducedMotion,
    isLowEnd,
    width: w,
  };
}

export function useDeviceTier(): DeviceTier {
  const [device, setDevice] = useState<DeviceTier>(computeTier);

  useEffect(() => {
    const update = () => setDevice(computeTier());

    // Recalculate on resize (debounced)
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 150);
    };

    window.addEventListener('resize', onResize);

    // Listen for reduced-motion changes
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    mql.addEventListener('change', update);

    return () => {
      window.removeEventListener('resize', onResize);
      mql.removeEventListener('change', update);
      clearTimeout(timer);
    };
  }, []);

  return device;
}
