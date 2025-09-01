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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      setIsMoving(true);

      // Clear existing timer
      if (movementTimer.current) {
        clearTimeout(movementTimer.current);
      }

      // Throttle particle creation for performance
      const now = Date.now();
      if (now - lastMouseTime.current < 32) return; // Limit to ~30fps particle generation
      lastMouseTime.current = now;

      // Reduced particle count for better performance
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.0;
        const isLaughEmoji = Math.random() < 0.05; // 5% chance for laugh emoji
        
        const newParticle: Particle = {
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
      
      // Reduced click particles for performance
      for (let i = 0; i < 6; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        
        const clickParticle: Particle = {
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

  // Optimized particle animation with requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      setParticles(prev => {
        if (prev.length === 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return prev;
        }
        
        const updatedParticles = [];
        for (const particle of prev) {
          const newLife = particle.life - 0.8; // Slightly slower decay
          if (newLife <= 0) continue;
          
          const lifeRatio = newLife / particle.maxLife;
          const sparkleValue = Math.sin(particle.sparklePhase);
          
          updatedParticles.push({
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
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return updatedParticles;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    cursorPosition,
    particles,
    isMoving,
    isClicking
  };
};