import { useEffect, useRef, useState } from 'react';

type Decision = 'granted' | 'denied';

export default function GreetingConsent({
  open,
  onDecision,
}: {
  open: boolean;
  onDecision: (d: Decision) => void;
}) {
  const [visible, setVisible] = useState(open);
  const yesAudioRef = useRef<HTMLAudioElement | null>(null);
  const noAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => setVisible(open), [open]);

  // Preload Yes/No click sounds
  useEffect(() => {
    const y = new Audio('/sounds/yes.mp3');
    const n = new Audio('/sounds/no.mp3');
    y.preload = 'auto';
    n.preload = 'auto';
  y.addEventListener('error', () => console.warn('yes.mp3 not found at /sounds/yes.mp3'));
  n.addEventListener('error', () => console.warn('no.mp3 not found at /sounds/no.mp3'));
    // Adjust volumes if needed
    y.volume = 1.0;
    n.volume = 1.0;
    yesAudioRef.current = y;
    noAudioRef.current = n;
    return () => {
      yesAudioRef.current?.pause();
      noAudioRef.current?.pause();
      yesAudioRef.current = null;
      noAudioRef.current = null;
    };
  }, []);

  // Broadcast when modal is visible to temporarily reduce heavy background effects
  useEffect(() => {
    const root = document.documentElement;
    if (visible) {
      root.classList.add('bbc-modal-open');
      window.dispatchEvent(new CustomEvent('bbc:modal-open', { detail: true }));
    } else {
      root.classList.remove('bbc-modal-open');
      window.dispatchEvent(new CustomEvent('bbc:modal-open', { detail: false }));
    }
    return () => {
      root.classList.remove('bbc-modal-open');
      window.dispatchEvent(new CustomEvent('bbc:modal-open', { detail: false }));
    };
  }, [visible]);

  const handleYes = () => {
    try {
      const a = yesAudioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } finally {
      onDecision('granted');
      setVisible(false);
    }
  };

  const handleNo = () => {
    try {
      const a = noAudioRef.current;
      if (a) { a.currentTime = 0; a.play().catch(() => {}); }
    } finally {
      onDecision('denied');
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"></div>

      {/* Modal card with pop animation (no sound) */}
      <div className="relative mx-4 max-w-md w-full rounded-2xl border border-white/20 bg-gradient-to-b from-amber-100 to-amber-50 shadow-2xl p-6 animate-in fade-in-0 zoom-in-95 duration-300 ease-out">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.png" alt="Bong Bari" className="h-10 w-10 rounded-full shadow animate-pulse" />
          <div className="text-sm text-black/60">Bong Bari</div>
        </div>
        <div className="text-center">
          <div className="text-2xl md:text-3xl font-bold text-black mb-2">সব ভালো তো?</div>
          <div className="text-sm text-black/60 mb-6">All okay?</div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleYes}
              className="px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold shadow hover:opacity-90 transition"
            >
              হ্যাঁ (Yes)
            </button>
            <button
              onClick={handleNo}
              className="px-4 py-2 rounded-xl bg-white text-black border border-black/10 text-sm font-semibold shadow hover:bg-black/5 transition"
            >
              না (No)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
