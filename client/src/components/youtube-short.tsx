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
      className="video-container mobile-tap-scale"
      onClick={handleClick}
      data-testid={`youtube-short-${videoId}`}
    >
      {/* Rotating gradient border - ONLY the border rotates */}
      <div className="rotating-gradient-border"></div>
      
      {/* Static reel content - NEVER rotates */}
      <div className="reel-content-container">
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover"
        />
        {/* Trendy Mobile Play Button - Always Visible with Pulse */}
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-red rounded-full flex items-center justify-center pulse-animation shadow-lg">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
