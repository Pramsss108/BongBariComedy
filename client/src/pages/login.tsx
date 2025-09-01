import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/seo-head";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { apiRequest, setCSRFToken, clearCSRFToken } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: (data: InsertUser) => apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    onSuccess: async (data: any) => {
      setSession(data.sessionId);
      
      // Store CSRF token if provided
      if (data.csrfToken) {
        setCSRFToken(data.csrfToken);
      }
      
      // Fetch a fresh CSRF token for the session
      try {
        const response = await apiRequest('/api/auth/csrf-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${data.sessionId}`
          }
        });
        if (response.csrfToken) {
          setCSRFToken(response.csrfToken);
        }
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
      
      toast({
        title: "Login Successful!",
        description: "Welcome to the admin panel."
      });
      // Force page refresh after login to update cursor
      setTimeout(() => {
        window.location.href = '/admin';
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertUser) => {
    loginMutation.mutate(data);
  };

  return (
    <>
      <SEOHead
        title="Admin Login - Bong Bari"
        description="Secure admin panel login for Bong Bari team members."
      />
      
      <main className="min-h-screen bg-brand-yellow flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <Card className="bg-white shadow-xl">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl text-brand-blue">
                  Admin Login
                </CardTitle>
                <p className="text-gray-600 bangla-text">
                  অ্যাডমিন লগইন
                </p>
              </CardHeader>
              
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                              <Input 
                                placeholder="Enter your username"
                                className="pl-10"
                                data-testid="input-username"
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="pl-10 pr-12"
                                data-testid="input-password"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={loginMutation.isPending}
                      className="w-full bg-brand-blue text-white hover:bg-blue-700 py-3 rounded-full font-semibold text-lg disabled:opacity-50"
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Need access? Contact the admin to create your account.
                  </p>
                  <button
                    onClick={() => setLocation('/')}
                    className="text-brand-blue hover:underline text-sm mt-2"
                  >
                    ← Back to Website
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

export default Login;