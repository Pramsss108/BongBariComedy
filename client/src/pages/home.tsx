import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import YouTubeShort from "@/components/youtube-short";
import SEOHead from "@/components/seo-head";
import { Youtube, Instagram, Phone, Mail, Twitter, Send } from "lucide-react";

const Home = () => {
  const videoData = [
    {
      videoId: "demo1",
      thumbnail: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Bengali Mom's Kitchen Comedy"
    },
    {
      videoId: "demo2", 
      thumbnail: "https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Son's Funny Faces During Meal"
    },
    {
      videoId: "demo3",
      thumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Family Discussion Comedy"
    },
    {
      videoId: "demo4",
      thumbnail: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Bengali Mother's Expressions"
    },
    {
      videoId: "demo5",
      thumbnail: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Young Man's Laughter"
    },
    {
      videoId: "demo6",
      thumbnail: "https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=533",
      title: "Family Celebration Joy"
    }
  ];

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
            <img 
              src="https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
              alt="Bengali family comedy" 
              className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-lg mb-8"
              data-testid="hero-image"
            />
            
            <h1 className="text-4xl md:text-6xl font-bold text-brand-blue mb-4 bangla-text" data-testid="main-title">
              বং বাড়ি
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6" data-testid="subtitle">
              Bengali Comedy That Hits Home!
            </h2>
            
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
                  
                  <form className="space-y-6" data-testid="collaboration-form">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name / নাম</Label>
                        <Input 
                          id="name" 
                          placeholder="Your Name"
                          data-testid="input-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="your@email.com"
                          data-testid="input-email"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="company">Company / Brand</Label>
                      <Input 
                        id="company" 
                        placeholder="Your Company or Brand"
                        data-testid="input-company"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="message">Message / বার্তা</Label>
                      <Textarea 
                        id="message" 
                        rows={4}
                        placeholder="Tell us about your collaboration idea..."
                        data-testid="textarea-message"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-brand-red text-white hover:bg-red-600 py-3 rounded-full font-semibold text-lg hover-lift"
                      data-testid="button-submit-collaboration"
                    >
                      <Send className="mr-2 h-5 w-5" />
                      Send Message
                    </Button>
                  </form>
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
