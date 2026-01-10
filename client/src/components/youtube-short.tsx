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
      className="group relative flex flex-col w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg bg-zinc-900 ring-1 ring-white/10"
      data-testid={`youtube-short-${videoId}`}
      onClick={() => setIsPlaying(true)}
    >
      {!isPlaying ? (
        <>
          {/* Thumbnail Image - Full Bleed */}
          <img
            src={thumbUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              setImgError(true);
            }}
          />

          {/* Fallback Background (if image fails) */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 -z-10" />

          {/* Glassmorphic Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-colors duration-300">
            <div className="relative group/btn">
              <div className="absolute inset-0 bg-red-600 blur-lg opacity-40 group-hover/btn:opacity-60 transition-opacity" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl transform transition-transform duration-300 group-hover/btn:scale-110">
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white ml-1" />
              </div>
            </div>
          </div>

          {/* Title Overlay: Gradient for readability */}
          <div className="absolute inset-x-0 bottom-0 p-2 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent">
            <h3 className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-2 drop-shadow-md tracking-tight">
              {title || "Now Playing"}
            </h3>
            {/* Accent Line */}
            <div className="w-6 h-0.5 bg-brand-red mt-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
