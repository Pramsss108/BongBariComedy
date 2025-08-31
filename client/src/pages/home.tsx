import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/magnetic-button";
import { FuturisticButton } from "@/components/futuristic-button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import YouTubeShort from "@/components/youtube-short";
import SEOHead from "@/components/seo-head";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { Youtube, Instagram, Phone, Mail, Twitter, Send } from "lucide-react";
import { insertCollaborationRequestSchema, type InsertCollaborationRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

const Home = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: youtubeVideos, isLoading } = useQuery<YouTubeVideo[]>({
    queryKey: ['/api/youtube/latest'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const form = useForm<InsertCollaborationRequest>({
    resolver: zodResolver(insertCollaborationRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      message: ""
    }
  });

  const collaborationMutation = useMutation({
    mutationFn: (data: InsertCollaborationRequest) => apiRequest('/api/collaboration-requests', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    }),
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your collaboration request has been submitted. We'll get back to you soon!"
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit your request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertCollaborationRequest) => {
    collaborationMutation.mutate(data);
  };

  // Fallback data in case API fails
  const fallbackVideoData = [
    {
      videoId: "pdjQpcVqxMU",
      thumbnail: "https://img.youtube.com/vi/pdjQpcVqxMU/hqdefault.jpg",
      title: "Bong Bari Comedy Short 1",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "8gdxQ_dgFv8", 
      thumbnail: "https://img.youtube.com/vi/8gdxQ_dgFv8/hqdefault.jpg",
      title: "Bong Bari Comedy Short 2",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "rGOvg5PJtXA",
      thumbnail: "https://img.youtube.com/vi/rGOvg5PJtXA/hqdefault.jpg",
      title: "Bong Bari Comedy Short 3",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "Gyo_QpZQuPU",
      thumbnail: "https://img.youtube.com/vi/Gyo_QpZQuPU/hqdefault.jpg",
      title: "Bong Bari Comedy Short 4",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "GJfHWL0ro_A",
      thumbnail: "https://img.youtube.com/vi/GJfHWL0ro_A/hqdefault.jpg",
      title: "Bong Bari Comedy Short 5",
      publishedAt: "2024-01-01T00:00:00Z"
    },
    {
      videoId: "NRdGq7Ncqw0",
      thumbnail: "https://img.youtube.com/vi/NRdGq7Ncqw0/hqdefault.jpg",
      title: "Bong Bari Comedy Short 6",
      publishedAt: "2024-01-01T00:00:00Z"
    }
  ];

  const videoData = youtubeVideos || fallbackVideoData;

  return (
    <>
      <SEOHead
        title="Bong Bari - Bengali Comedy Shorts | বং বাড়ি"
        description="Bong Bari (বং বাড়ি) - Hilarious Bengali mother-son comedy shorts from Kolkata. Watch funny family moments, relatable content, and Bengali humor."
        ogTitle="Bong Bari - Bengali Comedy Shorts"
        ogDescription="Hilarious Bengali mother-son comedy shorts from Kolkata"
      />
      <ParallaxContainer>
        
        <main className="py-4 sm:py-6 lg:py-8 relative z-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero Banner */}
            <ParallaxSection speed={0.3} delay={0.1}>
              <section className="text-center mb-6 sm:mb-8 lg:mb-12" data-testid="hero-section">
            <motion.div 
              className="w-full h-72 sm:h-80 md:h-96 lg:h-[28rem] xl:h-[32rem] bg-gradient-to-r from-brand-yellow via-brand-red to-brand-blue rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 flex items-center justify-center relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.25, 0.25, 0.25, 1] }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-transparent via-white to-transparent"></div>
              </div>
              
              {/* Main content */}
              <motion.div 
                className="text-center z-10 mt-8"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <motion.div 
                  className="mb-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                >
                  <span className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl xl:text-[10rem] font-bold text-white bangla-text drop-shadow-lg leading-none">
                    বং বাড়ি
                  </span>
                </motion.div>
                <motion.div 
                  className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-semibold text-white drop-shadow-md mt-4 sm:mt-6 px-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                >
                  Bengali Comedy That Hits Home!
                </motion.div>
                <motion.div 
                  className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/90 mt-2 sm:mt-4 bangla-text px-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1.1 }}
                >
                  কলকাতার ঘরোয়া কমেডি
                </motion.div>
              </motion.div>
              
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-16 h-16 bg-white/20 rounded-full"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 bg-white/20 rounded-full"></div>
              <div className="absolute top-1/2 right-8 w-8 h-8 bg-white/20 rounded-full"></div>
            </motion.div>
            
            
            {/* Intro Text */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3 }}
            >
              <motion.div
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
              <Card className="max-w-4xl mx-auto shadow-md transition-all duration-300 hover:shadow-2xl">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6 leading-relaxed" data-testid="intro-english">
                  Welcome to <strong>Bong Bari</strong> - where every Bengali family finds their story! 
                  Our hilarious mother-son comedy shorts capture the essence of Kolkata homes with relatable, 
                  heartwarming humor that'll make you laugh until your stomach hurts.
                </p>
                
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 bangla-text leading-relaxed" data-testid="intro-bengali">
                  <strong>বং বাড়িতে</strong> স্বাগতম! আমাদের মা-ছেলের কমেডি শর্টস দেখে হাসতে হাসতে পেট ব্যথা হয়ে যাবে। 
                  কলকাতার ঘরোয়া পরিবেশের সাথে মিলিয়ে এমন সব মজার গল্প যা আপনার নিজের বাড়ির মতোই লাগবে।
                </p>
              </CardContent>
            </Card>
            </motion.div>
            </motion.div>
              </section>
            </ParallaxSection>
          
          {/* YouTube Shorts Grid */}
          <ParallaxSection speed={0.4} delay={0.2}>
            <section className="mb-6 sm:mb-8 lg:mb-12" data-testid="videos-section">
            <motion.h3 
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-brand-blue mb-4 sm:mb-6 hover-wobble cursor-pointer transition-all duration-300" 
              data-testid="videos-title-english"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Latest Comedy Shorts
            </motion.h3>
            <motion.h4 
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-center text-gray-800 mb-6 sm:mb-8 bangla-text hover-bounce cursor-pointer transition-all duration-300" 
              data-testid="videos-title-bengali"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              সর্বশেষ কমেডি শর্টস
            </motion.h4>
            
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-4 lg:gap-6 px-2" data-testid="videos-grid-loading">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="video-container mx-auto">
                    <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-4 lg:gap-6 px-2" data-testid="videos-grid">
                {videoData.map((video, index) => (
                  <motion.div
                    key={video.videoId}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.1,
                      ease: [0.25, 0.25, 0.25, 1]
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <YouTubeShort
                      videoId={video.videoId}
                      thumbnail={video.thumbnail}
                      title={video.title}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
            </section>
          </ParallaxSection>
          
          {/* Collaboration Form */}
          <ParallaxSection speed={0.2} delay={0.4}>
            <section className="mb-6 sm:mb-8 py-4 sm:py-6 lg:py-8" data-testid="collaboration-section">
            <div className="max-w-4xl mx-auto">
              {/* Work with Us Header with Yellow Background */}
              <motion.div 
                className="bg-brand-yellow rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 mb-0 text-center shadow-lg transition-all duration-400"
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                <h3 className="font-bold text-brand-blue mb-2 sm:mb-4 hover-pulse cursor-pointer transition-all duration-300" data-testid="collaboration-title-english" style={{fontSize: 'clamp(2.5rem, 8vw, 8rem)'}}>
                  Work with Us
                </h3>
                <h4 className="font-bold text-gray-800 bangla-text hover-wobble cursor-pointer transition-all duration-300" data-testid="collaboration-title-bengali" style={{fontSize: 'clamp(2rem, 6vw, 6rem)'}}>
                  আমাদের সাথে কাজ করুন
                </h4>
              </motion.div>
              
              <motion.div
                whileHover={{ 
                  scale: 1.01,
                  transition: { duration: 0.2 }
                }}
              >
              <Card className="bg-white shadow-lg transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <p className="text-center text-gray-700 mb-3 sm:mb-4 text-base sm:text-lg">
                    Ready to collaborate? Let's create some amazing Bengali comedy content together!
                  </p>
                  <p className="text-center text-gray-700 mb-4 sm:mb-6 bangla-text text-base sm:text-lg">
                    কোলাবোরেট করতে প্রস্তুত? চলুন একসাথে দুর্দান্ত বাংলা কমেডি কন্টেন্ট তৈরি করি!
                  </p>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6" data-testid="collaboration-form">
                      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name / নাম</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your Name"
                                  data-testid="input-name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your@email.com"
                                  data-testid="input-email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company / Brand</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Your Company or Brand"
                                data-testid="input-company"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message / বার্তা</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={4}
                                className="min-h-[120px] resize-none text-base"
                                placeholder="Tell us about your collaboration idea..."
                                data-testid="textarea-message"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <MagneticButton 
                        disabled={collaborationMutation.isPending}
                        className="w-full bg-brand-red text-white hover:bg-red-600 py-4 sm:py-3 rounded-full font-semibold text-base sm:text-lg hover-lift disabled:opacity-50 min-h-[52px] touch-manipulation transition-all duration-400 hover:scale-110 hover:-translate-y-3 hover:shadow-2xl"
                        data-testid="button-submit-collaboration"
                        strength={0.5}
                        onClick={() => form.handleSubmit(onSubmit)()}
                      >
                        <Send className="mr-2 h-5 w-5" />
                        {collaborationMutation.isPending ? "Sending..." : "Send Message"}
                      </MagneticButton>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              </motion.div>
            </div>
          </section>
          </ParallaxSection>
          
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-brand-blue text-white py-4 sm:py-6 mt-0" data-testid="footer">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            {/* Enhanced Social Buttons */}
            <div className="flex justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <button 
                className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-4 sm:px-5 py-3 sm:py-2 rounded-full text-sm sm:text-base flex items-center gap-2 transition-all duration-400 hover:scale-150 hover:-translate-y-4 hover:rotate-6 hover:shadow-2xl active:scale-95 min-h-[44px] touch-manipulation shadow-md"
                onClick={() => window.open('https://youtube.com/@bongbari', '_blank')}
                data-testid="button-youtube-footer"
              >
                <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">YouTube</span>
              </button>
              <button 
                className="bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white px-4 sm:px-5 py-3 sm:py-2 rounded-full text-sm sm:text-base flex items-center gap-2 transition-all duration-400 hover:scale-150 hover:-translate-y-4 hover:-rotate-6 hover:shadow-2xl active:scale-95 min-h-[44px] touch-manipulation shadow-md"
                onClick={() => window.open('https://instagram.com/thebongbari', '_blank')}
                data-testid="button-instagram-footer"
              >
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline">Instagram</span>
              </button>
            </div>
            
            <p className="text-base sm:text-lg font-medium" data-testid="footer-text">
              © Bong Bari 2025 Kolkata
            </p>
            <p className="text-sm sm:text-base opacity-80 mt-1 sm:mt-2 bangla-text" data-testid="footer-text-bengali">
              © বং বাড়ি ২০২৫ কলকাতা
            </p>
          </div>
        </footer>
      </ParallaxContainer>
    </>
  );
};

export default Home;
