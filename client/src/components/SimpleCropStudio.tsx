import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface CropData {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ViewportData {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface SimpleCropStudioProps {
  imageUrl: string;
  onCropChange: (croppedImageUrl: string) => void;
  className?: string;
}

export function SimpleCropStudio({ imageUrl, onCropChange, className = "" }: SimpleCropStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropData, setCropData] = useState<CropData>({
    width: 585,
    height: 360,
    x: 174,
    y: 35
  });
  
  const [viewport, setViewport] = useState<ViewportData>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | 'pan' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartData, setDragStartData] = useState({ crop: cropData, viewport });

  // Load image and get dimensions
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageSize({ width: img.width, height: img.height });
        // Set initial crop to center of image
        const initialCrop = {
          width: Math.min(585, img.width * 0.6),
          height: Math.min(360, img.height * 0.6),
          x: img.width * 0.2,
          y: img.height * 0.2
        };
        setCropData(initialCrop);
        // Reset viewport
        setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  const updateCroppedImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = cropData.width;
    canvas.height = cropData.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(
      img,
      cropData.x, cropData.y, cropData.width, cropData.height,
      0, 0, cropData.width, cropData.height
    );

    const croppedImageUrl = canvas.toDataURL('image/png', 1.0);
    onCropChange(croppedImageUrl);
  }, [cropData, onCropChange]);

  useEffect(() => {
    if (imageRef.current) {
      updateCroppedImage();
    }
  }, [updateCroppedImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const displayScale = Math.min(rect.width / imageSize.width, rect.height / imageSize.height) * viewport.scale;
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    
    const imageLeft = (rect.width - displayWidth) / 2 + viewport.offsetX;
    const imageTop = (rect.height - displayHeight) / 2 + viewport.offsetY;
    
    const cropLeft = imageLeft + (cropData.x * displayScale);
    const cropTop = imageTop + (cropData.y * displayScale);
    const cropRight = cropLeft + (cropData.width * displayScale);
    const cropBottom = cropTop + (cropData.height * displayScale);

    // Check if clicking on resize handle (bottom-right corner)
    if (Math.abs(x - cropRight) < 12 && Math.abs(y - cropBottom) < 12) {
      setDragMode('resize');
    } else if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) {
      setDragMode('move');
    } else {
      setDragMode('pan');
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartData({ crop: cropData, viewport });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const displayScale = Math.min(rect.width / imageSize.width, rect.height / imageSize.height) * viewport.scale;
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    
    const imageLeft = (rect.width - displayWidth) / 2 + viewport.offsetX;
    const imageTop = (rect.height - displayHeight) / 2 + viewport.offsetY;
    
    const cropLeft = imageLeft + (cropData.x * displayScale);
    const cropTop = imageTop + (cropData.y * displayScale);
    const cropRight = cropLeft + (cropData.width * displayScale);
    const cropBottom = cropTop + (cropData.height * displayScale);

    // Update cursor
    if (!isDragging) {
      if (Math.abs(x - cropRight) < 12 && Math.abs(y - cropBottom) < 12) {
        if (workspaceRef.current) workspaceRef.current.style.cursor = 'se-resize';
      } else if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) {
        if (workspaceRef.current) workspaceRef.current.style.cursor = 'move';
      } else {
        if (workspaceRef.current) workspaceRef.current.style.cursor = 'grab';
      }
    }

    if (!isDragging || !dragMode) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (dragMode === 'move') {
      const newX = dragStartData.crop.x + (deltaX / displayScale);
      const newY = dragStartData.crop.y + (deltaY / displayScale);
      setCropData(prev => ({
        ...prev,
        x: Math.max(0, Math.min(imageSize.width - prev.width, newX)),
        y: Math.max(0, Math.min(imageSize.height - prev.height, newY))
      }));
    } else if (dragMode === 'resize') {
      const newWidth = dragStartData.crop.width + (deltaX / displayScale);
      const newHeight = dragStartData.crop.height + (deltaY / displayScale);
      setCropData(prev => ({
        ...prev,
        width: Math.max(50, Math.min(imageSize.width - prev.x, newWidth)),
        height: Math.max(50, Math.min(imageSize.height - prev.y, newHeight))
      }));
    } else if (dragMode === 'pan') {
      setViewport(prev => ({
        ...prev,
        offsetX: dragStartData.viewport.offsetX + deltaX,
        offsetY: dragStartData.viewport.offsetY + deltaY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  const handleInputChange = (field: keyof CropData, value: string) => {
    const numValue = parseInt(value) || 0;
    setCropData(prev => {
      const newData = { ...prev, [field]: numValue };
      
      // Ensure bounds
      if (field === 'width') {
        newData.width = Math.min(imageSize.width - prev.x, Math.max(1, numValue));
      } else if (field === 'height') {
        newData.height = Math.min(imageSize.height - prev.y, Math.max(1, numValue));
      } else if (field === 'x') {
        newData.x = Math.min(imageSize.width - prev.width, Math.max(0, numValue));
      } else if (field === 'y') {
        newData.y = Math.min(imageSize.height - prev.height, Math.max(0, numValue));
      }
      
      return newData;
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setViewport(prev => ({
      ...prev,
      scale: direction === 'in' 
        ? Math.min(prev.scale * 1.2, 3) 
        : Math.max(prev.scale / 1.2, 0.5)
    }));
  };

  const resetView = () => {
    setViewport({ scale: 1, offsetX: 0, offsetY: 0 });
  };

  const fitToView = () => {
    if (!workspaceRef.current || !imageSize.width) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const scaleX = (rect.width * 0.8) / cropData.width;
    const scaleY = (rect.height * 0.8) / cropData.height;
    const newScale = Math.min(scaleX, scaleY, 2);
    setViewport({ scale: newScale, offsetX: 0, offsetY: 0 });
  };

  return (
    <div className={`${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Image Preview Area */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
              <div 
                ref={workspaceRef}
                className="relative bg-white rounded-lg overflow-hidden shadow-inner mx-auto"
                style={{ 
                  width: '100%',
                  height: '400px'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {imageUrl && (() => {
                  const rect = workspaceRef.current?.getBoundingClientRect();
                  if (!rect) return null;
                  
                  const displayScale = Math.min(rect.width / imageSize.width, rect.height / imageSize.height) * viewport.scale;
                  const displayWidth = imageSize.width * displayScale;
                  const displayHeight = imageSize.height * displayScale;
                  
                  const imageLeft = (rect.width - displayWidth) / 2 + viewport.offsetX;
                  const imageTop = (rect.height - displayHeight) / 2 + viewport.offsetY;
                  
                  const cropLeft = imageLeft + (cropData.x * displayScale);
                  const cropTop = imageTop + (cropData.y * displayScale);
                  const cropWidth = cropData.width * displayScale;
                  const cropHeight = cropData.height * displayScale;
                  
                  return (
                    <>
                      {/* Dark Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none" />
                      
                      {/* Main Image */}
                      <img 
                        src={imageUrl}
                        alt="Crop preview"
                        className="absolute pointer-events-none"
                        style={{
                          width: `${displayWidth}px`,
                          height: `${displayHeight}px`,
                          left: `${imageLeft}px`,
                          top: `${imageTop}px`,
                          opacity: 0.8
                        }}
                      />
                      
                      {/* Crop Area - Clear View */}
                      <div
                        className="absolute pointer-events-none"
                        style={{
                          left: `${cropLeft}px`,
                          top: `${cropTop}px`,
                          width: `${cropWidth}px`,
                          height: `${cropHeight}px`,
                          backgroundImage: `url(${imageUrl})`,
                          backgroundSize: `${displayWidth}px ${displayHeight}px`,
                          backgroundPosition: `-${cropData.x * displayScale}px -${cropData.y * displayScale}px`,
                          backgroundRepeat: 'no-repeat'
                        }}
                      />
                      
                      {/* Red Guide Lines */}
                      <div
                        className="absolute border-2 border-red-500 pointer-events-none"
                        style={{
                          left: `${cropLeft}px`,
                          top: `${cropTop}px`,
                          width: `${cropWidth}px`,
                          height: `${cropHeight}px`
                        }}
                      >
                        {/* Corner Markers */}
                        <div className="absolute -top-1 -left-1 w-3 h-3 border-2 border-red-500 bg-red-500" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 border-2 border-red-500 bg-red-500" />
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-2 border-red-500 bg-red-500" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-2 border-red-500 bg-red-500" />
                        
                        {/* Center Lines */}
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 opacity-50" style={{ transform: 'translateY(-50%)' }} />
                        <div className="absolute left-1/2 top-0 w-0.5 h-full bg-red-500 opacity-50" style={{ transform: 'translateX(-50%)' }} />
                      </div>
                      
                      {/* Resize Handle */}
                      <div 
                        className="absolute w-4 h-4 bg-red-500 cursor-se-resize border-2 border-white shadow-lg"
                        style={{ 
                          left: `${cropLeft + cropWidth - 8}px`,
                          top: `${cropTop + cropHeight - 8}px`
                        }}
                      />
                      
                      {/* Dimension Labels */}
                      <div 
                        className="absolute text-xs bg-red-500 text-white px-2 py-1 rounded pointer-events-none"
                        style={{
                          left: `${cropLeft}px`,
                          top: `${cropTop - 25}px`
                        }}
                      >
                        {cropData.width} × {cropData.height}
                      </div>
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crop Options Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Crop options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Width Input */}
              <div>
                <Label className="text-sm text-gray-700 mb-2">Width (px)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={cropData.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    className="pr-8 bg-gray-50 border-gray-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ↔
                  </span>
                </div>
              </div>

              {/* Height Input */}
              <div>
                <Label className="text-sm text-gray-700 mb-2">Height (px)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={cropData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="pr-8 bg-gray-50 border-gray-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ↕
                  </span>
                </div>
              </div>

              {/* Position X Input */}
              <div>
                <Label className="text-sm text-gray-700 mb-2">Position X (px)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={cropData.x}
                    onChange={(e) => handleInputChange('x', e.target.value)}
                    className="pr-8 bg-gray-50 border-gray-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    →
                  </span>
                </div>
              </div>

              {/* Position Y Input */}
              <div>
                <Label className="text-sm text-gray-700 mb-2">Position Y (px)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={cropData.y}
                    onChange={(e) => handleInputChange('y', e.target.value)}
                    className="pr-8 bg-gray-50 border-gray-300"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    ↓
                  </span>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleZoom('out')}
                  className="flex-1"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetView}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleZoom('in')}
                  className="flex-1"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Fit Controls */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fitToView}
                className="w-full mb-4"
              >
                <Move className="w-4 h-4 mr-2" />
                Fit to Crop
              </Button>
              
              {/* Zoom Level */}
              <div className="text-center mb-4">
                <span className="text-sm text-gray-600">
                  Zoom: {Math.round(viewport.scale * 100)}%
                </span>
              </div>

              {/* Crop Button */}
              <Button 
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded-lg"
                onClick={updateCroppedImage}
              >
                Crop IMAGE 🎯
              </Button>

              {/* Hidden Canvas for Export */}
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Info Text */}
              <div className="text-xs text-gray-500 text-center mt-4 space-y-1">
                <p>• Drag inside red area to move crop</p>
                <p>• Drag corner handle to resize</p>
                <p>• Drag outside to pan image</p>
                <p>• Use zoom controls to scale</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}