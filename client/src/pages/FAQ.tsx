import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle, Users, Video, Phone, Info } from 'lucide-react';
import { useLocation } from 'wouter';
import Footer from '@/components/footer';

// Add CSS for smooth animations
const pageStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .faq-item {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .loading-skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, transparent 37%, #f0f0f0 63%);
    background-size: 400% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const faqCategories: FAQCategory[] = [
  { id: 'about', title: 'About Bong Bari', icon: <Info className="w-5 h-5" />, color: 'text-orange-600' },
  { id: 'content', title: 'Content & Videos', icon: <Video className="w-5 h-5" />, color: 'text-blue-600' },
  { id: 'collaboration', title: 'Collaboration', icon: <Users className="w-5 h-5" />, color: 'text-green-600' },
  { id: 'audience', title: 'For Our Audience', icon: <MessageCircle className="w-5 h-5" />, color: 'text-purple-600' },
  { id: 'contact', title: 'Contact & Support', icon: <Phone className="w-5 h-5" />, color: 'text-red-600' }
];

const faqData: FAQItem[] = [
  // About Bong Bari Category
  {
    id: '1',
    category: 'about',
    question: 'What is Bong Bari Comedy?',
    answer: 'Bong Bari Comedy is a Bengali comedy channel dedicated to creating authentic, relatable, and hilarious content for Bengali audiences worldwide. We specialize in sketch comedy, parodies, and entertaining videos that celebrate Bengali culture and humor.'
  },
  {
    id: '2',
    category: 'about',
    question: 'Who is behind Bong Bari Comedy?',
    answer: 'Bong Bari Comedy is created by passionate Bengali content creators who understand the nuances of Bengali humor and culture. Our team consists of writers, actors, and video producers committed to delivering quality entertainment.'
  },
  {
    id: '3',
    category: 'about',
    question: 'What makes Bong Bari Comedy unique?',
    answer: 'We focus on authentic Bengali humor that resonates with both traditional and modern audiences. Our content bridges generational gaps while maintaining cultural authenticity, making us relatable to Bengalis across the globe.'
  },
  {
    id: '4',
    category: 'about',
    question: 'When did Bong Bari Comedy start?',
    answer: 'Bong Bari Comedy began its journey to bring quality Bengali comedy content to digital platforms. We have been consistently creating and sharing content that entertains and connects with our Bengali audience community.'
  },

  // Content & Videos Category
  {
    id: '5',
    category: 'content',
    question: 'What type of content do you create?',
    answer: 'We create sketch comedy videos, parodies, cultural commentary, festival specials, family-friendly humor, and relatable everyday situations that Bengali audiences can connect with. Our content ranges from traditional Bengali scenarios to modern-day situations.'
  },
  {
    id: '6',
    category: 'content',
    question: 'How often do you upload new videos?',
    answer: 'We strive to upload fresh content regularly to keep our audience entertained. Follow our YouTube channel and social media pages for the latest updates on new video releases and behind-the-scenes content.'
  },
  {
    id: '7',
    category: 'content',
    question: 'Can I suggest video ideas or topics?',
    answer: 'Absolutely! We love hearing from our audience. You can suggest video ideas through our social media channels, YouTube comments, or contact form. We value community input and often incorporate viewer suggestions into our content.'
  },
  {
    id: '8',
    category: 'content',
    question: 'Do you create content in English too?',
    answer: 'While our primary focus is Bengali content, we occasionally create bilingual content or add subtitles to reach a broader audience. Our main strength lies in authentic Bengali humor and cultural references.'
  },
  {
    id: '9',
    category: 'content',
    question: 'Are your videos family-friendly?',
    answer: 'Yes! We prioritize creating clean, family-friendly content that can be enjoyed by viewers of all ages. Our humor is wholesome and suitable for family viewing while maintaining its entertainment value.'
  },

  // Collaboration Category
  {
    id: '10',
    category: 'collaboration',
    question: 'Do you accept brand partnerships and sponsorships?',
    answer: 'Yes, we are open to brand collaborations that align with our content style and audience interests. We work with brands that resonate with Bengali culture and our community values. Contact us through our business inquiry channels for partnership opportunities.'
  },
  {
    id: '11',
    category: 'collaboration',
    question: 'How can I collaborate with Bong Bari Comedy?',
    answer: 'We welcome collaborations with other content creators, artists, musicians, and creative individuals. Whether you\'re interested in guest appearances, cross-promotions, or joint projects, reach out to us through our collaboration contact form or business email.'
  },
  {
    id: '12',
    category: 'collaboration',
    question: 'Do you work with upcoming artists and creators?',
    answer: 'Absolutely! We believe in supporting emerging talent in the Bengali creative community. If you\'re an upcoming artist, comedian, or content creator, we\'d love to explore collaboration opportunities that benefit both parties.'
  },
  {
    id: '13',
    category: 'collaboration',
    question: 'What are your collaboration rates and terms?',
    answer: 'Our collaboration terms vary based on the project scope, deliverables, and partnership type. We offer flexible arrangements including revenue sharing, fixed fees, or cross-promotional agreements. Contact us with your specific requirements for detailed discussions.'
  },

  // Audience Category
  {
    id: '14',
    category: 'audience',
    question: 'Who is your target audience?',
    answer: 'Our content is designed for Bengali speakers and Bengali culture enthusiasts worldwide. We cater to a diverse age group, from teenagers to adults, who appreciate authentic Bengali humor and cultural content.'
  },
  {
    id: '15',
    category: 'audience',
    question: 'How can I stay updated with your latest content?',
    answer: 'Subscribe to our YouTube channel, follow us on social media platforms (Facebook, Instagram, Twitter), and visit our website regularly. You can also enable notifications to get alerts for new video uploads and announcements.'
  },
  {
    id: '16',
    category: 'audience',
    question: 'Do you interact with your audience?',
    answer: 'Yes! We actively engage with our community through comments, social media interactions, live sessions, and community posts. We value our audience feedback and try to respond to comments and messages regularly.'
  },
  {
    id: '17',
    category: 'audience',
    question: 'Can I share your videos on social media?',
    answer: 'Absolutely! We encourage sharing our content on social media platforms. Please make sure to credit Bong Bari Comedy and include links to our original videos. Sharing helps us reach more Bengali comedy enthusiasts!'
  },

  // Contact & Support Category
  {
    id: '18',
    category: 'contact',
    question: 'How can I contact Bong Bari Comedy for business inquiries?',
    answer: 'For business inquiries, sponsorships, collaborations, or media requests, please use our dedicated business contact form on the "Work with Us" page or email us through our official business channels. We typically respond within 2-3 business days.'
  },
  {
    id: '19',
    category: 'contact',
    question: 'Do you respond to fan messages and emails?',
    answer: 'We appreciate all fan messages and try our best to respond when possible. While we may not be able to reply to every message individually due to volume, we read and value all feedback from our community.'
  },
  {
    id: '20',
    category: 'contact',
    question: 'Where can I find your latest updates and announcements?',
    answer: 'Follow our official social media accounts and website for the latest updates, announcements, behind-the-scenes content, and upcoming project news. We regularly post updates about new videos, collaborations, and community events.'
  },
  {
    id: '21',
    category: 'contact',
    question: 'How can I report technical issues with your website or videos?',
    answer: 'If you encounter any technical issues with our website, video playback, or other technical problems, please contact us through our support channels with details about the issue, your device/browser information, and screenshots if applicable.'
  }
];

export default function FAQ() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState(6); // Google-style: Show 6 initially
  const [isShowingAll, setIsShowingAll] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Google-style: Smart display logic
  const displayedFAQs = isShowingAll || searchTerm || selectedCategory !== 'all' 
    ? filteredFAQs 
    : filteredFAQs.slice(0, displayLimit);

  const hasMoreQuestions = !isShowingAll && !searchTerm && selectedCategory === 'all' && filteredFAQs.length > displayLimit;
  const canShowLess = (isShowingAll || displayLimit > 6) && !searchTerm && selectedCategory === 'all';

  const handleShowMore = () => {
    if (displayLimit >= filteredFAQs.length) {
      setIsShowingAll(true);
    } else {
      setDisplayLimit(prev => prev + 6); // Load 6 more like Google
    }
  };

  const handleShowLess = () => {
    setDisplayLimit(6);
    setIsShowingAll(false);
    // Scroll to top of FAQ section smoothly
    setTimeout(() => {
      document.querySelector('.faq-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Handler for Chat with AI Bot button
  const handleChatWithBot = () => {
    // Trigger the floating chatbot
    const chatEvent = new CustomEvent('openChatbot', { 
      detail: { message: 'Hi! I have a question from the FAQ page.' }
    });
    window.dispatchEvent(chatEvent);
  };

  // Handler for Contact Support button
  const handleContactSupport = () => {
    // Navigate to Work with Us page
    navigate('/work-with-us');
  };

  return (
    <>
      <style>{pageStyles}</style>
      
    <div className="min-h-screen bg-[#050505] text-white relative">
      {/* Premium Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-yellow/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto relative z-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-yellow to-yellow-600">FAQ</span>
          </h1>
          <p className="text-xl text-gray-400">Everything you need to know about Bong Bari Comedy</p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-brand-yellow/50 via-brand-yellow/20 to-brand-yellow/50">
            <div className="relative rounded-2xl bg-black/80 backdrop-blur-xl border border-white/5">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-brand-yellow" />
              </div>
              <input
                type="text"
                placeholder="Search for questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-5 py-4 rounded-2xl bg-transparent text-white text-lg focus:outline-none placeholder:text-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Categories */}
          <div className="lg:w-72 shrink-0">
            <div className="lg:sticky lg:top-8 space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Categories</h2>
              
              {/* Mobile: Horizontal scroll */}
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap lg:whitespace-normal lg:w-full text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30'
                      : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  All ({faqData.length})
                </button>
                
                {faqCategories.map(category => {
                  const count = faqData.filter(item => item.category === category.id).length;
                  const catColors: Record<string, string> = {
                    about: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    content: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    collaboration: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                    audience: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                    contact: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                  };
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap lg:whitespace-normal lg:w-full text-sm ${
                        selectedCategory === category.id
                          ? `${catColors[category.id]} border`
                          : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span>{category.icon}</span>
                      {category.title} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-sm text-gray-500">
                Showing {displayedFAQs.length} of {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''}
                {selectedCategory !== 'all' && ` in ${faqCategories.find(c => c.id === selectedCategory)?.title}`}
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
            </div>

            {filteredFAQs.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🤔</div>
                <h3 className="text-xl font-semibold text-white mb-2">No questions found</h3>
                <p className="text-gray-500">Try adjusting your search terms or browse different categories</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {displayedFAQs.map((item, index) => {
                    const isExpanded = expandedItems.includes(item.id);
                    const category = faqCategories.find(c => c.id === item.category);
                    const borderColors: Record<string, string> = {
                      about: 'from-orange-500/40 via-orange-500/20 to-orange-500/40',
                      content: 'from-blue-500/40 via-blue-500/20 to-blue-500/40',
                      collaboration: 'from-emerald-500/40 via-emerald-500/20 to-emerald-500/40',
                      audience: 'from-violet-500/40 via-violet-500/20 to-violet-500/40',
                      contact: 'from-rose-500/40 via-rose-500/20 to-rose-500/40',
                    };
                    const accentColors: Record<string, string> = {
                      about: 'border-orange-500/30',
                      content: 'border-blue-500/30',
                      collaboration: 'border-emerald-500/30',
                      audience: 'border-violet-500/30',
                      contact: 'border-rose-500/30',
                    };
                    
                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-[1px] bg-gradient-to-br ${borderColors[item.category] || 'from-white/10 via-white/5 to-white/10'} transition-all duration-300`}
                        style={{ animationDelay: `${index * 50}ms`, animation: 'fadeIn 0.3s ease-out forwards' }}
                      >
                        <div className={`rounded-2xl bg-black/80 backdrop-blur-xl border border-white/5 overflow-hidden ${isExpanded ? 'bg-black/60' : ''} transition-colors`}>
                          <button
                            onClick={() => toggleExpanded(item.id)}
                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <span className="flex-shrink-0 mt-0.5 opacity-60">{category?.icon}</span>
                              <h3 className="font-semibold text-white text-base leading-snug">
                                {item.question}
                              </h3>
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-brand-yellow" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-6 pb-6">
                              <div className={`pl-8 border-l-2 ${accentColors[item.category] || 'border-white/10'}`}>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                  {item.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show More/Less */}
                {(hasMoreQuestions || canShowLess) && (
                  <div className="mt-8 text-center space-y-3">
                    {hasMoreQuestions && (
                      <button
                        onClick={handleShowMore}
                        className="bg-brand-yellow/20 border border-brand-yellow/30 text-brand-yellow px-8 py-3 rounded-xl font-semibold hover:bg-yellow-600 hover:text-white transition-all shadow-lg"
                      >
                        Show More ({filteredFAQs.length - displayedFAQs.length} remaining)
                      </button>
                    )}
                    {canShowLess && (
                      <button
                        onClick={handleShowLess}
                        className="bg-white/5 text-gray-400 px-6 py-2 rounded-lg font-medium hover:bg-white/10 transition-all border border-white/10 ml-3"
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20">
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-brand-yellow/50 via-brand-yellow/30 to-brand-yellow/50 shadow-2xl">
            <div className="rounded-2xl bg-black/80 backdrop-blur-xl p-10 md:p-14 text-center border border-white/5">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Can't find what you're looking for? Our AI chatbot and support team are here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleChatWithBot}
                  className="bg-brand-yellow/20 border border-brand-yellow/30 text-brand-yellow px-8 py-3 rounded-xl font-semibold hover:bg-yellow-600 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat with AI Bot
                </button>
                <button 
                  onClick={handleContactSupport}
                  className="bg-white/5 border border-white/10 text-gray-300 px-8 py-3 rounded-xl font-semibold hover:bg-white/10 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
    </>
  );
}