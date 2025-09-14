import { useEffect, useState, useCallback } from 'react';
import SEOHead from '@/components/seo-head';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ApprovedItem {
  id: string;
  text: string;
  author: string | null;
  lang: 'bn' | 'en';
  createdAt: string;
  featured?: boolean;
}

const fallbackApproved: ApprovedItem[] = [
  { id: 'A100', text: 'মা বললো চা ঠান্ডা হয়ে গেছে — আবার গরম করলে মেজাজও গরম 😄', author: 'Ria', lang: 'bn', createdAt: new Date(Date.now() - 3600_000).toISOString(), featured: true },
  { id: 'A101', text: 'I tried to study but cat decided keyboard = new bed.', author: null, lang: 'en', createdAt: new Date(Date.now() - 7200_000).toISOString() },
  { id: 'A102', text: 'Rickshaw uncle: “meter নেই শুধু অনুভূতি” — fair enough 😂', author: 'Arup', lang: 'en', createdAt: new Date(Date.now() - 5400_000).toISOString() },
];

export default function CommunityFeed() {
  const [items, setItems] = useState<ApprovedItem[]>(fallbackApproved);
  const [loading, setLoading] = useState(false);

  // Initial load: merge localStorage items (if any) with fallback / remote
  useEffect(() => {
    const storedRaw = localStorage.getItem('bbc_feed_items');
    if (storedRaw) {
      try {
        const parsed = JSON.parse(storedRaw);
        if (Array.isArray(parsed) && parsed.length) {
          setItems(prev => {
            const map: Record<string, ApprovedItem> = {};
            [...parsed, ...prev].forEach(p => { map[p.id] = p; });
            return Object.values(map).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      } catch {/* ignore */}
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/community/feed');
        if (r.ok) {
          const j = await r.json();
          if (!cancelled && Array.isArray(j) && j.length) setItems(prev => {
            const map: Record<string, ApprovedItem> = {};
            [...j, ...prev].forEach(p => { map[p.id] = p; });
            return Object.values(map).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
        }
      } catch {/* ignore */} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for new approved events
  const handleNewApproved = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as ApprovedItem | undefined;
    if (!detail) return;
    setItems(prev => [detail, ...prev]);
  }, []);

  useEffect(() => {
    window.addEventListener('bbc:new-approved', handleNewApproved);
    return () => window.removeEventListener('bbc:new-approved', handleNewApproved);
  }, [handleNewApproved]);

  return (
    <main className="min-h-screen bg-brand-yellow pb-20" role="main" aria-labelledby="feedHeading">
      <SEOHead title="Community Feed" description="Latest approved community stories." />
      <div className="container mx-auto px-4 pt-10 max-w-3xl">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 id="feedHeading" className="text-2xl sm:text-3xl font-bold text-brand-blue">Bong Kahini</h1>
            <p className="text-sm text-gray-700">Fresh approved ছোট গল্প / fun snippets</p>
          </div>
          <div className="flex flex-col items-end">
            <Button onClick={() => window.location.href = '/community/submit'} aria-label="Submit a story" className="relative bg-brand-blue text-white hover:bg-brand-blue/90">
              <span className="font-semibold">Your Kahini</span>
            </Button>
            <span className="mt-1 text-[10px] text-gray-600 italic">short keu kichu janbena</span>
          </div>
        </div>
        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        <div className="space-y-4" aria-live="polite">
          {items.map(it => {
            const Article = (
              <motion.article
                layout
                key={it.id}
                className={`relative rounded-lg border bg-white/80 backdrop-blur p-4 shadow-sm ${it.featured ? 'ring-2 ring-brand-blue/70' : ''}`}
                aria-labelledby={`item-${it.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`item-${it.id}`} className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                      {it.featured && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-[2px] rounded-full animate-pulse">featured</span>}
                      <span>{it.id}</span>
                    </h2>
                    <div className="text-xs text-gray-600 mt-0.5">{(it.author || 'Anonymous')} • {new Date(it.createdAt).toLocaleString()} • {it.lang === 'bn' ? 'বাংলা' : 'English'}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{it.text}</p>
              </motion.article>
            );
            if (!it.featured) return Article;
            return (
              <div key={it.id} className="relative group">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-400 opacity-60 blur-lg group-hover:opacity-80 transition" />
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                  {/* sparkles */}
                  <div className="absolute w-1 h-1 bg-white rounded-full top-2 left-3 animate-ping" />
                  <div className="absolute w-1.5 h-1.5 bg-white/90 rounded-full top-6 right-8 animate-pulse" />
                  <div className="absolute w-1 h-1 bg-white/70 rounded-full bottom-4 left-10 animate-ping [animation-delay:400ms]" />
                  <div className="absolute w-1 h-1 bg-white/80 rounded-full bottom-6 right-5 animate-ping [animation-delay:800ms]" />
                </div>
                {Article}
              </div>
            );
          })}
          {!loading && items.length === 0 && <p className="text-sm text-gray-600">No stories yet.</p>}
        </div>
      </div>
    </main>
  );
}
