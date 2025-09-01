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
        
        {/* Main Header - Professional Design */}
        <header className="bg-gradient-to-r from-[#0E47FF] to-[#0A3ACC] shadow-xl" style={{ height: '95px' }}>
          <div className="container mx-auto px-6 lg:px-8 h-full">
            <div className="flex justify-between items-center h-full gap-4">
              
              {/* Left Section - Logo, Title, Tagline in horizontal sequence */}
              <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-10">
                {/* Logo - Standalone */}
                <Link href="/" className="flex-shrink-0 group">
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari" 
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl group-hover:rotate-3"
                  />
                </Link>
                
                {/* Big Bengali Text - Separated */}
                <h1 
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#FFD200] leading-none whitespace-nowrap bangla-text tracking-wider"
                  style={{ 
                    textShadow: '3px 3px 6px rgba(0,0,0,0.4), 0 0 30px rgba(255,210,0,0.3)',
                    fontFamily: 'var(--font-bengali)'
                  }}
                >
                  বং বাড়ি
                </h1>
                
                {/* Tagline Section - Enhanced */}
                <div className="hidden md:flex flex-col justify-center leading-snug border-l-4 border-[#FFD200] pl-5 ml-2">
                  <p className="text-base lg:text-lg text-white font-bold leading-tight whitespace-nowrap tracking-wide">Every Home's Story</p>
                  <p className="text-base lg:text-lg text-[#FFD200]/90 font-semibold leading-tight bangla-text whitespace-nowrap">প্রতিটা বাড়ির গল্প</p>
                </div>
              </div>
              
              {/* Desktop Navigation - Enhanced Menu */}
              <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative text-white font-bold text-base lg:text-lg transition-all duration-300 hover:text-[#FFD200] hover:scale-105 ${
                      isActive(item.href) 
                        ? "text-[#FFD200] scale-105" 
                        : ""
                    }`}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span className="absolute -bottom-2 left-0 right-0 h-1 bg-[#FFD200] rounded-full animate-pulse"></span>
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
                      size="default"
                      className="bg-[#FFD200] text-[#0E47FF] hover:bg-yellow-400 font-bold text-base lg:text-lg h-11 px-6 transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Mobile Menu Button - Larger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/20 h-12 w-12 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Promo Banner - Enhanced */}
        <div className="bg-gradient-to-r from-[#FFD200] via-[#FFC000] to-[#FFD200]" style={{ height: '48px' }}>
          <div className="h-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll whitespace-nowrap flex">
                <span className="text-black font-bold text-base lg:text-lg px-8 flex items-center h-full">
                  🎉 <span className="mx-2">Special Offer: Flat 50% off on your first Bong Bari subscription</span> • 
                  🔔 <span className="mx-2">Stay tuned for exciting updates</span> • 
                  🎬 <span className="mx-2">New comedy sketches every week</span> • 
                  🏆 <span className="mx-2">Join our community of laughter lovers</span> • 
                </span>
                <span className="text-black font-bold text-base lg:text-lg px-8 flex items-center h-full">
                  🎉 <span className="mx-2">Special Offer: Flat 50% off on your first Bong Bari subscription</span> • 
                  🔔 <span className="mx-2">Stay tuned for exciting updates</span> • 
                  🎬 <span className="mx-2">New comedy sketches every week</span> • 
                  🏆 <span className="mx-2">Join our community of laughter lovers</span> • 
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
      <div style={{ height: '143px' }}></div>
    </>
  );
};

export default Navigation;