import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import { buildApiUrl } from '@/lib/queryClient';

interface KhistiPost {
  id: string;
  text: string;
  createdAt: number;
  emoji: string;
}

export default function AnonymousKhisti() {
  const [posts, setPosts] = useState<KhistiPost[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/khisti'));
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 8000); // auto-refresh every 8s
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 2) {
      setError('কিছু তো লেখো! (min 2 chars)');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(buildApiUrl('/api/khisti'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed');
      } else {
        setSuccess('খিস্তি পাঠানো হয়েছে! 🔥');
        setText('');
        fetchPosts();
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setSending(false);
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      <SEOHead
        title="Anonymous Khisti Board | Bong Bari"
        description="Drop your anonymous khisti, confessions, or rants. No login, no tracking. Temporary community wall by Bong Bari."
        url="https://www.bongbari.com/tools/khisti"
      />

      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        {/* Fixed Header */}
        <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-red-500/20 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link href="/tools" className="text-sm text-neutral-500 hover:text-white transition-colors">
              ← Tools
            </Link>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              🔥 Anonymous খিস্তি
            </h1>
            <span className="text-xs text-neutral-600">{posts.length} posts</span>
          </div>
        </header>

        {/* Main Content - Single Screen, No Scroll Layout */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-4 overflow-hidden">
          {/* Hero Banner - Compact */}
          <div className="text-center mb-4 flex-shrink-0">
            <p className="text-sm text-neutral-400">
              WhatsApp/Instagram story তে শেয়ার করো — anonymous খিস্তি drop করতে চাইলে এখানে আয়!
            </p>
            <p className="text-[10px] text-neutral-600 mt-1">
              ⚡ সব temporary — server restart এ মুছে যাবে • কোনো login নেই • কোনো tracking নেই
            </p>
          </div>

          {/* Input Area - Fixed at Top */}
          <div className="flex-shrink-0 mb-4">
            <div className="relative rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 p-3">
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setError(''); }}
                maxLength={500}
                rows={2}
                placeholder="তোর খিস্তি এখানে লেখ... 🔥 (anonymous)"
                className="w-full bg-transparent text-white placeholder:text-neutral-600 outline-none resize-none text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-neutral-600">{text.length}/500</span>
                <button
                  onClick={handleSubmit}
                  disabled={sending || !text.trim()}
                  className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white text-xs font-bold hover:from-red-500 hover:to-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20"
                >
                  {sending ? '...' : 'Drop খিস্তি 💣'}
                </button>
              </div>
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-400 text-[11px] mt-1">{error}</motion.p>
                )}
                {success && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-green-400 text-[11px] mt-1">{success}</motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Feed - Scrollable */}
          <div ref={feedRef} className="flex-1 space-y-2 pb-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-neutral-600 text-sm">
                <p className="text-3xl mb-3">🦴</p>
                <p>কেউ এখনো কিছু লেখেনি... তুই প্রথম হ!</p>
              </div>
            ) : (
              <AnimatePresence>
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: -10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl bg-white/[0.03] border border-white/5 p-3 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{post.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 leading-relaxed break-words whitespace-pre-wrap">{post.text}</p>
                        <p className="text-[10px] text-neutral-600 mt-1.5">{timeAgo(post.createdAt)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex-shrink-0 border-t border-white/5 bg-black/50 backdrop-blur-sm px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-[10px] text-neutral-600">Made with 🔥 by Bong Bari</p>
            <Link href="/tools/free-tools-cta" className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
              We make tools free — seriously →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
