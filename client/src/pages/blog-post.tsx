import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { Calendar, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import type { BlogPost } from "@shared/schema";

const BlogPostPage = () => {
  const [, params] = useRoute("/blog/:slug");
  const [, setLocation] = useLocation();
  
  const { data: blogPost, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/blog/slug/${params?.slug}`],
    enabled: !!params?.slug
  });

  // Fallback content for the demo posts
  const fallbackPosts: Record<string, any> = {
    "top-10-bengali-mom-phrases": {
      title: "Top 10 Bengali Mom Phrases That Never Get Old",
      content: `Every Bengali household has these iconic mom dialogues that we've all heard a million times. From "Ei je chele ta!" to "Aar khabi na?", these phrases are the soundtrack of our childhood.

## The Classic Collection

### 1. "Aar khabi na?" (Won't you eat more?)
No matter how full you are, this question will be asked at least 5 times during any meal.

### 2. "Ei je chele ta!" (Hey this boy!)
The universal Bengali mom call that could mean anything from "come here" to "you're in trouble."

### 3. "Baire theke eshe hat mukh dhoy ni?" (Came from outside and didn't wash hands and face?)
The eternal hygiene reminder that follows you everywhere.

### 4. "Amar matha betha korchis" (You're giving me a headache)
The dramatic declaration that ends most arguments.

### 5. "Tor baba eshe gele dekhe nebo" (When your father comes, I'll see)
The ultimate threat that makes every Bengali child nervous.

These phrases connect every Bengali family across generations. Whether you're 5 or 50, you'll still hear these from your mom!`,
      image: "https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      date: "March 15, 2024",
      createdAt: "2024-03-15T00:00:00Z"
    },
    "bengali-mom-discovers-youtube": {
      title: "When Your Bengali Mom Discovers YouTube",
      content: `The hilarious journey of introducing technology to Bengali mothers and the chaos that follows. From accidentally going live while cooking to commenting on every single video with "Nice beta."

## The Digital Revolution at Home

When Bengali moms discover YouTube, it's like watching a beautiful disaster unfold in slow motion. Here's what typically happens:

### Phase 1: The Discovery
"Ei YouTube ta ki re?" (What is this YouTube?)
*Proceeds to watch one cooking video and gets hooked for 3 hours*

### Phase 2: The Exploration
Suddenly she knows every cooking channel, every Bengali serial recap, and somehow found videos of her neighbor's son's wedding from 2019.

### Phase 3: The Creation
"Ami o video banabo" (I'll also make videos)
*Starts recording 45-minute cooking tutorials where half the time the camera is pointing at the ceiling*

### Phase 4: The Commenting Spree
Comments "Nice beta" on every video she watches, including NASA space launches and international news.

### Phase 5: The Sharing
Sends you 47 WhatsApp links daily with "Dekh re" (See this) - half of them are the same video she sent yesterday.

The best part? She becomes more tech-savvy than you ever imagined, while still calling you to "fix the internet" when she accidentally turned off WiFi.`,
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      date: "March 10, 2024",
      createdAt: "2024-03-10T00:00:00Z"
    },
    "creating-authentic-bengali-comedy": {
      title: "Behind the Scenes: Creating Authentic Bengali Comedy",
      content: `Our process of turning everyday Bengali household moments into comedy gold. We dive deep into the nuances of Bengali family dynamics and how we capture those universal moments that make every Bengali family laugh and say "Amader barite o same!"

## The Art of Bengali Family Comedy

Creating authentic Bengali comedy isn't just about making people laugh - it's about making them feel seen. Every Bengali family has their own version of our stories.

### Finding the Universal in the Personal

**The Kitchen Chronicles**: Every Bengali kitchen is a theater of drama. From the precise art of cutting vegetables to the philosophical debates about the right amount of salt in dal.

**The Adda Sessions**: Those endless evening conversations that somehow cover everything from neighborhood gossip to international politics, all while consuming countless cups of cha.

**The Festival Frenzy**: The beautiful chaos of Bengali festivals where everyone has an opinion about everything and somehow it all works out perfectly.

### Our Creative Process

1. **Observation**: We spend time in real Bengali households, listening to authentic conversations
2. **Research**: Understanding the cultural nuances that make each joke land perfectly
3. **Writing**: Crafting dialogue that feels natural and spontaneous
4. **Performance**: Bringing characters to life with genuine emotion and timing
5. **Feedback**: Testing our content with Bengali families to ensure authenticity

### The Characters We Love

**Ma**: The eternal multitasker who somehow knows everything happening in the neighborhood while managing a household

**Chele**: The well-meaning son who tries to help but usually makes things more complicated

**Baba**: The quiet observer who drops the most profound (and funny) observations at unexpected moments

Our goal is simple: create content that makes Bengali families watch together and say "Ei to amader ghar!" (This is exactly our house!)

Because the best comedy comes from truth, and Bengali households are full of beautiful, hilarious truths.`,
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
      date: "March 5, 2024",
      createdAt: "2024-03-05T00:00:00Z"
    }
  };

  const currentPost = blogPost || (params?.slug ? fallbackPosts[params.slug] : null);

  if (isLoading) {
    return (
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!currentPost) {
    return (
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-brand-blue mb-4">Post Not Found</h1>
            <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
            <Button
              onClick={() => setLocation('/blog')}
              className="bg-brand-blue text-white hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <SEOHead
        title={`${currentPost.title} - Bong Bari Blog`}
        description={currentPost.content?.substring(0, 160) + "..."}
        canonical={`/blog/${params?.slug}`}
      />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setLocation('/blog')}
              className="mb-8 text-brand-blue hover:text-blue-700"
              data-testid="button-back-to-blog"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>

            <article>
              <header className="mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-brand-blue mb-4" data-testid="post-title">
                  {currentPost.title}
                </h1>
                
                <div className="flex items-center text-gray-600 mb-6">
                  <Calendar className="w-5 h-5 mr-2" />
                  <time data-testid="post-date">
                    {currentPost.date || new Date(currentPost.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                </div>

                {currentPost.image && (
                  <img
                    src={currentPost.image}
                    alt={currentPost.title}
                    className="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg mb-8"
                    data-testid="post-image"
                  />
                )}
              </header>

              <Card>
                <CardContent className="p-8">
                  <div 
                    className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
                    style={{ whiteSpace: 'pre-line' }}
                    data-testid="post-content"
                  >
                    {currentPost.content}
                  </div>
                </CardContent>
              </Card>
            </article>

            <div className="mt-12 text-center">
              <Button
                onClick={() => setLocation('/blog')}
                size="lg"
                className="bg-brand-blue text-white hover:bg-blue-700 px-8 py-3 rounded-full font-semibold hover-lift"
                data-testid="button-more-posts"
              >
                Read More Posts
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default BlogPostPage;