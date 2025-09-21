import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Save, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { buildApiUrl } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface PromoItem { id: string; text: string; active?: boolean }
interface PromoSettings { enabled: boolean; speed: number; items: PromoItem[] }

export function PromotionsManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newText, setNewText] = useState('');
  const { sessionId } = useAuth();

  const { data: promo, isLoading, isFetching, error } = useQuery<PromoSettings>({
    queryKey: ['/api/homepage-promo'],
    queryFn: async () => {
      try {
        const r = await fetch(buildApiUrl('/api/homepage-promo'), { 
          headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {} 
        });
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem('promo_draft', JSON.stringify(data));
          return data;
        }
      } catch {}
      
      // Last resort: local draft
      const draft = localStorage.getItem('promo_draft');
      if (draft) return JSON.parse(draft);
      throw new Error('Failed to load');
    },
  });

  const addItem = useMutation({
    mutationFn: async (text: string) => {
      const r = await fetch(buildApiUrl('/api/homepage-promo'), {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}) 
        }, 
        body: JSON.stringify({ text })
      });
      if (!r.ok) throw new Error('Failed to add');
      const item = await r.json();
      // Update local draft immediately
      const draft = (promo ?? { enabled: true, speed: 60, items: [] }) as PromoSettings;
      localStorage.setItem('promo_draft', JSON.stringify({ ...draft, items: [item, ...(draft.items||[])] }));
      return item;
    },
    onSuccess: () => { setNewText(''); qc.invalidateQueries({ queryKey: ['/api/homepage-promo'] }); },
    onError: (e: any) => { toast({ title: 'Add failed', description: e?.message || 'API not reachable.', variant: 'destructive' }); }
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<PromoSettings>) => {
      const r = await fetch(buildApiUrl('/api/homepage-promo'), {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}) 
        }, 
        body: JSON.stringify(patch)
      });
      if (!r.ok) throw new Error('Failed to save settings');
      // Update local draft
      const draft = (promo ?? { enabled: true, speed: 60, items: [] }) as PromoSettings;
      localStorage.setItem('promo_draft', JSON.stringify({ ...draft, ...patch }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/homepage-promo'] }); toast({ title: 'Saved' }); },
    onError: (e: any) => { toast({ title: 'Save failed', description: e?.message || 'Function not reachable.', variant: 'destructive' }); }
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string, patch: Partial<PromoItem> }) => {
      const r = await fetch(buildApiUrl(`/api/homepage-promo/${id}`), {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}) 
        }, 
        body: JSON.stringify(patch)
      });
      if (!r.ok) throw new Error('Failed to update item');
      // Update local draft
      const draft = (promo ?? { enabled: true, speed: 60, items: [] }) as PromoSettings;
      const items = (draft.items||[]).map(i => i.id === id ? { ...i, ...patch } : i);
      localStorage.setItem('promo_draft', JSON.stringify({ ...draft, items }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/homepage-promo'] }),
    onError: (e: any) => { toast({ title: 'Update failed', description: e?.message || 'API not reachable.', variant: 'destructive' }); }
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(buildApiUrl(`/api/homepage-promo/${id}`), { 
        method: 'DELETE', 
        headers: { ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}) } 
      });
      if (!r.ok) throw new Error('Failed to delete item');
      // Update local draft
      const draft = (promo ?? { enabled: true, speed: 60, items: [] }) as PromoSettings;
      const items = (draft.items||[]).filter(i => i.id !== id);
      localStorage.setItem('promo_draft', JSON.stringify({ ...draft, items }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/homepage-promo'] }),
    onError: (e: any) => { toast({ title: 'Delete failed', description: e?.message || 'API not reachable.', variant: 'destructive' }); }
  });

  const handleToggle = (enabled: boolean) => updateSettings.mutate({ enabled });
  const handleSpeed = (speed: number) => updateSettings.mutate({ speed });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Promo settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          {error && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4"/> Unable to reach promo API. You can still edit; it will preview locally.
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={Boolean(promo?.enabled)} onCheckedChange={handleToggle} />
            <Label>Enabled</Label>
          </div>
          <div>
            <Label>Scroll speed (seconds per loop)</Label>
            <Input type="number" min={10} max={240} value={promo?.speed ?? 60} onChange={e => handleSpeed(Math.max(10, Math.min(240, parseInt(e.target.value || '60'))))} className="w-32" />
          </div>
          <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['/api/homepage-promo'] })} disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2"/> Refresh
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add promotional headline</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input placeholder="Type promo text (e.g., New video live now!)" value={newText} onChange={e => setNewText(e.target.value)} />
          <Button onClick={() => newText.trim() && addItem.mutate(newText.trim())} disabled={addItem.isPending}>
            <Plus className="w-4 h-4 mr-2"/> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {!promo || (promo.items ?? []).length === 0 ? (
            <div className="text-gray-600">No items yet. Add your first headline above.</div>
          ) : (
            <div className="space-y-3">
              {promo.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 border rounded p-3 bg-white">
                  <Input value={item.text} onChange={e => updateItem.mutate({ id: item.id, patch: { text: e.target.value } })} className="flex-1" />
                  <div className="flex items-center gap-3">
                    <Label>Active</Label>
                    <Switch checked={!!item.active} onCheckedChange={v => updateItem.mutate({ id: item.id, patch: { active: v } })} />
                    <Button variant="destructive" onClick={() => removeItem.mutate(item.id)}>
                      <Trash2 className="w-4 h-4"/>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden bg-yellow-100 border rounded">
            <div className="whitespace-nowrap animate-[marquee_linear_infinite] py-2 px-3 font-semibold text-brand-blue" style={{
              ['--duration' as any]: `${promo?.speed ?? 60}s`
            }}>
              {(promo?.items ?? []).filter(i => i.active).map(i => i.text).join(' • ')}
            </div>
          </div>
          <style>{`
            @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            .animate-[marquee_linear_infinite] { animation: marquee var(--duration,60s) linear infinite; }
          `}</style>
        </CardContent>
      </Card>
    </div>
  );
}
