import { useState, useRef, useEffect } from 'react';

export default function SimpleChatbot() {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const newX = position.x + (e.clientX - dragStart.x);
      const newY = position.y + (e.clientY - dragStart.y);
      
      setPosition({ x: newX, y: newY });
      setDragStart({ x: e.clientX, y: e.clientY });
      
      console.log('🤖 SIMPLE CHATBOT MOVING TO:', newX, newY);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('🤖 SIMPLE CHATBOT DRAG ENDED');
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
    
    console.log('🤖 SIMPLE CHATBOT DRAG STARTED!');
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-r from-[#1363DF] to-[#FF4D4D] rounded-full flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform z-50"
        data-testid="open-chatbot"
      >
        💬
      </button>
    );
  }

  return (
    <div
      className="fixed bg-white rounded-lg shadow-xl border z-50 select-none"
      style={{
        left: position.x + 'px',
        top: position.y + 'px',
        width: '300px',
        height: '400px'
      }}
    >
      {/* DRAGGABLE HEADER - EXACTLY LIKE RED CIRCLE */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="w-full h-12 bg-gradient-to-r from-[#1363DF] to-[#FF4D4D] rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between px-4 text-white font-bold"
        style={{ userSelect: 'none' }}
      >
        <span>🤖 Bong Bot</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-xs"
        >
          ×
        </button>
      </div>
      
      {/* SIMPLE CONTENT */}
      <div className="p-4 h-full">
        <div className="text-sm text-gray-600">
          Simple chatbot! Drag the header to move me around.
        </div>
      </div>
    </div>
  );
}