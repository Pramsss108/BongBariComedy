import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles, RefreshCw, Globe2, CheckCircle2, Pencil, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type MemeStatus = 'idea' | 'approved' | 'published' | 'rejected';
type MemeIdea = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  idea: string;
  topics?: string[];
  language?: string;
  status: MemeStatus;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
};

export function MemeManager({ sessionId }: { sessionId: string | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dateKey, setDateKey] = useState<string>('');
  const [language, setLanguage] = useState<string>('auto');
  const [count, setCount] = useState<number>(5);
  const [status, setStatus] = useState<'all' | MemeStatus>('all');

  const { data: todayMemes, isLoading, error, refetch, isFetching } = useQuery<MemeIdea[]>({
    queryKey: ['/api/memes', dateKey || 'today', status],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (dateKey) search.set('dateKey', dateKey);
      if (status && status !== 'all') search.set('status', status);
      return apiRequest(`/api/memes?${search.toString()}`);
    },
    enabled: !!sessionId,
  });

  const generate = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/memes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
        body: JSON.stringify({ count, language })
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/memes'] });
      toast({ title: 'Ideas generated', description: 'New meme ideas added for today.' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to generate', description: e?.message || 'Please check you are logged in and try again.', variant: 'destructive' });
    }
  });

  const save = useMutation({
    mutationFn: async (meme: Partial<MemeIdea> & { id: string }) => {
      return apiRequest(`/api/memes/${meme.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
        body: JSON.stringify({ idea: meme.idea, status: meme.status, language: meme.language })
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/memes'] })
  });

  const publish = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/memes/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionId}` }
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/memes'] }),
    onError: (e: any) => toast({ title: 'Publish failed', description: e?.message || 'Try again.', variant: 'destructive' })
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Generate today’s ideas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3 items-start md:items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-600">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="bn">Bengali</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Count</label>
            <Input type="number" min={1} max={12} value={count} onChange={e => setCount(parseInt(e.target.value || '0') || 1)} className="w-24" />
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="bg-brand-blue text-white">
            {generate.isPending ? 'Generating…' : (<span className="flex items-center gap-2"><RefreshCw className="w-4 h-4"/>Generate</span>)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Today’s list</CardTitle>
            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Date</label>
                <Input type="date" value={dateKey} onChange={e => setDateKey(e.target.value)} className="w-44" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">all</SelectItem>
                    <SelectItem value="idea">idea</SelectItem>
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="published">published</SelectItem>
                    <SelectItem value="rejected">rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-gray-500">Loading…</div>
          ) : error ? (
            <div className="text-red-600">
              Failed to load memes. {(error as any)?.message || ''}
            </div>
          ) : todayMemes && todayMemes.length ? (
            <div className="space-y-4">
              {todayMemes.map(m => (
                <MemeRow key={m.id} meme={m} onSave={save.mutate} onPublish={publish.mutate} saving={save.isPending} publishing={publish.isPending} />
              ))}
            </div>
          ) : (
            <div className="text-gray-600">No ideas yet. Click Generate to create some.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MemeRow({ meme, onSave, onPublish, saving, publishing }: {
  meme: MemeIdea;
  onSave: (m: Partial<MemeIdea> & { id: string }) => void;
  onPublish: (id: string) => void;
  saving: boolean;
  publishing: boolean;
}) {
  const [draft, setDraft] = useState<MemeIdea>(meme);
  const dirty = draft.idea !== meme.idea || draft.status !== meme.status || draft.language !== meme.language;
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3">
        <Badge className={
          meme.status === 'published' ? 'bg-green-600' : meme.status === 'approved' ? 'bg-amber-600' : meme.status === 'rejected' ? 'bg-red-600' : 'bg-gray-600'
        }>{meme.status}</Badge>
        <div className="flex-1 space-y-2">
          <Textarea value={draft.idea} onChange={e => setDraft({ ...draft, idea: e.target.value })} rows={3} />
          <div className="flex items-center gap-3">
            <Select value={draft.status} onValueChange={v => setDraft({ ...draft, status: v as MemeStatus })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">idea</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={draft.language || 'auto'} onValueChange={v => setDraft({ ...draft, language: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">auto</SelectItem>
                <SelectItem value="bn">bn</SelectItem>
                <SelectItem value="en">en</SelectItem>
                <SelectItem value="hi">hi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" disabled={!dirty || saving} onClick={() => onSave({ id: draft.id, idea: draft.idea, status: draft.status, language: draft.language })}>
            <Save className="w-4 h-4 mr-1"/> Save
          </Button>
          <Button className="bg-green-600 text-white" disabled={publishing || draft.status === 'published'} onClick={() => onPublish(draft.id)}>
            <CheckCircle2 className="w-4 h-4 mr-1"/> Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MemeManager;
