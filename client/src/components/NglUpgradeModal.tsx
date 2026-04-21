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
  verifiedPhone?: string;
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

export default function NglUpgradeModal({ open, onClose, username, secretKey, verifiedPhone = '', onSuccess }: Props) {
  const { t, lang } = useNglLang();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [testModeRequested] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ngl_test_mode') === '1';
    } catch {
      return false;
    }
  });
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
      const testToken = (() => {
        try {
          return localStorage.getItem('ngl_test_token') || '';
        } catch {
          return '';
        }
      })();
      const requestedPlan = testModeRequested ? 'test1' : plan;
      const orderRes = await fetch(buildApiUrl('/api/ngl/payment/create-order'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NGL-Key': secretKey,
          ...(testToken ? { 'X-NGL-Test-Token': testToken } : {}),
        },
        body: JSON.stringify({
          username,
          plan: requestedPlan,
          ...(testModeRequested ? { mode: 'test', testToken } : {}),
        }),
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
      const normalizedPhone = verifiedPhone.replace(/\D/g, '').slice(-10);
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Bong Bari NGL',
        description: order.planLabel,
        order_id: order.orderId,
        theme: { color: '#a855f7' },
        prefill: {
          name: `@${username}`,
          ...(normalizedPhone ? { contact: normalizedPhone } : {}),
        },
        readonly: {
          ...(normalizedPhone ? { contact: true } : {}),
        },
        handler: async (response: any) => {
          // 4. Verify on server
          try {
            const vRes = await fetch(buildApiUrl('/api/ngl/payment/verify'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-NGL-Key': secretKey,
                ...(testToken ? { 'X-NGL-Test-Token': testToken } : {}),
              },
              body: JSON.stringify({
                username,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: order.plan || requestedPlan,
                mode: order.mode,
                ...(testModeRequested ? { testToken } : {}),
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

  const priceDisplay = testModeRequested ? '1' : (plan === 'yearly' ? '683' : '98');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* Shimmer keyframe — compositor-only (transform) */}
        <style>{`@keyframes pro-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[340px] sm:max-w-[400px] rounded-t-2xl sm:rounded-2xl overflow-hidden my-4 sm:my-8"
          style={{
            background: 'linear-gradient(180deg, #1a1040 0%, #0f0b24 40%, #080614 100%)',
            boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.06), 0 0 60px rgba(139,92,246,0.06)',
          }}
        >
          {/* Top gradient accent */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #f59e0b, #ec4899, #d946ef, #a855f7, #6366f1)' }} />

          {/* Mobile drag handle */}
          <div className="sm:hidden flex justify-center pt-1.5">
            <div className="w-8 h-[3px] rounded-full bg-white/10" />
          </div>

          {/* Close button — absolute top-right */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/[0.06] transition-colors z-10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5"><path d="M6 6l12 12"/><path d="M18 6l-12 12"/></svg>
          </button>

          <div className="px-4 pt-3 pb-3.5 sm:px-5 sm:pt-4 sm:pb-4">
            {/* ★ Compact star + header inline */}
            <div className="text-center mb-2.5 sm:mb-3">
              <div className="flex justify-center mb-1.5 relative">
                <div className="absolute w-16 h-16 rounded-full -top-2" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)' }} />
                <svg viewBox="0 0 24 24" className="w-8 h-8 sm:w-9 sm:h-9 relative">
                  <defs>
                    <linearGradient id="pro-star-grad" x1="2" y1="2" x2="22" y2="22">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="45%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d946ef" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#pro-star-grad)" />
                </svg>
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-[8px] sm:text-[9px] font-black text-white bg-gradient-to-r from-fuchsia-500 via-violet-500 to-purple-600 px-2 py-[2px] rounded-full tracking-[0.1em] uppercase" style={{ boxShadow: '0 2px 10px rgba(168,85,247,0.2)' }}>
                  BONG PRO
                </span>
                {testModeRequested && (
                  <span className="text-[8px] sm:text-[9px] font-black text-amber-200 bg-amber-500/15 border border-amber-400/25 px-1.5 py-[2px] rounded-full tracking-wider">TEST</span>
                )}
              </div>
              <h2 className="text-white font-black text-[17px] sm:text-[20px] leading-[1.15] tracking-tight" style={{ textWrap: 'balance' }}>{t('pro.modalTitle')}</h2>
              <p className="text-white/45 text-[11px] sm:text-[12px] mt-0.5 font-medium">{t('pro.modalSubtitle')}</p>
            </div>

            {/* Feature list — compact rows */}
            <div className="rounded-xl overflow-hidden mb-2.5 sm:mb-3" style={{ background: 'rgba(255,255,255,0.025)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              {[
                { k: 'pro.f1', color: 'bg-fuchsia-500/15', iconColor: 'text-fuchsia-300', icon: <><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></> },
                { k: 'pro.f2', color: 'bg-emerald-500/15', iconColor: 'text-emerald-300', icon: <path d="M20 6L9 17l-5-5"/> },
                { k: 'pro.f3', color: 'bg-cyan-500/15', iconColor: 'text-cyan-300', icon: <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"/> },
                { k: 'pro.f4', color: 'bg-amber-500/15', iconColor: 'text-amber-300', icon: <><path d="M12 2v6"/><path d="M8 6h8l-4 14-4-14z"/></> },
                { k: 'pro.f5', color: 'bg-rose-500/15', iconColor: 'text-rose-300', icon: <><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="6" cy="13" r="2.5"/><circle cx="18" cy="16" r="2.5"/><path d="M8.6 11.5l3-2.5"/><path d="M15.5 8.5l2 5"/></> },
                { k: 'pro.f6', color: 'bg-violet-500/15', iconColor: 'text-violet-300', icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/> },
              ].map((f, i, arr) => (
                <div key={f.k}>
                  <div className="flex items-center gap-2.5 px-3 h-[34px] sm:h-[38px]">
                    <div className={`w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-[6px] ${f.color} flex items-center justify-center flex-shrink-0`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] ${f.iconColor}`}>{f.icon}</svg>
                    </div>
                    <span className="text-[11px] sm:text-[12.5px] text-white/80 font-medium leading-snug">{t(f.k)}</span>
                  </div>
                  {i < arr.length - 1 && <div className="h-px bg-white/[0.04] ml-[38px] sm:ml-[42px]" />}
                </div>
              ))}
            </div>

            {/* Plan cards — compact */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mb-2.5 items-start">
              <button
                onClick={() => setPlan('monthly')}
                className={`rounded-xl px-3 py-2.5 text-left transition-colors border ${plan === 'monthly' ? 'border-violet-400/50 bg-violet-500/[0.08]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}
              >
                <p className="text-white/45 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] mb-1">{t('pro.monthly')}</p>
                <p className="text-white font-black text-[20px] sm:text-[22px] leading-none tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ₹98<span className="text-white/30 text-[10px] sm:text-[11px] font-semibold">/mo</span>
                </p>
              </button>

              <button
                onClick={() => setPlan('yearly')}
                className={`relative rounded-xl px-3 py-2.5 text-left transition-colors border ${plan === 'yearly' ? 'border-fuchsia-400/60 bg-gradient-to-br from-fuchsia-500/[0.1] to-violet-500/[0.05]' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'}`}
                style={plan === 'yearly' ? { boxShadow: '0 0 20px rgba(217,70,239,0.12), inset 0 0 20px rgba(139,92,246,0.05)' } : {}}
              >
                <span
                  className="absolute -top-2 right-2 text-[7px] sm:text-[8px] font-black text-white px-1.5 py-[2px] rounded-full tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}
                >
                  {t('pro.save2mo')}
                </span>
                <p className="text-white/45 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] mb-1">{t('pro.yearly')}</p>
                <p className="text-white font-black text-[20px] sm:text-[22px] leading-none tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ₹683<span className="text-white/30 text-[10px] sm:text-[11px] font-semibold">/yr</span>
                </p>
                <p className="text-white/20 text-[10px] mt-1 line-through font-medium">₹1,176/yr</p>
              </button>
            </div>

            {testModeRequested && (
              <div className="mb-2.5 rounded-lg px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold bg-amber-500/10 border border-amber-400/20 text-amber-200">
                Test mode: ₹1 test flow
              </div>
            )}

            {err && (
              <div className={`mb-2.5 rounded-lg px-2.5 py-1.5 text-[10px] sm:text-[11px] font-semibold ${errKind === 'info' ? 'bg-white/[0.03] border border-white/[0.06] text-white/50' : 'bg-red-500/8 border border-red-500/20 text-red-300'}`}>
                {err}
              </div>
            )}

            {/* CTA with shimmer sweep */}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="relative w-full text-white font-black text-[14px] sm:text-[15px] py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 25%, #c026d3 55%, #d946ef 80%, #ec4899 100%)',
                boxShadow: '0 4px 20px rgba(168,85,247,0.3)',
                transition: 'transform 150ms, opacity 150ms',
              }}
            >
              <span className="relative z-10">
                {loading
                  ? (lang === 'bn' ? 'অপেক্ষা করো…' : 'Please wait…')
                  : `${t('pro.upgradeBtn')} — ₹${priceDisplay}`}
              </span>
              {!loading && (
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                    animation: 'pro-shimmer 3s ease-in-out 1s infinite',
                  }}
                />
              )}
            </button>

            {/* Trust footer */}
            <div className="flex items-center justify-center gap-1 mt-2.5 whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0 text-white/20" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="text-white/25 text-[9px] sm:text-[10px] font-medium tracking-wide">{t('pro.securedBy')}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
