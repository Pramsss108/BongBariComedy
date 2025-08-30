import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/seo-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Building, User } from "lucide-react";
import type { CollaborationRequest } from "@shared/schema";

const Admin = () => {
  const { data: collaborationRequests, isLoading } = useQuery<CollaborationRequest[]>({
    queryKey: ['/api/collaboration-requests'],
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <SEOHead
        title="Admin - Collaboration Leads | Bong Bari"
        description="Admin panel to view collaboration requests and brand partnership inquiries for Bong Bari."
      />
      
      <main className="py-16 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-center text-brand-blue mb-4" data-testid="page-title">
              Admin Panel
            </h1>
            <h2 className="text-2xl font-bold text-center text-brand-blue mb-12 bangla-text" data-testid="page-title-bengali">
              অ্যাডমিন প্যানেল
            </h2>
            
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-brand-blue mb-6">
                Collaboration Requests
              </h3>
              
              {isLoading ? (
                <div className="grid gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                        <div className="h-20 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : collaborationRequests && collaborationRequests.length > 0 ? (
                <div className="grid gap-6" data-testid="collaboration-requests-list">
                  {collaborationRequests.map((request) => (
                    <Card key={request.id} className="bg-white shadow-lg hover-lift">
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl text-brand-blue">
                            {request.name}
                          </CardTitle>
                          <Badge variant="secondary" className="bg-brand-yellow text-brand-blue">
                            New Lead
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            <a href={`mailto:${request.email}`} className="hover:text-brand-blue">
                              {request.email}
                            </a>
                          </div>
                          {request.company && (
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {request.company}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(request.createdAt)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Message:</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {request.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-xl font-semibold text-gray-600 mb-2">
                      No collaboration requests yet
                    </h4>
                    <p className="text-gray-500">
                      When people submit the collaboration form, their requests will appear here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Page refreshes automatically every 30 seconds to show new leads
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Admin;