import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
      {/* Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-sm">
        
        {/* Main Header - Premium Design */}
        <header className="bg-[#0E47FF]/95 backdrop-blur-md shadow-lg border-b border-white/10">
          <div className="container mx-auto px-6 md:px-8 lg:px-12">
            <div className="flex justify-between items-center h-14 md:h-16 lg:h-[72px]">
              
              {/* Logo Section - Premium Aligned */}
              <Link href="/" className="flex items-center gap-3 md:gap-4 group">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari" 
                  className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg flex-shrink-0 shadow-md group-hover:shadow-xl transition-all duration-300"
                />
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-base lg:text-lg font-bold text-[#FFD200] leading-tight tracking-wide bangla-text group-hover:text-[#FFE55C] transition-colors">বং বাড়ি</h1>
                  <div className="hidden md:flex flex-col mt-0.5">
                    <p className="text-[9px] lg:text-[10px] text-white/90 leading-tight tracking-wide">Every Home's Story</p>
                    <p className="text-[9px] lg:text-[10px] text-white/90 leading-tight bangla-text">প্রতিটা বাড়ির গল্প</p>
                  </div>
                </div>
              </Link>
              
              {/* Desktop Navigation - Professional Menu */}
              <nav className="hidden md:flex items-center gap-2 lg:gap-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative text-white font-medium text-sm lg:text-[15px] py-2 px-3 transition-all duration-300 hover:text-[#FFD200] ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : ""
                    }`}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD200] animate-in slide-in-from-bottom-2"></span>
                    )}
                  </Link>
                ))}
                
                {/* Premium Login/Admin Button */}
                {user ? (
                  <div className="flex items-center gap-2 ml-4">
                    <Link href="/admin">
                      <Button 
                        variant="ghost" 
                        className="text-white hover:bg-white/10 border border-white/20 hover:border-white/40 font-medium text-sm lg:text-base h-9 lg:h-10 px-4 transition-all duration-300"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          className="bg-green-500 hover:bg-green-600 text-white font-medium text-sm lg:text-base h-9 lg:h-10 px-4 shadow-md hover:shadow-lg transition-all duration-300"
                        >
                          <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                          Active
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2 backdrop-blur-md bg-white/95">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link href="/admin" className="ml-4">
                    <Button 
                      className="bg-white text-[#0E47FF] hover:bg-gray-100 font-semibold text-sm lg:text-base h-9 lg:h-10 px-6 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Mobile Menu Button - Premium */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 h-9 w-9 rounded-lg transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Promo Banner - Premium Slim */}
        <div className="bg-gradient-to-r from-[#FFD200] to-[#FFC700] shadow-sm">
          <div className="h-8 md:h-9 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll whitespace-nowrap flex">
                <span className="text-black font-semibold text-xs md:text-sm px-8">
                  🔥 Limited Offer: Flat 50% off on Premium Bong Bari subscription • 🎬 New Comedy Specials Every Week • 
                  🎭 Exclusive Behind-the-Scenes Content • 🎉 Join 100,000+ Comedy Lovers • 
                </span>
                <span className="text-black font-semibold text-xs md:text-sm px-8">
                  🔥 Limited Offer: Flat 50% off on Premium Bong Bari subscription • 🎬 New Comedy Specials Every Week • 
                  🎭 Exclusive Behind-the-Scenes Content • 🎉 Join 100,000+ Comedy Lovers • 
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu - Premium Dropdown */}
        <div className={`md:hidden absolute w-full bg-[#0E47FF]/98 backdrop-blur-lg border-t border-white/10 shadow-2xl transition-all duration-500 ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}>
          <div className="container mx-auto px-6 py-4">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-3 px-4 text-white font-medium text-base rounded-xl transition-all duration-300 ${
                  isActive(item.href) 
                    ? "bg-white/20 text-[#FFD200]" 
                    : "hover:bg-white/10"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Mobile Login/Admin - Premium */}
            <div className="mt-4 pt-4 border-t border-white/20">
              {user ? (
                <>
                  <Link 
                    href="/admin" 
                    className="block py-3 px-4 text-white font-medium text-base rounded-xl hover:bg-white/10 transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="inline w-5 h-5 mr-2" />
                    Admin Panel
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-3 px-4 text-red-300 font-medium text-base rounded-xl hover:bg-white/10 transition-all duration-300"
                  >
                    <LogOut className="inline w-5 h-5 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <Link 
                  href="/admin" 
                  className="block py-3 px-4 text-white font-medium text-base rounded-xl hover:bg-white/10 transition-all duration-300"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogIn className="inline w-5 h-5 mr-2" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer for fixed navigation - Responsive */}
      <div className="h-[86px] md:h-[97px] lg:h-[109px]"></div>
    </>
  );
};

export default Navigation;