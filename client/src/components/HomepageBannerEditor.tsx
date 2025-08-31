import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Save, X, Edit3, Clock } from "lucide-react";
import { SimpleCropStudio } from "./SimpleCropStudio";
import { useToast } from "@/hooks/use-toast";

interface BannerData {
  title: string;
  subtitle: string;
  bannerImage: string;
}

interface HomepageBannerEditorProps {
  currentBanner: BannerData | null;
  onClose: () => void;
  timeRemaining: number;
}

export function HomepageBannerEditor({ currentBanner, onClose, timeRemaining }: HomepageBannerEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState(currentBanner?.title || "");
  const [subtitle, setSubtitle] = useState(currentBanner?.subtitle || "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  // Load current data
  useEffect(() => {
    if (currentBanner) {
      setTitle(currentBanner.title || "");
      setSubtitle(currentBanner.subtitle || "");
    }
  }, [currentBanner]);

  const saveBannerMutation = useMutation({
    mutationFn: async (data: BannerData) => {
      const response = await fetch("/api/homepage-banner", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "credentials": "include"
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update banner: ${response.status} - ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Banner Updated!",
        description: "Homepage banner has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/homepage-banner"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBannerPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const data: BannerData = {
      title: title.trim() || currentBanner?.title || "বং বাড়ি",
      subtitle: subtitle.trim() || currentBanner?.subtitle || "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প",
      bannerImage: croppedImage || currentBanner?.bannerImage || ""
    };
    
    saveBannerMutation.mutate(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white">
        <CardContent className="p-6">
          
          {/* Header with Timer */}
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div className="flex items-center gap-3">
              <Edit3 className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Quick Banner Editor</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Session Timer */}
              <div className="flex items-center gap-2 bg-red-100 px-3 py-2 rounded-lg">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {formatTime(timeRemaining)} remaining
                </span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClose}
                className="text-gray-600"
              >
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Quick Text Edits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quick-title">📝 Homepage Title</Label>
                <Input
                  id="quick-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="বং বাড়ি"
                  className="text-lg"
                />
              </div>
              <div>
                <Label htmlFor="quick-subtitle">Homepage Subtitle</Label>
                <Input
                  id="quick-subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="কলকাতার ঘরোয়া কমেডি - আমাদের গল্প"
                />
              </div>
            </div>

            {/* Banner Upload */}
            <div className="space-y-4">
              <Label>Update Banner Image (Optional)</Label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload new banner image
                </p>
              </div>
            </div>

            {/* Simple Crop Studio */}
            {bannerPreview && (
              <SimpleCropStudio 
                imageUrl={bannerPreview}
                onCropChange={setCroppedImage}
                className=""
              />
            )}

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">🎯 Live Preview</h3>
              <div className="bg-gradient-to-r from-yellow-400 to-red-500 p-6 rounded-lg text-center">
                {(croppedImage || currentBanner?.bannerImage) && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    <img 
                      src={croppedImage || currentBanner?.bannerImage}
                      alt="Banner preview"
                      className="w-full h-20 md:h-24 object-cover"
                      style={{ aspectRatio: '20/1' }}
                    />
                  </div>
                )}
                
                <h1 className="text-3xl font-bold text-blue-600 mb-2">
                  {title || "বং বাড়ি"}
                </h1>
                
                <p className="text-lg text-gray-700">
                  {subtitle || "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প"}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-500">
                ⚡ Quick editing mode - Changes save immediately to homepage
              </p>
              <Button 
                onClick={handleSave}
                disabled={saveBannerMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveBannerMutation.isPending ? "Saving..." : "💾 Save Changes"}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}