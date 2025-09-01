import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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
      {/* Slim Fixed Header - Flaticon Style */}
      <header className="fixed top-0 left-0 right-0 w-full z-50" style={{ backgroundColor: '#0D47FF', height: '60px' }}>
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          
          {/* Logo and Brand Section */}
          <Link href="/" className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="Bong Bari Logo" 
              className="h-10 w-10"
            />
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-medium text-white bangla-text leading-tight">
                বং বাড়ি
              </h1>
              <div className="flex flex-col leading-none">
                <p className="text-xs text-white/90">Every Home's Story</p>
                <p className="text-xs text-white/90 bangla-text">প্রতিটা বাড়ির গল্প</p>
              </div>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            <ul className="flex items-center space-x-6">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      isActive(item.href) 
                        ? "text-[#FFD200]" 
                        : "text-white hover:text-[#FFD200]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                {user ? (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/admin"
                      className="flex items-center space-x-1 text-sm font-medium text-white hover:text-[#FFD200] transition-colors duration-200"
                    >
                      <User className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                    <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <button className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors">
                          Logged In
                        </button>
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
                  <Link
                    href="/admin"
                    className="flex items-center space-x-1 text-sm font-medium text-white hover:text-[#FFD200] transition-colors duration-200"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                )}
              </li>
            </ul>
          </nav>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white hover:text-[#FFD200] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#0D47FF] shadow-lg">
            <ul className="py-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(item.href) 
                        ? "text-[#FFD200] bg-white/10" 
                        : "text-white hover:text-[#FFD200] hover:bg-white/5"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                {user ? (
                  <div className="px-4 py-3">
                    <Link
                      href="/admin"
                      className="flex items-center space-x-1 text-sm font-medium text-white hover:text-[#FFD200]"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-1 px-4 py-3 text-sm font-medium text-white hover:text-[#FFD200] hover:bg-white/5"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Link>
                )}
              </li>
            </ul>
          </div>
        )}
      </header>
      
      {/* Promotional Section - No Gap */}
      <div className="fixed top-[60px] left-0 right-0 w-full z-40" style={{ backgroundColor: '#FFD200' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <p className="text-sm font-semibold text-[#0D47FF] text-center">
              🎬 New Comedy Every Week! | নতুন কমেডি প্রতি সপ্তাহে! 🎭
            </p>
          </div>
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div style={{ height: '96px' }}></div>
    </>
  );
};

export default Navigation;