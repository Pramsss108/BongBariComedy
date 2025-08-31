import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RotateCw, RotateCcw, RefreshCw, Maximize2, Target, ZoomIn, ZoomOut } from "lucide-react";

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
}

interface ProfessionalBannerStudioProps {
  imageUrl: string;
  onCropChange: (croppedImageUrl: string) => void;
  className?: string;
}

export function ProfessionalBannerStudio({ imageUrl, onCropChange, className = "" }: ProfessionalBannerStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [cropData, setCropData] = useState<CropData>({
    x: 0,
    y: 40,
    width: 100,
    height: 20,
    rotation: 0,
    zoom: 1
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Professional workspace dimensions
  const WORKSPACE_WIDTH = 900;
  const WORKSPACE_HEIGHT = 500;
  const BANNER_WIDTH = 800;
  const BANNER_HEIGHT = 40;

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

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      ctx.translate(centerX, centerY);
      ctx.rotate((cropData.rotation * Math.PI) / 180);
      ctx.scale(cropData.zoom, cropData.zoom);

      const sourceWidth = img.width * (cropData.width / 100);
      const sourceHeight = img.height * (cropData.height / 100);
      const sourceX = img.width * (cropData.x / 100);
      const sourceY = img.height * (cropData.y / 100);

      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height
      );

      ctx.restore();

      const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCropChange(croppedImageUrl);
    };

    img.src = imageUrl;
  }, [imageUrl, cropData, onCropChange]);

  useEffect(() => {
    updateCroppedImage();
  }, [updateCroppedImage]);

  const getMousePosition = (e: React.MouseEvent) => {
    const workspace = workspaceRef.current;
    if (!workspace) return { x: 0, y: 0 };
    
    const rect = workspace.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const getCursorForPosition = (x: number, y: number): string => {
    const threshold = 3;
    const cropLeft = cropData.x;
    const cropRight = cropData.x + cropData.width;
    const cropTop = cropData.y;
    const cropBottom = cropData.y + cropData.height;

    // Corner resize cursors
    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropTop) < threshold) return 'nw-resize';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropTop) < threshold) return 'ne-resize';
    if (Math.abs(x - cropLeft) < threshold && Math.abs(y - cropBottom) < threshold) return 'sw-resize';
    if (Math.abs(x - cropRight) < threshold && Math.abs(y - cropBottom) < threshold) return 'se-resize';
    
    if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) return 'move';
    
    return 'crosshair';
  };

  const getDragMode = (x: number, y: number): typeof dragMode => {
    const threshold = 3;
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
      setDragMode(mode);
      setLastMousePos(mousePos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePosition(e);
    const cursor = getCursorForPosition(mousePos.x, mousePos.y);
    
    if (workspaceRef.current) {
      workspaceRef.current.style.cursor = cursor;
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
          if (newWidth1 > 5 && newHeight1 > 5) {
            newData.x = prev.x + deltaX;
            newData.y = prev.y + deltaY;
            newData.width = newWidth1;
            newData.height = newHeight1;
          }
          break;
          
        case 'resize-tr':
          const newWidth2 = prev.width + deltaX;
          const newHeight2 = prev.height - deltaY;
          if (newWidth2 > 5 && newHeight2 > 5) {
            newData.y = prev.y + deltaY;
            newData.width = newWidth2;
            newData.height = newHeight2;
          }
          break;
          
        case 'resize-bl':
          const newWidth3 = prev.width - deltaX;
          const newHeight3 = prev.height + deltaY;
          if (newWidth3 > 5 && newHeight3 > 5) {
            newData.x = prev.x + deltaX;
            newData.width = newWidth3;
            newData.height = newHeight3;
          }
          break;
          
        case 'resize-br':
          const newWidth4 = prev.width + deltaX;
          const newHeight4 = prev.height + deltaY;
          if (newWidth4 > 5 && newHeight4 > 5) {
            newData.width = newWidth4;
            newData.height = newHeight4;
          }
          break;
      }

      // Ensure bounds
      newData.x = Math.max(0, Math.min(100 - newData.width, newData.x));
      newData.y = Math.max(0, Math.min(100 - newData.height, newData.y));
      newData.width = Math.max(5, Math.min(100 - newData.x, newData.width));
      newData.height = Math.max(5, Math.min(100 - newData.y, newData.height));

      return newData;
    });

    setLastMousePos(mousePos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const snapToBannerArea = () => {
    setCropData(prev => ({
      ...prev,
      x: 0,
      y: 40,
      width: 100,
      height: 20
    }));
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
      x: 0,
      y: 40,
      width: 100,
      height: 20,
      rotation: 0,
      zoom: 1
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Professional Studio Layout */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-3">
            🎬 Professional Banner Studio
            <span className="text-sm text-gray-400 font-normal">LMMS-Style Interface</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          
          {/* Main Workspace Panel */}
          <div className="bg-gray-800 border-t border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">🎯 Crop Workspace</h3>
                <div className="text-xs text-gray-400">
                  Position: {Math.round(cropData.x)}%, {Math.round(cropData.y)}% | 
                  Size: {Math.round(cropData.width)}% × {Math.round(cropData.height)}%
                </div>
              </div>
            </div>
            
            {/* Dedicated Crop Workspace */}
            <div className="p-6 bg-gray-850">
              <div 
                ref={workspaceRef}
                className="relative bg-black rounded-lg mx-auto select-none border-2 border-gray-600"
                style={{ 
                  width: WORKSPACE_WIDTH * 0.8, 
                  height: WORKSPACE_HEIGHT * 0.8,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Banner Target Area (Red Dashed) */}
                <div 
                  className="absolute border-2 border-red-500 border-dashed bg-red-500 bg-opacity-10"
                  style={{
                    left: '0%',
                    top: '40%',
                    width: '100%',
                    height: '20%'
                  }}
                >
                  <div className="absolute -top-7 left-2 text-red-400 text-xs bg-black px-2 py-1 rounded flex items-center gap-1">
                    🎯 Homepage Banner Area
                  </div>
                </div>

                {/* Active Crop Area */}
                <div
                  className="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-20 transition-all duration-75"
                  style={{
                    left: `${cropData.x}%`,
                    top: `${cropData.y}%`,
                    width: `${cropData.width}%`,
                    height: `${cropData.height}%`
                  }}
                >
                  {/* Enhanced Corner Handles */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-nw-resize shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="absolute -top-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-ne-resize shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-sw-resize shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-yellow-400 border-2 border-white rounded-full cursor-se-resize shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  
                  {/* Center Move Handle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 border-2 border-white rounded-full cursor-move shadow-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Crop Info Overlay */}
                {isDragging && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-80 text-white px-3 py-2 rounded text-sm">
                    ✨ {dragMode?.includes('resize') ? 'Resizing' : 'Moving'} crop area...
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Control Panel */}
          <div className="bg-gray-850 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Transform Controls */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">🔧 Transform</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustZoom(0.2)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <ZoomIn className="w-4 h-4 mr-1" />
                    Zoom+
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustZoom(-0.2)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <ZoomOut className="w-4 h-4 mr-1" />
                    Zoom-
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustRotation(15)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <RotateCw className="w-4 h-4 mr-1" />
                    Rotate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustRotation(-15)}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reverse
                  </Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">⚡ Quick Actions</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={snapToBannerArea}
                    className="bg-red-600 border-red-500 text-white hover:bg-red-500"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    Snap to Banner Area
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetCrop}
                    className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reset All
                  </Button>
                </div>
              </div>

              {/* Status Panel */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">📊 Status</h4>
                <div className="bg-gray-700 p-3 rounded text-xs text-gray-300 space-y-1">
                  <div>🎯 Zoom: {Math.round(cropData.zoom * 100)}%</div>
                  <div>🔄 Rotation: {cropData.rotation}°</div>
                  <div>📐 Aspect: {(cropData.width / cropData.height).toFixed(1)}:1</div>
                  {isDragging && (
                    <div className="text-yellow-400">✨ Active editing...</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Output Preview Panel */}
          <div className="bg-gray-900 p-6">
            <h4 className="text-white font-medium text-sm mb-3">📺 Final Output Preview</h4>
            <div className="bg-black p-4 rounded-lg border border-gray-600">
              <canvas
                ref={canvasRef}
                className="w-full border border-gray-500 rounded"
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '50px'
                }}
              />
              <div className="text-center mt-2 text-xs text-gray-400">
                🎯 This is your exact homepage banner
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}