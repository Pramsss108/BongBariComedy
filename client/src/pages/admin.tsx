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
import { ProxyMissionControl } from "@/components/ProxyMissionControl";

const Admin = () => {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, logout, sessionId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateBlogOpen, setIsCreateBlogOpen] = useState(false);
  const [isMissionControlOpen, setIsMissionControlOpen] = useState(false);
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
                  <ProxyKitchenPortal onOpen={() => setIsMissionControlOpen(true)} />
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
      {isMissionControlOpen && (
        <ProxyMissionControl onClose={() => setIsMissionControlOpen(false)} />
      )}
    </>
  );
};

import { RefreshCw, Youtube, Instagram, Facebook, Shield, Wifi, WifiOff, Zap, Globe, Activity, Server, Eye, Clock, ChevronDown, ChevronUp, Copy, Check, Timer, Flag, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const getPlatformIcon = (platform: string, success: boolean) => {
    switch (platform) {
        case 'yt': return <Youtube className={`w-4 h-4 ${success ? 'text-red-500' : 'text-gray-400'}`} />;
        case 'fb': return <Facebook className={`w-4 h-4 ${success ? 'text-blue-500' : 'text-gray-400'}`} />;
        case 'ig': return <Instagram className={`w-4 h-4 ${success ? 'text-pink-500' : 'text-gray-400'}`} />;
        default: return null;
    }
};

// Phase 12: Country code → flag emoji (e.g. "US" → 🇺🇸)
const countryFlag = (code?: string) => {
    if (!code || code === 'XX' || code.length !== 2) return '🌐';
    const upper = code.toUpperCase();
    const cp1 = 0x1F1E6 + upper.charCodeAt(0) - 65;
    const cp2 = 0x1F1E6 + upper.charCodeAt(1) - 65;
    return String.fromCodePoint(cp1, cp2);
};

// Phase 11: Latency → color class
const latencyColor = (ms?: number) => {
    if (!ms) return 'text-gray-400';
    if (ms < 500) return 'text-emerald-500';
    if (ms < 2000) return 'text-yellow-500';
    return 'text-red-500';
};

// Phase 14: Tier → badge styles
const tierBadge = (tier?: string) => {
    switch (tier) {
        case 'platinum': return { bg: 'bg-cyan-100 text-cyan-800', label: '💎 Platinum' };
        case 'gold':     return { bg: 'bg-yellow-100 text-yellow-800', label: '🥇 Gold' };
        case 'silver':   return { bg: 'bg-gray-200 text-gray-700', label: '🥈 Silver' };
        default:         return { bg: 'bg-orange-100 text-orange-700', label: '🥉 Bronze' };
    }
};

function ProxyKitchenPortal({ onOpen }: { onOpen: () => void }) {
  const { data } = useQuery<any>({ queryKey: ["/api/admin/proxy-status"], refetchInterval: 3000 });
  const nodes = data?.activeNodes ?? 0;
  const isHunting = data?.isHunting ?? false;
  const tierCounts = data?.tierCounts || {};
  const platinum = tierCounts.platinum ?? 0;
  const gold = tierCounts.gold ?? 0;
  const bronze = tierCounts.bronze ?? 0;
  const queueSize: number = data?.queueSize ?? 0;
  const nextHuntAt = data?.nextHuntAt;
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const tick = () => {
      if (!nextHuntAt) { setCountdown(''); return; }
      const diff = new Date(nextHuntAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown('NOW'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [nextHuntAt]);

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', userSelect: 'none' }} onClick={onOpen}>
      {/* Background with animated gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1a2a 35%, #0a0f1a 60%, #0a0a0f 100%)',
        borderRadius: 20,
      }} />
      {/* Animated border glow */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        boxShadow: isHunting
          ? '0 0 0 1.5px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.15), inset 0 0 60px rgba(239,68,68,0.04)'
          : '0 0 0 1.5px rgba(76,215,246,0.35), 0 0 40px rgba(76,215,246,0.10), inset 0 0 60px rgba(76,215,246,0.03)',
        pointerEvents: 'none',
      }} />
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(76,215,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(76,215,246,0.8) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: '#4cd7f6', letterSpacing: '-0.02em', margin: 0 }}>
                Proxy Kitchen
              </h2>
              <span style={{
                fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em',
                padding: '3px 10px', borderRadius: 20,
                background: isHunting ? 'rgba(239,68,68,0.15)' : 'rgba(76,215,246,0.1)',
                color: isHunting ? '#ef4444' : '#4cd7f6',
                border: `1px solid ${isHunting ? 'rgba(239,68,68,0.4)' : 'rgba(76,215,246,0.3)'}`,
                textTransform: 'uppercase',
              }}>
                {isHunting ? '🔴 HUNTING' : '🟢 STANDBY'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter',sans-serif", margin: 0 }}>
              Red Team OSINT Engine · 30 sources · Rust Verifier · Hetzner VPS
            </p>
          </div>
        </div>

        {/* Center: Live Stats */}
        <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
          {[
            { label: 'LIVE NODES', value: nodes.toLocaleString(), color: '#4cd7f6' },
            { label: 'RAW QUEUE', value: queueSize.toLocaleString(), color: '#fbbf24', title: 'Unverified candidates' },
            { label: '💎 PLATINUM', value: platinum, color: '#a5f3fc' },
            { label: '🥇 GOLD', value: gold, color: '#fbbf24' },
            { label: '🥉 BRONZE', value: bronze, color: '#f97316' },
            { label: 'NEXT HUNT', value: countdown || '—', color: isHunting ? '#ef4444' : '#a3e635' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: "'Space Grotesk',sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Right: CTA Button */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(76,215,246,0.15) 0%, rgba(76,215,246,0.05) 100%)',
            border: '1px solid rgba(76,215,246,0.4)',
            boxShadow: '0 0 20px rgba(76,215,246,0.12)',
            transition: 'all 0.2s',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4cd7f6', boxShadow: '0 0 8px #4cd7f6', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: '#4cd7f6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Enter Mission Control
            </span>
            <span style={{ fontSize: 16, color: '#4cd7f6' }}>→</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [data?.huntDetails?.nextHuntAt]);

    const [revalCountdown, setRevalCountdown] = useState<string>('');
    useEffect(() => {
        const REVAL_INTERVAL = 30 * 60 * 1000;
        const tick = () => {
            const last = data?.lastRevalidatedAt;
            if (!last) { setRevalCountdown(''); return; }
            const nextReval = new Date(last).getTime() + REVAL_INTERVAL;
            const diff = nextReval - Date.now();
            if (diff <= 0) { setRevalCountdown('Imminent'); return; }
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setRevalCountdown(`${m}m ${s}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [data?.lastRevalidatedAt]);

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
    const tc      = data?.tierCounts || {};
    const filtered = filterPlatform === "all" ? proxies : proxies.filter((p: any) => p.platforms?.[filterPlatform]);

    return (
        <div className="space-y-5">

            {/* === COMPACT STAT STRIP === */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Server className="w-3 h-3 text-emerald-400" />
                        <span className="text-[8px] uppercase text-gray-500">Nodes</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-emerald-400">{data?.activeNodes || 0}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Youtube className="w-3 h-3 text-red-400" />
                        <span className="text-[8px] uppercase text-gray-500">YT</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-red-400">{pc.yt ?? 0}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Facebook className="w-3 h-3 text-blue-400" />
                        <span className="text-[8px] uppercase text-gray-500">FB</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-blue-400">{pc.fb ?? 0}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Instagram className="w-3 h-3 text-pink-400" />
                        <span className="text-[8px] uppercase text-gray-500">IG</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-pink-400">{pc.ig ?? 0}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-yellow-400" />
                        <span className="text-[8px] uppercase text-gray-500">All 3</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-yellow-400">{pc.allThree ?? 0}</p>
                </div>
                {/* Tier counts inline */}
                <div className="bg-cyan-950 rounded-lg p-2 text-white border border-cyan-800/40">
                    <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-cyan-300" />
                        <span className="text-[8px] uppercase text-cyan-500">💎Plat</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-cyan-300">{tc.platinum ?? 0}</p>
                </div>
                <div className="bg-yellow-950 rounded-lg p-2 text-white border border-yellow-800/40">
                    <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-yellow-300" />
                        <span className="text-[8px] uppercase text-yellow-500">🥇Gold</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-yellow-300">{tc.gold ?? 0}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-white border border-gray-600/40">
                    <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-gray-300" />
                        <span className="text-[8px] uppercase text-gray-400">🥈Slvr</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-gray-300">{tc.silver ?? 0}</p>
                </div>
                <div className="bg-orange-950 rounded-lg p-2 text-white border border-orange-800/40">
                    <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-orange-300" />
                        <span className="text-[8px] uppercase text-orange-500">🥉Brnz</span>
                    </div>
                    <p className="text-lg font-bold font-mono text-orange-300">{tc.bronze ?? 0}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-2 text-white border border-gray-700">
                    <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3 text-emerald-400" />
                        <span className="text-[8px] uppercase text-gray-500">Latency</span>
                    </div>
                    <p className={`text-lg font-bold font-mono ${latencyColor(data?.avgLatency)}`}>{data?.avgLatency ?? 0}<span className="text-[10px] text-gray-500">ms</span></p>
                </div>
            </div>

            {/* === COMPACT SCHEDULER + STATS === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs">
                    <span className="font-bold uppercase text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Schedule</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10px] ${data?.isHunting ? 'bg-red-100 text-red-700 animate-pulse' : data?.isRevalidating ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                        {data?.isHunting ? '🔴 Hunting' : data?.isRevalidating ? '🔵 Revalid.' : '🟢 Standby'}
                    </span>
                    {countdown && (
                        <span className={`font-mono font-bold ${data?.isHunting ? 'text-gray-400' : 'text-emerald-600'}`}>
                            Hunt in: {data?.isHunting ? <span className="text-gray-400 italic">running now</span> : countdown}
                        </span>
                    )}
                    {revalCountdown && !data?.isRevalidating && !data?.isHunting && (
                        <span className="font-mono text-blue-500">Reval in: {revalCountdown}</span>
                    )}
                    {data?.isRevalidating && <span className="font-mono text-blue-500 animate-pulse">Revalidating pool…</span>}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs">
                    <span className="font-bold uppercase text-gray-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Stats</span>
                    <span className="text-gray-700">Hunts: <b>{data?.huntDetails?.huntCount ?? 0}</b></span>
                    <span className="text-emerald-700">Verified: <b>{data?.huntDetails?.totalEverFound ?? 0}</b></span>
                    <span className="text-gray-500" title="OSINT + Telegram proxy sources checked each hunt">📡 30 sources/hunt</span>
                    {data?.huntDetails?.lastHuntAt && <span className="font-mono text-gray-500" title="Last hunt time">Last: {new Date(data.huntDetails.lastHuntAt).toLocaleTimeString()}</span>}
                    {data?.lastRevalidatedAt && <span className="font-mono text-blue-400" title="Last revalidation sweep">Reval: {new Date(data.lastRevalidatedAt).toLocaleTimeString()}</span>}
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
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="grid grid-cols-16 gap-0.5 px-2 py-1.5 bg-gray-900 text-gray-400 text-[9px] uppercase tracking-wider font-medium">
                        <div className="col-span-1">#</div>
                        <div className="col-span-1"><Eye className="w-2.5 h-2.5" /></div>
                        <div className="col-span-1"><Flag className="w-2.5 h-2.5" /></div>
                        <div className="col-span-4">Address</div>
                        <div className="col-span-1 text-center">ms</div>
                        <div className="col-span-2 text-center">Tier</div>
                        <div className="col-span-1 text-center">YT</div>
                        <div className="col-span-1 text-center">FB</div>
                        <div className="col-span-1 text-center">IG</div>
                        <div className="col-span-1 text-center">♥</div>
                        <div className="col-span-2 text-center"></div>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                        {filtered.map((proxy: any, i: number) => {
                            const proto          = proxy.url?.startsWith('socks') ? 'SOCKS5' : 'HTTP';
                            const isExpanded     = expandedProxy === i;
                            const platformCount  = [proxy.platforms?.yt, proxy.platforms?.fb, proxy.platforms?.ig].filter(Boolean).length;
                            const tb = tierBadge(proxy.platforms?.tier);
                            const fails = proxy.platforms?.failCount || 0;
                            return (
                                <div key={i}>
                                    <div className={`grid grid-cols-16 gap-0.5 px-2 py-1.5 items-center hover:bg-gray-50 transition-colors cursor-pointer text-xs ${isExpanded ? 'bg-gray-50' : ''}`}
                                        onClick={() => setExpandedProxy(isExpanded ? null : i)}>
                                        <div className="col-span-1 text-[10px] text-gray-400 font-mono">{i + 1}</div>
                                        <div className="col-span-1">
                                            <div className={`w-2 h-2 rounded-full ${platformCount >= 2 ? 'bg-emerald-500' : platformCount === 1 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        </div>
                                        <div className="col-span-1 text-sm" title={proxy.platforms?.country || '?'}>{countryFlag(proxy.platforms?.country)}</div>
                                        <div className="col-span-4 flex items-center gap-1 min-w-0">
                                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${proto === 'SOCKS5' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {proto === 'SOCKS5' ? 'S5' : 'H'}
                                            </span>
                                            <span className="font-mono text-[11px] text-gray-800 truncate">{proxy.url?.replace(/^(socks5|http):\/\//, '')}</span>
                                        </div>
                                        <div className={`col-span-1 text-center text-[10px] font-mono ${latencyColor(proxy.platforms?.latencyMs)}`}>
                                            {proxy.platforms?.latencyMs || '—'}
                                        </div>
                                        <div className="col-span-2 text-center">
                                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full ${tb.bg}`}>{tb.label}</span>
                                        </div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.yt ? <Wifi className="w-3 h-3 text-red-500 mx-auto" /> : <WifiOff className="w-3 h-3 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.fb ? <Wifi className="w-3 h-3 text-blue-500 mx-auto" /> : <WifiOff className="w-3 h-3 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-1 text-center">{proxy.platforms?.ig ? <Wifi className="w-3 h-3 text-pink-500 mx-auto" /> : <WifiOff className="w-3 h-3 text-gray-300 mx-auto" />}</div>
                                        <div className="col-span-1 text-center text-[10px]">
                                            {fails === 0 ? <span className="text-emerald-500">♥3</span> : fails === 1 ? <span className="text-yellow-500">♥2</span> : <span className="text-red-500">♥1</span>}
                                        </div>
                                        <div className="col-span-2 flex items-center justify-center gap-0.5">
                                            <Button size="sm" variant="ghost" className="h-5 px-1" onClick={(e) => { e.stopPropagation(); copyProxy(proxy.url, i); }}>
                                                {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                                            </Button>
                                            {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500 text-xs">Full URL</span>
                                                    <p className="font-mono text-xs break-all text-gray-700 select-all">{proxy.url}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Protocol</span>
                                                    <p className="font-semibold text-xs">{proto}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Country</span>
                                                    <p className="text-sm">{countryFlag(proxy.platforms?.country)} {proxy.platforms?.country || 'Unknown'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Latency</span>
                                                    <p className={`font-mono text-xs font-bold ${latencyColor(proxy.platforms?.latencyMs)}`}>{proxy.platforms?.latencyMs ? `${proxy.platforms.latencyMs}ms` : 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Tier / Health</span>
                                                    <p><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tb.bg}`}>{tb.label}</span> <span className="text-xs text-gray-500">· {3 - fails}/3 lives</span></p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-xs">Platforms</span>
                                                    <div className="flex gap-2 mt-1">
                                                        {getPlatformIcon('yt', proxy.platforms?.yt)}
                                                        {getPlatformIcon('fb', proxy.platforms?.fb)}
                                                        {getPlatformIcon('ig', proxy.platforms?.ig)}
                                                    </div>
                                                </div>
                                            </div>
                                            {proxy.platforms?.lastCheckedAt && (
                                                <p className="text-[10px] text-gray-400 mt-2">Last verified: {new Date(proxy.platforms.lastCheckedAt).toLocaleString()}</p>
                                            )}
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

