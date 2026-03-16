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
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
  onScrub?: (t: number) => void;
}

export function TrimSlider({
  duration,
  startTime,
  endTime,
  currentTime = 0,
  onStartChange,
  onEndChange,
  onScrub,
}: TrimSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

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

      // Minimum 0.5 second duration to prevent handles from overlapping entirely
      const MIN_DURATION = 0.5;

      if (dragging === "start") {
        const newStart = Math.min(Math.max(0, rawTime), endTime - MIN_DURATION);
        onStartChange(newStart);
      } else {
        const newEnd = Math.max(Math.min(duration, rawTime), startTime + MIN_DURATION);
        onEndChange(newEnd);
      }
    };

    const handlePointerUp = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("mousemove", handlePointerMove, { passive: false });
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [dragging, duration, startTime, endTime, onStartChange, onEndChange]);

  if (!duration || duration <= 0) return null;

  // Convert time to percentage (0-100)
  const getPercent = (time: number) => (time / duration) * 100;

  // Calculate clamped percentage for display
  const startPercent = Math.max(0, Math.min(100, getPercent(startTime)));       
  const endPercent = Math.max(0, Math.min(100, getPercent(endTime)));
  
  // Visually lock the playhead strictly between the handles to prevent lag-jitter
  const rawCurrentPercent = Math.max(0, Math.min(100, getPercent(currentTime)));
  const currentPercent = Math.max(startPercent, Math.min(endPercent, rawCurrentPercent));   

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
    const rawTime = pct * duration;
    
    // Auto-clamp scrub time within the current handle region
    const clampedScrub = Math.max(startTime, Math.min(endTime, rawTime));
    onScrub(clampedScrub);
  };

  return (
    <div className="trim-slider-container w-full select-none" style={{ touchAction: "none" }}>
      {/* Time Display */}
      <div className="flex justify-between text-[10px] sm:text-xs font-mono text-white/40 mb-2 px-1">
         <span>{formatSliderTime(startTime)}</span>
         <span className={dragging ? "text-cyan-400 font-bold" : ""}>{formatSliderTime(currentTime)}</span>
         <span>{formatSliderTime(endTime)}</span>
      </div>

      <div
        ref={containerRef}
        className="premium-timeline h-10 w-full cursor-pointer relative"
        onPointerDown={handleTrackPointerDown}
        onMouseDown={handleTrackPointerDown}
        style={{ touchAction: "none" }}
      >
        {/* Track */}
        <div className="timeline-track" />

        {/* Selected Fill */}
        <div
           className="timeline-to-be-downloaded"
           style={{
             left: `${startPercent}%`,
             width: `${endPercent - startPercent}%`
           }}
        />

        {/* Playhead */}
        <div
           className="timeline-playhead"
           style={{ left: `${currentPercent}%` }}
        />

        {/* Left Handle */}
        <div
          className="timeline-handle timeline-handle-left touch-none"
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => handlePointerDown("start", e)}
          onMouseDown={(e) => handlePointerDown("start", e)}
          onTouchStart={(e) => handlePointerDown("start", e)}
        >
          <div className="handle-grip" />
          <div className="handle-time-tooltip">{formatSliderTime(startTime)}</div>
        </div>

        {/* Right Handle */}
        <div
          className="timeline-handle timeline-handle-right touch-none"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown("end", e)}
          onMouseDown={(e) => handlePointerDown("end", e)}
          onTouchStart={(e) => handlePointerDown("end", e)}
        >
           <div className="handle-grip" />
           <div className="handle-time-tooltip">{formatSliderTime(endTime)}</div>
        </div>
      </div>
    </div>
  );
}
