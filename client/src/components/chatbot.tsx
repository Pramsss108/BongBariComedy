import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, User, Sparkles, Zap, Star, Minimize2, Maximize2, Heart, Coffee } from "lucide-react";
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
      content: 'হ্যালো! আমি Bong Bot! 🤖✨\n\nHello! I\'m Bong Bot, your premium AI assistant! Ask me anything about Bengali comedy magic! 🎭💫',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const getComedyTips = async () => {
    setIsTyping(true);
    addMessage('user', '✨ Bengali Comedy Magic Tips');

    try {
      const response = await apiRequest('/api/chatbot/tips', {
        method: 'GET'
      });

      addMessage('assistant', `🎭 Bengali Comedy Magic:\n\n${response.tips}`);
    } catch (error) {
      console.error('Tips error:', error);
      addMessage('assistant', 'টিপস দিতে সমস্যা হচ্ছে। 😅\n\nHaving trouble providing tips.');
    } finally {
      setIsTyping(false);
    }
  };

  // Premium floating particles animation
  const particles = Array.from({ length: 15 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-gradient-to-r from-yellow-300 to-pink-300 rounded-full"
      animate={{
        y: [-20, -120],
        x: [0, Math.sin(i) * 20],
        opacity: [0, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay: i * 0.3,
        ease: "easeOut"
      }}
      style={{
        left: `${Math.random() * 100}%`,
        top: "100%",
      }}
    />
  ));

  // Premium typing animation
  const TypingIndicator = () => (
    <motion.div 
      className="flex items-center gap-3 p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-1">
        <motion.div
          className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-3 h-3 bg-gradient-to-r from-pink-400 to-yellow-400 rounded-full"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-white/80 text-sm font-medium bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
        Bong Bot is thinking...
      </span>
    </motion.div>
  );

  // Template messages
  const templateMessages = [
    { text: "আমি কি তোমায় বিরক্ত করছি?", emoji: "🤔", color: "from-purple-500 to-pink-500" },
    { text: "বিরক্ত না হলে Collabe কি ভাবে করবো?", emoji: "🤝", color: "from-blue-500 to-purple-500" }
  ];

  if (!isOpen) {
    return (
      <motion.div
        className={`fixed bottom-6 right-6 z-50 ${className}`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="flex flex-col items-center">
          {/* Premium Bong Bot Label */}
          <motion.div
            className="mb-3 px-4 py-2 bg-gradient-to-r from-purple-600/95 to-pink-600/95 backdrop-blur-md rounded-full text-white text-sm font-bold border-2 border-white/30 shadow-2xl"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
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
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.div>
            </div>
          </motion.div>

          {/* Premium Main Button */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            {/* Multi-layer glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full blur-xl opacity-80 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDelay: '1s' }} />
            
            <Button
              onClick={() => setIsOpen(true)}
              className="no-rickshaw-sound relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 text-white shadow-2xl border-3 border-white/40 overflow-hidden group"
              data-testid="chatbot-open-button"
            >
              {/* Premium sparkle overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-transparent to-pink-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Multiple rotating rings */}
              <motion.div
                className="absolute inset-2 border-2 border-white/40 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-3 border-1 border-yellow-300/60 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              
              <MessageCircle className="w-9 h-9 relative z-10" />
              
              {/* Premium floating sparkles */}
              <motion.div
                className="absolute top-3 right-3 w-2 h-2 bg-yellow-300 rounded-full"
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], rotate: [0, 180] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute bottom-3 left-3 w-2 h-2 bg-pink-300 rounded-full"
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], rotate: [180, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1.2 }}
              />
              <motion.div
                className="absolute top-6 left-6 w-1 h-1 bg-blue-200 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 2 }}
              />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`no-rickshaw-sound fixed bottom-4 right-4 z-50 ${className}`}
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <div className={`relative ${isMinimized ? 'w-80 h-20' : 'w-[420px] h-[650px]'} transition-all duration-700 ease-out`}>
        {/* Premium Background with advanced glass morphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-pink-900/90 backdrop-blur-2xl rounded-3xl border-2 border-white/40 shadow-2xl overflow-hidden">
          {/* Advanced animated gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-blue-500/30 to-pink-500/30"
            animate={{ 
              background: [
                "linear-gradient(45deg, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3), rgba(236, 72, 153, 0.3))",
                "linear-gradient(90deg, rgba(236, 72, 153, 0.3), rgba(59, 130, 246, 0.3), rgba(168, 85, 247, 0.3))",
                "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))",
                "linear-gradient(180deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3), rgba(59, 130, 246, 0.3))"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          
          {/* Premium floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles}
          </div>
          
          {/* Premium corner sparkles */}
          <motion.div
            className="absolute top-6 right-6 w-3 h-3 bg-yellow-300 rounded-full"
            animate={{ 
              scale: [0, 1.5, 0], 
              opacity: [0, 1, 0],
              rotate: [0, 360]
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-6 left-6 w-3 h-3 bg-pink-300 rounded-full"
            animate={{ 
              scale: [0, 1.5, 0], 
              opacity: [0, 1, 0],
              rotate: [360, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
          />
        </div>

        {/* Premium Header */}
        <div className="relative z-10 p-5 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-4">
            {/* Premium AI Avatar */}
            <motion.div
              className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 flex items-center justify-center"
              animate={{ 
                boxShadow: [
                  "0 0 25px rgba(168, 85, 247, 0.7)", 
                  "0 0 35px rgba(59, 130, 246, 0.8)", 
                  "0 0 25px rgba(236, 72, 153, 0.7)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Bot className="w-7 h-7 text-white" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute -inset-1 rounded-full border-1 border-yellow-300/30"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            <div>
              <h3 className="text-white font-bold text-xl bg-gradient-to-r from-yellow-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                Bong Bot
              </h3>
              <div className="text-white/80 text-sm flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent font-medium">
                  Online & Magical ✨
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="no-rickshaw-sound h-10 w-10 p-0 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20"
              data-testid="chatbot-minimize-button"
            >
              {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="no-rickshaw-sound h-10 w-10 p-0 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm border border-white/20"
              data-testid="chatbot-close-button"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative z-10"
            >
              {/* Premium Messages Area */}
              <ScrollArea className="h-[380px] px-5 py-4">
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 30, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] relative ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white rounded-2xl rounded-br-md shadow-lg'
                            : 'bg-white/20 backdrop-blur-sm text-white rounded-2xl rounded-bl-md border border-white/30 shadow-lg'
                        } p-4`}
                      >
                        {/* Premium message glow effect */}
                        {message.role === 'assistant' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20 rounded-2xl rounded-bl-md blur-sm" />
                        )}
                        
                        <div className="relative z-10 flex items-start gap-3">
                          {message.role === 'assistant' && (
                            <motion.div
                              animate={{ rotate: [0, 15, -15, 0] }}
                              transition={{ duration: 3, repeat: Infinity, delay: Math.random() * 2 }}
                            >
                              <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-1" />
                            </motion.div>
                          )}
                          
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              {message.content}
                            </p>
                            <span className="text-xs opacity-70 mt-3 block font-mono">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-bl-md border border-white/30 shadow-lg">
                        <TypingIndicator />
                      </div>
                    </motion.div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Premium Template Messages */}
              <div className="px-5 py-3 border-t border-white/20">
                <div className="grid grid-cols-1 gap-2">
                  {templateMessages.map((template, index) => (
                    <motion.button
                      key={index}
                      onClick={() => sendTemplateMessage(template.text)}
                      disabled={isTyping}
                      className={`no-rickshaw-sound w-full py-3 px-4 bg-gradient-to-r ${template.color}/25 backdrop-blur-sm rounded-lg border border-white/30 text-white text-sm font-medium hover:${template.color}/35 transition-all duration-300 flex items-center justify-between gap-3 group`}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`template-${index}`}
                    >
                      <span className="flex-1 text-left">{template.text}</span>
                      <span className="text-lg group-hover:scale-110 transition-transform">
                        {template.emoji}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Premium Quick Action */}
              <div className="px-5 pb-3">
                <motion.button
                  onClick={getComedyTips}
                  disabled={isTyping}
                  className="no-rickshaw-sound w-full py-3 px-4 bg-gradient-to-r from-yellow-500/25 to-red-500/25 backdrop-blur-sm rounded-lg border border-white/30 text-white text-sm font-medium hover:from-yellow-500/35 hover:to-red-500/35 transition-all duration-300 flex items-center justify-center gap-3"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="quick-action-tips"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Comedy Magic Tips / কমেডি টিপস</span>
                  <Star className="w-4 h-4 text-yellow-400" />
                </motion.button>
              </div>

              {/* Premium Input Area - Significantly Expanded */}
              <div className="p-5 pt-3 border-t border-white/20">
                <div className="relative">
                  {/* Premium input glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-md" />
                  
                  <div className="relative bg-white/20 backdrop-blur-md rounded-2xl border-2 border-white/40 p-4 shadow-2xl">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <textarea
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Ask me anything magical... ✨\nআমাকে যেকোনো জাদুকরী প্রশ্ন করুন..."
                          className="w-full bg-transparent border-0 text-white placeholder:text-white/60 focus:ring-0 focus:outline-none font-medium px-0 py-2 rounded-lg text-sm resize-none min-h-[60px] max-h-[120px]"
                          disabled={isTyping}
                          rows={3}
                          data-testid="chatbot-input"
                        />
                      </div>
                      <motion.div 
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Button
                          onClick={sendMessage}
                          disabled={!inputMessage.trim() || isTyping}
                          className="no-rickshaw-sound w-12 h-12 p-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 disabled:opacity-50 shadow-xl border-2 border-white/30"
                          data-testid="chatbot-send-button"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </div>
                    
                    {/* Premium input footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                      <span className="text-xs text-white/50 font-medium">
                        Press Enter to send • Shift+Enter for new line
                      </span>
                      <div className="flex items-center gap-2">
                        <Heart className="w-3 h-3 text-pink-300" />
                        <span className="text-xs text-white/50">Premium Chat</span>
                      </div>
                    </div>
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