/**
 * TrimSlider.tsx — Phrase 13 of masterplan
 * Dual-handle range slider for selecting trim start/end times.
 * Zero library dependencies — pure CSS + input[type=range] trick.
 */

import React, { useCallback } from "react";
import { formatTime } from "@/lib/ffmpeg-trim-engine";

interface TrimSliderProps {
  duration: number;       // total duration in seconds
  startTime: number;
  endTime: number;
  onStartChange: (t: number) => void;
  onEndChange: (t: number) => void;
}

export function TrimSlider({
  duration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: TrimSliderProps) {
  if (!duration || duration <= 0) return null;

  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;
  const selectedPct = endPct - startPct;

  const handleStart = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), endTime - 1);
      onStartChange(val);
    },
    [endTime, onStartChange]
  );

  const handleEnd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), startTime + 1);
      onEndChange(val);
    },
    [startTime, onEndChange]
  );

  return (
    <div className="trim-slider-root">
      {/* Timeline track */}
      <div className="trim-track">
        <div
          className="trim-selected"
          style={{ left: `${startPct}%`, width: `${selectedPct}%` }}
        />
        {/* Start handle */}
        <input
          type="range"
          className="trim-range trim-range-start"
          min={0}
          max={duration}
          step={0.5}
          value={startTime}
          onChange={handleStart}
          aria-label="Trim start time"
        />
        {/* End handle */}
        <input
          type="range"
          className="trim-range trim-range-end"
          min={0}
          max={duration}
          step={0.5}
          value={endTime}
          onChange={handleEnd}
          aria-label="Trim end time"
        />
      </div>

      {/* Time labels */}
      <div className="trim-labels">
        <div className="trim-label-item trim-start">
          <span className="trim-label-text">Start</span>
          <span className="trim-label-time trim-start-time">{formatTime(startTime)}</span>
        </div>
        <div className="trim-label-center">
          <span className="trim-duration-badge">
            ✂ {formatTime(endTime - startTime)} selected
          </span>
        </div>
        <div className="trim-label-item trim-end">
          <span className="trim-label-time trim-end-time">{formatTime(endTime)}</span>
          <span className="trim-label-text">End</span>
        </div>
      </div>
    </div>
  );
}
