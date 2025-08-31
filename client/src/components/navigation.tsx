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
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center py-0.5 px-1 sm:py-1">
          {/* Logo - Optimized Layout */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-center space-x-3 cursor-pointer hover-logo-container group w-full">
              <div className="relative logo-hover-wrapper">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 xl:w-18 xl:h-18 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl"
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
              <div className="md:hidden flex flex-col justify-center pl-1 flex-1">
                <h1 className="text-lg font-bold text-brand-blue bangla-text leading-none mb-0">বং বাড়ি</h1>
                <div className="space-y-0">
                  <p className="text-xs font-semibold text-gray-800 leading-none group-hover:text-brand-blue transition-colors duration-300">Every Home's Story</p>
                  <p className="text-xs text-gray-600 bangla-text font-medium leading-none group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প</p>
                </div>
              </div>
              {/* Desktop Logo - Maximum Visibility */}
              <div className="hidden md:flex flex-col justify-center pl-2 min-w-[250px]">
                <h1 className="font-bold text-brand-blue bangla-text whitespace-nowrap text-[28px] lg:text-[32px] xl:text-[36px] leading-none mb-0">বং বাড়ি</h1>
                <p className="text-sm lg:text-base xl:text-lg font-bold text-gray-800 leading-none whitespace-nowrap mb-0 group-hover:text-brand-blue transition-colors duration-300">Every Home's Story — Bong Bari</p>
                <p className="text-xs lg:text-sm xl:text-base text-gray-600 bangla-text font-semibold leading-none whitespace-nowrap group-hover:text-brand-red transition-colors duration-300">প্রতিটা বাড়ির গল্প — বং বাড়ি</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - High Visibility All Devices */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-5 xl:space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-semibold text-base lg:text-lg xl:text-xl transition-all duration-200 hover:text-brand-blue hover:scale-105 hover:font-bold ${
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
