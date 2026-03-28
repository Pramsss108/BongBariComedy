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
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link2,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBestServer, uploadFileWithProgress } from '@/lib/gofile-engine';

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

/* ── History helpers ── */
interface HistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  link: string;
  timestamp: number;
}

const HISTORY_KEY = 'bongshare_history';
function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(items: HistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

/* ── Byte formatter ── */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ================================================================
   COMPONENT
   ================================================================ */
const BongShare = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  /* upload state */
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* history */
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  /* drag handlers */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setUploadStatus('idle'); setProgress(0); setShareLink(''); }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setUploadStatus('idle'); setProgress(0); setShareLink(''); }
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus('idle');
    setProgress(0);
    setShareLink('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* upload */
  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setProgress(0);
    try {
      const server = await getBestServer();
      const data = await uploadFileWithProgress(file, server, (p) => setProgress(p));
      setShareLink(data.downloadPage);
      setUploadStatus('success');
      // save to history
      const item: HistoryItem = {
        id: data.fileId || crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        link: data.downloadPage,
        timestamp: Date.now(),
      };
      const next = [item, ...history];
      setHistory(next);
      saveHistory(next);
      toast({ title: 'Ready to share!', description: 'Link generated — copy it below.' });
    } catch (err: any) {
      setUploadStatus('error');
      toast({ variant: 'destructive', title: 'Upload Failed', description: err.message || 'Something went wrong.' });
    }
  };

  /* clipboard */
  const copyLink = (link: string, id?: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
    if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }
  };

  /* history management */
  const deleteHistoryItem = (id: string) => {
    const next = history.filter(h => h.id !== id);
    setHistory(next);
    saveHistory(next);
  };
  const clearHistory = () => { setHistory([]); saveHistory([]); };

  const isTransferring = uploadStatus === 'uploading' || uploadStatus === 'success';

  /* Rotating jokes */
  const [jokeIdx, setJokeIdx] = useState(0);
  const jokePool = useMemo(() => {
    if (uploadStatus === 'uploading') return UPLOAD_JOKES;
    if (uploadStatus === 'success') return SUCCESS_JOKES;
    return IDLE_JOKES;
  }, [uploadStatus]);
  useEffect(() => {
    const t = setInterval(() => setJokeIdx(i => (i + 1) % jokePool.length), 5000);
    return () => clearInterval(t);
  }, [jokePool]);
  const currentJoke = jokePool[jokeIdx % jokePool.length];

  return (
    <>
      <SEOHead
        title="Bong Share | The Ethereal Terminal"
        description="High-speed premium file sharing by Bong Bari. Send anything. No stress."
        url="https://www.bongbari.com/tools/share"
      />

      {/* Full-screen dark shell */}
      <div className="fixed inset-0 flex flex-col" style={{ background: '#0e0e0f', fontFamily: 'Manrope, sans-serif' }}>
        {/* ── Mesh gradient backdrop ── */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            backgroundImage:
              'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(240,193,44,0.03) 0px, transparent 50%)',
          }}
        />

        {/* ████  HEADER — overflow-hidden, no hover spill  ████ */}
        <header className="flex-none w-full h-14 sm:h-16 flex justify-between items-center px-4 sm:px-6 md:px-8 border-b border-white/5 relative z-30 overflow-hidden select-none">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setLocation('/tools')}
              className="shrink-0 p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-90 transition-all text-[#d1c5ad]"
              aria-label="Back to tools"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tighter text-white whitespace-nowrap">Bong Bari</h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block shrink-0" />
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#d1c5ad] font-semibold whitespace-nowrap truncate">
              The Ethereal Terminal
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#f0c12c] font-bold hidden sm:block whitespace-nowrap shrink-0">
            Send anything. No stress.
          </p>
        </header>

        {/* ████  SCROLLABLE BODY  ████ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
          <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 md:px-8 py-5 sm:py-8 flex flex-col gap-5 sm:gap-6">
            <AnimatePresence mode="wait">
              {/* ===== DROP ZONE ===== */}
              {!isTransferring && (
                <motion.section
                  key="dropzone"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative w-full rounded-2xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center py-14 sm:py-20 px-6 cursor-pointer overflow-hidden ${
                      isDragging
                        ? 'border-[#f0c12c]/60 bg-[#f0c12c]/[0.03]'
                        : file
                          ? 'border-[#f0c12c]/30 bg-[#1b1b1b]/30'
                          : 'border-[#9a907a]/20 bg-[#1b1b1b]/20 hover:border-[#f0c12c]/40 hover:bg-[#f0c12c]/[0.02]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="relative z-[5] flex flex-col items-center text-center">
                      {/* Glass icon */}
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-500 ${
                          isDragging ? 'scale-110 rotate-6' : 'group-hover:scale-105'
                        }`}
                        style={{
                          background: 'rgba(27,27,27,0.4)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-[#f0c12c]" />
                      </div>

                      {file ? (
                        <>
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
                            Ready to <span className="text-[#f0c12c] italic">send</span>
                          </h2>
                          <p className="text-[#d1c5ad] text-sm max-w-xs sm:max-w-md font-medium truncate px-4">{file.name}</p>
                          <p className="text-[#9a907a] text-xs mt-1">{formatBytes(file.size)}</p>
                        </>
                      ) : (
                        <>
                          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-3 sm:mb-4 leading-tight">
                            Drop your file <span className="text-[#f0c12c] italic">here</span>
                          </h2>
                          <p className="text-[#d1c5ad] text-sm sm:text-base max-w-xs sm:max-w-md font-medium leading-relaxed">
                            Tap to browse or drag and drop.<br className="sm:hidden" /> Supports up to 10 GB per transfer.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hover glow — contained */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none overflow-hidden">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#f0c12c]/8 blur-[100px] rounded-full" />
                    </div>
                  </div>

                  {/* Upload / Remove buttons */}
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex gap-3"
                    >
                      <button
                        onClick={handleUpload}
                        className="flex-1 h-12 sm:h-14 bg-[#f0c12c] text-[#695200] font-extrabold uppercase text-sm tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        Upload Now <Zap className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(); }}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-white/10 bg-[#1b1b1b]/40 text-[#d1c5ad] hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </motion.div>
                  )}
                </motion.section>
              )}

              {/* ===== TRANSFERRING / SUCCESS ===== */}
              {isTransferring && (
                <motion.section
                  key="transfer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div
                    className="w-full rounded-2xl p-5 sm:p-8 flex flex-col gap-5 shadow-2xl"
                    style={{
                      background: 'rgba(27,27,27,0.4)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* File info + progress */}
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg bg-[#1b1b1b] border border-white/5 flex items-center justify-center">
                        {uploadStatus === 'success' ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                        ) : (
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#40ceed]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1 gap-2">
                          <span className="text-sm font-bold text-white truncate">{file?.name}</span>
                          <span className="text-xs font-bold text-[#f0c12c] shrink-0">
                            {uploadStatus === 'success' ? '100%' : `${progress}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadStatus === 'success' ? 100 : progress}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            style={{
                              background: 'linear-gradient(to right, #f0c12c, #40ceed)',
                              boxShadow: '0 0 15px rgba(240,193,44,0.4)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Share link or uploading state */}
                    {uploadStatus === 'success' ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 bg-black/40 border border-white/5 px-3 sm:px-4 py-3 rounded-xl min-w-0">
                          <Link2 className="w-4 h-4 text-[#40ceed]/50 shrink-0" />
                          <span className="text-xs font-mono text-[#40ceed]/80 truncate flex-1">{shareLink}</span>
                          <button
                            onClick={() => copyLink(shareLink)}
                            className="p-2 hover:bg-white/10 rounded-md transition-colors text-[#e2e2e2] shrink-0"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => window.open(shareLink, '_blank', 'noopener')}
                          className="sm:w-auto w-full h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-[#e2e2e2] flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-2 h-2 rounded-full bg-[#40ceed] animate-pulse" />
                        <span className="text-xs font-mono text-[#40ceed]/60">Transferring packets…</span>
                      </div>
                    )}

                    {/* Status row */}
                    <div className="flex flex-wrap justify-between items-center gap-2 opacity-40">
                      <div className="flex items-center gap-3 sm:gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" /> AES-256
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" /> CDN
                        </span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">
                        {file ? formatBytes(file.size) : '0 B'} / 10 GB
                      </span>
                    </div>

                    {/* New transfer button */}
                    {uploadStatus === 'success' && (
                      <button
                        onClick={removeFile}
                        className="w-full h-12 sm:h-14 bg-[#f0c12c] text-[#695200] font-extrabold uppercase tracking-widest rounded-full hover:brightness-110 active:scale-[0.97] transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" /> New Transfer
                      </button>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* ── Joke ticker ── */}
            <div className="w-full flex justify-center">
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

            {/* ████  HISTORY PANEL  ████ */}
            <section className="w-full">
              <button
                onClick={() => setShowHistory(prev => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
              >
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d1c5ad]">
                  <Clock className="w-4 h-4 text-[#f0c12c]" />
                  Recent Transfers
                  {history.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#f0c12c]/10 text-[#f0c12c] text-[10px] font-bold">
                      {history.length}
                    </span>
                  )}
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4 text-[#9a907a]" /> : <ChevronDown className="w-4 h-4 text-[#9a907a]" />}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {history.length === 0 ? (
                      <div className="py-8 text-center text-sm text-[#9a907a]">
                        No transfers yet. Upload something!
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {history.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1b1b1b]/30 border border-white/[0.03] group/item hover:bg-white/[0.03] transition-colors"
                          >
                            <div className="w-9 h-9 shrink-0 rounded-lg bg-[#1b1b1b] border border-white/5 flex items-center justify-center">
                              <FileText className="w-4 h-4 text-[#40ceed]/60" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate">{h.fileName}</p>
                              <p className="text-[10px] text-[#9a907a]">{formatBytes(h.fileSize)} · {timeAgo(h.timestamp)}</p>
                            </div>
                            <button
                              onClick={() => copyLink(h.link, h.id)}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                              title="Copy link"
                            >
                              {copiedId === h.id
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                : <Copy className="w-4 h-4 text-[#d1c5ad]" />
                              }
                            </button>
                            <button
                              onClick={() => window.open(h.link, '_blank', 'noopener')}
                              className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                              title="Open"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#d1c5ad]" />
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(h.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover/item:opacity-100"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400/60" />
                            </button>
                          </div>
                        ))}

                        {/* Clear all */}
                        {history.length > 1 && (
                          <button
                            onClick={clearHistory}
                            className="mt-1 self-end text-[10px] uppercase tracking-wider font-bold text-red-400/40 hover:text-red-400/70 transition-colors px-3 py-1"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </main>

          {/* ── Footer ── */}
          <footer className="w-full py-4 flex justify-center border-t border-white/5">
            <p className="text-[9px] font-bold tracking-[0.3em] text-[#d1c5ad]/30 uppercase text-center px-4">
              Files auto-delete after 10 days of inactivity
            </p>
          </footer>
        </div>
      </div>
    </>
  );
};

export default BongShare;
