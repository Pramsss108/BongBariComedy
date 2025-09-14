import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/lib/deviceId';

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
  const remaining = 1000 - text.length;

  const clear = () => { if (!loading) { setName(''); setLang('bn'); setText(''); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/submit-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Device-Id': getDeviceId(), 'X-Client-Ts': Date.now().toString() },
        body: JSON.stringify({ name: name.trim() || null, isAnonymous: !name.trim(), lang, text: text.trim() })
      });
      const json = await res.json().catch(()=>({}));
      if (res.ok) {
        onSubmitted?.(json);
        if (autoReset) clear();
      } else {
        onSubmitted?.(json);
      }
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading ? 'true':'false'} className={`space-y-4 rounded-2xl border bg-white/85 dark:bg-white/5 dark:border-white/10 backdrop-blur p-6 shadow transition-colors ${compact ? 'p-4' : ''}`}> 
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
          <Button disabled={loading || !text.trim()} className="bg-brand-blue text-white hover:bg-brand-blue/90 h-9 px-6 text-xs" aria-label={loading ? 'Submitting story' : 'Submit story'} type="submit">{loading ? 'Submitting…' : 'Share'}</Button>
          <Button type="button" variant="outline" className="h-9 px-4 text-xs" onClick={clear} disabled={loading}>Clear</Button>
        </div>
      </div>
    </form>
  );
}
