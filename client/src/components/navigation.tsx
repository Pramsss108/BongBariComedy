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
  const { user, logout } = useAuth();
  
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
  ];

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Professional Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full">
        
        {/* Main Header - Clean Blue Design */}
        <header className="bg-[#0E47FF] shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              
              {/* Logo Section */}
              <Link href="/" className="flex items-center space-x-3 group">
                <img 
                  src="/logo.png" 
                  alt="Bong Bari" 
                  className="w-10 h-10 rounded-lg transition-transform duration-300 group-hover:scale-110"
                />
                <div>
                  <h1 className="text-xl font-bold text-white bangla-text">বং বাড়ি</h1>
                  <p className="text-xs text-white/80">Every Home's Story</p>
                </div>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-white font-medium transition-all duration-200 hover:text-[#FFD200] ${
                      isActive(item.href) ? "text-[#FFD200] border-b-2 border-[#FFD200] pb-1" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* Login/Admin Button */}
                {user ? (
                  <div className="flex items-center space-x-3">
                    <Link href="/admin">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white hover:bg-white/10 border border-white/20"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Button>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          Logged In
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-32 p-2">
                        <Button
                          onClick={handleLogout}
                          variant="ghost"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4 mr-1" />
                          Logout
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <Link href="/admin">
                    <Button 
                      size="sm"
                      className="bg-white text-[#0E47FF] hover:bg-gray-100 font-semibold"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </nav>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Professional Promo Banner */}
        <div className="bg-[#FFD200] h-[35px] overflow-hidden relative">
          <div className="absolute inset-0 flex items-center">
            <div className="animate-scroll whitespace-nowrap">
              <span className="text-black font-semibold text-sm">
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
                🔥 Special Offer: Flat 50% off on your first Bong Bari subscription • 🔔 Stay tuned for updates • 
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#0E47FF] border-t border-white/10">
            <div className="container mx-auto px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-3 px-4 text-white font-medium rounded-lg transition-colors ${
                    isActive(item.href) 
                      ? "bg-white/20 text-[#FFD200]" 
                      : "hover:bg-white/10"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile Login/Admin */}
              <div className="mt-4 pt-4 border-t border-white/10">
                {user ? (
                  <>
                    <Link 
                      href="/admin" 
                      className="block py-3 px-4 text-white font-medium rounded-lg hover:bg-white/10"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="inline w-4 h-4 mr-2" />
                      Admin Panel
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left py-3 px-4 text-red-300 font-medium rounded-lg hover:bg-white/10"
                    >
                      <LogOut className="inline w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/admin" 
                    className="block py-3 px-4 text-white font-medium rounded-lg hover:bg-white/10"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="inline w-4 h-4 mr-2" />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Spacer for fixed navigation */}
      <div className="h-[99px]"></div>
    </>
  );
};

export default Navigation;