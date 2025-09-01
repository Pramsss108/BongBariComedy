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
    <nav className="fixed w-full z-50" style={{ top: '-5px', left: 0, margin: 0, padding: 0, border: 0, outline: 0 }} data-testid="main-navigation">
      {/* Main Navigation */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-600 shadow-lg" style={{ margin: 0, padding: 0, border: 0, outline: 0 }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10 lg:h-12">
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
              {/* Mobile Logo - Original Sizes */}
              <div className="md:hidden flex flex-col justify-center pl-0.5 flex-1">
                <h1 className="text-sm font-bold text-brand-yellow bangla-text leading-none mb-0">বং বাড়ি</h1>
                <div className="space-y-0">
                  <p className="text-[8px] font-semibold text-white leading-none group-hover:text-brand-yellow transition-colors duration-300">Every Home's Story</p>
                  <p className="text-[8px] text-blue-100 bangla-text font-medium leading-none group-hover:text-brand-yellow transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
                </div>
              </div>
              {/* Desktop Logo - Original Sizes */}
              <div className="hidden md:flex flex-col justify-center pl-3 min-w-[280px]">
                <h1 className="font-bold text-brand-yellow bangla-text whitespace-nowrap text-[18px] lg:text-[32px] xl:text-[40px] leading-none mb-0">বং বাড়ি</h1>
                <p className="text-[10px] lg:text-base xl:text-lg font-bold text-white leading-none whitespace-nowrap mb-0 group-hover:text-brand-yellow transition-colors duration-300">Every Home's Story</p>
                <p className="text-[8px] lg:text-sm xl:text-base text-blue-100 bangla-text font-semibold leading-none whitespace-nowrap group-hover:text-brand-yellow transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - Original Layout */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8 xl:space-x-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLoginItem = item.href === "/admin";
              const isLoggedIn = user && isLoginItem;
              
              return isLoggedIn ? (
                <div key={item.href} className="relative flex items-center">
                  <Link
                    href={item.href}
                    className={`font-semibold text-sm lg:text-lg xl:text-xl transition-all duration-300 hover:text-brand-yellow hover:scale-105 ${
                      isActive(item.href) 
                        ? "text-brand-yellow border-b-2 border-brand-yellow" 
                        : "text-green-300 hover:text-green-200 hover:border-b-2 hover:border-green-200"
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
                  className={`font-semibold text-xs lg:text-base xl:text-lg transition-all duration-200 hover:text-brand-yellow hover:scale-105 ${
                    isActive(item.href) 
                      ? "text-brand-yellow border-b-2 border-brand-yellow" 
                      : "text-white hover:border-b-2 hover:border-brand-yellow"
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
          
          {/* Mobile Menu Button - Original Size */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden p-2 hover:bg-white/10 transition-colors rounded-lg flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-8 w-8 text-white" /> : <Menu className="h-8 w-8 text-white" />}
          </Button>
          </div>
        </div>
      </div>
      
      {/* Promotional Banner - Below Navigation */}
      <div className="bg-gradient-to-r from-brand-yellow via-yellow-300 to-brand-yellow">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🎬</span>
            <p className="text-sm sm:text-base font-bold text-brand-blue">
              New Comedy Every Week! 
              <span className="text-brand-red mx-2">|</span>
              <span className="bangla-text">নতুন কমেডি প্রতি সপ্তাহে!</span>
            </p>
            <span className="text-2xl animate-bounce animation-delay-200">🎭</span>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation - Maximum Visibility */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 bg-gradient-to-r from-brand-blue to-blue-600 shadow-lg" data-testid="mobile-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLoginItem = item.href === "/admin";
              const isLoggedIn = user && isLoginItem;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-5 px-4 font-bold text-xl transition-all duration-200 hover:bg-white/10 rounded-lg mx-3 my-2 ${
                    isActive(item.href) 
                      ? "text-brand-yellow bg-white/20 border-l-4 border-brand-yellow" 
                      : isLoggedIn
                        ? "text-green-300 bg-green-900/20"
                        : "text-white hover:text-brand-yellow"
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
    </nav>
  );
};

export default Navigation;
