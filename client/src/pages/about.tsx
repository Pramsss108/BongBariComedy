import { motion } from "framer-motion";
import { Youtube, Instagram, Facebook, Mail, Phone, MapPin, ExternalLink, Briefcase, Target, Users, Building2 } from "lucide-react";
import Footer from "@/components/footer";

const card = (delay: number, children: React.ReactNode, gradient = "from-brand-yellow/50 via-brand-yellow/30 to-brand-yellow/50") => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    className={`relative group rounded-2xl p-[1px] bg-gradient-to-br ${gradient} shadow-2xl`}
  >
    <div className="rounded-2xl h-full w-full bg-black/80 backdrop-blur-xl p-8 border border-white/5 group-hover:bg-black/60 transition-colors duration-500">
      {children}
    </div>
  </motion.div>
);

const About = () => {
  return (
    <div className="min-h-screen bg-transparent text-white relative overflow-hidden">
      <title>About Us — Bong Bari</title>
      <meta name="description" content="About Bong Bari — founded by Abhijit Pramanik, GST Registered (GSTIN: 19FWUPP1487B1ZW), Kolkata, India." />

      {/* Premium Background Glow — absolute on mobile (clipped by overflow-hidden), fixed on desktop */}
      <div className="absolute sm:fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[40%] bg-brand-yellow/[0.06] sm:bg-brand-yellow/10 rounded-full blur-[120px]" />
        <div className="absolute top-[25%] right-[-15%] w-[50%] h-[35%] bg-indigo-500/[0.04] sm:bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto relative z-10">
        {/* Hero */}
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-3">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-yellow-600">Bong Bari</span>
          </h1>
          <p className="text-xl text-gray-400 bangla-text">আমাদের সম্পর্কে</p>
        </motion.div>

        <div className="space-y-6">
          {/* Who We Are */}
          {card(0.1, (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-yellow/20 flex items-center justify-center"><Users className="w-5 h-5 text-brand-yellow" /></div>
                <h2 className="text-2xl font-bold text-white">Who We Are</h2>
              </div>
              <p className="text-gray-300 leading-relaxed">
                <strong className="text-white">Bong Bari</strong> is a Bengali comedy and digital-entertainment brand that captures the everyday chaos, warmth, and humour of Bengali households. From kitchen debates about fish curry to cricket-fuelled living-room arguments, our sketches, reels, and interactive tools celebrate the culture millions of Bengalis call home.
              </p>
              <p className="text-gray-400 leading-relaxed mt-3 bangla-text">
                <strong className="text-gray-200">বং বাড়ি</strong> — বাঙালি ঘরের রোজকার হাসি-কান্না, রান্নাঘরের তর্ক আর বৈঠকখানার ক্রিকেট নিয়ে ঝগড়া — সবকিছু নিয়ে আমরা কন্টেন্ট বানাই। আমাদের উদ্দেশ্য আপনার মুখে হাসি ফোটানো।
              </p>
            </>
          ))}

          {/* Founder */}
          {card(0.2, (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center"><Briefcase className="w-5 h-5 text-indigo-400" /></div>
                <h2 className="text-2xl font-bold text-white">Founder & Proprietor</h2>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Bong Bari was founded and is managed by <strong className="text-white">Abhijit Pramanik</strong>, a Kolkata-based digital-media professional with extensive experience across SEO, content strategy, social-media marketing, and sound production.
              </p>
              <p className="text-gray-300 leading-relaxed mt-3">
                Before launching Bong Bari, Abhijit worked with organisations including <strong className="text-brand-yellow">Pursueit (Dubai)</strong>, a <strong className="text-brand-yellow">Google AI Research project (Powwow)</strong>, <strong className="text-brand-yellow">Balihans</strong>, <strong className="text-brand-yellow">ReachHub</strong>, <strong className="text-brand-yellow">Ymedia</strong>, <strong className="text-brand-yellow">Bilex</strong>, and <strong className="text-brand-yellow">BYJU'S</strong>. In the audio-visual space, he has contributed to <strong className="text-brand-yellow">Pocket FM</strong>, <strong className="text-brand-yellow">Madquick</strong>, and several independent studios as a sound engineer and post-production specialist.
              </p>
              <a href="https://trello.com/b/WUDa3EOJ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-brand-yellow hover:text-yellow-300 transition-colors font-medium">
                <ExternalLink className="w-4 h-4" /> View full portfolio
              </a>
            </>
          ), "from-indigo-500/50 via-indigo-500/30 to-indigo-500/50")}

          {/* Two-column: Business Entity + What We Do */}
          <div className="grid md:grid-cols-2 gap-6">
            {card(0.3, (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Building2 className="w-5 h-5 text-emerald-400" /></div>
                  <h2 className="text-xl font-bold text-white">Business Entity</h2>
                </div>
                <ul className="space-y-2 text-gray-300 text-sm">
                  <li><span className="text-gray-500">Trade Name:</span> <span className="text-white font-medium">Bong Bari</span></li>
                  <li><span className="text-gray-500">Proprietor:</span> <span className="text-white font-medium">Abhijit Pramanik</span></li>
                  <li><span className="text-gray-500">GSTIN:</span> <span className="text-white font-medium">19FWUPP1487B1ZW</span></li>
                  <li><span className="text-gray-500">Type:</span> Sole Proprietorship — Digital Media</li>
                  <li><span className="text-gray-500">Founded:</span> 2024</li>
                </ul>
              </>
            ), "from-emerald-500/50 via-emerald-500/30 to-emerald-500/50")}

            {card(0.4, (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Target className="w-5 h-5 text-cyan-400" /></div>
                  <h2 className="text-xl font-bold text-white">What We Do</h2>
                </div>
                <ul className="space-y-3 text-gray-300 text-sm">
                  <li><strong className="text-white">Comedy Content</strong> — Sketches & reels on YouTube & Instagram</li>
                  <li><strong className="text-white">Interactive Tools</strong> — NGL, share cards, community features</li>
                  <li><strong className="text-white">Media Services</strong> — SEO, social strategy, audio production</li>
                </ul>
              </>
            ), "from-cyan-500/50 via-cyan-500/30 to-cyan-500/50")}
          </div>

          {/* Mission */}
          {card(0.5, (
            <div className="text-center py-4">
              <h2 className="text-2xl font-bold text-white mb-4">💡 Our Mission</h2>
              <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto">
                To create content that makes you feel like you're watching your own family. Every sketch, every character, and every punchline comes from real experiences that every Bengali household can relate to.
              </p>
              <p className="text-gray-400 leading-relaxed mt-3 bangla-text max-w-2xl mx-auto">
                আমাদের উদ্দেশ্য সহজ — এমন কন্টেন্ট বানানো যা দেখে মনে হবে আপনি আপনার নিজের পরিবারকেই দেখছেন।
              </p>
            </div>
          ), "from-purple-500/50 via-purple-500/30 to-purple-500/50")}

          {/* Contact */}
          {card(0.6, (
            <>
              <h2 className="text-2xl font-bold text-white mb-6 text-center">📬 Contact Us</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <a href="mailto:team@bongbari.com" className="flex items-center gap-3 text-gray-300 hover:text-brand-yellow transition-colors p-3 rounded-xl hover:bg-white/5">
                  <Mail className="w-5 h-5 text-brand-yellow" /> team@bongbari.com
                </a>
                <a href="tel:+919875319691" className="flex items-center gap-3 text-gray-300 hover:text-brand-yellow transition-colors p-3 rounded-xl hover:bg-white/5">
                  <Phone className="w-5 h-5 text-brand-yellow" /> +91 98753 19691
                </a>
                <div className="flex items-start gap-3 text-gray-300 p-3 sm:col-span-2">
                  <MapPin className="w-5 h-5 text-brand-yellow flex-shrink-0 mt-0.5" />
                  <span>222, Laxmi Narayan Rd, Vivekanand Pally, Dum Dum Cantonment, Kolkata 700065, West Bengal, India</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-white/10">
                <a href="https://youtube.com/@bongbari" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-500 transition-colors"><Youtube className="w-6 h-6" /></a>
                <a href="https://instagram.com/thebongbari" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-purple-400 transition-colors"><Instagram className="w-6 h-6" /></a>
                <a href="https://facebook.com/bongbari" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors"><Facebook className="w-6 h-6" /></a>
              </div>
            </>
          ))}
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default About;
