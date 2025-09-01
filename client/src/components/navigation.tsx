import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoutPopoverOpen, setLogoutPopoverOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    setLogoutPopoverOpen(false);
    setTimeout(() => {
      window.location.href = '/';
    }, 100);
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/work-with-us", label: "Work with us" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Slim Fixed Header - Fully Responsive */}
      <header className="fixed top-0 left-0 w-full h-[60px] bg-[#0D47FF] text-white flex justify-between items-center px-3 sm:px-4 md:px-6 lg:px-8 z-[1000]">
        {/* Logo + Text Section - Responsive */}
        <Link href="/">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <img 
              src="/logo.png" 
              alt="Bong Bari Logo"
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-sm sm:text-base font-bold bangla-text">
                বং বাড়ি
              </span>
              <span className="text-[10px] sm:text-xs opacity-90 hidden sm:block">
                Every Home's Story | <span className="bangla-text">প্রতিটা বাড়ির গল্প</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:block">
          <ul className="flex gap-4 xl:gap-6 items-center m-0 p-0 list-none">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[#FFD200] ${
                    isActive(item.href) ? 'text-[#FFD200]' : 'text-white'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-white hover:text-[#FFD200] transition-colors flex items-center gap-1"
                  >
                    <User size={14} />
                    Admin Panel
                  </Link>
                  <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors">
                        Logged In
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-32 p-2">
                      <Button
                        onClick={handleLogout}
                        variant="ghost"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4 mr-1" />
                        Logout
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-white hover:text-[#FFD200] transition-colors"
                >
                  Login ➝
                </Link>
              )}
            </li>
          </ul>
        </nav>

        {/* Mobile/Tablet Hamburger */}
        <button
          className="lg:hidden text-2xl text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile/Tablet Menu Dropdown */}
      <div className={`fixed top-[60px] left-0 right-0 bg-[#0D47FF] border-t border-white/10 z-[999] lg:hidden transform transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
      }`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-3 text-sm font-medium border-b border-white/5 transition-colors ${
              isActive(item.href) ? 'bg-white/10 text-[#FFD200]' : 'text-white'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        {user ? (
          <Link
            href="/admin"
            className="block px-4 py-3 text-sm font-medium text-white border-b border-white/5"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <User size={14} className="inline mr-2" />
            Admin Panel
          </Link>
        ) : (
          <Link
            href="/admin"
            className="block px-4 py-3 text-sm font-medium text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Login ➝
          </Link>
        )}
      </div>

      {/* Promotional Banner with Responsive Text */}
      <div className="fixed top-[60px] left-0 w-full h-[40px] bg-[#FF5733] text-white overflow-hidden z-[998] flex items-center">
        <div 
          className="inline-block whitespace-nowrap"
          style={{
            animation: 'scrollText 25s linear infinite',
            paddingLeft: '100%'
          }}
        >
          <span className="text-xs sm:text-sm font-bold px-2">
            🔥 Special Offer: Flat 50% off on your first Bong Bari subscription 🔥 Stay tuned for updates 🔔 
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            🎬 New Comedy Every Week! | নতুন কমেডি প্রতি সপ্তাহে! 🎭
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            🔥 Special Offer: Flat 50% off on your first Bong Bari subscription 🔥 Stay tuned for updates 🔔
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            🎬 New Comedy Every Week! | নতুন কমেডি প্রতি সপ্তাহে! 🎭
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>
    </>
  );
};

export default Navigation;