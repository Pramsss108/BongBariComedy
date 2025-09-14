import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, Sparkles, Minimize2, Maximize2, GripVertical } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export default function Chatbot({ className = "" }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [chatSize, setChatSize] = useState({ width: 400, height: 500 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-content]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [messages, isTyping]);

  // PRECISE SCROLL CONTROL - Only for message area
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const messageArea = scrollAreaRef.current;
      const isInMessageArea = messageArea?.contains(e.target as Node);
      
      if (isHovered && isInMessageArea && messageArea) {
        const scrollContainer = messageArea.querySelector('[data-radix-scroll-area-content]');
        if (scrollContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          const isAtTop = scrollTop <= 2;
          const isAtBottom = scrollTop >= scrollHeight - clientHeight - 2;
          
          // Smart edge handling - prevent page scroll only when scrolling within message bounds
          if ((!isAtTop && e.deltaY < 0) || (!isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const messageArea = scrollAreaRef.current;
      const isInMessageArea = messageArea?.contains(e.target as Node);
      
      if (isHovered && isInMessageArea && messageArea) {
        e.stopPropagation();
      }
    };

    if (isHovered) {
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isHovered]);

  // Manage body scroll lock on mobile when chatbot is open
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.classList.add('chatbot-open');
      
      return () => {
        document.body.classList.remove('chatbot-open');
      };
    }
  }, [isOpen]);

  // Focus input when chatbot opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Load greeting template on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      (async () => {
        try {
          const res = await apiRequest('/api/greeting/today', { method: 'GET' });
          const text = String(res?.text || '🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!');
          setMessages([{ id: Date.now().toString(), role: 'assistant', content: text, timestamp: new Date() }]);
        } catch {
          setMessages([{ id: Date.now().toString(), role: 'assistant', content: '🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!', timestamp: new Date() }]);
        }
      })();
    }
  }, [isOpen]);

  // WORKING DRAG SYSTEM - COPIED FROM RED CIRCLE
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [chatDragStart, setChatDragStart] = useState({ x: 0, y: 0 });
  const [hasBeenDragged, setHasBeenDragged] = useState(false);
  const dragHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingChat || !chatbotRef.current) return;
      
      e.preventDefault();
      
      const newX = chatPosition.x + (e.clientX - chatDragStart.x);
      const newY = chatPosition.y + (e.clientY - chatDragStart.y);
      
      // Keep in bounds
      const maxX = window.innerWidth - chatbotRef.current.offsetWidth;
      const maxY = window.innerHeight - chatbotRef.current.offsetHeight;
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      setChatPosition({ x: boundedX, y: boundedY });
      setChatDragStart({ x: e.clientX, y: e.clientY });
      
      console.log('🤖 CHATBOT MOVING TO:', boundedX, boundedY);
    };

    const handleMouseUp = () => {
      if (isDraggingChat) {
        console.log('🤖 CHATBOT DRAG ENDED');
        setIsDraggingChat(false);
      }
    };

    if (isDraggingChat) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingChat, chatPosition, chatDragStart]);

  const handleChatMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🤖 CHATBOT DRAG STARTED!');
    
    // Get current position from DOM if not dragged before
    if (!hasBeenDragged && chatbotRef.current) {
      const rect = chatbotRef.current.getBoundingClientRect();
      setChatPosition({ x: rect.left, y: rect.top });
      setHasBeenDragged(true);
    }
    
    setIsDraggingChat(true);
    setChatDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    // FORCE CURSOR CHANGE FOR RESIZE
    if (chatbotRef.current) {
      chatbotRef.current.style.cursor = 'se-resize';
      document.body.style.cursor = 'se-resize';
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    addMessage('user', userMessage);
    setIsTyping(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiRequest('/api/chatbot/message?aiOnly=1', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          aiOnly: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      let attempts = 0;
      let finalText = String(response?.response || '').trim();
      while ((!finalText || finalText.length === 0) && attempts < 3) {
        attempts++;
        await new Promise(r => setTimeout(r, 1200 * attempts));
        const again = await apiRequest('/api/chatbot/message?aiOnly=1', {
          method: 'POST',
          body: JSON.stringify({ message: userMessage, conversationHistory, aiOnly: true }),
          headers: { 'Content-Type': 'application/json' }
        });
        finalText = String(again?.response || '').trim();
      }
      if (finalText && finalText.length > 0) {
        addMessage('assistant', finalText);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      // AI-only: do not add local fallback bubble
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendTemplateMessage = async (template: string) => {
    setInputMessage(template);
    addMessage('user', template);
    setIsTyping(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await apiRequest('/api/chatbot/message?aiOnly=1', {
        method: 'POST',
        body: JSON.stringify({
          message: template,
          conversationHistory,
          aiOnly: true
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      let attempts = 0;
      let finalText = String(response?.response || '').trim();
      while ((!finalText || finalText.length === 0) && attempts < 3) {
        attempts++;
        await new Promise(r => setTimeout(r, 1200 * attempts));
        const again = await apiRequest('/api/chatbot/message?aiOnly=1', {
          method: 'POST',
          body: JSON.stringify({ message: template, conversationHistory, aiOnly: true }),
          headers: { 'Content-Type': 'application/json' }
        });
        finalText = String(again?.response || '').trim();
      }
      if (finalText && finalText.length > 0) addMessage('assistant', finalText);
    } catch (error) {
  console.error('Template message error:', error);
  // AI-only: no local fallback bubble
    } finally {
      setIsTyping(false);
    }
  };

  // Brand colored floating particles
  const particles = Array.from({ length: 8 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-gradient-to-r from-[#FFCC00] to-[#FF4D4D] rounded-full"
      animate={{
        y: [-10, -60],
        x: [0, Math.sin(i) * 15],
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay: i * 0.4,
        ease: "easeOut"
      }}
      style={{
        left: `${Math.random() * 100}%`,
        top: "100%",
      }}
    />
  ));

  // Compact typing animation
  const TypingIndicator = () => (
    <motion.div 
      className="flex items-center gap-2 p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-1">
        <motion.div
          className="w-2 h-2 bg-gradient-to-r from-[#FFCC00] to-[#FF4D4D] rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-gradient-to-r from-[#1363DF] to-[#FFCC00] rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-gradient-to-r from-[#FF4D4D] to-[#1363DF] rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-white/80 text-xs font-medium">Thinking...</span>
    </motion.div>
  );

  // Template messages - compact
  const templateMessages = [
    { text: "Collab korte chai — process ta bolben?", emoji: "�" },
    { text: "Brand sponsor hole kivabe kaj hoy?", emoji: "📣" },
    { text: "Mon bhalo lage? Soft subscribe korben?", emoji: "✨" }
  ];

  if (!isOpen) {
    return (
      <motion.div
        className={`fixed bottom-4 right-4 z-50 ${className} touch-manipulation`}
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          right: 'max(1rem, env(safe-area-inset-right, 1rem))'
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="flex flex-col items-center touch-manipulation">
          {/* Compact Bong Bot Label */}
          <motion.div
            className="mb-2 px-3 py-2 sm:py-1 bg-gradient-to-r from-[#1363DF]/95 to-[#FF4D4D]/95 backdrop-blur-md rounded-full text-white text-sm sm:text-xs font-bold border border-[#FFCC00]/40 shadow-xl touch-manipulation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                🤖
              </motion.div>
              <span className="bg-gradient-to-r from-[#FFCC00] to-white bg-clip-text text-transparent">
                Bong Bot
              </span>
            </div>
          </motion.div>

          {/* Compact Main Button */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFCC00] via-[#1363DF] to-[#FF4D4D] rounded-full blur-lg opacity-70 animate-pulse" />
            
            <Button
              onClick={() => setIsOpen(true)}
              className="no-rickshaw-sound relative w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#1363DF] via-[#FFCC00] to-[#FF4D4D] hover:from-[#1363DF]/90 hover:via-[#FFCC00]/90 hover:to-[#FF4D4D]/90 active:scale-95 text-white shadow-xl border-2 border-[#FFCC00]/50 overflow-hidden touch-manipulation"
              data-testid="chatbot-open-button"
              aria-label="Open Bong Bot Chat"
            >
              <motion.div
                className="absolute inset-1 border border-[#FFCC00]/40 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              
              <MessageCircle className="w-8 h-8 sm:w-7 sm:h-7 relative z-10" />
              
              <motion.div
                className="absolute top-2 right-2 w-2 h-2 sm:w-1.5 sm:h-1.5 bg-[#FFCC00] rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={chatbotRef}
      className={`no-rickshaw-sound fixed z-50 ${className}`}
      style={{
        left: hasBeenDragged ? `${chatPosition.x}px` : 'unset',
        top: hasBeenDragged ? `${chatPosition.y}px` : 'unset',
        bottom: hasBeenDragged ? 'unset' : 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        right: hasBeenDragged ? 'unset' : 'max(1rem, env(safe-area-inset-right, 1rem))',
        width: `${chatSize.width}px`,
        height: `${chatSize.height}px`,
        pointerEvents: 'auto',
        touchAction: 'none',
        isolation: 'isolate',
        userSelect: 'none',
        cursor: isDraggingChat ? 'grabbing' : 'default'
      }}
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <div 
        className={`relative h-full w-full flex flex-col transition-all duration-300 ${
          isMinimized ? 'h-16' : ''
        }`}
        style={{ 
          contain: 'layout style paint',
          isolation: 'isolate'
        }}
        role="dialog"
        aria-label="Bong Bot Chat Assistant"
        aria-modal="false"
      >
        {/* Brand Colors Glossy Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#101418]/95 via-[#1363DF]/20 to-[#101418]/95 backdrop-blur-xl rounded-2xl border border-[#FFCC00]/30 shadow-2xl overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-[#FFCC00]/10 via-[#1363DF]/15 to-[#FF4D4D]/10"
            animate={{ 
              background: [
                "linear-gradient(45deg, rgba(255, 204, 0, 0.1), rgba(19, 99, 223, 0.15), rgba(255, 77, 77, 0.1))",
                "linear-gradient(135deg, rgba(19, 99, 223, 0.15), rgba(255, 204, 0, 0.1), rgba(255, 77, 77, 0.1))"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles}
          </div>
        </div>

        {/* DRAG HEADER - WORKING SYSTEM */}
        <div 
          ref={dragHeaderRef}
          onMouseDown={handleChatMouseDown}
          className="relative z-10 flex flex-col bg-gradient-to-r from-[#1363DF]/95 to-[#FF4D4D]/95 backdrop-blur-md rounded-t-2xl border-b border-[#FFCC00]/30 cursor-grab active:cursor-grabbing flex-shrink-0 select-none"
          style={{ height: isMinimized ? '64px' : '80px' }}
          data-testid="drag-header"
        >
          {/* DRAG INDICATOR - SUPER VISIBLE */}
          <div className="absolute left-1/2 top-1 transform -translate-x-1/2 flex gap-1 cursor-grab z-50">
            <div className="w-3 h-3 bg-white/80 rounded-full shadow-lg"></div>
            <div className="w-3 h-3 bg-white/80 rounded-full shadow-lg"></div>
            <div className="w-3 h-3 bg-white/80 rounded-full shadow-lg"></div>
          </div>
          
          {/* DRAG TEXT */}
          <div className="absolute right-2 top-1 text-white/60 text-xs font-medium">
            Drag me!
          </div>
          
          <div className="p-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFCC00] via-[#FFD700] to-[#FF4D4D] flex items-center justify-center shadow-lg border-2 border-white/30"
                    animate={{ 
                      boxShadow: [
                        "0 0 20px rgba(255, 204, 0, 0.5)",
                        "0 0 30px rgba(255, 77, 77, 0.4)",
                        "0 0 20px rgba(19, 99, 223, 0.5)"
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Bot className="w-6 h-6 text-white drop-shadow" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight drop-shadow-sm">
                    Bong Bot
                  </h3>
                  <p className="text-white/80 text-sm leading-tight">
                    Bengali Comedy Assistant
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <motion.div
                      className="w-2 h-2 bg-green-400 rounded-full"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-green-300 text-xs font-medium">Always Online</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="no-rickshaw-sound h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 touch-manipulation transition-all duration-200"
                  data-testid="chatbot-minimize-button"
                  aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="no-rickshaw-sound h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 touch-manipulation transition-all duration-200"
                  data-testid="chatbot-close-button"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CORNER RESIZE HANDLE - SUPER VISIBLE */}
        <div 
          className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize bg-gradient-to-tl from-[#FFCC00]/60 to-transparent hover:from-[#FFCC00]/80 transition-all duration-200 rounded-tl-xl border-l-2 border-t-2 border-[#FFCC00]/40 flex items-end justify-end p-1"
          onMouseDown={handleResizeMouseDown}
          data-testid="resize-handle"
          title="Drag to resize"
        >
          <div className="w-1 h-1 bg-white/60 rounded-full"></div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 flex flex-col flex-1 min-h-0"
            >
              {/* QUICK TEMPLATES AT TOP */}
              <div className="px-4 py-2 border-b border-[#FFCC00]/20 bg-gradient-to-r from-[#101418]/60 to-[#101418]/80 backdrop-blur-sm flex-shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {templateMessages.map((template, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setInputMessage(template.text);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      disabled={isTyping}
                      className="no-rickshaw-sound py-1 px-2 bg-slate-700/80 hover:bg-slate-600/80 rounded-md border border-slate-500/50 text-white text-[11px] font-medium whitespace-nowrap"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex items-center gap-1">
                        <span>{template.emoji}</span>
                        <span className="truncate">{template.text}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
              {/* SCROLLABLE MESSAGES AREA - ONLY THIS SCROLLS */}
              <div 
                className="flex-1 overflow-hidden bg-gradient-to-b from-transparent via-[#101418]/20 to-transparent min-h-0" 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onTouchStart={() => setIsHovered(true)}
                onTouchEnd={() => setIsHovered(false)}
              >
                <ScrollArea 
                  ref={scrollAreaRef}
                  className="h-full px-4 py-3 custom-scrollbar smooth-scroll"
                  style={{ 
                    touchAction: 'pan-y',
                    scrollBehavior: 'smooth',
                    overscrollBehavior: 'contain',
                    pointerEvents: 'auto'
                  }}
                >
                  <div className="space-y-2">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`relative max-w-[85%] ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-[#1363DF] to-[#FF4D4D] text-white rounded-lg rounded-br-sm shadow-lg border border-[#FFCC00]/20'
                              : 'bg-[#101418]/60 backdrop-blur-sm text-white rounded-lg rounded-bl-sm border border-[#FFCC00]/30'
                          } px-3 pt-2 pb-1.5`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <Sparkles className="w-3 h-3 text-[#FFCC00] flex-shrink-0 mt-0.5" />
                            )}
                            
                            <div className="flex-1">
                              <p className="text-xs leading-tight whitespace-pre-wrap pr-10 pb-0.5">
                                {message.content}
                              </p>
                              <span className={`absolute right-2 bottom-0.5 text-[10px] opacity-60 font-mono ${message.role === 'user' ? 'text-white/80' : 'text-[#FFCC00]/70'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-[#101418]/60 backdrop-blur-sm rounded-lg rounded-bl-sm border border-[#FFCC00]/30">
                          <TypingIndicator />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div ref={messagesEndRef} className="h-2" />
                </ScrollArea>
              </div>

              {/* Templates moved to top */}

              {/* ABSOLUTELY FIXED WRITING BOX - SHORTER & SCROLLABLE */}
              <div className="p-3 bg-gradient-to-t from-[#101418]/95 via-[#101418]/80 to-[#101418]/60 backdrop-blur-md border-t-2 border-[#FFCC00]/30 rounded-b-2xl flex-shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1363DF]/20 to-[#FF4D4D]/20 rounded-lg blur-sm" />
                  
                  <div className="relative bg-[#101418]/60 backdrop-blur-sm rounded-xl border-2 border-[#FFCC00]/40 p-3 flex gap-3 items-end shadow-lg">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything magical... ✨"
                      className="flex-1 bg-transparent border-0 text-white placeholder:text-[#FFCC00]/70 focus:ring-0 focus:outline-none text-sm resize-none overflow-y-auto"
                      disabled={isTyping}
                      rows={1}
                      style={{ 
                        maxHeight: '4rem', 
                        minHeight: '1.5rem',
                        fontSize: '16px' // Prevent iOS zoom
                      }}
                      data-testid="chatbot-input"
                    />
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="no-rickshaw-sound w-12 h-12 p-0 rounded-xl bg-gradient-to-br from-[#1363DF] to-[#FF4D4D] hover:from-[#1363DF]/80 hover:to-[#FF4D4D]/80 active:scale-95 disabled:opacity-50 border-2 border-[#FFCC00]/40 shadow-lg transition-all duration-200"
                        data-testid="chatbot-send-button"
                      >
                        <Send className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </div>
                  
                  <div className="flex justify-center mt-1">
                    <span className="text-xs text-[#FFCC00]/60">Press Enter to send • Drag handle to move</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}