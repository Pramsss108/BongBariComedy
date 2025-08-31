import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, RefreshCw, Maximize2 } from "lucide-react";

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
}

interface AdvancedBannerCropProps {
  imageUrl: string;
  onCropChange: (croppedImageUrl: string) => void;
  className?: string;
}

export function AdvancedBannerCrop({ imageUrl, onCropChange, className = "" }: AdvancedBannerCropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cropData, setCropData] = useState<CropData>({
    x: 10,
    y: 30,
    width: 80,
    height: 40,
    rotation: 0,
    zoom: 1
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Banner dimensions - ultra-wide banner
  const BANNER_WIDTH = 800;
  const BANNER_HEIGHT = 40; // Very thin banner
  const PREVIEW_SCALE = 0.75;

  const updateCroppedImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = BANNER_WIDTH;
      canvas.height = BANNER_HEIGHT;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply transformations
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((cropData.rotation * Math.PI) / 180);
      ctx.scale(cropData.zoom, cropData.zoom);

      // Calculate source area
      const sourceWidth = img.width * (cropData.width / 100);
      const sourceHeight = img.height * (cropData.height / 100);
      const sourceX = img.width * (cropData.x / 100);
      const sourceY = img.height * (cropData.y / 100);

      // Draw image
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
      );

      ctx.restore();

      // Export and notify parent
      const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCropChange(croppedImageUrl);
    };

    img.src = imageUrl;
  }, [imageUrl, cropData, onCropChange]);

  useEffect(() => {
    updateCroppedImage();
  }, [updateCroppedImage]);

  const getMousePosition = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    
    const rect = container.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const getCursorForPosition = (x: number, y: number): string => {
    const threshold = 8;
    const cropLeft = cropData.x;
    const cropRight = cropData.x + cropData.width;
    const cropTop = cropData.y;
    const cropBottom = cropData.y + cropData.height;

    // Corner resize cursors
    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropTop) < threshold) return 'nw-resize';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropTop) < threshold) return 'ne-resize';
    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropBottom) < threshold) return 'sw-resize';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropBottom) < threshold) return 'se-resize';
    
    // Inside crop area
    if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) return 'move';
    
    return 'default';
  };

  const getDragMode = (x: number, y: number): typeof dragMode => {
    const threshold = 8;
    const cropLeft = cropData.x;
    const cropRight = cropData.x + cropData.width;
    const cropTop = cropData.y;
    const cropBottom = cropData.y + cropData.height;

    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropTop) < threshold) return 'resize-tl';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropTop) < threshold) return 'resize-tr';
    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropBottom) < threshold) return 'resize-bl';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropBottom) < threshold) return 'resize-br';
    
    if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) return 'move';
    
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const mousePos = getMousePosition(e);
    const mode = getDragMode(mousePos.x, mousePos.y);
    
    if (mode) {
      setIsDragging(true);
      setIsResizing(mode.startsWith('resize'));
      setDragMode(mode);
      setLastMousePos(mousePos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePosition(e);
    const cursor = getCursorForPosition(mousePos.x, mousePos.y);
    
    if (containerRef.current) {
      containerRef.current.style.cursor = cursor;
    }

    if (!isDragging || !dragMode) return;

    const deltaX = mousePos.x - lastMousePos.x;
    const deltaY = mousePos.y - lastMousePos.y;

    setCropData(prev => {
      let newData = { ...prev };

      switch (dragMode) {
        case 'move':
          newData.x = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
          newData.y = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
          break;
          
        case 'resize-tl':
          const newWidth1 = prev.width - deltaX;
          const newHeight1 = prev.height - deltaY;
          if (newWidth1 > 10 && newHeight1 > 10) {
            newData.x = prev.x + deltaX;
            newData.y = prev.y + deltaY;
            newData.width = newWidth1;
            newData.height = newHeight1;
          }
          break;
          
        case 'resize-tr':
          const newWidth2 = prev.width + deltaX;
          const newHeight2 = prev.height - deltaY;
          if (newWidth2 > 10 && newHeight2 > 10) {
            newData.y = prev.y + deltaY;
            newData.width = newWidth2;
            newData.height = newHeight2;
          }
          break;
          
        case 'resize-bl':
          const newWidth3 = prev.width - deltaX;
          const newHeight3 = prev.height + deltaY;
          if (newWidth3 > 10 && newHeight3 > 10) {
            newData.x = prev.x + deltaX;
            newData.width = newWidth3;
            newData.height = newHeight3;
          }
          break;
          
        case 'resize-br':
          const newWidth4 = prev.width + deltaX;
          const newHeight4 = prev.height + deltaY;
          if (newWidth4 > 10 && newHeight4 > 10) {
            newData.width = newWidth4;
            newData.height = newHeight4;
          }
          break;
      }

      // Ensure bounds
      newData.x = Math.max(0, Math.min(100 - newData.width, newData.x));
      newData.y = Math.max(0, Math.min(100 - newData.height, newData.y));
      newData.width = Math.max(10, Math.min(100 - newData.x, newData.width));
      newData.height = Math.max(10, Math.min(100 - newData.y, newData.height));

      return newData;
    });

    setLastMousePos(mousePos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragMode(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragMode(null);
  };

  const adjustZoom = (delta: number) => {
    setCropData(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom + delta))
    }));
  };

  const adjustRotation = (delta: number) => {
    setCropData(prev => ({
      ...prev,
      rotation: (prev.rotation + delta + 360) % 360
    }));
  };

  const resetCrop = () => {
    setCropData({
      x: 10,
      y: 30,
      width: 80,
      height: 40,
      rotation: 0,
      zoom: 1
    });
  };

  const fitToBanner = () => {
    setCropData(prev => ({
      ...prev,
      x: 0,
      y: 35,
      width: 100,
      height: 30
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Advanced Crop Interface */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="text-white font-semibold mb-4 flex items-center gap-2">
          🎨 Advanced Banner Crop Tool
          <span className="text-sm text-gray-400">(Drag corners to resize, center to move)</span>
        </div>
        
        {/* Interactive Crop Area */}
        <div 
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden select-none"
          style={{ 
            width: BANNER_WIDTH * PREVIEW_SCALE, 
            height: 300,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Crop Rectangle */}
          <div
            className="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-20"
            style={{
              left: `${cropData.x}%`,
              top: `${cropData.y}%`,
              width: `${cropData.width}%`,
              height: `${cropData.height}%`,
              transition: isDragging ? 'none' : 'all 0.1s ease'
            }}
          >
            {/* Corner Resize Handles */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-nw-resize"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-ne-resize"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-sw-resize"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full cursor-se-resize"></div>
            
            {/* Center Move Handle */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-move flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          {/* Preview Banner Outline */}
          <div 
            className="absolute border-2 border-red-500 border-dashed"
            style={{
              left: '0%',
              top: '40%',
              width: '100%',
              height: '20%'
            }}
          >
            <div className="absolute -top-6 left-0 text-red-400 text-xs bg-black px-2 py-1 rounded">
              📏 Homepage Banner Area
            </div>
          </div>
        </div>

        {/* Status Display */}
        <div className="mt-4 text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div>📍 Position: {Math.round(cropData.x)}%, {Math.round(cropData.y)}%</div>
            <div>📐 Size: {Math.round(cropData.width)}% × {Math.round(cropData.height)}%</div>
            <div>🔍 Zoom: {Math.round(cropData.zoom * 100)}% | 🔄 {cropData.rotation}°</div>
          </div>
          {isResizing && (
            <div className="text-yellow-400 text-center mt-2">
              ✨ Resizing in real-time...
            </div>
          )}
        </div>
      </div>

      {/* Final Banner Preview */}
      <div className="bg-white rounded-lg p-4 border-2 border-gray-200">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          🎯 Final Banner Preview (Exact Homepage Size)
        </div>
        <div className="border-2 border-dashed border-yellow-400 rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ 
              width: '100%', 
              height: 'auto',
              maxHeight: '60px'
            }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Button 
          variant="outline" 
          onClick={() => adjustZoom(0.2)}
          className="text-sm"
        >
          🔍+ Zoom In
        </Button>
        <Button 
          variant="outline" 
          onClick={() => adjustZoom(-0.2)}
          className="text-sm"
        >
          🔍- Zoom Out
        </Button>
        <Button 
          variant="outline" 
          onClick={() => adjustRotation(15)}
          className="text-sm"
        >
          <RotateCw className="w-4 h-4 mr-1" />
          Rotate
        </Button>
        <Button 
          variant="outline" 
          onClick={() => adjustRotation(-15)}
          className="text-sm"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reverse
        </Button>
        <Button 
          variant="outline" 
          onClick={fitToBanner}
          className="text-sm"
        >
          <Maximize2 className="w-4 h-4 mr-1" />
          Fit Banner
        </Button>
        <Button 
          variant="outline" 
          onClick={resetCrop}
          className="text-sm"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
}