import { Home, MessageCircle, X, Info, FileText, HelpCircle, Wrench, Bot } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Ultra-Premium Dock ─── iOS 18 / Apple Tab Bar level ─── */
const MobileNavBar = () => {
    const [location] = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [lang, setLangState] = useState<'en' | 'bn'>(() =>
        (typeof window !== 'undefined' && localStorage.getItem('bbc.lang') as 'en' | 'bn') || 'en'
    );
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [activeIdx, setActiveIdx] = useState(-1); // for haptic-style press

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

    return (
        <>
            {/* ─── Context Menu (slim iOS popup) ─── */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.92, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 12 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.25 }}
                        className="fixed bottom-[72px] right-3 z-[10000] w-[156px] rounded-[14px] overflow-hidden"
                        style={{
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

            {/* ─── DOCK ─── ultra-premium floating tab bar ─── */}
            <div
                className="fixed bottom-0 left-0 right-0 z-[9999] sm:hidden flex justify-center pointer-events-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: '#0a0a0a' }}
            >
                <nav
                    className="pointer-events-auto flex items-center justify-evenly w-[92%] max-w-[380px] mb-[6px] relative"
                    style={{
                        height: '52px',
                        borderRadius: '22px',
                        background: 'rgba(22,22,24,0.75)',
                        backdropFilter: 'blur(40px) saturate(1.8)',
                        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.45), inset 0 0.5px 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(255,255,255,0.04)',
                        willChange: 'transform',
                        contain: 'layout style',
                    }}
                >
                    {/* Nav Items */}
                    {navItems.map((item, i) => {
                        const active = isActive(item.href);
                        return (
                            <Link key={i} href={item.href}>
                                <button
                                    className="relative flex flex-col items-center justify-center outline-none w-[52px] h-full select-none"
                                    onPointerDown={() => setActiveIdx(i)}
                                    onPointerUp={() => setActiveIdx(-1)}
                                    onPointerLeave={() => setActiveIdx(-1)}
                                >
                                    <motion.div
                                        animate={{
                                            scale: activeIdx === i ? 0.82 : active ? 1 : 0.92,
                                            opacity: active ? 1 : 0.45
                                        }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        className="flex flex-col items-center"
                                    >
                                        <item.icon size={20} strokeWidth={active ? 2.4 : 1.7} className={active ? 'text-white' : 'text-white'} />
                                        <span className={`text-[9px] mt-[2px] font-medium leading-none ${active ? 'text-white' : 'text-white'}`}>
                                            {item.label}
                                        </span>
                                    </motion.div>
                                    {/* Active dot */}
                                    {active && (
                                        <motion.div
                                            layoutId="dock-dot"
                                            className="absolute -bottom-[1px] w-[4px] h-[4px] rounded-full bg-white"
                                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                                        />
                                    )}
                                </button>
                            </Link>
                        );
                    })}

                    {/* Bot */}
                    <button
                        onClick={() => window.dispatchEvent(new Event('toggle-chatbot'))}
                        className="relative flex flex-col items-center justify-center outline-none w-[52px] h-full select-none"
                        onPointerDown={() => setActiveIdx(3)}
                        onPointerUp={() => setActiveIdx(-1)}
                        onPointerLeave={() => setActiveIdx(-1)}
                    >
                        <motion.div
                            animate={{
                                scale: activeIdx === 3 ? 0.82 : isBotOpen ? 1 : 0.92,
                                opacity: isBotOpen ? 1 : 0.45
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="flex flex-col items-center"
                        >
                            <Bot size={20} strokeWidth={isBotOpen ? 2.4 : 1.7} />
                            <span className={`text-[9px] mt-[2px] font-medium leading-none`}>Bot</span>
                        </motion.div>
                        {isBotOpen && (
                            <motion.div
                                layoutId="dock-dot"
                                className="absolute -bottom-[1px] w-[4px] h-[4px] rounded-full bg-white"
                                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            />
                        )}
                    </button>

                    {/* Menu */}
                    <button
                        ref={toggleRef}
                        onClick={() => setIsMenuOpen(p => !p)}
                        className="relative flex flex-col items-center justify-center outline-none w-[52px] h-full select-none"
                        onPointerDown={() => setActiveIdx(4)}
                        onPointerUp={() => setActiveIdx(-1)}
                        onPointerLeave={() => setActiveIdx(-1)}
                    >
                        <motion.div
                            animate={{
                                scale: activeIdx === 4 ? 0.82 : isMenuOpen ? 1 : 0.92,
                                opacity: isMenuOpen ? 1 : 0.45,
                                rotate: isMenuOpen ? 45 : 0
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="flex flex-col items-center"
                        >
                            {isMenuOpen ? <X size={20} strokeWidth={2.4} /> : <GridIcon />}
                            <span className={`text-[9px] mt-[2px] font-medium leading-none ${isMenuOpen ? '' : ''}`}>
                                {isMenuOpen ? 'Close' : 'More'}
                            </span>
                        </motion.div>
                    </button>
                </nav>
            </div>
        </>
    );
};

/* Minimal 2×2 grid icon (SF Symbols style) */
const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5.5" height="5.5" rx="1.5" />
        <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.5" />
        <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.5" />
        <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.5" />
    </svg>
);

export default MobileNavBar;
