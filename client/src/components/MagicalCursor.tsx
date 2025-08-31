import { useMagicalCursor } from '@/hooks/useMagicalCursor';

const MagicalCursor = () => {
  const { cursorPosition, particles, isMoving } = useMagicalCursor();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Faint grey circle that follows cursor smoothly */}
      <div
        className="absolute w-8 h-8 rounded-full bg-gray-500 opacity-20"
        style={{
          left: cursorPosition.x - 16,
          top: cursorPosition.y - 16,
          transform: 'translate3d(0, 0, 0)',
          transition: 'left 0.1s ease-out, top 0.1s ease-out'
        }}
      />

      {/* Visible glowing particle trail */}
      {particles.map(particle => {
        const zFactor = Math.max(0.3, 1 - (particle.z / 100));
        
        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: particle.x - 4,
              top: particle.y - 4,
              opacity: particle.opacity * 0.8,
              transform: `scale(${particle.scale * zFactor})`,
              transition: 'none'
            }}
          >
            {/* Simple glowing particle */}
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: particle.color,
                boxShadow: `0 0 8px ${particle.color}, 0 0 16px ${particle.color}66`,
                filter: 'blur(0.5px)'
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MagicalCursor;