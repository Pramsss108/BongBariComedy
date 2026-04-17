import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '@/lib/queryClient';
import { useNglLang } from './NglLang';

// Razorpay checkout types (loaded from CDN)
declare global {
  interface Window {
    Razorpay?: any;
  }
}

type Plan = 'monthly' | 'yearly';

interface Props {
  open: boolean;
  onClose: () => void;
  username: string;
  secretKey: string;
  onSuccess: (premiumUntil: string) => void;
}

// Load Razorpay checkout.js once (cached)
let rzScriptPromise: Promise<boolean> | null = null;
function loadRazorpay(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (rzScriptPromise) return rzScriptPromise;
  rzScriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { rzScriptPromise = null; resolve(false); };
    document.head.appendChild(s);
  });
  return rzScriptPromise;
}

export default function NglUpgradeModal({ open, onClose, username, secretKey, onSuccess }: Props) {
  const { t, lang } = useNglLang();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errKind, setErrKind] = useState<'error' | 'info'>('error');

  if (!open) return null;

  const handleUpgrade = async () => {
    setErr(null);
    setErrKind('error');
    setLoading(true);
    try {
      // 1. Ensure Razorpay checkout loaded
      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) {
        setErr(lang === 'bn' ? 'পেমেন্ট লোড হয়নি। ইন্টারনেট চেক করো।' : 'Payment could not load. Check your internet.');
        setLoading(false);
        return;
      }

      // 2. Create order on our server
      const orderRes = await fetch(buildApiUrl('/api/ngl/payment/create-order'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
        body: JSON.stringify({ username, plan }),
      });
      if (!orderRes.ok) {
        const body = await orderRes.json().catch(() => ({}));
        if (body?.code === 'PAYMENT_DISABLED' || orderRes.status === 404) {
          setErrKind('info');
          setErr(lang === 'bn' ? 'পেমেন্ট শীঘ্রই চালু হবে — একডিনের মধ্যেই।' : 'Payment goes live in a day — hang tight.');
        } else {
          setErr(body?.message || (lang === 'bn' ? 'অর্ডার তৈরি হয়নি।' : 'Order creation failed.'));
        }
        setLoading(false);
        return;
      }
      const order = await orderRes.json();

      // 3. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Bong Bari NGL',
        description: order.planLabel,
        order_id: order.orderId,
        theme: { color: '#a855f7' },
        prefill: { name: `@${username}` },
        handler: async (response: any) => {
          // 4. Verify on server
          try {
            const vRes = await fetch(buildApiUrl('/api/ngl/payment/verify'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-NGL-Key': secretKey },
              body: JSON.stringify({
                username,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });
            if (!vRes.ok) {
              const body = await vRes.json().catch(() => ({}));
              setErr(body?.message || (lang === 'bn' ? 'ভেরিফিকেশন ফেইল হয়েছে।' : 'Verification failed. Contact support.'));
              setLoading(false);
              return;
            }
            const v = await vRes.json();
            onSuccess(v.premiumUntil);
          } catch (e) {
            setErr(lang === 'bn' ? 'নেটওয়ার্ক সমস্যা।' : 'Network error during verification.');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.on('payment.failed', (resp: any) => {
        console.warn('[NGL/pay] payment failed', resp?.error);
        setErr(lang === 'bn' ? 'পেমেন্ট ব্যর্থ হয়েছে।' : 'Payment failed. Try again.');
        setLoading(false);
      });
      rzp.open();
    } catch (e: any) {
      console.error('[NGL/pay] upgrade error', e);
      setErr(lang === 'bn' ? 'কিছু ভুল হয়েছে।' : 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[420px] bg-gradient-to-b from-[#1a1332] via-[#120a28] to-[#0a0618] border border-fuchsia-400/25 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-[0_-20px_60px_-10px_rgba(168,85,247,0.4)] max-h-[95vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-white bg-gradient-to-r from-fuchsia-500 to-violet-500 px-2 py-[2px] rounded-full tracking-wider">✨ BONG PRO</span>
              </div>
              <h2 className="text-white font-black text-[22px] leading-tight">{t('pro.modalTitle')}</h2>
              <p className="text-white/50 text-[12px] mt-1">{t('pro.modalSubtitle')}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-white/40 hover:text-white/80 w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-all flex items-center justify-center text-[14px] shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-5 bg-white/[0.03] rounded-2xl p-3.5 border border-white/[0.05]">
            {[
              { icon: '🔍', k: 'pro.f1' },
              { icon: '✓', k: 'pro.f2' },
              { icon: '🛡️', k: 'pro.f3' },
              { icon: '📌', k: 'pro.f4' },
              { icon: '🎨', k: 'pro.f5' },
              { icon: '💎', k: 'pro.f6' },
            ].map(f => (
              <li key={f.k} className="flex items-start gap-2.5 text-white/85 text-[12.5px] leading-snug">
                <span className="shrink-0 text-[14px] mt-[1px]">{f.icon}</span>
                <span>{t(f.k)}</span>
              </li>
            ))}
          </ul>

          {/* Plan toggle */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setPlan('monthly')}
              className={`relative rounded-2xl p-3 text-left transition-all border-2 ${plan === 'monthly' ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">{t('pro.monthly')}</p>
              <p className="text-white font-black text-[20px] leading-none">₹98<span className="text-white/40 text-[11px] font-semibold">/mo</span></p>
            </button>
            <button
              onClick={() => setPlan('yearly')}
              className={`relative rounded-2xl p-3 text-left transition-all border-2 ${plan === 'yearly' ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
            >
              <span className="absolute -top-2 right-2 text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-rose-500 px-1.5 py-[1px] rounded-full">{t('pro.save2mo')}</span>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">{t('pro.yearly')}</p>
              <p className="text-white font-black text-[20px] leading-none">₹683<span className="text-white/40 text-[11px] font-semibold">/yr</span></p>
            </button>
          </div>

          {/* Inline status — info (coming soon) or error */}
          {err && (
            <div className={`mb-3 rounded-xl px-3 py-2 text-[12px] font-semibold ${errKind === 'info' ? 'bg-white/[0.04] border border-white/10 text-white/60' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
              {err}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-black text-[15px] py-3.5 rounded-2xl shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading
              ? (lang === 'bn' ? 'অপেক্ষা করো…' : 'Please wait…')
              : `${t('pro.upgradeBtn')} — ₹${plan === 'yearly' ? '683' : '98'}`}
          </button>

          <p className="text-center text-white/30 text-[10px] mt-3 leading-relaxed">
            {t('pro.securedBy')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
