import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/community/feed');
        if (r.ok) {
          const j = await r.json();
            if (!cancelled && Array.isArray(j) && j.length) setItems(j);
        }
      } catch {/* ignore; fallback */} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-brand-yellow pb-20" role="main" aria-labelledby="feedHeading">
      <SEOHead title="Community Feed" description="Latest approved community stories." />
      <div className="container mx-auto px-4 pt-10 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 id="feedHeading" className="text-2xl sm:text-3xl font-bold text-brand-blue">Community Feed</h1>
            <p className="text-sm text-gray-700">Fresh approved ছোট গল্প / fun snippets</p>
          </div>
          <Button onClick={() => window.location.href = '/community/submit'} aria-label="Submit a story" className="bg-brand-blue text-white hover:bg-brand-blue/90">Submit</Button>
        </div>
        {loading && <div className="text-sm text-gray-600">Loading…</div>}
        <div className="space-y-4" aria-live="polite">
          {items.map(it => (
            <motion.article
              layout
              key={it.id}
              className={`rounded-lg border bg-white/80 backdrop-blur p-4 shadow-sm ${it.featured ? 'ring-2 ring-brand-blue' : ''}`}
              aria-labelledby={`item-${it.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id={`item-${it.id}`} className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                    {it.featured && <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-[2px] rounded-full">featured</span>}
                    <span>{it.id}</span>
                  </h2>
                  <div className="text-xs text-gray-600 mt-0.5">{(it.author || 'Anonymous')} • {new Date(it.createdAt).toLocaleString()} • {it.lang === 'bn' ? 'বাংলা' : 'English'}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{it.text}</p>
            </motion.article>
          ))}
          {!loading && items.length === 0 && <p className="text-sm text-gray-600">No stories yet.</p>}
        </div>
      </div>
    </main>
  );
}
