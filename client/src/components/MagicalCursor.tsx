import { useMagicalCursor } from '@/hooks/useMagicalCursor';

const MagicalCursor = () => {
  const { cursorPosition, particles, isMoving } = useMagicalCursor();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Faint transparent grey circle that follows cursor smoothly */}
      <div
        className="absolute w-6 h-6 rounded-full bg-gray-400"
        style={{
          left: cursorPosition.x - 12,
          top: cursorPosition.y - 12,
          opacity: isMoving ? 0.2 : 0.05,
          transform: `translate3d(${cursorPosition.x - 12}px, ${cursorPosition.y - 12}px, 0)`,
          transition: 'opacity 0.2s ease',
          willChange: 'transform'
        }}
      />

      {/* Long magical glittery trail */}
      {particles.map(particle => {
        const sparkleIntensity = 0.5 + 0.5 * Math.sin(particle.sparklePhase);
        
        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none select-none"
            style={{
              transform: `translate3d(${particle.x}px, ${particle.y}px, 0) scale(${particle.scale}) rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
              willChange: 'transform, opacity'
            }}
          >
            {particle.type === 'laugh' ? (
              /* Funny laugh emoji */
              <div 
                className="text-lg"
                style={{
                  filter: `drop-shadow(0 0 4px gold) brightness(${0.8 + 0.4 * sparkleIntensity})`
                }}
              >
                😂
              </div>
            ) : (
              /* Sparkly star particles */
              <div
                className="relative"
                style={{
                  fontSize: '12px',
                  filter: `drop-shadow(0 0 3px gold) drop-shadow(0 0 6px white) brightness(${0.7 + 0.6 * sparkleIntensity})`,
                  textShadow: '0 0 8px gold, 0 0 12px white'
                }}
              >
                ✨
                {/* Extra sparkle effect */}
                {sparkleIntensity > 0.7 && (
                  <div 
                    className="absolute inset-0"
                    style={{
                      fontSize: '8px',
                      filter: 'blur(1px)',
                      opacity: 0.6
                    }}
                  >
                    ⭐
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MagicalCursor;