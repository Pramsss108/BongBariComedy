import { useState, useEffect, useRef } from "react";
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
  const [location, setLocation] = useLocation();
  const { user, isLoading, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    setLogoutPopoverOpen(false);
    // Force page refresh after logout to restore belan cursor
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
      label: user ? "Admin Panel" : "Login",
      icon: user ? User : LogIn
    },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-gray-100" data-testid="main-navigation">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-1.5 lg:py-2">
          {/* Logo - Optimized Layout */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-center space-x-1 cursor-pointer hover-logo-container group w-full">
              <div className="relative logo-hover-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl"
                />
                {/* Animated Emojis on Hover - DESKTOP ONLY */}
                <div className="absolute inset-0 pointer-events-none hidden lg:block">
                  <span className="emoji-float emoji-1 text-xl">😂</span>
                  <span className="emoji-float emoji-2 text-lg">❤️</span>
                  <span className="emoji-float emoji-3 text-lg">🎭</span>
                  <span className="emoji-float emoji-4 text-sm">✨</span>
                  <span className="emoji-float emoji-5 text-sm">🌟</span>
                  <span className="emoji-float emoji-6 text-lg">🤣</span>
                </div>
              </div>
              {/* Mobile Logo - Original Sizes with Compact Height */}
              <div className="md:hidden flex flex-col justify-center pl-0.5 flex-1">
                <h1 className="text-sm font-bold text-brand-blue bangla-text leading-none mb-0">বং বাড়ি</h1>
                <div className="space-y-0">
                  <p className="text-[8px] font-semibold text-gray-800 leading-none group-hover:text-brand-blue transition-colors duration-300">Every Home's Story</p>
                  <p className="text-[8px] text-gray-600 bangla-text font-medium leading-none group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
                </div>
              </div>
              {/* Desktop Logo - Original Sizes with Compact Height */}
              <div className="hidden md:flex flex-col justify-center pl-3 min-w-[280px]">
                <h1 className="font-bold text-brand-blue bangla-text whitespace-nowrap text-[18px] lg:text-[32px] xl:text-[40px] leading-none mb-0.5">বং বাড়ি</h1>
                <p className="text-[10px] lg:text-base xl:text-lg font-bold text-gray-800 leading-none whitespace-nowrap mb-0 group-hover:text-brand-blue transition-colors duration-300">Every Home's Story</p>
                <p className="text-[8px] lg:text-sm xl:text-base text-gray-600 bangla-text font-semibold leading-none whitespace-nowrap group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - Premium Layout */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8 xl:space-x-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLoginItem = item.href === "/admin";
              const isLoggedIn = user && isLoginItem;
              
              return isLoggedIn ? (
                <div key={item.href} className="relative flex items-center">
                  <Link
                    href={item.href}
                    className={`font-semibold text-sm lg:text-lg xl:text-xl transition-all duration-300 hover:text-brand-blue hover:scale-105 ${
                      isActive(item.href) 
                        ? "text-brand-blue border-b-3 border-brand-blue pb-2 shadow-sm" 
                        : "text-green-600 hover:text-green-700 hover:border-b-2 hover:border-green-600 pb-2"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="flex items-center gap-1">
                      {Icon && <Icon className="w-4 h-4 lg:w-5 lg:h-5" />}
                      {item.label}
                    </span>
                  </Link>
                  <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        className="ml-3 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full cursor-pointer hover:bg-green-200 transition-all duration-300 hover:scale-105 shadow-sm"
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
                        Logout?
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-semibold text-xs lg:text-base xl:text-lg transition-all duration-200 hover:text-brand-blue hover:scale-105 hover:font-bold ${
                    isActive(item.href) 
                      ? "text-brand-blue border-b-2 border-brand-blue pb-1" 
                      : "text-gray-700 hover:border-b-2 hover:border-brand-blue pb-1"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="flex items-center gap-1">
                    {Icon && <Icon className="w-4 h-4 lg:w-5 lg:h-5" />}
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile Menu Button - Enhanced Touch Target */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden p-2 hover:bg-gray-100 transition-colors rounded-lg flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-8 w-8 text-gray-800" /> : <Menu className="h-8 w-8 text-gray-800" />}
          </Button>
        </div>
        
        {/* Mobile Navigation - Maximum Visibility */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-4 bg-white shadow-lg" data-testid="mobile-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLoginItem = item.href === "/admin";
              const isLoggedIn = user && isLoginItem;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-5 px-4 font-bold text-xl transition-all duration-200 hover:text-brand-blue hover:bg-gray-50 rounded-lg mx-3 my-2 ${
                    isActive(item.href) 
                      ? "text-brand-blue bg-blue-50 border-l-4 border-brand-blue" 
                      : isLoggedIn
                        ? "text-green-600 bg-green-50"
                        : "text-gray-800"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="w-6 h-6" />}
                    {item.label}
                    {isLoggedIn && <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">Logged In</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
