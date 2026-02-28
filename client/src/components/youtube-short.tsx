import { Play } from "lucide-react";
import { useState } from "react";

interface YouTubeShortProps {
  videoId: string;
  thumbnail: string;
  title: string;
}

const YouTubeShort = ({ videoId, title, thumbnail }: YouTubeShortProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Safety: If no thumbnail, fallback to HQ default
  const thumbUrl = thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div
      className="relative flex flex-col w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg bg-zinc-900 border border-white/10"
      data-testid={`youtube-short-${videoId}`}
      onClick={() => setIsPlaying(true)}
    >
      {!isPlaying ? (
        <>
          {/* Thumbnail Image - Full Bleed */}
          <img
            src={thumbUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              setImgError(true);
            }}
          />

          {/* Fallback Background (if image fails) */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 -z-10" />

          {/* Static Play Button Overlay (No complex hovers for better mobile response) */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white ml-1" />
            </div>
          </div>

          {/* Title Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-2 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent">
            <h3 className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2 drop-shadow-md tracking-tight">
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
  );
};

export default YouTubeShort;
