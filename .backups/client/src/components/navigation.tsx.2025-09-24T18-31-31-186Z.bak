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
          data-testid="main-navigation"
          className="bg-[#0E47FF] relative overflow-hidden"
          style={{ 
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
          
          <div className="relative container mx-auto">
            <div className="flex flex-nowrap justify-between items-center gap-2 xs:gap-3 md:gap-5 min-w-0 py-2 md:py-3">
              
              {/* Left Section - Ultra Premium Layout */}
              <div className="flex flex-col xs:flex-row items-center min-w-0 flex-shrink flex-grow-0 w-full max-w-full xs:justify-start justify-center text-center xs:text-left">
                {/* Logo - Refined */}
                <div className="w-full flex flex-col xs:hidden mb-1">
                  <span className="text-[10px] text-black/70 font-medium tracking-wide uppercase max-w-full whitespace-nowrap overflow-hidden text-ellipsis" title="Every Home's Story">
                    Every Home's Story
                  </span>
                  <span className="text-[8px] text-white/50 font-light bangla-text mt-0.5 max-w-full whitespace-nowrap overflow-hidden text-ellipsis" title="প্রতিটা বাড়ির গল্প">
                    প্রতিটা বাড়ির গল্প
                  </span>
                </div>
                <Link href="/" data-testid="logo-link" className="group relative cursor-pointer flex-shrink-0 mr-2 xs:mr-3 sm:mr-4">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#FFD200] to-[#FFC000] rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari" 
                    className="relative w-[28px] h-[28px] xs:w-[32px] xs:h-[32px] sm:w-[36px] sm:h-[36px] md:w-[40px] md:h-[40px] lg:w-[44px] lg:h-[44px] rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                
                {/* Bengali Title - Moved down to align with logo center */}
                <h1 
                  className="flex-shrink-0 text-[15px] xs:text-[17px] sm:text-[19px] md:text-[23px] lg:text-[30px] font-bold text-[#FFD200] bangla-text tracking-wide cursor-pointer self-center ml-0 xs:ml-2"
                  style={{ 
                    fontFamily: 'var(--font-bengali)',
                    textShadow: '0 2px 10px rgba(255,210,0,0.2)',
                    marginTop: '1px',
                    lineHeight: 1.1
                  }}
                  title="বং বাড়ি"
                >
                  বং বাড়ি
                </h1>
                
                {/* Vertical Separator - Subtle */}
                <div className="hidden md:block w-[1px] h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                
                {/* Dual Tagline - Responsive: shrink, ellipsis, hide on xs */}
                <div className="hidden xs:flex flex-col justify-center flex-shrink min-w-0 max-w-[40vw] xs:max-w-[32vw] sm:max-w-[26vw] md:max-w-[20vw] leading-tight ml-2 xs:ml-3">
                  <span className="text-[11px] sm:text-[13px] md:text-xs lg:text-[13px] text-black/70 font-medium tracking-wide uppercase max-w-full whitespace-nowrap overflow-hidden text-ellipsis" title="Every Home's Story">
                    Every Home's Story
                  </span>
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] lg:text-[11px] text-white/50 font-light bangla-text mt-0.5 max-w-full whitespace-nowrap overflow-hidden text-ellipsis" title="প্রতিটা বাড়ির গল্প">
                    প্রতিটা বাড়ির গল্প
                  </span>
                </div>
              </div>
              
              {/* Desktop Navigation - Futuristic */}
              <nav className="hidden md:flex items-center gap-7 lg:gap-9">
                {navItems.map((item) => {
                  if (item.href === '/tools') {
                    return (
                      <div key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          className={`relative text-sm lg:text-[15px] font-medium tracking-wide transition-all duration-300 cursor-pointer ${isActive(item.href) ? 'text-[#FFD200]' : 'text-white/80 hover:text-white'}`}
                        >
                          <span className="relative z-10">{item.label}</span>
                          {isActive(item.href) && (
                            <>
                              <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full" />
                              <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full blur-sm" />
                            </>
                          )}
                        </Link>
                        {/* Dropdown for Bong Kahini */}
                        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute top-full left-0 mt-4 min-w-[180px] rounded-xl bg-[#0E47FF]/95 backdrop-blur border border-white/10 shadow-xl p-3 flex flex-col gap-2">
                          <Link
                            href="/community/feed"
                            className="text-xs font-semibold text-white/80 hover:text-white bg-white/0 hover:bg-white/10 rounded-lg px-3 py-2 transition"
                          >
                            Bong Kahini
                          </Link>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative text-sm lg:text-[15px] font-medium tracking-wide transition-all duration-300 cursor-pointer ${isActive(item.href) ? 'text-[#FFD200]' : 'text-white/80 hover:text-white'}`}
                    >
                      <span className="relative z-10">{item.label}</span>
                      {isActive(item.href) && (
                        <>
                          <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full" />
                          <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-[#FFD200] rounded-full blur-sm" />
                        </>
                      )}
                    </Link>
                  );
                })}
                
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
                data-testid="mobile-menu-toggle"
                className="md:hidden text-white hover:bg-white/10 h-10 w-10 rounded-lg shrink-0"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Promo Banner - animated scrolling (news ticker style), scales for mobile */}
        <div 
          className="relative overflow-hidden h-[30px] xs:h-[32px] sm:h-[34px] md:h-[36px]"
          style={{ 
            background: 'linear-gradient(90deg, #FFD200 0%, #FFC000 50%, #FFD200 100%)',
            backgroundSize: '200% 100%',
            animation: 'gradient-flow 8s ease infinite'
          }}
        >
          <div className="absolute inset-0 flex items-center">
            <div className="animate-scroll-smooth whitespace-nowrap flex">
              <span className="text-[#0E47FF] font-medium text-[11px] xs:text-[12px] sm:text-[13px] lg:text-sm px-6 sm:px-8 flex items-center h-full tracking-wide">
                <span className="mr-3">⚡</span>
                <span className="mr-8">Special Offer: Flat 50% off on your first subscription</span>
                <span className="mr-3">🎯</span>
                <span className="mr-8">New comedy content every week</span>
                <span className="mr-3">✨</span>
                <span className="mr-8">Join 10,000+ laughter lovers</span>
              </span>
              <span className="text-[#0E47FF] font-medium text-[11px] xs:text-[12px] sm:text-[13px] lg:text-sm px-6 sm:px-8 flex items-center h-full tracking-wide">
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
        
        {/* Mobile Navigation Menu - Enhanced */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gradient-to-b from-[#0E47FF] to-[#0A3ACC] border-t-2 border-[#FFD200] shadow-lg animate-slide-down">
            <div className="container mx-auto px-4 py-4">
              {navItems.map((item, index) => {
                if (item.href === '/tools') {
                  return (
                    <div key={item.href} className="mb-4">
                      <Link
                        href={item.href}
                        className={`block py-4 px-5 mb-2 text-white font-bold text-lg rounded-xl transition-all duration-300 ${isActive(item.href) ? 'bg-[#FFD200] text-[#0E47FF] shadow-lg transform scale-105' : 'hover:bg-white/20 hover:transform hover:translate-x-2'}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                      <Link
                        href="/community/feed"
                        className="block ml-4 py-3 px-4 text-white/80 font-semibold text-base rounded-lg transition-all duration-300 hover:bg-white/10 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Bong Kahini
                      </Link>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block py-4 px-5 mb-2 text-white font-bold text-lg rounded-xl transition-all duration-300 ${isActive(item.href) ? 'bg-[#FFD200] text-[#0E47FF] shadow-lg transform scale-105' : 'hover:bg-white/20 hover:transform hover:translate-x-2'}`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
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
  <div className="h-[92px] xs:h-[96px] sm:h-[100px] md:h-[111px]"></div>
    </>
  );
};

export default Navigation;