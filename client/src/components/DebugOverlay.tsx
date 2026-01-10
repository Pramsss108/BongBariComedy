import { useState, useEffect } from "react";

/**
 * Ghost Grid - Visual Debugger
 * Triggered by window event 'toggle-debug' or Ctrl+Shift+D
 */
export function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [auditStats, setAuditStats] = useState<{ count: number; pass: boolean; issues: any[] } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ type: string; orientation: string; platform: string } | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);

  const handleScreenshot = async () => {
    setIsCapturing(true);
    try {
        if (!(window as any).html2canvas) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const canvas = await (window as any).html2canvas(document.body, { useCORS: true });
        const image = canvas.toDataURL("image/png");

        await fetch('/api/debug/screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image, 
                context: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    ...deviceInfo
                }
            })
        });
        alert("📸 Screenshot sent to VS Code!");
    } catch (e) {
        console.error(e);
        alert("Failed to take screenshot: " + e);
    } finally {
        setIsCapturing(false);
    }
  };

  useEffect(() => {
    // Info Refresher
    const updateInfo = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        setDeviceInfo({
            type: width < 768 ? 'Mobile' : width < 1024 ? 'Tablet' : 'Desktop',
            orientation: height > width ? 'Portrait' : 'Landscape',
            platform: navigator.platform
        });
    };

    window.addEventListener('resize', updateInfo);
    updateInfo(); // init

    const toggleDisplay = () => {
        setIsVisible(prev => {
            const next = !prev;
            if (next) {
                // Run Audit on Open
                setTimeout(() => {
                     if ((window as any).runLayoutAudit) {
                         const results = (window as any).runLayoutAudit();
                         if (results) {
                             setAuditStats({ 
                                 count: results.length, 
                                 pass: results.length === 0,
                                 issues: results 
                             });
                         }
                     } else {
                         console.log("Audit tool not loaded yet");
                     }
                }, 50);
            }
            return next;
        });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Ctrl (or Cmd) + Shift + D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        toggleDisplay();
      }
    };

    // Custom Event Listener for button triggers
    const handleCustomToggle = () => toggleDisplay();
    window.addEventListener('toggle-debug', handleCustomToggle);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', updateInfo);
        window.removeEventListener('toggle-debug', handleCustomToggle);
    };
  }, []);

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
      
      <div className="fixed top-2 right-2 bg-black/95 text-green-400 font-mono text-xs p-3 rounded border border-green-500/50 pointer-events-auto shadow-2xl z-[10001] max-w-sm max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-1">
            <span className="font-bold">GHOST GRID</span>
            <div className="flex gap-2">
                <button 
                    onClick={handleScreenshot} 
                    disabled={isCapturing}
                    className="bg-green-900/50 hover:bg-green-800 text-white px-2 rounded text-[10px] border border-green-500/30"
                >
                    {isCapturing ? 'Saving...' : '📸 SNAP'}
                </button>
                <button 
                    onClick={() => setIsVisible(false)} 
                    className="text-red-400 hover:text-red-300 font-bold px-1"
                >
                    [X]
                </button>
            </div>
        </div>
        
        <div className="space-y-1">
            <p>viewport: <span className="text-white">{window.innerWidth}</span>x{window.innerHeight}</p>
            <p>device: <span className="text-yellow-400">{deviceInfo?.type}</span></p>
        </div>

        <div className="mt-2 pt-2 border-t border-green-500/30">
            {auditStats ? (
                <>
                    {auditStats.pass ? (
                        <p className="text-green-400 font-bold mb-2">✅ AUDIT: PASS</p>
                    ) : (
                        <p className="text-red-400 font-bold mb-2">❌ ISSUES: {auditStats.count}</p>
                    )}
                    
                    {/* On-Screen Logs for Copy/Paste */}
                    <div className="bg-black/50 p-2 rounded border border-green-500/20 text-[10px] text-gray-300 font-mono select-text cursor-text">
                        {auditStats.pass ? (
                            <div className="opacity-70">
                                No layout violations found.<br/>
                                • Horizontal Overflow: OK<br/>
                                • Text Legibility: OK<br/>
                                • Tap Targets: OK
                            </div>
                        ) : (
                            <ul className="list-disc pl-3 space-y-2">
                                {auditStats.issues.map((issue, idx) => (
                                    <li key={idx} className="break-all">
                                        <span className="text-red-300 font-bold">[{issue.type}]</span> {issue.details}
                                        <br/>
                                        <span className="opacity-50 text-[9px]">{issue.element}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            ) : (
                <p className="opacity-50">Running Audit...</p>
            )}
        </div>
      </div>
    </div>
  );
}
