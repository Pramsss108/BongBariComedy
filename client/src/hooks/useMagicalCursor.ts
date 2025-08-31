import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  opacity: number;
  scale: number;
  life: number;
  maxLife: number;
  color: string;
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

      // Create 3D particle trail when moving
      if (Math.random() < 0.4) { // 40% chance to create particle
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 1.5;
        const colors = ['#FFD700', '#87CEEB', '#FF69B4', '#98FB98', '#DDA0DD'];
        
        const newParticle: Particle = {
          id: particleId.current++,
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          z: Math.random() * 100, // Z-depth for 3D effect
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: (Math.random() - 0.5) * 2, // Random Z velocity
          opacity: 0.8,
          scale: 0.3 + Math.random() * 0.4,
          life: 60, // frames to live
          maxLife: 60,
          color: colors[Math.floor(Math.random() * colors.length)]
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

  // Animate and cleanup particles with 3D physics
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev
          .map(particle => {
            const newLife = particle.life - 1;
            const lifeRatio = newLife / particle.maxLife;
            const zFactor = 1 - (particle.z / 100); // Closer = larger/more opaque
            
            return {
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              z: particle.z + particle.vz,
              vx: particle.vx * 0.98, // Slight friction
              vy: particle.vy * 0.98,
              vz: particle.vz * 0.98,
              opacity: lifeRatio * 0.8 * zFactor,
              scale: particle.scale * (0.5 + 0.5 * zFactor), // Size based on depth
              life: newLife
            };
          })
          .filter(particle => particle.life > 0)
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