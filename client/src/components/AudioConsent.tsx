import { useEffect, useState } from 'react';
import { ensureAudioUnlocked, isAudioUnlocked, onAudioUnlocked, resumeAudioNow } from '@/lib/audioUnlock';

export default function AudioConsent() {
  const [show, setShow] = useState<boolean>(() => !isAudioUnlocked());

  useEffect(() => {
    ensureAudioUnlocked();
    const off = onAudioUnlocked(() => setShow(false));
    return () => { off && off(); };
  }, []);

  if (!show) return null;

  const enable = async () => {
    await resumeAudioNow();
    if (isAudioUnlocked()) setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-black/80 text-white px-4 py-2 shadow-lg backdrop-blur-md">
        <span className="text-sm">Enable sound for hover and cursor effects</span>
        <button
          onClick={enable}
          className="rounded-md bg-white/90 text-black text-sm font-medium px-3 py-1 hover:bg-white transition"
        >
          Enable sound
        </button>
      </div>
    </div>
  );
}
