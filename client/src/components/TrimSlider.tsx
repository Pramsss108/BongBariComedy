import { useRef, useState, useEffect } from "react";
import "./TrimSlider.css";

export function formatSliderTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;   
}

interface TrimSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  currentTime?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  videoUrl?: string; // New: For thumbnail extraction
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
  onScrub?: (t: number) => void;
}

export function TrimSlider({
  duration,
  startTime,
  endTime,
  currentTime = 0,
  videoRef,
  videoUrl,
  onStartChange,
  onEndChange,
  onScrub,
}: TrimSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const hoverVideoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);       

  // YouTube-style Timeline Hover Tracker state
  const [hoverPct, setHoverPct] = useState<number | null>(null);

  // Sync true playhead to DOM natively for 60fps and 0-render
  useEffect(() => {
    let rafId: number;
    const updatePlayhead = () => {
      if (videoRef?.current && playheadRef.current && duration > 0) {
        const ct = videoRef.current.currentTime;
        const pct = Math.max(0, Math.min(100, (ct / duration) * 100));
        playheadRef.current.style.left = `${pct}%`;
      }
      rafId = requestAnimationFrame(updatePlayhead);
    };
    rafId = requestAnimationFrame(updatePlayhead);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef, duration]);

  // Sync hover thumbnail video realtime
  useEffect(() => {
    if (hoverVideoRef.current && hoverPct !== null && duration > 0) {
      if (hoverVideoRef.current.readyState >= 1) { // HTMLMediaElement.HAVE_METADATA
        hoverVideoRef.current.currentTime = (hoverPct / 100) * duration;
      }
    }
  }, [hoverPct, duration]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {  
      // Prevent scrolling while dragging on mobile
      if (e.cancelable && e.type === "touchmove") {
        e.preventDefault();
      }

      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      // Handle both touch and mouse safely
      let clientX = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
      } else {
        return; // fallback
      }

      let x = clientX - rect.left;
      const rawPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));    
      const rawTime = (rawPercent / 100) * duration;

      if (dragging === "start") {
        // Prevent start from crossing end
        const clampedStart = Math.min(rawTime, endTime - 0.1);
        onStartChange(Math.max(0, clampedStart));
      } else {
        // Prevent end from crossing start
        const clampedEnd = Math.max(rawTime, startTime + 0.1);
        onEndChange(Math.min(duration, clampedEnd));
      }
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", handlePointerUp);
    
    // Add mouse equivalents explicitly just in case for older browsers
    document.addEventListener("mousemove", handlePointerMove, { passive: false });
    document.addEventListener("mouseup", handlePointerUp);
    
    // Add touch equivalents
    document.addEventListener("touchmove", handlePointerMove, { passive: false });
    document.addEventListener("touchend", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchmove", handlePointerMove);
      document.removeEventListener("touchend", handlePointerUp);
    };
  }, [dragging, duration, startTime, endTime, onStartChange, onEndChange]);     

  if (!duration || duration <= 0) return null;

  // Convert time to percentage (0-100)
  const getPercent = (time: number) => (time / duration) * 100;

  // Calculate clamped percentage for display
  const startPercent = Math.max(0, Math.min(100, getPercent(startTime)));       
  const endPercent = Math.max(0, Math.min(100, getPercent(endTime)));
  
  // Use explicit currentTime synced directly to display Playhead seamlessly
  const currentPercent = Math.max(0, Math.min(100, getPercent(currentTime)));

  const handlePointerDown = (type: "start" | "end", e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {                                               
    e.stopPropagation();
    setDragging(type);
  };

  // Click track to seek instantly
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {                                                    
    if (!onScrub || dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as React.MouseEvent).clientX;                                                               
    const x = clientX - rect.left;
    const pct = x / rect.width;
    const rawTime = Math.max(0, Math.min(duration, pct * duration));
    onScrub(rawTime);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {                                                    
    if (dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as React.MouseEvent).clientX;                                                               
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setHoverPct((x / rect.width) * 100);
  };

  const handleTrackPointerLeave = () => {
    setHoverPct(null);
  };

  // Render professional timeline ticks (CapCut style scale)
  const renderRulerTicks = () => {
    if (!duration || !isFinite(duration) || duration <= 0) return null;

    let majorInterval = 1;
    if (duration > 120) majorInterval = 15;
    else if (duration > 60) majorInterval = 10;
    else if (duration > 30) majorInterval = 5;
    else if (duration > 10) majorInterval = 2;

    const subTicks = 10; // 10 small ticks per major interval
    const step = majorInterval / subTicks;
    const ticks = [];
    const maxTicks = 150;
    const actualStep = Math.max(step, duration / maxTicks);
    
    for (let t = 0; t <= duration; t += actualStep) {
      const isMajor = Math.abs(t % majorInterval) < 0.01;
      const leftPct = (t / duration) * 100;
      ticks.push(
        <div
          key={t}
          className={`absolute bottom-0 w-px ${isMajor ? 'h-[10px] bg-white/50' : 'h-[5px] bg-white/20'}`}
          style={{ left: `${leftPct}%` }}
        >
          {isMajor && (
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/50 font-mono tracking-tight">
              {formatSliderTime(t)}
            </span>
          )}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="w-full select-none pb-2 pt-6">
      <div
        ref={containerRef}
        className="premium-timeline h-8 w-full cursor-pointer relative rounded-lg overflow-visible mt-2"
        onPointerDown={handleTrackPointerDown}
        onMouseDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onMouseMove={handleTrackPointerMove}
        onPointerLeave={handleTrackPointerLeave}
        onMouseLeave={handleTrackPointerLeave}
        style={{ touchAction: "none" }}
      >
        {/* CapCut Timeline Ruler Ticks */}
        <div className="absolute -top-4 w-full h-4 overflow-visible select-none pointer-events-none">
          {renderRulerTicks()}
        </div>

        {/* Track Background - Solid Black Track */}
        <div className="timeline-track bg-[#1e1e1e] overflow-hidden flex rounded-md ring-1 ring-white/10 h-full w-full">
        </div>

        {/* Start Handle Dim Overlay */}
        <div
          className="absolute top-0 left-0 h-full bg-black/70 pointer-events-none rounded-l-full"
          style={{ width: `${startPercent}%` }}
        />

        {/* End Handle Dim Overlay */}
        <div
          className="absolute top-0 right-0 h-full bg-black/70 pointer-events-none rounded-r-full"
          style={{ width: `${100 - endPercent}%` }}
        />

        {/* Selected Area Border */}
        <div
           className="absolute top-0 h-full border-y-[3px] border-[#fbff00] pointer-events-none z-10"
           style={{
             left: `${startPercent}%`,
             width: `${endPercent - startPercent}%`
           }}
        />

        {/* Playhead */}
        <div
           ref={playheadRef}
           className="absolute top-0 bottom-0 w-[2px] bg-white z-30 pointer-events-none drop-shadow-md rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
           style={{ left: `${currentPercent}%`, marginLeft: '-1px' }}
        />

        {/* YouTube Style Hover Playhead / Timestamp Overlay */}
        {hoverPct !== null && !dragging && (
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-white/50 z-20 pointer-events-none mix-blend-difference"
            style={{ left: `${hoverPct}%` }}
          >
            <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/80 backdrop-blur-xl rounded-md border border-white/10 shadow-2xl overflow-hidden pointer-events-none p-1">
              {videoUrl && (
                <video
                  ref={hoverVideoRef}
                  src={videoUrl}
                  muted
                  playsInline
                  preload="auto"
                  className="w-24 h-[60px] object-cover rounded border border-white/10 shadow-sm"
                />
              )}
              <span className="text-white/90 text-[10px] font-mono mt-1 px-2 py-0.5 whitespace-nowrap">
                {formatSliderTime((hoverPct / 100) * duration)}
              </span>
            </div>
            {/* White dot at the bottom of the hover line */}
            <div className="absolute inset-x-[calc(-3px)] bottom-0 h-1.5 w-1.5 bg-white rounded-full mx-auto shadow" />
          </div>
        )}

        {/* Left Handle */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-[12px] bg-[#fbff00] rounded-l-md flex items-center justify-center cursor-ew-resize z-20 shadow-md transition-transform hover:scale-105 active:scale-95 touch-none"
          style={{ left: `${startPercent}%`, transform: 'translateX(-100%)' }}
          onPointerDown={(e) => handlePointerDown("start", e)}
          onMouseDown={(e) => handlePointerDown("start", e)}
          onTouchStart={(e) => handlePointerDown("start", e)}
        >
          <div className="w-1 h-3 border-l border-r border-[#8B8D00] opacity-50" />
          <div className="absolute -top-6 bg-black/80 text-white text-[10px] font-mono px-1 rounded pointer-events-none whitespace-nowrap">
            {formatSliderTime(startTime)}
          </div>
        </div>

        {/* Right Handle */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-[12px] bg-[#fbff00] rounded-r-md flex items-center justify-center cursor-ew-resize z-20 shadow-md transition-transform hover:scale-105 active:scale-95 touch-none"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown("end", e)}
          onMouseDown={(e) => handlePointerDown("end", e)}
          onTouchStart={(e) => handlePointerDown("end", e)}
        >
           <div className="w-1 h-3 border-l border-r border-[#8B8D00] opacity-50" />
           <div className="absolute -top-6 bg-black/80 text-white text-[10px] font-mono px-1 rounded pointer-events-none whitespace-nowrap">
            {formatSliderTime(endTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
