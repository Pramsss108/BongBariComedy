import { useState, useEffect } from "react";

/**
 * Ghost Grid - Visual Debugger
 * Toggled by "Ctrl + Shift + D"
 */
export function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Ctrl (or Cmd) + Shift + D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        
        // Also run the audit when opened
        if (!(window as any).runLayoutAudit && isVisible === false) {
             console.log("Audit tool not loaded yet");
        } else if (isVisible === false) {
            (window as any).runLayoutAudit?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden" style={{ zIndex: 10000 }}>
      {/* 1. Global Outline (Red for Overflow Detection) */}
      <div className="absolute inset-0 border-2 border-red-500 opacity-50 pointer-events-none"></div>

      {/* 2. Center Guide */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500 opacity-50"></div>

      {/* 3. Mobile Safe Width Guides (320px, 375px) */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[320px] -translate-x-1/2 border-x border-dashed border-yellow-500/30"></div>
      <div className="absolute left-1/2 top-0 bottom-0 w-[375px] -translate-x-1/2 border-x border-dashed border-green-500/30"></div>

      {/* 4. DOM Highlighter CSS (Injected) */}
      <style>{`
        /* Highlight all elements on hover when debug is active */
        *:hover {
          outline: 1px solid rgba(0, 255, 255, 0.5) !important;
          background: rgba(0, 255, 255, 0.05) !important;
        }
        /* Visualize Images */
        img {
            outline: 1px solid magenta !important;
        }
        /* Visualize Grids */
        .grid {
            outline: 2px dashed lime !important;
        }
      `}</style>
      
      <div className="fixed top-2 right-2 bg-black/90 text-green-400 font-mono text-xs p-2 rounded border border-green-500/50 pointer-events-auto">
        <p>👻 GHOST GRID ACTIVE</p>
        <p>Width: {window.innerWidth}px</p>
        <p>Audit Results: See Console</p>
      </div>
    </div>
  );
}
