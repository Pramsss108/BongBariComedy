import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

// Pull-to-refresh that hooks window scroll on touch devices.
// Shows a pull indicator above the inbox list; triggers onRefresh at 70px.
export function PullToRefresh({ onRefresh, lang }: { onRefresh: () => Promise<void> | void; lang: string }) {
  const [pull, setPull] = useState(0);          // px pulled (0..MAX)
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  const THRESHOLD = 70;
  const MAX = 110;

  useEffect(() => {
    const isAtTop = () => (window.scrollY || document.documentElement.scrollTop) <= 1;

    const onStart = (e: TouchEvent) => {
      if (!isAtTop() || refreshing) { armed.current = false; return; }
      startY.current = e.touches[0]?.clientY ?? null;
      armed.current = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!armed.current || refreshing || startY.current === null) return;
      if (!isAtTop()) { armed.current = false; setPull(0); return; }
      const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // Resist the pull so it feels springy
      const eased = Math.min(MAX, Math.pow(dy, 0.85));
      setPull(eased);
    };
    const onEnd = async () => {
      if (!armed.current) return;
      armed.current = false;
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try { await onRefresh(); } finally {
          setTimeout(() => { setRefreshing(false); setPull(0); }, 450);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [pull, refreshing, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);
  const rotate = progress * 360;
  const label = refreshing
    ? (lang === 'bn' ? 'আনছি...' : 'Refreshing...')
    : progress >= 1
      ? (lang === 'bn' ? 'ছেড়ে দাও' : 'Release')
      : (lang === 'bn' ? 'নিচে টান' : 'Pull down');

  return (
    <div
      aria-hidden={pull === 0 && !refreshing}
      style={{ height: pull, transition: refreshing || pull === 0 ? 'height 0.25s cubic-bezier(.16,1,.3,1)' : 'none' }}
      className="overflow-hidden flex items-end justify-center w-full"
    >
      {(pull > 0 || refreshing) && (
        <div className="flex flex-col items-center gap-1 pb-1.5 opacity-90">
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate }}
            transition={refreshing ? { duration: 0.9, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            style={{ opacity: Math.max(0.35, progress) }}
            className={`w-6 h-6 rounded-full border-2 ${progress >= 1 || refreshing ? 'border-fuchsia-400/80 border-t-transparent' : 'border-white/25 border-t-transparent'}`}
          />
          <span className="text-[9.5px] font-extrabold tracking-wide text-white/40 uppercase">{label}</span>
        </div>
      )}
    </div>
  );
}
