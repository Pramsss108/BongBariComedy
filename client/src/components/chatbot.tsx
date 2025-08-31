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

  // Prevent page scrolling when chatbot is hovered with proper edge handling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isHovered && chatbotRef.current?.contains(e.target as Node)) {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-content]');
        if (scrollContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          const isAtTop = scrollTop <= 0;
          const isAtBottom = scrollTop >= scrollHeight - clientHeight;
          
          // Only prevent if scrolling within bounds or trying to scroll further when at edge
          if ((!isAtTop && e.deltaY < 0) || (!isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
            e.stopPropagation();
            
            // Smooth scroll within chatbot
            scrollContainer.scrollTo({
              top: scrollTop + e.deltaY,
              behavior: 'auto'
            });
          }
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isHovered && chatbotRef.current?.contains(e.target as Node)) {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-content]');
        if (scrollContainer) {
          e.stopPropagation();
        }
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

  // Dragging functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !chatbotRef.current) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - chatbotRef.current.offsetWidth;
      const maxY = window.innerHeight - chatbotRef.current.offsetHeight;
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      chatbotRef.current.style.left = boundedX + 'px';
      chatbotRef.current.style.top = boundedY + 'px';
      chatbotRef.current.style.right = 'auto';
      chatbotRef.current.style.bottom = 'auto';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    const rect = chatbotRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
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
      className={`no-rickshaw-sound fixed z-50 ${className} ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        right: 'max(1rem, env(safe-area-inset-right, 1rem))',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100vh - 2rem)',
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        isolation: 'isolate',
        overscrollBehavior: 'contain'
      }}
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div 
        className={`relative transition-all duration-500 ease-out ${
          isMinimized 
            ? 'w-72 h-14' 
            : 'w-80 sm:w-96 md:w-[400px] h-[450px] max-h-[80vh]'
        }`}
        style={{ 
          minWidth: '280px',
          maxWidth: 'min(400px, calc(100vw - 2rem))',
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

        {/* Compact Header with Drag Handle */}
        <div className="relative z-10 p-3 flex items-center justify-between border-b border-[#FFCC00]/20">
          {/* Drag Handle */}
          <div 
            className="absolute left-1/2 top-1 transform -translate-x-1/2 cursor-grab active:cursor-grabbing hover:text-white/80 transition-colors"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-4 h-4 text-[#FFCC00]/70" />
          </div>
          
          <div className="flex items-center gap-3">
            <motion.div
              className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#FFCC00] via-[#1363DF] to-[#FF4D4D] flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  "0 0 15px rgba(255, 204, 0, 0.6)", 
                  "0 0 20px rgba(19, 99, 223, 0.7)", 
                  "0 0 15px rgba(255, 77, 77, 0.6)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-4 h-4 text-white" />
            </motion.div>
            
            <div>
              <h3 className="text-white font-bold text-sm bg-gradient-to-r from-[#FFCC00] to-[#FF4D4D] bg-clip-text text-transparent">
                Bong Bot
              </h3>
              <div className="text-white/70 text-xs flex items-center gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-[#FFCC00] rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span>Online ✨</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="no-rickshaw-sound h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-full bg-[#FFCC00]/10 hover:bg-[#FFCC00]/20 active:bg-[#FFCC00]/30 text-white border border-[#FFCC00]/30 touch-manipulation"
              data-testid="chatbot-minimize-button"
              aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4 sm:w-3 sm:h-3" /> : <Minimize2 className="w-4 h-4 sm:w-3 sm:h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="no-rickshaw-sound h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-full bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 active:bg-[#FF4D4D]/30 text-white border border-[#FF4D4D]/30 touch-manipulation"
              data-testid="chatbot-close-button"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 sm:w-3 sm:h-3" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 flex flex-col"
              style={{ height: 'calc(450px - 60px)' }}
            >
              {/* Fixed Scrollable Messages Area with Custom Scrollbar */}
              <div 
                className="flex-1 overflow-hidden" 
                style={{ height: 'min(200px, 40vh)' }}
              >
                <ScrollArea 
                  ref={scrollAreaRef}
                  className="h-full px-3 py-2 custom-scrollbar smooth-scroll"
                  style={{ 
                    touchAction: 'pan-y',
                    scrollBehavior: 'smooth',
                    overscrollBehavior: 'contain',
                    scrollPadding: '8px',
                    scrollMargin: '8px'
                  }}
                  onWheel={(e) => {
                    // Let the improved wheel handler in useEffect manage this
                    e.stopPropagation();
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

              {/* Compact Template Messages */}
              <div className="px-3 py-2 border-t border-[#FFCC00]/20 touch-manipulation">
                <div className="space-y-1.5">
                  {templateMessages.map((template, index) => (
                    <motion.button
                      key={index}
                      onClick={() => sendTemplateMessage(template.text)}
                      disabled={isTyping}
                      className="no-rickshaw-sound w-full py-3 px-3 bg-gradient-to-r from-[#1363DF]/20 to-[#FF4D4D]/20 backdrop-blur-sm rounded-lg border border-[#FFCC00]/30 text-white text-xs sm:text-sm font-medium hover:from-[#1363DF]/30 hover:to-[#FF4D4D]/30 active:from-[#1363DF]/40 active:to-[#FF4D4D]/40 transition-all duration-200 flex items-center justify-between touch-manipulation"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      data-testid={`template-${index}`}
                    >
                      <span className="flex-1 text-left truncate">{template.text}</span>
                      <span className="text-sm ml-2">{template.emoji}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ALWAYS VISIBLE Fixed Input Area */}
              <div className="mt-auto p-3 bg-gradient-to-t from-[#101418]/80 via-[#101418]/40 to-transparent backdrop-blur-sm border-t border-[#FFCC00]/20 touch-manipulation">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1363DF]/20 to-[#FF4D4D]/20 rounded-lg blur-sm" />
                  
                  <div className="relative bg-[#101418]/40 backdrop-blur-sm rounded-lg border border-[#FFCC00]/30 p-2 flex gap-2 items-end touch-manipulation">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything magical... ✨"
                      className="flex-1 bg-transparent border-0 text-white placeholder:text-[#FFCC00]/70 focus:ring-0 focus:outline-none text-sm sm:text-xs resize-none touch-manipulation"
                      disabled={isTyping}
                      rows={2}
                      style={{ 
                        maxHeight: '60px', 
                        minHeight: '40px',
                        fontSize: window.innerWidth < 640 ? '16px' : '12px' // Prevent iOS zoom
                      }}
                      data-testid="chatbot-input"
                    />
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="no-rickshaw-sound w-10 h-10 sm:w-8 sm:h-8 p-0 rounded-lg bg-gradient-to-br from-[#1363DF] to-[#FF4D4D] hover:from-[#1363DF]/80 hover:to-[#FF4D4D]/80 active:from-[#1363DF]/60 active:to-[#FF4D4D]/60 disabled:opacity-50 border border-[#FFCC00]/20 touch-manipulation"
                        data-testid="chatbot-send-button"
                      >
                        <Send className="w-4 h-4 sm:w-3 sm:h-3" />
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