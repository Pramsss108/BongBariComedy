import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, User, Search, Lightbulb, Minimize2 } from "lucide-react";
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
      content: 'হ্যালো! আমি Bong Bari-র AI সহায়ক। আপনার কোন প্রশ্ন আছে? 🎭\n\nHello! I\'m Bong Bari\'s AI assistant. How can I help you today?',
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

  const searchWeb = async (query: string) => {
    setIsTyping(true);
    addMessage('user', `🔍 Search: ${query}`);

    try {
      const response = await apiRequest('/api/chatbot/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      addMessage('assistant', `🌐 Search Results:\n\n${response.results}`);
    } catch (error) {
      console.error('Search error:', error);
      addMessage('assistant', 'অনুসন্ধানে সমস্যা হয়েছে। 😔\n\nSearch encountered an error.');
    } finally {
      setIsTyping(false);
    }
  };

  const getComedyTips = async () => {
    setIsTyping(true);
    addMessage('user', '💡 Bengali Comedy Tips');

    try {
      const response = await apiRequest('/api/chatbot/tips', {
        method: 'GET'
      });

      addMessage('assistant', `🎭 Bengali Comedy Tips:\n\n${response.tips}`);
    } catch (error) {
      console.error('Tips error:', error);
      addMessage('assistant', 'টিপস দিতে সমস্যা হচ্ছে। 😅\n\nHaving trouble providing tips.');
    } finally {
      setIsTyping(false);
    }
  };

  // Quick action buttons
  const quickActions = [
    {
      label: "Comedy Tips",
      bangla: "কমেডি টিপস",
      action: getComedyTips,
      icon: Lightbulb
    },
    {
      label: "About Bong Bari",
      bangla: "বং বাড়ি সম্পর্কে",
      action: () => sendMessage(),
      icon: MessageCircle
    }
  ];

  if (!isOpen) {
    return (
      <motion.div
        className={`fixed bottom-6 right-6 z-50 ${className}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-brand-blue hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          data-testid="chatbot-open-button"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`fixed bottom-6 right-6 z-50 ${className}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Card className={`w-96 shadow-2xl border-2 border-brand-blue/20 ${isMinimized ? 'h-16' : 'h-[500px]'} transition-all duration-300`}>
        <CardHeader className="p-3 bg-gradient-to-r from-brand-yellow to-brand-red text-brand-blue">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Bong Bari Assistant</CardTitle>
                <p className="text-xs opacity-80">বং বাড়ি সহায়ক</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 hover:bg-brand-blue/10"
                data-testid="chatbot-minimize-button"
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-brand-blue/10"
                data-testid="chatbot-close-button"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="p-0 flex flex-col h-[440px]">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-brand-blue text-white rounded-br-sm'
                              : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <Bot className="w-4 h-4 mt-0.5 text-brand-blue" />
                            )}
                            {message.role === 'user' && (
                              <User className="w-4 h-4 mt-0.5" />
                            )}
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 p-3 rounded-lg rounded-bl-sm">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-brand-blue" />
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Quick Actions */}
                <div className="p-2 border-t">
                  <div className="flex gap-1 mb-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={action.action}
                        className="text-xs h-7 px-2"
                        disabled={isTyping}
                        data-testid={`quick-action-${index}`}
                      >
                        <action.icon className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">{action.label}</span>
                        <span className="sm:hidden">{action.bangla}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-3 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message... / আপনার বার্তা লিখুন..."
                      className="flex-1"
                      disabled={isTyping}
                      data-testid="chatbot-input"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      className="bg-brand-blue hover:bg-blue-600"
                      data-testid="chatbot-send-button"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}