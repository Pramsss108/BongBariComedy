import { useState, useRef, useEffect } from 'react';

export default function DragTest() {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const newX = position.x + (e.clientX - dragStart.x);
      const newY = position.y + (e.clientY - dragStart.y);
      
      setPosition({ x: newX, y: newY });
      setDragStart({ x: e.clientX, y: e.clientY });
      
      console.log('🔴 CIRCLE MOVING TO:', newX, newY);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('🔴 CIRCLE DRAG ENDED');
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔴 CIRCLE DRAG STARTED!');
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      ref={circleRef}
      onMouseDown={handleMouseDown}
      className="fixed w-12 h-12 bg-red-500 rounded-full cursor-grab active:cursor-grabbing select-none z-50 flex items-center justify-center text-white font-bold text-xs shadow-lg"
      style={{
        left: position.x + 'px',
        top: position.y + 'px',
        userSelect: 'none'
      }}
      title="Test Drag Circle"
    >
      DRAG
    </div>
  );
}