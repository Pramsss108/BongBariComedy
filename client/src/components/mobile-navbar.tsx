import { Home, PlaySquare, MessageCircle, Menu, X, Info, Briefcase, FileText, HelpCircle, Wrench, ChevronUp, Bug } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MobileNavBar = () => {
    const [location] = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) &&
                (!toggleButtonRef.current || !toggleButtonRef.current.contains(event.target as Node))
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const triggerDebug = () => {
        window.dispatchEvent(new Event('toggle-debug'));
        setIsMenuOpen(false);
    };

    // Map the current path to the active state
    const isActive = (path: string) => location === path || (path === "/" && location === "");

    // Main Dock Items (Visible always)
    const navItems = [
        { icon: Home, label: "Home", href: "/", active: isActive("/") },
        { icon: HelpCircle, label: "Question", href: "/faq", active: isActive("/faq") },
        { icon: MessageCircle, label: "Contact", href: "/work-with-us", active: isActive("/work-with-us") },
    ];

    // Extended Menu Items (Inside the popup)
    const menuItems = [
        { icon: Info, label: "About Us", href: "/about" },
        { icon: FileText, label: "Blog Posts", href: "/blog" },
        { icon: HelpCircle, label: "FAQ", href: "/faq" },
        { icon: Wrench, label: "Tools", href: "/tools" },
    ];

    return (
        <>
            {/* EXPANDED MENU DRAWER (Blinkit Style Popup) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                        className="fixed bottom-24 right-4 z-[10000] w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-2 space-y-1">
                            {menuItems.map((item, idx) => (
                                <Link key={idx} href={item.href} onClick={() => setIsMenuOpen(false)}>
                                    <div className={`
                                        flex items-center gap-3 px-3 py-3 rounded-xl transition-colors
                                        ${isActive(item.href) ? "bg-white/20 text-brand-yellow font-bold" : "text-white/80 hover:bg-white/10"}
                                    `}>
                                        <item.icon size={18} />
                                        <span className="text-sm">{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                            {/* Debug Trigger Button */}
                            <button onClick={triggerDebug} className="w-full">
                                <div className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-white/50 hover:bg-white/10 hover:text-white">
                                    <Bug size={18} />
                                    <span className="text-sm">Debug Grid</span>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FLOATING GLASS DOCK (Slim Blinkit Style - Wider & Thinner) */}
            <div className="fixed bottom-4 left-0 right-0 z-[9999] sm:hidden flex justify-center pointer-events-none fade-in-up">
                <div className="w-[98%] max-w-[400px] pointer-events-auto">
                    <div className="
                    flex justify-between items-center px-1
                    bg-gray-900/60 backdrop-blur-3xl
                    border border-white/15
                    rounded-full
                    py-2
                    shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                    relative
                    overflow-hidden
                ">
                        {/* Glass Shine Effect */}
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                        
                        {/* Bottom Glow */}
                        <div className="absolute inset-x-0 bottom-0 h-[20px] bg-gradient-to-t from-brand-blue/10 to-transparent opacity-50" />

                        {navItems.map((item, index) => (
                            <Link key={index} href={item.href}>
                                <button className="relative flex flex-col items-center justify-center group outline-none w-14">
                                    <item.icon
                                        className={`
                                        w-5 h-5 transition-all duration-300 mb-0.5
                                        ${item.active
                                                ? "text-brand-blue fill-brand-blue/20 rotate-0 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                                                : "text-zinc-400 group-hover:text-zinc-200"
                                            }
                                    `}
                                        strokeWidth={item.active ? 2.5 : 2}
                                    />
                                    <span className={`text-[10px] sm:text-xs font-medium transition-all leading-tight ${item.active ? "text-brand-blue" : "text-zinc-500"}`}>
                                        {item.label}
                                    </span>
                                </button>
                            </Link>
                        ))}

                        {/* MENU TOGGLE BUTTON (Slim) */}
                        <button
                            ref={toggleButtonRef}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="relative flex flex-col items-center justify-center group outline-none w-14"
                        >
                            <div className={`
                                transition-all duration-300 mb-0.5 rounded-full p-0.5
                                ${isMenuOpen ? "text-brand-yellow rotate-0" : "text-zinc-400 group-hover:text-zinc-200"}
                            `}>
                                {isMenuOpen ? <X size={18} /> : <CategoryIcon />}
                            </div>
                            <span className={`text-[10px] sm:text-xs font-medium transition-all leading-tight ${isMenuOpen ? "text-brand-yellow" : "text-zinc-500"}`}>
                                Menu
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// Custom Grid Icon for "Menu"
const CategoryIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
);

export default MobileNavBar;
