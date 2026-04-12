import { Link, useLocation } from 'wouter';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';
import { useNglLang, LangToggle, FloatingHelp } from '@/components/NglLang';
import { buildApiUrl } from '@/lib/queryClient';

// Floating orbs for premium feel
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { size: 180, x: '-10%', y: '15%', delay: 0, dur: 7 },
        { size: 120, x: '75%', y: '10%', delay: 1, dur: 9 },
        { size: 90, x: '60%', y: '70%', delay: 2, dur: 6 },
        { size: 60, x: '15%', y: '75%', delay: 0.5, dur: 8 },
        { size: 40, x: '85%', y: '45%', delay: 1.5, dur: 5 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: orb.size, height: orb.size, left: orb.x, top: orb.y, background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)' }}
          animate={{ y: [0, -20, 0, 15, 0], x: [0, 10, 0, -10, 0], scale: [1, 1.1, 1, 0.95, 1] }}
          transition={{ duration: orb.dur, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

export default function NglLanding() {
  const [, navigate] = useLocation();
  const { t } = useNglLang();
  const [displayCount, setDisplayCount] = useState<number | null>(null);
  const baseCountRef = useRef(0);

  // Auto-redirect logged-in users to their dashboard
  useEffect(() => {
    const saved = localStorage.getItem('bong_ngl');
    if (saved) {
      try {
        const { username: u } = JSON.parse(saved);
        if (u) { navigate(`/ngl/at/${u}`, { replace: true }); return; }
      } catch { /* ignore */ }
    }
  }, [navigate]);

  useEffect(() => {
    fetch(buildApiUrl('/api/ngl/stats'))
      .then(r => r.json())
      .then(d => {
        if (d.totalMessages > 0) {
          baseCountRef.current = d.totalMessages;
          setDisplayCount(d.totalMessages);
        }
      })
      .catch(() => {});
  }, []);

  // Randomized ticker — adds 1-3 messages every 3-8 seconds for live feel
  useEffect(() => {
    if (baseCountRef.current === 0) return;
    const tick = () => {
      setDisplayCount(prev => {
        if (!prev) return prev;
        const bump = 1 + Math.floor(Math.random() * 3); // 1-3
        return prev + bump;
      });
      // Next tick in 3-8 seconds (random interval)
      const nextDelay = 3000 + Math.floor(Math.random() * 5000);
      timerId = setTimeout(tick, nextDelay);
    };
    let timerId = setTimeout(tick, 4000 + Math.floor(Math.random() * 3000));
    return () => clearTimeout(timerId);
  }, [displayCount !== null && baseCountRef.current > 0]);
  return (
    <>
      <SEOHead
        title="Bong NGL — Anonymous Messages | Free NGL Alternative"
        description="Get anonymous messages from friends. Free, no app, no login. Share on WhatsApp & Instagram stories."
        url="https://www.bongbari.com/ngl"
      />
      <div className="h-dvh w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #f8477a 30%, #ee6b3b 60%, #f4843e 100%)', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <FloatingOrbs />
        <div className="h-full flex flex-col items-center justify-center px-6 relative z-10">
          {/* Top bar */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5">
            <Link href="/tools" className="text-white/50 text-xs font-medium hover:text-white/80 transition-colors backdrop-blur-sm bg-white/10 px-4 py-2.5 rounded-full">
              ← Tools
            </Link>
            <LangToggle />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            {/* Animated logo glow */}
            <motion.div
              className="relative mb-6"
              animate={{ filter: ['drop-shadow(0 0 20px rgba(255,255,255,0.2))', 'drop-shadow(0 0 40px rgba(255,255,255,0.35))', 'drop-shadow(0 0 20px rgba(255,255,255,0.2))'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <h1 className="text-7xl sm:text-9xl font-black text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
                বং <span style={{ background: 'linear-gradient(to right, #fff, #ffd6e0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NGL</span>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-white/60 text-xs mt-1 font-semibold tracking-[0.3em] uppercase"
              >
                by Bong Bari
              </motion.p>
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-white/90 text-base sm:text-lg mb-8 max-w-[280px] leading-relaxed font-medium"
            >
              {t('landing.tagline')}
            </motion.p>

            {/* Feature badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-2 mb-8"
            >
              {['🔒 100% Anonymous', '⚡ No App', '🆓 Free Forever'].map((badge, i) => (
                <span key={i} className="bg-white/15 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20">
                  {badge}
                </span>
              ))}
            </motion.div>

            {/* Live stats counter — randomized ticker */}
            {displayCount !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="mb-6"
              >
                <span className="bg-black/20 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold px-4 py-2 rounded-full border border-white/10 inline-flex items-center gap-1.5">
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >🔥</motion.span>
                  <motion.span
                    key={displayCount}
                    initial={{ opacity: 0.6, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {t('landing.liveStats').replace('{{count}}', displayCount.toLocaleString())}
                  </motion.span>
                </span>
              </motion.div>
            )}

            {/* CTA Button — premium glass effect */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link href="/ngl/create">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-black font-extrabold text-lg px-14 py-4.5 rounded-full shadow-2xl hover:shadow-[0_15px_50px_rgba(255,255,255,0.25)] transition-all relative overflow-hidden group"
                >
                  <span className="relative z-10">{t('landing.cta')}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              </Link>
            </motion.div>

            {/* Already have account? */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-5"
            >
              <Link href="/ngl/create?login=1" className="text-white/50 text-xs font-medium hover:text-white/80 transition-colors underline underline-offset-2 decoration-white/20 hover:decoration-white/50">
                {t('landing.alreadyHave') || 'Already have an account?'}
              </Link>
            </motion.div>
          </motion.div>

          {/* Footer */}
          <div className="absolute bottom-5 text-white/30 text-[10px] flex gap-2 items-center">
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          </div>

          <FloatingHelp />
        </div>
      </div>
    </>
  );
}
