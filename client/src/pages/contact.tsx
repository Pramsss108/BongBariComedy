import { motion } from "framer-motion";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { Mail, Phone, Youtube, Instagram, Twitter } from "lucide-react";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";

const Contact = () => {
  const { playFunnySubmissionSound } = useFunnySubmissionSound({ enabled: true, volume: 0.18 });
  
  const handleContactClick = (method: string) => {
    // Play funny sound when someone tries to contact
    playFunnySubmissionSound();
  };
  
  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
  value: "team@bongbari.com",
      bgColor: "bg-brand-blue"
    },
    {
      icon: Phone,
      title: "WhatsApp", 
      value: "+91 98765 43210",
      bgColor: "bg-green-500"
    }
  ];

  const socialLinks = [
    {
      icon: Youtube,
      href: "https://youtube.com/@bongbari",
      bgColor: "bg-brand-red hover:bg-red-600"
    },
    {
      icon: Instagram, 
      href: "https://instagram.com/bongbari",
      bgColor: "bg-pink-500 hover:bg-pink-600"
    },
    {
      icon: Twitter,
      href: "https://twitter.com/bongbari", 
      bgColor: "bg-blue-600 hover:bg-blue-700"
    }
  ];

  return (
    <>
      <SEOHead
        title="Contact Us - Bong Bari | যোগাযোগ"
        description="Get in touch with Bong Bari team. Email, WhatsApp, and social media contacts for collaboration, feedback, and general inquiries."
        canonical="/contact"
      />
      
      <ParallaxContainer>
        <main className="pb-16 bg-white">
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
                  Contact Us
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
                  যোগাযোগ
                </motion.h2>
              </ParallaxSection>
            
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                  alt="Contact Us" 
                  className="rounded-2xl shadow-lg w-full mb-6"
                  data-testid="contact-image"
                />
                
                <div className="space-y-4" data-testid="contact-description">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    Ready to bring some laughter to your day? We'd love to hear from you! 
                    Whether you have feedback, collaboration ideas, or just want to share your favorite Bong Bari moment.
                  </p>
                  
                  <p className="text-lg text-gray-700 leading-relaxed bangla-text">
                    আপনার দিনে একটু হাসি আনতে প্রস্তুত? আমরা আপনার কাছ থেকে শুনতে পছন্দ করব! 
                    ফিডব্যাক, কোলাবোরেশন আইডিয়া, বা শুধু আপনার প্রিয় বং বাড়ির মুহূর্ত শেয়ার করতে চান।
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Contact Methods */}
                {contactMethods.map((method, index) => (
                  <Card 
                    key={index} 
                    className="bg-brand-yellow hover-lift cursor-pointer magical-hover"
                    onClick={() => handleContactClick(method.title)}
                  >
                    <CardContent className="p-6">
                      <div 
                        className="flex items-center space-x-4"
                        data-testid={`contact-method-${method.title.toLowerCase()}`}
                      >
                        <div className={`w-12 h-12 ${method.bgColor} rounded-full flex items-center justify-center`}>
                          <method.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-brand-blue">{method.title}</h3>
                          <p className="text-gray-700">{method.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Social Media */}
                <Card className="bg-brand-yellow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-brand-blue mb-4" data-testid="social-media-title">
                      Follow Us
                    </h3>
                    <div className="flex space-x-4" data-testid="social-media-links">
                      {socialLinks.map((social, index) => (
                        <a
                          key={index}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-12 h-12 ${social.bgColor} rounded-full flex items-center justify-center transition-colors magical-hover`}
                          data-testid={`social-link-${index}`}
                          onClick={() => handleContactClick('social')}
                        >
                          <social.icon className="w-6 h-6 text-white" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          </div>
        </main>
      </ParallaxContainer>
    </>
  );
};

export default Contact;
