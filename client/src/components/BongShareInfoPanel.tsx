import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Globe,
  Smartphone,
  Wifi,
  Timer,
  Zap,
  Infinity as InfinityIcon,
  UserX,
  CircleDollarSign,
  Archive,
  CheckCircle2,
} from 'lucide-react';

interface BongShareInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── "?" Floating Button ── */
export const BongShareInfoButton = ({ onClick }: { onClick: () => void }) => (
  <motion.button
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.7, type: 'spring', stiffness: 180 }}
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="fixed bottom-20 left-5 z-50 w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold"
    style={{
      background: 'rgba(27,27,27,0.6)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(240,193,44,0.2)',
      color: '#f0c12c',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'info-breathe 3s ease-in-out infinite',
    }}
  >
    ?
  </motion.button>
);

/* ── Full-Screen Info Panel with slide-in/slide-out ── */
export const BongShareInfoPanel = ({ isOpen, onClose }: BongShareInfoPanelProps) => (
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[59]"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        />
        {/* Full-screen Panel — slides in from left */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #111113 0%, #0e0c0a 100%)',
          }}
        >
          {/* Close button — prominent X */}
          <button onClick={onClose}
            className="fixed top-4 right-4 z-[61] w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(27,27,27,0.8)', border: '1px solid rgba(240,193,44,0.2)', color: '#f0c12c' }}>
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-10 md:p-14 max-w-2xl mx-auto flex flex-col gap-10 pb-20">

            {/* ── SECTION 1: What is BongShare ── */}
            <div className="flex flex-col items-center text-center gap-5 pt-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(240,193,44,0.1)', border: '1px solid rgba(240,193,44,0.2)' }}>
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: '#f0c12c' }}>The #1 Free File Transfer</h2>
              <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-md">
                Send any file, any size, to anyone — instantly. No sign-up. No ads. No limits. Free forever.
              </p>
              <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                বিনামূল্যে ফাইল পাঠান — চিরকালের জন্য ফ্রি। কোনো সাইন-আপ লাগবে না।
              </p>
            </div>

            {/* ── SECTION 2: Why BongShare — Trust Grid ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.25em] text-center" style={{ color: 'rgba(240,193,44,0.5)' }}>Why BongShare?</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Lock className="w-5 h-5" style={{ color: '#10b981' }} />, label: 'End-to-End Encrypted', desc: 'Military-grade DTLS-SRTP' },
                  { icon: <InfinityIcon className="w-5 h-5" style={{ color: '#f0c12c' }} />, label: 'Unlimited File Size', desc: 'No caps, no throttling' },
                  { icon: <UserX className="w-5 h-5" style={{ color: '#f87171' }} />, label: 'No Account Needed', desc: 'Just drop and send' },
                  { icon: <CircleDollarSign className="w-5 h-5" style={{ color: '#34d399' }} />, label: '100% Free Forever', desc: 'No trial, no paywall' },
                  { icon: <Globe className="w-5 h-5" style={{ color: '#60a5fa' }} />, label: 'Works Everywhere', desc: 'Any browser, any device' },
                  { icon: <Smartphone className="w-5 h-5" style={{ color: '#a78bfa' }} />, label: 'No App Required', desc: 'Pure web — nothing to install' },
                  { icon: <Zap className="w-5 h-5" style={{ color: '#fbbf24' }} />, label: 'Blazing Fast', desc: 'LAN speed on local, CDN on cloud' },
                  { icon: <Timer className="w-5 h-5" style={{ color: '#fb923c' }} />, label: 'Auto-Expiring Files', desc: 'Privacy by design' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(27,27,27,0.35)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-white leading-tight">{item.label}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 3: How Safe Are Your Files? ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.25em] text-center" style={{ color: 'rgba(240,193,44,0.5)' }}>How Safe Are Your Files?</h3>
              <div className="flex flex-col gap-3 pl-5" style={{ borderLeft: '2px solid rgba(240,193,44,0.15)' }}>
                {[
                  'Your files are encrypted before they leave your browser.',
                  'We never store, read, scan, or sell your data.',
                  'Direct transfers bypass all third-party servers.',
                  'Files auto-expire — nothing lives forever.',
                  'No cookies. No tracking. No ads.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#10b981' }} />
                    <p className="text-[13px] text-white/70 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 4: Transfer Modes ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.25em] text-center" style={{ color: 'rgba(240,193,44,0.5)' }}>Transfer Modes</h3>
              <div className="flex flex-col gap-3">
                {[
                  { icon: <Wifi className="w-5 h-5" style={{ color: '#40ceed' }} />, title: 'P2P Transfer', tag: 'ZERO SERVER', desc: 'Browser-to-browser, end-to-end encrypted. Both users must be online. Unlimited size.', tagColor: '#40ceed' },
                  { icon: <Globe className="w-5 h-5" style={{ color: '#f0c12c' }} />, title: 'Link Sharing', tag: 'SHARE ANYTIME', desc: 'Upload once → get a link → share with anyone. Receiver downloads whenever convenient. Auto-expires.', tagColor: '#f0c12c' },
                  { icon: <Archive className="w-5 h-5" style={{ color: '#34d399' }} />, title: 'Multi-File Bundle', tag: 'ZIP DOWNLOAD', desc: 'Multiple files in one link. Download all as ZIP or pick individual files.', tagColor: '#34d399' },
                  { icon: <Wifi className="w-5 h-5" style={{ color: '#a78bfa' }} />, title: 'Local Transfer', tag: 'LAN SPEED', desc: 'Same WiFi / hotspot = full-speed transfer. Phone-to-phone, laptop-to-phone. No internet needed.', tagColor: '#a78bfa' },
                ].map((mode, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(27,27,27,0.35)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {mode.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-bold text-white">{mode.title}</p>
                        <span className="text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${mode.tagColor}15`, color: mode.tagColor, border: `1px solid ${mode.tagColor}30` }}>{mode.tag}</span>
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{mode.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 5: vs Competitors ── */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.25em] text-center" style={{ color: 'rgba(240,193,44,0.5)' }}>BongShare vs Everyone</h3>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-[11px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2 font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>Feature</th>
                      <th className="text-center py-2 px-2 font-extrabold" style={{ color: '#f0c12c' }}>BongShare</th>
                      <th className="text-center py-2 px-2 font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>WeTransfer</th>
                      <th className="text-center py-2 px-2 font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>G Drive</th>
                      <th className="text-center py-2 px-2 font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Dropbox</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feat: 'Price', bs: 'FREE ✅', wt: '$12/mo', gd: '$2/mo', db: '$12/mo' },
                      { feat: 'File Limit', bs: 'None ✅', wt: '2 GB', gd: '15 GB', db: '2 GB' },
                      { feat: 'Sign-up', bs: 'None ✅', wt: 'Required', gd: 'Required', db: 'Required' },
                      { feat: 'Ads', bs: 'None ✅', wt: 'Yes', gd: 'No', db: 'No' },
                      { feat: 'Encryption', bs: 'E2E ✅', wt: 'TLS', gd: 'TLS', db: 'TLS' },
                      { feat: 'Local Send', bs: 'Yes ✅', wt: 'No', gd: 'No', db: 'No' },
                      { feat: 'No App', bs: 'Yes ✅', wt: 'Yes', gd: 'Yes', db: 'No' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2 px-2 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{row.feat}</td>
                        <td className="py-2 px-2 text-center font-bold" style={{ color: '#f0c12c' }}>{row.bs}</td>
                        <td className="py-2 px-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>{row.wt}</td>
                        <td className="py-2 px-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>{row.gd}</td>
                        <td className="py-2 px-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>{row.db}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Also beats:</p>
                {[
                  'AirDrop — Apple ecosystem only, no link sharing',
                  'Send Anywhere — ads on free tier, 10 GB cap',
                  'SHAREit — bloatware app, privacy nightmare',
                  'Xender — app-only, ads everywhere',
                  'Zapya — app-only, requires install',
                  'Firefox Send — discontinued',
                  'Snapdrop — P2P only, no link mode',
                ].map((line, i) => (
                  <p key={i} className="text-[11px] pl-3" style={{ color: 'rgba(255,255,255,0.3)' }}>• {line}</p>
                ))}
              </div>
            </div>

            {/* ── SECTION 6: Panel Footer ── */}
            <div className="flex flex-col items-center gap-3 pt-6 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>Made with ☕ &amp; code by Bong Bari</p>
              <p className="text-sm italic font-semibold" style={{ color: 'rgba(240,193,44,0.5)' }}>"Tomar file. Tomar control. Tomar privacy."</p>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
