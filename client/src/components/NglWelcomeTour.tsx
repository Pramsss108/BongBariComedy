import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNglLang } from './NglLang';

const TOUR_KEY = 'bng_ngl_tour_seen_v1';

type Step = {
  selector: string;       // data-tour="xxx"
  title: string;
  titleBn: string;
  desc: string;
  descBn: string;
  placement: 'top' | 'bottom';
};

const STEPS: Step[] = [
  {
    selector: '[data-tour="share-link"]',
    title: 'Your secret link',
    titleBn: 'তোর secret link',
    desc: 'Tap here to copy — paste anywhere to get anonymous DMs.',
    descBn: 'ট্যাপ করে কপি — যেকোনো জায়গায় paste করে anonymous DM পাও।',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="prompt"]',
    title: 'The question people see',
    titleBn: 'মানুষ যা দেখবে',
    desc: 'Edit or tap "AI Shuffle" for a fresh vibe.',
    descBn: 'Edit করো, অথবা "AI Shuffle" ট্যাপ — নতুন prompt।',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="inbox-tab"]',
    title: 'Your inbox',
    titleBn: 'তোর inbox',
    desc: 'All anonymous messages land here. You never see who sent them.',
    descBn: 'সব anonymous message এখানে আসবে। কে পাঠিয়েছে — কেউ জানবে না।',
    placement: 'bottom',
  },
];

export function NglWelcomeTour() {
  const { lang } = useNglLang();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(TOUR_KEY); } catch {}
    if (seen) return;
    const t = setTimeout(() => setShow(true), 900); // let page settle
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const el = document.querySelector(STEPS[step].selector) as HTMLElement | null;
    if (!el) { setStep(s => s + 1); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const raf = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      cancelAnimationFrame(raf);
    };
  }, [step, show]);

  const finish = () => {
    try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
    setShow(false);
  };

  if (!show || step >= STEPS.length) return null;
  const s = STEPS[step];
  const title = lang === 'bn' ? s.titleBn : s.title;
  const desc = lang === 'bn' ? s.descBn : s.desc;

  if (!rect) return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={() => setStep(st => st + 1)} />
  );

  const PAD = 10;
  const holeTop = rect.top - PAD;
  const holeLeft = rect.left - PAD;
  const holeW = rect.width + PAD * 2;
  const holeH = rect.height + PAD * 2;

  const cardTop = s.placement === 'bottom' ? holeTop + holeH + 14 : holeTop - 14 - 120;
  const cardBelow = s.placement === 'bottom';

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] pointer-events-auto"
        onClick={() => setStep(st => st + 1)}
        style={{
          background: `radial-gradient(circle at ${holeLeft + holeW / 2}px ${holeTop + holeH / 2}px, transparent ${Math.max(holeW, holeH) / 2 + 6}px, rgba(0,0,0,0.78) ${Math.max(holeW, holeH) / 2 + 40}px)`,
        }}
      >
        {/* Spotlight ring */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="absolute pointer-events-none rounded-2xl"
          style={{
            top: holeTop, left: holeLeft, width: holeW, height: holeH,
            boxShadow: '0 0 0 2px rgba(236,72,153,0.6), 0 0 30px 4px rgba(236,72,153,0.3), inset 0 0 0 1px rgba(255,255,255,0.12)',
          }}
        />

        {/* Tooltip card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: cardBelow ? -8 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="absolute pointer-events-auto max-w-[300px] w-[calc(100%-32px)] mx-4"
          style={{
            top: Math.max(12, Math.min(cardTop, window.innerHeight - 180)),
            left: '50%', transform: 'translateX(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(180deg, rgba(24,10,40,0.96) 0%, rgba(10,6,22,0.96) 100%)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9.5px] font-extrabold text-fuchsia-300/80 tracking-[0.12em] uppercase">
                {lang === 'bn' ? 'ধাপ' : 'Step'} {step + 1}/{STEPS.length}
              </span>
              <button onClick={finish} className="text-white/30 hover:text-white/70 text-[10px] font-bold transition-colors">
                {lang === 'bn' ? 'বাদ দাও' : 'Skip'}
              </button>
            </div>
            <p className="text-white text-[14px] font-extrabold tracking-tight leading-tight">{title}</p>
            <p className="text-white/50 text-[11.5px] leading-relaxed mt-1">{desc}</p>

            <div className="flex items-center justify-between mt-3.5">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span key={i} className={`h-[3px] rounded-full transition-all ${i === step ? 'w-5 bg-fuchsia-400' : i < step ? 'w-3 bg-white/30' : 'w-3 bg-white/10'}`} />
                ))}
              </div>
              <button
                onClick={() => { if (step >= STEPS.length - 1) finish(); else setStep(st => st + 1); }}
                className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-[11px] font-extrabold px-4 py-1.5 rounded-full hover:brightness-110 transition-all active:scale-95"
              >
                {step >= STEPS.length - 1
                  ? (lang === 'bn' ? 'শুরু করো' : "Let's go")
                  : (lang === 'bn' ? 'পরের' : 'Next')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
