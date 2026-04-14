import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import SEOHead from "@/components/seo-head";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, Phone, User, Building2, Mail, MessageSquare, ChevronDown, Zap, Palette, Share2, Handshake } from "lucide-react";
import { useFunnySubmissionSound } from "@/hooks/useFunnySubmissionSound";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
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
  return data.email || (data.phoneNumber && data.countryCode);
}, {
  message: "Please provide either an email or phone number",
  path: ["email"]
}).transform((data) => ({
  ...data,
  phone: data.phoneNumber ? `${data.countryCode} ${data.phoneNumber}` : undefined
}));

/* ── Custom Country Code Dropdown ── */
const countryCodes = [
  { value: "+91", flag: "🇮🇳", label: "India", short: "+91" },
  { value: "+880", flag: "🇧🇩", label: "Bangladesh", short: "+880" },
  { value: "+1", flag: "🇺🇸", label: "USA/Canada", short: "+1" },
  { value: "+44", flag: "🇬🇧", label: "UK", short: "+44" },
  { value: "+971", flag: "🇦🇪", label: "UAE", short: "+971" },
  { value: "+61", flag: "🇦🇺", label: "Australia", short: "+61" },
  { value: "+65", flag: "🇸🇬", label: "Singapore", short: "+65" },
  { value: "+49", flag: "🇩🇪", label: "Germany", short: "+49" },
  { value: "+33", flag: "🇫🇷", label: "France", short: "+33" },
  { value: "+86", flag: "🇨🇳", label: "China", short: "+86" },
];

function CountryCodeDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = countryCodes.find(c => c.value === value) || countryCodes[0];

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0 h-full w-[72px] sm:w-[88px] cursor-pointer select-none bg-transparent border-none outline-none"
      >
        <span className="text-sm sm:text-base leading-none">{selected.flag}</span>
        <span className="text-[11px] sm:text-[13px] text-white/70 font-medium">{selected.short}</span>
        <ChevronDown className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-56 rounded-xl bg-[#111]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.6)] z-[9990] overflow-hidden"
          >
            <div
              className="max-h-[200px] overflow-y-auto overscroll-contain wws-scroll py-1"
              onWheel={e => e.stopPropagation()}
            >
              {countryCodes.map(code => (
                <button
                  key={code.value}
                  type="button"
                  onClick={() => { onChange(code.value); setOpen(false); }}
                  className={`wws-dropdown-item w-full flex items-center gap-3 px-3 py-2.5 text-left outline-none transition-all duration-150 ${
                    code.value === value
                      ? 'bg-brand-yellow/10 text-brand-yellow'
                      : 'text-gray-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="text-lg leading-none">{code.flag}</span>
                  <span className="text-[13px] font-medium flex-1">{code.label}</span>
                  <span className="text-[11px] text-gray-500 tabular-nums">{code.short}</span>
                  {code.value === value && (
                    <motion.div
                      layoutId="cc-check"
                      className="w-1.5 h-1.5 rounded-full bg-brand-yellow"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Premium floating-label input ── */
function FloatingInput({ icon: Icon, label, ...props }: { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const hasValue = !!props.value;
  return (
    <div className="relative group">
      <div className={`absolute -inset-[1px] rounded-xl opacity-0 ${focused ? 'opacity-100' : ''} bg-gradient-to-r from-brand-yellow/20 via-brand-yellow/5 to-brand-yellow/20 blur-[2px] transition-opacity duration-300 pointer-events-none`} />
      <div className="wws-input relative flex items-center h-[36px] sm:h-[44px]">
        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-colors duration-200 ${focused ? 'text-brand-yellow/70' : 'text-gray-600'}`} />
        <div className="flex-1 relative ml-2 sm:ml-3">
          <span className={`absolute left-0 transition-all duration-200 pointer-events-none ${
            focused || hasValue ? 'text-[8px] sm:text-[9px] -top-1.5 text-brand-yellow/60 font-semibold tracking-[0.15em] uppercase' : 'text-[11px] sm:text-[13px] top-1/2 -translate-y-1/2 text-white/30'
          }`}>{label}</span>
          <input
            {...props}
            autoComplete="new-password"
            data-lpignore="true"
            data-form-type="other"
            onFocus={e => { setFocused(true); props.onFocus?.(e); }}
            onBlur={e => { setFocused(false); props.onBlur?.(e); }}
            className="w-full bg-transparent text-white text-[11px] sm:text-[13px] outline-none pt-2 pb-0.5 wws-autofill-fix"
          />
        </div>
      </div>
    </div>
  );
}


const WorkWithUs = () => {
  const { playFunnySubmissionSound } = useFunnySubmissionSound({ enabled: true, volume: 0.2 });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const collaborationTypes = [
    { icon: Zap, title: "Product Integration", desc: "Natural placements in our comedy sketches", color: "brand-yellow" },
    { icon: Palette, title: "Custom Content", desc: "Branded episodes tailored to your message", color: "violet-400" },
    { icon: Share2, title: "Social Media", desc: "Cross-platform promotion & engagement", color: "cyan-400" },
  ];

  const form = useForm<any>({
    resolver: zodResolver(collaborationFormSchema),
    defaultValues: { name: "", email: "", countryCode: "+91", phoneNumber: "", company: "", message: "" },
  });

  const submitCollaborationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/collaboration-requests", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      return response;
    },
    onSuccess: () => {
      playFunnySubmissionSound();
      setIsSubmitted(true);
      toast({ title: "Success! 🎉", description: "Your collaboration request has been submitted!" });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration-requests'] });
      setTimeout(() => setIsSubmitted(false), 5000);
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message || "Failed to submit. Please try again.", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => { submitCollaborationMutation.mutate(data); };

  return (
    <>
      <SEOHead
        title="Work with Us - Brand Collaborations | Bong Bari"
        description="Partner with Bong Bari for authentic Bengali comedy brand integrations. Custom content, product placements, and social media collaborations."
        canonical="/work-with-us"
      />

      <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute sm:fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/[0.06] rounded-full blur-[140px]" />
          <div className="absolute top-[30%] sm:bottom-[-30%] sm:top-auto right-[-10%] w-[45%] h-[50%] bg-violet-500/[0.04] rounded-full blur-[140px]" />
        </div>

        {/* ═══ FIRST FOLD — Hero + Form in one viewport ═══ */}
        <div className="min-h-[100dvh] flex flex-col relative z-10 pt-[56px] sm:pt-[80px] pb-[72px] sm:pb-0">
          <div className="flex-1 flex flex-col justify-center px-2.5 sm:px-6 max-w-5xl mx-auto w-full py-0 sm:py-6">

            {/* Compact hero — brand-style title on mobile */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.8 }}
              className="text-center mb-1 sm:mb-6"
            >
              <div className="hidden sm:flex items-center justify-center gap-2 mb-1">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-brand-yellow/30" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-yellow/50 font-semibold">Partnerships</span>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-brand-yellow/30" />
              </div>
              <h1 className="footer-brand-text text-[clamp(1.1rem,5vw,2.5rem)] sm:text-3xl lg:text-4xl font-black tracking-tight leading-none">
                Work With Us
              </h1>
              <div className="mx-auto mt-0.5 h-[1px] w-8 sm:hidden rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,204,0,0.4), transparent)' }} />
              <p className="hidden sm:block text-xs text-gray-500 mt-1">Partner with Bong Bari for brand integrations that feel natural</p>
            </motion.div>

            {/* ── The Form Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22, mass: 0.8, delay: 0.1 }}
            >
              {/* Outer glow border */}
              <div className="relative rounded-xl sm:rounded-2xl p-[1px] bg-gradient-to-br from-brand-yellow/30 via-brand-yellow/10 to-violet-500/20 shadow-[0_0_60px_-10px_rgba(244,196,48,0.15)]">
                {/* Glass card */}
                <div className="rounded-xl sm:rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] px-2.5 sm:px-8 py-2 sm:py-7">

                  <AnimatePresence mode="wait">
                    {isSubmitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="text-center py-10"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                        >
                          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-white mb-2">Request Sent!</h3>
                        <p className="text-sm text-gray-400">We'll get back to you within 2-3 business days.</p>
                      </motion.div>
                    ) : (
                      <motion.div key="form">
                        {/* Title row */}
                        <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-5">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-brand-yellow/10 border border-brand-yellow/20 flex items-center justify-center flex-shrink-0">
                            <Handshake className="w-3 h-3 sm:w-4 sm:h-4 text-brand-yellow" />
                          </div>
                          <div>
                            <h2 className="text-[13px] sm:text-lg font-bold text-white leading-tight">
                              Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-amber-300">Collaborate</span>
                            </h2>
                            <p className="text-[8px] sm:text-[10px] text-white/40 tracking-wide">Fill in your details and we'll reach out</p>
                          </div>
                        </div>

                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="space-y-1.5 sm:space-y-3.5">
                            {/* Row 1: Name + Company */}
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                              <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <FloatingInput icon={User} label="Your Name *" data-testid="input-name" {...field} />
                                  </FormControl>
                                  <FormMessage className="text-[11px] mt-1" />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="company" render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <FloatingInput icon={Building2} label="Company / Brand *" data-testid="input-company" {...field} />
                                  </FormControl>
                                  <FormMessage className="text-[11px] mt-1" />
                                </FormItem>
                              )} />
                            </div>

                            {/* Row 2: Email + Phone (country code + number) */}
                            <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                              <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <FloatingInput icon={Mail} label="Email Address" type="email" data-testid="input-email" {...field} />
                                  </FormControl>
                                  <FormMessage className="text-[11px] mt-1" />
                                </FormItem>
                              )} />

                              {/* Phone: unified wrapper — country code + input as one visual unit */}
                              <div className="relative group">
                                <div className="wws-input relative flex items-center h-[36px] sm:h-[44px] p-0 overflow-hidden">
                                  <FormField control={form.control} name="countryCode" render={({ field }) => (
                                    <FormItem className="flex-shrink-0">
                                      <FormControl>
                                        <CountryCodeDropdown value={field.value} onChange={field.onChange} />
                                      </FormControl>
                                    </FormItem>
                                  )} />
                                  <div className="w-px h-5 bg-white/[0.08] flex-shrink-0" />
                                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                                    <FormItem className="flex-1 min-w-0">
                                      <FormControl>
                                        <input
                                          {...field}
                                          type="tel"
                                          placeholder="Phone Number"
                                          autoComplete="new-password"
                                          data-lpignore="true"
                                          data-form-type="other"
                                          data-testid="input-phone"
                                          className="w-full h-full bg-transparent text-white text-[11px] sm:text-[13px] outline-none px-2 sm:px-3 placeholder:text-white/25 wws-autofill-fix"
                                        />
                                      </FormControl>
                                      <FormMessage className="text-[11px] mt-1" />
                                    </FormItem>
                                  )} />
                                </div>
                              </div>
                            </div>

                            {/* Row 3: Message */}
                            <FormField control={form.control} name="message" render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative group">
                                    <div className={`absolute -inset-[1px] rounded-xl opacity-0 ${focusedField === 'message' ? 'opacity-100' : ''} bg-gradient-to-r from-brand-yellow/20 via-brand-yellow/5 to-brand-yellow/20 blur-[2px] transition-opacity duration-300 pointer-events-none`} />
                                    <div className="wws-input relative flex items-start pt-1.5 sm:pt-3 min-h-[34px] sm:min-h-[72px]">
                                      <MessageSquare className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 transition-colors duration-200 ${focusedField === 'message' ? 'text-brand-yellow/70' : 'text-gray-600'}`} />
                                      <textarea
                                        {...field}
                                        rows={1}
                                        autoComplete="off"
                                        placeholder="Collaboration idea..."
                                        data-testid="input-message"
                                        onFocus={() => setFocusedField('message')}
                                        onBlur={() => setFocusedField(null)}
                                        className="flex-1 ml-2 sm:ml-3 bg-transparent text-white text-[11px] sm:text-[13px] outline-none placeholder:text-white/25 resize-none leading-snug sm:leading-relaxed"
                                      />
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-[11px] mt-1" />
                              </FormItem>
                            )} />

                            {/* Submit button — premium gradient glow */}
                            <motion.div className="pt-0.5 sm:pt-1" whileTap={{ scale: 0.97 }}>
                              <Button
                                type="submit"
                                disabled={submitCollaborationMutation.isPending}
                                data-testid="button-submit"
                                className="wws-submit w-full h-8 sm:h-12 rounded-xl font-semibold text-[13px] sm:text-sm relative overflow-hidden"
                              >
                                {submitCollaborationMutation.isPending ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                    <Send className="w-4 h-4" />
                                  </motion.div>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Request
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </form>
                        </Form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══ BELOW FOLD — Why Work With Us cards ═══ */}
        <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-amber-300">Partner</span> With Us?
            </h2>
            <p className="text-xs text-gray-500 mt-1">Three ways we can make magic together</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4" data-testid="collaboration-types">
            {collaborationTypes.map((type, i) => {
              const colors = ['from-brand-yellow/20 to-brand-yellow/5', 'from-violet-500/20 to-violet-500/5', 'from-cyan-500/20 to-cyan-500/5'];
              const borders = ['border-brand-yellow/15', 'border-violet-500/15', 'border-cyan-500/15'];
              const textColors = ['text-brand-yellow', 'text-violet-400', 'text-cyan-400'];
              return (
                <motion.div
                  key={i}
                  data-testid={`collaboration-type-${i}`}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`group relative rounded-2xl bg-gradient-to-b ${colors[i]} border ${borders[i]} p-6 text-center cursor-default`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-black/40 border ${borders[i]} flex items-center justify-center mx-auto mb-3`}>
                    <type.icon className={`w-5 h-5 ${textColors[i]}`} />
                  </div>
                  <h3 className={`font-bold text-sm mb-1 ${textColors[i]}`}>{type.title}</h3>
                  <p className="text-[12px] text-gray-400 leading-relaxed">{type.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default WorkWithUs;