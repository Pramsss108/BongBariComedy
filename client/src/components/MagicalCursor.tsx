import { useMagicalCursor } from '@/hooks/useMagicalCursor';

const MagicalCursor = () => {
  const { cursorPosition, particles, isMoving } = useMagicalCursor();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Bigger grey circle that follows cursor */}
      <div
        className="absolute w-12 h-12 rounded-full bg-gray-400 transition-opacity duration-200"
        style={{
          left: cursorPosition.x - 24,
          top: cursorPosition.y - 24,
          opacity: isMoving ? 0.25 : 0.08,
          transform: 'translate3d(0, 0, 0)',
          transition: 'left 0.1s ease-out, top 0.1s ease-out'
        }}
      />

      {/* Particle trail */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: particle.opacity,
            transform: `scale(${particle.scale}) translate3d(0, 0, 0)`,
            fontSize: '28px',
            transition: 'opacity 0.1s ease-out'
          }}
        >
          {particle.emoji}
        </div>
      ))}
    </div>
  );
};

export default MagicalCursor;