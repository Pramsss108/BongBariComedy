import { useEffect, useState, useCallback, useMemo } from 'react';
import { generateSeedPosts, generateAutoPost, AutoPost } from '@/lib/autoPosts';
import { motion as m, AnimatePresence, motion } from 'framer-motion';
import SEOHead from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/lib/deviceId';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { getTestBypassHeader } from '@/lib/testBypass';

interface ApprovedItem {
  id: string;
  text: string;
  author: string | null;
  lang: 'bn' | 'en';
  createdAt: string;
  featured?: boolean;
  likes?: number;
  likeEvents?: number[]; // timestamps (ms) of likes
  reactions?: Record<string, number>; // emoji -> count
  seed?: boolean;
  autoTopic?: string;
  flagged?: boolean;
  blocked?: boolean;
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
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFloatShare, setShowFloatShare] = useState(false);
  const { mode, resolved, cycleMode } = useTheme();
  const [testMode, setTestMode] = useState(false);
  const [typing, setTyping] = useState(false);
  const SEED_KEY = 'bbc_autoposts_seeded_v1';
  const GEN_STOP_THRESHOLD = 120; // stop auto-gen when organic large
  useEffect(()=>{ try { if (localStorage.getItem('bbc_test_bypass_token')) setTestMode(true); } catch {} },[]);

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

  // Seeding auto posts (once)
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEED_KEY)) {
  const seeds = generateSeedPosts();
  const approvedSeeds: ApprovedItem[] = seeds.filter(s=> !s.blocked).map(s => ({ id: s.id, text: s.text, author: s.author || 'Anonymous', lang: s.lang==='bn'?'bn': s.lang==='en'?'en':'bn', createdAt: s.createdAt, reactions:{}, seed:true, autoTopic: s.topic, flagged: s.flagged, blocked: s.blocked }));
        setItems(prev => {
          const merged = [...prev, ...approvedSeeds];
          return merged.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
        localStorage.setItem(SEED_KEY,'1');
      }
    } catch {/* ignore */}
  }, []);

  // Periodic auto generation (simulate someone posting)
  useEffect(() => {
    if (items.length > GEN_STOP_THRESHOLD) return; // too many items -> stop
    let stop = false;
    let timeout: any;
    const loop = () => {
      if (stop) return;
      const delay = 10000 + Math.random()*20000; // 10-30s
      timeout = setTimeout(() => {
        if (stop) return;
        setTyping(true);
        setTimeout(() => {
          if (stop) return;
          const p = generateAutoPost();
          if (!p.blocked) {
            const ap: ApprovedItem = { id: p.id, text: p.text, author: p.author || 'Anonymous', lang: p.lang==='bn'?'bn': p.lang==='en'?'en':'bn', createdAt: new Date().toISOString(), reactions:{}, seed:false, autoTopic: p.topic, flagged: p.flagged, blocked: p.blocked };
            setItems(prev => [ap, ...prev]);
          }
          setTyping(false);
          loop();
        }, 1500 + Math.random()*1200); // typing duration
      }, delay);
    };
    loop();
    return () => { stop = true; clearTimeout(timeout); };
  }, [items.length]);

  // Periodic sync of authoritative reaction counts (every 45s)
  useEffect(() => {
    let stop = false;
    const sync = async () => {
      try {
        const r = await fetch('/api/community/feed');
        if (!r.ok) return;
        const j: ApprovedItem[] = await r.json().catch(()=>[]);
        if (stop || !Array.isArray(j)) return;
        setItems(prev => {
          const map: Record<string, ApprovedItem> = {};
          // merge while preserving local likeEvents etc
          [...prev, ...j].forEach(p => { map[p.id] = { ...(map[p.id]||{} as any), ...p, likeEvents: (map[p.id]?.likeEvents)||p.likeEvents }; });
          return Object.values(map).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      } catch {/* ignore */}
      finally { if (!stop) setTimeout(sync, 45000); }
    };
    sync();
    return ()=> { stop = true; };
  }, []);

  // Listen for new approved events
  const handleNewApproved = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail as ApprovedItem | undefined;
    if (!detail) return;
    setItems(prev => [detail, ...prev]);
    setTimeout(() => {
      const el = document.getElementById(`item-${detail.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('animate-pulse');
        setTimeout(()=> el.classList.remove('animate-pulse'), 1500);
      }
    }, 60);
  }, []);

  useEffect(() => {
    window.addEventListener('bbc:new-approved', handleNewApproved);
    return () => window.removeEventListener('bbc:new-approved', handleNewApproved);
  }, [handleNewApproved]);

  // Floating share button visibility
  useEffect(() => {
    const onScroll = () => {
      setShowFloatShare(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slash hotkey focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && (document.activeElement instanceof HTMLElement) && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        (document.getElementById('kahiniSearch') as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // (Legacy dark mode side-effect removed; handled by ThemeProvider)

  // Migration: fold legacy likes into heart reaction once
  useEffect(() => {
    setItems(prev => prev.map(it => {
      if (it.likes && it.likes > 0) {
        const reactions = { ...(it.reactions || {}) };
        reactions['❤️'] = (reactions['❤️'] || 0) + (it.likes || 0);
        return { ...it, reactions, likes: 0 };
      }
      return it;
    }));
  }, []);

  const reactionSet = ['😂','❤️','😮','🔥'] as const;
  const { toast } = useToast();
  const [userReactions, setUserReactions] = useState<Record<string,string>>({});
  // Hydrate user reaction choices per story
  useEffect(() => {
    setUserReactions(prev => {
      const next = { ...prev };
      items.forEach(it => {
        const k = `bbc_reaction_choice_${it.id}`;
        try { const v = localStorage.getItem(k); if (v) next[it.id] = v; } catch {}
      });
      return next;
    });
  }, [items]);

  const chooseReaction = (id: string, emoji: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const reactions = { ...(it.reactions || {}) };
      const prevEmoji = userReactions[id];
      if (!prevEmoji) {
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        try { localStorage.setItem(`bbc_reaction_choice_${id}`, emoji); } catch {}
        setUserReactions(r => ({ ...r, [id]: emoji }));
        return { ...it, reactions };
      }
      if (prevEmoji === emoji) { // deselect
        reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
        const { [id]:_, ...rest } = userReactions;
        try { localStorage.removeItem(`bbc_reaction_choice_${id}`); } catch {}
        setUserReactions(rest);
        return { ...it, reactions };
      }
      // switch
      reactions[prevEmoji] = Math.max(0, (reactions[prevEmoji] || 1) - 1);
      reactions[emoji] = (reactions[emoji] || 0) + 1;
      try { localStorage.setItem(`bbc_reaction_choice_${id}`, emoji); } catch {}
      setUserReactions(r => ({ ...r, [id]: emoji }));
      return { ...it, reactions };
    }));
  };

  // Share + deep link highlight
  const { toast: t2 } = useToast();
  const shareStory = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#story-${id}`;
    if (navigator.share) {
      navigator.share({ title: 'Bong Kahini', text: 'Check this story', url }).catch(()=>{});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(()=> t2({ title:'Link copied', description:'Story link copied.' })).catch(()=>{});
    }
  };

  const [highlightId, setHighlightId] = useState('');
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace('#','');
      if (h.startsWith('story-')) setHighlightId(h.replace('story-','')); else setHighlightId('');
    };
    window.addEventListener('hashchange', apply);
    apply();
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // Weekly list removed per latest instruction

  // Audience pick logic: choose item with highest engagement score (reactions sum)
  // IMPORTANT: Exclude items with zero engagement so a freshly submitted post (0 likes, 0 reactions)
  // does not immediately appear as the audience pick. This keeps new stories in the recent list
  // until they earn at least 1 like or reaction.
  const audiencePick = useMemo(() => {
    if (!items.length) return null;
    const engaged = items.filter(it => {
  const score = Object.values(it.reactions || {}).reduce((a,b)=>a+b,0);
      return score > 0; // require at least some engagement
    });
    if (!engaged.length) return null;
    let best: ApprovedItem | null = null;
    let bestScore = -1;
    for (const it of engaged) {
  const score = Object.values(it.reactions || {}).reduce((a,b)=>a+b,0);
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return best;
  }, [items]);
  const audiencePickId = audiencePick?.id || '';

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

  // Submission handler (uses moderation pipeline server-side)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !text.trim()) return;
    setSubmitting(true);
    try {
      const body = { name: name.trim() || null, isAnonymous: !name.trim(), lang, text: text.trim() };
    await fetch('/api/submit-story', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId(), 'X-Client-Ts': Date.now().toString(), ...getTestBypassHeader() }, body: JSON.stringify(body) }).catch(()=>{});
      setName(''); setLang('bn'); setText('');
    } finally { setSubmitting(false); }
  };

  return (
  <main className="min-h-screen bg-brand-yellow dark:bg-gradient-to-b dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-20 text-gray-900 dark:text-gray-100 transition-colors" role="main" aria-labelledby="feedHeading">
      <SEOHead title="Community Feed" description="Latest approved community stories." />
      {/* Floating Share button removed per latest instruction */}
  <div className="container mx-auto px-4 pt-10 max-w-4xl">
        <div className="mb-3 flex flex-wrap items-start gap-4 justify-between">
          <h1 id="feedHeading" className="text-3xl font-extrabold text-brand-blue tracking-tight">Bong Kahini <span className="bangla-text">— ঘরের গল্প</span></h1>
          <div className="flex flex-col order-3 w-full sm:w-auto sm:order-none">
            <label htmlFor="kahiniSearch" className="sr-only">Search stories</label>
            <input
              id="kahiniSearch"
              value={query}
              onChange={e=>{setQuery(e.target.value); setVisibleCount(10);}}
              placeholder="Search story / author / id" 
              className="w-64 rounded-lg border border-gray-300 bg-white/70 backdrop-blur px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {query && (
              <div className="mt-1 text-[10px] text-gray-500 text-right">{filteredItems.length} match{filteredItems.length!==1?'es':''}</div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3 order-2 sm:order-none">
            <ThemeToggleButton mode={mode} resolved={resolved} onCycle={cycleMode} />
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">Your secret golpo corner. Audience powered highlight.</p>
        {/* Audience Pick Only (form relocated to bottom) */}
  <div className="mb-6 relative">
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl p-0.5 group">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(255,0,128,0.5),rgba(0,128,255,0.5),rgba(255,200,0,0.5),rgba(255,0,128,0.5))] animate-spin-slow opacity-60 dark:opacity-40" />
              <div className="absolute inset-0 blur-2xl bg-[radial-gradient(circle_at_20%_30%,rgba(255,0,128,0.4),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(0,128,255,0.4),transparent_60%)] dark:opacity-40" />
              <div className="relative rounded-3xl bg-white/85 dark:bg-white/5 backdrop-blur-xl shadow-xl border border-white/40 dark:border-white/10 p-6 flex flex-col gap-4 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold tracking-wide">AUDIENCE PICK</span>
                    <button onClick={()=>setShowAnalytics(true)} className="text-[10px] underline text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">analytics</button>
                  </div>
                  {audiencePick && (
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-300">
                      <span className="flex items-center gap-1">Total {(Object.values(audiencePick.reactions||{}).reduce((a,b)=>a+b,0))}</span>
                    </div>
                  )}
                </div>
                <div className="text-base leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap min-h-[80px]">
                  {audiencePick?.text || 'No audience pick yet.'}
                </div>
                {audiencePick && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {reactionSet.map(em => {
                      const active = userReactions[audiencePick.id] === em;
                      return (
                        <button key={em} onClick={()=>chooseReaction(audiencePick.id, em)} className={`text-xs px-3 py-1 rounded-full shadow border backdrop-blur transition flex items-center gap-1 ${active ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border-white/40 dark:border-white/15 text-gray-800 dark:text-gray-200'}`}>
                          <span>{em}</span>
                          <span className="text-[10px] opacity-80">{(audiencePick.reactions||{})[em]||0}</span>
                        </button>
                      );
                    })}
                    <button onClick={()=>shareStory(audiencePick.id)} className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white shadow transition hover:from-pink-600 hover:to-indigo-600">Share</button>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="absolute w-32 h-32 -top-10 -left-10 bg-pink-400/40 dark:bg-pink-400/20 rounded-full mix-blend-overlay animate-pulse" />
                  <div className="absolute w-40 h-40 -bottom-16 right-0 bg-indigo-400/40 dark:bg-indigo-400/20 rounded-full mix-blend-overlay animate-pulse [animation-delay:1.2s]" />
                  <div className="absolute w-3 h-3 top-6 left-8 bg-white rounded-full animate-ping" />
                  <div className="absolute w-2 h-2 bottom-10 right-14 bg-white/90 rounded-full animate-ping [animation-delay:600ms]" />
                </div>
               </div>
             </div>
          </div>
        </div>
        <div className="mb-10 -mt-4 flex justify-end">
          <Button asChild variant="outline" className="h-8 px-4 text-[11px] bg-white/80 dark:bg-white/10 dark:text-white hover:bg-white dark:hover:bg-white/20 shadow border-indigo-200 dark:border-white/15">
            <a href="#share">Share Your Ghotona ↓</a>
          </Button>
        </div>
        {/* Analytics Modal */}
        {/* Analytics Modal */}
        <AnimatePresence>
          {showAnalytics && (
            <m.div
              className="fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-modal="true" role="dialog" aria-labelledby="analyticsHeading"
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setShowAnalytics(false)} />
              <m.div initial={{ scale: .9, opacity: 0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.9, opacity:0 }} className="relative w-full max-w-lg rounded-2xl bg-white/95 dark:bg-gray-900/90 backdrop-blur-xl shadow-xl border border-white/40 dark:border-white/10 p-6">
                <h2 id="analyticsHeading" className="text-lg font-semibold text-brand-blue mb-4">Audience Analytics</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-400/10 p-3 text-center">
                    <div className="text-[10px] uppercase text-gray-500">Stories</div>
                    <div className="text-lg font-bold text-brand-blue">{items.length}</div>
                  </div>
                  <div className="rounded-lg bg-pink-50 dark:bg-pink-400/10 p-3 text-center">
                    <div className="text-[10px] uppercase text-gray-500">Hearts</div>
                    <div className="text-lg font-bold text-pink-600">{items.reduce((a,b)=>a+((b.reactions||{})['❤️']||0),0)}</div>
                  </div>
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-400/10 p-3 text-center">
                    <div className="text-[10px] uppercase text-gray-500">Reactions</div>
                    <div className="text-lg font-bold text-indigo-600">{items.reduce((a,b)=>a+Object.values(b.reactions||{}).reduce((x,y)=>x+y,0),0)}</div>
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Reaction Breakdown</h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['😂','❤️','😮','🔥'].map(em => (
                      <span key={em} className="px-2 py-1 rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200 flex items-center gap-1 shadow-sm">
                        <span>{em}</span>
                        <span className="text-[10px] text-gray-500">{items.reduce((a,b)=>a+((b.reactions||{})[em]||0),0)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Top 3 (Engagement)</h3>
                  <ol className="space-y-2 text-xs list-decimal list-inside">
                    {([ ...items ]
                      .map(it => ({ it, score: Object.values(it.reactions||{}).reduce((x,y)=>x+y,0) }))
                      .sort((a,b)=> b.score - a.score)
                      .slice(0,3)).map(({it,score}) => (
                        <li key={it.id} className="truncate"><span className="font-semibold">{it.id}</span> — score {score} • {(it.text).slice(0,60)}{it.text.length>60?'…':''}</li>
                      ))}
                  </ol>
                </div>
                <div className="flex justify-end">
                  <button onClick={()=>setShowAnalytics(false)} className="px-4 py-2 rounded-md bg-brand-blue text-white text-sm hover:bg-brand-blue/90">Close</button>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
        {loading && <div className="text-sm text-gray-600 mb-4">Loading…</div>}
  {typing && <div className="mb-4 text-[12px] text-gray-700 dark:text-gray-300 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" /></span><span>Someone is writing…</span></div>}
        <div className="space-y-4" aria-live="polite">
          {/* Stories List (audience pick excluded) */}
          {visibleItems.filter(it=> it.id !== audiencePickId).map(it => {
            const isFeatured = it.id === audiencePickId; // dynamic audience pick highlight
            const Article = (
              <motion.article
                layout
                key={it.id}
                id={`story-${it.id}`}
                className={`relative rounded-lg border bg-white/80 dark:bg-white/5 dark:border-white/10 backdrop-blur p-4 shadow-sm ${isFeatured ? 'ring-2 ring-brand-blue/70' : ''} ${highlightId===it.id ? 'ring-2 ring-pink-500 animate-pulse' : ''} sm:p-4 p-3 transition-colors`}
                aria-labelledby={`item-${it.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`item-${it.id}`} className="font-semibold text-sm sm:text-sm text-gray-900 flex items-center gap-2">
                      {isFeatured && <span className="text-[10px] bg-indigo-200 dark:bg-indigo-400/30 text-indigo-800 dark:text-indigo-200 px-2 py-[2px] rounded-full animate-pulse">audience pick</span>}
                      <span>{it.id}</span>
                    </h2>
                    <div className="text-[11px] text-gray-600 mt-0.5 leading-snug">{(it.author || 'Anonymous')} • {new Date(it.createdAt).toLocaleString()} • {it.lang === 'bn' ? 'বাংলা' : 'English'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>shareStory(it.id)} aria-label="Share story" className="text-[11px] px-2 py-1 rounded-md bg-gradient-to-r from-pink-500 to-indigo-500 text-white hover:from-pink-600 hover:to-indigo-600 transition">Share</button>
                  </div>
                </div>
                <p className="mt-2 text-[13px] sm:text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{it.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reactionSet.map(em => {
                    const active = userReactions[it.id] === em;
                    return (
                      <button key={em} onClick={()=>chooseReaction(it.id, em)} className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 border transition ${active ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-200'}`}>
                        <span>{em}</span>
                        <span className="text-[9px] opacity-70">{(it.reactions||{})[em]||0}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.article>
            );
            if (!isFeatured) return Article;
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
        {/* Bottom Submission Form Anchor */}
        <div id="share" className="mt-16 mb-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-blue dark:text-indigo-300">Post Your Ghotona</h2>
            <a href="#feedHeading" className="text-xs text-gray-600 hover:text-gray-900 underline">Back to top</a>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white/85 dark:bg-white/5 dark:border-white/10 backdrop-blur p-6 shadow transition-colors">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              <input id="kahiniName" value={name} onChange={e=>setName(e.target.value)} placeholder="Name (optional)" className="w-full md:max-w-xs rounded-md border border-gray-300 dark:border-white/15 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white" maxLength={60} />
              <div className="flex items-center gap-2 text-xs">
                <select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as 'bn' | 'en')} className="rounded-md border border-gray-300 dark:border-white/15 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white">
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                </select>
                <span className="text-[10px] text-gray-500">{1000 - text.length} left</span>
              </div>
            </div>
            <textarea id="kahiniText" value={text} onChange={e=>setText(e.target.value)} rows={5} maxLength={1000} placeholder="লিখো একটা ছোট গল্প..." className="w-full resize-none rounded-md border border-gray-300 dark:border-white/15 px-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white" />
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Be respectful. Mods approve before public.</p>
              <Button disabled={submitting || !text.trim()} className="bg-brand-blue text-white hover:bg-brand-blue/90 h-9 px-6 text-xs" aria-label="Submit kahini" type="submit">
                {submitting ? 'Submitting…' : 'Share'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      {/* Floating Test Mode Toggle (dev only) */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => {
            if (testMode) { try { localStorage.removeItem('bbc_test_bypass_token'); } catch {}; setTestMode(false); }
            else { const v = prompt('Enter test bypass token (from .env TEST_BYPASS_TOKEN):','dev-bypass-token'); if (v) { try { localStorage.setItem('bbc_test_bypass_token', v); } catch {}; setTestMode(true); } }
          }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold shadow border transition ${testMode ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500' : 'bg-white/90 dark:bg-white/10 backdrop-blur border-gray-300 dark:border-white/15 text-gray-800 dark:text-gray-200 hover:bg-white'}`}
          aria-pressed={testMode}
        >{testMode ? 'Test Mode ON' : 'Enable Test Mode'}</button>
        {testMode && <div className="text-[10px] bg-emerald-600/90 text-white px-2 py-1 rounded shadow">Bypass 6h limit active</div>}
      </div>
    </main>
  );
}

// Inline lightweight toggle component for tri-state theming
function ThemeToggleButton({ mode, resolved, onCycle }: { mode: 'light' | 'dark' | 'auto'; resolved: 'light' | 'dark'; onCycle: () => void }) {
  // Determine label & active icon visibility
  const nextLabel = mode === 'light' ? 'Dark' : mode === 'dark' ? 'Auto' : 'Light';
  return (
    <button
      onClick={onCycle}
      aria-label={`Switch theme (current: ${mode}, resolved: ${resolved})`}
      className="relative w-28 h-9 rounded-full border border-gray-300 dark:border-white/15 bg-white/80 dark:bg-gray-800/80 shadow-sm flex items-center justify-center overflow-hidden group transition-colors"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-60 transition" />
      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-700 dark:text-gray-200">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <span className={`absolute theme-icon-active ${resolved==='light' ? '' : 'theme-icon-leave'}`}>☀️</span>
          <span className={`absolute theme-icon-active ${resolved==='dark' ? '' : 'theme-icon-leave'}`}>🌙</span>
        </div>
        <span className="uppercase tracking-wide">{mode === 'auto' ? 'Auto' : resolved === 'dark' ? 'Dark' : 'Light'}</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">→ {nextLabel}</span>
      </div>
    </button>
  );
}
