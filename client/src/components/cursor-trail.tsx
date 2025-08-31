import { useEffect, useState, useCallback } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji?: string;
  type: 'emoji' | 'sparkle';
  timestamp: number;
}

const CursorTrail = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // MEGA FUN emojis for the trail - Bengali comedy themed!
  const emojis = ['😂', '🤣', '❤️', '🎭', '✨', '🌟', '💫', '🎪', '🎉', '🎊', '💖', '🔥', '⭐', '🌈', '🦋', '🎈', '😆', '😍', '🥰', '😊', '🎯', '🎨', '🎬', '📺', '🎤', '🎵', '🎶', '💃', '🕺', '👏', '🙌', '🎊', '🎁', '🌸', '🌺', '🌻', '🎼'];
  
  const createParticle = useCallback((x: number, y: number): Particle => {
    const isEmoji = Math.random() > 0.4; // 60% chance of emoji, 40% sparkle
    return {
      id: Math.random() * 10000,
      x: x + (Math.random() - 0.5) * 30, // Random offset
      y: y + (Math.random() - 0.5) * 30,
      emoji: isEmoji ? emojis[Math.floor(Math.random() * emojis.length)] : undefined,
      type: isEmoji ? 'emoji' : 'sparkle',
      timestamp: Date.now(),
    };
  }, [emojis]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { clientX, clientY } = e;
    setIsMoving(true);
    
    // Create 3-6 particles per mouse move for MAXIMUM fun!
    const particleCount = Math.floor(Math.random() * 4) + 3;
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push(createParticle(clientX, clientY));
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  }, [createParticle]);

  const handleMouseStop = useCallback(() => {
    setIsMoving(false);
  }, []);

  useEffect(() => {
    let moveTimeout: NodeJS.Timeout;
    
    const throttledMouseMove = (e: MouseEvent) => {
      clearTimeout(moveTimeout);
      handleMouseMove(e);
      moveTimeout = setTimeout(handleMouseStop, 100);
    };

    document.addEventListener('mousemove', throttledMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', throttledMouseMove);
      clearTimeout(moveTimeout);
    };
  }, [handleMouseMove, handleMouseStop]);

  // Clean up old particles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles(prev => prev.filter(particle => now - particle.timestamp < 2000)); // Remove after 2 seconds
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cursor-trail-container fixed inset-0 pointer-events-none z-[9999]" style={{ mixBlendMode: 'normal' }}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`cursor-particle absolute ${particle.type === 'emoji' ? 'cursor-emoji' : 'cursor-sparkle'}`}
          style={{
            left: particle.x,
            top: particle.y,
            transform: 'translate(-50%, -50%)',
          }}
          data-timestamp={particle.timestamp}
        >
          {particle.type === 'emoji' ? (
            <span className="text-3xl select-none" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>{particle.emoji}</span>
          ) : (
            <div className="sparkle-dot mega-sparkle"></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CursorTrail;