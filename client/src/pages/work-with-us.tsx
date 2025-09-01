import { motion } from "framer-motion";
import { useState } from "react";
import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { FileText, Send, CheckCircle2 } from "lucide-react";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const collaborationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().min(2, "Company name is required"),
  message: z.string().optional(),
}).refine((data) => {
  // At least one contact method must be provided
  return data.email || data.phone;
}, {
  message: "Please provide either an email address or phone number",
  path: ["email"]
});

type CollaborationFormData = z.infer<typeof collaborationFormSchema>;

const WorkWithUs = () => {
  const { playFunnySubmissionSound } = useFunnySubmissionSound({ enabled: true, volume: 0.2 });
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
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

  const form = useForm<CollaborationFormData>({
    resolver: zodResolver(collaborationFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      message: "",
    },
  });

  const submitCollaborationMutation = useMutation({
    mutationFn: async (data: CollaborationFormData) => {
      const response = await apiRequest("/api/collaboration-requests", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      playFunnySubmissionSound();
      setIsSubmitted(true);
      toast({
        title: "Success! 🎉",
        description: "Your collaboration request has been submitted. We'll get back to you soon!",
      });
      form.reset();
      
      // Reset submitted state after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit collaboration request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CollaborationFormData) => {
    submitCollaborationMutation.mutate(data);
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
                      className="text-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-500 ease-out hover:border-brand-blue/30 hover:-translate-y-1 group magical-hover"
                      data-testid={`collaboration-type-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 * index, ease: "easeOut" }}
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
                
                {isSubmitted ? (
                  <motion.div 
                    className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-12 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h4 className="text-2xl font-bold text-gray-800 mb-3">Thank You! 🎉</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Your collaboration request has been received. Our team will review it and get back to you within 2-3 business days.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Name *</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="John Doe" 
                                    {...field} 
                                    data-testid="input-name"
                                    className="border-gray-300 focus:border-brand-blue"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="company"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company/Brand Name *</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Your Company" 
                                    {...field}
                                    data-testid="input-company"
                                    className="border-gray-300 focus:border-brand-blue"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="email"
                                    placeholder="john@example.com" 
                                    {...field}
                                    data-testid="input-email"
                                    className="border-gray-300 focus:border-brand-blue"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="+91 98765 43210" 
                                    {...field}
                                    data-testid="input-phone"
                                    className="border-gray-300 focus:border-brand-blue"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tell us about your collaboration idea</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Share your vision for our collaboration... What kind of content would you like to create together?"
                                  rows={6}
                                  {...field}
                                  data-testid="input-message"
                                  className="border-gray-300 focus:border-brand-blue resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="text-center pt-4">
                          <Button 
                            type="submit"
                            disabled={submitCollaborationMutation.isPending}
                            className="bg-gradient-to-r from-brand-blue to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 px-8 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg transform magical-hover no-rickshaw-sound"
                            data-testid="button-submit"
                          >
                            {submitCollaborationMutation.isPending ? (
                              <>Submitting...</>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2 inline" />
                                Submit Collaboration Request
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </motion.div>
                )}
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