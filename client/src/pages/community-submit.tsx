import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import SEOHead from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// NOTE: Using wouter; emulate useRouter-like pattern
export default function CommunitySubmit() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const clear = () => {
    setName('');
    setLang('bn');
    setText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({ title: 'গল্প লিখুন', description: 'Please write something first.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/submit-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          isAnonymous: !name.trim(),
          lang,
          text: text.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'হয়ে গেল না', description: json.message || 'Failed to submit', variant: 'destructive' });
      } else {
        toast({ title: 'পাঠানো হয়েছে', description: json.message || 'Story queued (pending review)' });
        navigate('/community/feed');
      }
    } catch (err: any) {
      toast({ title: 'ভুল হয়েছে', description: err.message || 'Network error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-yellow pb-16" role="main" aria-labelledby="communitySubmitHeading">
      <SEOHead title="Submit Story - Community" description="Share a short funny Bengali or English story with Bong Bari community." />
      <div className="container mx-auto px-4 pt-10 max-w-2xl">
        <motion.h1
          id="communitySubmitHeading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold text-center text-brand-blue mb-2"
        >
          কমিউনিটি গল্প পাঠান
        </motion.h1>
        <p className="text-center text-sm text-gray-800 mb-6" aria-live="polite">
          name optional, anonymous ok, no বaje kotha — only মজা
        </p>
        <form onSubmit={handleSubmit} className="space-y-5 bg-white/70 backdrop-blur rounded-xl p-6 shadow" aria-describedby="formHelp">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">নাম (optional)</label>
            <input
              id="name"
              aria-label="Your name (optional)"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="আপনার নাম (বা ফাঁকা রাখুন)"
              maxLength={60}
            />
          </div>
          <div>
            <label htmlFor="lang" className="block text-sm font-medium text-gray-900 mb-1">ভাষা</label>
            <select
              id="lang"
              aria-label="Select language"
              value={lang}
              onChange={e => setLang(e.target.value as 'bn' | 'en')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white"
            >
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label htmlFor="story" className="block text-sm font-medium text-gray-900 mb-1">গল্প / Story</label>
            <textarea
              id="story"
              aria-label="Story text"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder="লিখো একটা ছোট গল্প... / Write a short fun story..."
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue placeholder:text-gray-400"
              required
            />
            <div id="formHelp" className="mt-1 text-[11px] text-gray-600 flex justify-between" aria-live="polite">
              <span>{1000 - text.length} chars left</span>
              <span>{lang === 'bn' ? 'মজা রাখুন' : 'Keep it playful'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || !text.trim()}
              aria-label="Post story"
              className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold px-5 py-2 rounded-md"
            >
              {loading ? 'পাঠানো হচ্ছে…' : 'Post'}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Clear form"
              onClick={clear}
              className="border-brand-blue text-brand-blue hover:bg-brand-blue/10 font-semibold px-5 py-2 rounded-md"
            >
              Clear
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
