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
      window.open(`https://youtube.com/shorts/${videoId}`, '_blank');
    }
  };

  return (
    <div 
      className="video-container hover-lift"
      onClick={handleClick}
      data-testid={`youtube-short-${videoId}`}
    >
      <img 
        src={thumbnail} 
        alt={title}
        className="w-full h-full object-cover rounded-lg shadow-md"
      />
      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
        <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center">
          <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
        </div>
      </div>
    </div>
  );
};

export default YouTubeShort;
