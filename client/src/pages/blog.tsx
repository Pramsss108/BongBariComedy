import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/magnetic-button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { MorphingCard } from "@/components/sticky-scroll-section";
import { Calendar, ArrowRight, Loader2 } from "lucide-react";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import type { BlogPost } from "@shared/schema";

const Blog = () => {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  
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

  // Infinite scroll functionality
  const fetchMorePosts = useCallback(async () => {
    // Simulate loading more posts for demo
    const morePosts = featuredPosts.map((post, index) => ({
      ...post,
      id: `${post.id}-page-${page}-${index}`,
      title: `${post.title} (Page ${page + 1})`
    }));
    setPage(prev => prev + 1);
    return morePosts;
  }, [page, featuredPosts]);

  const {
    items: displayPosts,
    loading: loadingMore,
    hasMore
  } = useInfiniteScroll({
    items: blogPosts && blogPosts.length > 0 ? blogPosts : featuredPosts,
    fetchMore: fetchMorePosts,
    hasMore: page < 3, // Limit to 3 pages for demo
    threshold: 200
  });

  return (
    <>
      <SEOHead
        title="Blog - Bong Bari | ব্লগ"
        description="Read our latest articles about Bengali comedy, family humor, and behind-the-scenes stories from Bong Bari team."
        canonical="/blog"
      />
      
      <ParallaxContainer>
        <main className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <ParallaxSection speed={0.3} delay={0.2}>
                <motion.h1 
                  className="text-4xl font-bold text-center text-brand-blue mb-4" 
                  data-testid="page-title-english"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  Blog
                </motion.h1>
              </ParallaxSection>
              
              <ParallaxSection speed={0.4} delay={0.4}>
                <motion.h2 
                  className="text-3xl font-bold text-center text-brand-blue mb-12 bangla-text" 
                  data-testid="page-title-bengali"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  ব্লগ
                </motion.h2>
              </ParallaxSection>
            
              {isLoading ? (
                <ParallaxSection speed={0.2}>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                      >
                        <Card className="overflow-hidden">
                          <div className="w-full h-48 bg-gray-200 animate-pulse" />
                          <CardContent className="p-6">
                            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-3 bg-gray-200 rounded animate-pulse mb-4" />
                            <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ParallaxSection>
              ) : (
                <>
                  <ParallaxSection speed={0.2}>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="blog-posts-grid">
                      {displayPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 50, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ 
                            duration: 0.6, 
                            delay: index * 0.1,
                            ease: [0.25, 0.25, 0.25, 1]
                          }}
                          whileHover={{ 
                            y: -10, 
                            transition: { duration: 0.3 } 
                          }}
                        >
                          <Card className="overflow-hidden hover-lift shadow-lg bg-white">
                            <motion.img 
                              src={'image' in post ? post.image : `https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300`}
                              alt={post.title}
                              className="w-full h-48 object-cover"
                              data-testid={`blog-post-image-${post.id}`}
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.3 }}
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
                                {'excerpt' in post ? post.excerpt : (post.content ? post.content.substring(0, 100) + '...' : '')}
                              </p>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center text-sm text-gray-500">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  <span data-testid={`blog-post-date-${post.id}`}>
                                    {'date' in post ? post.date : new Date(post.createdAt!).toLocaleDateString()}
                                  </span>
                                </div>
                                <motion.div
                                  whileHover={{ x: 5 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <MagneticButton
                                    variant="ghost"
                                    size="sm"
                                    className="text-brand-red hover:text-red-600 p-0"
                                    onClick={() => {
                                      const slug = 'slug' in post ? post.slug : post.id;
                                      setLocation(`/blog/${slug}`);
                                    }}
                                    data-testid={`blog-post-read-more-${post.id}`}
                                    strength={0.6}
                                  >
                                    Read More
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </MagneticButton>
                                </motion.div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </ParallaxSection>
                  
                  {/* Loading indicator for infinite scroll */}
                  {loadingMore && (
                    <motion.div 
                      className="flex justify-center items-center py-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                      <span className="ml-2 text-brand-blue">Loading more posts...</span>
                    </motion.div>
                  )}
                  
                  {!hasMore && displayPosts.length > 6 && (
                    <motion.div 
                      className="text-center py-8"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="text-gray-500">You've reached the end of our posts!</p>
                    </motion.div>
                  )}
                </>
              )}
            
            </div>
          </div>
        </main>
      </ParallaxContainer>
    </>
  );
};

export default Blog;
