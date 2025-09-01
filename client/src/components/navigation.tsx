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
      {/* Professional Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full">
        
        {/* Main Header - Premium Blue Design */}
        <header className="bg-[#0E47FF] shadow-lg">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-center h-[68px]">
              
              {/* Logo Section - Enhanced */}
              <Link href="/" className="flex items-center space-x-3 group">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari" 
                  className="w-12 h-12 rounded-lg transition-transform duration-300 group-hover:scale-110 shadow-lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white bangla-text tracking-wide">বং বাড়ি</h1>
                  <p className="text-sm text-white/90 font-medium">Every Home's Story</p>
                </div>
              </Link>
              
              {/* Desktop Navigation - Enhanced Typography */}
              <nav className="hidden md:flex items-center space-x-8 lg:space-x-10">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-white font-semibold text-base lg:text-lg transition-all duration-200 hover:text-[#FFD200] relative ${
                      isActive(item.href) 
                        ? "text-[#FFD200] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[3px] after:bg-[#FFD200]" 
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Login/Admin Button - Premium Style */}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link href="/admin">
                      <Button 
                        variant="ghost" 
                        size="default"
                        className="text-white hover:bg-white/10 border-2 border-white/30 font-semibold text-base px-5"
                      >
                        <User className="w-5 h-5 mr-2" />
                        Admin Panel
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          size="default"
                          className="bg-green-500 hover:bg-green-600 text-white font-bold text-base px-5"
                        >
                          ✓ Logged In
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-36 p-2">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="default"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                        >
                          <LogOut className="w-5 h-5 mr-2" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link href="/admin">
                    <Button 
                      size="default"
                      className="bg-white text-[#0E47FF] hover:bg-gray-100 font-bold text-base px-6 py-2 shadow-lg"
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
                className="md:hidden text-white hover:bg-white/10 w-12 h-12"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Professional Promo Banner - Enhanced Visibility */}
        <div className="bg-[#FFD200] h-[38px] overflow-hidden relative shadow-sm">
          <div className="absolute inset-0 flex items-center">
            <div className="animate-scroll whitespace-nowrap flex">
              <span className="text-black font-bold text-base px-8">
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
              </span>
              <span className="text-black font-bold text-base px-8">
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu - Enhanced */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0E47FF] border-t border-white/10 shadow-lg">
            <div className="container mx-auto px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-3 px-4 text-white font-semibold text-lg rounded-lg transition-colors ${
                    isActive(item.href) 
                      ? "bg-white/20 text-[#FFD200]" 
                      : "hover:bg-white/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile Login/Admin */}
              <div className="mt-4 pt-4 border-t border-white/20">
                {user ? (
                  <>
                    <Link 
                      href="/admin" 
                      className="block py-3 px-4 text-white font-semibold text-lg rounded-lg hover:bg-white/10"
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
                      className="block w-full text-left py-3 px-4 text-red-300 font-semibold text-lg rounded-lg hover:bg-white/10"
                    >
                      <LogOut className="inline w-5 h-5 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/admin" 
                    className="block py-3 px-4 text-white font-semibold text-lg rounded-lg hover:bg-white/10"
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
      <div className="h-[106px]"></div>
    </>
  );
};

export default Navigation;