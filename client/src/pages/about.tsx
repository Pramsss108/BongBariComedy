import { motion } from "framer-motion";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";

const About = () => {
  return (
    <>
      <SEOHead
        title="About Us - Bong Bari | আমাদের সম্পর্কে"
        description="Learn about Bong Bari - A creative team from Kolkata creating authentic Bengali comedy content that resonates with every Bengali family."
        canonical="/about"
      />
      
      <ParallaxContainer>
        <main className="pt-[95px] pb-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <ParallaxSection speed={0.3} delay={0.1}>
                <motion.h1 
                  className="text-4xl font-bold text-center text-brand-blue mb-4" 
                  data-testid="page-title-english"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  About Us
                </motion.h1>
              </ParallaxSection>
              
              <ParallaxSection speed={0.4} delay={0.2}>
                <motion.h2 
                  className="text-3xl font-bold text-center text-brand-blue mb-12 bangla-text" 
                  data-testid="page-title-bengali"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  আমাদের সম্পর্কে
                </motion.h2>
              </ParallaxSection>
            
              <ParallaxSection speed={0.2} delay={0.3}>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <motion.div 
                    data-testid="about-image"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1609220136736-443140cffec6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                      alt="Bong Bari Team" 
                      className="rounded-2xl shadow-lg w-full"
                    />
                  </motion.div>
              
                  <motion.div 
                    className="space-y-6" 
                    data-testid="about-content"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  >
                    <motion.p 
                      className="text-lg text-gray-700 leading-relaxed" 
                      data-testid="about-paragraph-1"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                    >
                      <strong>Bong Bari</strong> was born from the everyday chaos and comedy of Bengali households. 
                      We're a creative team from Kolkata who believes that the funniest moments happen right at home - 
                      from the kitchen arguments about fish curry to the living room debates about cricket matches.
                    </motion.p>
                    
                    <motion.p 
                      className="text-lg text-gray-700 leading-relaxed bangla-text" 
                      data-testid="about-paragraph-2"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.0 }}
                    >
                      <strong>বং বাড়ি</strong> এর জন্ম হয়েছে বাঙালি ঘরের রোজকার কেউকেটা আর হাসির গল্প থেকে। 
                      আমরা কলকাতার একদল ক্রিয়েটিভ মানুষ যারা বিশ্বাস করি যে সবচেয়ে মজার ঘটনাগুলো ঘটে 
                      আমাদের নিজেদের বাড়িতেই - রান্নাঘরের মাছের তরকারি নিয়ে তর্ক থেকে বসার ঘরের 
                      ক্রিকেট ম্যাচ নিয়ে বিতর্ক পর্যন্ত।
                    </motion.p>
                    
                    <motion.p 
                      className="text-lg text-gray-700 leading-relaxed" 
                      data-testid="about-paragraph-3"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.2 }}
                    >
                      Our mission is simple: to create content that makes you feel like you're watching your own family. 
                      Every sketch, every character, every punchline comes from real experiences that every Bengali family can relate to.
                    </motion.p>
                    
                    <motion.p 
                      className="text-lg text-gray-700 leading-relaxed bangla-text" 
                      data-testid="about-paragraph-4"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.4 }}
                    >
                      আমাদের উদ্দেশ্য সহজ: এমন কন্টেন্ট বানানো যা দেখে মনে হবে আপনি আপনার নিজের পরিবারকেই দেখছেন। 
                      আমাদের প্রতিটি স্কেচ, প্রতিটি চরিত্র, প্রতিটি কৌতুক এসেছে সত্যিকারের অভিজ্ঞতা থেকে 
                      যার সাথে প্রতিটি বাঙালি পরিবার নিজেদের মিলিয়ে নিতে পারে।
                    </motion.p>
                  </motion.div>
                </div>
              </ParallaxSection>
            </div>
          </div>
        </main>
      </ParallaxContainer>
    </>
  );
};

export default About;
