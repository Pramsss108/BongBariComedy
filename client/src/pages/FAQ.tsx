import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MessageCircle, Users, Video, Phone, Info } from 'lucide-react';
import { useLocation } from 'wouter';

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
      
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-orange-600 via-yellow-500 to-pink-500 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            🤔 Frequently Asked Questions
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
            Everything you need to know about Bong Bari Comedy, our content, and how we work
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-gray-400 text-xl">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 text-lg focus:outline-none focus:ring-4 focus:ring-orange-300 shadow-lg"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Categories - Mobile Horizontal Scroll, Desktop Fixed */}
          <div className="lg:w-80">
            <div className="lg:sticky lg:top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Categories</h2>
              
              {/* Mobile: Horizontal scroll */}
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap lg:whitespace-normal lg:w-full ${
                    selectedCategory === 'all'
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <span className="text-orange-600">🔍</span>
                  All Questions ({faqData.length})
                </button>
                
                {faqCategories.map(category => {
                  const count = faqData.filter(item => item.category === category.id).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap lg:whitespace-normal lg:w-full ${
                        selectedCategory === category.id
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                          : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-200'
                      }`}
                    >
                      <span className={category.color}>{category.icon}</span>
                      {category.title} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FAQ Content - ONLY THIS PART IN SCROLLABLE CONTAINER */}
          <div className="flex-1">
            {/* Container for FAQ Questions Only */}
            <div 
              className="bg-white rounded-xl shadow-lg border border-gray-200 custom-scrollbar"
              style={{
                maxHeight: "70vh",
                overflowY: "auto",
                padding: "1.5rem",
                scrollBehavior: "smooth"
              }}
            >
              
              {/* Add custom scrollbar styles */}
              <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f1f5f9;
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
                .custom-scrollbar {
                  scrollbar-width: thin;
                  scrollbar-color: #cbd5e1 #f1f5f9;
                }
              `}</style>

              <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-600">
                  Showing {displayedFAQs.length} of {filteredFAQs.length} question{filteredFAQs.length !== 1 ? 's' : ''} 
                  {selectedCategory !== 'all' && ` in ${faqCategories.find(c => c.id === selectedCategory)?.title}`}
                  {searchTerm && ` matching "${searchTerm}"`}
                </p>
                
                {/* Google-style Quick Stats */}
                {selectedCategory === 'all' && !searchTerm && (
                  <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      📊 {filteredFAQs.length} Total FAQs
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      ⚡ {displayedFAQs.length} Showing
                    </span>
                  </div>
                )}
              </div>

              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🤔</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No questions found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or browse different categories
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {displayedFAQs.map((item, index) => {
                      const isExpanded = expandedItems.includes(item.id);
                      const category = faqCategories.find(c => c.id === item.category);
                      
                      return (
                        <div
                          key={item.id}
                          className="bg-gray-50 rounded-xl shadow-sm border-2 border-gray-100 hover:border-orange-200 transition-all"
                          style={{ 
                            animationDelay: `${index * 50}ms`,
                            animation: 'fadeIn 0.3s ease-out forwards'
                          }}
                        >
                          <button
                            onClick={() => toggleExpanded(item.id)}
                            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-gray-100 rounded-xl transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <span className={`${category?.color} flex-shrink-0 mt-1`}>
                                {category?.icon}
                              </span>
                              <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                                {item.question}
                              </h3>
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-orange-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-6 pb-6">
                              <div className="pl-8 border-l-4 border-orange-200">
                                <p className="text-gray-700 leading-relaxed text-base">
                                  {item.answer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Google-style: Smart Load More/Less Controls */}
                  {(hasMoreQuestions || canShowLess) && (
                    <div className="mt-8 text-center">
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                        {hasMoreQuestions && (
                          <div className="mb-4">
                            <button
                              onClick={handleShowMore}
                              className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all transform hover:scale-105 shadow-lg"
                            >
                              📄 Show More Questions ({filteredFAQs.length - displayedFAQs.length} remaining)
                            </button>
                            <p className="text-gray-600 mt-2 text-sm">
                              Loading in batches like Google for better performance
                            </p>
                          </div>
                        )}
                        
                        {canShowLess && (
                          <div>
                            <button
                              onClick={handleShowLess}
                              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all border border-gray-300"
                            >
                              ⬆️ Show Less (Back to Top 6)
                            </button>
                            <p className="text-gray-500 mt-2 text-sm">
                              Minimize for easier browsing
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-600 to-yellow-500 text-white py-12 px-4 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Still have questions? 🤔
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Can't find what you're looking for? Our AI chatbot and support team are here to help!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleChatWithBot}
              className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Chat with AI Bot
            </button>
            <button 
              onClick={handleContactSupport}
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}