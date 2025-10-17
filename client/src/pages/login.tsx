import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/seo-head";
import { Lock, User, Eye, EyeOff, LogIn } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest, setCSRFToken, clearCSRFToken, buildApiUrl } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const CustomerLogin = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('sessionId');
    const csrfToken = urlParams.get('csrfToken');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');
    const message = urlParams.get('message');

    if (error) {
      toast({
        title: "Authentication Error",
        description: message || "Google authentication failed",
        variant: "destructive"
      });
      // Clean up URL
      window.history.replaceState({}, document.title, '/login');
      return;
    }

    if (success && sessionId && csrfToken && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store session and user data
        setSession(sessionId);
        setCSRFToken(csrfToken);
        localStorage.setItem('google_user', JSON.stringify(user));
        
        toast({
          title: `Welcome ${user.name}!`,
          description: "🎉 You're now signed in with Google! Enjoy unlimited AI chatbot access and exclusive newsletter content.",
        });

        // Clean up URL and redirect
        window.history.replaceState({}, document.title, '/login');
        setTimeout(() => {
          setLocation('/');
        }, 2000);
        
      } catch (error) {
        console.error('Failed to parse user data:', error);
        toast({
          title: "Authentication Error",
          description: "Failed to complete Google sign-in",
          variant: "destructive"
        });
      }
    }
  }, [setSession, toast, setLocation]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Real Google OAuth Authentication
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    
    toast({
      title: "Redirecting to Google",
      description: "Please wait while we redirect you to Google for authentication...",
    });

    try {
      // Redirect to our backend Google OAuth endpoint
      // Use shared API base resolution to ensure localhost in dev and Render in prod
      const googleAuthUrl = buildApiUrl('/api/auth/google');
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      toast({
        title: "Authentication Error",
        description: "Failed to initiate Google sign-in. Please try again.",
        variant: "destructive"
      });
      setIsGoogleLoading(false);
    }
  };

  // Admin Login Mutation (for admin users)
  const adminLoginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    },
    onSuccess: (data) => {
      // Store admin session
      localStorage.setItem('admin_session', data.sessionId);
      
      // Set CSRF token for future requests
      if (data.csrfToken) {
        setCSRFToken(data.csrfToken);
      }
      
      setSession(data.sessionId);
      toast({
        title: "Success!",
        description: "Admin login successful",
      });
      setLocation('/admin');
    },
    onError: (error) => {
      clearCSRFToken();
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onAdminSubmit = (data: LoginFormData) => {
    adminLoginMutation.mutate(data);
  };

  return (
    <>
      <SEOHead
        title="Welcome to Bong Bari - Join Our Community!"
        description="Join the Bong Bari comedy community! Get unlimited access to our AI chatbot, exclusive content, and connect with fellow comedy lovers."
      />
      
      <main className="min-h-screen bg-gradient-to-br from-brand-yellow via-yellow-100 to-white flex items-center justify-center pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="bg-white shadow-2xl border-0 overflow-hidden">
              {/* Customer Login Section */}
              <CardHeader className="text-center pb-6 bg-gradient-to-r from-brand-blue to-blue-600 text-white">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                  <LogIn className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">
                  Welcome to Bong Bari!
                </CardTitle>
                <p className="text-white/90 bangla-text text-lg">
                  বং বাড়িতে স্বাগতম!
                </p>
              </CardHeader>
              
              <CardContent className="p-8">
                {/* Main Google Login */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Join Our Comedy Community
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Get unlimited access to our AI chatbot, exclusive content, and connect with fellow comedy enthusiasts!
                    </p>
                  </div>

                  <Button 
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    {isGoogleLoading ? (
                      <>
                        <div className="w-6 h-6 mr-3 animate-spin">
                          <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                        </div>
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium mb-1">
                        🔒 Secure Google Sign-In
                      </p>
                      <p className="text-xs text-blue-600">
                        Your Google account info is never stored on our servers
                      </p>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                      ✨ Unlimited AI chat • 🎭 Exclusive content • 🤝 Comedy community
                    </p>
                    
                    <p className="text-xs text-gray-400 mb-4">
                      By signing in, you agree to our <a href="/privacy" className="text-brand-blue underline cursor-pointer hover:text-blue-600">Privacy Policy</a> and <a href="/terms" className="text-brand-blue underline cursor-pointer hover:text-blue-600">Terms of Service</a>
                    </p>
                    
                    <button
                      onClick={() => setLocation('/')}
                      className="text-brand-blue hover:underline text-sm font-medium"
                    >
                      ← Back to Website
                    </button>
                  </div>
                </div>

                {/* Admin Access Toggle */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowAdminLogin(!showAdminLogin)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    Team Member Access
                  </button>
                </div>

                {/* Hidden Admin Login Section */}
                {showAdminLogin && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="text-center mb-4">
                      <Lock className="w-5 h-5 text-gray-500 mx-auto mb-2" />
                      <h4 className="text-sm font-medium text-gray-700">Admin Login</h4>
                      <p className="text-xs text-gray-500">For Bong Bari team members only</p>
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onAdminSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                  <Input 
                                    placeholder="Enter username"
                                    className="pl-9 text-sm h-9"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                  <Input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password"
                                    className="pl-9 pr-9 text-sm h-9"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                  >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          disabled={adminLoginMutation.isPending}
                          className="w-full bg-gray-700 text-white hover:bg-gray-800 py-2 text-sm"
                          size="sm"
                        >
                          {adminLoginMutation.isPending ? "Signing in..." : "Admin Sign In"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

export default CustomerLogin;