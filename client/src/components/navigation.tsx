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
  const { user, isLoading, logout } = useAuth();
  
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
    <header className="fixed top-0 left-0 right-0 z-50 w-full" data-testid="main-navigation">
      {/* Main Blue Navigation Header */}
      <nav className="bg-gradient-to-r from-brand-blue via-blue-600 to-brand-blue shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo Section */}
            <Link href="/" data-testid="logo-link">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="Bong Bari Logo" 
                    className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-md"
                  />
                  {/* Hover Emojis */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:block">
                    <span className="absolute -top-2 -left-2 text-lg animate-bounce">😂</span>
                    <span className="absolute -top-2 -right-2 text-sm animate-bounce delay-100">❤️</span>
                    <span className="absolute -bottom-2 -left-2 text-sm animate-bounce delay-200">🎭</span>
                    <span className="absolute -bottom-2 -right-2 text-xs animate-bounce delay-300">✨</span>
                  </div>
                </div>
                
                {/* Brand Text */}
                <div className="flex flex-col">
                  <h1 className="text-xl lg:text-3xl font-bold text-brand-yellow bangla-text leading-none group-hover:text-yellow-200 transition-colors">
                    বং বাড়ি
                  </h1>
                  <p className="text-xs lg:text-sm font-semibold text-white leading-none group-hover:text-yellow-100 transition-colors">
                    Every Home's Story
                  </p>
                  <p className="text-xs text-blue-100 bangla-text font-medium leading-none group-hover:text-yellow-200 transition-colors">
                    প্রতিটা বাড়ির গল্প
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLoginItem = item.href === "/admin";
                const isLoggedIn = user && isLoginItem;
                
                return isLoggedIn ? (
                  <div key={item.href} className="flex items-center space-x-3">
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-semibold text-sm lg:text-base transition-all duration-300 hover:scale-105 ${
                        isActive(item.href) 
                          ? "text-brand-yellow bg-white/10 border border-brand-yellow" 
                          : "text-green-300 hover:text-green-200 hover:bg-white/10"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {Icon && <Icon className="w-5 h-5" />}
                      <span>{item.label}</span>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button 
                          className="px-4 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-full hover:bg-green-200 transition-all duration-300 hover:scale-105 shadow-sm"
                          data-testid="logged-in-badge"
                        >
                          ● Logged In
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-3">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid="logout-popup-button"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-semibold text-sm lg:text-base transition-all duration-300 hover:scale-105 ${
                      isActive(item.href) 
                        ? "text-brand-yellow bg-white/10 border border-brand-yellow" 
                        : "text-white hover:text-brand-yellow hover:bg-white/10"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
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
              {isMobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-blue-700/95 backdrop-blur-sm border-t border-blue-500/20" data-testid="mobile-menu">
            <div className="px-4 py-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLoginItem = item.href === "/admin";
                const isLoggedIn = user && isLoginItem;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold text-base transition-all duration-200 ${
                      isActive(item.href) 
                        ? "text-brand-yellow bg-white/20 border-l-4 border-brand-yellow" 
                        : isLoggedIn
                          ? "text-green-300 bg-green-900/20"
                          : "text-white hover:text-brand-yellow hover:bg-white/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span>{item.label}</span>
                    {isLoggedIn && (
                      <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Logged In
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
      
      {/* Yellow Promotional Banner */}
      <div className="bg-gradient-to-r from-brand-yellow via-yellow-300 to-brand-yellow border-b border-yellow-400/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-3">
            <span className="text-2xl animate-bounce">🎬</span>
            <p className="text-sm lg:text-base font-bold text-brand-blue text-center">
              <span className="hidden sm:inline">New Comedy Every Week!</span>
              <span className="sm:hidden">Weekly Comedy!</span>
              <span className="text-brand-red mx-2">|</span>
              <span className="bangla-text">নতুন কমেডি প্রতি সপ্তাহে!</span>
            </p>
            <span className="text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>🎭</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;