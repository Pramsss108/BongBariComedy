import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBestServer, uploadFileWithProgress } from '@/lib/gofile-engine';

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const BongShare = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [shareLink, setShareLink] = useState('');

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadStatus('idle');
      setProgress(0);
      setShareLink('');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setProgress(0);
      setShareLink('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus('idle');
    setProgress(0);
    setShareLink('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus('uploading');
    setProgress(0);
    try {
      const server = await getBestServer();
      const data = await uploadFileWithProgress(file, server, (p) => setProgress(p));
      setShareLink(data.downloadPage);
      setUploadStatus('success');
      toast({ title: 'Ready to share!', description: 'File uploaded successfully.' });
    } catch (error: any) {
      setUploadStatus('error');
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Something went wrong.' });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
  };

  const isTransferring = uploadStatus === 'uploading' || uploadStatus === 'success';

  // Rotating jokes
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

      {/* Full-screen dark shell — no scroll */}
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{
          background: '#0e0e0f',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        {/* ── Mesh gradient backdrop ── */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            backgroundImage:
              'radial-gradient(at 0% 0%, rgba(240,193,44,0.05) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(64,206,237,0.05) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(240,193,44,0.03) 0px, transparent 50%)',
          }}
        />

        {/* ── Top bar ── */}
        <header className="flex-none w-full h-16 flex justify-between items-center px-6 md:px-8 border-b border-white/5 relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation('/tools')}
              className="p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors text-[#d1c5ad]"
              aria-label="Back to tools"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-extrabold tracking-tighter text-white">Bong Bari</h1>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-[#d1c5ad] font-semibold">
              The Ethereal Terminal
            </p>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f0c12c] font-bold hidden sm:block">
            Send anything. No stress.
          </p>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 md:px-8 py-4 gap-6 relative z-10 min-h-0">
          <AnimatePresence mode="wait">
            {/* ===== DROP ZONE (idle / error) ===== */}
            {!isTransferring && (
              <motion.section
                key="dropzone"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35 }}
                className="w-full flex-1 min-h-0 flex flex-col"
              >
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`group relative w-full flex-1 rounded-xl border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center p-8 md:p-12 cursor-pointer overflow-hidden ${
                    isDragging
                      ? 'border-[#f0c12c]/60 bg-[#f0c12c]/[0.03]'
                      : file
                        ? 'border-[#f0c12c]/30 bg-[#1b1b1b]/30'
                        : 'border-[#9a907a]/20 bg-[#1b1b1b]/20 hover:border-[#f0c12c]/40 hover:bg-[#f0c12c]/[0.02]'
                  }`}
                >
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />

                  <div className="relative z-[5] flex flex-col items-center text-center">
                    {/* Glass icon */}
                    <div
                      className={`w-24 h-24 mb-8 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-500 ${
                        isDragging ? 'scale-110 rotate-6' : 'group-hover:scale-110 group-hover:rotate-6'
                      }`}
                      style={{
                        background: 'rgba(27,27,27,0.4)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <Upload className="w-12 h-12 text-[#f0c12c]" />
                    </div>

                    {file ? (
                      <>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                          Ready to <span className="text-[#f0c12c] italic">send</span>
                        </h2>
                        <p className="text-[#d1c5ad] text-sm max-w-md font-medium truncate">{file.name}</p>
                        <p className="text-[#9a907a] text-xs mt-1">{formatBytes(file.size)}</p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                          Drop your file <span className="text-[#f0c12c] italic">here</span>
                        </h2>
                        <p className="text-[#d1c5ad] text-base max-w-md font-medium">
                          Click to browse or drag and drop your technical artifacts. Supports up to 10GB per transfer.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#f0c12c]/10 blur-[120px] rounded-full" />
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
                      className="flex-1 h-14 bg-[#f0c12c] text-[#695200] font-extrabold uppercase tracking-widest rounded-full hover:brightness-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      Upload Now <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={removeFile}
                      className="w-14 h-14 rounded-full border border-white/10 bg-[#1b1b1b]/40 text-[#d1c5ad] hover:bg-white/5 transition-colors flex items-center justify-center"
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
                transition={{ duration: 0.35 }}
                className="w-full"
              >
                <div
                  className="w-full rounded-xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl"
                  style={{
                    background: 'rgba(27,27,27,0.4)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {/* File info + progress */}
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-1 flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-lg bg-[#1b1b1b] border border-white/5 flex items-center justify-center">
                        {uploadStatus === 'success' ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <FileText className="w-6 h-6 text-[#40ceed]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-sm font-bold text-white truncate">{file?.name}</span>
                          <span className="text-xs font-bold text-[#f0c12c]">
                            {uploadStatus === 'success' ? '100%' : `${progress}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${uploadStatus === 'success' ? 100 : progress}%`,
                              background: 'linear-gradient(to right, #f0c12c, #40ceed)',
                              boxShadow: '0 0 15px rgba(240,193,44,0.4)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Share link or uploading state */}
                    {uploadStatus === 'success' ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-4 py-3 rounded-lg min-w-[280px] md:min-w-[320px]">
                          <span className="text-xs font-mono text-[#40ceed]/80 truncate">{shareLink}</span>
                          <button
                            onClick={copyToClipboard}
                            className="p-2 hover:bg-white/10 rounded-md transition-colors text-[#e2e2e2]"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => window.open(shareLink, '_blank')}
                          className="p-3 hover:bg-white/10 rounded-lg transition-colors text-[#e2e2e2]"
                          title="Open link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-[#40ceed]/60 animate-pulse">Encrypting packets…</span>
                    )}
                  </div>

                  {/* Status row */}
                  <div className="flex justify-between items-center opacity-40">
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-[#e2e2e2]">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> AES-256 Encrypted
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> Multi-Region CDN
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
                      className="w-full h-14 bg-[#f0c12c] text-[#695200] font-extrabold uppercase tracking-widest rounded-full hover:brightness-105 active:scale-95 transition-all shadow-lg"
                    >
                      New Transfer
                    </button>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* ── Joke ticker ── */}
        <div className="flex-none w-full py-3 flex justify-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentJoke}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="text-[11px] text-[#f0c12c]/60 font-medium italic text-center px-4 max-w-lg"
            >
              {currentJoke}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <footer className="flex-none w-full py-4 flex justify-center border-t border-white/5 relative z-10">
          <p className="text-[9px] font-bold tracking-[0.4em] text-[#d1c5ad]/40 uppercase">
            Files auto-delete after 10 days of inactivity
          </p>
        </footer>
      </div>
    </>
  );
};

export default BongShare;
