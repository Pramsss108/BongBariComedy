import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SEOHead } from '@/components/SEOHead';
import {
  Upload,
  FileText,
  Copy,
  CheckCircle2,
  ExternalLink,
  ArrowLeft,
  X,
  ShieldCheck,
  Zap,
  Link2,
  RotateCcw,
  Wifi,
  Globe,
  Users,
  Lock,
  Eye,
  EyeOff,
  Signal,
  Clock,
  Infinity as InfinityIcon,
  Radio,
  Save,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBestServer, uploadFileWithProgress, uploadFileViaServer, uploadToFilebin, uploadMultipleToFilebin, buildBongBariShareUrl, buildBongBariFilebinUrl, buildBongBariBundleUrl, type ShareHost, type ChunkUploadProgress } from '@/lib/gofile-engine';
import { createSender, buildP2PShareUrl, createLocalSender, connectToLocalSender, type P2PStatus } from '@/lib/p2p-engine';
import { BongShareInfoPanel, BongShareInfoButton } from '@/components/BongShareInfoPanel';
import { getDeviceName, isMobileDevice, getDeviceType } from '@/lib/device-names';
import QRCode from 'qrcode';
/* ── Comedy one-liners ── */
const IDLE_JOKES = [
  '"Drag koro, drop koro, life e first time kichu koro." 🫠',
  '"File ta eto boro je WhatsApp boleche — NO." 😤',
  '"Tomar 4GB meme folder? Amra ready." 💪',
  '"Pendrive khojar age ekhane try koro." 🔌',
  '"Upload koro — judge korbo na." 🙈',
  '"Google Drive boleche 15GB shesh. Amra bolchi — chill." ☕',
  '"Eto file pathao je postman-o lojja pay." 📦',
];
const UPLOAD_JOKES = [
  '"Uploading… chai er cup ta niye esho." ☕',
  '"Tor internet er speed dekhe rickshaw-o hasche." 🛺',
  '"Relax. Amra tomar ex ke pathacchi na, file pathacchi." 😏',
  '"Uploading eto fast je tui refresh marar agei hobe." ⚡',
  '"Bong Bari server gulaan gym kore — heavy lifting expert." 🏋️',
];
const SUCCESS_JOKES = [
  '"Done! Ebar link ta pathiye bondhur kache credit nao." 🏆',
  '"Upload complete — tui official tech-savvy." 🤓',
  '"Link ready. Tor baba-o impress hobe." 👨‍👦',
  '"Mission accomplished. James Bond-o parto na." 🕶️',
  '"Ekhon share koro. Baki karma." 🎬',
];
const P2P_JOKES = [
  '"Tor browser theke or browser e — middleman nai." 🤝',
  '"Direct line. Jemon Kolkatar tram — straight jae." 🚋',
  '"Server ke bolechi — tui bos, amra nijei korbo." 😎',
  '"Browser-to-browser. Postman-er chakri gelo." 📬',
  '"Zero server. Maximum privacy. Bong Bari style." 🔒',
];
const LOCAL_JOKES = [
  '"Same WiFi? Same vibe. File ta chole gelo." 📡',
  '"LAN speed e pathacchi — Jio fiber-o jealous." ⚡',
  '"Tor pasher phone e direct — no internet needed." 🏠',
  '"Hotspot jog koro, code dao, done. Simple." 🔌',
  '"Local e pathao, global e flex koro." 💪',
];

type ShareMode = 'pick' | 'p2p' | 'link' | 'local-send' | 'local-receive';
type TransferStatus = 'idle' | 'uploading' | 'success' | 'error';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ── Premium card style (ultra-subtle dark) ── */
const glassStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
} as const;

/* ── Joke Ticker — one-at-a-time fade animation ── */
const JokeTickerBar = ({ mode, linkStatus }: { mode: string; linkStatus: string }) => {
  const jokes = useMemo(() => {
    if (mode === 'local-send' || mode === 'local-receive') return LOCAL_JOKES;
    if (mode === 'p2p') return P2P_JOKES;
    if (mode === 'link' && linkStatus === 'uploading') return UPLOAD_JOKES;
    if (mode === 'link' && linkStatus === 'success') return SUCCESS_JOKES;
    return IDLE_JOKES;
  }, [mode, linkStatus]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    setIdx(0);
  }, [jokes]);
  useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % jokes.length), 6000);
    return () => clearInterval(timer);
  }, [jokes.length]);

  return (
    <div className="flex-none w-full overflow-hidden relative z-10 select-none flex items-center justify-center"
      style={{ height: '32px', borderTop: '1px solid rgba(240,193,44,0.04)', background: 'rgba(8,8,10,0.95)' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${jokes === IDLE_JOKES ? 'idle' : mode}-${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5 }}
          className="text-[11px] sm:text-[12px] font-medium tracking-wide text-center px-4"
          style={{ color: 'rgba(240,193,44,0.35)', textShadow: '0 0 8px rgba(240,193,44,0.08)' }}
        >
          {jokes[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

/* ================================================================
   COMPONENT — Single viewport, zero scroll, dual-mode
   ================================================================ */
const BongShare = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* ── File state ── */
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  // For backwards-compat with single-file path references:
  const file = files[0] ?? null;

  /* ── Info panel ── */
  const [infoOpen, setInfoOpen] = useState(false);

  /* ── Mode selection ── */
  const [mode, setMode] = useState<ShareMode>('pick');

  /* ── Link mode state ── */
  const [linkStatus, setLinkStatus] = useState<TransferStatus>('idle');
  const [linkProgress, setLinkProgress] = useState(0);
  const [shareLink, setShareLink] = useState('');

  /* ── P2P mode state ── */
  const [p2pStatus, setP2pStatus] = useState<P2PStatus>('idle');
  const [p2pProgress, setP2pProgress] = useState(0);
  const [p2pLink, setP2pLink] = useState('');
  const senderRef = useRef<{ destroy: () => void } | null>(null);

  /* ── Local transfer state ── */
  const [receiveCode, setReceiveCode] = useState('');
  const [localCode, setLocalCode] = useState('');
  const [localStatus, setLocalStatus] = useState<P2PStatus>('idle');
  const [localProgress, setLocalProgress] = useState(0);
  const [localFileName, setLocalFileName] = useState('');
  const [localBlob, setLocalBlob] = useState<Blob | null>(null);
  const localSenderRef = useRef<{ destroy: () => void } | null>(null);
  const localReceiverRef = useRef<{ destroy: () => void } | null>(null);

  /* ── QR code for local sender (E.1) ── */
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    if (!localCode) { setQrDataUrl(''); return; }
    const url = `https://www.bongbari.com/tools/share?local=${localCode}`;
    QRCode.toDataURL(url, { width: 160, margin: 1, color: { dark: '#f0c12c', light: '#00000000' } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [localCode]);

  /* ── OTP-style digit refs for receiver (E.7) ── */
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);

  /* ── Device info (E.4 + E.5) ── */
  const myDeviceName = useMemo(() => getDeviceName(), []);
  const myDeviceType = useMemo(() => getDeviceType(), []);
  const mobile = useMemo(() => isMobileDevice(), []);

  /* ── Auto-fill from URL ?local=XXXXXX (E.2) ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const localParam = params.get('local');
    if (localParam && /^\d{6}$/.test(localParam)) {
      setReceiveCode(localParam);
      setOtpDigits(localParam.split(''));
      // Auto-connect after a short delay
      setTimeout(() => {
        setMode('local-receive');
        setLocalStatus('idle');
        setLocalProgress(0);
        setLocalFileName('');
        setLocalBlob(null);
        const receiver = connectToLocalSender(
          localParam,
          (status) => setLocalStatus(status),
          (pct) => setLocalProgress(pct),
          (blob, name) => { setLocalBlob(blob); setLocalFileName(name); },
        );
        localReceiverRef.current = receiver;
      }, 300);
      // Clean up URL param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  /* ── Your residential proxy IP ── */
  const [userIp, setUserIp] = useState<string | null>(null);
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then((d: { ip: string }) => setUserIp(d.ip))
      .catch(() => {});
  }, []);

  /* ── Drag & drop ── */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const picked = Array.from(e.dataTransfer.files);
    if (picked.length > 0) { setFiles(picked); setMode('pick'); resetAll(); }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) { setFiles(prev => { const merged = [...prev, ...picked]; resetAll(); return merged; }); setMode('pick'); }
  };

  function resetAll() {
    setLinkStatus('idle'); setLinkProgress(0); setShareLink(''); setUsedHost(null); setFileProgresses([]); setChunkInfo(null);
    setP2pStatus('idle'); setP2pProgress(0); setP2pLink('');
    senderRef.current?.destroy(); senderRef.current = null;
    setLocalCode(''); setLocalStatus('idle'); setLocalProgress(0); setLocalFileName(''); setLocalBlob(null); setReceiveCode('');
    localSenderRef.current?.destroy(); localSenderRef.current = null;
    localReceiverRef.current?.destroy(); localReceiverRef.current = null;
  }

  const removeFile = (idx?: number) => {
    if (idx !== undefined) {
      setFiles(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setMode('pick'); resetAll();
  };

  /* ── Link mode: upload status label ── */
  const [uploadPhase, setUploadPhase] = useState<string>('');
  const [usedHost, setUsedHost] = useState<ShareHost | null>(null);
  /** Per-file upload progress (0-100), only used for multi-file bundles */
  const [fileProgresses, setFileProgresses] = useState<number[]>([]);
  /** Detailed chunk upload info for single-file uploads */
  const [chunkInfo, setChunkInfo] = useState<ChunkUploadProgress | null>(null);

  /* ── Link mode: upload (filebin.net — handles ANY mix of files/sizes) ── */
  const handleLinkUpload = async () => {
    if (files.length === 0) return;
    setMode('link');
    setLinkStatus('uploading');
    setLinkProgress(0);
    setUploadPhase('Connecting to file server…');

    try {
      // ── MULTI-FILE BUNDLE: 2 or more files ──
      if (files.length > 1) {
        setFileProgresses(new Array(files.length).fill(0));
        const totalChunks = files.reduce(
          (sum, f) => sum + Math.ceil(f.size / (80 * 1024 * 1024)), 0,
        );
        setUploadPhase(
          `Bundling ${files.length} files (${totalChunks} part${totalChunks !== 1 ? 's' : ''})…`,
        );
        const { binId, manifest } = await uploadMultipleToFilebin(
          files,
          (p) => setLinkProgress(p),
          (fileIdx, p) => {
            setFileProgresses(prev => {
              const next = [...prev];
              next[fileIdx] = p;
              return next;
            });
            setUploadPhase(`Uploading ${files[fileIdx]?.name ?? ''}…`);
          },
        );
        const brandedUrl = buildBongBariBundleUrl(binId, totalSize, manifest);
        setShareLink(brandedUrl);
        setUsedHost('filebin-bundle');
        setLinkStatus('success');
        setUploadPhase('');
        toast({
          title: 'Bundle ready!',
          description: `${files.length} files packaged — link active for 6 days!`,
        });
        return;
      }

      // ── SINGLE FILE: filebin chunked ──
      const singleFile = files[0];
      try {
        const totalChunks = Math.ceil(singleFile.size / (80 * 1024 * 1024));
        setUploadPhase(totalChunks > 1 ? `Splitting into ${totalChunks} parts…` : 'Uploading file…');
        setChunkInfo(null);
        const { binId, chunkNames } = await uploadToFilebin(
          singleFile,
          (p) => setLinkProgress(p),
          (info) => {
            setChunkInfo(info);
            if (totalChunks > 1) {
              if (info.isRetry) {
                setUploadPhase(`Retrying part ${info.chunkIndex + 1} of ${totalChunks} (attempt ${info.retryAttempt + 1})…`);
              } else {
                setUploadPhase(`Uploading part ${info.chunkIndex + 1} of ${totalChunks}…`);
              }
            } else {
              setUploadPhase('Uploading file…');
            }
          },
        );
        const brandedUrl = buildBongBariFilebinUrl(binId, chunkNames, singleFile.name, singleFile.size);
        setShareLink(brandedUrl);
        setUsedHost('filebin');
        setLinkStatus('success');
        setUploadPhase('');
        toast({
          title: 'Ready to share!',
          description: totalChunks > 1
            ? `Split into ${totalChunks} parts — link active for 6 days!`
            : 'Link generated — active for 6 days!',
        });
        return;
      } catch (filebinErr: any) {
        console.warn('[BongShare] filebin failed, trying GoFile fallback:', filebinErr.message);
        setLinkProgress(0);
      }

      // ── GoFile fallback (if filebin unreachable) ──
      let data: Awaited<ReturnType<typeof uploadFileWithProgress>>;
      try {
        setUploadPhase('Uploading file…');
        const server = await getBestServer();
        data = await uploadFileWithProgress(singleFile, server, (p) => setLinkProgress(p));
      } catch (directErr: any) {
        console.warn('[BongShare] Direct GoFile failed, trying VPS proxy:', directErr.message);
        setLinkProgress(0);
        setUploadPhase('Finalizing upload on server…');
        data = await uploadFileViaServer(singleFile, (p) => setLinkProgress(p));
      }
      const gofileCode = data.code || data.parentFolderCode || data.downloadPage?.split('/d/').pop() || '';
      if (!gofileCode) throw new Error('Upload succeeded but no download code received');
      setUsedHost('gofile');
      const brandedUrl = buildBongBariShareUrl(gofileCode, singleFile.name, singleFile.size, 'gofile');
      setShareLink(brandedUrl);
      setLinkStatus('success');
      setUploadPhase('');
      toast({ title: 'Ready to share!', description: 'Link generated — copy it below.' });
    } catch (err: any) {
      setLinkStatus('error');
      setUploadPhase('');
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Something went wrong.' });
    }
  };

  /* ── P2P mode: WebRTC sender (single file only) ── */
  const handleP2PStart = () => {
    if (!file) return;  // P2P supports one file at a time
    setMode('p2p');
    setP2pStatus('idle');
    setP2pProgress(0);
    setP2pLink('');

    const sender = createSender(
      file,
      (peerId) => {
        const url = buildP2PShareUrl(peerId, file.name, file.size);
        setP2pLink(url);
      },
      (status) => setP2pStatus(status),
      (pct) => setP2pProgress(pct),
    );
    senderRef.current = sender;
  };

  /* ── Local Transfer: send via 6-digit pairing code ── */
  const handleLocalSend = () => {
    if (!file) return;
    setMode('local-send');
    setLocalStatus('idle');
    setLocalProgress(0);
    setLocalCode('');
    const sender = createLocalSender(
      file,
      (status) => setLocalStatus(status),
      (pct) => setLocalProgress(pct),
    );
    setLocalCode(sender.code);
    localSenderRef.current = sender;
  };

  /* ── Local Transfer: receive by entering code ── */
  const handleLocalReceive = () => {
    if (receiveCode.length !== 6) return;
    setMode('local-receive');
    setLocalStatus('idle');
    setLocalProgress(0);
    setLocalFileName('');
    setLocalBlob(null);
    const receiver = connectToLocalSender(
      receiveCode,
      (status) => setLocalStatus(status),
      (pct) => setLocalProgress(pct),
      (blob, name) => { setLocalBlob(blob); setLocalFileName(name); },
    );
    localReceiverRef.current = receiver;
  };

  const saveLocalFile = () => {
    if (!localBlob || !localFileName) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(localBlob);
    a.download = localFileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Cleanup on unmount
  useEffect(() => () => { senderRef.current?.destroy(); localSenderRef.current?.destroy(); localReceiverRef.current?.destroy(); }, []);

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
  };

  const isTransferring = mode === 'link' && (linkStatus === 'uploading' || linkStatus === 'success');
  const isP2PActive = mode === 'p2p';
  const hasFiles = files.length > 0;

  /* ── P2P status label ── */
  const p2pStatusText = {
    idle: 'Loading P2P Engine…',
    waiting: 'Waiting for receiver to connect…',
    connecting: 'Receiver connecting…',
    transferring: `Sending… ${p2pProgress}%`,
    complete: 'Transfer Complete!',
    error: 'Connection failed — try again.',
  };

  /* ── Local status label ── */
  const localStatusText: Record<P2PStatus, string> = {
    idle: 'Setting up local channel…',
    waiting: 'Waiting for receiver to enter code…',
    connecting: mode === 'local-receive' ? 'Connecting to sender…' : 'Receiver connecting…',
    transferring: mode === 'local-receive' ? `Receiving… ${localProgress}%` : `Sending… ${localProgress}%`,
    complete: 'Transfer Complete!',
    error: 'Connection failed — check code & WiFi.',
  };

  return (
    <>
      <SEOHead
        title="BongShare | The Ethereal Terminal"
        description="Premium file sharing by Bong Bari. P2P or Link — send anything. No stress."
        url="https://www.bongbari.com/tools/share"
      />

      <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#08080a', fontFamily: 'Manrope, sans-serif' }}>
        {/* Ambient orbs */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.035]" style={{ background: 'radial-gradient(circle, #f0c12c, transparent 70%)' }} />
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #40ceed, transparent 70%)' }} />
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
        </div>
        {/* Subtle grid pattern */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* ── HEADER ── */}
        <header className="flex-none w-full h-12 sm:h-14 flex justify-between items-center px-4 sm:px-6 md:px-8 relative z-30 select-none" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setLocation('/tools')} className="shrink-0 p-1.5 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-white/30 hover:text-white/60" aria-label="Back to tools">
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">Bong<span style={{ color: '#f0c12c' }}>Share</span></h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-[0.15em]" style={{ background: 'rgba(240,193,44,0.06)', color: '#f0c12c', border: '1px solid rgba(240,193,44,0.1)' }}>
                <Zap className="w-2.5 h-2.5" /> Premium
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userIp && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-mono" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400/50">{userIp}</span>
              </div>
            )}
            <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/15 hidden sm:block">Send anything</span>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 sm:px-6 md:px-8 relative z-10 min-h-0 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">

            {/* ===== SCREEN 1: LANDING (no files yet) ===== */}
            {!hasFiles && mode !== 'local-receive' && (
              <motion.section key="dropzone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }} className="w-full flex flex-col gap-5 py-4">

                {/* ── Drop zone — compact premium ── */}
                <div
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative w-full rounded-2xl transition-all duration-500 flex flex-col items-center justify-center py-10 sm:py-14 px-6 cursor-pointer overflow-hidden ${
                    isDragging
                      ? 'ring-2 ring-[#f0c12c]/40 bg-[#f0c12c]/[0.04]'
                      : 'hover:bg-white/[0.015]'
                  }`}
                  style={{ background: isDragging ? undefined : 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 0 80px rgba(240,193,44,0.02) inset' }}
                >
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                  <div className="relative z-[5] flex flex-col items-center text-center">
                    <motion.div
                      animate={{ y: isDragging ? -4 : 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                      style={{ background: 'rgba(240,193,44,0.06)', border: '1px solid rgba(240,193,44,0.1)', boxShadow: '0 8px 32px rgba(240,193,44,0.06)' }}
                    >
                      <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-[#f0c12c]" />
                    </motion.div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2 leading-tight">
                      Drop files to <span className="text-[#f0c12c]">share</span>
                    </h2>
                    <p className="text-white/30 text-xs sm:text-sm max-w-sm font-medium leading-relaxed">
                      Videos, documents, anything — up to 10 GB per file
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-[9px] uppercase tracking-widest font-bold text-white/15">
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Encrypted</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Fast CDN</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 6 day links</span>
                    </div>
                  </div>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(240,193,44,0.04), transparent 70%)' }} />
                  </div>
                </div>

                {/* ── Quick actions row ── */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* 1. Send Local */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden text-left"
                    style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.08)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.08)' }}>
                        <Radio className="w-4 h-4 text-[#a78bfa]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white leading-tight">Local</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#a78bfa]/60 font-bold">WiFi · Hotspot</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed hidden sm:block">Phone ↔ PC, same network</p>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(167,139,250,0.04), transparent 60%)' }} />
                  </button>

                  {/* 2. P2P */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden text-left"
                    style={{ background: 'rgba(64,206,237,0.04)', border: '1px solid rgba(64,206,237,0.08)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(64,206,237,0.08)' }}>
                        <Wifi className="w-4 h-4 text-[#40ceed]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white leading-tight">P2P</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#40ceed]/60 font-bold">Zero server</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed hidden sm:block">Browser to browser, E2E</p>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(64,206,237,0.04), transparent 60%)' }} />
                  </button>

                  {/* 3. Receive a file */}
                  <div
                    className="group relative rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5 transition-all duration-300 overflow-hidden text-left"
                    style={{ background: 'rgba(240,193,44,0.04)', border: '1px solid rgba(240,193,44,0.08)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(240,193,44,0.08)' }}>
                        <Save className="w-4 h-4 text-[#f0c12c]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white leading-tight">Receive</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#f0c12c]/60 font-bold">Enter code</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={`landing-otp-${i}`}
                          ref={el => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '');
                            if (!v && !digit) return;
                            const newDigits = [...otpDigits];
                            newDigits[i] = v.slice(-1);
                            setOtpDigits(newDigits);
                            const code = newDigits.join('');
                            setReceiveCode(code);
                            if (v && i < 5) otpRefs.current[i + 1]?.focus();
                            if (code.length === 6 && newDigits.every(d => d !== '')) {
                              setTimeout(() => {
                                setMode('local-receive');
                                setLocalStatus('idle');
                                setLocalProgress(0);
                                setLocalFileName('');
                                setLocalBlob(null);
                                const receiver = connectToLocalSender(
                                  code,
                                  (status) => setLocalStatus(status),
                                  (pct) => setLocalProgress(pct),
                                  (blob, name) => { setLocalBlob(blob); setLocalFileName(name); },
                                );
                                localReceiverRef.current = receiver;
                              }, 200);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
                              otpRefs.current[i - 1]?.focus();
                            }
                          }}
                          className="w-6 h-8 sm:w-7 sm:h-9 text-center text-xs font-mono font-extrabold rounded-md outline-none transition-all focus:ring-1 focus:ring-[#f0c12c]/40"
                          style={{
                            background: digit ? 'rgba(240,193,44,0.1)' : 'rgba(255,255,255,0.02)',
                            border: digit ? '1px solid rgba(240,193,44,0.25)' : '1px solid rgba(255,255,255,0.04)',
                            color: '#f0c12c',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 2: MODE SELECTION (files picked, choose mode) ===== */}
            {hasFiles && mode === 'pick' && (
              <motion.section key="mode-pick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="w-full flex flex-col gap-4">

                {/* ── File chips + summary bar ── */}
                <div className="rounded-xl p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-0.5 mb-3" style={{ scrollbarWidth: 'thin' }}>
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1 transition-colors hover:bg-white/[0.03]" style={{ background: 'rgba(64,206,237,0.04)', border: '1px solid rgba(64,206,237,0.08)' }}>
                        <FileText className="w-3 h-3 text-[#40ceed]/60 shrink-0" />
                        <span className="text-[10px] text-white/80 font-semibold max-w-[100px] truncate">{f.name}</span>
                        <span className="text-[9px] text-white/20 shrink-0">{formatBytes(f.size)}</span>
                        <button onClick={() => removeFile(idx)} className="ml-0.5 w-3.5 h-3.5 rounded flex items-center justify-center hover:bg-white/10 text-white/20 hover:text-white/60 transition-all shrink-0">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                        {files.length === 1 ? '1 file' : `${files.length} files`} · {formatBytes(totalSize)}
                      </span>
                      {files.length > 1 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#f0c12c]/08 text-[#f0c12c]/70 font-bold uppercase tracking-wider" style={{ border: '1px solid rgba(240,193,44,0.12)' }}>Bundle</span>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#40ceed]/60 font-bold px-2 py-1 rounded-md hover:bg-[#40ceed]/08 hover:text-[#40ceed] transition-colors"
                    >
                      <Upload className="w-3 h-3" /> Add
                    </button>
                    <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />
                  </div>
                </div>

                {/* ── Heading ── */}
                <p className="text-center text-sm sm:text-base font-extrabold text-white/80 tracking-tight">
                  How do you want to <span className="text-[#f0c12c]">send</span> {files.length > 1 ? 'them' : 'it'}?
                </p>

                {/* ── Triple mode cards — Local / P2P / Link ── */}
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Local Card (purple) */}
                  <button
                    onClick={handleLocalSend}
                    disabled={files.length > 1}
                    className={`group text-left rounded-xl p-3 sm:p-4 flex flex-col gap-2 transition-all duration-300 ${
                      files.length > 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    style={{ background: files.length > 1 ? 'rgba(255,255,255,0.01)' : 'rgba(167,139,250,0.04)', border: files.length > 1 ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(167,139,250,0.08)' }}
                    title={files.length > 1 ? 'Local supports one file at a time' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.08)' }}>
                        <Radio className="w-4 h-4 text-[#a78bfa]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-white leading-tight">Local</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#a78bfa]/50 font-bold truncate">
                          {files.length > 1 ? 'Single file' : 'Same WiFi'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/15 leading-relaxed hidden sm:block">LAN speed. No internet.</p>
                    <div className="w-full h-7 sm:h-8 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#a78bfa]/70 uppercase tracking-wider transition-colors" style={{ background: 'rgba(167,139,250,0.06)' }}>
                      <Radio className="w-3 h-3" /> Send Local
                    </div>
                  </button>

                  {/* P2P Card (cyan) */}
                  <button
                    onClick={handleP2PStart}
                    disabled={files.length > 1}
                    className={`group text-left rounded-xl p-3 sm:p-4 flex flex-col gap-2 transition-all duration-300 ${
                      files.length > 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    style={{ background: files.length > 1 ? 'rgba(255,255,255,0.01)' : 'rgba(64,206,237,0.04)', border: files.length > 1 ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(64,206,237,0.08)' }}
                    title={files.length > 1 ? 'P2P supports one file at a time' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(64,206,237,0.08)' }}>
                        <Wifi className="w-4 h-4 text-[#40ceed]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-white leading-tight">P2P</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#40ceed]/50 font-bold truncate">
                          {files.length > 1 ? 'Single file' : 'Zero server'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/15 leading-relaxed hidden sm:block">E2E encrypted, direct.</p>
                    <div className="w-full h-7 sm:h-8 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#40ceed]/70 uppercase tracking-wider transition-colors" style={{ background: 'rgba(64,206,237,0.06)' }}>
                      <Wifi className="w-3 h-3" /> Start P2P
                    </div>
                  </button>

                  {/* Generate Link Card (gold) — always enabled */}
                  <button
                    onClick={handleLinkUpload}
                    className="group text-left rounded-xl p-3 sm:p-4 flex flex-col gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'rgba(240,193,44,0.04)', border: '1px solid rgba(240,193,44,0.08)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(240,193,44,0.08)' }}>
                        <Globe className="w-4 h-4 text-[#f0c12c]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold text-white leading-tight">Link</p>
                        <p className="text-[8px] uppercase tracking-widest text-[#f0c12c]/50 font-bold truncate">
                          {files.length > 1 ? `Bundle ${files.length}` : 'Anytime'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/15 leading-relaxed hidden sm:block">
                      {files.length > 1 ? 'All files in one link.' : 'Upload & share link.'}
                    </p>
                    <div className="w-full h-7 sm:h-8 rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#f0c12c]/70 uppercase tracking-wider transition-colors" style={{ background: 'rgba(240,193,44,0.06)' }}>
                      <Zap className="w-3 h-3" /> {files.length > 1 ? 'Bundle' : 'Get Link'}
                    </div>
                  </button>
                </div>

                {/* ── "Have a receive code?" — OTP-style input (E.7) ── */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <span className="text-[8px] uppercase tracking-[0.2em] text-white/15 font-bold">or receive</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (!v && !digit) return;
                          const newDigits = [...otpDigits];
                          newDigits[i] = v.slice(-1);
                          setOtpDigits(newDigits);
                          const code = newDigits.join('');
                          setReceiveCode(code);
                          if (v && i < 5) otpRefs.current[i + 1]?.focus();
                          if (code.length === 6 && newDigits.every(d => d !== '')) {
                            setTimeout(() => {
                              setMode('local-receive');
                              setLocalStatus('idle');
                              setLocalProgress(0);
                              setLocalFileName('');
                              setLocalBlob(null);
                              const receiver = connectToLocalSender(
                                code,
                                (status) => setLocalStatus(status),
                                (pct) => setLocalProgress(pct),
                                (blob, name) => { setLocalBlob(blob); setLocalFileName(name); },
                              );
                              localReceiverRef.current = receiver;
                            }, 200);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
                            otpRefs.current[i - 1]?.focus();
                          }
                        }}
                        className="w-9 h-11 sm:w-10 sm:h-12 text-center text-lg font-mono font-extrabold rounded-lg outline-none transition-all focus:ring-1 focus:ring-[#a78bfa]/40"
                        style={{
                          background: digit ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.015)',
                          border: digit ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.04)',
                          color: '#a78bfa',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] text-white/20">
                    {mobile ? 'Or scan sender\'s QR code' : 'Enter code from sender\'s screen'}
                  </p>
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3A: P2P ACTIVE ===== */}
            {hasFiles && isP2PActive && (
              <motion.section key="p2p-active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-6 flex flex-col gap-4" style={{ background: 'rgba(64,206,237,0.02)', border: '1px solid rgba(64,206,237,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                  {/* Accent line */}
                  <div className="w-full h-px -mt-5 sm:-mt-6 rounded-t-2xl" style={{ background: 'linear-gradient(to right, transparent, rgba(64,206,237,0.3), transparent)' }} />

                  {/* File info + progress */}
                  <div className="flex items-center gap-3.5 w-full mt-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: p2pStatus === 'complete' ? 'rgba(16,185,129,0.08)' : 'rgba(64,206,237,0.06)', border: `1px solid ${p2pStatus === 'complete' ? 'rgba(16,185,129,0.15)' : 'rgba(64,206,237,0.1)'}` }}>
                      {p2pStatus === 'complete' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Wifi className="w-5 h-5 text-[#40ceed]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1.5 gap-2">
                        <span className="text-sm font-bold text-white/90 truncate">{file.name}</span>
                        <span className="text-[11px] font-bold text-[#40ceed]/80 shrink-0 font-mono">{p2pProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p2pProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #40ceed, #a78bfa)', boxShadow: '0 0 12px rgba(64,206,237,0.3)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2">
                    {p2pStatus !== 'complete' && p2pStatus !== 'error' && <div className="w-1.5 h-1.5 rounded-full bg-[#40ceed] animate-pulse" />}
                    {p2pStatus === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className={`text-[11px] font-mono ${p2pStatus === 'error' ? 'text-red-400/80' : p2pStatus === 'complete' ? 'text-emerald-400/80' : 'text-white/25'}`}>
                      {p2pStatusText[p2pStatus]}
                    </span>
                  </div>

                  {/* Share link for receiver */}
                  {p2pLink && p2pStatus !== 'complete' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-[0.15em] text-white/25 font-bold text-center">Share link with receiver</p>
                      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl min-w-0" style={{ background: 'rgba(64,206,237,0.03)', border: '1px solid rgba(64,206,237,0.08)' }}>
                        <Link2 className="w-3.5 h-3.5 text-[#40ceed]/40 shrink-0" />
                        <span className="text-[11px] font-mono text-[#40ceed]/60 truncate flex-1">{p2pLink}</span>
                        <button onClick={() => copyLink(p2pLink)} className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-white/30 hover:text-white/60 shrink-0" title="Copy Link"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}

                  {/* Security badges */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">
                      <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-emerald-500/50" /> E2E</span>
                      <span className="flex items-center gap-1"><EyeOff className="w-2.5 h-2.5 text-amber-500/50" /> Zero Server</span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">{formatBytes(totalSize)}</span>
                  </div>

                  {/* Actions */}
                  {(p2pStatus === 'complete' || p2pStatus === 'error') && (
                    <button onClick={() => removeFile()} className="w-full h-11 sm:h-12 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(64,206,237,0.12)', color: '#40ceed', border: '1px solid rgba(64,206,237,0.2)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> {p2pStatus === 'error' ? 'Try Again' : 'New Transfer'}
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3C: LOCAL SEND — radar + QR + code (E.1/E.3/E.5/E.6) ===== */}
            {hasFiles && mode === 'local-send' && (
              <motion.section key="local-send" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-6 flex flex-col gap-4" style={{ background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                  {/* Accent line */}
                  <div className="w-full h-px -mt-5 sm:-mt-6 rounded-t-2xl" style={{ background: 'linear-gradient(to right, transparent, rgba(167,139,250,0.3), transparent)' }} />

                  {/* File info + progress */}
                  <div className="flex items-center gap-3.5 w-full mt-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: localStatus === 'complete' ? 'rgba(16,185,129,0.08)' : 'rgba(167,139,250,0.06)', border: `1px solid ${localStatus === 'complete' ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.1)'}` }}>
                      {localStatus === 'complete' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Radio className="w-5 h-5 text-[#a78bfa]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1.5 gap-2">
                        <span className="text-sm font-bold text-white/90 truncate">{file?.name}</span>
                        <span className="text-[11px] font-bold text-[#a78bfa]/80 shrink-0 font-mono">{localProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${localProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #a78bfa, #f0c12c)', boxShadow: '0 0 12px rgba(167,139,250,0.3)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Radar animation + code + QR (E.6 + E.1) */}
                  {localCode && localStatus !== 'complete' && (
                    <div className="flex flex-col items-center gap-3.5">
                      {/* Radar pulse rings — only when waiting */}
                      {(localStatus === 'idle' || localStatus === 'waiting') && (
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border border-[#a78bfa]/15 animate-[radar-ping_2.5s_ease-out_infinite]" />
                          <div className="absolute inset-2 rounded-full border border-[#a78bfa]/10 animate-[radar-ping_2.5s_ease-out_0.5s_infinite]" />
                          <div className="absolute inset-4 rounded-full border border-[#a78bfa]/08 animate-[radar-ping_2.5s_ease-out_1s_infinite]" />
                          <Radio className="w-7 h-7 text-[#a78bfa]/70" />
                        </div>
                      )}

                      {/* Connected — show device info */}
                      {(localStatus === 'connecting' || localStatus === 'transferring') && (
                        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                          {mobile ? <Smartphone className="w-3.5 h-3.5 text-[#a78bfa]/70" /> : <Monitor className="w-3.5 h-3.5 text-[#a78bfa]/70" />}
                          <span className="text-[11px] font-bold text-white/70">{myDeviceName}</span>
                          <span className="text-[8px] text-white/20">{myDeviceType}</span>
                        </div>
                      )}

                      {/* Code display */}
                      <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)' }}>
                        <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#a78bfa] tracking-[0.35em]">{localCode}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(localCode); toast({ title: 'Code copied!' }); }}
                          className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-white/30 hover:text-white/60"
                          title="Copy Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* QR code (E.1) */}
                      {qrDataUrl && (
                        <div className="flex flex-col items-center gap-1">
                          <img src={qrDataUrl} alt="QR code for local transfer" className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', padding: '6px' }} />
                          <p className="text-[8px] text-white/15">Scan with phone camera</p>
                        </div>
                      )}

                      {/* WiFi explanation (E.3) */}
                      <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-[9px] text-white/25">Both devices on <span className="text-[#a78bfa]/60 font-bold">same WiFi/Hotspot</span></p>
                        <div className="flex items-center gap-3 text-[8px] text-white/12">
                          <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> No internet</span>
                          <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Local only</span>
                        </div>
                        <p className="text-[8px] italic text-[#a78bfa]/30 mt-0.5">
                          {mobile ? 'Open bongbari.com/tools/share on PC' : 'Open bongbari.com/tools/share on phone'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2">
                    {localStatus !== 'complete' && localStatus !== 'error' && <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />}
                    {localStatus === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className={`text-[11px] font-mono ${localStatus === 'error' ? 'text-red-400/80' : localStatus === 'complete' ? 'text-emerald-400/80' : 'text-white/25'}`}>
                      {localStatusText[localStatus]}
                    </span>
                  </div>

                  {/* Security badges */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">
                      <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-purple-400/50" /> Local</span>
                      <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5 text-amber-500/50" /> LAN Speed</span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">{formatBytes(totalSize)}</span>
                  </div>

                  {/* Actions */}
                  {(localStatus === 'complete' || localStatus === 'error') && (
                    <button onClick={() => removeFile()} className="w-full h-11 sm:h-12 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> {localStatus === 'error' ? 'Try Again' : 'New Transfer'}
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3D: LOCAL RECEIVE — enhanced progress + save (E.4/E.5/E.8) ===== */}
            {mode === 'local-receive' && (
              <motion.section key="local-receive" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-6 flex flex-col gap-4" style={{ background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                  {/* Accent line */}
                  <div className="w-full h-px -mt-5 sm:-mt-6 rounded-t-2xl" style={{ background: 'linear-gradient(to right, transparent, rgba(167,139,250,0.3), transparent)' }} />

                  {/* Device identity chip */}
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {mobile ? <Smartphone className="w-3 h-3 text-[#a78bfa]/60" /> : <Monitor className="w-3 h-3 text-[#a78bfa]/60" />}
                    <span className="text-[9px] font-bold text-[#a78bfa]/60">{myDeviceName}</span>
                    <span className="text-[8px] text-white/15">receiving</span>
                  </div>

                  {/* File info + progress */}
                  <div className="flex items-center gap-3.5 w-full">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: localStatus === 'complete' ? 'rgba(16,185,129,0.08)' : 'rgba(167,139,250,0.06)', border: `1px solid ${localStatus === 'complete' ? 'rgba(16,185,129,0.15)' : 'rgba(167,139,250,0.1)'}` }}>
                      {localStatus === 'complete' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Radio className="w-5 h-5 text-[#a78bfa]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1.5 gap-2">
                        <span className="text-sm font-bold text-white/90 truncate">{localFileName || 'Receiving file…'}</span>
                        <span className="text-[11px] font-bold text-[#a78bfa]/80 shrink-0 font-mono">{localProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${localProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #a78bfa, #40ceed)', boxShadow: '0 0 12px rgba(167,139,250,0.3)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2">
                    {localStatus !== 'complete' && localStatus !== 'error' && <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />}
                    {localStatus === 'complete' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className={`text-[11px] font-mono ${localStatus === 'error' ? 'text-red-400/80' : localStatus === 'complete' ? 'text-emerald-400/80' : 'text-white/25'}`}>
                      {localStatusText[localStatus]}
                    </span>
                  </div>

                  {/* Completion celebration (E.8) */}
                  {localStatus === 'complete' && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="flex flex-col items-center gap-1.5 py-1"
                    >
                      <span className="text-xl">✨</span>
                      <p className="text-[11px] font-bold text-emerald-400/80">Transfer complete — {localFileName}</p>
                    </motion.div>
                  )}

                  {/* Security badges */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">
                      <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5 text-purple-400/50" /> Local</span>
                      <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5 text-amber-500/50" /> LAN Speed</span>
                    </div>
                  </div>

                  {/* Save button when complete */}
                  {localStatus === 'complete' && localBlob && (
                    <button onClick={saveLocalFile} className="w-full h-11 sm:h-12 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <Save className="w-3.5 h-3.5" /> Save File
                    </button>
                  )}

                  {/* Reset on error */}
                  {(localStatus === 'error') && (
                    <button onClick={() => { resetAll(); setMode('pick'); setOtpDigits(['', '', '', '', '', '']); setReceiveCode(''); }} className="w-full h-11 sm:h-12 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3B: LINK UPLOAD / SUCCESS ===== */}
            {hasFiles && isTransferring && (
              <motion.section key="link-transfer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-6 flex flex-col gap-4" style={{ background: linkStatus === 'success' ? 'rgba(16,185,129,0.02)' : 'rgba(240,193,44,0.02)', border: `1px solid ${linkStatus === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(240,193,44,0.08)'}`, boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                  {/* Accent line */}
                  <div className="w-full h-px -mt-5 sm:-mt-6 rounded-t-2xl" style={{ background: `linear-gradient(to right, transparent, ${linkStatus === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(240,193,44,0.3)'}, transparent)` }} />

                  {/* Overall progress bar */}
                  <div className="flex items-center gap-3.5 w-full mt-1">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: linkStatus === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(240,193,44,0.06)', border: `1px solid ${linkStatus === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(240,193,44,0.1)'}` }}>
                      {linkStatus === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-[#f0c12c]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1.5 gap-2">
                        <span className="text-sm font-bold text-white/90 truncate">
                          {files.length > 1 ? `${files.length} files · ${formatBytes(totalSize)}` : file?.name}
                        </span>
                        <span className="text-[11px] font-bold text-[#f0c12c]/80 shrink-0 font-mono">{linkStatus === 'success' ? '100%' : `${linkProgress}%`}</span>
                      </div>
                      <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${linkStatus === 'success' ? 100 : linkProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: linkStatus === 'success' ? 'linear-gradient(to right, #10b981, #40ceed)' : 'linear-gradient(to right, #f0c12c, #40ceed)', boxShadow: `0 0 12px ${linkStatus === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(240,193,44,0.3)'}` }} />
                      </div>
                    </div>
                  </div>

                  {/* Per-file progress bars (multi-file only, while uploading) */}
                  {files.length > 1 && linkStatus === 'uploading' && fileProgresses.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {files.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[9px] text-white/30 truncate flex-1 min-w-0">{f.name}</span>
                          <span className="text-[9px] font-mono text-[#f0c12c]/50 shrink-0 w-7 text-right">{fileProgresses[idx] ?? 0}%</span>
                          <div className="w-14 h-0.5 rounded-full bg-white/[0.04] shrink-0 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${fileProgresses[idx] ?? 0}%`, background: 'rgba(240,193,44,0.4)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link or loading */}
                  {linkStatus === 'success' ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-0" style={{ background: 'rgba(64,206,237,0.03)', border: '1px solid rgba(64,206,237,0.08)' }}>
                          <Link2 className="w-3.5 h-3.5 text-[#40ceed]/40 shrink-0" />
                          <span className="text-[11px] font-mono text-[#40ceed]/60 truncate flex-1">{shareLink}</span>
                          <button onClick={() => copyLink(shareLink)} className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-white/30 hover:text-white/60 shrink-0" title="Copy Link"><Copy className="w-3.5 h-3.5" /></button>
                        </div>
                        <button onClick={() => window.open(shareLink, '_blank', 'noopener')} className="sm:w-auto w-full h-10 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                          Open <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[9px] text-center text-white/20 leading-relaxed">
                        Send this link to receiver — instant <span className="text-[#40ceed]/60 font-bold">download page</span>, no signup
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f0c12c] animate-pulse" />
                        <span className="text-[11px] font-mono text-white/25">{uploadPhase || 'Transferring packets…'}</span>
                      </div>
                      {chunkInfo && chunkInfo.totalChunks > 1 && (
                        <div className="flex items-center gap-3 text-[9px] font-mono text-white/15">
                          <span>{formatBytes(chunkInfo.bytesUploaded)} / {formatBytes(chunkInfo.totalBytes)}</span>
                          {chunkInfo.speed > 0 && <span>{formatBytes(chunkInfo.speed)}/s</span>}
                          {chunkInfo.speed > 0 && chunkInfo.bytesUploaded > 0 && (
                            <span>~{Math.ceil((chunkInfo.totalBytes - chunkInfo.bytesUploaded) / chunkInfo.speed)}s</span>
                          )}
                        </div>
                      )}
                      {chunkInfo?.isRetry && (
                        <span className="text-[9px] font-bold text-amber-400/50">Retrying — connection hiccup</span>
                      )}
                    </div>
                  )}

                  {/* Expiry info */}
                  {linkStatus === 'success' && usedHost && (
                    <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold" style={{
                      background: (usedHost === 'catbox') ? 'rgba(16,185,129,0.04)' : 'rgba(240,193,44,0.04)',
                      border: `1px solid ${(usedHost === 'catbox') ? 'rgba(16,185,129,0.1)' : 'rgba(240,193,44,0.1)'}`,
                      color: (usedHost === 'catbox') ? 'rgba(16,185,129,0.6)' : 'rgba(240,193,44,0.6)',
                    }}>
                      {usedHost === 'filebin-bundle' && <><Clock className="w-3 h-3" /> 6 day link · {files.length} files bundled</>}
                      {usedHost === 'filebin' && <><Clock className="w-3 h-3" /> Valid 6 days</>}
                      {usedHost === 'catbox' && <><InfinityIcon className="w-3 h-3" /> Permanent link</>}
                      {usedHost === 'litterbox' && <><Clock className="w-3 h-3" /> 72 hour link</>}
                      {usedHost === 'gofile' && <><Clock className="w-3 h-3" /> Valid 10 days</>}
                    </div>
                  )}

                  {/* Security */}
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-3 text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">
                      <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5 text-emerald-500/50" /> AES-256</span>
                      <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-amber-500/50" /> CDN</span>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/15">{formatBytes(totalSize)} / 10 GB</span>
                  </div>

                  {linkStatus === 'success' && (
                    <button onClick={() => removeFile()} className="w-full h-11 sm:h-12 rounded-xl font-extrabold uppercase tracking-widest text-xs transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(240,193,44,0.1)', color: '#f0c12c', border: '1px solid rgba(240,193,44,0.2)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> New Transfer
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== ERROR STATE (link mode) ===== */}
            {hasFiles && mode === 'link' && linkStatus === 'error' && (
              <motion.section key="link-error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-6 flex flex-col gap-4 items-center text-center" style={{ background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <X className="w-7 h-7 text-red-400/70" />
                  </div>
                  <h3 className="text-base font-extrabold text-white/90">Upload Failed</h3>
                  <p className="text-[11px] text-white/30 leading-relaxed max-w-xs">File host may be down. Try <span className="text-[#40ceed]/60 font-bold">P2P Transfer</span> — works directly from your browser.</p>
                  <div className="flex gap-2.5 w-full">
                    <button onClick={handleP2PStart} className="flex-1 h-11 rounded-xl font-extrabold uppercase text-xs tracking-widest transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{ background: 'rgba(64,206,237,0.1)', color: '#40ceed', border: '1px solid rgba(64,206,237,0.2)' }}>
                      <Wifi className="w-3.5 h-3.5" /> Try P2P
                    </button>
                    <button onClick={() => removeFile()} className="h-11 px-5 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center gap-2 text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* ── Joke ticker (one-at-a-time fade animation) ── */}
        <JokeTickerBar mode={mode} linkStatus={linkStatus} />

        {/* ── Footer ── */}
        <footer className="flex-none w-full py-2 flex justify-center items-center px-4 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-extrabold tracking-[0.25em] uppercase" style={{ color: 'rgba(240,193,44,0.2)' }}>BongShare</span>
            <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.04)' }}>·</span>
            <span className="text-[7px] font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.08)' }}>by Bong Bari</span>
          </div>
        </footer>

        {/* ── Info "?" FAB + Full-screen Panel ── */}
        <BongShareInfoButton onClick={() => setInfoOpen(true)} />
        <BongShareInfoPanel isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
      </div>
    </>
  );
};

export default BongShare;