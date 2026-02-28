import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/seo-head";
import { Lock, Eye, EyeOff, LogIn, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { z } from 'zod';
import { FcGoogle } from "react-icons/fc";
import { motion, AnimatePresence } from "framer-motion";

import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "@/lib/firebase";
import { FirebaseError } from "firebase/app";

// We now use Email for real Firebase auth instead of just a 'username'
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const CustomerLogin = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // If already logged in, redirect home
  useEffect(() => {
    if (isAuthenticated) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || '/';
      setLocation(redirect);
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 1. Real Google OAuth via Firebase (Instantly opens secure popup)
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      if (!auth) throw new Error("Firebase is not initialized yet. Please add config.");
      await signInWithPopup(auth, googleProvider);
      toast({
        title: "Welcome to Bong Bari!",
        description: "🎉 You're now signed in securely with Google!",
      });
    } catch (error: any) {
      console.error('Firebase Google Auth error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          title: "Setup Required",
          description: "Firebase keys are missing. Please provide the config block to the AI.",
          variant: "destructive"
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Real Email/Password Auth via Firebase
  const onEmailSubmit = async (data: LoginFormData) => {
    setIsEmailLoading(true);
    try {
      if (!auth) throw new Error("Firebase is not initialized yet. Please add config.");
      if (isRegistering) {
        // Create new real user
        await createUserWithEmailAndPassword(auth, data.email, data.password);
        toast({
          title: "Account Created!",
          description: "Welcome to the Bong Bari community!",
        });
      } else {
        // Login existing real user
        await signInWithEmailAndPassword(auth, data.email, data.password);
        toast({
          title: "Welcome Back!",
          description: "You have securely logged in.",
        });
      }
    } catch (error: any) {
      console.error("Firebase Email Auth Error:", error);
      let errorMessage = "Authentication failed.";

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "This email is already registered. Please log in instead.";
            break;
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password is too weak. Please use at least 6 characters.";
            break;
          default:
            errorMessage = error.message;
        }
      } else if (error.message.includes("Firebase is not initialized")) {
        errorMessage = "Firebase is not configured yet. Please provide your Firebase Config.";
      }

      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Secure Login - Bong Bari"
        description="Join the Bong Bari comedy community! Get unlimited access to our AI Humanizer securely."
      />

      <main className="min-h-screen relative flex items-center justify-center py-16 overflow-hidden bg-slate-900">
        {/* Premium Background Effects */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-yellow/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-blue/30 blur-[150px]" />
        </div>

        {/* Animated Particles (CSS Based) */}
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

        <div className="container relative z-10 mx-auto px-4 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md mx-auto w-full"
          >
            <Card className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden rounded-3xl">
              <CardHeader className="text-center pb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/80 to-purple-600/80 -z-10" />
                <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 mix-blend-overlay -z-10" />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/30"
                >
                  <LogIn className="w-12 h-12 text-white drop-shadow-md" />
                </motion.div>
                <CardTitle className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  System Access
                </CardTitle>
                <p className="text-white/80 bangla-text text-lg mt-1 font-medium">
                  বং বাড়িতে স্বাগতম!
                </p>
              </CardHeader>

              <CardContent className="p-8 relative">
                <div className="space-y-6">

                  {/* Google Sign In Button - Ultra Premium */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-base font-bold py-7 bg-white/5 border border-white/20 hover:bg-white/10 hover:border-white/40 text-white flex items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] rounded-2xl group relative overflow-hidden"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading || isEmailLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    <div className="bg-white p-1 rounded-full"><FcGoogle className="w-6 h-6" /></div>
                    {isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-transparent text-white/50 bg-slate-900 rounded-full font-medium text-xs tracking-wider uppercase backdrop-blur-sm">System Override</span>
                    </div>
                  </div>

                  <div className="bg-black/20 p-6 rounded-2xl border border-white/10 shadow-inner">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-5 text-left">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-white/80">Email Designation</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Mail className="w-5 h-5 text-white/40 absolute left-4 top-3.5 transition-colors group-focus-within:text-brand-yellow" />
                                  <Input
                                    type="email"
                                    placeholder="agent@bongbari.com"
                                    className="pl-12 text-base h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/50 transition-all rounded-xl"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-white/80">Security Clearance</FormLabel>
                              <FormControl>
                                <div className="relative group">
                                  <Lock className="w-5 h-5 text-white/40 absolute left-4 top-3.5 transition-colors group-focus-within:text-brand-yellow" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-12 pr-12 text-base h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/50 transition-all rounded-xl"
                                    {...field}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-white/40 hover:text-white/80 focus:outline-none transition-colors"
                                  >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400" />
                            </FormItem>
                          )}
                        />

                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isRegistering ? 'register' : 'login'}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="pt-2"
                          >
                            <Button
                              type="submit"
                              disabled={isEmailLoading || isGoogleLoading}
                              className={`w-full text-white py-6 text-base font-bold shadow-lg transition-all rounded-xl relative overflow-hidden ${isRegistering
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                                  : "bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                                }`}
                            >
                              <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 ease-out" />
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {isEmailLoading && <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />}
                                {isEmailLoading ? "AUTHENTICATING..." : (isRegistering ? "ESTABLISH CONNECTION" : "INITIATE LOGIN")}
                              </span>
                            </Button>
                          </motion.div>
                        </AnimatePresence>
                      </form>
                    </Form>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-white/60 hover:text-white hover:underline text-sm font-medium transition-colors"
                    >
                      {isRegistering ? "Existing operative? Authenticate here." : "New recruit? Register clearance here."}
                    </button>
                  </div>

                  <p className="text-xs text-white/30 text-center mt-6 uppercase tracking-widest font-mono">
                    Protected by AES-256 Encryption
                  </p>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
};

export default CustomerLogin;