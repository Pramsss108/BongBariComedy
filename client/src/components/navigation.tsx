import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, User, LogIn, LogOut, Home, Info, Briefcase, Phone, BookOpen } from "lucide-react";
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
    { href: "/", label: "Home", icon: Home },
    { href: "/about", label: "About", icon: Info },
    { href: "/work-with-us", label: "Work with us", icon: Briefcase },
    { href: "/contact", label: "Contact", icon: Phone },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { 
      href: "/admin", 
      label: user ? "Admin Panel" : "Login",
      icon: user ? User : LogIn,
      special: true
    },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full" data-testid="main-navigation">
      {/* Professional Header with Glassmorphism */}
      <nav className="bg-gradient-to-r from-blue-700 via-brand-blue to-blue-700 backdrop-blur-xl shadow-2xl">
        <div className="relative">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-yellow to-transparent"></div>
          
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              
              {/* Premium Logo Section */}
              <Link href="/" data-testid="logo-link">
                <div className="group flex items-center space-x-4 py-2">
                  {/* Logo with glow effect */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-yellow rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <img 
                      src="/logo.png" 
                      alt="Bong Bari" 
                      className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12"
                    />
                  </div>
                  
                  {/* Brand Text with premium styling */}
                  <div className="flex flex-col space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-black text-white bangla-text tracking-wide group-hover:text-brand-yellow transition-colors duration-300">
                      বং বাড়ি
                    </h1>
                    <div className="flex flex-col space-y-0">
                      <p className="text-xs lg:text-sm font-bold text-yellow-300 uppercase tracking-wider group-hover:text-white transition-colors">
                        Every Home's Story
                      </p>
                      <p className="text-[10px] lg:text-xs text-blue-200 bangla-text font-medium opacity-90 group-hover:text-yellow-200 transition-colors">
                        প্রতিটা বাড়ির গল্প
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Premium Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-2">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isLoginItem = item.special;
                  const isLoggedIn = user && isLoginItem;
                  
                  if (isLoggedIn) {
                    return (
                      <div key={item.href} className="flex items-center space-x-2">
                        <Link
                          href={item.href}
                          className={`group relative px-5 py-3 font-bold text-sm uppercase tracking-wide transition-all duration-300 ${
                            isActive(item.href) 
                              ? "text-brand-yellow" 
                              : "text-white hover:text-brand-yellow"
                          }`}
                          data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {/* Active indicator */}
                          {isActive(item.href) && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-yellow rounded-t-full"></div>
                          )}
                        </Link>
                        <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                          <PopoverTrigger asChild>
                            <button className="px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-green-900 text-xs font-bold uppercase rounded-full hover:from-green-300 hover:to-green-400 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
                              ● Active
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-36 p-2 bg-white/95 backdrop-blur-sm">
                            <Button
                              onClick={handleLogout}
                              variant="ghost"
                              size="sm"
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                              data-testid="logout-popup-button"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Logout
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }
                  
                  // Special styling for Login button
                  if (item.special && !user) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="ml-4 px-6 py-2.5 bg-gradient-to-r from-brand-yellow to-yellow-400 text-blue-900 font-bold text-sm uppercase tracking-wide rounded-full hover:from-yellow-300 hover:to-yellow-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                        data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative px-5 py-3 font-bold text-sm uppercase tracking-wide transition-all duration-300 ${
                        isActive(item.href) 
                          ? "text-brand-yellow" 
                          : "text-white hover:text-brand-yellow"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 opacity-75 group-hover:opacity-100" />
                        <span>{item.label}</span>
                      </div>
                      {/* Active indicator */}
                      {isActive(item.href) && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-yellow rounded-t-full"></div>
                      )}
                      {/* Hover effect */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-yellow scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
                    </Link>
                  );
                })}
              </div>
              
              {/* Tablet Navigation (Medium Screens) */}
              <div className="hidden md:flex lg:hidden items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isLoginItem = item.special;
                  const isLoggedIn = user && isLoginItem;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 font-semibold text-xs uppercase transition-all duration-300 flex items-center space-x-1 rounded-lg ${
                        isActive(item.href) 
                          ? "text-brand-yellow bg-white/10" 
                          : item.special && !user
                            ? "text-blue-900 bg-brand-yellow hover:bg-yellow-400"
                            : isLoggedIn 
                              ? "text-green-300 hover:text-green-200"
                              : "text-white hover:text-brand-yellow hover:bg-white/5"
                      }`}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden md:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden p-2 hover:bg-white/10 transition-all duration-300 rounded-xl"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {isMobileMenuOpen ? 
                  <X className="h-7 w-7 text-white" /> : 
                  <Menu className="h-7 w-7 text-white" />
                }
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu - Slide Down */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ${
          isMobileMenuOpen ? 'max-h-96' : 'max-h-0'
        }`}>
          <div className="bg-blue-800/95 backdrop-blur-xl border-t border-blue-600/30">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLoginItem = item.special;
                const isLoggedIn = user && isLoginItem;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-base transition-all duration-200 ${
                      isActive(item.href) 
                        ? "text-brand-yellow bg-white/20" 
                        : item.special && !user
                          ? "text-blue-900 bg-brand-yellow hover:bg-yellow-400"
                          : isLoggedIn
                            ? "text-green-300 bg-green-900/30"
                            : "text-white hover:text-brand-yellow hover:bg-white/10"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {isLoggedIn && (
                      <span className="ml-auto px-3 py-1 bg-green-400 text-green-900 text-xs font-bold rounded-full">
                        Active
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      
      {/* Promotional Banner - More Professional */}
      <div className="bg-gradient-to-r from-yellow-400 via-brand-yellow to-yellow-400 border-b-2 border-yellow-500/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl animate-pulse">🎬</span>
              <span className="hidden sm:inline text-2xl">🎭</span>
            </div>
            <p className="text-sm lg:text-base font-black text-blue-900 text-center uppercase tracking-wide">
              <span className="hidden sm:inline">New Comedy Every Week</span>
              <span className="sm:hidden">Weekly Comedy</span>
              <span className="text-red-600 mx-2 text-lg">•</span>
              <span className="bangla-text font-bold">নতুন কমেডি প্রতি সপ্তাহে</span>
            </p>
            <div className="flex items-center space-x-2">
              <span className="hidden sm:inline text-2xl">🤣</span>
              <span className="text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;