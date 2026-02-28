import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const FreeTools = () => {
  if (typeof document !== 'undefined') {
    document.title = 'Free Tools | বং বাড়ি';
  }
  return (
    <div className="min-h-screen bg-[#050505] text-white relative">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="pt-36 pb-32 px-6 max-w-6xl mx-auto relative z-10" aria-labelledby="toolsHeading">
        <div className="mb-14 text-center">
          <h1 id="toolsHeading" className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
            Free <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-yellow-600">Tools</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            Explore playful community utilities. More coming soon.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Bong Kahini Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/50 via-purple-500/30 to-pink-500/50 shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500">
            <div className="rounded-2xl h-full w-full bg-black/80 backdrop-blur-xl p-8 flex flex-col border border-white/5 group-hover:bg-black/60 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">Bong Kahini</h2>
                <span className="text-[10px] uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full font-bold">community</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">Your secret golpo share corner. Submit ছোট মজার গল্প, react & help surface a featured kahini.</p>
              <Link href="/community/feed" className="mt-8 block">
                <Button className="w-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-lg rounded-xl h-12">Open Portal</Button>
              </Link>
            </div>
          </motion.div>

          {/* AI Humanizer Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative group rounded-2xl p-[1px] bg-gradient-to-br from-green-400/50 via-emerald-500/30 to-teal-400/50 shadow-2xl hover:shadow-green-500/20 transition-all duration-500">
            <div className="rounded-2xl h-full w-full bg-black/80 backdrop-blur-xl p-8 flex flex-col border border-white/5 group-hover:bg-black/60 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 font-tech uppercase tracking-wider group-hover:from-white group-hover:to-green-400 transition-all">AI Humanizer</h2>
                <span className="text-[10px] uppercase tracking-wider bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1 rounded-full font-bold">WebGPU</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">Convert robotic AI text into natural, flowing Bong-style language that bypasses AI detectors natively.</p>
              <Link href="/tools/humanizer" className="mt-8 block">
                <Button className="w-full bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black font-tech tracking-widest transition-all shadow-lg rounded-xl h-12 uppercase text-xs font-bold">Initialize</Button>
              </Link>
            </div>
          </motion.div>

          {/* Coming Soon Card */}
          <div className="flex flex-col items-center justify-center border border-dashed border-white/20 bg-white/5 rounded-2xl p-8 text-sm text-gray-500 min-h-[220px] backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <span className="text-xl opacity-50">🍳</span>
            </div>
            <p className="font-medium tracking-wide">More free tools cooking…</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FreeTools;
