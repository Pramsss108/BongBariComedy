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
        <div className="flex justify-between items-center py-3 sm:py-4 md:py-5">
          {/* Logo - Optimized Layout */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-start space-x-4 cursor-pointer hover-logo-container">
              <div className="relative logo-hover-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-lg transition-all duration-300 hover:scale-125 hover:rotate-3 hover:shadow-2xl"
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
              {/* Mobile Logo - Enhanced Responsive */}
              <div className="md:hidden flex flex-col justify-start pt-1 pr-2 min-w-[110px]">
                <h1 className="text-lg sm:text-xl font-bold text-brand-blue bangla-text leading-tight mb-1 pt-[2px] pb-[2px]">বং বাড়ি</h1>
                <p className="text-[11px] sm:text-xs text-gray-600 leading-tight whitespace-nowrap">Family Comedy</p>
              </div>
              {/* Desktop Logo - Fixed Layout */}
              <div className="hidden md:flex flex-col justify-start pt-1 min-w-[140px]">
                <h1 className="font-bold text-brand-blue bangla-text whitespace-nowrap text-[26px] leading-tight mb-1 pt-[2px] pb-[2px]">বং বাড়ি</h1>
                <p className="text-xs text-gray-600 leading-tight whitespace-nowrap">Bengali Comedy</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - Enhanced Responsive */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 xl:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-semibold text-base lg:text-lg xl:text-xl transition-all duration-300 hover:text-brand-blue hover:scale-125 hover:-translate-y-1 hover:drop-shadow-lg ${
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
            className="md:hidden p-3 hover:bg-gray-100 transition-colors"
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
