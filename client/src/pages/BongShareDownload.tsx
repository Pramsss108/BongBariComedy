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

        {/* Main — scrollable for large bundles */}
        <main className="flex-1 flex flex-col items-center max-w-lg mx-auto w-full px-4 sm:px-6 relative z-10 min-h-0 overflow-y-auto py-4 sm:py-6">
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
                <span className="text-4xl sm:text-5xl">{isBundle ? '📦' : icon}</span>
              </div>

              {/* File info */}
              <div className="flex flex-col items-center text-center gap-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight break-all max-w-full px-2">
                  {isBundle ? `File Bundle` : fileName}
                </h2>
                <p className="text-[#9a907a] text-sm font-medium">
                  {isBundle && manifest
                    ? `${manifest.files.length} files · ${formatBytes(fileSize)}`
                    : formatBytes(fileSize)
                  }
                </p>
              </div>

              {/* Security badges */}
              <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]/40">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Encrypted</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> CDN</span>
                <span>•</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-blue-400" /> Verified</span>
              </div>

              {/* Bundle expiry badge */}
              {(isBundle || host === 'filebin' || host === 'filebin-bundle') && (
                <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-300/80 font-medium">Link valid for <strong className="text-amber-300">6 days</strong> — download before it expires!</p>
                </div>
              )}

              {/* Litterbox expiry warning (legacy) */}
              {expires && !isBundle && host !== 'filebin' && host !== 'filebin-bundle' && (
                <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-[11px] text-amber-300/80 font-medium">This link expires in <strong className="text-amber-300">72 hours</strong> — download it now!</p>
                </div>
              )}

              {/* ===== BUNDLE FILE LIST ===== */}
              {isBundle && manifest && (
                <div className="w-full flex flex-col gap-3">
                  {manifest.files.map((entry, fileIdx) => (
                    <div key={fileIdx} className="w-full rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xl shrink-0">{getFileIcon(entry.name)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{entry.name}</p>
                        <p className="text-[10px] text-[#9a907a]">
                          {formatBytes(entry.size)}
                          {entry.chunks.length > 1 && <span className="ml-2 text-amber-400/60">{entry.chunks.length} parts</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadBundleFile(entry)}
                        className="shrink-0 h-9 px-4 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all bg-[#f0c12c] text-[#695200] hover:brightness-110 active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== BUNDLE DOWNLOAD AS ZIP ===== */}
              {isBundle && manifest && (
                <div className="w-full flex flex-col gap-3">
                  {/* Server-side ZIP info badge */}
                  <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Archive className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-emerald-300/80 font-medium">
                      Downloads all {manifest.files.length} files as a single <strong className="text-emerald-300">.zip</strong> — instant server-side ZIP
                    </p>
                  </div>
                  <button
                    onClick={handleBundleDownloadZip}
                    className="w-full h-14 sm:h-16 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    <Archive className="w-5 h-5" />
                    Download as ZIP
                  </button>
                </div>
              )}

              {/* Download button — different per tier (non-bundle) */}
              {!isBundle && isChunked ? (
                /* Filebin chunked — stream-assemble directly (CORS native, no proxy) */
                <div className="w-full flex flex-col gap-3">
                  <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-300/80 font-medium">File is split into {chunkNames?.length ?? chunkUrls?.length} parts — merged automatically on download &mdash; link valid for 6 days</p>
                  </div>
                  {chunkActive && (
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#40ceed]/70">
                        <span>{chunkPhase}</span>
                        <span>{chunkProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#40ceed] transition-all duration-300" style={{ width: `${chunkProgress}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleChunkedDownload}
                    disabled={chunkActive}
                    className="w-full h-14 sm:h-16 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" />
                    {chunkActive ? chunkPhase : 'Download Now'}
                  </button>
                </div>
              ) : isDirect && downloadUrl ? (
                /* Tier 1 & 2: Catbox / Litterbox → direct file download, no third-party */
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="w-full h-14 sm:h-16 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-3 no-underline"
                >
                  <Download className="w-5 h-5" />
                  Download Now
                </a>
              ) : !isBundle ? (
                /* Tier 3: GoFile (>1 GB) → branded message + honest redirect */
                <div className="w-full flex flex-col gap-3">
                  <div className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/15">
                    <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-[11px] text-blue-300/70 font-medium">Large file ({formatBytes(fileSize)}) — opens Bong Bari's secure vault for download</p>
                  </div>
                  <button
                    onClick={handleGoFileProxyDownload}
                    className="w-full h-14 sm:h-16 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    Download Now
                  </button>
                </div>
              ) : null}

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
            Powered by Bong Bari &mdash; {expires ? 'This link expires in 72 hours' : (host === 'filebin' || host === 'filebin-bundle') ? 'Link valid for 6 days' : (host === 'catbox' || host === 'catbox-chunked') ? 'Permanent file link' : 'Files auto-delete after 10 days of inactivity'}
          </p>
        </footer>
      </div>
    </>
  );
};

export default BongShareDownload;
