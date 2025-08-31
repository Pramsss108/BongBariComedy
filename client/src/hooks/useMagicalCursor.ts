import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  opacity: number;
  emoji: string;
  scale: number;
}

export const useMagicalCursor = () => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const lastMoveTime = useRef<number>(0);
  const particleId = useRef(0);
  const movementTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);
      lastMoveTime.current = now;

      // Clear existing timer
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }

      // Create particle trail when moving
      if (Math.random() < 0.3) { // 30% chance to create particle
        const isLaughEmoji = Math.random() < 0.15; // 15% chance for laugh emoji
        const newParticle: Particle = {
          id: particleId.current++,
          x: e.clientX + (Math.random() - 0.5) * 20,
          y: e.clientY + (Math.random() - 0.5) * 20,
          opacity: 0.8,
          emoji: isLaughEmoji ? '😂' : '✨',
          scale: 0.8 + Math.random() * 0.4
        };

        setParticles(prev => [...prev, newParticle]);
      }

      // Set timer to detect when movement stops
      movementTimer.current = setTimeout(() => {
        setIsMoving(false);
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }
    };
  }, []);

  // Animate and cleanup particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(particle => ({
            ...particle,
            opacity: particle.opacity - 0.02,
            y: particle.y - 1,
            scale: particle.scale * 0.98
          }))
          .filter(particle => particle.opacity > 0)
      );
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, []);

  return {
    cursorPosition,
    particles,
    isMoving
  };
};