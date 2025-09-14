import { useEffect, useState, useCallback, useMemo } from 'react';
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
  likes?: number;
  likeEvents?: number[]; // timestamps (ms) of likes
}

const fallbackApproved: ApprovedItem[] = [
  { id: 'A100', text: 'মা বললো চা ঠান্ডা হয়ে গেছে — আবার গরম করলে মেজাজও গরম 😄', author: 'Ria', lang: 'bn', createdAt: new Date(Date.now() - 3600_000).toISOString(), featured: true },
  { id: 'A101', text: 'I tried to study but cat decided keyboard = new bed.', author: null, lang: 'en', createdAt: new Date(Date.now() - 7200_000).toISOString() },
  { id: 'A102', text: 'Rickshaw uncle: “meter নেই শুধু অনুভূতি” — fair enough 😂', author: 'Arup', lang: 'en', createdAt: new Date(Date.now() - 5400_000).toISOString() },
];

export default function CommunityFeed() {
  const [items, setItems] = useState<ApprovedItem[]>(fallbackApproved);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);

  // Persist likes & new items to localStorage whenever items change
  useEffect(() => {
    try { localStorage.setItem('bbc_feed_items', JSON.stringify(items)); } catch {/* ignore */}
  }, [items]);

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

  // Like handling
  const toggleLike = (id: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const now = Date.now();
      const likes = (it.likes || 0) + 1; // only increment (no unlike for simplicity)
      const likeEvents = [...(it.likeEvents || []), now];
      return { ...it, likes, likeEvents };
    }));
  };

  const weekCutoff = useMemo(() => Date.now() - 7 * 24 * 3600 * 1000, []);
  const weeklyTop = useMemo(() => {
    return [...items]
      .map(it => {
        const recentLikes = (it.likeEvents || []).filter(ts => ts >= weekCutoff).length;
        return { ...it, recentLikes };
      })
      .filter(it => it.recentLikes > 0)
      .sort((a,b) => b.recentLikes - a.recentLikes)
      .slice(0,5);
  }, [items, weekCutoff]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.text.toLowerCase().includes(q)) ||
      ((it.author || 'anonymous').toLowerCase().includes(q)) ||
      (it.id.toLowerCase().includes(q))
    );
  }, [items, query]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const canLoadMore = visibleItems.length < filteredItems.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const body = { name: name.trim() || null, isAnonymous: !name.trim(), lang, text: text.trim() };
      await fetch('/api/submit-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(()=>{});
      // Optimistic push to pending store so moderation UI could (optionally) pick it up; for now just clear form
      setName(''); setLang('bn'); setText('');
    } finally { setSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-brand-yellow pb-20" role="main" aria-labelledby="feedHeading">
      <SEOHead title="Community Feed" description="Latest approved community stories." />
      <div className="container mx-auto px-4 pt-10 max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h1 id="feedHeading" className="text-3xl font-extrabold text-brand-blue tracking-tight">Bong Kahini <span className="bangla-text">— ঘরের গল্প</span></h1>
          <div className="w-full max-w-sm lg:ml-auto">
            <label htmlFor="kahiniSearch" className="sr-only">Search stories</label>
            <input
              id="kahiniSearch"
              value={query}
              onChange={e=>{setQuery(e.target.value); setVisibleCount(10);}}
              placeholder="Search story / author / id" 
              className="w-full rounded-lg border border-gray-300 bg-white/70 backdrop-blur px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {query && (
              <div className="mt-1 text-[10px] text-gray-500">{filteredItems.length} match{filteredItems.length!==1?'es':''}</div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-4">Your secret golpo corner. Featured highlight + weekly most liked.</p>
        {loading && <div className="text-sm text-gray-600 mb-4">Loading…</div>}
        <div className="grid lg:grid-cols-3 gap-8 items-start" aria-live="polite">
          {/* Left/Main Column (stories) */}
          <div className="lg:col-span-2 space-y-4">
          {visibleItems.map(it => {
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
                  <div className="flex items-center gap-2">
                    <button onClick={()=>toggleLike(it.id)} aria-label="Like story" className="text-[11px] px-2 py-1 rounded-md bg-pink-100 text-pink-700 hover:bg-pink-200 transition">
                      ❤️ {it.likes || 0}
                    </button>
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
           {!loading && visibleItems.length === 0 && <p className="text-sm text-gray-600">No stories{query?' for this search':''} yet.</p>}
           {canLoadMore && (
             <div className="pt-2">
               <Button onClick={()=>setVisibleCount(c=>c+10)} variant="outline" className="w-full bg-white/70 hover:bg-white text-sm" aria-label="Load more stories">Load More</Button>
             </div>
           )}
          </div>
          {/* Right Column (submission + weekly list) */}
          <div className="space-y-6 sticky top-28">
            <div className="rounded-xl border bg-white/80 backdrop-blur p-5 shadow" aria-labelledby="yourKahiniHeading">
              <h2 id="yourKahiniHeading" className="text-sm font-semibold text-brand-blue flex items-center gap-2">Your Kahini <span className="text-[10px] italic text-gray-500">short keu kichu janbena</span></h2>
              <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                <div>
                  <label htmlFor="kahiniName" className="sr-only">Name (optional)</label>
                  <input id="kahiniName" value={name} onChange={e=>setName(e.target.value)} placeholder="Name (optional)" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90" maxLength={60} />
                </div>
                <div className="flex gap-2 text-xs">
                  <select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as 'bn' | 'en')} className="rounded-md border border-gray-300 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90">
                    <option value="bn">বাংলা</option>
                    <option value="en">English</option>
                  </select>
                  <span className="self-center text-[10px] text-gray-500">{1000 - text.length} left</span>
                </div>
                <div>
                  <label htmlFor="kahiniText" className="sr-only">Story</label>
                  <textarea id="kahiniText" value={text} onChange={e=>setText(e.target.value)} rows={4} maxLength={1000} placeholder="লিখো একটা ছোট গল্প..." className="w-full resize-none rounded-md border border-gray-300 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90" />
                </div>
                <Button disabled={submitting || !text.trim()} className="w-full bg-brand-blue text-white hover:bg-brand-blue/90 h-8 text-xs" aria-label="Submit kahini" type="submit">
                  {submitting ? 'Submitting…' : 'Post'}
                </Button>
              </form>
            </div>
            <div className="rounded-xl border bg-white/80 backdrop-blur p-5 shadow" aria-labelledby="weeklyTopHeading">
              <h2 id="weeklyTopHeading" className="text-sm font-semibold text-brand-blue">This week most liked মোজার story / ঘটনা</h2>
              {weeklyTop.length === 0 && <p className="mt-3 text-[11px] text-gray-600">No likes yet.</p>}
              <ul className="mt-3 space-y-3">
                {weeklyTop.map(it => (
                  <li key={it.id} className="text-[11px] flex justify-between gap-2">
                    <span className="truncate max-w-[140px]">{it.text.slice(0,50)}{it.text.length>50?'…':''}</span>
                    <span className="text-pink-600 font-medium">❤️ {it.recentLikes}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
