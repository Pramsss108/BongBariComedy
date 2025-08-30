import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import YouTubeShort from "@/components/youtube-short";
import SEOHead from "@/components/seo-head";
import { Youtube, Instagram, Phone } from "lucide-react";

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
              >
                <Youtube className="mr-2 h-5 w-5" />
                Subscribe on YouTube
              </Button>
              <Button 
                size="lg" 
                className="bg-brand-blue text-white hover:bg-blue-700 px-8 py-4 rounded-full font-semibold text-lg hover-lift"
                data-testid="button-instagram"
              >
                <Instagram className="mr-2 h-5 w-5" />
                Follow on Instagram
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white px-8 py-4 rounded-full font-semibold text-lg hover-lift"
                data-testid="button-contact"
                onClick={() => window.location.href = '/contact'}
              >
                <Phone className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default Home;
