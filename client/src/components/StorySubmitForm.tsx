import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/lib/deviceId';
import { useToast } from '@/hooks/use-toast';
import { getTestBypassHeader } from '@/lib/testBypass';

export interface StorySubmitFormProps {
  onSubmitted?: (result?: { postId?: string }) => void;
  autoReset?: boolean;
  compact?: boolean; // smaller padding variant
}

export function StorySubmitForm({ onSubmitted, autoReset = true, compact = false }: StorySubmitFormProps) {
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewInfo, setReviewInfo] = useState<{ reason?: string; flags?: string[] } | null>(null);
  const [blockedInfo, setBlockedInfo] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const { toast } = useToast();
  const remaining = 1000 - text.length;

  const clear = () => { if (!loading && !previewing) { setName(''); setLang('bn'); setText(''); } };

  useEffect(()=>{
    if(!retryAt) return; 
    const iv = setInterval(()=>{ 
      if(Date.now()>retryAt) setRetryAt(null); 
      else setRetryAt(r=>r ? r : r); 
    },1000); 
    return ()=> clearInterval(iv);
  },[retryAt]);

  const formatCountdown = () => {
    if(!retryAt) return '';
    const remainingMs = retryAt - Date.now();
    if (remainingMs <= 0) return '';
    const sec = Math.floor(remainingMs/1000);
    const h = Math.floor(sec/3600).toString().padStart(2,'0');
    const m = Math.floor((sec%3600)/60).toString().padStart(2,'0');
    return `${h}:${m}`;
  };

  const runPreview = async (): Promise<'ok'|'review'|'blocked'> => {
    setPreviewing(true);
    try {
      const r = await fetch('/api/moderate-preview', { method:'POST', headers:{ 'Content-Type':'application/json','X-Device-Id': getDeviceId(), ...getTestBypassHeader() }, body: JSON.stringify({ text }) });
      const j = await r.json().catch(()=>({}));
      if (j.status === 'ok') return 'ok';
      if (j.status === 'review_suggested') { setReviewInfo({ reason: j.reason, flags: j.flags }); setShowReviewModal(true); return 'review'; }
      if (j.status === 'severe_block') { setBlockedInfo(j.message || 'Sensitive content'); return 'blocked'; }
      return 'ok';
    } finally { setPreviewing(false); }
  };

  const submitToServer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/submit-story', {
        method:'POST',
        headers:{ 'Content-Type':'application/json','X-Device-Id': getDeviceId(),'X-Client-Ts': Date.now().toString() },
        body: JSON.stringify({ name: name.trim() || null, isAnonymous: !name.trim(), lang, text: text.trim() })
      });
      const json = await res.json().catch(()=>({}));
      if (res.status === 429 && json.code === 'rate_limited') {
        const retry = Date.now() + ((json.retryAfterSec||0)*1000 || 6*3600*1000);
        setRetryAt(retry);
        toast({ title:'একটু বিরতি', description: json.message, variant:'destructive' });
      } else if (json.status === 'blocked') {
        toast({ title:'থামুন', description:'Dada/Di, ei jinis publish kora jabe na.', variant:'destructive' });
      } else if (json.status === 'pending_review') {
        toast({ title:'Review e gelo', description:'Admin dekhe approve korbe.' });
        onSubmitted?.(json); if (autoReset) clear();
      } else if (json.status === 'published' || res.ok) {
        toast({ title:'লাইভ!', description:'Shabash! Golpo live holo.' });
        onSubmitted?.(json); if (autoReset) clear();
      } else {
        onSubmitted?.(json);
      }
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (retryAt && Date.now() < retryAt) return;
    const prev = await runPreview();
    if (prev === 'review' || prev === 'blocked') return; // wait for user decision
    await submitToServer();
  };

  return (
    <>
      <form onSubmit={handleSubmit} aria-busy={loading || previewing ? 'true':'false'} className={`space-y-4 rounded-2xl border bg-white/85 dark:bg-white/5 dark:border-white/10 backdrop-blur p-6 shadow transition-colors ${compact ? 'p-4' : ''}`}>
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <input
            id="ssf-name"
            value={name}
            onChange={e=>setName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full md:max-w-xs rounded-md border border-gray-300 dark:border-white/15 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white"
            maxLength={60}
            aria-label="Name (optional)"
          />
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="ssf-lang" className="sr-only">Language</label>
            <select
              id="ssf-lang"
              value={lang}
              onChange={e=>setLang(e.target.value as 'bn' | 'en')}
              className="rounded-md border border-gray-300 dark:border-white/15 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white"
              aria-label="Language"
            >
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
            <span className="text-[10px] text-gray-500" aria-live="polite" role="status">{remaining} left</span>
          </div>
        </div>
        <textarea
          id="ssf-text"
          value={text}
          onChange={e=>setText(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="লিখো একটা ছোট গল্প..."
          className="w-full resize-none rounded-md border border-gray-300 dark:border-white/15 px-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white/90 dark:bg-white/10 dark:text-white"
          aria-label="Story text"
        />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Be respectful. Mods approve before public.</p>
          <div className="flex gap-2">
            <Button disabled={!!(loading || previewing || !text.trim() || (retryAt && Date.now() < retryAt))} className="bg-brand-blue text-white hover:bg-brand-blue/90 h-9 px-6 text-xs disabled:opacity-60" aria-label={loading || previewing ? 'Checking story' : 'Submit story'} type="submit">{loading || previewing ? 'Checking…' : (retryAt && Date.now()<retryAt ? 'Wait '+formatCountdown() : 'Share')}</Button>
            <Button type="button" variant="outline" className="h-9 px-4 text-xs" onClick={clear} disabled={loading || previewing}>Clear</Button>
          </div>
        </div>
      </form>
      {showReviewModal && reviewInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={()=>{setShowReviewModal(false);}} />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-gray-200 dark:border-white/10">
              <h2 className="text-lg font-semibold mb-2">Golpo ektu sensitive</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{reviewInfo.reason || 'Some words flagged. Chaile edit korun, na hole review e pathate paren.'}</p>
              {reviewInfo.flags && reviewInfo.flags.length>0 && (
                <div className="mb-3 flex flex-wrap gap-1">{reviewInfo.flags.slice(0,8).map(f=> <span key={f} className="text-[10px] px-2 py-[2px] rounded-full bg-amber-100 text-amber-800 border border-amber-300">{f}</span>)}</div>
              )}
              <div className="flex justify-end gap-2 text-sm">
                <Button variant="outline" onClick={()=>setShowReviewModal(false)}>Edit kori</Button>
                <Button onClick={async ()=>{ setShowReviewModal(false); await submitToServer(); }}>Review e pathai</Button>
              </div>
            </div>
        </div>
      )}
      {blockedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="alertdialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setBlockedInfo(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border border-red-200 dark:border-red-400/30">
            <h2 className="text-lg font-semibold mb-2 text-red-600">Blocked</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{blockedInfo}</p>
            <div className="flex justify-end"><Button variant="destructive" onClick={()=>setBlockedInfo(null)}>Thik ache</Button></div>
          </div>
        </div>
      )}
    </>
  );
}
