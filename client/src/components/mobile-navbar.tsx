import { Home, Search, Heart, User } from "lucide-react";
import { Link, useLocation } from "wouter";

const MobileNavBar = () => {
    const [location] = useLocation();

    // Map the current path to the active state
    // We treat root "/" as home, but also visual fallback if needed
    const isActive = (path: string) => location === path || (path === "/" && location === "");

    const navItems = [
        { icon: Home, label: "Home", href: "/", active: isActive("/") },
        { icon: Search, label: "Search", href: "/search", active: isActive("/search") },
        { icon: Heart, label: "Loved", href: "/loved", active: isActive("/loved") },
        { icon: User, label: "Profile", href: "/profile", active: isActive("/profile") },
    ];

    return (
        // FLOATING GLASS PILL - "Blinkit/Uber" Modern Style
        // Fixed at bottom, but floating above the edge (bottom-6)
        <div className="fixed bottom-6 left-0 right-0 z-[9999] sm:hidden flex justify-center pointer-events-none fade-in-up">
            <div className="w-full max-w-[360px] px-4 pointer-events-auto">
                <div className="
                    flex justify-between items-center
                    bg-black/70 backdrop-blur-2xl
                    border border-white/10
                    rounded-full
                    py-4 px-7
                    shadow-[0_8px_32px_rgba(0,0,0,0.5)]
                    relative
                    overflow-hidden
                ">
                    {/* Glass Shine Effect */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    
                    {navItems.map((item, index) => (
                        <Link key={index} href={item.href}>
                            <button
                                className="relative flex flex-col items-center justify-center group outline-none"
                            >
                                <item.icon
                                    className={`
                                        w-6 h-6 transition-all duration-300
                                        ${item.active 
                                            ? "text-brand-blue fill-brand-blue/20 rotate-0 scale-110 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                                            : "text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105"
                                        }
                                    `}
                                    strokeWidth={item.active ? 2.5 : 2}
                                />
                                {item.active && (
                                    <div className="absolute -bottom-2 w-1 h-1 bg-brand-blue rounded-full shadow-[0_0_4px_currentColor]" />
                                )}
                            </button>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MobileNavBar;
