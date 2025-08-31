import { motion } from "framer-motion";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { FileText } from "lucide-react";
import { useSparkleSound } from "@/hooks/useSparkleSound";

const WorkWithUs = () => {
  const { playSparkleSound } = useSparkleSound({ 
    enabled: true, 
    volume: 0.2, 
    cooldownMs: 200 
  });

  const collaborationTypes = [
    {
      title: "Product Integration",
      description: "Natural product placements in our comedy sketches"
    },
    {
      title: "Custom Content", 
      description: "Branded episodes tailored to your brand message"
    },
    {
      title: "Social Media",
      description: "Cross-platform promotion and engagement"
    }
  ];

  const handleFormClick = () => {
    playSparkleSound();
    // This would open the actual Google Form
    window.open("https://forms.google.com/", "_blank");
  };

  return (
    <>
      <SEOHead
        title="Work with Us - Brand Collaborations | Bong Bari"
        description="Partner with Bong Bari for authentic Bengali comedy brand integrations. Custom content, product placements, and social media collaborations."
        canonical="/work-with-us"
      />
      
      <ParallaxContainer>
        <main className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ParallaxSection speed={0.3} delay={0.1}>
                <motion.h1 
                  className="text-4xl font-bold text-center text-brand-blue mb-4" 
                  data-testid="page-title-english"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                >
                  Work with Us
                </motion.h1>
              </ParallaxSection>
              
              <ParallaxSection speed={0.4} delay={0.2}>
                <motion.h2 
                  className="text-3xl font-bold text-center text-brand-blue mb-12 bangla-text" 
                  data-testid="page-title-bengali"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
                >
                  আমাদের সাথে কাজ করুন
                </motion.h2>
              </ParallaxSection>
            
            <Card className="mb-12">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-brand-red mb-6" data-testid="collaboration-title">
                  Brand Collaborations
                </h3>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed" data-testid="collaboration-description-english">
                  Looking to reach Bengali families with authentic, engaging content? 
                  Partner with Bong Bari for brand integrations that feel natural and resonate with our audience. 
                  We specialize in creating branded content that doesn't feel like advertising.
                </p>
                
                <p className="text-lg text-gray-700 mb-6 leading-relaxed bangla-text" data-testid="collaboration-description-bengali">
                  বাঙালি পরিবারের কাছে পৌঁছাতে চান সত্যিকারের, আকর্ষণীয় কন্টেন্টের মাধ্যমে? 
                  বং বাড়ির সাথে পার্টনার হন ব্র্যান্ড ইন্টিগ্রেশনের জন্য যা স্বাভাবিক লাগে এবং 
                  আমাদের দর্শকদের সাথে সংযোগ স্থাপন করে।
                </p>
                
                <div className="grid md:grid-cols-3 gap-6 mt-8" data-testid="collaboration-types">
                  {collaborationTypes.map((type, index) => (
                    <motion.div 
                      key={index}
                      className="text-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-500 ease-out hover:border-brand-blue/30 hover:-translate-y-1 group cursor-pointer"
                      data-testid={`collaboration-type-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
                      onMouseEnter={playSparkleSound}
                    >
                      <h4 className="font-semibold text-brand-blue mb-3 group-hover:text-brand-red transition-colors duration-300">{type.title}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{type.description}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Collaboration Form */}
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-brand-blue mb-6 text-center" data-testid="form-title">
                  Let's Collaborate!
                </h3>
                
                <motion.div 
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-12 text-center shadow-sm hover:shadow-lg transition-all duration-700 ease-out"
                  data-testid="form-placeholder"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  onMouseEnter={playSparkleSound}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                  >
                    <FileText className="w-16 h-16 text-brand-blue mx-auto mb-6" />
                  </motion.div>
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Ready to Collaborate?</h4>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">Share your ideas and let's create something amazing together for the Bengali comedy community</p>
                  <Button 
                    className="bg-gradient-to-r from-brand-blue to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 px-8 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg transform"
                    onClick={handleFormClick}
                    data-testid="button-form"
                  >
                    Start Collaboration
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
            </div>
          </div>
        </main>
      </ParallaxContainer>
    </>
  );
};

export default WorkWithUs;
