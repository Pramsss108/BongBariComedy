import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import {
  Download,
  FileText,
  ShieldCheck,
  Zap,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { resolveGoFileUrl } from '@/lib/gofile-engine';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const DOWNLOAD_JOKES = [
  '"Bong Bari theke file niccho — taste e Bengali, speed e rocket." 🚀',
  '"Download e kono ad nai — just pure bong vibes." ✨',
  '"Tor bondhu pathiyeche — dhonnobad nite bhulish na." 🙏',
  '"File ready. Network ready. Tui ki ready?" 😏',
  '"Bong Bari — where files travel faster than Kolkata traffic." 🛺',
];

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return '🎵';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return '📝';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
  if (['ppt', 'pptx'].includes(ext)) return '📽️';
  if (['apk'].includes(ext)) return '📱';
  if (['exe', 'msi'].includes(ext)) return '💻';
  return '📁';
}

const BongShareDownload = () => {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const code = params.code || '';

  const resolved = useMemo(() => resolveGoFileUrl(code), [code]);
  const [jokeIdx, setJokeIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setJokeIdx(i => (i + 1) % DOWNLOAD_JOKES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const currentJoke = DOWNLOAD_JOKES[jokeIdx % DOWNLOAD_JOKES.length];

  if (!resolved) {
    return (
      <>
        <SEOHead title="Link Expired | Bong Bari" description="This file transfer link has expired or is invalid." url="https://www.bongbari.com/s" />
        <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
          <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%)' }} />
          <header className="flex-none w-full h-14 sm:h-16 flex items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 overflow-hidden select-none">
            <button onClick={() => setLocation('/')} className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white ml-2">Bong Bari</h1>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Link Expired or Invalid</h2>
              <p className="text-[#d1c5ad] text-sm leading-relaxed mb-6">
                This file transfer link is no longer valid. The file may have been deleted after 10 days of inactivity,
                or the link may be incorrect.
              </p>
              <button onClick={() => setLocation('/tools/share')} className="h-12 px-8 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg">
                Send a New File
              </button>
            </motion.div>
          </main>
        </div>
      </>
    );
  }

  const { downloadPage, fileName, fileSize } = resolved;
  const icon = getFileIcon(fileName);

  return (
    <>
      <SEOHead
        title={`Download ${fileName} | Bong Bari`}
        description={`Download ${fileName} (${formatBytes(fileSize)}) — shared via Bong Bari file transfer.`}
        url={`https://www.bongbari.com/s/${code}`}
      />

      <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
        {/* Mesh gradient */}
        <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(240,193,44,0.03) 0px, transparent 50%)' }} />

        {/* Header */}
        <header className="flex-none w-full h-14 sm:h-16 flex justify-between items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 overflow-hidden select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setLocation('/')} className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white whitespace-nowrap">Bong Bari</h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#d1c5ad] font-semibold whitespace-nowrap">File Transfer</p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#f0c12c] font-bold hidden sm:block whitespace-nowrap shrink-0">Secure Download</p>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full px-4 sm:px-6 relative z-10 min-h-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div
              className="w-full rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-2xl"
              style={{
                background: 'rgba(27,27,27,0.4)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* File icon */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#1b1b1b] border border-white/5 flex items-center justify-center shadow-xl">
                <span className="text-4xl sm:text-5xl">{icon}</span>
              </div>

              {/* File info */}
              <div className="flex flex-col items-center text-center gap-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight break-all max-w-full px-2">{fileName}</h2>
                <p className="text-[#9a907a] text-sm font-medium">{formatBytes(fileSize)}</p>
              </div>

              {/* Security badges */}
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]/40">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Encrypted</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> CDN</span>
                <span>•</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-400" /> Verified</span>
              </div>

              {/* Download button */}
              <a
                href={downloadPage}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 sm:h-16 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-3 no-underline"
              >
                <Download className="w-5 h-5" />
                Download Now
              </a>

              {/* Send your own */}
              <button
                onClick={() => setLocation('/tools/share')}
                className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-[#e2e2e2] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                Send Your Own File
              </button>
            </div>
          </motion.div>
        </main>

        {/* Joke ticker */}
        <div className="flex-none w-full py-3 flex justify-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentJoke}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] text-[#f0c12c]/50 font-medium italic text-center px-4 max-w-md"
            >
              {currentJoke}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="flex-none w-full py-3 sm:py-4 flex justify-center border-t border-white/5 relative z-10">
          <p className="text-[9px] font-bold tracking-[0.3em] text-[#d1c5ad]/30 uppercase text-center px-4">
            Powered by Bong Bari &mdash; Files auto-delete after 10 days of inactivity
          </p>
        </footer>
      </div>
    </>
  );
};

export default BongShareDownload;
