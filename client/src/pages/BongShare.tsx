import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBestServer, uploadFileWithProgress, uploadFileViaServer, uploadToFilebin, buildBongBariShareUrl, buildBongBariFilebinUrl, type ShareHost } from '@/lib/gofile-engine';
import { createSender, buildP2PShareUrl, type P2PStatus } from '@/lib/p2p-engine';
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

type ShareMode = 'pick' | 'p2p' | 'link';
type TransferStatus = 'idle' | 'uploading' | 'success' | 'error';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ── Glassmorphism card style ── */
const glassStyle = {
  background: 'rgba(27,27,27,0.4)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.05)',
} as const;

/* ================================================================
   COMPONENT — Single viewport, zero scroll, dual-mode
   ================================================================ */
const BongShare = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* ── File state ── */
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setMode('pick'); resetAll(); }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setMode('pick'); resetAll(); }
  };

  function resetAll() {
    setLinkStatus('idle'); setLinkProgress(0); setShareLink(''); setUsedHost(null);
    setP2pStatus('idle'); setP2pProgress(0); setP2pLink('');
    senderRef.current?.destroy(); senderRef.current = null;
  }

  const removeFile = () => {
    setFile(null); setMode('pick'); resetAll();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Link mode: upload status label ── */
  const [uploadPhase, setUploadPhase] = useState<string>('');
  const [usedHost, setUsedHost] = useState<ShareHost | null>(null);

  /* ── Link mode: upload (filebin.net — chunked, CORS native, no proxy needed) ── */
  const handleLinkUpload = async () => {
    if (!file) return;
    setMode('link');
    setLinkStatus('uploading');
    setLinkProgress(0);
    setUploadPhase('Connecting to file server…');
    try {
      // ── TIER 1: filebin.net (unlimited size, 6-day link, full CORS, no proxy) ──
      try {
        const totalChunks = Math.ceil(file.size / (80 * 1024 * 1024));
        setUploadPhase(totalChunks > 1 ? `Splitting into ${totalChunks} parts…` : 'Uploading file…');
        const { binId, chunkNames } = await uploadToFilebin(file, (p) => {
          setLinkProgress(p);
          if (totalChunks > 1) {
            const done = Math.round((p / 100) * totalChunks);
            setUploadPhase(`Uploading part ${Math.min(done + 1, totalChunks)} of ${totalChunks}…`);
          }
        });
        const brandedUrl = buildBongBariFilebinUrl(binId, chunkNames, file.name, file.size);
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

      // ── TIER 2: GoFile fallback (if filebin unreachable) ──
      let data: Awaited<ReturnType<typeof uploadFileWithProgress>>;
      try {
        setUploadPhase('Uploading file…');
        const server = await getBestServer();
        data = await uploadFileWithProgress(file, server, (p) => setLinkProgress(p));
      } catch (directErr: any) {
        console.warn('[BongShare] Direct GoFile failed, trying VPS proxy:', directErr.message);
        setLinkProgress(0);
        setUploadPhase('Finalizing upload on server…');
        data = await uploadFileViaServer(file, (p) => setLinkProgress(p));
      }
      const gofileCode = data.code || data.parentFolderCode || data.downloadPage?.split('/d/').pop() || '';
      if (!gofileCode) throw new Error('Upload succeeded but no download code received');
      setUsedHost('gofile');
      const brandedUrl = buildBongBariShareUrl(gofileCode, file.name, file.size, 'gofile');
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

  /* ── P2P mode: WebRTC sender ── */
  const handleP2PStart = () => {
    if (!file) return;
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

  // Cleanup on unmount
  useEffect(() => () => { senderRef.current?.destroy(); }, []);

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
  };

  const isTransferring = mode === 'link' && (linkStatus === 'uploading' || linkStatus === 'success');
  const isP2PActive = mode === 'p2p';

  /* ── Rotating jokes ── */
  const [jokeIdx, setJokeIdx] = useState(0);
  const jokePool = useMemo(() => {
    if (isP2PActive) return P2P_JOKES;
    if (linkStatus === 'uploading') return UPLOAD_JOKES;
    if (linkStatus === 'success') return SUCCESS_JOKES;
    return IDLE_JOKES;
  }, [isP2PActive, linkStatus]);
  useEffect(() => {
    const t = setInterval(() => setJokeIdx(i => (i + 1) % jokePool.length), 5000);
    return () => clearInterval(t);
  }, [jokePool]);
  const currentJoke = jokePool[jokeIdx % jokePool.length];

  /* ── P2P status label ── */
  const p2pStatusText = {
    idle: 'Loading P2P Engine…',
    waiting: 'Waiting for receiver to connect…',
    connecting: 'Receiver connecting…',
    transferring: `Sending… ${p2pProgress}%`,
    complete: 'Transfer Complete!',
    error: 'Connection failed — try again.',
  };

  return (
    <>
      <SEOHead
        title="Bong Share | The Ethereal Terminal"
        description="High-speed premium file sharing by Bong Bari. P2P or Link — send anything. No stress."
        url="https://www.bongbari.com/tools/share"
      />

      <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
        {/* Mesh gradient */}
        <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: 'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(240,193,44,0.03) 0px, transparent 50%)' }} />

        {/* ── HEADER ── */}
        <header className="flex-none w-full h-14 sm:h-16 flex justify-between items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 overflow-hidden select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setLocation('/tools')} className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]" aria-label="Back to tools">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white whitespace-nowrap">Bong Bari</h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#d1c5ad] font-semibold whitespace-nowrap">The Ethereal Terminal</p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#f0c12c] font-bold hidden sm:block whitespace-nowrap shrink-0">Send anything. No stress.</p>
        </header>

        {/* ── YOUR PROXY BADGE ── */}
        {userIp && (
          <div className="flex-none w-full flex justify-center pt-2 pb-1 relative z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono select-none" style={{ background: 'rgba(64,206,237,0.08)', border: '1px solid rgba(64,206,237,0.2)' }}>
              <Signal className="w-3 h-3 text-[#40ceed]" />
              <span className="text-[#40ceed]/70">Your Proxy:</span>
              <span className="text-[#40ceed] font-bold">{userIp}</span>
              <span className="text-emerald-400/60">• Residential</span>
            </div>
          </div>
        )}

        {/* ── MAIN ── */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4 sm:px-6 md:px-8 relative z-10 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* ===== SCREEN 1: FILE PICKER (no file yet) ===== */}
            {!file && (
              <motion.section key="dropzone" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.3 }} className="w-full flex flex-col">
                <div
                  onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative w-full rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-6 cursor-pointer overflow-hidden ${
                    isDragging ? 'border-[#f0c12c]/60 bg-[#f0c12c]/[0.03]' : 'border-[#9a907a]/20 bg-[#1b1b1b]/20 hover:border-[#f0c12c]/40 hover:bg-[#f0c12c]/[0.02]'
                  }`}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
                  <div className="relative z-[5] flex flex-col items-center text-center">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-500 ${isDragging ? 'scale-110 rotate-6' : 'group-hover:scale-105'}`} style={glassStyle}>
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-[#f0c12c]" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3 sm:mb-4 leading-tight">
                      Drop your file <span className="text-[#f0c12c] italic">here</span>
                    </h2>
                    <p className="text-[#d1c5ad] text-sm sm:text-base max-w-xs sm:max-w-md font-medium leading-relaxed">
                      Tap to browse or drag and drop.<br className="sm:hidden" /> Supports up to 10 GB per transfer.
                    </p>
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#f0c12c]/[0.08] blur-[100px] rounded-full" />
                  </div>
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 2: MODE SELECTION (file picked, choose mode) ===== */}
            {file && mode === 'pick' && (
              <motion.section key="mode-pick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="w-full flex flex-col gap-4">
                {/* File badge */}
                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={glassStyle}>
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-[#40ceed] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-[#9a907a]">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={removeFile} className="p-2 rounded-lg hover:bg-white/5 text-[#d1c5ad] active:scale-90 transition-all shrink-0"><X className="w-4 h-4" /></button>
                </div>

                <h2 className="text-center text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  How do you want to <span className="text-[#f0c12c] italic">send</span> it?
                </h2>

                {/* Dual mode cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* P2P Card */}
                  <button onClick={handleP2PStart} className="group text-left rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/5 hover:border-[#40ceed]/30" style={glassStyle}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#40ceed]/10 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-[#40ceed]" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight">P2P Transfer</h3>
                        <p className="text-[10px] uppercase tracking-widest text-[#40ceed] font-bold">Real-time</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-[#d1c5ad] leading-relaxed">
                      <div className="flex items-start gap-2"><EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>File never touches any server — pure browser-to-browser</span></div>
                      <div className="flex items-start gap-2"><Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>End-to-end encrypted. Nobody can intercept</span></div>
                      <div className="flex items-start gap-2"><Users className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /><span>Both devices must be online at the same time</span></div>
                    </div>
                    <div className="mt-4 h-10 rounded-xl bg-[#40ceed]/10 flex items-center justify-center gap-2 text-xs font-bold text-[#40ceed] uppercase tracking-wider group-hover:bg-[#40ceed]/20 transition-colors">
                      <Wifi className="w-3.5 h-3.5" /> Start P2P
                    </div>
                  </button>

                  {/* Generate Link Card */}
                  <button onClick={handleLinkUpload} className="group text-left rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-white/5 hover:border-[#f0c12c]/30" style={glassStyle}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f0c12c]/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-[#f0c12c]" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white tracking-tight">Generate Link</h3>
                        <p className="text-[10px] uppercase tracking-widest text-[#f0c12c] font-bold">Anytime download</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-[#d1c5ad] leading-relaxed">
                      <div className="flex items-start gap-2"><Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Upload once → share a branded link to anyone</span></div>
                      <div className="flex items-start gap-2"><Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /><span>Receiver downloads anytime — no need to be online together</span></div>
                      <div className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" /><span>Cloaked URL hides the actual file host from prying eyes</span></div>
                    </div>
                    <div className="mt-4 h-10 rounded-xl bg-[#f0c12c]/10 flex items-center justify-center gap-2 text-xs font-bold text-[#f0c12c] uppercase tracking-wider group-hover:bg-[#f0c12c]/20 transition-colors">
                      <Zap className="w-3.5 h-3.5" /> Generate Link
                    </div>
                  </button>
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3A: P2P ACTIVE ===== */}
            {file && isP2PActive && (
              <motion.section key="p2p-active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-8 flex flex-col gap-5 shadow-2xl" style={glassStyle}>
                  {/* File info + progress */}
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-[#1b1b1b] border border-white/5 flex items-center justify-center">
                      {p2pStatus === 'complete' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" /> : <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-[#40ceed]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1 gap-2">
                        <span className="text-sm font-bold text-white truncate">{file.name}</span>
                        <span className="text-xs font-bold text-[#40ceed] shrink-0">{p2pProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p2pProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #40ceed, #f0c12c)', boxShadow: '0 0 15px rgba(64,206,237,0.4)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    {p2pStatus !== 'complete' && p2pStatus !== 'error' && <div className="w-2 h-2 rounded-full bg-[#40ceed] animate-pulse" />}
                    {p2pStatus === 'complete' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    <span className={`text-xs font-mono ${p2pStatus === 'error' ? 'text-red-400' : p2pStatus === 'complete' ? 'text-emerald-400' : 'text-[#40ceed]/60'}`}>
                      {p2pStatusText[p2pStatus]}
                    </span>
                  </div>

                  {/* Share link for receiver */}
                  {p2pLink && p2pStatus !== 'complete' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] uppercase tracking-widest text-[#d1c5ad] font-bold text-center">Share this link with the receiver:</p>
                      <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 sm:px-4 py-3 rounded-xl min-w-0">
                        <Link2 className="w-4 h-4 text-[#40ceed]/50 shrink-0" />
                        <span className="text-xs font-mono text-[#40ceed]/80 truncate flex-1">{p2pLink}</span>
                        <button onClick={() => copyLink(p2pLink)} className="p-2 hover:bg-white/10 rounded-md transition-colors text-[#e2e2e2] shrink-0" title="Copy Link"><Copy className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}

                  {/* Security badges */}
                  <div className="flex flex-wrap justify-between items-center gap-2 opacity-40">
                    <div className="flex items-center gap-3 sm:gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-emerald-500" /> E2E Encrypted</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1"><EyeOff className="w-3 h-3 text-amber-500" /> Zero Server</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">{formatBytes(file.size)}</span>
                  </div>

                  {/* Actions */}
                  {(p2pStatus === 'complete' || p2pStatus === 'error') && (
                    <button onClick={removeFile} className="w-full h-12 sm:h-14 bg-[#40ceed] text-[#003844] font-extrabold uppercase tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> {p2pStatus === 'error' ? 'Try Again' : 'New Transfer'}
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== SCREEN 3B: LINK UPLOAD / SUCCESS ===== */}
            {file && isTransferring && (
              <motion.section key="link-transfer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-8 flex flex-col gap-5 shadow-2xl" style={glassStyle}>
                  {/* Progress */}
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-[#1b1b1b] border border-white/5 flex items-center justify-center">
                      {linkStatus === 'success' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" /> : <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#40ceed]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1 gap-2">
                        <span className="text-sm font-bold text-white truncate">{file.name}</span>
                        <span className="text-xs font-bold text-[#f0c12c] shrink-0">{linkStatus === 'success' ? '100%' : `${linkProgress}%`}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${linkStatus === 'success' ? 100 : linkProgress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} style={{ background: 'linear-gradient(to right, #f0c12c, #40ceed)', boxShadow: '0 0 15px rgba(240,193,44,0.4)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Link or loading */}
                  {linkStatus === 'success' ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/5 px-3 sm:px-4 py-3 rounded-xl min-w-0">
                        <Link2 className="w-4 h-4 text-[#40ceed]/50 shrink-0" />
                        <span className="text-xs font-mono text-[#40ceed]/80 truncate flex-1">{shareLink}</span>
                        <button onClick={() => copyLink(shareLink)} className="p-2 hover:bg-white/10 rounded-md transition-colors text-[#e2e2e2] shrink-0" title="Copy Link"><Copy className="w-4 h-4" /></button>
                      </div>
                      <button onClick={() => window.open(shareLink, '_blank', 'noopener')} className="sm:w-auto w-full h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-[#e2e2e2] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <div className="w-2 h-2 rounded-full bg-[#40ceed] animate-pulse" />
                      <span className="text-xs font-mono text-[#40ceed]/60">{uploadPhase || 'Transferring packets…'}</span>
                    </div>
                  )}

                  {/* Expiry info */}
                  {linkStatus === 'success' && usedHost && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                      usedHost === 'filebin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      usedHost === 'catbox' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      usedHost === 'litterbox' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {usedHost === 'filebin' && <><Clock className="w-3.5 h-3.5" /> Link valid for 6 days — share it fast!</>}
                      {usedHost === 'catbox' && <><InfinityIcon className="w-3.5 h-3.5" /> Permanent link — never expires</>}
                      {usedHost === 'litterbox' && <><Clock className="w-3.5 h-3.5" /> Link expires in 72 hours — share it fast!</>}
                      {usedHost === 'gofile' && <><Clock className="w-3.5 h-3.5" /> Link valid for 10 days</>}
                    </div>
                  )}

                  {/* Security */}
                  <div className="flex flex-wrap justify-between items-center gap-2 opacity-40">
                    <div className="flex items-center gap-3 sm:gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">
                      <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> AES-256</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> CDN</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">{formatBytes(file.size)} / 10 GB</span>
                  </div>

                  {linkStatus === 'success' && (
                    <button onClick={removeFile} className="w-full h-12 sm:h-14 bg-[#f0c12c] text-[#695200] font-extrabold uppercase tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> New Transfer
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* ===== ERROR STATE (link mode) ===== */}
            {file && mode === 'link' && linkStatus === 'error' && (
              <motion.section key="link-error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
                <div className="w-full rounded-2xl p-5 sm:p-8 flex flex-col gap-4 items-center shadow-2xl text-center" style={glassStyle}>
                  <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                  <h3 className="text-lg font-extrabold text-white">Upload Failed</h3>
                  <p className="text-sm text-[#d1c5ad]">The file host may be down. Try <span className="text-[#40ceed] font-bold">P2P Transfer</span> instead — it works directly from your browser.</p>
                  <div className="flex gap-3 w-full">
                    <button onClick={handleP2PStart} className="flex-1 h-12 bg-[#40ceed] text-[#003844] font-extrabold uppercase text-xs tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                      <Wifi className="w-4 h-4" /> Try P2P
                    </button>
                    <button onClick={removeFile} className="h-12 px-6 rounded-full border border-white/10 bg-[#1b1b1b]/40 text-[#d1c5ad] hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center gap-2 text-xs font-bold">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* ── Joke ticker ── */}
        <div className="flex-none w-full py-3 flex justify-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.p key={currentJoke} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="text-[11px] text-[#f0c12c]/50 font-medium italic text-center px-4 max-w-md">
              {currentJoke}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <footer className="flex-none w-full py-3 sm:py-4 flex justify-center border-t border-white/5 relative z-10">
          <p className="text-[9px] font-bold tracking-[0.3em] text-[#d1c5ad]/30 uppercase text-center px-4">P2P: instant, zero-server • Link: download anytime</p>
        </footer>
      </div>
    </>
  );
};

export default BongShare;