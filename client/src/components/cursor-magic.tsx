import { useEffect, useState } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

const CursorMagic = () => {
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [trails, setTrails] = useState<Array<CursorPosition & { id: number; timestamp: number }>>([]);

  useEffect(() => {
    let trailId = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const newPos = { x: e.clientX, y: e.clientY };
      setCursorPos(newPos);

      // Add trail point
      const newTrail = {
        ...newPos,
        id: trailId++,
        timestamp: Date.now()
      };
      
      setTrails(prev => [...prev.slice(-8), newTrail]); // Keep last 8 trail points
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Cleanup old trails
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTrails(prev => prev.filter(trail => now - trail.timestamp < 1000));
    }, 100);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(cleanupInterval);
    };
  }, []);

  if (!isHovering) return null;

  const emojis = ["✨", "🌟", "💫", "⭐", "🎭", "😂", "❤️", "🤣"];

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Main cursor circle */}
      <div
        className="magic-cursor-circle"
        style={{
          left: cursorPos.x - 15,
          top: cursorPos.y - 15,
        }}
      />
      
      {/* Emoji trail */}
      {trails.map((trail, index) => {
        const age = Date.now() - trail.timestamp;
        const opacity = Math.max(0, 1 - age / 1000);
        const scale = Math.max(0.3, 1 - age / 1000);
        const emoji = emojis[trail.id % emojis.length];
        
        return (
          <div
            key={trail.id}
            className="magic-cursor-emoji"
            style={{
              left: trail.x - 10,
              top: trail.y - 10,
              opacity,
              transform: `scale(${scale})`,
              animationDelay: `${index * 0.1}s`
            }}
          >
            {emoji}
          </div>
        );
      })}
      
      {/* Glitter particles */}
      {trails.slice(-3).map((trail, index) => (
        <div
          key={`glitter-${trail.id}`}
          className="magic-cursor-glitter"
          style={{
            left: trail.x + (Math.random() - 0.5) * 40,
            top: trail.y + (Math.random() - 0.5) * 40,
            animationDelay: `${index * 0.2}s`
          }}
        />
      ))}
    </div>
  );
};

export default CursorMagic;