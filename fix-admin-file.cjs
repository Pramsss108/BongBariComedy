const fs = require('fs');

const adminChatbotContent = `import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, MessageSquare, Save } from "lucide-react";

export default function AdminChatbot() {
  const [trainingData, setTrainingData] = useState("");
  const [template1, setTemplate1] = useState("Collab korte chaile, Process ta ki?");
  const [template2, setTemplate2] = useState("Brand sponsor hole kivabe kaj hoy?");
  const [template3, setTemplate3] = useState("Mon bhalo na lagle halka Subscribe MARO");
  const { toast } = useToast();

  const getCharCount = (text) => Array.from(text).length;
  const MAX_CHARS = 60;

  const saveTemplatesMutation = useMutation({
    mutationFn: async () => {
      const templates = [
        { name: "Quick Reply 1", templateType: "quick_reply", content: template1, displayOrder: 1 },
        { name: "Quick Reply 2", templateType: "quick_reply", content: template2, displayOrder: 2 },
        { name: "Quick Reply 3", templateType: "quick_reply", content: template3, displayOrder: 3 }
      ];
      return Promise.all(templates.map(template => 
        apiRequest("/api/admin/chatbot-templates", { 
          method: "POST", 
          body: JSON.stringify({
            ...template, language: 'auto', isActive: true, validFrom: new Date().toISOString()
          }) 
        })
      ));
    },
    onSuccess: () => toast({ title: "✅ Templates saved!" }),
    onError: () => toast({ title: "❌ Error saving", variant: "destructive" })
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">BongBot Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Quick Reply Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">Max 60 characters each</p>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Template 1 ({getCharCount(template1)}/{MAX_CHARS})</label>
              <Textarea
                value={template1}
                onChange={(e) => setTemplate1(e.target.value)}
                rows={2}
                className={getCharCount(template1) > MAX_CHARS ? "border-red-500" : ""}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Template 2 ({getCharCount(template2)}/{MAX_CHARS})</label>
              <Textarea
                value={template2}
                onChange={(e) => setTemplate2(e.target.value)}
                rows={2}
                className={getCharCount(template2) > MAX_CHARS ? "border-red-500" : ""}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Template 3 ({getCharCount(template3)}/{MAX_CHARS})</label>
              <Textarea
                value={template3}
                onChange={(e) => setTemplate3(e.target.value)}
                rows={2}
                className={getCharCount(template3) > MAX_CHARS ? "border-red-500" : ""}
              />
            </div>
          </div>
          
          <Button 
            onClick={() => saveTemplatesMutation.mutate()}
            disabled={
              saveTemplatesMutation.isPending || 
              getCharCount(template1) > MAX_CHARS || 
              getCharCount(template2) > MAX_CHARS || 
              getCharCount(template3) > MAX_CHARS
            }
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveTemplatesMutation.isPending ? "Saving..." : "Save Templates"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}`;

// Delete old file and create new one
try {
  fs.unlinkSync('client/src/pages/AdminChatbot.tsx');
} catch (e) {
  // File might not exist
}

fs.writeFileSync('client/src/pages/AdminChatbot.tsx', adminChatbotContent, 'utf8');
console.log('AdminChatbot.tsx recreated successfully');