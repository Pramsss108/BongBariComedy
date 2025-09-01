import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type CollaborationRequest } from "@shared/schema";
import { 
  Mail, 
  Calendar, 
  Building, 
  Circle, 
  Eye, 
  EyeOff, 
  Download, 
  Filter,
  MessageSquare,
  Phone,
  X,
  CheckCircle,
  User
} from "lucide-react";

interface AdminLeadManagerProps {
  sessionId: string | null;
}

export const AdminLeadManager = ({ sessionId }: AdminLeadManagerProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openedFilter, setOpenedFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<CollaborationRequest | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [followUpNotes, setFollowUpNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query parameters for filtering
  const queryParams: any = {};
  if (statusFilter !== 'all') queryParams.leadStatus = statusFilter;
  if (openedFilter !== 'all') queryParams.opened = openedFilter;

  const { data: collaborationRequests, isLoading: requestsLoading } = useQuery<CollaborationRequest[]>({
    queryKey: ['/api/collaboration-requests', queryParams],
    refetchInterval: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Mark lead as opened
  const markOpenedMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/collaboration-requests/${id}/open`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration-requests'] });
    }
  });

  // Update lead status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, leadStatus }: { id: string; leadStatus: string }) => 
      apiRequest(`/api/collaboration-requests/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ leadStatus }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration-requests'] });
      toast({
        title: "Status Updated",
        description: "Lead status has been updated successfully.",
      });
    }
  });

  // Update follow-up notes
  const updateFollowUpMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => 
      apiRequest(`/api/collaboration-requests/${id}/follow-up`, {
        method: 'PUT',
        body: JSON.stringify({ followUpNotes: notes }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration-requests'] });
      toast({
        title: "Notes Saved",
        description: "Follow-up notes have been saved successfully.",
      });
      setFollowUpNotes('');
    }
  });

  const handleOpenLead = (lead: CollaborationRequest) => {
    setSelectedLead(lead);
    setFollowUpNotes(lead.followUpNotes || '');
    if (!lead.opened) {
      markOpenedMutation.mutate(lead.id);
    }
  };

  const handleStatusChange = (id: string, leadStatus: string) => {
    updateStatusMutation.mutate({ id, leadStatus });
  };

  const handleSaveFollowUp = () => {
    if (selectedLead) {
      updateFollowUpMutation.mutate({ id: selectedLead.id, notes: followUpNotes });
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('leadStatus', statusFilter);
    if (selectedLeads.size > 0) {
      Array.from(selectedLeads).forEach(id => params.append('ids', id));
    }
    
    const url = `/api/collaboration-requests/export?${params.toString()}`;
    window.open(url, '_blank');
  };

  const toggleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  const selectAllLeads = () => {
    if (collaborationRequests) {
      if (selectedLeads.size === collaborationRequests.length) {
        setSelectedLeads(new Set());
      } else {
        setSelectedLeads(new Set(collaborationRequests.map(r => r.id)));
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hot':
        return <Circle className="w-3 h-3 fill-red-500 text-red-500" />;
      case 'warm':
        return <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />;
      case 'cold':
        return <Circle className="w-3 h-3 fill-blue-300 text-blue-300" />;
      case 'dead':
        return <X className="w-3 h-3 text-gray-500" />;
      default:
        return <Circle className="w-3 h-3 fill-green-500 text-green-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-green-100 text-green-800',
      'hot': 'bg-red-100 text-red-800',
      'warm': 'bg-yellow-100 text-yellow-800',
      'cold': 'bg-blue-100 text-blue-800',
      'dead': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

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
      {/* Filters and Actions Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">
                  <div className="flex items-center gap-2">
                    {getStatusIcon('new')} New
                  </div>
                </SelectItem>
                <SelectItem value="hot">
                  <div className="flex items-center gap-2">
                    {getStatusIcon('hot')} Hot
                  </div>
                </SelectItem>
                <SelectItem value="warm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon('warm')} Warm
                  </div>
                </SelectItem>
                <SelectItem value="cold">
                  <div className="flex items-center gap-2">
                    {getStatusIcon('cold')} Cold
                  </div>
                </SelectItem>
                <SelectItem value="dead">
                  <div className="flex items-center gap-2">
                    {getStatusIcon('dead')} Dead
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={openedFilter} onValueChange={setOpenedFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Leads" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leads</SelectItem>
                <SelectItem value="false">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-3 h-3" /> Unopened
                  </div>
                </SelectItem>
                <SelectItem value="true">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3" /> Opened
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {selectedLeads.size > 0 && (
              <Badge variant="secondary">
                {selectedLeads.size} selected
              </Badge>
            )}
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!collaborationRequests || collaborationRequests.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {collaborationRequests && collaborationRequests.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedLeads.size === collaborationRequests.length}
              onCheckedChange={selectAllLeads}
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        )}
      </div>

      {/* Leads List */}
      {requestsLoading ? (
        <div className="grid gap-4">
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
        <div className="grid gap-4">
          {collaborationRequests.map((request) => (
            <Card 
              key={request.id} 
              className={`transition-all ${request.opened ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedLeads.has(request.id)}
                      onCheckedChange={() => toggleSelectLead(request.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(request.leadStatus || 'new')}
                        <CardTitle className="text-lg text-brand-blue">
                          {request.name}
                        </CardTitle>
                        {!request.opened && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <EyeOff className="w-3 h-3 mr-1" />
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        {request.email && (
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {request.email}
                          </div>
                        )}
                        {request.phone && (
                          <div className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {request.phone}
                          </div>
                        )}
                        {request.company && (
                          <div className="flex items-center">
                            <Building className="w-3 h-3 mr-1" />
                            {request.company}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(request.leadStatus || 'new')}>
                      {request.leadStatus || 'new'}
                    </Badge>
                    <Select 
                      value={request.leadStatus || 'new'}
                      onValueChange={(value) => handleStatusChange(request.id, value)}
                    >
                      <SelectTrigger className="w-[100px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="dead">Dead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 justify-between items-start">
                  <p className="text-sm text-gray-700 line-clamp-2 flex-1">
                    {request.message || 'No message provided'}
                  </p>
                  <Button
                    onClick={() => handleOpenLead(request)}
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                </div>
                {request.followUpNotes && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                    <strong className="text-yellow-800">Follow-up:</strong> {request.followUpNotes}
                  </div>
                )}
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

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLead && getStatusIcon(selectedLead.leadStatus || 'new')}
              Lead Details: {selectedLead?.name}
            </DialogTitle>
            <DialogDescription>
              View and manage lead information
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{selectedLead.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm">{selectedLead.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-sm">{selectedLead.company || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-sm">{formatDate(selectedLead.createdAt)}</p>
                </div>
                {selectedLead.openedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Opened</label>
                    <p className="text-sm">{formatDate(selectedLead.openedAt)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Select 
                    value={selectedLead.leadStatus || 'new'}
                    onValueChange={(value) => {
                      handleStatusChange(selectedLead.id, value);
                      setSelectedLead({ ...selectedLead, leadStatus: value as any });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="hot">Hot Lead</SelectItem>
                      <SelectItem value="warm">Warm Lead</SelectItem>
                      <SelectItem value="cold">Cold Lead</SelectItem>
                      <SelectItem value="dead">Dead Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <div className="mt-1 p-3 bg-gray-50 rounded">
                  <p className="text-sm whitespace-pre-wrap">{selectedLead.message || 'No message provided'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Follow-up Notes</label>
                <Textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Add follow-up notes, next steps, or important information..."
                  className="mt-1"
                  rows={4}
                />
                <Button
                  onClick={handleSaveFollowUp}
                  className="mt-2"
                  disabled={updateFollowUpMutation.isPending}
                >
                  {updateFollowUpMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};