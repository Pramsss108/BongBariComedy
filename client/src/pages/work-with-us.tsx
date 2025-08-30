import SEOHead from "@/components/seo-head";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const WorkWithUs = () => {
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
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-center text-brand-blue mb-4" data-testid="page-title-english">
              Work with Us
            </h1>
            <h2 className="text-3xl font-bold text-center text-brand-blue mb-12 bangla-text" data-testid="page-title-bengali">
              আমাদের সাথে কাজ করুন
            </h2>
            
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
                    <div 
                      key={index}
                      className="text-center p-4 bg-brand-yellow rounded-lg"
                      data-testid={`collaboration-type-${index}`}
                    >
                      <h4 className="font-semibold text-brand-blue mb-2">{type.title}</h4>
                      <p className="text-sm text-gray-700">{type.description}</p>
                    </div>
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
                
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center" data-testid="form-placeholder">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Google Form Integration</h4>
                  <p className="text-gray-500 mb-4">Collaboration inquiry form will be embedded here</p>
                  <Button 
                    className="bg-brand-blue text-white hover:bg-blue-700"
                    onClick={handleFormClick}
                    data-testid="button-form"
                  >
                    Fill Collaboration Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
};

export default WorkWithUs;
