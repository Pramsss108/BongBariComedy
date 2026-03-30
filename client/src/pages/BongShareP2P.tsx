import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useLocation } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import {
  Wifi, Download, CheckCircle2, ArrowLeft, ShieldCheck, Lock, EyeOff, AlertTriangle
} from 'lucide-react';
import { decodeP2PToken, createReceiver, type P2PStatus } from '@/lib/p2p-engine';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const glassStyle = {
  background: 'rgba(27,27,27,0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.05)',
} as const;

const BongShareP2P = () => {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<P2PStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const receiverRef = useRef<{ destroy: () => void } | null>(null);

  const payload = token ? decodeP2PToken(token) : null;

  useEffect(() => {
    if (!payload) return;

    setFileName(payload.n);

    const receiver = createReceiver(
      payload.p,
      (s) => setStatus(s),
      (pct) => setProgress(pct),
      (blob, name) => {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setFileName(name);
      },
    );
    receiverRef.current = receiver;

    return () => { receiver.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const statusText: Record<P2PStatus, string> = {
    idle: 'Connecting to sender…',
    waiting: 'Waiting for sender…',
    connecting: 'Establishing connection…',
    transferring: `Receiving… ${progress}%`,
    complete: 'File received!',
    error: 'Connection failed — sender may be offline.',
  };

  if (!payload) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
        <div className="rounded-2xl p-8 flex flex-col gap-4 items-center text-center max-w-sm" style={glassStyle}>
          <AlertTriangle className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-extrabold text-white">Invalid P2P Link</h2>
          <p className="text-sm text-[#d1c5ad]">This link is expired or malformed. Ask the sender for a new link.</p>
          <button onClick={() => setLocation('/tools/share')} className="mt-2 h-11 px-6 rounded-full bg-[#40ceed] text-[#003844] font-bold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all">
            Go to Bong Share
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="BongShare P2P | Receiving File"
        description="Receive a file directly via BongShare P2P. No servers involved."
        url="https://www.bongbari.com/p/"
      />

      <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
        <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(64,206,237,0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(240,193,44,0.04) 0px, transparent 50%)' }} />

        {/* Header */}
        <header className="flex-none w-full h-14 sm:h-16 flex items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setLocation('/tools/share')} className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]" aria-label="Go to Bong Share">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white whitespace-nowrap">Bong<span style={{ color: '#f0c12c' }}>Share</span></h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#40ceed] font-semibold whitespace-nowrap">P2P Transfer</p>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-4 sm:px-6 relative z-10 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key="p2p-receive" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-2xl" style={glassStyle}>
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-[#40ceed]/10 flex items-center justify-center">
                  {status === 'complete' ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : status === 'error' ? <AlertTriangle className="w-8 h-8 text-red-400" /> : <Wifi className="w-8 h-8 text-[#40ceed]" />}
                </div>
              </div>

              {/* File info */}
              <div className="text-center">
                <h2 className="text-lg font-extrabold text-white mb-1">{payload.n}</h2>
                <p className="text-xs text-[#9a907a]">{formatBytes(payload.s)}</p>
              </div>

              {/* Progress */}
              <div className="w-full">
                <div className="flex justify-between mb-1 text-xs">
                  <span className={`font-mono ${status === 'error' ? 'text-red-400' : status === 'complete' ? 'text-emerald-400' : 'text-[#40ceed]/60'}`}>{statusText[status]}</span>
                  <span className="font-bold text-[#40ceed]">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #40ceed, #f0c12c)', boxShadow: '0 0 15px rgba(64,206,237,0.4)' }} />
                </div>
              </div>

              {/* Download button */}
              {status === 'complete' && downloadUrl && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleDownload} className="w-full h-14 bg-[#40ceed] text-[#003844] font-extrabold uppercase tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" /> Download File
                </motion.button>
              )}

              {/* Error retry */}
              {status === 'error' && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => window.location.reload()} className="w-full h-14 bg-red-500/20 text-red-300 font-extrabold uppercase tracking-widest rounded-full hover:bg-red-500/30 active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-sm">
                  Retry Connection
                </motion.button>
              )}

              {/* Security badges */}
              <div className="flex justify-center gap-4 opacity-40">
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]"><Lock className="w-3 h-3 text-emerald-500" /> E2E Encrypted</span>
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]"><EyeOff className="w-3 h-3 text-amber-500" /> Zero Server</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="flex-none w-full py-3 sm:py-4 flex justify-between items-center px-4 sm:px-6 border-t relative z-10" style={{ borderColor: 'rgba(240,193,44,0.08)' }}>
          <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase" style={{ color: 'rgba(240,193,44,0.4)' }}>BongShare</span>
          <p className="text-[9px] font-bold tracking-[0.2em] text-[#d1c5ad]/30 uppercase">Browser-to-Browser · E2E Encrypted</p>
        </footer>
      </div>
    </>
  );
};

export default BongShareP2P;
