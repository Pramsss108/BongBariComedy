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
  const particleId = useRef(0);
  const movementTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Clear existing timer
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }

      // Create smooth particle trail - optimized performance
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 1.2;
        const isLaughEmoji = Math.random() < 0.08; // 8% chance for laugh emoji
        
        const newParticle: Particle = {
          id: particleId.current++,
          x: e.clientX + (Math.random() - 0.5) * 15,
          y: e.clientY + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          opacity: 0.9,
          scale: 0.4 + Math.random() * 0.6,
          life: 90 + Math.random() * 30, // Shorter life: 1.5-2 seconds
          maxLife: 90 + Math.random() * 30,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          type: isLaughEmoji ? 'laugh' : 'star',
          sparklePhase: Math.random() * Math.PI * 2
        };

        setParticles(prev => [...prev, newParticle]);
      }

      // Set timer to detect when movement stops
      movementTimer.current = setTimeout(() => {
        setIsMoving(false);
      }, 150);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }
    };
  }, []);

  // Animate particles with sparkle effects
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(particle => {
            const newLife = particle.life - 1;
            const lifeRatio = newLife / particle.maxLife;
            
            return {
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vx: particle.vx * 0.995, // Very slight friction for smooth movement
              vy: particle.vy * 0.995,
              opacity: Math.max(0, lifeRatio * 0.8), // Slow fade
              scale: particle.scale * (0.95 + 0.05 * Math.sin(particle.sparklePhase)), // Sparkle effect
              rotation: particle.rotation + particle.rotationSpeed,
              sparklePhase: particle.sparklePhase + 0.1,
              life: newLife
            };
          })
          .filter(particle => particle.life > 0)
      );
    }, 20); // 50fps - slightly reduced for performance

    return () => clearInterval(interval);
  }, []);

  return {
    cursorPosition,
    particles,
    isMoving
  };
};