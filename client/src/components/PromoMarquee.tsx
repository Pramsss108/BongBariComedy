import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '@/lib/queryClient';

interface PromoItem { id: string; text: string }
interface PromoSettings { enabled: boolean; speed: number; items: PromoItem[] }

export function PromoMarquee() {
  const { data } = useQuery<PromoSettings>({
    queryKey: ['/api/homepage-promo'],
    queryFn: async () => {
      try {
        const r = await fetch(buildApiUrl('/api/homepage-promo'));
        if (r.ok) return r.json();
      } catch {}
      return { enabled: false, speed: 60, items: [] };
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  if (!data?.enabled || !data.items?.length) return null;
  const text = data.items.map(i => i.text).join(' • ');

  return (
    <div className="overflow-hidden bg-yellow-100 border-y border-yellow-300">
      <div className="whitespace-nowrap animate-[marquee_linear_infinite] py-2 px-3 font-semibold text-brand-blue" style={{
        ['--duration' as any]: `${data.speed || 60}s`
      }}>
        {text}
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(100%);} 100% { transform: translateX(-100%);} }
        .animate-[marquee_linear_infinite]{animation:marquee var(--duration,60s) linear infinite}
      `}</style>
    </div>
  );
}
