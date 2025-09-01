import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LogIn, LogOut, User } from "lucide-react";
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
      <header 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '60px',
          background: '#0D47FF',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
          zIndex: 1000
        }}
      >
        {/* Logo + Text Section */}
        <Link href="/">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <img 
              src="/logo.png" 
              alt="Bong Bari Logo"
              style={{ height: '40px', width: '40px' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }} className="bangla-text">
                বং বাড়ি
              </span>
              <span style={{ fontSize: '11px', opacity: 0.9 }}>
                Every Home's Story | <span className="bangla-text">প্রতিটা বাড়ির গল্প</span>
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul style={{ listStyle: 'none', display: 'flex', gap: '20px', alignItems: 'center', margin: 0, padding: 0 }}>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    textDecoration: 'none',
                    color: isActive(item.href) ? '#FFD200' : '#fff',
                    fontSize: '14px',
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FFD200'}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.color = '#fff';
                    }
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    href="/admin"
                    style={{
                      textDecoration: 'none',
                      color: '#fff',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'color 0.3s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFD200'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                  >
                    <User size={14} />
                    Admin Panel
                  </Link>
                  <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        style={{
                          padding: '4px 8px',
                          background: '#22c55e',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: '500',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
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
                  style={{
                    textDecoration: 'none',
                    color: '#fff',
                    fontSize: '14px',
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FFD200'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#fff'}
                >
                  Login ➝
                </Link>
              )}
            </li>
          </ul>
        </nav>

        {/* Mobile Hamburger */}
        <div 
          className="md:hidden"
          style={{ fontSize: '24px', cursor: 'pointer', color: '#fff' }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden"
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            background: '#0D47FF',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            zIndex: 999
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '12px 20px',
                color: isActive(item.href) ? '#FFD200' : '#fff',
                fontSize: '14px',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Link
              href="/admin"
              style={{
                display: 'block',
                padding: '12px 20px',
                color: '#fff',
                fontSize: '14px',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User size={14} style={{ display: 'inline', marginRight: '5px' }} />
              Admin Panel
            </Link>
          ) : (
            <Link
              href="/admin"
              style={{
                display: 'block',
                padding: '12px 20px',
                color: '#fff',
                fontSize: '14px',
                textDecoration: 'none'
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Login ➝
            </Link>
          )}
        </div>
      )}

      {/* Promo Section - Immediately Below Header */}
      <section 
        style={{
          marginTop: '60px',
          width: '100%',
          background: '#FFD200',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <input
          type="text"
          placeholder="Search for comedy shorts, behind-the-scenes content..."
          style={{
            width: '50%',
            maxWidth: '500px',
            padding: '10px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </section>
    </>
  );
};

export default Navigation;