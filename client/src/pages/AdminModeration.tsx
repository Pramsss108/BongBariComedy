import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import SEOHead from '@/components/seo-head';

interface PendingPost {
  postId: string;
  text: string;
  author: string | null;
  createdAt: string;
  flagged_terms: string[];
  seeded?: boolean;
}

const sampleData: PendingPost[] = [
  {
    postId: 'P1001',
    text: 'মা বললো ফ্রিজের মধ্যে ভাত আছে, গিয়ে দেখি শুধু বরফ 😅',
    author: 'Ria',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    flagged_terms: ['বরফ'],
  },
  {
    postId: 'P1002',
    text: 'আজকে বাসের ভিড়ে দাঁড়িয়ে দাঁড়িয়ে কবিতা মুখস্থ — productivity level 999',
    author: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
    flagged_terms: [],
    seeded: true,
  },
  {
    postId: 'P1003',
    text: 'Tea শেষ... বাবা বলল water দে গরম করে... hybrid innovation 😂',
    author: 'Anon',
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    flagged_terms: ['Tea'],
  },
  {
    postId: 'P1004',
    text: 'Exam চলছে আর হঠাৎ মাকে মেসেজ: “কলমটাই লিখছে না” — মা reply: “তাহলে পেন্সিল নাও” 🙃',
    author: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    flagged_terms: [],
  }
];

export default function AdminModeration() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<PendingPost[]>(sampleData);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<PendingPost | null>(null);
  const [editText, setEditText] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/list-pending');
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && Array.isArray(json) && json.length) {
            setPosts(json);
          }
        }
      } catch {/* fallback uses sampleData */}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const pendingCount = posts.length;
  const topFlagged = useMemo(() => {
    const freq: Record<string, number> = {};
    posts.forEach(p => p.flagged_terms.forEach(t => { freq[t] = (freq[t]||0)+1; }));
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);
  }, [posts]);

  const toggleSelect = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }));
  const allSelected = posts.length > 0 && posts.every(p => selected[p.postId]);
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const map: Record<string, boolean> = {}; posts.forEach(p => map[p.postId] = true); setSelected(map);
    }
  };

  const simulate = async (url: string, body: any) => {
    try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch {}
  };

  const publish = async (p: PendingPost, overrideText?: string) => {
    await simulate('/api/admin/publish', { postId: p.postId, text: overrideText || p.text });
    toast({ title: 'Shabash — published', description: `${p.postId} queued` });
    setPosts(ps => ps.filter(x => x.postId !== p.postId));
  };
  const feature = async (p: PendingPost) => {
    await simulate('/api/admin/feature', { postId: p.postId });
    toast({ title: 'Featured', description: `${p.postId} highlighted` });
  };
  const reject = async (p: PendingPost) => {
    const reason = prompt('Reject reason? (bn/en)');
    if (reason === null) return;
    await simulate('/api/admin/reject', { postId: p.postId, reason });
    toast({ title: 'Rejected', description: `${p.postId} (${reason.slice(0,50)})` });
    setPosts(ps => ps.filter(x => x.postId !== p.postId));
  };
  const del = async (p: PendingPost) => {
    if (!confirm('Delete this story?')) return;
    await simulate('/api/admin/delete', { postId: p.postId });
    toast({ title: 'Deleted', description: p.postId });
    setPosts(ps => ps.filter(x => x.postId !== p.postId));
  };

  const bulk = async (action: 'approve' | 'delete') => {
    const ids = posts.filter(p => selected[p.postId]).map(p => p.postId);
    if (!ids.length) return;
    if (action === 'approve') {
      await simulate('/api/admin/publish', { postIds: ids });
      toast({ title: 'Shabash — published', description: `${ids.length} items` });
      setPosts(ps => ps.filter(x => !ids.includes(x.postId)));
    } else {
      if (!confirm('Delete selected stories?')) return;
      await simulate('/api/admin/delete', { postIds: ids });
      toast({ title: 'Deleted', description: `${ids.length} items` });
      setPosts(ps => ps.filter(x => !ids.includes(x.postId)));
    }
    setSelected({});
  };

  const applySanitized = (p: PendingPost) => {
    const sanitized = p.text.replace(/\b(Tea)\b/gi, 'চা');
    setPosts(ps => ps.map(x => x.postId === p.postId ? { ...x, text: sanitized } : x));
    toast({ title: 'Sanitized', description: `${p.postId} updated` });
  };

  const exportCsv = () => {
    const header = 'postId,author,createdAt,flagged_terms,text\n';
    const rows = posts.map(p => [p.postId, p.author || 'Anonymous', p.createdAt, p.flagged_terms.join('|'), '"' + p.text.replace(/"/g,'""') + '"'].join(','));
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pending_posts.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'CSV downloaded' });
  };

  const openEdit = (p: PendingPost) => { setEditing(p); setEditText(p.text); };
  const saveEdit = async () => { if (!editing) return; await publish(editing, editText); setEditing(null); };

  return (
    <main className="min-h-screen bg-brand-yellow pb-24" role="main" aria-labelledby="modHeading">
      <SEOHead title="Admin Moderation" description="Moderation UI stub" />
      <div className="container mx-auto px-4 pt-8 max-w-7xl">
        <div className="mb-6 rounded-lg border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          Admin UI stub — not protected. Do not expose in production.
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h1 id="modHeading" className="text-2xl font-bold text-brand-blue">Admin Moderation</h1>
            <p className="text-sm text-gray-700">Quick review & actions — UI stub</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button aria-label="Select all" variant="outline" onClick={toggleSelectAll}>{allSelected ? 'Unselect All' : 'Select All'}</Button>
            <Button aria-label="Bulk approve" onClick={() => bulk('approve')} className="bg-brand-blue text-white hover:bg-brand-blue/90">Bulk Approve</Button>
            <Button aria-label="Bulk delete" onClick={() => bulk('delete')} variant="destructive">Bulk Delete</Button>
            <Button aria-label="Export CSV" variant="outline" onClick={exportCsv}>Export CSV</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-3 space-y-4" role="region" aria-label="Pending posts list">
            {loading && <div className="text-sm text-gray-600">Loading…</div>}
            {!loading && posts.length === 0 && <div className="text-sm text-gray-600">No pending posts</div>}
            <AnimatePresence>
              {posts.map(p => {
                const isSel = !!selected[p.postId];
                const isExp = !!expanded[p.postId];
                const preview = isExp ? p.text : (p.text.length > 120 ? p.text.slice(0,120)+'…' : p.text);
                return (
                  <motion.div
                    key={p.postId}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`rounded-lg border bg-white/80 backdrop-blur p-4 shadow-sm transition ${isSel ? 'ring-2 ring-brand-blue' : ''}`}
                    role="article"
                    aria-labelledby={`post-${p.postId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.postId}`}
                          checked={isSel}
                          onChange={() => toggleSelect(p.postId)}
                          className="mt-1 h-4 w-4 rounded border-gray-400 text-brand-blue focus:ring-brand-blue"
                        />
                        <div>
                          <h2 id={`post-${p.postId}`} className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                            <span>{p.postId}</span>
                            {p.seeded && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-[2px] rounded-full">seed</span>}
                          </h2>
                          <div className="text-xs text-gray-600 mt-0.5">{p.author ? p.author : 'Anonymous'} • {new Date(p.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button aria-label="Expand text" size="sm" variant="outline" onClick={() => setExpanded(e => ({...e,[p.postId]:!e[p.postId]}))}>{isExp ? 'Collapse' : 'Expand'}</Button>
                        <Button aria-label="Edit" size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                        <Button aria-label="Feature" size="sm" variant="outline" onClick={()=>feature(p)}>Feature</Button>
                        <Button aria-label="Approve" size="sm" className="bg-brand-blue text-white hover:bg-brand-blue/90" onClick={()=>publish(p)}>Approve</Button>
                        <Button aria-label="Reject" size="sm" variant="destructive" onClick={()=>reject(p)}>Reject</Button>
                        <Button aria-label="Delete" size="sm" variant="destructive" onClick={()=>del(p)}>Del</Button>
                      </div>
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">{preview}</div>
                    {p.flagged_terms.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1" aria-label="Flagged terms">
                        {p.flagged_terms.map(t => (
                          <span key={t} className="text-[10px] px-2 py-[2px] rounded-full bg-red-100 text-red-700 border border-red-300">{t}</span>
                        ))}
                        <Button aria-label="Apply sanitized suggestion" size="sm" variant="outline" className="text-[10px] h-6" onClick={()=>applySanitized(p)}>Sanitize</Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <aside className="md:col-span-1 space-y-4" aria-label="Moderation stats panel">
            <div className="rounded-lg border bg-white/80 backdrop-blur p-4">
              <h3 className="font-semibold text-sm mb-2">Stats</h3>
              <div className="text-xs text-gray-700">Pending: {pendingCount}</div>
              <div className="mt-2 text-xs text-gray-700">Top Flagged:</div>
              <ul className="mt-1 space-y-1">
                {topFlagged.length === 0 && <li className="text-[11px] text-gray-500">None</li>}
                {topFlagged.map(([term,count]) => (
                  <li key={term} className="text-[11px] flex justify-between"><span>{term}</span><span className="font-medium">{count}</span></li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="editHeading"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setEditing(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
            >
              <h2 id="editHeading" className="text-lg font-semibold mb-3">Edit & Publish</h2>
              <textarea
                aria-label="Edit text"
                value={editText}
                onChange={e=>setEditText(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button aria-label="Cancel edit" variant="outline" onClick={()=>setEditing(null)}>Cancel</Button>
                <Button aria-label="Save edit" className="bg-brand-blue text-white hover:bg-brand-blue/90" onClick={saveEdit}>Save & Publish</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
