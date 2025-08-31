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
      <div className="container mx-auto px-1 sm:px-2">
        <div className="flex justify-between items-center py-0 px-0 sm:py-0.5">
          {/* Logo - Optimized Layout */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-center space-x-1 cursor-pointer hover-logo-container group w-full">
              <div className="relative logo-hover-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl"
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
              {/* Mobile Logo - Professional Readable Layout */}
              <div className="md:hidden flex flex-col justify-center pl-0.5 flex-1">
                <h1 className="text-sm font-bold text-brand-blue bangla-text leading-none mb-0">বং বাড়ি</h1>
                <div className="space-y-0">
                  <p className="text-[8px] font-semibold text-gray-800 leading-none group-hover:text-brand-blue transition-colors duration-300">Every Home's Story</p>
                  <p className="text-[8px] text-gray-600 bangla-text font-medium leading-none group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
                </div>
              </div>
              {/* Desktop Logo - Maximum Visibility */}
              <div className="hidden md:flex flex-col justify-center pl-0.5 min-w-[180px]">
                <h1 className="font-bold text-brand-blue bangla-text whitespace-nowrap text-[18px] lg:text-[22px] xl:text-[26px] leading-none mb-0">বং বাড়ি</h1>
                <p className="text-[10px] lg:text-xs xl:text-sm font-bold text-gray-800 leading-none whitespace-nowrap mb-0 group-hover:text-brand-blue transition-colors duration-300">Every Home's Story — Bong Bari</p>
                <p className="text-[8px] lg:text-[10px] xl:text-xs text-gray-600 bangla-text font-semibold leading-none whitespace-nowrap group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প — বং বাড়ি</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - High Visibility All Devices */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3 xl:space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-semibold text-xs lg:text-sm xl:text-base transition-all duration-200 hover:text-brand-blue hover:scale-105 hover:font-bold ${
                  isActive(item.href) 
                    ? "text-brand-blue border-b-2 border-brand-blue pb-0" 
                    : "text-gray-700 hover:border-b-2 hover:border-brand-blue pb-0"
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-5 px-4 font-bold text-xl transition-all duration-200 hover:text-brand-blue hover:bg-gray-50 rounded-lg mx-3 my-2 ${
                  isActive(item.href) ? "text-brand-blue bg-blue-50 border-l-4 border-brand-blue" : "text-gray-800"
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
