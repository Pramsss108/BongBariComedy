import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Image, RotateCw, ZoomIn, ZoomOut, Move } from "lucide-react";

interface BannerData {
  title: string;
  subtitle: string;
  bannerImage: string;
}

export function SimpleBannerManager() {
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cropData, setCropData] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zoom: 1
  });
  
  const { toast } = useToast();
  const { sessionId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current banner data
  const { data: currentBanner, isLoading } = useQuery({
    queryKey: ["/api/homepage-banner"],
    queryFn: () => fetch('/api/homepage-banner', {
      headers: sessionId ? { 'Authorization': `Bearer ${sessionId}` } : {}
    }).then(res => res.ok ? res.json() : { title: "বং বাড়ি", subtitle: "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প" }),
    enabled: !!sessionId,
  });

  // Save banner mutation
  const saveBannerMutation = useMutation({
    mutationFn: (data: BannerData) => apiRequest("/api/homepage-banner", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-banner"] });
      toast({ title: "✅ Banner updated successfully!" });
    },
    onError: () => {
      toast({ 
        title: "❌ Failed to update banner", 
        variant: "destructive" 
      });
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ 
          title: "⚠️ File too large", 
          description: "Please select an image under 10MB",
          variant: "destructive" 
        });
        return;
      }
      
      setBannerFile(file);
      const reader = new FileReader();
      reader.onload = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    const data: BannerData = {
      title,
      subtitle,
      bannerImage: bannerPreview || currentBanner?.bannerImage || ""
    };
    
    saveBannerMutation.mutate(data);
  };

  const adjustCrop = (property: keyof typeof cropData, delta: number) => {
    setCropData(prev => ({
      ...prev,
      [property]: Math.max(0, prev[property] + delta)
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-red-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Image className="h-10 w-10 text-blue-600" />
            Simple Banner Manager
          </h1>
          <p className="text-gray-600">Upload banner, set title and subtitle - that's it!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Banner Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title Input */}
              <div>
                <Label htmlFor="title">Homepage Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="বং বাড়ি"
                  className="text-lg"
                  data-testid="input-banner-title"
                />
              </div>

              {/* Subtitle Input */}
              <div>
                <Label htmlFor="subtitle">Homepage Subtitle</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="কলকাতার ঘরোয়া কমেডি - আমাদের গল্প"
                  data-testid="input-banner-subtitle"
                />
              </div>

              {/* Banner Upload */}
              <div className="space-y-4">
                <Label>Banner Image</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="input-banner-file"
                  />
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload banner image
                  </p>
                  <p className="text-xs text-gray-400">
                    PNG, JPG, JPEG up to 10MB
                  </p>
                </div>
              </div>

              {/* Image Adjustment Tools */}
              {bannerPreview && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800">Image Adjustments</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustCrop('zoom', 0.1)}
                      data-testid="button-zoom-in"
                    >
                      <ZoomIn className="w-4 h-4 mr-1" />
                      Zoom In
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustCrop('zoom', -0.1)}
                      data-testid="button-zoom-out"
                    >
                      <ZoomOut className="w-4 h-4 mr-1" />
                      Zoom Out
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => adjustCrop('rotation', 90)}
                      data-testid="button-rotate"
                    >
                      <RotateCw className="w-4 h-4 mr-1" />
                      Rotate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCropData({ x: 0, y: 0, width: 100, height: 100, rotation: 0, zoom: 1 })}
                      data-testid="button-reset"
                    >
                      <Move className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <Button 
                onClick={handleSave}
                disabled={saveBannerMutation.isPending}
                className="w-full bg-brand-blue hover:bg-blue-700 text-white"
                data-testid="button-save-banner"
              >
                {saveBannerMutation.isPending ? "Saving..." : "💾 Save Banner"}
              </Button>
            </CardContent>
          </Card>

          {/* Right Panel - Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-brand-yellow to-brand-red p-6 rounded-lg text-center">
                {/* Banner Image Preview */}
                {bannerPreview && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    <img 
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-32 object-cover"
                      style={{
                        transform: `scale(${cropData.zoom}) rotate(${cropData.rotation}deg)`,
                        objectPosition: `${cropData.x}% ${cropData.y}%`
                      }}
                    />
                  </div>
                )}
                
                {/* Title Preview */}
                <h1 className="text-3xl font-bold text-brand-blue mb-2 bangla-text">
                  {title || "বং বাড়ি"}
                </h1>
                
                {/* Subtitle Preview */}
                <p className="text-lg text-gray-700 bangla-text">
                  {subtitle || "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প"}
                </p>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  ☝️ This is how your banner will look on the homepage
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}