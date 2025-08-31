import { useMagicalCursor } from '@/hooks/useMagicalCursor';

const MagicalCursor = () => {
  const { cursorPosition, particles, isMoving } = useMagicalCursor();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Faint grey circle that follows cursor smoothly */}
      <div
        className="absolute w-6 h-6 rounded-full bg-gray-400 transition-all duration-200 ease-out"
        style={{
          left: cursorPosition.x - 12,
          top: cursorPosition.y - 12,
          opacity: isMoving ? 0.15 : 0.05,
          transform: 'translate3d(0, 0, 0)',
          boxShadow: isMoving ? '0 0 20px rgba(128, 128, 128, 0.3)' : 'none',
          transition: 'left 0.08s ease-out, top 0.08s ease-out, opacity 0.2s ease-out'
        }}
      />

      {/* 3D Glowing particle trail */}
      {particles.map(particle => {
        const zFactor = 1 - (particle.z / 100);
        const blur = (1 - zFactor) * 2; // Far particles are more blurred
        
        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: particle.x - 2,
              top: particle.y - 2,
              opacity: particle.opacity,
              transform: `scale(${particle.scale}) translate3d(0, 0, ${particle.z}px)`,
              filter: `blur(${blur}px)`,
              transition: 'none'
            }}
          >
            {/* Glowing particle core */}
            <div
              className="w-4 h-4 rounded-full"
              style={{
                background: `radial-gradient(circle, ${particle.color}CC, ${particle.color}66, transparent)`,
                boxShadow: `0 0 ${8 * zFactor}px ${particle.color}88, 0 0 ${16 * zFactor}px ${particle.color}44`,
                animation: `sparkle 0.6s ease-out`
              }}
            />
          </div>
        );
      })}

      <style jsx>{`
        @keyframes sparkle {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default MagicalCursor;