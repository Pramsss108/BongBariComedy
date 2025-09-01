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
      <div className="fixed top-0 left-0 right-0 z-50 w-full">
        
        {/* Main Header - Clean Slim Design */}
        <header className="bg-[#0E47FF] shadow-md" style={{ height: '56px' }}>
          <div className="container mx-auto px-4 h-full">
            <div className="flex justify-between items-center h-full">
              
              {/* Logo Section - Aligned Layout */}
              <Link href="/" className="flex items-center space-x-2">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari" 
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                />
                <div className="flex flex-col justify-between h-10 py-1">
                  <h1 className="text-[11px] font-bold text-[#FFD200] leading-none whitespace-nowrap bangla-text">বং বাড়ি</h1>
                  <p className="text-[8px] text-white/90 leading-none whitespace-nowrap">Every Home's Story</p>
                  <p className="text-[8px] text-white/90 leading-none bangla-text whitespace-nowrap">প্রতিটা বাড়ির গল্প</p>
                </div>
              </Link>
              
              {/* Desktop Navigation - Compact Menu */}
              <nav className="hidden md:flex items-center space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-white font-medium text-xs transition-all duration-200 hover:text-[#FFD200] ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Compact Login/Admin Button */}
                {user ? (
                  <div className="flex items-center space-x-2">
                    <Link href="/admin">
                      <Button 
                        size="sm"
                        variant="ghost" 
                        className="text-white hover:bg-white/10 text-xs h-7 px-2"
                      >
                        <User className="w-3 h-3 mr-1" />
                        Admin
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white text-xs h-7 px-2"
                        >
                          ✓
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-24 p-1">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-6"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link href="/admin">
                    <Button 
                      size="sm"
                      className="bg-white text-[#0E47FF] hover:bg-gray-100 font-medium text-xs h-7 px-3"
                    >
                      <LogIn className="w-3 h-3 mr-1" />
                      Login
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10 h-8 w-8"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Promo Banner - Slim */}
        <div className="bg-[#FFD200]" style={{ height: '35px' }}>
          <div className="h-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center">
              <div className="animate-scroll whitespace-nowrap flex">
                <span className="text-black font-semibold text-sm px-6">
                  🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                  🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                </span>
                <span className="text-black font-semibold text-sm px-6">
                  🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                  🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0E47FF] border-t border-white/10">
            <div className="container mx-auto px-4 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-2 px-3 text-white font-medium text-sm rounded-lg transition-colors ${
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
              <div className="mt-3 pt-3 border-t border-white/20">
                {user ? (
                  <>
                    <Link 
                      href="/admin" 
                      className="block py-2 px-3 text-white font-medium text-sm rounded-lg hover:bg-white/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="inline w-4 h-4 mr-1" />
                      Admin Panel
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-2 px-3 text-red-300 font-medium text-sm rounded-lg hover:bg-white/10"
                    >
                      <LogOut className="inline w-4 h-4 mr-1" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/admin" 
                    className="block py-2 px-3 text-white font-medium text-sm rounded-lg hover:bg-white/10"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="inline w-4 h-4 mr-1" />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Spacer for fixed navigation */}
      <div style={{ height: '91px' }}></div>
    </>
  );
};

export default Navigation;