import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import YouTubeShort from "@/components/youtube-short";
import SEOHead from "@/components/seo-head";
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
      <main className="py-16">
        <div className="container mx-auto px-4">
          {/* Hero Banner */}
          <section className="text-center mb-16" data-testid="hero-section">
            <div className="w-full h-64 md:h-80 bg-gradient-to-r from-brand-yellow via-brand-red to-brand-blue rounded-2xl shadow-lg mb-8 flex items-center justify-center relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full bg-gradient-to-br from-transparent via-white to-transparent"></div>
              </div>
              
              {/* Main content */}
              <div className="text-center z-10">
                <div className="mb-4">
                  <span className="text-6xl md:text-8xl font-bold text-white bangla-text drop-shadow-lg">
                    বং বাড়ি
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-semibold text-white drop-shadow-md">
                  Bengali Comedy That Hits Home!
                </div>
                <div className="text-lg md:text-xl text-white/90 mt-2 bangla-text">
                  কলকাতার ঘরোয়া কমেডি
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-16 h-16 bg-white/20 rounded-full"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 bg-white/20 rounded-full"></div>
              <div className="absolute top-1/2 right-8 w-8 h-8 bg-white/20 rounded-full"></div>
            </div>
            
            
            {/* Intro Text */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-8">
                <p className="text-lg md:text-xl text-gray-700 mb-6 leading-relaxed" data-testid="intro-english">
                  Welcome to <strong>Bong Bari</strong> - where every Bengali family finds their story! 
                  Our hilarious mother-son comedy shorts capture the essence of Kolkata homes with relatable, 
                  heartwarming humor that'll make you laugh until your stomach hurts.
                </p>
                
                <p className="text-lg md:text-xl text-gray-700 bangla-text leading-relaxed" data-testid="intro-bengali">
                  <strong>বং বাড়িতে</strong> স্বাগতম! আমাদের মা-ছেলের কমেডি শর্টস দেখে হাসতে হাসতে পেট ব্যথা হয়ে যাবে। 
                  কলকাতার ঘরোয়া পরিবেশের সাথে মিলিয়ে এমন সব মজার গল্প যা আপনার নিজের বাড়ির মতোই লাগবে।
                </p>
              </CardContent>
            </Card>
          </section>
          
          {/* YouTube Shorts Grid */}
          <section className="mb-16" data-testid="videos-section">
            <h3 className="text-3xl font-bold text-center text-brand-blue mb-8" data-testid="videos-title-english">
              Latest Comedy Shorts
            </h3>
            <h4 className="text-2xl font-bold text-center text-gray-800 mb-12 bangla-text" data-testid="videos-title-bengali">
              সর্বশেষ কমেডি শর্টস
            </h4>
            
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6" data-testid="videos-grid-loading">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="video-container">
                    <div className="w-full h-full bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6" data-testid="videos-grid">
                {videoData.map((video) => (
                  <YouTubeShort
                    key={video.videoId}
                    videoId={video.videoId}
                    thumbnail={video.thumbnail}
                    title={video.title}
                  />
                ))}
              </div>
            )}
          </section>
          
          {/* CTA Buttons */}
          <section className="text-center mb-16" data-testid="cta-section">
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-brand-red text-white hover:bg-red-600 px-8 py-4 rounded-full font-semibold text-lg hover-lift"
                data-testid="button-youtube"
                onClick={() => window.open('https://youtube.com/@bongbari', '_blank')}
              >
                <Youtube className="mr-2 h-5 w-5" />
                Subscribe on YouTube
              </Button>
              <Button 
                size="lg" 
                className="bg-brand-blue text-white hover:bg-blue-700 px-8 py-4 rounded-full font-semibold text-lg hover-lift"
                data-testid="button-instagram"
                onClick={() => window.open('https://instagram.com/thebongbari', '_blank')}
              >
                <Instagram className="mr-2 h-5 w-5" />
                Follow on Instagram
              </Button>
            </div>
          </section>
          
          {/* Collaboration Form */}
          <section className="mb-16" data-testid="collaboration-section">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-3xl font-bold text-center text-brand-blue mb-4" data-testid="collaboration-title-english">
                Work with Us
              </h3>
              <h4 className="text-2xl font-bold text-center text-gray-800 mb-8 bangla-text" data-testid="collaboration-title-bengali">
                আমাদের সাথে কাজ করুন
              </h4>
              
              <Card className="bg-white shadow-lg">
                <CardContent className="p-8">
                  <p className="text-center text-gray-700 mb-6">
                    Ready to collaborate? Let's create some amazing Bengali comedy content together!
                  </p>
                  <p className="text-center text-gray-700 mb-8 bangla-text">
                    কোলাবোরেট করতে প্রস্তুত? চলুন একসাথে দুর্দান্ত বাংলা কমেডি কন্টেন্ট তৈরি করি!
                  </p>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="collaboration-form">
                      <div className="grid md:grid-cols-2 gap-4">
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
                                placeholder="Tell us about your collaboration idea..."
                                data-testid="textarea-message"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        disabled={collaborationMutation.isPending}
                        className="w-full bg-brand-red text-white hover:bg-red-600 py-3 rounded-full font-semibold text-lg hover-lift disabled:opacity-50"
                        data-testid="button-submit-collaboration"
                      >
                        <Send className="mr-2 h-5 w-5" />
                        {collaborationMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </section>
          
          {/* Contact Information */}
          <section className="mb-16" data-testid="contact-section">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-3xl font-bold text-center text-brand-blue mb-4" data-testid="contact-title-english">
                Get in Touch
              </h3>
              <h4 className="text-2xl font-bold text-center text-gray-800 mb-12 bangla-text" data-testid="contact-title-bengali">
                যোগাযোগ করুন
              </h4>
              
              <div className="grid md:grid-cols-3 gap-8">
                {/* Email */}
                <Card className="bg-white hover-lift shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h5 className="font-semibold text-brand-blue mb-2">Email</h5>
                    <p className="text-gray-700 text-[15px]">bongbariofficial@gmail.com</p>
                  </CardContent>
                </Card>
                
                {/* WhatsApp */}
                <Card className="bg-white hover-lift shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-white" />
                    </div>
                    <h5 className="font-semibold text-brand-blue mb-2">WhatsApp</h5>
                    <p className="text-gray-700">+91 8777849865</p>
                  </CardContent>
                </Card>
                
                {/* Social Media */}
                <Card className="bg-white hover-lift shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 bg-brand-red rounded-full flex items-center justify-center mx-auto mb-4">
                      <Instagram className="w-8 h-8 text-white" />
                    </div>
                    <h5 className="font-semibold text-brand-blue mb-2">Follow Us</h5>
                    <div className="flex justify-center space-x-3 mt-3">
                      <a href="https://youtube.com/@bongbari" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <Youtube className="w-4 h-4 text-white" />
                      </a>
                      <a href="https://instagram.com/thebongbari" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                        <Instagram className="w-4 h-4 text-white" />
                      </a>
                      <a href="https://twitter.com/bongbari" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                        <Twitter className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
        
        {/* Footer */}
        <footer className="bg-brand-blue text-white py-8 mt-16" data-testid="footer">
          <div className="container mx-auto px-4 text-center">
            <p className="text-lg font-medium" data-testid="footer-text">
              © Bong Bari 2025 Kolkata
            </p>
            <p className="text-sm opacity-80 mt-2 bangla-text" data-testid="footer-text-bengali">
              © বং বাড়ি ২০২৫ কলকাতা
            </p>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Home;
