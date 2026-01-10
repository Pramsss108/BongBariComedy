import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, X, MessageCircle, LogIn, HelpCircle } from 'lucide-react';
import { buildApiUrl } from '@/lib/queryClient';

interface BongBotProps {
  onOpenChange?: (isOpen: boolean) => void;
}

export default function BongBot({ onOpenChange }: BongBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ id: number; text: string; sender: 'bot' | 'user'; timestamp: Date }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    sessionId: localStorage.getItem('chatbot_session'),
    questionsRemaining: 3,
    showAuthPrompt: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [templates, setTemplates] = useState<string[]>([]);

  const DEFAULT_GREETING = "🙏 Hi! Ami Bong Bot — Bong Bari family-te welcome. Blood relation na, only laughing relation!";
  const CTA_LINE = "Join family: https://youtube.com/@bongbari | Work with us: /work-with-us#form | team@bongbari.com";

  const loadTemplates = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/chatbot/templates?ts=${Date.now()}`));
      if (response.ok) {
        const dbTemplates = await response.json();
        if (Array.isArray(dbTemplates)) {
          setTemplates(dbTemplates.map((t: any) => String(t.content || '').trim()).filter(Boolean));
        }
      }
    } catch {
      setTemplates(["Collab korte chai?", "Brand sponsor?", "Subscribe MARO"]);
    }
  };

  useEffect(() => {
    onOpenChange?.(isOpen);
    if (isOpen) {
      setMessages([{ id: Date.now(), text: `${DEFAULT_GREETING}\n${CTA_LINE}`, sender: 'bot', timestamp: new Date() }]);
      setShowTemplates(true);
      loadTemplates();
    }
  }, [isOpen]);

  const handleSendMessage = async (textOverride?: string) => {
    const msgText = (textOverride ?? message).trim();
    if (!msgText) return;

    setMessages(prev => [...prev, { id: Date.now(), text: msgText, sender: 'user', timestamp: new Date() }]);
    setMessage('');
    setIsTyping(true);
    setShowTemplates(false);

    try {
      const res = await fetch(buildApiUrl('/api/chatbot/message'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authState.sessionId ? { 'Authorization': `Bearer ${authState.sessionId}` } : {})
        },
        body: JSON.stringify({ message: msgText, aiOnly: true })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: Date.now(), text: data.response, sender: 'bot', timestamp: new Date() }]);
      } else if (res.status === 429) {
        setAuthState(prev => ({ ...prev, questionsRemaining: 0, showAuthPrompt: true }));
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "🚀 Daily limit reached! Sign up with Google for unlimited chat.",
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), text: "Ektu problem hocche, pore try koro!", sender: 'bot', timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);


  useEffect(() => {
    // Listen for custom toggle event from Header
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-chatbot', handleToggle);
    return () => window.removeEventListener('toggle-chatbot', handleToggle);
  }, []);

  if (!isOpen) {
    // Hide default floating button on mobile - Triggered via Header now
    // Keep it for desktop or specific scenarios if needed, currently hiding to match request "remove every floating"
    return null; 
  }

  return (
    <motion.div
      className="fixed bottom-20 right-4 z-50 select-none flex flex-col overflow-hidden"
      style={{
        width: window.innerWidth < 640 ? 'calc(100vw - 32px)' : '350px',
        maxHeight: '60vh',
        minHeight: '400px'
      }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
    >
      <div className="flex-1 bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600/20 to-red-600/20 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Bong Bot</h3>
              <p className="text-blue-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" /> Active Now
              </p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg text-white/50">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-[12px] leading-relaxed ${msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-3 rounded-2xl animate-pulse flex gap-1">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Templates */}
        {showTemplates && templates.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(t)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[10px] text-white/70 border border-white/10 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white/5 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bolo ki bolbe..."
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-[12px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-[42px] hide-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!message.trim()}
              className="w-[42px] h-[42px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}