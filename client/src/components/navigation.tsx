import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/work-with-us", label: "Work with us" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
    { href: "/admin", label: "Admin" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50" data-testid="main-navigation">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center py-2 sm:py-3">
          {/* Logo - Optimized Layout */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-start space-x-4 cursor-pointer hover-logo-container group">
              <div className="relative logo-hover-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-14 h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl"
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
              {/* Mobile Logo - Bigger and More Prominent */}
              <div className="md:hidden flex flex-col justify-center pl-2 min-w-[140px]">
                <h1 className="text-xl sm:text-2xl font-bold text-brand-blue bangla-text leading-tight mb-1">বং বাড়ি</h1>
                <p className="text-[11px] sm:text-xs text-gray-700 font-semibold leading-tight whitespace-nowrap group-hover:text-brand-blue transition-colors duration-300">Every Home's Story</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 bangla-text leading-tight group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
              </div>
              {/* Desktop Logo - Bigger and More Prominent */}
              <div className="hidden md:flex flex-col justify-center pl-3 min-w-[240px]">
                <h1 className="font-bold text-brand-blue bangla-text whitespace-nowrap text-[32px] lg:text-[36px] leading-tight mb-1">বং বাড়ি</h1>
                <p className="text-base lg:text-lg font-semibold text-gray-800 leading-tight whitespace-nowrap mb-1 group-hover:text-brand-blue transition-colors duration-300">Every Home's Story — Bong Bari</p>
                <p className="text-sm lg:text-base text-gray-600 bangla-text leading-tight whitespace-nowrap group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প — বং বাড়ি</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - Optimized Spacing */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4 xl:space-x-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-medium text-sm lg:text-base transition-all duration-200 hover:text-brand-blue hover:scale-105 ${
                  isActive(item.href) 
                    ? "text-brand-blue border-b-2 border-brand-blue pb-1" 
                    : "text-gray-700 hover:border-b-2 hover:border-brand-blue pb-1"
                }`}
                data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          
          {/* Mobile Menu Button - Enhanced Touch Target */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden p-2 hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </Button>
        </div>
        
        {/* Mobile Navigation - Enhanced Touch Experience */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-4" data-testid="mobile-menu">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-4 px-2 font-medium text-lg transition-all duration-200 hover:text-brand-blue hover:bg-gray-50 rounded-lg mx-2 my-1 ${
                  isActive(item.href) ? "text-brand-blue bg-blue-50" : "text-gray-700"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
                data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
