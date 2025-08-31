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
      className="video-container hover-lift"
      onClick={handleClick}
      data-testid={`youtube-short-${videoId}`}
    >
      {/* Half-round flowing gradient border */}
      <div className="gradient-border-container">
        <div className="gradient-strip-top"></div>
        <div className="gradient-strip-right"></div>
        <div className="gradient-strip-bottom"></div>
        <div className="gradient-strip-left"></div>
        <div className="gradient-corner-tl"></div>
        <div className="gradient-corner-tr"></div>
        <div className="gradient-corner-bl"></div>
        <div className="gradient-corner-br"></div>
      </div>
      
      {/* Video content */}
      <img 
        src={thumbnail} 
        alt={title}
        className="w-full h-full object-cover rounded-lg shadow-md relative z-10"
      />
      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
        <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center">
          <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
