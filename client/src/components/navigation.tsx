import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogIn, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileLogout, setShowMobileLogout] = useState(false);
  const [showDesktopLogout, setShowDesktopLogout] = useState(false);
  const [imgErrorMobile, setImgErrorMobile] = useState(false);
  const [imgErrorDesktop, setImgErrorDesktop] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const mobileLogoutRef = useRef<HTMLDivElement>(null);
  const desktopLogoutRef = useRef<HTMLDivElement>(null);

  // Handle Scroll Effect for "Glass" activation
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close logout menus when clicking outside (separate handlers for mobile/desktop)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileLogoutRef.current && !mobileLogoutRef.current.contains(e.target as Node)) {
        setShowMobileLogout(false);
      }
      if (desktopLogoutRef.current && !desktopLogoutRef.current.contains(e.target as Node)) {
        setShowDesktopLogout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user is logged in via Firebase
  const isLoggedIn = !!user;
  const displayName = user?.displayName || user?.email?.split('@')[0] || "Member";
  const photoURL = user?.photoURL;

  const handleLogout = async () => {
    await logout();
    setShowMobileLogout(false);
    setShowDesktopLogout(false);
    window.location.href = '/';
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/work-with-us", label: "Work with us" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
    { href: "/tools", label: "Free Tools" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || isMobileMenuOpen
          ? "border-b border-white/10 shadow-lg"
          : "border-b border-transparent"
          }`}
        style={{
          // Always show glass on mobile for visibility, transparent-to-glass on desktop
          background: (scrolled || isMobileMenuOpen || window.innerWidth < 768) ? "var(--glass-bg)" : "transparent",
          backdropFilter: (scrolled || isMobileMenuOpen || window.innerWidth < 768) ? "var(--glass-blur)" : "none",
          height: "var(--header-height, 70px)"
        }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "circOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

          {/* Mobile Glass Gradient Overlay (Extra readability) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none md:hidden" />

          {/* --- LEFT: LOGO CLUSTER (Clean Design) --- */}
          <Link href="/" className="relative z-50">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 sm:gap-3"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-brand-yellow blur-md opacity-40 rounded-full hover:opacity-70 transition-opacity" />
                <img src="/logo.png" alt="Bong Bari" className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-2xl object-cover" />
              </motion.div>

              <div className="flex flex-col leading-none">
                <span className="font-bengali text-xl sm:text-2xl font-bold text-white tracking-wide drop-shadow-md">
                  বং বাড়ি
                </span>
              </div>
            </motion.div>
          </Link>

          {/* --- RIGHT: MOBILE HEADER ACTIONS (Login + Menu) --- */}
          <div className="flex md:hidden items-center gap-3 z-50 ml-auto mr-0">
            {isLoggedIn ? (
              <div ref={mobileLogoutRef} className="relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setShowMobileLogout(prev => !prev); }}
                  className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm min-h-[44px] min-w-[44px] justify-center"
                >
                  {photoURL && !imgErrorMobile ? (
                    <img src={photoURL} className="w-6 h-6 rounded-full object-cover" alt="User" onError={() => setImgErrorMobile(true)} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-[11px] text-white font-bold">
                      {displayName[0]?.toUpperCase() || <User size={14} />}
                    </div>
                  )}
                </motion.button>
                <AnimatePresence>
                  {showMobileLogout && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[999]"
                    >
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-bold min-h-[48px]"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center gap-1.5 bg-brand-yellow px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(255,200,0,0.4)]"
                >
                  <LogIn className="text-brand-blue w-3.5 h-3.5" />
                  <span className="text-xs font-bold text-brand-blue tracking-wide">Login</span>
                </motion.button>
              </Link>
            )}
          </div>

          {/* --- CENTER: DESKTOP NAV (Pills) --- */}
          <nav className="hidden md:flex items-center gap-1 bg-black/20 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer ${active ? "text-brand-blue bg-white shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}>
                    {item.label}
                    {active && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white rounded-full -z-10" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* --- RIGHT: ACTIONS & MOBILE TOGGLE --- */}
          <div className="flex items-center gap-3 z-50">
            {/* Login / User Status */}
            {isLoggedIn ? (
              <div ref={desktopLogoutRef} className="relative hidden md:block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setShowDesktopLogout(prev => !prev); }}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all"
                >
                  {photoURL && !imgErrorDesktop ? (
                    <img src={photoURL} className="w-6 h-6 rounded-full object-cover" alt="User" onError={() => setImgErrorDesktop(true)} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-brand-blue flex items-center justify-center text-xs text-white font-bold">
                      {displayName[0]?.toUpperCase() || <User size={14} />}
                    </div>
                  )}
                  <span className="text-sm font-medium text-white max-w-[100px] truncate">{displayName}</span>
                </motion.button>
                <AnimatePresence>
                  {showDesktopLogout && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-[999]"
                    >
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                        {user?.email && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-sm font-bold"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="hidden md:flex bg-brand-yellow text-brand-blue font-bold px-5 py-2 rounded-full shadow-[0_0_20px_rgba(255,200,0,0.4)] hover:shadow-[0_0_30px_rgba(255,200,0,0.6)] transition-all items-center gap-2 text-sm"
                >
                  <LogIn size={16} /> Login
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Toggle (Rockstar Hamburger) - HIDDEN ON MOBILE NOW (Moved to bottom dock) */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="hidden md:hidden text-white p-2 bg-white/10 rounded-full backdrop-blur-md border border-white/10"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* --- CINEMATIC MOBILE MENU OVERLAY - DISABLED ON MOBILE (Use Bottom Dock) --- */}
      <AnimatePresence>
        {false && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} // smooth apple-style ease
            className="fixed inset-0 z-40 bg-brand-blue/95 backdrop-blur-2xl flex flex-col pt-24 pb-8 px-6 md:hidden overflow-y-auto"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + (i * 0.05) }}
                >
                  <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <div className={`text-3xl font-bold py-3 border-b border-white/10 flex items-center justify-between ${isActive(item.href) ? "text-brand-yellow" : "text-white"
                      }`}>
                      {item.label}
                      {isActive(item.href) && <Sparkles size={24} className="text-brand-yellow animate-pulse" />}
                    </div>
                  </Link>
                </motion.div>
              ))}

              {/* Mobile Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 grid grid-cols-2 gap-4"
              >
                {!isLoggedIn ? (
                  <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-brand-yellow text-brand-blue hover:bg-brand-yellow/90 h-12 text-lg font-bold rounded-xl shadow-xl">
                      Login
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={handleLogout} className="w-full bg-red-500/20 text-red-100 hover:bg-red-500/30 h-12 text-lg border border-red-500/30 rounded-xl">
                    Logout
                  </Button>
                )}
                <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-12 text-lg border-white/20 text-white hover:bg-white/10 rounded-xl">
                    Contact
                  </Button>
                </Link>
              </motion.div>

              <div className="mt-auto pt-8 text-center text-white/40 text-sm">
                <p>© 2025 Bong Bari Comedy</p>
                <p className="font-bengali">প্রতিটা বাড়ির গল্প</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;