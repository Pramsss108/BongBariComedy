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
      {/* Navigation Container - Completely Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full">
        
        {/* Promo Banner - Top (Same size as Flaticon) */}
        <div className="bg-[#FFD200]" style={{ height: '35px' }}>
          <div className="h-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-scroll whitespace-nowrap flex">
                <span className="text-black font-semibold text-xs px-3">
                  Special Offer: Flat 50% off on first Bong Bari subscription
                </span>
                <span className="text-black font-medium text-xs px-1">|</span>
                <span className="text-black font-semibold text-xs px-3">
                  Stay tuned for updates
                </span>
                <span className="text-black font-medium text-xs px-1">|</span>
                <span className="text-black font-semibold text-xs px-3">
                  Special Offer: Flat 50% off on first Bong Bari subscription
                </span>
                <span className="text-black font-medium text-xs px-1">|</span>
                <span className="text-black font-semibold text-xs px-3">
                  Stay tuned for updates
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Header - Increased Height for Better Visibility */}
        <header className="bg-[#0E47FF] shadow-md" style={{ height: '72px' }}>
          <div className="container mx-auto px-4 h-full">
            <div className="flex justify-between items-center h-full">
              
              {/* Logo Only - Left Side */}
              <Link href="/" className="flex items-center" style={{ position: 'relative' }}>
                <img 
                  src="/logo.png" 
                  alt="Bong Bari" 
                  className="w-12 h-12 rounded-lg flex-shrink-0"
                />
              </Link>
              
              {/* Desktop Navigation - Bigger Menu Items */}
              <nav className="hidden md:flex items-center space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-white font-semibold text-base transition-all duration-200 hover:text-[#FFD200] ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Login/Admin Button */}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link href="/admin">
                      <Button 
                        size="default"
                        variant="ghost" 
                        className="text-white hover:bg-white/10 text-sm h-9 px-4"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          size="default"
                          className="bg-green-500 hover:bg-green-600 text-white text-sm h-9 px-3"
                        >
                          ✓
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
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
                      className="bg-white text-[#0E47FF] hover:bg-gray-100 font-semibold text-sm h-9 px-4"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Big Bengali Text - Right Side */}
              <div className="flex items-center">
                <h1 className="text-[#FFD200] font-bold text-2xl md:text-3xl lg:text-4xl bangla-text hidden sm:block">
                  বং বাড়ি
                </h1>
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white hover:bg-white/10 h-10 w-10 ml-4"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </div>
        </header>
        
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
      <div style={{ height: '107px' }}></div>
    </>
  );
};

export default Navigation;