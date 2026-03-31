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
  X,
} from 'lucide-react';
import { resolveShareUrl, type BundleManifest, type BundleFileEntry } from '@/lib/gofile-engine';
import { buildApiUrl } from '@/lib/queryClient';
import { BongShareInfoPanel, BongShareInfoButton } from '@/components/BongShareInfoPanel';
import { downloadZip } from 'client-zip';


function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Format seconds into human-readable duration: "45s", "2m 15s", "1h 5m" */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 1) return '<1s';
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
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

/* ── Download Joke Ticker — one-at-a-time fade ── */
const DownloadJokeTickerBar = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % DOWNLOAD_JOKES.length), 6000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex-none w-full overflow-hidden relative z-10 border-t select-none flex items-center justify-center"
      style={{ height: '36px', borderColor: 'rgba(240,193,44,0.06)', background: 'rgba(15,12,8,0.9)' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5 }}
          className="text-[13px] font-medium tracking-wide text-center px-4"
          style={{ color: 'rgba(240,193,44,0.6)', textShadow: '0 0 12px rgba(240,193,44,0.15)' }}
        >
          {DOWNLOAD_JOKES[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

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
  const [fabHovered, setFabHovered] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  if (!resolved) {
    return (
      <>
        <SEOHead title="Link Expired | BongShare" description="This BongShare transfer link has expired or is invalid." url="https://www.bongbari.com/s" />
        <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
          <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%)' }} />
          <header className="flex-none w-full h-14 sm:h-16 flex items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 overflow-hidden select-none">
            <button onClick={() => setLocation('/')} className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]"><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white ml-2">Bong<span style={{ color: '#f0c12c' }}>Share</span></h1>
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
  // Fallback: backend streaming proxy on Oracle VM (curl UA bypasses filebin HTML interstitials)
  const FILEBIN_PROXY = (import.meta.env.VITE_FILEBIN_PROXY_BASE as string || '').replace(/\/$/, '');

  const filebinDlUrl = (chunkName: string, downloadAs: string) =>
    FILEBIN_PROXY
      ? `${FILEBIN_PROXY}/dl/${binId}/${chunkName}?as=${encodeURIComponent(downloadAs)}`
      : buildApiUrl(`/api/share/filebin-dl/${binId}/${chunkName}?as=${encodeURIComponent(downloadAs)}`);

  const filebinZipUrl = () =>
    FILEBIN_PROXY
      ? `${FILEBIN_PROXY}/zip/${binId}`
      : buildApiUrl(`/api/share/filebin-zip/${binId}`);

  /** Download a single bundle file (via CF Worker proxy if configured, else server proxy) */
  const downloadBundleFile = (entry: BundleFileEntry) => {
    if (!binId) return;
    const chunkName = entry.chunks[0];
    window.location.href = filebinDlUrl(chunkName, entry.name);
  };

  /** Download all bundle files as ZIP — client-side (excludes manifest, only real files) */
  const [zipActive, setZipActive] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const handleBundleDownloadZip = async () => {
    if (!binId || !manifest) return;
    setZipActive(true);
    setZipProgress(0);
    try {
      const totalFiles = manifest.files.length;
      // Build file entries for client-zip (stream each file, skip _manifest.json)
      const generateEntries = async function* () {
        for (let i = 0; i < totalFiles; i++) {
          const entry = manifest!.files[i];
          if (entry.chunks.length === 1) {
            // Single chunk — stream directly
            const url = filebinDlUrl(entry.chunks[0], entry.name);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch ${entry.name}`);
            yield { name: entry.name, input: res };
          } else {
            // Multi-chunk — concatenate all chunks into one stream
            const streams = entry.chunks.map(ch => () => fetch(filebinDlUrl(ch, entry.name)).then(r => r.body!));
            const concat = new ReadableStream({
              async start(controller) {
                for (const getStream of streams) {
                  const stream = await getStream();
                  const reader = stream.getReader();
                  for (;;) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    controller.enqueue(value);
                  }
                }
                controller.close();
              }
            });
            yield { name: entry.name, input: concat };
          }
          setZipProgress(Math.round(((i + 1) / totalFiles) * 100));
        }
      }
      const blob = await downloadZip(generateEntries()).blob();
      // Trigger download
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({ suggestedName: 'BongShare-bundle.zip' });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'BongShare-bundle.zip';
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      }
    } catch (err: any) {
      console.error('[BongShare ZIP]', err);
    } finally {
      setZipActive(false);
    }
  };

  /** For GoFile (>1GB), trigger a fetch→blob download so they never see GoFile UI */
  const [proxyProgress, setProxyProgress] = useState(0);
  const [proxyActive, setProxyActive] = useState(false);

  /** Chunked download: filebin (CORS native, no proxy) or legacy catbox URLs */
  const [chunkProgress, setChunkProgress] = useState(0);
  const [chunkActive, setChunkActive] = useState(false);
  const [chunkPhase, setChunkPhase] = useState('');
  /** Per-chunk segment progress: array of 0-100 values, one per chunk */
  const [segmentProgress, setSegmentProgress] = useState<number[]>([]);
  /** Download speed in bytes/sec */
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  /** Download finished flag (to show completion UI) */
  const [downloadDone, setDownloadDone] = useState(false);
  const [savedViaStream, setSavedViaStream] = useState(false);
  /** Total bytes downloaded for display */
  const [totalDownloaded, setTotalDownloaded] = useState(0);

  /** Fetch a single chunk with validation + retry (3 attempts, exponential backoff) */
  const fetchChunkWithRetry = async (url: string, partNum: number, totalParts: number): Promise<Response> => {
    const delays = [0, 1000, 3000];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        setChunkPhase(`Part ${partNum} of ${totalParts} — retrying (attempt ${attempt + 1}/3)…`);
        await new Promise(r => setTimeout(r, delays[attempt]));
      }
      console.log(`[BongShare DL] ⬇️ Part ${partNum}/${totalParts} attempt ${attempt + 1} → ${url}`);
      try {
        const response = await fetch(url);
        const ct = response.headers.get('content-type') || '';
        const cl = response.headers.get('content-length') || '?';
        console.log(`[BongShare DL] Part ${partNum} response: status=${response.status} ok=${response.ok} content-type="${ct}" content-length=${cl}`);
        if (!response.ok) {
          const body = await response.text();
          console.error(`[BongShare DL] ❌ Part ${partNum} HTTP ${response.status}. Body: ${body.slice(0, 300)}`);
          if (attempt === 2) throw new Error(`Part ${partNum} failed: HTTP ${response.status} — ${body.slice(0, 120)}`);
          continue;
        }
        if (ct.includes('text/html')) {
          const body = await response.text();
          console.error(`[BongShare DL] ❌ Part ${partNum} got HTML (bot block?). Snippet: ${body.slice(0, 300)}`);
          if (attempt === 2) throw new Error(`Part ${partNum} — filebin returned HTML page. Link expired or blocked.`);
          continue;
        }
        console.log(`[BongShare DL] ✅ Part ${partNum} fetch OK, streaming bytes…`);
        return response;
      } catch (fetchErr: any) {
        console.error(`[BongShare DL] ❌ Part ${partNum} fetch threw:`, fetchErr.message);
        if (attempt === 2) throw fetchErr;
      }
    }
    throw new Error(`Part ${partNum} failed after 3 attempts`);
  };


  const handleChunkedDownload = async () => {
    const isFilebin = !!(binId && chunkNames && chunkNames.length > 0);
    const totalParts = isFilebin ? chunkNames!.length : (chunkUrls?.length ?? 0);
    if (totalParts === 0) return;

    const getChunkUrl = (i: number) =>
      isFilebin
        ? filebinDlUrl(chunkNames![i], fileName)
        : chunkUrls![i];

    // DEBUG: print all chunk URLs and config so we can paste to diagnose
    console.log('[BongShare DL] 🚀 Starting download:', {
      fileName, fileSize, totalParts, binId,
      chunkNames,
      proxyBase: (import.meta.env.VITE_FILEBIN_PROXY_BASE || '(none)'),
      chunk0url: totalParts > 0 ? getChunkUrl(0) : '(none)',
      hasSaveFilePicker: 'showSaveFilePicker' in window,
    });


    setChunkActive(true);
    setChunkProgress(0);
    setChunkPhase('Preparing download…');
    setDownloadDone(false);
    setSavedViaStream(false);
    setDownloadSpeed(0);
    setTotalDownloaded(0);
    // Initialize segment progress: all zeros
    setSegmentProgress(new Array(totalParts).fill(0));
    const startTime = Date.now();
    let totalBytesDownloaded = 0;
    // Expected bytes per chunk (80MB except last which may be smaller)
    const CHUNK_SIZE = 80 * 1024 * 1024;
    const expectedChunkSizes = Array.from({ length: totalParts }, (_, i) => {
      if (i < totalParts - 1) return CHUNK_SIZE;
      // last chunk: remainder
      const remainder = fileSize % CHUNK_SIZE;
      return remainder === 0 ? CHUNK_SIZE : remainder;
    });

    try {
      if ('showSaveFilePicker' in window) {
        // ── STREAMING PATH (Chrome/Edge) — zero RAM, works for 100GB+ ──
        // Pre-fetch next chunk while writing current one for speed overlap
        const fileHandle = await (window as any).showSaveFilePicker({ suggestedName: fileName });
        const writable = await fileHandle.createWritable();
        let streamSuccess = false;
        try {
          let prefetched: Promise<Response> | null = null;
          for (let i = 0; i < totalParts; i++) {
            setChunkPhase(`Downloading ${formatBytes(totalBytesDownloaded)} / ${formatBytes(fileSize)}`);
            // Use pre-fetched response or fetch fresh
            const response = prefetched
              ? await prefetched
              : await fetchChunkWithRetry(getChunkUrl(i), i + 1, totalParts);
            // Pre-fetch next chunk NOW (overlap network + disk write)
            prefetched = (i + 1 < totalParts)
              ? fetchChunkWithRetry(getChunkUrl(i + 1), i + 2, totalParts)
              : null;
            if (!response.body) throw new Error(`Part ${i + 1} — server returned empty body. Try again.`);
            const reader = response.body.getReader();
            let chunkBytes = 0;
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              await writable.write(value);
              totalBytesDownloaded += value.byteLength;
              chunkBytes += value.byteLength;
              const segPct = Math.min(100, Math.round((chunkBytes / expectedChunkSizes[i]) * 100));
              setSegmentProgress(prev => { const next = [...prev]; next[i] = segPct; return next; });
              const elapsed = (Date.now() - startTime) / 1000;
              if (elapsed > 0.5) setDownloadSpeed(totalBytesDownloaded / elapsed);
              setTotalDownloaded(totalBytesDownloaded);
            }
            setSegmentProgress(prev => { const next = [...prev]; next[i] = 100; return next; });
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = totalBytesDownloaded / elapsed;
            const remaining = fileSize > 0 ? Math.max(0, (fileSize - totalBytesDownloaded) / speed) : 0;
            setChunkProgress(Math.round(((i + 1) / totalParts) * 100));
            setChunkPhase(`${formatBytes(totalBytesDownloaded)} / ${formatBytes(fileSize)} · ${formatBytes(speed)}/s · ~${formatDuration(remaining)} left`);
          }
          await writable.close();
          streamSuccess = true;
          const totalTime = (Date.now() - startTime) / 1000;
          const avgSpeed = totalBytesDownloaded / totalTime;
          setChunkPhase(`✅ ${formatBytes(fileSize)} saved · ${formatDuration(totalTime)} · avg ${formatBytes(avgSpeed)}/s`);
          setSavedViaStream(true);
          setDownloadDone(true);
        } finally {
          if (!streamSuccess) {
            try { await writable.abort(); } catch { /* ignore */ }
          }
        }
      } else {
        // ── MEMORY BUFFER PATH (Firefox / Safari) — parallel download (3 concurrent) ──
        const CONCURRENT = 3;
        const results: Blob[] = new Array(totalParts);
        let completedChunks = 0;

        const downloadOneChunk = async (idx: number) => {
          setChunkPhase(`Downloading ${formatBytes(totalBytesDownloaded)} / ${formatBytes(fileSize)}`);
          const response = await fetchChunkWithRetry(getChunkUrl(idx), idx + 1, totalParts);
          const blob = await response.blob();
          if (blob.size < 1024 && fileSize > 10000) {
            throw new Error(`Part ${idx + 1} returned 0 bytes — server or network issue.`);
          }
          results[idx] = blob;
          totalBytesDownloaded += blob.size;
          completedChunks++;
          setSegmentProgress(prev => { const next = [...prev]; next[idx] = 100; return next; });
          setTotalDownloaded(totalBytesDownloaded);
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0.5) setDownloadSpeed(totalBytesDownloaded / elapsed);
          const speed = elapsed > 0 ? totalBytesDownloaded / elapsed : 0;
          const remaining = speed > 0 ? (fileSize - totalBytesDownloaded) / speed : 0;
          setChunkProgress(Math.round((completedChunks / totalParts) * 100));
          setChunkPhase(`${formatBytes(totalBytesDownloaded)} / ${formatBytes(fileSize)} · ${formatBytes(speed)}/s · ~${formatDuration(remaining)} left`);
        };

        // Worker pool: N workers pull from a shared queue
        const queue = Array.from({ length: totalParts }, (_, i) => i);
        const workers = Array.from({ length: Math.min(CONCURRENT, totalParts) }, async () => {
          while (queue.length > 0) {
            const idx = queue.shift()!;
            await downloadOneChunk(idx);
          }
        });
        await Promise.all(workers);

        setChunkPhase('Merging…');
        const merged = new Blob(results);
        const url = URL.createObjectURL(merged);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
        const totalTime = (Date.now() - startTime) / 1000;
        const avgSpeed = totalBytesDownloaded / totalTime;
        setChunkPhase(`✅ ${formatBytes(fileSize)} saved · ${formatDuration(totalTime)} · avg ${formatBytes(avgSpeed)}/s`);
        setDownloadDone(true);
      }
    } catch (err: any) {
      setChunkPhase(`❌ ${err.message}`);
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
        title={`Download ${fileName} | BongShare`}
        description={`Download ${fileName} (${formatBytes(fileSize)}) — shared via BongShare by Bong Bari.`}
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
            <h1 className="text-base sm:text-lg font-extrabold tracking-tighter text-white whitespace-nowrap">Bong<span style={{ color: '#f0c12c' }}>Share</span></h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-1" style={{ background: 'rgba(240,193,44,0.06)', border: '1px solid rgba(240,193,44,0.15)' }}>
              <Zap className="w-2.5 h-2.5 shrink-0" style={{ color: '#f0c12c' }} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: '#f0c12c' }}>Premium Transfer</span>
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
                      disabled={zipActive}
                      className="w-full h-11 rounded-xl font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00', boxShadow: '0 4px 20px rgba(240,193,44,0.25)' }}
                    >
                      <Archive className="w-4 h-4" />
                      {zipActive ? `Packaging… ${zipProgress}%` : 'Download All as ZIP'}
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
                      {/* Info banner — no mention of "parts" or "chunks" to user */}
                      {!downloadDone && !chunkActive && (
                        <div className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                          <Clock className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                          <p className="text-[11px] font-medium" style={{ color: '#fbbf24' }}>Link valid for <strong>6 days</strong> — download before it expires!</p>
                        </div>
                      )}
                      {/* Active download: segmented progress bar */}
                      {chunkActive && segmentProgress.length > 0 && (
                        <div className="w-full flex flex-col gap-2">
                          {/* Speed + size info */}
                          <div className="flex justify-between items-center text-[10px] font-mono" style={{ color: 'rgba(64,206,237,0.7)' }}>
                            <span>{chunkPhase}</span>
                            {downloadSpeed > 0 && <span>{formatBytes(downloadSpeed)}/s</span>}
                          </div>
                          {/* Segmented progress bar — one segment per chunk */}
                          <div className="w-full flex gap-[2px] h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            {segmentProgress.map((pct, idx) => (
                              <div
                                key={idx}
                                className="h-full relative overflow-hidden"
                                style={{
                                  flex: 1,
                                  borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === segmentProgress.length - 1 ? '0 9999px 9999px 0' : '0',
                                }}
                              >
                                {/* Segment background (dark) */}
                                <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.03)' }} />
                                {/* Segment fill */}
                                <div
                                  className="absolute inset-y-0 left-0 transition-all duration-200"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct >= 100
                                      ? 'linear-gradient(135deg, #10b981, #34d399)'
                                      : pct > 0
                                        ? 'linear-gradient(135deg, #40ceed, #3b82f6)'
                                        : 'transparent',
                                    boxShadow: pct > 0 && pct < 100 ? '0 0 8px rgba(64,206,237,0.4)' : 'none',
                                  }}
                                />
                                {/* Thin separator line between segments */}
                                {idx < segmentProgress.length - 1 && (
                                  <div className="absolute top-0 right-0 w-[1px] h-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Overall percentage */}
                          <div className="flex justify-between items-center text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            <span>{formatBytes(totalDownloaded)} / {formatBytes(fileSize)}</span>
                            <span>{chunkProgress}%</span>
                          </div>
                        </div>
                      )}
                      {/* Download complete state */}
                      {downloadDone && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full flex flex-col gap-2.5"
                        >
                          {/* Success banner */}
                          <div className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: '#10b981' }} />
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold" style={{ color: '#34d399' }}>Download complete</p>
                              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(110,231,183,0.6)' }}>
                                {chunkPhase.replace('✅ ', '')}
                              </p>
                            </div>
                          </div>
                          {/* Tip: where to find the file */}
                          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(64,206,237,0.05)', border: '1px solid rgba(64,206,237,0.1)' }}>
                            <HardDrive className="w-3.5 h-3.5 shrink-0" style={{ color: '#40ceed' }} />
                            <p className="text-[10px]" style={{ color: 'rgba(64,206,237,0.6)' }}>
                              {savedViaStream
                                ? <>File saved to your chosen location &middot; <strong>{fileName}</strong></>
                                : <>Check your <strong>Downloads</strong> folder for <strong>{fileName}</strong></>}
                            </p>
                          </div>
                          {/* Completed segmented bar (all green) */}
                          <div className="w-full flex gap-[2px] h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {segmentProgress.map((_, idx) => (
                              <div key={idx} className="h-full" style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #34d399)', borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === segmentProgress.length - 1 ? '0 9999px 9999px 0' : '0' }} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {/* Download button (hidden when done) */}
                      {!downloadDone && (
                        <button onClick={handleChunkedDownload} disabled={chunkActive}
                          className="w-full h-13 sm:h-14 rounded-xl font-extrabold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #f0c12c, #e69520)', color: '#3d2e00' }}>
                          <Download className="w-5 h-5" />
                          {chunkActive ? `${chunkProgress}% · ${formatBytes(downloadSpeed)}/s` : 'Download Now'}
                        </button>
                      )}
                      {/* Download again button (shown when done) */}
                      {downloadDone && (
                        <button
                          onClick={() => { setDownloadDone(false); setChunkProgress(0); setSegmentProgress([]); handleChunkedDownload(); }}
                          className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.97]"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                          <Download className="w-4 h-4" />
                          Download Again
                        </button>
                      )}
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

        {/* ── JOKE TICKER — one-at-a-time fade animation ── */}
        <DownloadJokeTickerBar />

        {/* ── FLOATING FAB: Send Yours — circle with pulse ring ── */}
        <div className="fixed bottom-20 right-5 z-50 flex flex-col items-center">
          {/* Tooltip (above circle) */}
          <AnimatePresence>
            {fabHovered && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mb-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ background: 'rgba(20,20,20,0.95)', color: '#f0c12c', border: '1px solid rgba(240,193,44,0.2)' }}
              >
                Send Yours
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                  style={{ background: 'rgba(20,20,20,0.95)', borderRight: '1px solid rgba(240,193,44,0.2)', borderBottom: '1px solid rgba(240,193,44,0.2)' }} />
              </motion.div>
            )}
          </AnimatePresence>
          {/* Circle button */}
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            onMouseEnter={() => setFabHovered(true)}
            onMouseLeave={() => setFabHovered(false)}
            onClick={() => setLocation('/tools/share')}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #f0c12c, #e69520)',
              color: '#3d2e00',
              boxShadow: '0 8px 30px rgba(240,193,44,0.45), 0 2px 10px rgba(0,0,0,0.5)',
              animation: 'fab-pulse-ring 2.5s ease-out infinite',
            }}
          >
            <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>
        </div>

        {/* ── Info "?" FAB + Full-screen Panel ── */}
        <BongShareInfoButton onClick={() => setInfoOpen(true)} />
        <BongShareInfoPanel isOpen={infoOpen} onClose={() => setInfoOpen(false)} />

        {/* ── FOOTER — clean branding only ── */}
        <footer className="flex-none flex items-center justify-center px-4 py-2 border-t relative z-10"
          style={{ borderColor: 'rgba(240,193,44,0.04)', background: 'rgba(10,10,11,0.95)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase" style={{ color: 'rgba(240,193,44,0.35)' }}>BongShare</span>
            <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
            <span className="text-[8px] font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.12)' }}>by Bong Bari</span>
          </div>
        </footer>

      </div>
    </>
  );
};

export default BongShareDownload;
