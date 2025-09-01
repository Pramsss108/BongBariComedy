import { Play } from "lucide-react";
import { useState } from "react";

interface YouTubeShortProps {
  videoId: string;
  thumbnail: string;
  title: string;
  onClick?: () => void;
}

const YouTubeShort = ({ videoId, thumbnail, title, onClick }: YouTubeShortProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Open YouTube video in new tab with smooth transition
      window.open(`https://www.youtube.com/shorts/${videoId}`, '_blank');
    }
  };

  return (
    <div 
      className="video-container cursor-pointer group transition-all duration-500 hover:scale-105 hover:z-20 magical-hover"
      onClick={handleClick}
      data-testid={`youtube-short-${videoId}`}
    >
      {/* Premium Card Design */}
      <div className="relative w-full h-full">
        <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-gray-900 to-gray-800">
          
          {/* Loading Skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-200 animate-pulse rounded-2xl" />
          )}
          
          {/* Optimized Image */}
          <img 
            src={imageError ? '/video-placeholder.jpg' : thumbnail} 
            alt={title}
            className={`w-full h-full object-cover rounded-2xl transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          
          {/* Premium Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500 rounded-2xl" />
          
          {/* Professional Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Pulsing Ring Effect */}
              <div className="absolute inset-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-red-500/30 rounded-full animate-ping" />
              
              {/* Main Play Button */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:from-red-400 group-hover:to-red-600 transition-all duration-500">
                <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white ml-1 drop-shadow-lg" fill="currentColor" />
              </div>
            </div>
          </div>
          
          {/* Premium Title Card */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-2 sm:p-3 shadow-lg group-hover:bg-white/100 transition-all duration-300">
              <h3 className="text-gray-900 font-bold text-[10px] sm:text-xs md:text-sm line-clamp-2 leading-tight">
                {title}
              </h3>
              <p className="text-gray-600 text-[8px] sm:text-[10px] md:text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Watch on YouTube
              </p>
            </div>
          </div>
          
          {/* Premium Badge */}
          <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
            SHORT
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;