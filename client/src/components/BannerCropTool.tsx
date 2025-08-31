import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
}

interface BannerCropToolProps {
  imageUrl: string;
  onCropChange: (croppedImageUrl: string) => void;
  className?: string;
}

export function BannerCropTool({ imageUrl, onCropChange, className = "" }: BannerCropToolProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cropData, setCropData] = useState<CropData>({
    x: 0,
    y: 0,
    width: 100,
    height: 20, // Banner height percentage
    rotation: 0,
    zoom: 1
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Banner aspect ratio - very wide banner (like homepage)
  const BANNER_ASPECT_RATIO = 20; // 20:1 ratio for ultra-wide banner
  const PREVIEW_WIDTH = 600;
  const PREVIEW_HEIGHT = PREVIEW_WIDTH / BANNER_ASPECT_RATIO; // ~30px height

  useEffect(() => {
    if (imageUrl) {
      updateCroppedImage();
    }
  }, [imageUrl, cropData]);

  const updateCroppedImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to match banner proportions
      canvas.width = PREVIEW_WIDTH;
      canvas.height = PREVIEW_HEIGHT;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context for transformations
      ctx.save();

      // Apply zoom and rotation
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((cropData.rotation * Math.PI) / 180);
      ctx.scale(cropData.zoom, cropData.zoom);

      // Calculate source crop area
      const sourceWidth = img.width * (cropData.width / 100);
      const sourceHeight = img.height * (cropData.height / 100);
      const sourceX = img.width * (cropData.x / 100);
      const sourceY = img.height * (cropData.y / 100);

      // Draw cropped and transformed image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
      );

      ctx.restore();

      // Convert to base64 and notify parent
      const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCropChange(croppedImageUrl);
    };

    img.src = imageUrl;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = (e.clientX - dragStart.x) * 0.1;
    const deltaY = (e.clientY - dragStart.y) * 0.1;

    setCropData(prev => ({
      ...prev,
      x: Math.max(0, Math.min(100 - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(100 - prev.height, prev.y + deltaY))
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const adjustCrop = (property: keyof CropData, delta: number) => {
    setCropData(prev => {
      const newValue = prev[property] + delta;
      
      switch (property) {
        case 'x':
          return { ...prev, x: Math.max(0, Math.min(100 - prev.width, newValue)) };
        case 'y':
          return { ...prev, y: Math.max(0, Math.min(100 - prev.height, newValue)) };
        case 'width':
          return { ...prev, width: Math.max(10, Math.min(100, newValue)) };
        case 'height':
          return { ...prev, height: Math.max(5, Math.min(50, newValue)) };
        case 'zoom':
          return { ...prev, zoom: Math.max(0.1, Math.min(3, newValue)) };
        case 'rotation':
          return { ...prev, rotation: (newValue + 360) % 360 };
        default:
          return prev;
      }
    });
  };

  const resetCrop = () => {
    setCropData({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      rotation: 0,
      zoom: 1
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Banner Preview - Exact Homepage Size */}
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">
          🎯 Banner Preview (Exact Homepage Size)
        </div>
        <div 
          className="relative border-2 border-dashed border-yellow-400 rounded overflow-hidden cursor-move bg-white"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover"
            style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          />
          
          {/* Drag indicator */}
          {isDragging && (
            <div className="absolute inset-0 bg-yellow-200 bg-opacity-30 flex items-center justify-center">
              <Move className="w-6 h-6 text-yellow-600" />
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          📏 {PREVIEW_WIDTH}x{PREVIEW_HEIGHT}px • Drag to move crop area
        </div>
      </div>

      {/* Crop Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Position Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Position</label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('x', -5)}
              className="text-xs"
            >
              ← X
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('x', 5)}
              className="text-xs"
            >
              X →
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('y', -5)}
              className="text-xs"
            >
              ↑ Y
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('y', 5)}
              className="text-xs"
            >
              Y ↓
            </Button>
          </div>
        </div>

        {/* Size Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Size</label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('width', -10)}
              className="text-xs"
            >
              ← W
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('width', 10)}
              className="text-xs"
            >
              W →
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('height', -5)}
              className="text-xs"
            >
              ↑ H
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('height', 5)}
              className="text-xs"
            >
              H ↓
            </Button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Zoom</label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('zoom', -0.1)}
              className="text-xs"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('zoom', 0.1)}
              className="text-xs"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-600 flex items-center">
              {Math.round(cropData.zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Rotation Controls */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rotate</label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('rotation', -15)}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => adjustCrop('rotation', 15)}
              className="text-xs"
            >
              <RotateCw className="w-3 h-3" />
            </Button>
            <span className="text-xs text-gray-600 flex items-center">
              {cropData.rotation}°
            </span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <Button 
        variant="outline" 
        onClick={resetCrop}
        className="w-full text-sm"
      >
        🔄 Reset Crop
      </Button>

      {/* Current Values Display */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <div className="grid grid-cols-3 gap-2">
          <div>X: {Math.round(cropData.x)}%</div>
          <div>Y: {Math.round(cropData.y)}%</div>
          <div>W: {Math.round(cropData.width)}%</div>
          <div>H: {Math.round(cropData.height)}%</div>
          <div>Zoom: {Math.round(cropData.zoom * 100)}%</div>
          <div>Rot: {cropData.rotation}°</div>
        </div>
      </div>
    </div>
  );
}