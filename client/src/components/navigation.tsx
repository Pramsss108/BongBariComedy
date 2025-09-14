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
    { href: "/blog", label: "Blog" },
    { href: "/community/feed", label: "Community" },
    { href: "/tools", label: "Free Tools" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Navigation Container - Completely Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full">
        
        {/* Main Header - Ultra Premium Futuristic Design */}
        <header 
          className="bg-[#0E47FF] relative overflow-hidden"
          style={{ 
            height: '75px',
            background: 'linear-gradient(135deg, #0E47FF 0%, #0A3ACC 100%)',
            backdropFilter: 'blur(20px)',
            isolation: 'auto'
          }}
        >
          {/* Futuristic Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            }}></div>
          </div>
          
          <div className="relative max-w-[1400px] mx-auto px-6 lg:px-8 h-full">
            <div className="flex justify-between items-center h-full">
              
              {/* Left Section - Ultra Premium Layout */}
              <div className="flex items-center space-x-5">
                {/* Logo - Refined */}
                <Link href="/" className="group relative cursor-pointer">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD200] to-[#FFC000] rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari" 
                    className="relative w-10 h-10 lg:w-11 lg:h-11 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                
                {/* Bengali Title - Moved down to align with logo center */}
                <h1 
                  className="text-[26px] lg:text-[30px] font-bold text-[#FFD200] bangla-text tracking-wide cursor-pointer self-center"
                  style={{ 
                    fontFamily: 'var(--font-bengali)',
                    textShadow: '0 2px 10px rgba(255,210,0,0.2)',
                    marginTop: '2px'
                  }}
                >
                  বং বাড়ি
                </h1>
                
                {/* Vertical Separator - Subtle */}
                <div className="hidden md:block w-[1px] h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                
                {/* Dual Tagline - Stacked with darker English */}
                <div className="hidden md:flex flex-col justify-center leading-none">
                  <span className="text-xs lg:text-[13px] text-black/60 font-medium tracking-wider uppercase">
                    Every Home's Story
                  </span>
                  <span className="text-[10px] lg:text-[11px] text-white/40 font-light bangla-text mt-0.5">
                    প্রতিটা বাড়ির গল্প
                  </span>
                </div>
              </div>
              
              {/* Desktop Navigation - Futuristic */}
              <nav className="hidden md:flex items-center gap-7 lg:gap-9">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative text-sm lg:text-[15px] font-medium tracking-wide transition-all duration-300 cursor-pointer ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    <span className="relative z-10">{item.label}</span>
                    {isActive(item.href) && (
                      <>
                        <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full"></span>
                        <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full blur-sm"></span>
                      </>
                    )}
                  </Link>
                ))}
                
                {/* Enhanced Login/Admin Button */}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link href="/admin">
                      <Button 
                        size="default"
                        variant="ghost" 
                        className="text-white hover:bg-white/20 text-base lg:text-lg h-11 px-4 font-bold transition-all duration-300 hover:scale-105"
                      >
                        <User className="w-5 h-5 mr-2" />
                        Admin
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          size="default"
                          className="bg-green-500 hover:bg-green-600 text-white text-base h-11 px-4 transition-all duration-300 hover:scale-105"
                        >
                          ✓
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm h-8"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link href="/admin">
                    <Button 
                      size="sm"
                      className="relative group bg-[#FFD200] text-[#0E47FF] hover:bg-[#FFC000] font-semibold text-[13px] h-9 px-6 rounded-full transition-all duration-300 shadow-lg shadow-black/10 cursor-pointer"
                    >
                      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FFD200] to-[#FFC000] blur-sm opacity-50 group-hover:opacity-70 transition duration-300"></span>
                      <span className="relative flex items-center">
                        <LogIn className="w-3.5 h-3.5 mr-1.5" />
                        Login
                      </span>
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Mobile Menu Button - Minimal */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 h-10 w-10 rounded-lg"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Promo Banner - Ultra Sleek */}
        <div 
          className="relative overflow-hidden"
          style={{ 
            height: '36px',
            background: 'linear-gradient(90deg, #FFD200 0%, #FFC000 50%, #FFD200 100%)',
            backgroundSize: '200% 100%',
            animation: 'gradient-flow 8s ease infinite'
          }}
        >
          <div className="h-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll-smooth whitespace-nowrap flex">
                <span className="text-[#0E47FF] font-medium text-[13px] lg:text-sm px-8 flex items-center h-full tracking-wide">
                  <span className="mr-3">⚡</span>
                  <span className="mr-8">Special Offer: Flat 50% off on your first subscription</span>
                  <span className="mr-3">🎯</span>
                  <span className="mr-8">New comedy content every week</span>
                  <span className="mr-3">✨</span>
                  <span className="mr-8">Join 10,000+ laughter lovers</span>
                </span>
                <span className="text-[#0E47FF] font-medium text-[13px] lg:text-sm px-8 flex items-center h-full tracking-wide">
                  <span className="mr-3">⚡</span>
                  <span className="mr-8">Special Offer: Flat 50% off on your first subscription</span>
                  <span className="mr-3">🎯</span>
                  <span className="mr-8">New comedy content every week</span>
                  <span className="mr-3">✨</span>
                  <span className="mr-8">Join 10,000+ laughter lovers</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu - Enhanced */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gradient-to-b from-[#0E47FF] to-[#0A3ACC] border-t-2 border-[#FFD200] shadow-lg animate-slide-down">
            <div className="container mx-auto px-4 py-4">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-4 px-5 mb-2 text-white font-bold text-lg rounded-xl transition-all duration-300 ${
                    isActive(item.href) 
                      ? "bg-[#FFD200] text-[#0E47FF] shadow-lg transform scale-105" 
                      : "hover:bg-white/20 hover:transform hover:translate-x-2"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile Login/Admin - Enhanced */}
              <div className="mt-4 pt-4 border-t-2 border-white/30">
                {user ? (
                  <>
                    <Link 
                      href="/admin" 
                      className="block py-4 px-5 mb-2 text-white font-bold text-lg rounded-xl hover:bg-white/20 transition-all duration-300 hover:transform hover:translate-x-2"
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
                      className="block w-full text-left py-4 px-5 text-red-300 font-bold text-lg rounded-xl hover:bg-red-500/20 transition-all duration-300 hover:transform hover:translate-x-2"
                    >
                      <LogOut className="inline w-5 h-5 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/admin" 
                    className="block py-4 px-5 bg-[#FFD200] text-[#0E47FF] font-bold text-lg rounded-xl hover:bg-yellow-400 transition-all duration-300 shadow-lg hover:transform hover:scale-105"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="inline w-5 h-5 mr-2" />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Spacer for fixed navigation */}
      <div style={{ height: '111px' }}></div>
    </>
  );
};

export default Navigation;