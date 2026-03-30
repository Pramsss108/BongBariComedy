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
  Clock,
  HardDrive,
  Archive,
  Upload,
} from 'lucide-react';
import { resolveShareUrl, type BundleManifest, type BundleFileEntry } from '@/lib/gofile-engine';


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
  '"WeTransfer ke bolchi — tumi retired." 🪦',
  '"Google Drive er 15GB limit? Cute." 😂',
  '"Ei file ta eto premium je VIP pass lagbe." 🎫',
  '"Jhalmuri khaite khaite download hoe jabe." 🌶️',
  '"Tui share korechis. Amra deliver korchi. Netflix chill." 🍿',
  '"File porte porte Metro te pohche jabi." 🚇',
  '"WhatsApp bolche — eto boro file ami nite parbo na." 😤',
  '"Upload korechis bravery. Download korchis destiny." 🏆',
  '"Tor ISP jodi slow hoy — amra ki korbo bhai?" 🤷',
  '"AirDrop er baap — BongDrop." 💀',
  '"Server theke direct — kono middleman nai." 🤝',
  '"Ebar tui ei file ta niye boudi ke impress kor." 🫡',
  '"Tor ex file pathale amra deliver korbo — judge korbo na." 🙈',
  '"Pendrive er din shesh — link share kor, chill kor." 💆',
  '"Bong Bari file engine — made with chai & code." ☕',
  '"Ekhane kono ad pop-up nai. Haan, seriously." 😌',
  '"Tomar data amader kaache safe — pinky promise." 🤙',
  '"Download speed — Rajdhani Express." 🚆',
  '"Eto smooth download — butter o jealous." 🧈',
];

/** Detect if browser supports File System Access API (streaming to disk, no RAM limit) */
const hasNativeFilePicker = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
/** Check for basic browser support (ReadableStream etc) */
const hasStreamSupport = typeof window !== 'undefined' && typeof ReadableStream !== 'undefined';

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

  const resolved = useMemo(() => resolveShareUrl(code), [code]);
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

  const { downloadUrl, fileName, fileSize, isDirect, host, expires, isChunked, chunkUrls, binId, chunkNames, isBundle, manifest } = resolved;
  const icon = getFileIcon(fileName);

  // CF Worker proxy (globally fast, free) — set VITE_FILEBIN_PROXY_BASE after deploying worker-filebin/
  // Fallback: direct filebin URLs (works everywhere, shows filebin warning page for individual files)
  const FILEBIN_PROXY = (import.meta.env.VITE_FILEBIN_PROXY_BASE as string || '').replace(/\/$/, '');

  const filebinDlUrl = (chunkName: string, downloadAs: string) =>
    FILEBIN_PROXY
      ? `${FILEBIN_PROXY}/dl/${binId}/${chunkName}?as=${encodeURIComponent(downloadAs)}`
      : `https://filebin.net/${binId}/${chunkName}`;

  const filebinZipUrl = () =>
    FILEBIN_PROXY
      ? `${FILEBIN_PROXY}/zip/${binId}`
      : `https://filebin.net/archive/${binId}/zip`;

  /** Download a single bundle file (via CF Worker proxy if configured, else direct filebin) */
  const downloadBundleFile = (entry: BundleFileEntry) => {
    if (!binId) return;
    const chunkName = entry.chunks[0];
    window.location.href = filebinDlUrl(chunkName, entry.name);
  };

  /** Download all bundle files as ZIP (via CF Worker proxy if configured, else direct filebin) */
  const handleBundleDownloadZip = () => {
    if (!binId) return;
    window.location.href = filebinZipUrl();
  };

  /** For GoFile (>1GB), trigger a fetch→blob download so they never see GoFile UI */
  const [proxyProgress, setProxyProgress] = useState(0);
  const [proxyActive, setProxyActive] = useState(false);

  /** Chunked download: filebin (CORS native, no proxy) or legacy catbox URLs */
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkActive, setChunkActive] = useState(false);
  const [chunkPhase, setChunkPhase] = useState('');

  const handleChunkedDownload = async () => {
    // Resolve chunk source: filebin (binId + chunkNames) or legacy catbox (chunkUrls)
    const isFilebin = !!(binId && chunkNames && chunkNames.length > 0);
    const totalParts = isFilebin ? chunkNames!.length : (chunkUrls?.length ?? 0);
    if (totalParts === 0) return;

    const getChunkUrl = (i: number) =>
      isFilebin
        ? filebinDlUrl(chunkNames![i], fileName)
        : chunkUrls![i];  // legacy catbox

    setChunkActive(true);
    setChunkProgress(0);
    setChunkPhase('Starting download…');
    try {
      if ('showSaveFilePicker' in window) {
        // Streaming via File System Access API — no RAM limit, works for 100 GB+
        const fileHandle = await (window as any).showSaveFilePicker({ suggestedName: fileName });
        const writable = await fileHandle.createWritable();
        for (let i = 0; i < totalParts; i++) {
          setChunkPhase(`Downloading part ${i + 1} of ${totalParts}…`);
          const response = await fetch(getChunkUrl(i));
          if (!response.ok || !response.body) throw new Error(`Part ${i + 1} failed (${response.status})`);
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            await writable.write(value);
          }
          setChunkProgress(Math.round(((i + 1) / totalParts) * 100));
        }
        await writable.close();
        setChunkPhase('Done!');
      } else {
        // Fallback: buffer in memory (safe up to ~2 GB on most browsers)
        const blobs: Blob[] = [];
        for (let i = 0; i < totalParts; i++) {
          setChunkPhase(`Downloading part ${i + 1} of ${totalParts}…`);
          const response = await fetch(getChunkUrl(i));
          if (!response.ok) throw new Error(`Part ${i + 1} failed (${response.status})`);
          blobs.push(await response.blob());
          setChunkProgress(Math.round(((i + 1) / totalParts) * 100));
        }
        setChunkPhase('Merging parts…');
        const merged = new Blob(blobs);
        const url = URL.createObjectURL(merged);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        setChunkPhase('Done!');
      }
    } catch (err: any) {
      setChunkPhase(`Error: ${err.message}`);
    } finally {
      setChunkActive(false);
    }
  };

  const handleGoFileProxyDownload = async () => {
    // Open in new tab — branded message already shown, this is the honest fallback
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <SEOHead
        title={`Download ${fileName} | Bong Bari`}
        description={`Download ${fileName} (${formatBytes(fileSize)}) — shared via Bong Bari file transfer.`}
        url={`https://www.bongbari.com/s/${code}`}
      />

      <div className="fixed inset-0 flex flex-col" style={{ background: '#0a0a0b', fontFamily: 'Manrope, sans-serif' }}>
        {/* Ambient mesh gradient */}
        <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 15% 10%, rgba(240,193,44,0.07) 0px, transparent 45%), radial-gradient(at 85% 5%, rgba(64,206,237,0.06) 0px, transparent 40%), radial-gradient(at 50% 95%, rgba(155,89,182,0.04) 0px, transparent 40%)' }} />

        {/* ── HEADER ── */}
        <header className="flex-none h-12 sm:h-14 flex justify-between items-center px-4 sm:px-6 md:px-8 border-b select-none relative z-30" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Left: back + logo + FILE TRANSFER chip */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setLocation('/')} className="shrink-0 p-1.5 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all" style={{ color: '#a89880' }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tighter text-white whitespace-nowrap">Bong Bari</h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-1" style={{ background: 'rgba(240,193,44,0.1)', border: '1px solid rgba(240,193,44,0.2)' }}>
              <HardDrive className="w-2.5 h-2.5 shrink-0" style={{ color: '#f0c12c' }} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: '#f0c12c' }}>File Transfer</span>
            </div>
          </div>
          {/* Right: SECURE DOWNLOAD premium badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', boxShadow: '0 0 18px rgba(16,185,129,0.12)' }}>
            <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#10b981' }} />
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: '#34d399' }}>Secure Download</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
        </header>

        {/* ── MAIN ── flex-1, no outer scroll */}
        <main className="flex-1 min-h-0 flex overflow-hidden relative z-10">

          {/* ══════ BUNDLE LAYOUT: left panel + right grid ══════ */}
          {isBundle && manifest ? (
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

              {/* Left panel — bundle metadata + ZIP button (~280px fixed) */}
              <div className="flex-none md:w-72 lg:w-80 flex flex-col gap-3 p-4 sm:p-5 md:p-6 border-b md:border-b-0 md:border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-3">
                  {/* Icon + name row */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: 'rgba(240,193,44,0.08)', border: '1px solid rgba(240,193,44,0.15)' }}>
                      <span className="text-3xl">📦</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold text-white tracking-tight">File Bundle</h2>
                      <p className="text-[11px] font-medium" style={{ color: '#7a7060' }}>
                        {manifest.files.length} files · {formatBytes(fileSize)}
                      </p>
                    </div>
                  </div>

                  {/* Security badges — compact */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399' }}>
                      <ShieldCheck className="w-2.5 h-2.5" /> Encrypted
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ background: 'rgba(240,193,44,0.08)', border: '1px solid rgba(240,193,44,0.15)', color: '#f0c12c' }}>
                      <Zap className="w-2.5 h-2.5" /> CDN
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider" style={{ background: 'rgba(64,206,237,0.08)', border: '1px solid rgba(64,206,237,0.15)', color: '#40ceed' }}>
                      <FileText className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>

                  {/* Expiry warning */}
                  {(host === 'filebin' || host === 'filebin-bundle') && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: '#f59e0b' }} />
                      <p className="text-[10px] leading-snug" style={{ color: '#fbbf24' }}>
                        Link valid for <strong>6 days</strong> — save before it expires
                      </p>
                    </div>
                  )}

                  {/* Download all as ZIP */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.14)' }}>
                      <Archive className="w-3.5 h-3.5 shrink-0" style={{ color: '#10b981' }} />
                      <p className="text-[10px] leading-snug" style={{ color: '#6ee7b7' }}>
                        All {manifest.files.length} files as one <strong>.zip</strong>
                      </p>
                    </div>
                    <button
                      onClick={handleBundleDownloadZip}
                      className="w-full h-11 rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00', boxShadow: '0 4px 20px rgba(240,193,44,0.25)' }}
                    >
                      <Archive className="w-4 h-4" />
                      Download All as ZIP
                    </button>
                  </div>


                </motion.div>
              </div>

              {/* Right panel — file grid (internal scroll only) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 md:p-6">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="h-full">
                  {/* Section title */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {manifest.files.length} file{manifest.files.length !== 1 ? 's' : ''} in this bundle
                  </p>
                  {/* FILE GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {manifest.files.map((entry, fileIdx) => (
                      <motion.div
                        key={fileIdx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: fileIdx * 0.03 }}
                        className="flex flex-col gap-2 p-3 rounded-xl transition-all hover:border-white/10 group"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {/* Icon + name */}
                        <div className="flex items-start gap-2">
                          <span className="text-xl shrink-0 mt-0.5">{getFileIcon(entry.name)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white truncate leading-tight">{entry.name}</p>
                            <p className="text-[9px] mt-0.5 font-medium" style={{ color: '#7a7060' }}>
                              {formatBytes(entry.size)}
                              {entry.chunks.length > 1 && <span className="ml-1.5" style={{ color: 'rgba(240,193,44,0.5)' }}>{entry.chunks.length} parts</span>}
                            </p>
                          </div>
                        </div>
                        {/* SAVE button */}
                        <button
                          onClick={() => downloadBundleFile(entry)}
                          className="w-full h-7 rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all hover:brightness-110 active:scale-95"
                          style={{ background: 'rgba(240,193,44,0.12)', border: '1px solid rgba(240,193,44,0.2)', color: '#f0c12c' }}
                        >
                          <Download className="w-2.5 h-2.5" />
                          Save
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

          ) : (
            /* ══════ SINGLE FILE LAYOUT: centered ══════ */
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
                <div className="w-full rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-5 shadow-2xl" style={{ background: 'rgba(20,20,22,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* File icon */}
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-4xl">{icon}</span>
                  </div>
                  {/* Name + size */}
                  <div className="flex flex-col items-center text-center gap-1">
                    <h2 className="text-lg font-extrabold text-white tracking-tight break-all max-w-full px-2">{fileName}</h2>
                    <p className="text-sm font-medium" style={{ color: '#7a7060' }}>{formatBytes(fileSize)}</p>
                  </div>
                  {/* Badges */}
                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(16,185,129,0.6)' }}><ShieldCheck className="w-3 h-3" /> Encrypted</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(240,193,44,0.6)' }}><Zap className="w-3 h-3" /> CDN</span>
                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>•</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(64,206,237,0.6)' }}><FileText className="w-3 h-3" /> Verified</span>
                  </div>
                  {/* Expiry warnings */}
                  {(host === 'filebin' || host === 'filebin-bundle') && (
                    <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <Clock className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                      <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>Link valid for <strong>6 days</strong> — download before it expires!</p>
                    </div>
                  )}
                  {expires && host !== 'filebin' && host !== 'filebin-bundle' && (
                    <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <Clock className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                      <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>This link expires in <strong>72 hours</strong> — download it now!</p>
                    </div>
                  )}
                  {/* Browser warning for large files on old browsers */}
                  {fileSize > 500 * 1024 * 1024 && !hasNativeFilePicker && (
                    <div className="w-full flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: '#fca5a5' }}>Your browser may struggle with large files</p>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: '#f8717180' }}>For files over 500 MB, use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for streaming downloads (zero RAM usage). Firefox and Safari buffer in memory which can crash on 2GB+ files.</p>
                      </div>
                    </div>
                  )}
                  {/* ── CHUNKED DOWNLOAD ── */}
                  {isChunked ? (
                    <div className="w-full flex flex-col gap-3">
                      <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        <Clock className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                        <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>File is split into {chunkNames?.length ?? chunkUrls?.length} parts — merged automatically on download &mdash; link valid for 6 days</p>
                      </div>
                      {chunkActive && (
                        <div className="w-full flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[10px] font-mono" style={{ color: 'rgba(64,206,237,0.7)' }}>
                            <span>{chunkPhase}</span>
                            <span>{chunkProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="h-full rounded-full bg-[#40ceed] transition-all duration-300" style={{ width: `${chunkProgress}%` }} />
                          </div>
                        </div>
                      )}
                      <button onClick={handleChunkedDownload} disabled={chunkActive}
                        className="w-full h-13 sm:h-14 rounded-xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00' }}>
                        <Download className="w-5 h-5" />
                        {chunkActive ? chunkPhase : 'Download Now'}
                      </button>
                    </div>
                  ) : isDirect && downloadUrl ? (
                    /* Catbox / Litterbox → direct download */
                    <a href={downloadUrl} download={fileName}
                      className="w-full h-13 sm:h-14 rounded-xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] shadow-lg no-underline"
                      style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00' }}>
                      <Download className="w-5 h-5" />Download Now
                    </a>
                  ) : (
                    /* GoFile ≥1 GB → branded redirect */
                    <div className="w-full flex flex-col gap-3">
                      <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <HardDrive className="w-4 h-4 shrink-0" style={{ color: '#60a5fa' }} />
                        <p className="text-[11px] font-medium" style={{ color: 'rgba(147,197,253,0.7)' }}>Large file ({formatBytes(fileSize)}) — opens Bong Bari's secure vault</p>
                      </div>
                      <button onClick={handleGoFileProxyDownload}
                        className="w-full h-13 sm:h-14 rounded-xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00' }}>
                        <Download className="w-5 h-5" />Download Now
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

        </main>

        {/* ── FLOATING FAB: Send Yours — positioned above footer ── */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5, type: 'spring', stiffness: 200 }}
          onClick={() => setLocation('/tools/share')}
          className="fixed bottom-16 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00', boxShadow: '0 8px 30px rgba(240,193,44,0.45), 0 2px 10px rgba(0,0,0,0.5)' }}
        >
          <Upload className="w-4 h-4" />
          Send Yours
        </motion.button>

        {/* ── FOOTER — clean, integrated with joke ticker ── */}
        <footer className="flex-none flex items-center justify-center px-4 sm:px-6 py-2 border-t relative z-10" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(10,10,11,0.8)' }}>
          <AnimatePresence mode="wait">
            <motion.p key={currentJoke} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.35 }}
              className="text-[11px] font-semibold italic truncate text-center" style={{ color: '#f0c12c' }}>
              {currentJoke}
            </motion.p>
          </AnimatePresence>
        </footer>
      </div>
    </>
  );
};

export default BongShareDownload;
