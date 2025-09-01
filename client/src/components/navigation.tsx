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
    { 
      href: "/admin", 
      label: user ? "Admin Panel" : "Login ➝",
      icon: user ? User : LogIn
    },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full" data-testid="main-navigation">
      {/* Main Header - #0D47FF Background, 60px Height */}
      <header style={{ backgroundColor: '#0D47FF', height: '60px' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            
            {/* Left Side: Logo + Text */}
            <Link href="/" data-testid="logo-link">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari Logo" 
                    className="w-10 h-10 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
                  />
                </div>
                
                {/* Brand Text */}
                <div className="flex flex-col">
                  <h1 className="text-lg lg:text-xl font-bold text-white bangla-text leading-tight">
                    বং বাড়ি
                  </h1>
                  <p className="text-xs text-white/90 leading-tight">
                    Every Home's Story
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Right Side: Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLoginItem = item.href === "/admin";
                const isLoggedIn = user && isLoginItem;
                
                return isLoggedIn ? (
                  <div key={item.href} className="flex items-center space-x-3">
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-1 font-medium text-sm transition-colors duration-200 ${
                        isActive(item.href) 
                          ? "text-white" 
                          : "text-white hover:text-[#FFD200]"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button 
                          className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full hover:bg-green-200 transition-all duration-200"
                          data-testid="logged-in-badge"
                        >
                          ● Logged In
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid="logout-popup-button"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 font-medium text-sm transition-colors duration-200 ${
                      isActive(item.href) 
                        ? "text-white" 
                        : "text-white hover:text-[#FFD200]"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden p-2 hover:bg-white/10 transition-colors rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0D47FF]/95 backdrop-blur-sm border-t border-white/20" data-testid="mobile-menu">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLoginItem = item.href === "/admin";
                const isLoggedIn = user && isLoginItem;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors duration-200 ${
                      isActive(item.href) 
                        ? "text-white bg-white/20" 
                        : isLoggedIn
                          ? "text-green-300"
                          : "text-white hover:text-[#FFD200] hover:bg-white/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                    {isLoggedIn && (
                      <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Logged In
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>
      
      {/* Promo Banner - #FFD200 Yellow Background, 35px Height, Scrolling Ticker */}
      <div 
        style={{ backgroundColor: '#FFD200', height: '35px' }} 
        className="overflow-hidden flex items-center"
      >
        <span className="animate-scroll text-black font-bold text-sm">
          🔥 Special Offer: Flat 50% off on your first Bong Bari subscription 🔔 Stay tuned for updates • 
          🔥 Special Offer: Flat 50% off on your first Bong Bari subscription 🔔 Stay tuned for updates • 
        </span>
      </div>
    </div>
  );
};

export default Navigation;