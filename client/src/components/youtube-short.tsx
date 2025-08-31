import { Play } from "lucide-react";

interface YouTubeShortProps {
  videoId: string;
  thumbnail: string;
  title: string;
  onClick?: () => void;
}

const YouTubeShort = ({ videoId, thumbnail, title, onClick }: YouTubeShortProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Open YouTube video in new tab
      window.open(`https://www.youtube.com/shorts/${videoId}`, '_blank');
    }
  };

  return (
    <div 
      className="video-container cursor-pointer group transition-all duration-300 hover:scale-105"
      onClick={handleClick}
      data-testid={`youtube-short-${videoId}`}
    >
      <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4">
          <h3 className="text-white font-semibold text-sm line-clamp-2 leading-tight">
            {title}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
