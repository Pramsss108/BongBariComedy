import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

const FreeTools = () => {
  if (typeof document !== 'undefined') {
    document.title = 'Free Tools | বং বাড়ি';
  }
  return (
    <main className="pt-36 pb-32 px-6 max-w-6xl mx-auto" aria-labelledby="toolsHeading">
      <div className="mb-14 text-center">
        <h1 id="toolsHeading" className="text-4xl md:text-5xl font-extrabold text-brand-blue mb-4 tracking-tight">Free Tools</h1>
        <p className="text-lg md:text-xl text-neutral-700 max-w-3xl mx-auto leading-relaxed">Explore playful community utilities. More coming soon.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="relative group rounded-2xl p-[2px] bg-gradient-to-br from-indigo-400 via-yellow-300 to-pink-400 shadow-lg">
          <div className="rounded-2xl h-full w-full bg-white/90 backdrop-blur p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-brand-blue">Bong Kahini</h2>
              <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-[3px] rounded-full">community</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed flex-1">Your secret golpo share corner. Submit ছোট মজার গল্প, react & help surface a featured kahini.</p>
            <Link href="/community/feed" className="mt-6">
              <Button className="w-full bg-brand-blue text-white hover:bg-brand-blue/90" aria-label="Open Bong Kahini tool">Open</Button>
            </Link>
          </div>
        </motion.div>
        <div className="md:col-span-2 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-8 text-sm text-gray-500">
          More free tools cooking…
        </div>
      </div>
    </main>
  );
};

export default FreeTools;
