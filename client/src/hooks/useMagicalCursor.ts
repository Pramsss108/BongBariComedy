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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Clear existing timer
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }

      // Create sharp particle trail - ultra responsive
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.0;
        const isLaughEmoji = Math.random() < 0.05; // 5% chance for laugh emoji
        
        const newParticle: Particle = {
          id: particleId.current++,
          x: e.clientX + (Math.random() - 0.5) * 15,
          y: e.clientY + (Math.random() - 0.5) * 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          opacity: 0.9,
          scale: 0.4 + Math.random() * 0.6,
          life: 40 + Math.random() * 15, // Sharp, fast life: 0.7-0.9 seconds
          maxLife: 40 + Math.random() * 15,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 4,
          type: isLaughEmoji ? 'laugh' : 'star',
          sparklePhase: Math.random() * Math.PI * 2
        };

        setParticles(prev => [...prev, newParticle]);
      }

      // Set timer to detect when movement stops - much faster response
      movementTimer.current = setTimeout(() => {
        setIsMoving(false);
      }, 50);
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      
      // Create full belan burst of particles on click - head to toe
      for (let i = 0; i < 15; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        
        const clickParticle: Particle = {
          id: particleId.current++,
          x: cursorPosition.x + (Math.random() - 0.5) * 25,
          y: cursorPosition.y + (Math.random() - 0.5) * 25,
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
        };
        
        setParticles(prev => [...prev, clickParticle]);
      }
    };
    
    const handleMouseUp = () => {
      setIsClicking(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
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
    }, 16); // 60fps - optimized for smooth performance

    return () => clearInterval(interval);
  }, []);

  return {
    cursorPosition,
    particles,
    isMoving,
    isClicking
  };
};