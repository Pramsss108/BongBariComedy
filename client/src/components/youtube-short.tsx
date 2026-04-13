import { Play } from "lucide-react";
import { useState } from "react";

interface YouTubeShortProps {
  videoId: string;
  thumbnail: string;
  title: string;
  /** Stagger index for entrance animation delay */
  index?: number;
  /** Display rank badge (1-based) */
  rank?: number;
}

const YouTubeShort = ({ videoId, title, thumbnail, index = 0, rank }: YouTubeShortProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Use maxresdefault for HD, fallback chain for quality
  const thumbUrl = thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className={`yt-card-container group ${isPlaying ? 'is-playing' : ''}`}
      data-testid={`youtube-short-${videoId}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Animated rotating gold border */}
      <div className="yt-gold-border-wrap">
        {/* Black inner frame */}
        <div className="rounded-[12px] p-[3px] bg-black relative z-[1]">
          {/* The card */}
          <div
            className="relative w-full aspect-[9/16] rounded-[10px] overflow-hidden cursor-pointer bg-black"
            onClick={() => !isPlaying && setIsPlaying(true)}
          >
        {!isPlaying ? (
          <>
            {/* Thumbnail — HD quality, eager for first 4 */}
            <img
              src={imgError ? fallbackUrl : thumbUrl}
              alt={title}
              loading={index < 4 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index < 2 ? "high" : "auto"}
              className="absolute inset-0 w-full h-full object-cover yt-thumb-img"
              onError={() => !imgError && setImgError(true)}
            />

            {/* Shimmer sweep on hover */}
            <div className="yt-shimmer" />

            {/* Top vignette */}
            <div className="yt-vignette-top absolute inset-0 pointer-events-none" />

            {/* Cinematic vignette — bottom */}
            <div className="yt-vignette absolute inset-0 pointer-events-none" />

            {/* Rank badge — appears on hover */}
            {rank && (
              <div className="yt-card-badge" aria-label={`Rank ${rank}`}>
                {rank}
              </div>
            )}

            {/* Frosted glass play button with pulse ring */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="yt-play-ring" />
                <div className="yt-glass-play w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Title — inside bottom vignette with slide-up */}
            <div className="yt-title-wrap absolute bottom-0 left-0 right-0 p-3 sm:p-4 pointer-events-none">
              <h3
                className="text-white font-bold text-sm sm:text-base leading-snug line-clamp-2"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,1), 0 0 4px rgba(0,0,0,0.8)' }}
              >
                {title || "Now Playing"}
              </h3>
            </div>
          </>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
            title={title}
            className="absolute inset-0 w-full h-full object-cover z-10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
