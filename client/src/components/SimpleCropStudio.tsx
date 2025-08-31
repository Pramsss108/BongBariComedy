import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CropData {
  width: number;
  height: number;
  x: number;
  y: number;
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
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load image and get dimensions
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageSize({ width: img.width, height: img.height });
        // Set initial crop to center of image
        setCropData({
          width: Math.min(585, img.width * 0.8),
          height: Math.min(360, img.height * 0.8),
          x: img.width * 0.1,
          y: img.height * 0.1
        });
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
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scale = rect.width / imageSize.width;
    const cropLeft = cropData.x * scale;
    const cropTop = cropData.y * scale;
    const cropRight = cropLeft + cropData.width * scale;
    const cropBottom = cropTop + cropData.height * scale;

    // Check if clicking on resize handle (bottom-right corner)
    if (Math.abs(x - cropRight) < 10 && Math.abs(y - cropBottom) < 10) {
      setDragMode('resize');
    } else if (x >= cropLeft && x <= cropRight && y >= cropTop && y <= cropBottom) {
      setDragMode('move');
    } else {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scale = rect.width / imageSize.width;
    const cropRight = cropData.x * scale + cropData.width * scale;
    const cropBottom = cropData.y * scale + cropData.height * scale;

    // Update cursor
    if (Math.abs(x - cropRight) < 10 && Math.abs(y - cropBottom) < 10) {
      if (workspaceRef.current) workspaceRef.current.style.cursor = 'se-resize';
    } else if (x >= cropData.x * scale && x <= cropRight && y >= cropData.y * scale && y <= cropBottom) {
      if (workspaceRef.current) workspaceRef.current.style.cursor = 'move';
    } else {
      if (workspaceRef.current) workspaceRef.current.style.cursor = 'default';
    }

    if (!isDragging || !dragMode) return;

    const deltaX = (e.clientX - dragStart.x) / scale;
    const deltaY = (e.clientY - dragStart.y) / scale;

    if (dragMode === 'move') {
      setCropData(prev => ({
        ...prev,
        x: Math.max(0, Math.min(imageSize.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(imageSize.height - prev.height, prev.y + deltaY))
      }));
    } else if (dragMode === 'resize') {
      setCropData(prev => ({
        ...prev,
        width: Math.max(50, Math.min(imageSize.width - prev.x, prev.width + deltaX)),
        height: Math.max(50, Math.min(imageSize.height - prev.y, prev.height + deltaY))
      }));
    }

    setDragStart({ x: e.clientX, y: e.clientY });
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
                  maxWidth: '100%',
                  aspectRatio: imageSize.width / imageSize.height || 1
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {imageUrl && (
                  <>
                    {/* Background Image */}
                    <img 
                      src={imageUrl}
                      alt="Crop preview"
                      className="w-full h-full object-contain"
                      style={{ opacity: 0.3 }}
                    />
                    
                    {/* Crop Overlay */}
                    <div
                      className="absolute border-2 border-dashed border-blue-500"
                      style={{
                        left: `${(cropData.x / imageSize.width) * 100}%`,
                        top: `${(cropData.y / imageSize.height) * 100}%`,
                        width: `${(cropData.width / imageSize.width) * 100}%`,
                        height: `${(cropData.height / imageSize.height) * 100}%`,
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: `${(imageSize.width / cropData.width) * 100}% ${(imageSize.height / cropData.height) * 100}%`,
                        backgroundPosition: `-${cropData.x}px -${cropData.y}px`
                      }}
                    >
                      {/* Resize Handle */}
                      <div 
                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
                        style={{ transform: 'translate(50%, 50%)' }}
                      />
                    </div>
                  </>
                )}
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

              {/* Crop Button */}
              <Button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg mt-6"
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
              <p className="text-xs text-gray-500 text-center mt-4">
                Drag the image or use resize handle to adjust crop area
              </p>
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}