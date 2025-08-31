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
        <div className="flex justify-between items-center py-3 md:py-5">
          {/* Logo - Responsive Design */}
          <Link href="/" data-testid="logo-link">
            <div className="flex items-center space-x-3 cursor-pointer">
              <img 
                src="/logo.png" 
                alt="Bong Bari Logo" 
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg"
              />
              {/* Mobile Logo - Compact */}
              <div className="md:hidden">
                <h1 className="text-xl font-bold text-brand-blue bangla-text leading-tight">বং বাড়ি</h1>
              </div>
              {/* Desktop Logo - Full */}
              <div className="hidden md:block min-w-0 mt-4">
                <h1 className="text-2xl font-bold text-brand-blue bangla-text leading-tight whitespace-nowrap">বং বাড়ি</h1>
                <p className="text-xs text-gray-600 leading-tight whitespace-nowrap">Bengali Comedy</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation - Improved Layout */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-semibold text-lg transition-all duration-200 hover:text-brand-blue hover:scale-105 ${
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
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
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
