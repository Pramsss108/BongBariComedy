import { Youtube, Instagram, Facebook, Mail, MapPin, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useDeviceTier } from "@/hooks/useDeviceTier";

/* ─── Data ─── */
const marqueeWords = ["COMEDY", "SKETCHES", "BENGALI", "ENTERTAINMENT", "BONG BARI", "KOLKATA", "CONTENT", "CREATIVE"];

const linkColumns = [
  {
    title: "Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Free Tools", href: "/free-tools" },
      { label: "Work With Us", href: "/work-with-us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
];

const socials = [
  { icon: Youtube, href: "https://youtube.com/@bongbari", label: "YouTube", ring: "group-hover:ring-red-500/40", glow: "group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]", text: "group-hover:text-red-400" },
  { icon: Instagram, href: "https://instagram.com/thebongbari", label: "Instagram", ring: "group-hover:ring-purple-500/40", glow: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]", text: "group-hover:text-purple-400" },
  { icon: Facebook, href: "https://facebook.com/bongbari", label: "Facebook", ring: "group-hover:ring-blue-500/40", glow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]", text: "group-hover:text-blue-400" },
  { icon: Mail, href: "mailto:team@bongbari.com", label: "Email", ring: "group-hover:ring-brand-yellow/40", glow: "group-hover:shadow-[0_0_20px_rgba(255,204,0,0.3)]", text: "group-hover:text-brand-yellow" },
];

/* ─── Scroll variants ─── */
const vp = { margin: "-10%" as const, amount: 0.12 as const };

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const scalePop = {
  hidden: { opacity: 0, scale: 0.3, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 25 } },
};

/* ─── Marquee ─── */
function MarqueeStrip() {
  const items = [...marqueeWords, ...marqueeWords, ...marqueeWords];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={vp}
      variants={fadeUp}
      className="footer-marquee-wrap relative overflow-hidden py-5 select-none"
    >
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#080808] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#080808] to-transparent pointer-events-none" />
      <div>
        <div className="footer-marquee flex items-center gap-12 whitespace-nowrap">
          {items.map((word, i) => (
            <span key={i} className="flex items-center gap-12 text-[15px] font-bold uppercase tracking-[0.3em]">
              <span className="text-white/30 footer-marquee-word">{word}</span>
              <span className="w-1 h-1 rounded-full bg-brand-yellow/60 inline-block" />
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── BONG BARI — premium reveal, compositor-only (no scroll-linked blur) ─── */
function BrandReveal() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 0.8 }}
      className="relative py-16 sm:pt-14 sm:pb-10 flex flex-col items-center justify-center text-center"
    >
      <h2 className="footer-brand-text relative z-10 text-5xl sm:text-[clamp(2rem,7vw,4rem)] font-black tracking-tighter leading-none">
        BONG BARI
      </h2>

      {/* Underline */}
      <motion.div
        className="relative z-10 h-[2px] mt-3 rounded-full"
        initial={{ width: "0%" }}
        whileInView={{ width: "50%" }}
        viewport={{ amount: 0.3 }}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,204,0,0.5), transparent)",
        }}
      />

      {/* Subtitle */}
      <motion.p
        className="relative z-10 text-white/40 text-xs sm:text-sm mt-4 tracking-[0.35em] uppercase font-semibold"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{}}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        Bengal&apos;s Comedy Brand
      </motion.p>
    </motion.div>
  );
}

export default function Footer() {
  const device = useDeviceTier();

  /* ── Mobile footer: clean, compact, premium ── */
  if (device.isMobile) {
    return (
      <footer className="mobile-footer relative footer-root mt-auto">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]" style={{ backgroundImage: "url(/noise.svg)", backgroundRepeat: "repeat" }} />

        {/* ── Brand Title ── */}
        <div className="relative pt-10 pb-6 flex flex-col items-center justify-center text-center">
          <h2 className="footer-brand-text font-black tracking-tight leading-none" style={{ fontSize: 'clamp(3rem, 14vw, 5rem)' }}>BONG BARI</h2>
          <div className="mx-auto mt-3 h-[2px] w-24 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,204,0,0.5), transparent)' }} />
          <p className="text-white/40 mt-2 tracking-[0.35em] uppercase font-semibold" style={{ fontSize: '10px' }}>Bengal&apos;s Comedy Brand</p>
        </div>

        {/* ── Marquee ── */}
        <MarqueeStrip />

        {/* ── Grid: Brand info + Links ── */}
        <div className="relative z-[2] footer-grid-bg">
          <div className="h-[1px] bg-white/[0.04]" />
          <div className="px-5 pt-3 pb-2">

            {/* Logo + Name + Socials — single row */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Bong Bari" className="w-8 h-8 rounded-lg ring-1 ring-white/[0.08]" loading="lazy" decoding="async" />
                <div>
                  <span className="text-white font-bold tracking-wide block leading-tight" style={{ fontSize: '15px' }}>Bong Bari</span>
                  <span className="text-white/25 text-[8px] tracking-[0.15em] uppercase font-medium">Comedy Studio</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {socials.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={s.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                    aria-label={s.label}
                    className="flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-white/[0.08] bg-white/[0.04] text-white/40 active:scale-95 transition-transform"
                  >
                    <s.icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns — 3-col refined */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              {linkColumns.map((col) => (
                <div key={col.title}>
                  <h3 className="text-brand-yellow/60 uppercase tracking-widest mb-1.5 font-bold" style={{ fontSize: '13px' }}>{col.title}</h3>
                  <ul className="space-y-1">
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="text-white/40 font-normal hover:text-white transition-colors leading-snug block" style={{ fontSize: '10px' }}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="h-[1px] w-full bg-white/[0.06]" />

          {/* Copyright — safe zone: 140px+ ensures both lines sit above the floating dock pill */}
          <div className="px-5 pt-2 flex flex-col items-center gap-0.5 text-[9px]" style={{ paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
            <span className="text-white/25 text-center">© {new Date().getFullYear()} Bong Bari · GSTIN: 19FWUPP1487B1ZW · Abhijit Pramanik</span>
            <div className="flex items-center gap-4 text-white/25">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 text-brand-yellow/30" /> Kolkata</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  /* ── Desktop footer (unchanged) ── */
  return (
    <footer className="relative mt-0 pb-6 footer-root">
      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]" style={{ backgroundImage: "url(/noise.svg)", backgroundRepeat: "repeat" }} />

      {/* Premium edge */}
      <div className="footer-premium-edge" />

      {/* Brand — no overflow issues, no glow rectangles */}
      <BrandReveal />

      {/* Marquee */}
      <MarqueeStrip />

      {/* Footer Grid */}
      <div className="relative z-[2] footer-grid-bg">
        <div className="footer-inner-glow-top" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 sm:py-16">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            variants={stagger}
          >
            {/* Brand Column */}
            <motion.div variants={fadeUp} className="col-span-1 sm:col-span-5">
              <div className="flex items-center gap-3.5 mb-5">
                <div className="relative">
                  <img src="/logo.png" alt="Bong Bari" className="w-11 h-11 rounded-xl ring-1 ring-white/[0.08]" loading="lazy" decoding="async" />
                  <div className="absolute -inset-1.5 rounded-xl bg-brand-yellow/10 blur-lg -z-10" />
                </div>
                <div>
                  <span className="text-white font-bold text-[15px] sm:text-[17px] tracking-wide block leading-tight">Bong Bari</span>
                  <span className="text-white/30 text-[10px] tracking-[0.15em] uppercase font-medium">Comedy Studio</span>
                </div>
              </div>
              <p className="text-white/50 text-[13px] leading-[1.7] max-w-[320px] mb-7 hidden sm:block">
                Bengal's funniest comedy brand — sketches, entertainment, and pure creative chaos from Kolkata.
              </p>

              <motion.div className="flex items-center gap-2 flex-wrap" initial="hidden" whileInView="visible" viewport={vp} variants={stagger}>
                {socials.map((s) => (
                  <motion.a
                    key={s.href}
                    variants={scalePop}
                    href={s.href}
                    target={s.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={s.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                    aria-label={s.label}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-full ring-1 ring-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.08] transition-all duration-300 min-h-[44px] ${s.ring} ${s.glow}`}
                  >
                    <s.icon className={`w-4 h-4 transition-colors duration-300 ${s.text}`} />
                    <span className={`text-[11px] font-medium tracking-wide transition-colors duration-300 hidden sm:inline ${s.text}`}>{s.label}</span>
                  </motion.a>
                ))}
              </motion.div>
            </motion.div>

            {/* Link Columns — wrapped in a flex row for mobile 3-col layout */}
            <div className="col-span-1 sm:col-span-7 grid grid-cols-3 gap-4 sm:gap-6">
            {linkColumns.map((col, ci) => (
              <motion.div key={col.title} variants={fadeUp}>
                <h3 className="text-brand-yellow/90 text-xs sm:text-[11px] font-bold uppercase tracking-[0.25em] mb-1.5">{col.title}</h3>
                <div className="w-6 h-[2px] bg-brand-yellow/30 rounded-full mb-5" />
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="group/link flex items-center gap-1 text-white/50 text-[13px] hover:text-white transition-all duration-200 footer-link-hover">
                        <span>{link.label}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0 group-hover/link:opacity-60 group-hover/link:translate-y-0 transition-all duration-200" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
            </div>
          </motion.div>
        </div>

        <div className="footer-glow-line h-[2px] w-full" />

        <motion.div
          className="max-w-7xl mx-auto px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-[11px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={vp}
          transition={{ duration: 0.6 }}
        >
          <span className="text-white/30">© {new Date().getFullYear()} Bong Bari · GSTIN: 19FWUPP1487B1ZW · Abhijit Pramanik</span>
          <div className="flex items-center gap-5 text-white/30">
            <Link href="/privacy" className="hover:text-white/70 transition-colors duration-200">Privacy</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors duration-200">Terms</Link>
            <span className="hidden sm:flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-yellow/40" /> Kolkata, India</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
