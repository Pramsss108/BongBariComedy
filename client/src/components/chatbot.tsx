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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatbotRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (!inputMessage.trim()) return;

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

      addMessage('assistant', response.response);
    } catch (error) {
      console.error('Chatbot error:', error);
      addMessage('assistant', 'দুঃখিত, আমার একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন! 😅\n\nSorry, I\'m having some trouble. Please try again!');
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

  // Compact floating particles
  const particles = Array.from({ length: 8 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-gradient-to-r from-yellow-300 to-pink-300 rounded-full"
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
          className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-gradient-to-r from-pink-400 to-yellow-400 rounded-full"
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
        className={`fixed bottom-4 right-4 z-50 ${className}`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="flex flex-col items-center">
          {/* Compact Bong Bot Label */}
          <motion.div
            className="mb-2 px-3 py-1 bg-gradient-to-r from-purple-600/95 to-pink-600/95 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/30 shadow-xl"
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
              <span className="bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
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
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full blur-lg opacity-70 animate-pulse" />
            
            <Button
              onClick={() => setIsOpen(true)}
              className="no-rickshaw-sound relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 text-white shadow-xl border-2 border-white/40 overflow-hidden"
              data-testid="chatbot-open-button"
            >
              <motion.div
                className="absolute inset-1 border border-white/30 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              
              <MessageCircle className="w-7 h-7 relative z-10" />
              
              <motion.div
                className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-300 rounded-full"
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
        bottom: '1rem',
        right: '1rem',
        maxWidth: 'calc(100vw - 2rem)',
        maxHeight: 'calc(100vh - 2rem)'
      }}
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <div 
        className={`relative transition-all duration-500 ease-out ${
          isMinimized 
            ? 'w-72 h-14' 
            : 'w-80 sm:w-96 h-[450px]'
        }`}
        style={{ minWidth: '280px' }}
      >
        {/* Compact Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-pink-900/90 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-pink-500/20"
            animate={{ 
              background: [
                "linear-gradient(45deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2), rgba(236, 72, 153, 0.2))",
                "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles}
          </div>
        </div>

        {/* Compact Header with Drag Handle */}
        <div className="relative z-10 p-3 flex items-center justify-between border-b border-white/20">
          {/* Drag Handle */}
          <div 
            className="absolute left-1/2 top-1 transform -translate-x-1/2 cursor-grab active:cursor-grabbing hover:text-white/80 transition-colors"
            onMouseDown={handleMouseDown}
          >
            <GripVertical className="w-4 h-4 text-white/50" />
          </div>
          
          <div className="flex items-center gap-3">
            <motion.div
              className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  "0 0 15px rgba(168, 85, 247, 0.5)", 
                  "0 0 20px rgba(59, 130, 246, 0.6)", 
                  "0 0 15px rgba(236, 72, 153, 0.5)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-4 h-4 text-white" />
            </motion.div>
            
            <div>
              <h3 className="text-white font-bold text-sm bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Bong Bot
              </h3>
              <div className="text-white/70 text-xs flex items-center gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-green-400 rounded-full"
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
              className="no-rickshaw-sound h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
              data-testid="chatbot-minimize-button"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="no-rickshaw-sound h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
              data-testid="chatbot-close-button"
            >
              <X className="w-3 h-3" />
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
              {/* Fixed Scrollable Messages Area */}
              <div className="flex-1 overflow-hidden" style={{ height: '200px' }}>
                <ScrollArea className="h-full px-3 py-2">
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
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg rounded-br-sm'
                              : 'bg-white/15 backdrop-blur-sm text-white rounded-lg rounded-bl-sm border border-white/20'
                          } p-2.5`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <Sparkles className="w-3 h-3 text-yellow-300 flex-shrink-0 mt-0.5" />
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
                        <div className="bg-white/15 backdrop-blur-sm rounded-lg rounded-bl-sm border border-white/20">
                          <TypingIndicator />
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </div>

              {/* Compact Template Messages */}
              <div className="px-3 py-2 border-t border-white/20">
                <div className="space-y-1.5">
                  {templateMessages.map((template, index) => (
                    <motion.button
                      key={index}
                      onClick={() => sendTemplateMessage(template.text)}
                      disabled={isTyping}
                      className="no-rickshaw-sound w-full py-2 px-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-lg border border-white/20 text-white text-xs font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-200 flex items-center justify-between"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      data-testid={`template-${index}`}
                    >
                      <span className="flex-1 text-left truncate">{template.text}</span>
                      <span className="text-sm ml-2">{template.emoji}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ALWAYS VISIBLE Input Area */}
              <div className="p-3 bg-gradient-to-t from-purple-900/50 to-transparent">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur-sm" />
                  
                  <div className="relative bg-white/15 backdrop-blur-sm rounded-lg border border-white/30 p-2 flex gap-2 items-end">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything magical... ✨"
                      className="flex-1 bg-transparent border-0 text-white placeholder:text-white/50 focus:ring-0 focus:outline-none text-xs resize-none"
                      disabled={isTyping}
                      rows={2}
                      style={{ maxHeight: '60px', minHeight: '32px' }}
                      data-testid="chatbot-input"
                    />
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="no-rickshaw-sound w-8 h-8 p-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                        data-testid="chatbot-send-button"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  </div>
                  
                  <div className="flex justify-center mt-1">
                    <span className="text-xs text-white/40">Press Enter to send • Drag handle to move</span>
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