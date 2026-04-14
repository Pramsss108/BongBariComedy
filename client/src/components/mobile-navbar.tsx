import { Home, MessageCircle, X, Info, FileText, HelpCircle, Wrench, Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from "framer-motion";

/* ─── Floating Glass Pill Dock ─── Arc Browser / iOS 18 style ─── */
const MobileNavBar = () => {
    const [location] = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [lang, setLangState] = useState<'en' | 'bn'>(() =>
        (typeof window !== 'undefined' && localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en'
    );
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [pressedIdx, setPressedIdx] = useState(-1);

    /* Phase 15: Hide-on-scroll — dock slides away when scrolling down */
    const [dockVisible, setDockVisible] = useState(true);
    const { scrollY } = useScroll();
    const lastScrollY = useRef(0);
    const scrollTimer = useRef<ReturnType<typeof setTimeout>>();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const delta = latest - lastScrollY.current;
        // Show on scroll up (delta < -5) or near top; hide on scroll down (delta > 8)
        if (delta < -5 || latest < 50) {
            setDockVisible(true);
        } else if (delta > 8) {
            setDockVisible(false);
            setIsMenuOpen(false); // close menu when hiding
        }
        lastScrollY.current = latest;
        // Always show dock after user stops scrolling
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => setDockVisible(true), 1200);
    });

    const switchLang = (next: 'en' | 'bn') => {
        setLangState(next);
        localStorage.setItem('bbc.lang', next);
        window.dispatchEvent(new Event('lang-change'));
    };

    const [isBotOpen, setIsBotOpen] = useState(false);
    useEffect(() => {
        const h = () => setIsBotOpen(p => !p);
        window.addEventListener('toggle-chatbot', h);
        return () => window.removeEventListener('toggle-chatbot', h);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                (!toggleRef.current || !toggleRef.current.contains(e.target as Node)))
                setIsMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isActive = useCallback((p: string) => location === p || (p === "/" && location === ""), [location]);

    const navItems = [
        { icon: Home, label: "Home", href: "/" },
        { icon: HelpCircle, label: "FAQ", href: "/faq" },
        { icon: MessageCircle, label: "Collab", href: "/work-with-us" },
    ];

    const menuItems = [
        { icon: Info, label: "About", href: "/about" },
        { icon: FileText, label: "Blog", href: "/blog" },
        { icon: HelpCircle, label: "FAQ", href: "/faq" },
        { icon: Wrench, label: "Tools", href: "/tools" },
    ];

    /* Shared press handlers — Phase 12: touch-action manipulation */
    const press = (i: number) => ({ onPointerDown: () => setPressedIdx(i), onPointerUp: () => setPressedIdx(-1), onPointerLeave: () => setPressedIdx(-1) });

    return (
        <>
            {/* ─── Context Menu (slim iOS popup) ─── Phase 14: dynamic bottom calc ─── */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.92, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 12 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
                        className="fixed right-4 z-[10000] w-[156px] rounded-[14px] overflow-hidden sm:hidden"
                        style={{
                            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 10px)',
                            background: 'rgba(28,28,30,0.88)',
                            backdropFilter: 'blur(50px) saturate(2)',
                            WebkitBackdropFilter: 'blur(50px) saturate(2)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.07)'
                        }}
                    >
                        <div className="py-[5px]">
                            {/* Lang toggle */}
                            <div className="flex items-center justify-between px-3 py-[6px]">
                                <span className="text-[9px] text-white/30 font-semibold uppercase tracking-[0.14em]">Lang</span>
                                <div className="relative flex items-center bg-white/[0.06] rounded-full p-[2px]">
                                    <div
                                        className="absolute top-[2px] h-[calc(100%-4px)] w-[calc(50%-1px)] rounded-full bg-white/[0.12] transition-all duration-300 ease-out"
                                        style={{ left: lang === 'en' ? '2px' : 'calc(50%)' }}
                                    />
                                    <button onClick={() => switchLang('en')} className={`relative z-10 px-2 py-[2px] text-[10px] font-semibold rounded-full transition-colors ${lang === 'en' ? 'text-white' : 'text-white/30'}`}>EN</button>
                                    <button onClick={() => switchLang('bn')} className={`relative z-10 px-2 py-[2px] text-[10px] font-semibold rounded-full font-bengali transition-colors ${lang === 'bn' ? 'text-white' : 'text-white/30'}`}>বাং</button>
                                </div>
                            </div>
                            <div className="mx-3 h-[0.5px] bg-white/[0.07]" />
                            {menuItems.map((item, idx) => (
                                <Link key={idx} href={item.href} onClick={() => setIsMenuOpen(false)}>
                                    <div className={`flex items-center gap-2.5 px-3 py-[8px] transition-colors ${isActive(item.href) ? "text-white" : "text-white/60 active:bg-white/[0.06]"}`}>
                                        <item.icon size={14} strokeWidth={isActive(item.href) ? 2.2 : 1.8} />
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── FLOATING GLASS PILL DOCK ─── Phase 15: hide-on-scroll ─── */}
            <motion.div
                className="fixed bottom-0 left-0 right-0 z-[9999] sm:hidden pointer-events-none flex justify-center"
                style={{
                    paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                    willChange: 'transform', /* Phase 24: GPU-accelerate dock slide */
                }}
                animate={{ y: dockVisible ? 0 : 80 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
                <nav
                    className="pointer-events-auto flex items-center relative"
                    style={{
                        height: '46px',
                        borderRadius: '23px',
                        padding: '0 10px',
                        gap: '4px',
                        /* Phase 22: Samsung Internet fallback — high opacity if blur unsupported */
                        background: 'rgba(18,18,18,0.92)',
                        backdropFilter: 'blur(40px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.06)',
                        touchAction: 'manipulation', /* Phase 12: prevent 300ms tap delay */
                        contain: 'layout style', /* Phase 24: isolate repaint to dock */
                    }}
                >
                    {/* Nav Items (Home, FAQ, Collab) — Phase 12: 54×46 touch targets */}
                    {navItems.map((item, i) => {
                        const active = isActive(item.href);
                        return (
                            <Link key={i} href={item.href}>
                                <motion.button
                                    className="relative flex flex-col items-center justify-center outline-none select-none w-[58px] h-[46px]"
                                    style={{ touchAction: 'manipulation' }}
                                    animate={{ scale: pressedIdx === i ? 0.82 : 1 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                                    {...press(i)}
                                >
                                    {/* Phase 13: radial glow behind active icon */}
                                    {active && (
                                        <div
                                            className="absolute inset-0 rounded-full pointer-events-none"
                                            style={{ background: 'radial-gradient(circle, rgba(244,196,48,0.12) 0%, transparent 70%)' }}
                                        />
                                    )}
                                    <item.icon
                                        size={21}
                                        strokeWidth={active ? 2.3 : 1.6}
                                        className="transition-all duration-200"
                                        style={{ opacity: active ? 1 : 0.6, color: active ? '#F4C430' : 'white' }}
                                    />
                                    {active && (
                                        <motion.div
                                            layoutId="pill-dot"
                                            className="absolute bottom-[2px] w-[4px] h-[4px] rounded-full"
                                            style={{ background: '#F4C430' }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </motion.button>
                            </Link>
                        );
                    })}

                    {/* Thin separator */}
                    <div className="w-[1px] h-[20px] bg-white/[0.08] mx-[2px]" />

                    {/* Bot — Phase 12: 54×46 touch target */}
                    <motion.button
                        className="relative flex flex-col items-center justify-center outline-none select-none w-[58px] h-[46px]"
                        style={{ touchAction: 'manipulation' }}
                        animate={{ scale: pressedIdx === 3 ? 0.82 : 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                        onClick={() => window.dispatchEvent(new Event('toggle-chatbot'))}
                        {...press(3)}
                    >
                        {isBotOpen && (
                            <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{ background: 'radial-gradient(circle, rgba(244,196,48,0.12) 0%, transparent 70%)' }}
                            />
                        )}
                        <Bot
                            size={21}
                            strokeWidth={isBotOpen ? 2.3 : 1.6}
                            className="transition-all duration-200"
                            style={{ opacity: isBotOpen ? 1 : 0.6, color: isBotOpen ? '#F4C430' : 'white' }}
                        />
                        {isBotOpen && (
                            <motion.div
                                layoutId="pill-dot"
                                className="absolute bottom-[2px] w-[4px] h-[4px] rounded-full"
                                style={{ background: '#F4C430' }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                    </motion.button>

                    {/* More / Menu — Phase 12: 54×46 touch target */}
                    <motion.button
                        ref={toggleRef}
                        className="relative flex flex-col items-center justify-center outline-none select-none w-[58px] h-[46px]"
                        style={{ touchAction: 'manipulation' }}
                        animate={{ scale: pressedIdx === 4 ? 0.82 : 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 28 }}
                        onClick={() => setIsMenuOpen(p => !p)}
                        {...press(4)}
                    >
                        {isMenuOpen && (
                            <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{ background: 'radial-gradient(circle, rgba(244,196,48,0.12) 0%, transparent 70%)' }}
                            />
                        )}
                        <AnimatePresence mode="wait">
                            {isMenuOpen ? (
                                <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                    <X size={21} strokeWidth={2.3} style={{ color: '#F4C430' }} />
                                </motion.div>
                            ) : (
                                <motion.div key="grid" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 0.6 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                    <GridIcon />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                layoutId="pill-dot"
                                className="absolute bottom-[2px] w-[4px] h-[4px] rounded-full"
                                style={{ background: '#F4C430' }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                    </motion.button>
                </nav>
            </motion.div>
        </>
    );
};

/* Minimal 2×2 grid icon (SF Symbols style) */
const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5.5" height="5.5" rx="1.5" />
        <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.5" />
        <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.5" />
        <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.5" />
    </svg>
);

export default MobileNavBar;
