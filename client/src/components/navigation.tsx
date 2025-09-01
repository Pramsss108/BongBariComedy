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
        
        {/* Main Header - Premium Minimalist Design */}
        <header className="bg-[#0E47FF] backdrop-blur-md" style={{ height: '80px' }}>
          <div className="max-w-7xl mx-auto px-4 lg:px-6 h-full">
            <div className="flex justify-between items-center h-full">
              
              {/* Left Section - Premium Design */}
              <div className="flex items-center">
                {/* Logo - Clean */}
                <Link href="/" className="flex-shrink-0 mr-4">
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari" 
                    className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg object-cover"
                  />
                </Link>
                
                {/* Bengali Title - Elegant */}
                <h1 
                  className="text-2xl lg:text-3xl font-bold text-[#FFD200] bangla-text mr-6"
                  style={{ 
                    fontFamily: 'var(--font-bengali)'
                  }}
                >
                  বং বাড়ি
                </h1>
                
                {/* Tagline - Minimal & Gray */}
                <span className="hidden md:inline-block text-xs lg:text-sm text-white/40 font-light">
                  Every Home's Story
                </span>
              </div>
              
              {/* Desktop Navigation - Clean & Modern */}
              <nav className="hidden md:flex items-center gap-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative text-white font-medium text-sm lg:text-base transition-colors duration-200 hover:text-[#FFD200] ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : "text-white/90"
                    }`}
                  >
                    {item.label}
                    {isActive(item.href) && (
                      <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-[#FFD200]"></span>
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
                      className="bg-[#FFD200] text-[#0E47FF] hover:bg-[#FFC000] font-semibold text-sm h-9 px-5 rounded-full transition-all duration-200"
                    >
                      <LogIn className="w-4 h-4 mr-1.5" />
                      Login
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
        
        {/* Promo Banner - Sleek & Modern */}
        <div className="bg-[#FFD200]" style={{ height: '40px' }}>
          <div className="h-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll whitespace-nowrap flex">
                <span className="text-[#0E47FF] font-medium text-sm lg:text-base px-6 flex items-center h-full">
                  🎯 <span className="mx-2">Special Offer: Flat 50% off on your first Bong Bari subscription</span> • 
                  🔔 <span className="mx-2">Stay tuned for exciting updates</span> • 
                  🎬 <span className="mx-2">New comedy sketches every week</span> • 
                  ✨ <span className="mx-2">Join our community of laughter lovers</span> • 
                </span>
                <span className="text-[#0E47FF] font-medium text-sm lg:text-base px-6 flex items-center h-full">
                  🎯 <span className="mx-2">Special Offer: Flat 50% off on your first Bong Bari subscription</span> • 
                  🔔 <span className="mx-2">Stay tuned for exciting updates</span> • 
                  🎬 <span className="mx-2">New comedy sketches every week</span> • 
                  ✨ <span className="mx-2">Join our community of laughter lovers</span> • 
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
      <div style={{ height: '120px' }}></div>
    </>
  );
};

export default Navigation;