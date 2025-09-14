import { Play } from "lucide-react";

interface YouTubeShortProps {
  videoId: string;
  thumbnail: string; // kept for future use; not needed for iframe
  title: string;
}

const YouTubeShort = ({ videoId, title }: YouTubeShortProps) => {
  return (
    <div className="video-container group transition-all duration-300 hover:scale-105 magical-hover" data-testid={`youtube-short-${videoId}`}>
      <div className="rotating-border-wrapper relative">
        {/* Circling gradient border */}
        <span className="absolute inset-0 z-0 rounded-xl border-4 border-transparent before:content-[''] before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-tr before:from-pink-500 before:via-yellow-400 before:to-blue-500 before:animate-spin-slow before:z-[-1] before:blur-sm"></span>
        <div className="relative w-full aspect-[9/16] md:aspect-[9/16] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-black min-h-[320px]">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&autoplay=0`}
            title={title}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          ></iframe>
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 rounded-b-xl">
            <h3 className="text-white font-semibold text-xs sm:text-sm line-clamp-2 leading-tight">
              {title}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
