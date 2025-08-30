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
      <div className="container mx-auto px-4">
        {/* Mobile Layout */}
        <div className="md:hidden flex justify-between items-center py-3">
          <Link href="/" data-testid="logo-link">
            <div className="flex items-center space-x-3 cursor-pointer">
              <img 
                src="/logo.png" 
                alt="Bong Bari Logo" 
                className="w-10 h-10 rounded-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-brand-blue bangla-text leading-tight">বং বাড়ি</h1>
                <p className="text-xs text-gray-600 -mt-1">Bengali Comedy</p>
              </div>
            </div>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        
        {/* Desktop Layout - Completely Different */}
        <div className="hidden md:block">
          {/* Top Row: Logo */}
          <div className="flex justify-center py-4 border-b border-gray-100">
            <Link href="/" data-testid="logo-link">
              <div className="flex items-center space-x-4 cursor-pointer">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari Logo" 
                  className="w-16 h-16 rounded-xl shadow-md"
                />
                <div className="text-center">
                  <h1 className="text-5xl font-bold text-brand-blue bangla-text leading-none">বং বাড়ি</h1>
                  <p className="text-xl text-gray-600 font-medium mt-1">Bengali Comedy</p>
                </div>
              </div>
            </Link>
          </div>
          
          {/* Bottom Row: Navigation */}
          <div className="flex justify-center py-4">
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-6 py-3 rounded-full font-semibold text-lg transition-all duration-200 ${
                    isActive(item.href) 
                      ? "bg-brand-blue text-white shadow-lg" 
                      : "text-gray-700 hover:bg-gray-100 hover:text-brand-blue"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4" data-testid="mobile-menu">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 font-medium transition-colors hover:text-brand-blue ${
                  isActive(item.href) ? "text-brand-blue" : "text-gray-700"
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
