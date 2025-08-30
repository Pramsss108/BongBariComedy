import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import type { BlogPost } from "@shared/schema";

const Blog = () => {
  const { data: blogPosts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog']
  });

  const featuredPosts = [
    {
      id: "1",
      title: "Top 10 Bengali Mom Phrases That Never Get Old",
      excerpt: "Every Bengali household has these iconic mom dialogues that we've all heard a million times...",
      image: "https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      date: "March 15, 2024",
      slug: "top-10-bengali-mom-phrases"
    },
    {
      id: "2", 
      title: "When Your Bengali Mom Discovers YouTube",
      excerpt: "The hilarious journey of introducing technology to Bengali mothers and the chaos that follows...",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      date: "March 10, 2024",
      slug: "bengali-mom-discovers-youtube"
    },
    {
      id: "3",
      title: "Behind the Scenes: Creating Authentic Bengali Comedy",
      excerpt: "Our process of turning everyday Bengali household moments into comedy gold...",
      image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
      date: "March 5, 2024",
      slug: "creating-authentic-bengali-comedy"
    }
  ];

  return (
    <>
      <SEOHead
        title="Blog - Bong Bari | ব্লগ"
        description="Read our latest articles about Bengali comedy, family humor, and behind-the-scenes stories from Bong Bari team."
        canonical="/blog"
      />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-center text-brand-blue mb-4" data-testid="page-title-english">
              Blog
            </h1>
            <h2 className="text-3xl font-bold text-center text-brand-blue mb-12 bangla-text" data-testid="page-title-bengali">
              ব্লগ
            </h2>
            
            {isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="w-full h-48 bg-gray-200 animate-pulse" />
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse mb-4" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="blog-posts-grid">
                {(blogPosts && blogPosts.length > 0 ? blogPosts : featuredPosts).map((post) => (
                  <Card key={post.id} className="overflow-hidden hover-lift shadow-lg">
                    <img 
                      src={'image' in post ? post.image : `https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300`}
                      alt={post.title}
                      className="w-full h-48 object-cover"
                      data-testid={`blog-post-image-${post.id}`}
                    />
                    <CardContent className="p-6">
                      <h3 
                        className="text-xl font-semibold text-brand-blue mb-2"
                        data-testid={`blog-post-title-${post.id}`}
                      >
                        {post.title}
                      </h3>
                      <p 
                        className="text-gray-600 mb-4"
                        data-testid={`blog-post-excerpt-${post.id}`}
                      >
                        {'excerpt' in post ? post.excerpt : (post.content?.substring(0, 100) + '...')}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span data-testid={`blog-post-date-${post.id}`}>
                            {'date' in post ? post.date : new Date(post.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-brand-red hover:text-red-600 p-0"
                          data-testid={`blog-post-read-more-${post.id}`}
                        >
                          Read More
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="text-center mt-12">
              <Button 
                size="lg"
                className="bg-brand-blue text-white hover:bg-blue-700 px-8 py-3 rounded-full font-semibold hover-lift"
                data-testid="button-view-all"
              >
                View All Posts
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Blog;
