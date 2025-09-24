import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RotateCw, RotateCcw, RefreshCw, Maximize2, Target, ZoomIn, ZoomOut, Save, Settings } from "lucide-react";

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
  aspectRatio: string;
  pixelWidth: number;
  pixelHeight: number;
}

interface AdvancedProfessionalBannerStudioProps {
  imageUrl: string;
  onCropChange: (croppedImageUrl: string) => void;
  className?: string;
}

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "3:2", value: "3:2", ratio: 3/2 },
  { label: "5:3", value: "5:3", ratio: 5/3 },
  { label: "4:3", value: "4:3", ratio: 4/3 },
  { label: "5:4", value: "5:4", ratio: 5/4 },
  { label: "6:4", value: "6:4", ratio: 6/4 },
  { label: "7:5", value: "7:5", ratio: 7/5 },
  { label: "10:8", value: "10:8", ratio: 10/8 },
  { label: "16:9", value: "16:9", ratio: 16/9 },
  { label: "Custom", value: "custom", ratio: 0 }
];

export function AdvancedProfessionalBannerStudio({ imageUrl, onCropChange, className = "" }: AdvancedProfessionalBannerStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [cropData, setCropData] = useState<CropData>({
    x: 0,
    y: 40,
    width: 100,
    height: 20,
    rotation: 0,
    zoom: 1,
    aspectRatio: "custom",
    pixelWidth: 800,
    pixelHeight: 40
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Professional workspace dimensions
  const WORKSPACE_WIDTH = 900;
  const WORKSPACE_HEIGHT = 500;

  // Load image and get dimensions
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        // Update pixel dimensions based on crop percentage
        const actualWidth = Math.round(img.width * (cropData.width / 100));
        const actualHeight = Math.round(img.height * (cropData.height / 100));
        setCropData(prev => ({
          ...prev,
          pixelWidth: actualWidth,
          pixelHeight: actualHeight
        }));
      };
      img.src = imageUrl;
    }
  }, [imageUrl, cropData.width, cropData.height]);

  const updateCroppedImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = cropData.pixelWidth;
    canvas.height = cropData.pixelHeight;

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

    const croppedImageUrl = canvas.toDataURL('image/png', 1.0);
    onCropChange(croppedImageUrl);
  }, [imageUrl, cropData, onCropChange]);

  useEffect(() => {
    if (imageLoaded) {
      updateCroppedImage();
    }
  }, [updateCroppedImage, imageLoaded]);

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
      const newData = { ...prev };

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

      // Update pixel dimensions
      if (imageRef.current) {
        newData.pixelWidth = Math.round(imageRef.current.width * (newData.width / 100));
        newData.pixelHeight = Math.round(imageRef.current.height * (newData.height / 100));
      }

      return newData;
    });

    setLastMousePos(mousePos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const applyAspectRatio = (aspectValue: string) => {
    const aspect = ASPECT_RATIOS.find(ar => ar.value === aspectValue);
    if (!aspect || aspect.value === "custom") {
      setCropData(prev => ({ ...prev, aspectRatio: aspectValue }));
      return;
    }

    setCropData(prev => {
      const currentHeight = prev.height;
      const newWidth = currentHeight * aspect.ratio;
      
      // Adjust if width exceeds bounds
      if (prev.x + newWidth > 100) {
        const adjustedWidth = 100 - prev.x;
        const adjustedHeight = adjustedWidth / aspect.ratio;
        
        const newData = {
          ...prev,
          width: adjustedWidth,
          height: adjustedHeight,
          aspectRatio: aspectValue
        };

        if (imageRef.current) {
          newData.pixelWidth = Math.round(imageRef.current.width * (adjustedWidth / 100));
          newData.pixelHeight = Math.round(imageRef.current.height * (adjustedHeight / 100));
        }

        return newData;
      }

      const newData = {
        ...prev,
        width: newWidth,
        aspectRatio: aspectValue
      };

      if (imageRef.current) {
        newData.pixelWidth = Math.round(imageRef.current.width * (newWidth / 100));
        newData.pixelHeight = Math.round(imageRef.current.height * (currentHeight / 100));
      }

      return newData;
    });
  };

  const updatePixelDimensions = (width: number, height: number) => {
    if (!imageRef.current) return;

    const percentWidth = (width / imageRef.current.width) * 100;
    const percentHeight = (height / imageRef.current.height) * 100;

    setCropData(prev => ({
      ...prev,
      width: Math.min(100, percentWidth),
      height: Math.min(100, percentHeight),
      pixelWidth: width,
      pixelHeight: height,
      aspectRatio: "custom"
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
    setCropData(prev => ({
      ...prev,
      x: 0,
      y: 40,
      width: 100,
      height: 20,
      rotation: 0,
      zoom: 1,
      aspectRatio: "custom"
    }));
  };

  const snapToBannerArea = () => {
    setCropData(prev => ({
      ...prev,
      x: 0,
      y: 40,
      width: 100,
      height: 20,
      aspectRatio: "custom"
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-3">
            🎬 Advanced Professional Banner Studio
            <Badge variant="secondary" className="bg-blue-600 text-white">
              Professional
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          
          {/* Advanced Control Panel */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Dimensions Control */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-400" />
                  <h4 className="text-white font-medium text-sm">Dimensions</h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-400">Width</Label>
                    <Input
                      type="number"
                      value={cropData.pixelWidth}
                      onChange={(e) => updatePixelDimensions(parseInt(e.target.value) || 0, cropData.pixelHeight)}
                      className="h-8 bg-gray-700 border-gray-600 text-white text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Height</Label>
                    <Input
                      type="number"
                      value={cropData.pixelHeight}
                      onChange={(e) => updatePixelDimensions(cropData.pixelWidth, parseInt(e.target.value) || 0)}
                      className="h-8 bg-gray-700 border-gray-600 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Presets */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">Aspect Ratio</h4>
                <div className="grid grid-cols-3 gap-1">
                  {ASPECT_RATIOS.slice(0, 9).map((aspect) => (
                    <Button
                      key={aspect.value}
                      variant={cropData.aspectRatio === aspect.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyAspectRatio(aspect.value)}
                      className={`h-7 text-xs ${
                        cropData.aspectRatio === aspect.value 
                          ? "bg-blue-600 text-white" 
                          : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                      }`}
                    >
                      {aspect.label}
                    </Button>
                  ))}
                </div>
                <Button
                  variant={cropData.aspectRatio === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyAspectRatio("custom")}
                  className={`w-full h-7 text-xs ${
                    cropData.aspectRatio === "custom" 
                      ? "bg-yellow-600 text-white" 
                      : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  }`}
                >
                  Custom
                </Button>
              </div>

              {/* Zoom Controls */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">Zoom & Transform</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustZoom(0.1)}
                    className="h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs"
                  >
                    <ZoomIn className="w-3 h-3 mr-1" />
                    +
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustZoom(-0.1)}
                    className="h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs"
                  >
                    <ZoomOut className="w-3 h-3 mr-1" />
                    -
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustRotation(15)}
                    className="h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs"
                  >
                    <RotateCw className="w-3 h-3 mr-1" />
                    +15°
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => adjustRotation(-15)}
                    className="h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    -15°
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  Zoom: {Math.round(cropData.zoom * 100)}% | Rotation: {cropData.rotation}°
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="text-white font-medium text-sm">Quick Actions</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={snapToBannerArea}
                    className="w-full h-7 bg-red-600 border-red-500 text-white hover:bg-red-500 text-xs"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    Banner Area
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetCrop}
                    className="w-full h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Main Workspace Panel */}
          <div className="bg-gray-800 border-t border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">🎯 Advanced Crop Workspace</h3>
                <div className="text-xs text-gray-400">
                  Position: {Math.round(cropData.x)}%, {Math.round(cropData.y)}% | 
                  Size: {cropData.pixelWidth} × {cropData.pixelHeight}px |
                  Ratio: {cropData.aspectRatio}
                </div>
              </div>
            </div>
            
            {/* Professional Crop Workspace */}
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
                {/* Banner Target Area */}
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
                    🎯 Banner Target Area
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

                {/* Live Info Overlay */}
                {isDragging && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white px-3 py-2 rounded text-sm">
                    <div>✨ {dragMode?.includes('resize') ? 'Resizing' : 'Moving'}</div>
                    <div className="text-xs text-gray-300">
                      {cropData.pixelWidth} × {cropData.pixelHeight}px
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Output Preview Panel */}
          <div className="bg-gray-900 p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-medium text-sm">📺 Final Output Preview</h4>
              <Badge variant="outline" className="border-green-500 text-green-400">
                {cropData.pixelWidth} × {cropData.pixelHeight}px
              </Badge>
            </div>
            <div className="bg-black p-4 rounded-lg border border-gray-600">
              <canvas
                ref={canvasRef}
                className="w-full border border-gray-500 rounded"
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  maxHeight: '80px'
                }}
              />
              <div className="text-center mt-2 text-xs text-gray-400">
                🎯 Base64 encoded banner ready for upload
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}