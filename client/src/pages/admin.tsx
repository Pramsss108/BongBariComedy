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
import { Mail, Calendar, Building, User, LogOut, Plus, Users, FileText, Trash2, Home, Bot } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSchema, insertBlogPostSchema, type CollaborationRequest, type InsertUser, type InsertBlogPost, type BlogPost } from "@shared/schema";
import { SimpleBannerManager } from "./SimpleBannerManager";
import { AdminChatbot } from "./AdminChatbot";

const Admin = () => {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, logout, sessionId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateBlogOpen, setIsCreateBlogOpen] = useState(false);

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

  const { data: collaborationRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<CollaborationRequest[]>({
    queryKey: ['/api/collaboration-requests'],
    enabled: isAuthenticated,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

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
      
      <main className="py-16 bg-gray-50 min-h-screen">
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
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-brand-red text-brand-red hover:bg-brand-red hover:text-white"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="requests">Collaboration Requests</TabsTrigger>
                <TabsTrigger value="blog">Blog Management</TabsTrigger>
                <TabsTrigger value="chatbot">
                  <Bot className="w-4 h-4 mr-2" />
                  Chatbot Training
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="requests" className="mt-8">
                <h3 className="text-2xl font-semibold text-brand-blue mb-6">
                  Collaboration Requests
                </h3>
              
              {requestsLoading ? (
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
              ) : collaborationRequests && collaborationRequests.length > 0 ? (
                <div className="grid gap-6" data-testid="collaboration-requests-list">
                  {collaborationRequests.map((request) => (
                    <Card key={request.id} className="bg-white shadow-lg hover-lift">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl text-brand-blue">
                            {request.name}
                          </CardTitle>
                          <Badge variant="secondary" className="bg-brand-yellow text-brand-blue">
                            New Lead
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            <a href={`mailto:${request.email}`} className="hover:text-brand-blue">
                              {request.email}
                            </a>
                          </div>
                          {request.company && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {request.company}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Message:</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {request.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-xl font-semibold text-gray-600 mb-2">
                      No collaboration requests yet
                    </h4>
                    <p className="text-gray-500">
                      When people submit the collaboration form, their requests will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
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
                <h3 className="text-2xl font-semibold text-brand-blue mb-6 flex items-center">
                  <Bot className="w-6 h-6 mr-2" />
                  Bong Bot Training Center
                </h3>
                <p className="text-gray-600 mb-6">
                  Train your Gemini-powered chatbot with custom responses, keywords, and conversation flows.
                </p>
                <AdminChatbot />
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

export default Admin;