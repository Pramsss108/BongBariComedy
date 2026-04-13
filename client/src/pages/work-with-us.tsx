import { motion } from "framer-motion";
import { useState } from "react";
import SEOHead from "@/components/seo-head";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParallaxSection, ParallaxContainer } from "@/components/parallax-section";
import { FileText, Send, CheckCircle2, Phone } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const collaborationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string()
    .refine((val) => !val || val.includes('@'), "Email must contain @ symbol")
    .optional()
    .or(z.literal("")),
  countryCode: z.string().min(1, "Country code is required"),
  phoneNumber: z.string().optional(),
  company: z.string().min(2, "Company name is required"),
  message: z.string().optional(),
}).refine((data) => {
  // At least one contact method must be provided
  return data.email || (data.phoneNumber && data.countryCode);
}, {
  message: "Please provide either an email address or phone number",
  path: ["email"]
}).transform((data) => ({
  ...data,
  phone: data.phoneNumber ? `${data.countryCode} ${data.phoneNumber}` : undefined
}));

type CollaborationFormData = z.infer<typeof collaborationFormSchema>;

const WorkWithUs = () => {
  const { playFunnySubmissionSound } = useFunnySubmissionSound({ enabled: true, volume: 0.2 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const form = useForm<any>({
    resolver: zodResolver(collaborationFormSchema),
    defaultValues: {
      name: "",
      email: "",
      countryCode: "+91",
      phoneNumber: "",
      company: "",
      message: "",
    },
  });

  const countryCodes = [
    { value: "+91", label: "🇮🇳 +91 (India)" },
    { value: "+880", label: "🇧🇩 +880 (Bangladesh)" },
    { value: "+1", label: "🇺🇸 +1 (USA/Canada)" },
    { value: "+44", label: "🇬🇧 +44 (UK)" },
    { value: "+971", label: "🇦🇪 +971 (UAE)" },
    { value: "+61", label: "🇦🇺 +61 (Australia)" },
    { value: "+65", label: "🇸🇬 +65 (Singapore)" },
    { value: "+49", label: "🇩🇪 +49 (Germany)" },
    { value: "+33", label: "🇫🇷 +33 (France)" },
    { value: "+86", label: "🇨🇳 +86 (China)" },
  ];

  const submitCollaborationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/collaboration-requests", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      // Invalidate the collaboration requests cache
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration-requests'] });
      
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

  const onSubmit = (data: any) => {
    submitCollaborationMutation.mutate(data);
  };

  return (
    <>
      <SEOHead
        title="Work with Us - Brand Collaborations | Bong Bari"
        description="Partner with Bong Bari for authentic Bengali comedy brand integrations. Custom content, product placements, and social media collaborations."
        canonical="/work-with-us"
      />
      
      <div className="min-h-screen bg-[#050505] text-white relative">
        {/* Premium Background Glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-500/10 rounded-full blur-[120px]" />
        </div>

        <main className="pt-32 pb-24 px-6 max-w-5xl mx-auto relative z-10">
          {/* Hero */}
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-3">
              Work <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-yellow-600">With Us</span>
            </h1>
            <p className="text-xl text-gray-400 bangla-text">আমাদের সাথে কাজ করুন</p>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">Partner with Bong Bari for brand integrations that feel natural and resonate with Bengali families.</p>
          </motion.div>

          {/* Collaboration Types */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="mb-12">
            <div className="grid md:grid-cols-3 gap-6" data-testid="collaboration-types">
              {collaborationTypes.map((type, index) => {
                const gradients = [
                  "from-brand-yellow/50 via-brand-yellow/30 to-brand-yellow/50",
                  "from-violet-500/50 via-violet-500/30 to-violet-500/50",
                  "from-cyan-500/50 via-cyan-500/30 to-cyan-500/50"
                ];
                const iconColors = ["text-brand-yellow", "text-violet-400", "text-cyan-400"];
                return (
                  <motion.div
                    key={index}
                    data-testid={`collaboration-type-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className={`relative group rounded-2xl p-[1px] bg-gradient-to-br ${gradients[index]} shadow-2xl`}
                  >
                    <div className="rounded-2xl h-full bg-black/80 backdrop-blur-xl p-8 text-center border border-white/5 group-hover:bg-black/60 transition-colors duration-500">
                      <h4 className={`font-bold text-lg mb-2 ${iconColors[index]}`}>{type.title}</h4>
                      <p className="text-sm text-gray-400">{type.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Collaboration Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-brand-yellow/50 via-brand-yellow/30 to-brand-yellow/50 shadow-2xl">
              <div className="rounded-2xl bg-black/80 backdrop-blur-xl p-8 md:p-10 border border-white/5">
                <h3 className="text-2xl font-bold text-white mb-8 text-center" data-testid="form-title">
                  Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-yellow-600">Collaborate!</span>
                </h3>
                
                {isSubmitted ? (
                  <motion.div 
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                    <h4 className="text-2xl font-bold text-white mb-3">Thank You! 🎉</h4>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Your collaboration request has been received. Our team will review it and get back to you within 2-3 business days.
                    </p>
                  </motion.div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300">Your Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="John Doe" 
                                  {...field} 
                                  data-testid="input-name"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50 focus:ring-brand-yellow/20"
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
                              <FormLabel className="text-gray-300">Company/Brand Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your Company" 
                                  {...field}
                                  data-testid="input-company"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50 focus:ring-brand-yellow/20"
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
                              <FormLabel className="text-gray-300">Email Address</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="john@example.com" 
                                  {...field}
                                  data-testid="input-email"
                                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50 focus:ring-brand-yellow/20"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormItem>
                          <FormLabel className="text-gray-300">Phone Number</FormLabel>
                          <div className="flex gap-2">
                            <FormField
                              control={form.control}
                              name="countryCode"
                              render={({ field }) => (
                                <FormItem className="w-[180px]">
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-brand-yellow/50">
                                        <SelectValue placeholder="Code" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {countryCodes.map((code) => (
                                        <SelectItem key={code.value} value={code.value}>
                                          {code.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <div className="relative">
                                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                                      <Input 
                                        placeholder="98765 43210" 
                                        {...field}
                                        data-testid="input-phone"
                                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50 focus:ring-brand-yellow/20 pl-10"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </FormItem>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Tell us about your collaboration idea</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Share your vision for our collaboration..."
                                rows={6}
                                {...field}
                                data-testid="input-message"
                                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50 focus:ring-brand-yellow/20 resize-none"
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
                          className="bg-brand-yellow/20 border border-brand-yellow/30 text-brand-yellow hover:bg-yellow-600 hover:text-white transition-all shadow-lg rounded-xl h-12 px-10 font-medium"
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
                )}
              </div>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default WorkWithUs;