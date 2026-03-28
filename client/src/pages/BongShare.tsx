import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { 
  Upload, 
  Share2, 
  ArrowLeft,
  Info,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

const BongShare = () => {
  const [, setLocation] = useLocation();

  return (
    <>
      <SEOHead 
        title="Bong Share | Fast & Free File Sharing"
        description="Share massive files instantly for free. No signup, unlimited size, secure peer-to-peer style transfers. Coming soon to Bong Bari."
        url="https://www.bongbari.com/tools/share"
      />
      
      <div className="min-h-screen bg-[#050505] text-white relative flex flex-col items-center py-20 px-4 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-600/10 rounded-full blur-[120px] animate-pulse" />
        </div>

        {/* Header */}
        <div className="w-full max-w-4xl flex items-center justify-between mb-12 relative z-10">
          <button 
            onClick={() => setLocation('/tools')}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Tools</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Bong Share</h1>
          </div>

          <div className="hidden md:flex items-center gap-4">
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                SECURE
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                FAST
             </div>
          </div>
        </div>

        {/* Main Content (Entering Dashboard Shell) */}
        <main className="w-full max-w-2xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 md:p-12 shadow-2xl overflow-hidden relative"
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] uppercase font-bold tracking-widest mb-4">
                  <Globe className="w-3 h-3" />
                  Free Global File Transfer
                </div>
                <h2 className="text-4xl font-bold tracking-tight mb-4">Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Share?</span></h2>
                <p className="text-neutral-400 max-w-sm mx-auto">
                  High-speed P2P file sharing with zero storage costs. Just drag, drop, and send.
                </p>
              </div>

              {/* Placeholder Uploader Frame */}
              <div className="relative group border-2 border-dashed border-white/10 rounded-2xl p-16 transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/[0.02]">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-neutral-500 group-hover:text-violet-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Drop your files</h3>
                  <p className="text-neutral-400 text-sm">
                    Maximum file size: <span className="text-white font-bold">Unlimited</span>
                  </p>
                </div>
              </div>

              <div className="mt-10">
                <Button 
                  disabled
                  className="w-full h-14 bg-white/5 border border-white/10 text-neutral-500 font-bold rounded-2xl cursor-not-allowed"
                >
                  Waiting for Design Sync...
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Feature Badges */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Instant Link', icon: Share2 },
              { label: 'End-to-End', icon: ShieldCheck },
              { label: 'No Limits', icon: Zap }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <f.icon className="w-4 h-4 text-neutral-400" />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter text-neutral-500">{f.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Info Text */}
          <div className="mt-10 flex items-start gap-3 px-6 text-neutral-500 text-xs leading-relaxed">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Bong Share uses high-leverage P2P technology to pipe files directly from your browser. 
              Awaiting final dashboard design from Stitch.
            </p>
          </div>
        </main>

        {/* Floating Decorative Elements */}
        <motion.div 
          animate={{ y: [0, -20, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-20 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div 
          animate={{ y: [0, 20, 0] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 -right-20 w-60 h-60 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none"
        />
      </div>
    </>
  );
};

export default BongShare;
