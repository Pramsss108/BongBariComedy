import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus, Edit, Eye, Bot, MessageSquare, Settings } from "lucide-react";

interface ChatbotTraining {
  id: number;
  keyword: string;
  userMessage: string;
  botResponse: string;
  language: string;
  category: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotTemplate {
  id: number;
  name: string;
  templateType: string;
  content: string;
  language: string;
  isActive: boolean;
  displayOrder: number;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminChatbot() {
  const [editingTraining, setEditingTraining] = useState<ChatbotTraining | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ChatbotTemplate | null>(null);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chatbot training data
  const { data: trainingData = [], isLoading: isLoadingTraining } = useQuery({
    queryKey: ["/api/admin/chatbot-training"],
  });

  // Fetch chatbot templates
  const { data: templatesData = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["/api/admin/chatbot-templates"],
  });

  // Training mutations
  const createTrainingMutation = useMutation({
    mutationFn: (data: Partial<ChatbotTraining>) => apiRequest("/api/admin/chatbot-training", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-training"] });
      setIsTrainingDialogOpen(false);
      setEditingTraining(null);
      toast({ title: "✅ Training data created successfully!" });
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ChatbotTraining> & { id: number }) => 
      apiRequest(`/api/admin/chatbot-training/${id}`, { method: "PUT", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-training"] });
      setIsTrainingDialogOpen(false);
      setEditingTraining(null);
      toast({ title: "✅ Training data updated successfully!" });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/chatbot-training/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-training"] });
      toast({ title: "🗑️ Training data deleted successfully!" });
    },
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: Partial<ChatbotTemplate>) => apiRequest("/api/admin/chatbot-templates", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-templates"] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast({ title: "✅ Template created successfully!" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ChatbotTemplate> & { id: number }) => 
      apiRequest(`/api/admin/chatbot-templates/${id}`, { method: "PUT", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-templates"] });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      toast({ title: "✅ Template updated successfully!" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/chatbot-templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/chatbot-templates"] });
      toast({ title: "🗑️ Template deleted successfully!" });
    },
  });

  const handleTrainingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      keyword: formData.get("keyword") as string,
      userMessage: formData.get("userMessage") as string,
      botResponse: formData.get("botResponse") as string,
      language: formData.get("language") as string,
      category: formData.get("category") as string,
      isActive: formData.get("isActive") === "on",
      priority: parseInt(formData.get("priority") as string),
    };

    if (editingTraining) {
      updateTrainingMutation.mutate({ id: editingTraining.id, ...data });
    } else {
      createTrainingMutation.mutate(data);
    }
  };

  const handleTemplateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      templateType: formData.get("templateType") as string,
      content: formData.get("content") as string,
      language: formData.get("language") as string,
      isActive: formData.get("isActive") === "on",
      displayOrder: parseInt(formData.get("displayOrder") as string),
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Bot className="h-10 w-10 text-blue-600" />
            Bong Bot Management
          </h1>
          <p className="text-gray-600">Train your AI chatbot and manage templates</p>
        </div>

        <Tabs defaultValue="training" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="training" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Training Data
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* TRAINING DATA TAB */}
          <TabsContent value="training" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Chatbot Training Data</h2>
                <p className="text-gray-600">Teach Bong Bot specific responses to keywords</p>
              </div>
              <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-training">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Training Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTraining ? "Edit" : "Add"} Training Data</DialogTitle>
                    <DialogDescription>
                      Train the chatbot to respond to specific keywords or phrases
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleTrainingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="keyword">Keyword</Label>
                        <Input
                          id="keyword"
                          name="keyword"
                          placeholder="collaboration, comedy, maa"
                          defaultValue={editingTraining?.keyword}
                          required
                          data-testid="input-keyword"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority (1-10)</Label>
                        <Input
                          id="priority"
                          name="priority"
                          type="number"
                          min="1"
                          max="10"
                          defaultValue={editingTraining?.priority || 5}
                          required
                          data-testid="input-priority"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="userMessage">User Message Example</Label>
                      <Input
                        id="userMessage"
                        name="userMessage"
                        placeholder="What about collaboration?"
                        defaultValue={editingTraining?.userMessage}
                        required
                        data-testid="input-user-message"
                      />
                    </div>
                    <div>
                      <Label htmlFor="botResponse">Bot Response</Label>
                      <Textarea
                        id="botResponse"
                        name="botResponse"
                        placeholder="আমরা brand collaboration করি! Visit our collaboration page for more details."
                        defaultValue={editingTraining?.botResponse}
                        rows={3}
                        required
                        data-testid="textarea-bot-response"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select name="language" defaultValue={editingTraining?.language || "auto"}>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto Detect</SelectItem>
                            <SelectItem value="bengali">Bengali</SelectItem>
                            <SelectItem value="benglish">Benglish</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" defaultValue={editingTraining?.category || "general"}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="comedy">Comedy</SelectItem>
                            <SelectItem value="collaboration">Collaboration</SelectItem>
                            <SelectItem value="culture">Culture</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="isActive"
                          name="isActive"
                          defaultChecked={editingTraining?.isActive !== false}
                          data-testid="checkbox-is-active"
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-save-training">
                        {editingTraining ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingTraining ? (
              <div className="text-center py-8">Loading training data...</div>
            ) : (
              <div className="grid gap-4">
                {trainingData.map((training: ChatbotTraining) => (
                  <Card key={training.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={training.isActive ? "default" : "secondary"}>
                              {training.keyword}
                            </Badge>
                            <Badge variant="outline">{training.language}</Badge>
                            <Badge variant="outline">Priority: {training.priority}</Badge>
                            <Badge variant="outline">{training.category}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>User:</strong> {training.userMessage}
                          </p>
                          <p className="text-sm">
                            <strong>Bot:</strong> {training.botResponse}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTraining(training);
                              setIsTrainingDialogOpen(true);
                            }}
                            data-testid={`button-edit-training-${training.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTrainingMutation.mutate(training.id)}
                            data-testid={`button-delete-training-${training.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Chatbot Templates</h2>
                <p className="text-gray-600">Manage greetings, quick replies, and offers</p>
              </div>
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-template">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit" : "Add"} Template</DialogTitle>
                    <DialogDescription>
                      Create reusable templates for greetings, quick replies, and offers
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleTemplateSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Welcome Greeting"
                          defaultValue={editingTemplate?.name}
                          required
                          data-testid="input-template-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="templateType">Template Type</Label>
                        <Select name="templateType" defaultValue={editingTemplate?.templateType || "greeting"}>
                          <SelectTrigger data-testid="select-template-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="greeting">Greeting</SelectItem>
                            <SelectItem value="quick_reply">Quick Reply</SelectItem>
                            <SelectItem value="offer">Offer</SelectItem>
                            <SelectItem value="fallback">Fallback</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="content">Template Content</Label>
                      <Textarea
                        id="content"
                        name="content"
                        placeholder="🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!"
                        defaultValue={editingTemplate?.content}
                        rows={3}
                        required
                        data-testid="textarea-template-content"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select name="language" defaultValue={editingTemplate?.language || "auto"}>
                          <SelectTrigger data-testid="select-template-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="bengali">Bengali</SelectItem>
                            <SelectItem value="benglish">Benglish</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="displayOrder">Display Order</Label>
                        <Input
                          id="displayOrder"
                          name="displayOrder"
                          type="number"
                          min="1"
                          defaultValue={editingTemplate?.displayOrder || 1}
                          required
                          data-testid="input-display-order"
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id="templateIsActive"
                          name="isActive"
                          defaultChecked={editingTemplate?.isActive !== false}
                          data-testid="checkbox-template-is-active"
                        />
                        <Label htmlFor="templateIsActive">Active</Label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-save-template">
                        {editingTemplate ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingTemplates ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : (
              <div className="grid gap-4">
                {templatesData.map((template: ChatbotTemplate) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.name}
                            </Badge>
                            <Badge variant="outline">{template.templateType}</Badge>
                            <Badge variant="outline">{template.language}</Badge>
                            <Badge variant="outline">Order: {template.displayOrder}</Badge>
                          </div>
                          <p className="text-sm">{template.content}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTemplate(template);
                              setIsTemplateDialogOpen(true);
                            }}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}