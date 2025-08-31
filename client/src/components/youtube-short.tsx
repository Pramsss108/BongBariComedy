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
    <div className="relative group">
      {/* Moving RGB gradient border for YouTube shorts */}
      <div className="absolute -inset-1 rounded-lg opacity-60 blur-sm group-hover:opacity-90 transition-opacity">
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: `conic-gradient(from 0deg, #ff0080, #ff8c00, #40e0d0, #da70d6, #ff1493, #00ced1, #ff0080)`,
            animation: 'spin 4s linear infinite'
          }}
        />
      </div>
      
      {/* Secondary gradient layer */}
      <div className="absolute -inset-2 rounded-lg opacity-40 blur-md group-hover:opacity-70 transition-opacity">
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: `conic-gradient(from 180deg, #00ff87, #60efff, #ff00ff, #ff6b6b, #4ecdc4, #45b7d1, #00ff87)`,
            animation: 'spin 6s linear infinite reverse'
          }}
        />
      </div>
    
      <div 
        className="video-container hover-lift relative z-10"
        onClick={handleClick}
        data-testid={`youtube-short-${videoId}`}
      >
        <img 
          src={thumbnail} 
          alt={title}
          className="w-full h-full object-cover rounded-lg shadow-md"
        />
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center shadow-xl">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
