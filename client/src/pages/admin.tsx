import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import SEOHead from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Calendar, Building, User, LogOut, Plus, Users, FileText, Trash2, Home, Bot, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, insertBlogPostSchema, type CollaborationRequest, type InsertUser, type InsertBlogPost, type BlogPost } from "@shared/schema";
import { SimpleBannerManager } from "./SimpleBannerManager";
import AdminChatbot from "./AdminChatbot";
import { AdminLeadManager } from "./AdminLeadManager";
// import { MemeManager } from "./MemeManager";
import { PromotionsManager } from "./promotions/PromotionsManager";

const Admin = () => {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, logout, sessionId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateBlogOpen, setIsCreateBlogOpen] = useState(false);
  const [memeLanguage, setMemeLanguage] = useState<string>('auto');
  const [memeCount, setMemeCount] = useState<number>(5);

  const userForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const blogForm = useForm<InsertBlogPost>({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: {
      title: "",
      content: "",
      excerpt: "",
      slug: ""
    }
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, authLoading, setLocation]);


  const { data: blogPosts, isLoading: blogsLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog'],
    enabled: isAuthenticated
  });

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const createUserMutation = useMutation({
    mutationFn: (data: InsertUser) => apiRequest('/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      toast({
        title: "User Created!",
        description: "New admin user has been created successfully."
      });
      userForm.reset();
      setIsCreateUserOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create User",
        description: error.message || "Failed to create new user.",
        variant: "destructive"
      });
    }
  });

  const createBlogMutation = useMutation({
    mutationFn: (data: InsertBlogPost) => apiRequest('/api/blog', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      toast({
        title: "Blog Post Created!",
        description: "Your new blog post has been published successfully."
      });
      blogForm.reset();
      setIsCreateBlogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/blog'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Post",
        description: error.message || "Failed to create blog post.",
        variant: "destructive"
      });
    }
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/blog/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      toast({
        title: "Post Deleted!",
        description: "Blog post has been deleted successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/blog'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Post",
        description: error.message || "Failed to delete blog post.",
        variant: "destructive"
      });
    }
  });

  const onSubmitUser = (data: InsertUser) => {
    createUserMutation.mutate(data);
  };

  const onSubmitBlog = (data: InsertBlogPost) => {
    // Auto-generate slug from title if not provided
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    createBlogMutation.mutate(data);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-yellow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-brand-blue">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <SEOHead
        title="Admin - Collaboration Leads | Bong Bari"
        description="Admin panel to view collaboration requests and brand partnership inquiries for Bong Bari."
      />
      
      <main className="pb-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-center text-brand-blue mb-4" data-testid="page-title">
                  Admin Panel
                </h1>
                <h2 className="text-2xl font-bold text-center text-brand-blue bangla-text" data-testid="page-title-bengali">
                  অ্যাডমিন প্যানেল
                </h2>
                <p className="text-center text-gray-600 mt-2">
                  Welcome, {user?.username}!
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
                <Button
                  onClick={() => setLocation('/admin/moderation')}
                  variant="outline"
                  className="border-brand-blue text-brand-blue hover:bg-brand-blue/10"
                  aria-label="Go to moderation"
                >
                  Moderation
                </Button>
                <Button
                  onClick={() => setLocation('/community/feed')}
                  variant="outline"
                  className="border-brand-blue text-brand-blue hover:bg-brand-blue/10"
                  aria-label="Open community feed"
                >
                  Community Feed
                </Button>
                <Dialog open={isCreateBlogOpen} onOpenChange={setIsCreateBlogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-brand-yellow text-brand-blue hover:bg-brand-yellow hover:text-brand-blue"
                      data-testid="button-create-blog"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      New Blog Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Blog Post</DialogTitle>
                    </DialogHeader>
                    <Form {...blogForm}>
                      <form onSubmit={blogForm.handleSubmit(onSubmitBlog)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={blogForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter blog post title"
                                    data-testid="input-blog-title"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={blogForm.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slug (optional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Auto-generated from title"
                                    data-testid="input-blog-slug"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={blogForm.control}
                          name="excerpt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Excerpt</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Brief description of the blog post"
                                  rows={3}
                                  data-testid="input-blog-excerpt"
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={blogForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Write your blog post content here..."
                                  rows={12}
                                  data-testid="input-blog-content"
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateBlogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createBlogMutation.isPending}
                            className="bg-brand-blue text-white hover:bg-blue-700"
                            data-testid="button-submit-create-blog"
                          >
                            {createBlogMutation.isPending ? "Publishing..." : "Publish Post"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
                      data-testid="button-create-user"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Admin User</DialogTitle>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter username"
                                  data-testid="input-new-username"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Enter password"
                                  data-testid="input-new-password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateUserOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createUserMutation.isPending}
                            className="bg-brand-blue text-white hover:bg-blue-700"
                            data-testid="button-submit-create-user"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="requests">Collaboration Requests</TabsTrigger>
                <TabsTrigger value="blog">Blog Management</TabsTrigger>
                <TabsTrigger value="chatbot">
                  <Bot className="w-4 h-4 mr-2" />
                  Chatbot Training
                </TabsTrigger>
                <TabsTrigger value="promotions">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Promotions
                </TabsTrigger>
                <TabsTrigger value="proxies">
                  <Bot className="w-4 h-4 mr-2" />
                  Proxy Kitchen
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="requests" className="mt-8">
                <h3 className="text-2xl font-semibold text-brand-blue mb-6">
                  Collaboration Requests
                </h3>
                <AdminLeadManager sessionId={sessionId} />
              </TabsContent>
              
              <TabsContent value="blog" className="mt-8">
                <h3 className="text-2xl font-semibold text-brand-blue mb-6">
                  Blog Posts Management
                </h3>
                
                {blogsLoading ? (
                  <div className="grid gap-6">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-4 bg-gray-200 rounded mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                          <div className="h-20 bg-gray-200 rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : blogPosts && blogPosts.length > 0 ? (
                  <div className="grid gap-6" data-testid="blog-posts-list">
                    {blogPosts.map((post) => (
                      <Card key={post.id} className="bg-white shadow-lg">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl text-brand-blue mb-2">
                                {post.title}
                              </CardTitle>
                              <div className="flex items-center text-sm text-gray-600 mb-2">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(post.createdAt!).toLocaleDateString()}
                              </div>
                              <Badge variant="secondary" className="bg-brand-yellow text-brand-blue">
                                Published
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                                data-testid={`button-view-${post.id}`}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteBlogMutation.mutate(post.id)}
                                disabled={deleteBlogMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-${post.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700 text-sm mb-2">
                              <strong>Excerpt:</strong> {post.excerpt || 'No excerpt'}
                            </p>
                            <p className="text-gray-600 text-sm line-clamp-3">
                              {post.content.substring(0, 200)}...
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-xl font-semibold text-gray-600 mb-2">
                        No blog posts yet
                      </h4>
                      <p className="text-gray-500 mb-6">
                        Create your first blog post to get started.
                      </p>
                      <Button
                        onClick={() => setIsCreateBlogOpen(true)}
                        className="bg-brand-blue text-white hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Post
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="chatbot" className="mt-8">
                <AdminChatbot />
              </TabsContent>

              <TabsContent value="promotions" className="mt-8">
                <h3 className="text-2xl font-semibold text-brand-blue mb-6 flex items-center">
                  <Megaphone className="w-6 h-6 mr-2" />
                  Promotional Headlines
                </h3>
                <PromotionsManager />
              </TabsContent>

                <TabsContent value="proxies" className="mt-8 space-y-6">
                  <h3 className="text-2xl font-semibold text-brand-blue mb-6 flex items-center">
                    <Bot className="w-6 h-6 mr-2" />
                    Proxy Kitchen
                  </h3>
                  <DatabaseProxyUI />
                </TabsContent>
            </Tabs>

            <div className="text-center mt-12">
              <p className="text-sm text-gray-500">
                Collaboration requests refresh automatically every 30 seconds
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

import { RefreshCw, Youtube, Instagram, Facebook, Shield, Wifi, WifiOff, Zap, Globe, Activity, Server, Eye, Clock, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const getPlatformIcon = (platform: string, success: boolean) => {
    switch (platform) {
        case 'yt': return <Youtube className={`w-4 h-4 ${success ? 'text-red-500' : 'text-gray-400'}`} />;
        case 'fb': return <Facebook className={`w-4 h-4 ${success ? 'text-blue-500' : 'text-gray-400'}`} />;
        case 'ig': return <Instagram className={`w-4 h-4 ${success ? 'text-pink-500' : 'text-gray-400'}`} />;
        default: return null;
    }
};

function DatabaseProxyUI() {
    const { data, isLoading } = useQuery<any>({ 
        queryKey: ["/api/admin/proxy-status"],
        refetchInterval: 3000
    });
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [expandedProxy, setExpandedProxy] = useState<number | null>(null);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [filterPlatform, setFilterPlatform] = useState<string>("all");

    // Countdown to next scheduled hunt
    const [countdown, setCountdown] = useState<string>('');
    useEffect(() => {
        const tick = () => {
            const next = data?.huntDetails?.nextHuntAt;
            if (!next) { setCountdown(''); return; }
            const diff = new Date(next).getTime() - Date.now();
            if (diff <= 0) { setCountdown('Imminent'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h}h ${m}m ${s}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [data?.huntDetails?.nextHuntAt]);

    const triggerHunt = async () => {
        try {
            await apiRequest('/api/admin/proxy-hunt', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
            toast({ title: "🔥 Hunt Initiated", description: "OSINT scrape running. Results appear live below." });
        } catch (e: any) {
            toast({ title: "Hunt Error", description: e.message, variant: "destructive" });
        }
        queryClient.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] });
    };

    const copyProxy = (url: string, idx: number) => {
        navigator.clipboard.writeText(url);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
    };

    const proxies = data?.proxies || [];
    const pc      = data?.platformCounts || {};
    const filtered = filterPlatform === "all" ? proxies : proxies.filter((p: any) => p.platforms?.[filterPlatform]);

    return (
        <div className="space-y-5">

            {/* === ROW 1: STAT CARDS === */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border border-gray-700 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Active Nodes</span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-emerald-400">{data?.activeNodes || 0}</p>
                    <p className="text-[10px] text-gray-500 mt-1">File-cached · survives restart</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border border-gray-700 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Youtube className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">YouTube</span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-red-400">{pc.yt ?? 0}</p>
                    <p className="text-[10px] text-gray-500 mt-1">generate_204 verified</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border border-gray-700 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Facebook className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Facebook</span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-blue-400">{pc.fb ?? 0}</p>
                    <p className="text-[10px] text-gray-500 mt-1">favicon verified</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border border-gray-700 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Instagram className="w-4 h-4 text-pink-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">Instagram</span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-pink-400">{pc.ig ?? 0}</p>
                    <p className="text-[10px] text-gray-500 mt-1">favicon verified</p>
                </div>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white border border-gray-700 shadow-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-yellow-400" />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">All 3 Platforms</span>
                    </div>
                    <p className="text-3xl font-bold font-mono text-yellow-400">{pc.allThree ?? 0}</p>
                    <p className="text-[10px] text-gray-500 mt-1">YT + FB + IG pass</p>
                </div>
            </div>

            {/* === ROW 2: SCHEDULER STATUS + LIFETIME STATS === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Scheduler status */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Continuous Mining Schedule
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Status</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${data?.isHunting ? 'bg-red-100 text-red-700 animate-pulse' : data?.isRevalidating ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {data?.isHunting ? '🔴 Hunting' : data?.isRevalidating ? '🔵 Re-validating' : '🟢 Standby'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Hunt cycle</span>
                        <span className="text-xs font-mono text-gray-600">every 3 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Revalidation</span>
                        <span className="text-xs font-mono text-gray-600">daily at 3:00 AM</span>
                    </div>
                    {countdown && !data?.isHunting && (
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                            <span className="text-sm text-gray-700">Next hunt in</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">{countdown}</span>
                        </div>
                    )}
                </div>
                {/* Lifetime stats */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Lifetime Session Stats
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Hunts this session</span>
                        <span className="text-xs font-mono font-bold text-gray-800">{data?.huntDetails?.huntCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Total ever verified</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">{data?.huntDetails?.totalEverFound ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Sources</span>
                        <span className="text-xs font-mono text-gray-600">12 OSINT feeds</span>
                    </div>
                    {data?.huntDetails?.lastHuntAt && (
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1">
                            <span className="text-sm text-gray-700">Last hunt</span>
                            <span className="text-xs font-mono text-gray-600">{new Date(data.huntDetails.lastHuntAt).toLocaleTimeString()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* === CONTROLS BAR === */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="flex gap-2">
                    <Button onClick={triggerHunt} disabled={data?.isHunting} size="sm"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md font-semibold">
                        <Zap className={`h-4 w-4 mr-1 ${data?.isHunting ? 'animate-pulse' : ''}`} /> 
                        {data?.isHunting ? 'Hunting...' : 'Force OSINT Hunt'}
                    </Button>
                    <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/proxy-status"] })} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                </div>
                <div className="flex gap-1">
                    {[
                        { key: "all",     label: `All (${proxies.length})`,  icon: Globe     },
                        { key: "yt",      label: `YT (${pc.yt ?? 0})`,       icon: Youtube   },
                        { key: "fb",      label: `FB (${pc.fb ?? 0})`,       icon: Facebook  },
                        { key: "ig",      label: `IG (${pc.ig ?? 0})`,       icon: Instagram },
                    ].map(f => (
                        <Button key={f.key} onClick={() => setFilterPlatform(f.key)} size="sm"
                            variant={filterPlatform === f.key ? "default" : "ghost"} 
                            className={`text-xs px-2 h-8 ${filterPlatform === f.key ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}`}>
                            <f.icon className="w-3 h-3 mr-1" /> {f.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* === LIVE HUNT TELEMETRY === */}
            {(data?.isHunting || data?.isRevalidating) && data?.huntDetails && (
                <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl p-5 border border-emerald-500/30 shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <span className="text-emerald-400 font-bold text-sm uppercase tracking-wider">
                            {data?.isRevalidating ? 'Re-validation Sweep' : `Live Hunt #${data.huntDetails.huntCount} Telemetry`}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2 font-mono">
                        <span className="text-gray-300">{data.huntDetails.status}</span>
                        <span className="text-gray-400">{data.huntDetails.progress} / {data.huntDetails.total} scanned</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500 ease-out"
                            style={{ width: `${data.huntDetails.total > 0 ? (data.huntDetails.progress / data.huntDetails.total) * 100 : 0}%` }} />
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div>
                            <p className="text-xl font-bold font-mono text-cyan-400">{data.huntDetails.mined?.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Mined</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold font-mono text-orange-400">{data.huntDetails.skipped ?? 0}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Deduped</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold font-mono text-yellow-400">{data.huntDetails.progress}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Scanned</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold font-mono text-emerald-400">{data.huntDetails.found}</p>
                            <p className="text-[10px] text-gray-500 uppercase">This Hunt</p>
                        </div>
                    </div>
                </div>
            )}

            {/* === IDLE LAST-HUNT BANNER === */}
            {!data?.isHunting && !data?.isRevalidating && data?.huntDetails?.found > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                    <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-emerald-800 text-sm font-medium">
                        Hunt #{data.huntDetails.huntCount} complete — +{data.huntDetails.found} new proxies verified · {data.huntDetails.skipped ?? 0} dupes skipped · {data.huntDetails.mined?.toLocaleString()} total mined · <span className="font-bold">{data?.activeNodes} live in pool</span>
                    </span>
                </div>
            )}

            {/* === PROXY TABLE === */}
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                </div>
            ) : filtered.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-900 text-gray-400 text-xs uppercase tracking-wider font-medium">
                        <div className="col-span-1">#</div>
                        <div className="col-span-1"><Eye className="w-3 h-3" /></div>
                        <div className="col-span-5">Proxy Address</div>
                        <div className="col-span-1 text-center">YT</div>
                        <div className="col-span-1 text-center">FB</div>
                        <div className="col-span-1 text-center">IG</div>
                        <div className="col-span-2 text-center">Actions</div>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {filtered.map((proxy: any, i: number) => {
                            const proto          = proxy.url?.startsWith('socks') ? 'SOCKS5' : 'HTTP';
                            const isExpanded     = expandedProxy === i;
                            const platformCount  = [proxy.platforms?.yt, proxy.platforms?.fb, proxy.platforms?.ig].filter(Boolean).length;
                            return (
                                <div key={i}>
                                    <div className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                                        onClick={() => setExpandedProxy(isExpanded ? null : i)}>
                                        <div className="col-span-1 text-xs text-gray-400 font-mono">{i + 1}</div>
                                        <div className="col-span-1">
                                            <div className={`w-2.5 h-2.5 rounded-full ${platformCount >= 2 ? 'bg-emerald-500' : platformCount === 1 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        </div>
                                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${proto === 'SOCKS5' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {proto}
                                            </span>
                                            <span className="font-mono text-sm text-gray-800 truncate">{proxy.url?.replace(/^(socks5|http):\/\//, '')}</span>
                                        </div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.yt ? <Wifi className="w-4 h-4 text-red-500 mx-auto" /> : <WifiOff className="w-4 h-4 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.fb ? <Wifi className="w-4 h-4 text-blue-500 mx-auto" /> : <WifiOff className="w-4 h-4 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.ig ? <Wifi className="w-4 h-4 text-pink-500 mx-auto" /> : <WifiOff className="w-4 h-4 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-2 flex items-center justify-center gap-1">
                                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); copyProxy(proxy.url, i); }}>
                                                {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                            </Button>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500 text-xs">Full URL</span>
                                                    <p className="font-mono text-xs break-all text-gray-700 select-all">{proxy.url}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Protocol</span>
                                                    <p className="font-semibold text-xs">{proto}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Platforms</span>
                                                    <div className="flex gap-2 mt-1">
                                                        {getPlatformIcon('yt', proxy.platforms?.yt)}
                                                        {getPlatformIcon('fb', proxy.platforms?.fb)}
                                                        {getPlatformIcon('ig', proxy.platforms?.ig)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Status</span>
                                                    <p className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" /> Verified Online
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
                        <span>{filtered.length} of {proxies.length} proxies shown · refreshes every 3s</span>
                        <span className="font-mono">Storage: File Cache (survives restart)</span>
                    </div>
                </div>
            ) : (
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
                    <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No Active Proxies</h4>
                    <p className="text-gray-400 text-sm mb-5">Auto-hunt runs every 3h. Click below to force one now.</p>
                    <Button onClick={triggerHunt} disabled={data?.isHunting} size="sm"
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md">
                        <Zap className="h-4 w-4 mr-1" /> Start Hunt Now
                    </Button>
                </div>
            )}
        </div>
    );
}


export default Admin;

