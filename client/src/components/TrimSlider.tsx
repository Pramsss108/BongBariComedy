/**
 * TrimSlider.tsx — Phrase 13 of masterplan
 * Dual-handle range slider for selecting trim start/end times.
 * Zero library dependencies — pure CSS + input[type=range] trick.
 */

import React, { useRef, useState, useEffect } from "react";
import { formatTime } from "@/pages/SocialDownloaderPage";
import "./TrimSlider.css";

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

  if (!duration || duration <= 0) return null;

  // Convert time to percentage (0-100)
  const getPercent = (time: number) => (time / duration) * 100;
  
  // Calculate clamped percentage for display
  const startPercent = Math.max(0, Math.min(100, getPercent(startTime)));
  const endPercent = Math.max(0, Math.min(100, getPercent(endTime)));
  const currentPercent = Math.max(0, Math.min(100, getPercent(currentTime)));

  const handlePointerDown = (type: "start" | "end", e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rawPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const rawTime = (rawPercent / 100) * duration;
    
    // Minimum 1 second duration
    const MIN_DURATION = 1.0;

    if (dragging === "start") {
      // bounded by 0 and endTime - MIN
      const newStart = Math.min(Math.max(0, rawTime), endTime - MIN_DURATION);
      onStartChange(newStart);
    } else {
      // bounded by startTime + MIN and duration
      const newEnd = Math.max(Math.min(duration, rawTime), startTime + MIN_DURATION);
      onEndChange(newEnd);
    }
  };

  // Click track to seek
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!onScrub || dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    const pct = x / rect.width;
    const time = pct * duration;
    
    // Loop logic is handled in Parent, but we should let user seek anywhere.
    // If they seek outside range, parent can decide to clamp or allow.
    onScrub(Math.max(0, Math.min(duration, time)));
  };

  return (
    <div className="trim-slider-container">
      {/* Time Display */}
      <div className="flex justify-between text-[10px] font-mono text-white/40 mb-2 px-1">
         <span>{formatTime(startTime)}</span>
         <span className={dragging ? "text-cyan-400" : ""}>{formatTime(currentTime)}</span>
         <span>{formatTime(endTime)}</span>
      </div>

      <div 
        ref={containerRef}
        className="premium-timeline h-8 w-full cursor-pointer relative"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleTrackClick}
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
          className="timeline-handle timeline-handle-left"
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => handlePointerDown("start", e)}
        >
          <div className="handle-grip" />
          <div className="handle-time-tooltip">{formatTime(startTime)}</div>
        </div>

        {/* Right Handle */}
        <div
          className="timeline-handle timeline-handle-right"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => handlePointerDown("end", e)}
        >
           <div className="handle-grip" />
           <div className="handle-time-tooltip">{formatTime(endTime)}</div>
        </div>
      </div>
    </div>
  );
}
