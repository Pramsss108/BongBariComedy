import { useState, useRef, useEffect } from 'react';

export default function SimpleChatbot() {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 300, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, startWidth: 0, startHeight: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      if (isDragging) {
        const newX = position.x + (e.clientX - dragStart.x);
        const newY = position.y + (e.clientY - dragStart.y);
        
        setPosition({ x: newX, y: newY });
        setDragStart({ x: e.clientX, y: e.clientY });
        
        console.log('🤖 CHATBOT MOVING TO:', newX, newY);
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(250, resizeStart.startWidth + deltaX);
        const newHeight = Math.max(300, resizeStart.startHeight + deltaY);
        
        setSize({ width: newWidth, height: newHeight });
        
        console.log('🔄 CHATBOT RESIZING TO:', newWidth, 'x', newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('🤖 CHATBOT DRAG ENDED');
        setIsDragging(false);
      }
      if (isResizing) {
        console.log('🔄 CHATBOT RESIZE ENDED');
        setIsResizing(false);
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, position, dragStart, resizeStart, size]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🤖 CHATBOT DRAG STARTED!');
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔄 CHATBOT RESIZE STARTED!');
    
    // Prevent chatbot from closing or disappearing
    setIsResizing(true);
    setResizeStart({ 
      x: e.clientX, 
      y: e.clientY, 
      startWidth: size.width, 
      startHeight: size.height 
    });
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
      ref={chatbotRef}
      className="fixed bg-white rounded-lg shadow-xl border z-50 select-none relative"
      style={{
        left: position.x + 'px',
        top: position.y + 'px',
        width: size.width + 'px',
        height: size.height + 'px'
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
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-xs z-20"
        >
          ×
        </button>
      </div>
      
      {/* CHAT AREA WITH SCROLLABLE MESSAGES */}
      <div className="flex flex-col h-full">
        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: `${size.height - 140}px` }}>
          <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
            🤖 Welcome to Bong Bot! I'm fully scalable now! 
            <br />✨ Drag header to move
            <br />📏 Drag bottom-right corner to resize  
            <br />💬 Type messages below!
          </div>
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded self-end ml-8">
            Hello! This chatbot is working great.
          </div>
          <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
            🤖 Yes! The dragging is smooth and now we have a proper chat interface. You can scroll through messages and type new ones.
          </div>
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded self-end ml-8">
            Perfect! The scrolling works well too.
          </div>
          <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
            🤖 This is a long message to test scrolling. The chat area should scroll smoothly when there are many messages. Each message appears in its own bubble with proper spacing and colors.
          </div>
        </div>
        
        {/* Fixed Typing Area */}
        <div className="border-t bg-white p-3 rounded-b-lg">
          <div className="flex gap-2 items-end">
            <textarea
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto hide-scrollbar"
              style={{
                minHeight: '40px',
                maxHeight: '40px',
                lineHeight: '20px'
              }}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  console.log('💬 Message sent:', e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button
              onClick={() => console.log('💬 Send button clicked!')}
              className="px-4 py-2 bg-gradient-to-r from-[#1363DF] to-[#FF4D4D] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
      
      {/* RESIZE HANDLE - Bottom Right Corner */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e);
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gradient-to-br from-[#1363DF] to-[#FF4D4D] opacity-60 hover:opacity-100 transition-opacity z-10"
        style={{
          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
        }}
        title="Drag to resize"
      />
      
      {/* RESIZE HANDLE - Bottom Edge */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e);
        }}
        className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize bg-gradient-to-r from-[#1363DF] to-[#FF4D4D] opacity-40 hover:opacity-80 transition-opacity rounded-full z-10"
        title="Drag to resize"
      />
      
      {/* RESIZE HANDLE - Right Edge */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e);
        }}
        className="absolute top-12 bottom-2 right-0 w-1 cursor-ew-resize bg-gradient-to-b from-[#1363DF] to-[#FF4D4D] opacity-40 hover:opacity-80 transition-opacity rounded-full z-10"
        title="Drag to resize"
      />
    </div>
  );
}