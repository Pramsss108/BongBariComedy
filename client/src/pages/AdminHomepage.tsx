import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, buildApiUrl } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Plus, Edit, Eye, Home, Gift, Megaphone, ImageIcon, Upload, Image } from "lucide-react";

interface HomepageContent {
  id: number;
  sectionType: string;
  title?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  isActive: boolean;
  displayOrder: number;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminHomepage() {
  const [editingContent, setEditingContent] = useState<HomepageContent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sessionId } = useAuth();

  // Fetch homepage content with authentication
  const { data: contentData = [], isLoading } = useQuery({
    queryKey: ["/api/admin/homepage-content"],
    queryFn: () => fetch(buildApiUrl('/api/admin/homepage-content'), {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }),
    enabled: !!sessionId,
  });

  // Content mutations with authentication
  const createContentMutation = useMutation({
    mutationFn: (data: Partial<HomepageContent>) => apiRequest("/api/admin/homepage-content", { 
      method: "POST", 
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-content"] });
      setIsDialogOpen(false);
      setEditingContent(null);
      setSelectedImage(null);
      setImagePreview(null);
      toast({ title: "✅ Homepage content created successfully!" });
    },
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<HomepageContent> & { id: number }) => 
      apiRequest(`/api/admin/homepage-content/${id}`, { 
        method: "PUT", 
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-content"] });
      setIsDialogOpen(false);
      setEditingContent(null);
      setSelectedImage(null);
      setImagePreview(null);
      toast({ title: "✅ Homepage content updated successfully!" });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/homepage-content/${id}`, { 
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/homepage-content"] });
      toast({ title: "🗑️ Homepage content deleted successfully!" });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ 
          title: "⚠️ File too large", 
          description: "Please select an image under 5MB",
          variant: "destructive" 
        });
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Handle image upload
    let imageUrl = formData.get("imageUrl") as string;
    if (selectedImage) {
      // For demo purposes, we'll use a placeholder URL
      // In production, you'd upload to your storage service first
      imageUrl = imagePreview || "";
    }
    
    const data = {
      sectionType: formData.get("sectionType") as string,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      imageUrl: imageUrl,
      linkUrl: formData.get("linkUrl") as string,
      buttonText: formData.get("buttonText") as string,
      isActive: formData.get("isActive") === "on",
      displayOrder: parseInt(formData.get("displayOrder") as string),
    };

    if (editingContent) {
      updateContentMutation.mutate({ id: editingContent.id, ...data });
    } else {
      createContentMutation.mutate(data);
    }
  };

  const getSectionIcon = (sectionType: string) => {
    switch (sectionType) {
      case "offer": return <Gift className="h-5 w-5 text-yellow-600" />;
      case "announcement": return <Megaphone className="h-5 w-5 text-blue-600" />;
      case "banner": return <ImageIcon className="h-5 w-5 text-purple-600" />;
      default: return <Home className="h-5 w-5 text-green-600" />;
    }
  };

  const getSectionColor = (sectionType: string) => {
    switch (sectionType) {
      case "offer": return "bg-yellow-100 text-yellow-800";
      case "announcement": return "bg-blue-100 text-blue-800";
      case "banner": return "bg-purple-100 text-purple-800";
      default: return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Home className="h-10 w-10 text-blue-600" />
            Homepage Content Manager
          </h1>
          <p className="text-gray-600">Manage offers, banners, announcements, and greetings without coding</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Content Sections</h2>
            <p className="text-gray-600">Create and manage dynamic homepage content</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-content">
                <Plus className="h-4 w-4 mr-2" />
                Add Content Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingContent ? "Edit" : "Add"} Homepage Content</DialogTitle>
                <DialogDescription>
                  Create dynamic content sections for your homepage like offers, banners, and announcements
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sectionType">Section Type</Label>
                    <Select name="sectionType" defaultValue={editingContent?.sectionType || "offer"}>
                      <SelectTrigger data-testid="select-section-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offer">🎁 Special Offer</SelectItem>
                        <SelectItem value="greeting">🙏 Welcome Greeting</SelectItem>
                        <SelectItem value="announcement">📢 Announcement</SelectItem>
                        <SelectItem value="banner">🖼️ Banner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="displayOrder">Display Order</Label>
                    <Input
                      id="displayOrder"
                      name="displayOrder"
                      type="number"
                      min="1"
                      defaultValue={editingContent?.displayOrder || 1}
                      required
                      data-testid="input-display-order"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Special Bengali Comedy Offer!"
                    defaultValue={editingContent?.title}
                    data-testid="input-title"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content / Description</Label>
                  <Textarea
                    id="content"
                    name="content"
                    placeholder="Get 50% off on comedy collaboration packages! Limited time offer for brand partnerships."
                    defaultValue={editingContent?.content}
                    rows={4}
                    data-testid="textarea-content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-gray-700">Banner Image Upload</Label>
                    
                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept="image/png,image/jpg,image/jpeg,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                        id="banner-upload"
                        data-testid="input-banner-upload"
                      />
                      <label htmlFor="banner-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center space-y-2">
                          <Upload className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Click to upload banner image
                          </span>
                          <span className="text-xs text-gray-400">
                            PNG, JPG, JPEG up to 5MB
                          </span>
                        </div>
                      </label>
                      
                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mt-4">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-h-32 mx-auto rounded border"
                          />
                          <p className="text-xs text-green-600 mt-2">✓ Image ready to upload</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Fallback URL Input */}
                    <div>
                      <Label htmlFor="imageUrl" className="text-xs text-gray-500">Or use Image URL</Label>
                      <Input
                        id="imageUrl"
                        name="imageUrl"
                        placeholder="https://example.com/banner.jpg"
                        defaultValue={editingContent?.imageUrl}
                        data-testid="input-image-url"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="linkUrl">Link URL (Optional)</Label>
                    <Input
                      id="linkUrl"
                      name="linkUrl"
                      placeholder="/collaboration or https://external-link.com"
                      defaultValue={editingContent?.linkUrl}
                      data-testid="input-link-url"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="buttonText">Button Text (Optional)</Label>
                    <Input
                      id="buttonText"
                      name="buttonText"
                      placeholder="Get Offer Now!, Contact Us, Learn More"
                      defaultValue={editingContent?.buttonText}
                      data-testid="input-button-text"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingContent?.isActive !== false}
                      data-testid="checkbox-is-active"
                    />
                    <Label htmlFor="isActive">Active (Show on homepage)</Label>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">💡 Pro Tips:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Offers:</strong> Perfect for limited-time promotions and special deals</li>
                    <li>• <strong>Greetings:</strong> Welcome visitors with Bengali cultural warmth</li>
                    <li>• <strong>Announcements:</strong> Share important news and updates</li>
                    <li>• <strong>Banners:</strong> Highlight key features or collaborations</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save-content">
                    {editingContent ? "Update" : "Create"} Content
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading homepage content...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {contentData.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Content Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start creating dynamic homepage content to engage your visitors!
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Content Section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contentData
                  .sort((a: HomepageContent, b: HomepageContent) => a.displayOrder - b.displayOrder)
                  .map((content: HomepageContent) => (
                    <Card key={content.id} className={`hover:shadow-md transition-shadow ${!content.isActive ? 'opacity-60' : ''}`}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {getSectionIcon(content.sectionType)}
                              <Badge className={getSectionColor(content.sectionType)}>
                                {content.sectionType.charAt(0).toUpperCase() + content.sectionType.slice(1)}
                              </Badge>
                              <Badge variant="outline">Order: {content.displayOrder}</Badge>
                              <Badge variant={content.isActive ? "default" : "secondary"}>
                                {content.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            {content.title && (
                              <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
                            )}
                            
                            {content.content && (
                              <p className="text-gray-700 mb-3">{content.content}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              {content.imageUrl && (
                                <div className="flex items-center gap-1">
                                  <ImageIcon className="h-4 w-4" />
                                  <span>Has Image</span>
                                </div>
                              )}
                              {content.linkUrl && (
                                <div className="flex items-center gap-1">
                                  <span>🔗</span>
                                  <span>Linked</span>
                                </div>
                              )}
                              {content.buttonText && (
                                <div className="flex items-center gap-1">
                                  <span>🔘</span>
                                  <span>"{content.buttonText}"</span>
                                </div>
                              )}
                            </div>

                            {(content.imageUrl || content.linkUrl) && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                {content.imageUrl && (
                                  <p className="text-xs text-gray-500 truncate">
                                    <strong>Image:</strong> {content.imageUrl}
                                  </p>
                                )}
                                {content.linkUrl && (
                                  <p className="text-xs text-gray-500 truncate">
                                    <strong>Link:</strong> {content.linkUrl}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingContent(content);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-content-${content.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteContentMutation.mutate(content.id)}
                              data-testid={`button-delete-content-${content.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* LIVE PREVIEW SECTION */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Live Preview
            </CardTitle>
            <CardDescription>
              See how your active content sections will appear on the homepage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contentData
                .filter((content: HomepageContent) => content.isActive)
                .sort((a: HomepageContent, b: HomepageContent) => a.displayOrder - b.displayOrder)
                .map((content: HomepageContent) => (
                  <div key={content.id} className="p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-yellow-50 to-red-50">
                    <div className="flex items-start gap-3">
                      {getSectionIcon(content.sectionType)}
                      <div className="flex-1">
                        {content.title && (
                          <h4 className="font-semibold text-lg mb-1">{content.title}</h4>
                        )}
                        {content.content && (
                          <p className="text-gray-700 mb-2">{content.content}</p>
                        )}
                        {content.buttonText && content.linkUrl && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            {content.buttonText}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {contentData.filter((content: HomepageContent) => content.isActive).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No active content to preview. Create and activate some content sections to see them here.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}