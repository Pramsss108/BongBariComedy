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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Yes I am Bong Bot, Bong Barir Familir ekjon, Cha fuckka hobe nki? ☕🤖',
      timestamp: new Date()
    }
  ]);
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

  // Dragging and Resizing functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && chatbotRef.current) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep within viewport bounds
        const maxX = window.innerWidth - chatSize.width;
        const maxY = window.innerHeight - chatSize.height;
        
        const boundedX = Math.max(16, Math.min(newX, maxX - 16));
        const boundedY = Math.max(16, Math.min(newY, maxY - 16));
        
        setPosition({ x: boundedX, y: boundedY });
      }
      
      if (isResizing) {
        const newWidth = Math.max(320, Math.min(600, e.clientX - position.x + 50));
        const newHeight = Math.max(400, Math.min(700, e.clientY - position.y + 50));
        setChatSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, position, chatSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = chatbotRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
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

      const response = await apiRequest('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage,
          conversationHistory
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response?.response) {
        addMessage('assistant', response.response);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = error instanceof Error && error.message.includes('network') 
        ? 'ইন্টারনেট সংযোগ চেক করুন! 😅\n\nPlease check your internet connection!'
        : 'দুঃখিত, আমার একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন! 😅\n\nSorry, I\'m having some trouble. Please try again!';
      addMessage('assistant', errorMessage);
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

      const response = await apiRequest('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({
          message: template,
          conversationHistory
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      addMessage('assistant', response.response);
    } catch (error) {
      console.error('Template message error:', error);
      addMessage('assistant', 'দুঃখিত, আমার একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন! 😅');
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
    { text: "আমি কি তোমায় বিরক্ত করছি?", emoji: "🤔" },
    { text: "বিরক্ত না হলে Collabe কি ভাবে করবো?", emoji: "🤝" }
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
      className={`no-rickshaw-sound fixed z-50 ${className} ${isDragging ? 'chatbot-dragging' : isResizing ? 'cursor-se-resize' : ''}`}
      style={{
        left: position.x || 'unset',
        top: position.y || 'unset',
        bottom: position.x || position.y ? 'unset' : 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        right: position.x || position.y ? 'unset' : 'max(1rem, env(safe-area-inset-right, 1rem))',
        width: `${chatSize.width}px`,
        height: `${chatSize.height}px`,
        pointerEvents: 'auto',
        touchAction: 'none',
        isolation: 'isolate',
        userSelect: 'none'
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

        {/* NATURAL HEADER DESIGN - Draggable */}
        <div 
          className="relative z-10 flex flex-col bg-gradient-to-r from-[#1363DF]/95 to-[#FF4D4D]/95 backdrop-blur-md rounded-t-2xl border-b border-[#FFCC00]/30 cursor-grab active:cursor-grabbing flex-shrink-0 select-none"
          onMouseDown={handleMouseDown}
          style={{ height: isMinimized ? '64px' : '80px' }}
        >
          {/* Drag Indicator */}
          <div className="absolute left-1/2 top-1 transform -translate-x-1/2 flex gap-1">
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
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

        {/* RESIZE HANDLE */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-[#FFCC00]/20 hover:bg-[#FFCC00]/40 transition-colors"
          onMouseDown={handleResizeMouseDown}
          style={{
            background: 'linear-gradient(-45deg, transparent 30%, #FFCC00 30%, #FFCC00 40%, transparent 40%, transparent 60%, #FFCC00 60%, #FFCC00 70%, transparent 70%)'
          }}
        />

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10 flex flex-col flex-1 min-h-0"
            >
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
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] relative ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-[#1363DF] to-[#FF4D4D] text-white rounded-lg rounded-br-sm shadow-lg border border-[#FFCC00]/20'
                              : 'bg-[#101418]/60 backdrop-blur-sm text-white rounded-lg rounded-bl-sm border border-[#FFCC00]/30'
                          } p-2.5`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <Sparkles className="w-3 h-3 text-[#FFCC00] flex-shrink-0 mt-0.5" />
                            )}
                            
                            <div className="flex-1">
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <span className="text-xs opacity-60 mt-1 block font-mono">
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

              {/* Template Messages - Fixed */}
              <div className="px-4 py-2 border-t border-[#FFCC00]/20 bg-gradient-to-r from-[#101418]/60 to-[#101418]/80 backdrop-blur-sm flex-shrink-0">
                <div className="space-y-1.5">
                  {templateMessages.map((template, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setInputMessage(template.text);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      disabled={isTyping}
                      className="no-rickshaw-sound w-full py-2 px-3 bg-gradient-to-r from-[#1363DF]/20 to-[#FF4D4D]/20 backdrop-blur-sm rounded-lg border border-[#FFCC00]/30 text-white text-xs font-medium hover:from-[#1363DF]/30 hover:to-[#FF4D4D]/30 active:from-[#1363DF]/40 active:to-[#FF4D4D]/40 transition-all duration-200 flex items-center justify-between"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`template-${index}`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{template.emoji}</span>
                        <span className="truncate">{template.text}</span>
                      </span>
                      <Send className="w-3 h-3 opacity-70 flex-shrink-0" />
                    </motion.button>
                  ))}
                </div>
              </div>

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