import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  scale: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  type: 'star' | 'laugh';
  sparklePhase: number;
}

export const useMagicalCursor = () => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const particleId = useRef(0);
  const movementTimer = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const lastMouseTime = useRef(0);
  const lastAnimTimeRef = useRef<number>(0);
  const lastCursorUpdateRef = useRef<number>(0);
  const isAnimatingRef = useRef<boolean>(false);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_PARTICLES = prefersReducedMotion ? 36 : 60; // Cap to prevent DOM churn
  const modalOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const ensureAnimationRunning = () => {
      if (!isAnimatingRef.current) {
        isAnimatingRef.current = true;
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    const handleModalFlag = (e: Event) => {
      try {
        // @ts-ignore
        const detail = (e as CustomEvent).detail;
        modalOpenRef.current = Boolean(detail);
        if (modalOpenRef.current) {
          // Clear any existing particles to remove DOM cost while modal is open
          requestAnimationFrame(() => setParticles([]));
        }
      } catch {
        modalOpenRef.current = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle cursor position updates to ~60fps
      const nowTs = performance.now();
      if (nowTs - lastCursorUpdateRef.current >= 16) {
        lastCursorUpdateRef.current = nowTs;
        setCursorPosition({ x: e.clientX, y: e.clientY });
      }
      setIsMoving(true);

      // Clear existing timer
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }

      // Throttle particle creation for performance
      const now = Date.now();
      if (now - lastMouseTime.current < 32) return; // Limit to ~30fps particle generation
      lastMouseTime.current = now;

  // Reduced particle count for better performance (batch update)
  const additions: Particle[] = [];
  const spawnCount = modalOpenRef.current ? 0 : 2; // no spawn while modal open
  for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.0;
        const isLaughEmoji = Math.random() < 0.05; // 5% chance for laugh emoji
        additions.push({
          id: particleId.current++,
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          opacity: 0.9,
          scale: 0.4 + Math.random() * 0.6,
          life: 35 + Math.random() * 10, // Optimized particle lifetime
          maxLife: 35 + Math.random() * 10,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          type: isLaughEmoji ? 'laugh' : 'star',
          sparklePhase: Math.random() * Math.PI * 2
        });
      }
      setParticles(prev => {
        const next = [...prev, ...additions];
        return next.length > MAX_PARTICLES ? next.slice(next.length - MAX_PARTICLES) : next;
      });

      // Set timer to detect when movement stops - much faster response
      movementTimer.current = setTimeout(() => {
        setIsMoving(false);
      }, 50);

      // Make sure animation is running when new particles are added
      ensureAnimationRunning();
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      
      // Reduced click particles for performance (batch update)
      const additions: Particle[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        additions.push({
          id: particleId.current++,
          x: cursorPosition.x + (Math.random() - 0.5) * 12,
          y: cursorPosition.y + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          opacity: 1,
          scale: 0.6 + Math.random() * 0.4,
          life: 40,
          maxLife: 40,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8,
          type: Math.random() < 0.3 ? 'laugh' : 'star',
          sparklePhase: Math.random() * Math.PI * 2
        });
      }
      setParticles(prev => {
        const next = [...prev, ...additions];
        return next.length > MAX_PARTICLES ? next.slice(next.length - MAX_PARTICLES) : next;
      });

      // Ensure animation runs for click burst
      ensureAnimationRunning();
    };
    
    const handleMouseUp = () => {
      setIsClicking(false);
    };

  document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('bbc:modal-open', handleModalFlag as EventListener);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' || (typeof document.hasFocus === 'function' && !document.hasFocus())) {
        // Clear particles and mark not moving to stop trail while hidden/unfocused
        setParticles([]);
        setIsMoving(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility as any, { passive: true } as any);
    window.addEventListener('blur', handleVisibility as any, { passive: true } as any);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('bbc:modal-open', handleModalFlag as EventListener);
  document.removeEventListener('visibilitychange', handleVisibility as any);
  window.removeEventListener('blur', handleVisibility as any);
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }
    };
  }, []);

  // Optimized particle animation with requestAnimationFrame
  useEffect(() => {
    // Start the animation loop once on mount and keep it running
    isAnimatingRef.current = true;
    const tick = () => {
      // Skip animating when hidden or unfocused
      if (document.visibilityState === 'visible' && (typeof document.hasFocus !== 'function' || document.hasFocus())) {
        animate();
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      isAnimatingRef.current = false;
    };
  }, []);

  const animate = () => {
    const now = performance.now();
    const minFrameMs = 1000 / 30; // ~30fps target
    if (now - lastAnimTimeRef.current < minFrameMs) return; // Skip work, but rAF keeps running
    lastAnimTimeRef.current = now;

    setParticles(prev => {
      if (prev.length === 0) return prev; // Nothing to update this frame
      const updated: Particle[] = [];
      for (const particle of prev) {
        const newLife = particle.life - 0.8; // Slightly slower decay
        if (newLife <= 0) continue;

        const lifeRatio = newLife / particle.maxLife;
        const sparkleValue = Math.sin(particle.sparklePhase);

        updated.push({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vx: particle.vx * 0.996,
          vy: particle.vy * 0.996,
          opacity: Math.max(0, lifeRatio * 0.8),
          scale: particle.scale * (0.96 + 0.04 * sparkleValue),
          rotation: particle.rotation + particle.rotationSpeed,
          sparklePhase: particle.sparklePhase + 0.08,
          life: newLife
        });
      }
      return updated;
    });
  };

  return {
    cursorPosition,
    particles,
    isMoving,
    isClicking
  };
};