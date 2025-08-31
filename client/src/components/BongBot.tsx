import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, X, Minimize2, MessageCircle } from 'lucide-react';

interface BongBotProps {
  onOpenChange?: (isOpen: boolean) => void;
}

export default function BongBot({ onOpenChange }: BongBotProps) {
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: '🙏 Namaskar! I am Bong Bot, your Bengali comedy companion! Ask me about Bong Bari, Bengali culture, or just chat in Bengali/English!', 
      sender: 'bot', 
      timestamp: new Date() 
    },
    { 
      id: 2, 
      text: 'I can help you with Bengali comedy, cultural insights, translate between Bengali and English, and discuss our amazing Bong Bari content!', 
      sender: 'bot', 
      timestamp: new Date() 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick reply templates
  const templates = [
    "Kadate tow sobai pare Haste Chao?",
    "Collab korlei Hese Felbe, Try?"
  ];

  // When opening chatbot, position it on the right side
  const handleOpenChatbot = () => {
    const rightSideX = Math.max(0, window.innerWidth - 400); // Right side position with bounds check
    setPosition({ x: rightSideX, y: 100 });
    setIsOpen(true);
    setIsMinimized(false);
    
    // Play glitter sound when opening
    playGlitterSound();
  };

  // Sound effects
  const playGlitterSound = () => {
    const audio = new Audio('/public-objects/sounds/folder/glitter.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors
  };

  const playSendSound = () => {
    const audio = new Audio('/public-objects/sounds/folder/whatsapp-send.mp3');
    audio.volume = 0.4;
    audio.play().catch(() => {}); // Ignore errors
  };

  const playTypingSound = () => {
    const audio = new Audio('/public-objects/sounds/folder/typing.mp3');
    audio.volume = 0.2;
    audio.loop = true;
    return audio;
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Notify parent component when chatbot opens/closes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Play WhatsApp send sound
    playSendSound();
    
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setShowTemplates(false); // Hide templates after sending
    setIsTyping(true);
    
    // Play typing sound when bot starts typing
    const typingAudio = playTypingSound();
    
    // Simulate AI response with Bengali flair
    setTimeout(() => {
      // Stop typing sound
      typingAudio.pause();
      typingAudio.currentTime = 0;
      
      const responses = [
        `🤖 Dhonnobad! You said: "${message}". As Bong Bot, I love discussing Bengali culture! আমি বাংলা এবং ইংরেজি দুটোতেই কথা বলতে পারি!`,
        `🎭 That's interesting! Bengali comedy has such rich traditions. আমাদের Bong Bari-তে আমরা এই ধরনের মজার গল্প শেয়ার করি!`,
        `🍽️ Ah, reminds me of Bengali family conversations! মা-র রান্না নিয়ে আড্DA দিতে পারি ঘন্টার পর ঘন্টা!`,
        `📚 Bengali literature and comedy go hand in hand! আপনি কি রবীন্দ্রনাথ বা সুকুমার রায়ের লেখা পড়েছেন?`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const botResponse = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'bot' as const,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      
      // Play glitter sound when message appears
      playGlitterSound();
    }, 1500);
  };

  // Drag functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const newX = position.x + (e.clientX - dragStart.x);
      const newY = position.y + (e.clientY - dragStart.y);
      
      // Keep in bounds
      const maxX = window.innerWidth - 380;
      const maxY = window.innerHeight - (isMinimized ? 60 : 500);
      
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({ x: boundedX, y: boundedY });
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
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
  }, [isDragging, position, dragStart, isMinimized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={handleOpenChatbot}
        className="fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-[#1363DF]/90 to-[#FF4D4D]/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold shadow-2xl border border-white/20 z-50"
        data-testid="open-chatbot"
        whileHover={{ 
          scale: 1.1,
          boxShadow: '0 20px 40px rgba(19, 99, 223, 0.3)',
          background: 'linear-gradient(135deg, rgba(19, 99, 223, 0.95), rgba(255, 77, 77, 0.95))'
        }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      >
        <MessageCircle size={24} className="drop-shadow-lg" />
      </motion.button>
    );
  }

  return (
    <motion.div
      className="fixed z-50 select-none"
      style={{
        left: position.x + 'px',
        top: position.y + 'px',
        width: '380px',
        height: isMinimized ? '60px' : '500px'
      }}
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* GLASS MORPHISM CONTAINER */}
      <div className="w-full h-full bg-gradient-to-br from-white/15 via-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl overflow-hidden">
        
        {/* PROFESSIONAL DRAGGABLE HEADER */}
        <motion.div
          ref={headerRef}
          onMouseDown={handleMouseDown}
          className="relative w-full h-16 bg-gradient-to-r from-[#1363DF]/60 via-[#FFCC00]/60 to-[#FF4D4D]/60 backdrop-blur-lg cursor-grab active:cursor-grabbing flex items-center justify-between px-4 border-b-2 border-white/40 rounded-t-2xl shadow-lg"
          style={{ userSelect: 'none', marginTop: '2px' }}
          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          {/* ANIMATED LOGO & TITLE */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-[#FFCC00] to-[#FF4D4D] rounded-lg flex items-center justify-center shadow-lg"
              animate={{ rotate: isDragging ? 10 : 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Bot size={16} className="text-white drop-shadow-sm" />
            </motion.div>
            <div>
              <h3 className="text-white font-bold text-base drop-shadow-lg tracking-wide">🤖 Bong Bot</h3>
              <p className="text-white/95 text-xs drop-shadow-sm font-semibold tracking-wide">Bengali Comedy AI</p>
            </div>
          </div>
          
          {/* CONTROL BUTTONS */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Minimize2 size={12} className="text-white drop-shadow-sm" />
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="w-7 h-7 rounded-lg bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all backdrop-blur-sm border border-red-300/20"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={12} className="text-white drop-shadow-sm" />
            </motion.button>
          </div>
        </motion.div>
        
        {/* CHAT CONTENT - ONLY SHOW WHEN NOT MINIMIZED */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div 
              className="flex flex-col h-full"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'calc(100% - 56px)' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* SCROLLABLE MESSAGES AREA */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-lg backdrop-blur-sm border ${
                        msg.sender === 'user' 
                          ? 'bg-gradient-to-r from-[#1363DF]/80 to-[#FF4D4D]/80 text-white border-white/20 ml-8' 
                          : 'bg-white/90 text-gray-800 border-white/30'
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>
                      <span className={`text-xs opacity-70 block mt-1 ${msg.sender === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {/* TYPING INDICATOR */}
                {isTyping && (
                  <motion.div 
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="bg-white/90 p-3 rounded-2xl shadow-lg backdrop-blur-sm border border-white/30">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <motion.div 
                            className="w-2 h-2 bg-[#1363DF] rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[#FFCC00] rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[#FF4D4D] rounded-full"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">Bong Bot is typing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* QUICK REPLY TEMPLATES */}
              {showTemplates && (
                <motion.div 
                  className="px-4 py-3 bg-gradient-to-r from-[#FFCC00]/30 via-[#FF4D4D]/30 to-[#1363DF]/30 backdrop-blur-lg border-t-2 border-white/30"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template, index) => (
                      <motion.button
                        key={index}
                        onClick={() => {
                          setMessage(template);
                          setShowTemplates(false);
                        }}
                        className="px-3 py-2 bg-gradient-to-r from-[#FFCC00] to-[#FF4D4D] text-white text-xs font-semibold rounded-lg shadow-lg border-2 border-white/40 hover:shadow-xl transition-all"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {template}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {/* PROFESSIONAL TYPING AREA */}
              <div className="p-4 bg-gradient-to-r from-[#1363DF]/20 via-[#FFCC00]/20 to-[#FF4D4D]/20 backdrop-blur-lg border-t-2 border-white/40 rounded-b-2xl shadow-inner">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (e.target.value.length > 0) {
                        setShowTemplates(false);
                      }
                    }}
                    placeholder="Kotha Hok Naki?"
                    className="flex-1 px-4 py-3 bg-white/95 backdrop-blur-sm border-2 border-white/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1363DF]/70 focus:border-[#1363DF]/70 resize-none hide-scrollbar transition-all placeholder-gray-600 shadow-sm"
                    style={{
                      minHeight: '44px',
                      maxHeight: '44px',
                      lineHeight: '20px'
                    }}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <motion.button
                    onClick={handleSendMessage}
                    className="px-4 py-3 bg-gradient-to-r from-[#1363DF] to-[#FF4D4D] text-white rounded-xl font-semibold shadow-xl backdrop-blur-sm border-2 border-white/30 flex items-center gap-2 flex-shrink-0"
                    whileHover={{ 
                      scale: 1.05,
                      boxShadow: '0 15px 30px rgba(19, 99, 223, 0.4)'
                    }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!message.trim()}
                  >
                    <Send size={16} className="drop-shadow-lg" />
                    <span className="text-sm font-bold">Send</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}