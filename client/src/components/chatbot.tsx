import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, User, Sparkles, Zap, Star, Minimize2, Maximize2 } from "lucide-react";
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
      content: 'হ্যালো! আমি Bong Bot! 🤖✨\n\nHello! I\'m Bong Bot, your magical AI assistant! Ask me anything about Bengali comedy! 🎭💫',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Floating particles animation
  const particles = Array.from({ length: 20 }, (_, i) => (
    <motion.div
      key={i}
      className="absolute w-1 h-1 bg-white/30 rounded-full"
      animate={{
        y: [-20, -100],
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay: i * 0.2,
        ease: "easeOut"
      }}
      style={{
        left: `${Math.random() * 100}%`,
        top: "100%",
      }}
    />
  ));

  // Typing animation dots
  const TypingIndicator = () => (
    <div className="flex items-center gap-2 p-4">
      <div className="flex items-center gap-1">
        <motion.div
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-blue-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-pink-400 rounded-full"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span className="text-white/70 text-sm font-medium">AI thinking...</span>
    </div>
  );

  if (!isOpen) {
    return (
      <motion.div
        className={`fixed bottom-6 right-6 z-40 ${className}`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="flex flex-col items-center">
          {/* Bong Bot Label Above */}
          <motion.div
            className="mb-2 px-3 py-1 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm rounded-full text-white text-sm font-bold border border-white/20 shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            🤖 Bong Bot
          </motion.div>

          <motion.div
            className="relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full blur-lg opacity-70 animate-pulse" />
            
            {/* Main button */}
            <Button
              onClick={() => setIsOpen(true)}
              className="no-rickshaw-sound relative w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 text-white shadow-2xl border-2 border-white/20 overflow-hidden group"
              data-testid="chatbot-open-button"
            >
              {/* Sparkle overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Rotating ring */}
              <motion.div
                className="absolute inset-1 border-2 border-white/30 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              
              <MessageCircle className="w-7 h-7 relative z-10" />
              
              {/* Floating mini sparkles */}
              <motion.div
                className="absolute top-2 right-2 w-1 h-1 bg-yellow-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="absolute bottom-2 left-2 w-1 h-1 bg-pink-300 rounded-full"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
            </Button>
          </motion.div>

          {/* Hi Greeting Below */}
          <motion.div
            className="mt-2 px-3 py-1 bg-gradient-to-r from-yellow-500/80 to-red-500/80 backdrop-blur-sm rounded-full text-white text-sm font-semibold border border-white/20 shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            👋 Hi! / হাই!
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`no-rickshaw-sound fixed bottom-6 right-6 z-40 ${className}`}
      initial={{ scale: 0, opacity: 0, y: 100 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
    >
      <div className={`relative ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'} transition-all duration-500 ease-out`}>
        {/* Background with glass morphism */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/85 via-blue-900/85 to-pink-900/85 backdrop-blur-xl rounded-3xl border-2 border-white/30 shadow-2xl overflow-hidden">
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/25 via-blue-500/25 to-pink-500/25"
            animate={{ 
              background: [
                "linear-gradient(45deg, rgba(168, 85, 247, 0.25), rgba(59, 130, 246, 0.25), rgba(236, 72, 153, 0.25))",
                "linear-gradient(90deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25), rgba(59, 130, 246, 0.25))",
                "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25))"
              ]
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles}
          </div>
          
          {/* Extra sparkle effects */}
          <motion.div
            className="absolute top-4 right-4 w-2 h-2 bg-yellow-300 rounded-full"
            animate={{ 
              scale: [0, 1, 0], 
              opacity: [0, 1, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-4 left-4 w-2 h-2 bg-pink-300 rounded-full"
            animate={{ 
              scale: [0, 1, 0], 
              opacity: [0, 1, 0],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />
        </div>

        {/* Header */}
        <div className="relative z-10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* AI Avatar with glow */}
            <motion.div
              className="relative w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ boxShadow: ["0 0 20px rgba(168, 85, 247, 0.6)", "0 0 30px rgba(236, 72, 153, 0.8)", "0 0 20px rgba(168, 85, 247, 0.6)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bot className="w-6 h-6 text-white" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
            
            <div>
              <h3 className="text-white font-bold text-lg bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Bong Bot
              </h3>
              <div className="text-white/70 text-xs flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span>Online & Magical ✨</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="no-rickshaw-sound h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              data-testid="chatbot-minimize-button"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="no-rickshaw-sound h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
              data-testid="chatbot-close-button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative z-10"
            >
              {/* Messages Area */}
              <ScrollArea className="h-[440px] px-4 pb-4">
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] relative ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-md'
                            : 'bg-white/15 backdrop-blur-sm text-white rounded-2xl rounded-bl-md border border-white/20'
                        } p-4 shadow-xl`}
                      >
                        {/* Message glow effect */}
                        {message.role === 'assistant' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl rounded-bl-md blur-sm" />
                        )}
                        
                        <div className="relative z-10 flex items-start gap-3">
                          {message.role === 'assistant' && (
                            <motion.div
                              animate={{ rotate: [0, 10, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                            >
                              <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                            </motion.div>
                          )}
                          
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              {message.content}
                            </p>
                            <span className="text-xs opacity-70 mt-2 block">
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
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl rounded-bl-md border border-white/20 shadow-xl">
                        <TypingIndicator />
                      </div>
                    </motion.div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Quick Actions */}
              <div className="px-4 pb-2">
                <motion.button
                  onClick={getComedyTips}
                  disabled={isTyping}
                  className="no-rickshaw-sound w-full py-2 px-4 bg-gradient-to-r from-yellow-500/20 to-red-500/20 backdrop-blur-sm rounded-xl border border-white/20 text-white text-sm font-medium hover:from-yellow-500/30 hover:to-red-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="quick-action-tips"
                >
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Comedy Magic Tips / কমেডি টিপস
                  <Star className="w-4 h-4 text-yellow-400" />
                </motion.button>
              </div>

              {/* Input Area */}
              <div className="p-4 pt-2">
                <div className="relative">
                  {/* Input glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-sm" />
                  
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-2 flex gap-2">
                    <input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask me anything magical... ✨"
                      className="flex-1 bg-transparent border-0 text-white placeholder:text-white/50 focus:ring-0 focus:outline-none font-medium px-3 py-2 rounded-xl"
                      disabled={isTyping}
                      data-testid="chatbot-input"
                    />
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="no-rickshaw-sound w-10 h-10 p-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 shadow-lg"
                        data-testid="chatbot-send-button"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </motion.div>
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