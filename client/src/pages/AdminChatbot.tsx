import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, MessageSquare, Save } from "lucide-react";

export default function AdminChatbot() {
  const DEFAULT_T1 = "Collab korte chaile, Process ta ki?";
  const DEFAULT_T2 = "Brand sponsor hole kivabe kaj hoy?";
  const DEFAULT_T3 = "Mon bhalo na lagle halka Subscribe MARO";
  const DEFAULT_GREETING = "🙏 Hi! Ami Bong Bot — Bong Bari family‑te welcome.";
  const [trainingData, setTrainingData] = useState("");
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [template1, setTemplate1] = useState(DEFAULT_T1);
  const [template2, setTemplate2] = useState(DEFAULT_T2);
  const [template3, setTemplate3] = useState(DEFAULT_T3);
  const { toast } = useToast();

  const getCharCount = (text: string) => Array.from(text).length;
  const MAX_CHARS = 60;

  // On page load, fetch saved templates so the inputs match the DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiRequest('/api/chatbot/templates'); // public endpoint, deduped & limited to 3
        if (!Array.isArray(data) || cancelled) return;
        const by = new Map<number, any>();
        for (const t of data) by.set(t.displayOrder ?? 1, t);
        setTemplate1(by.get(1)?.content ?? DEFAULT_T1);
        setTemplate2(by.get(2)?.content ?? DEFAULT_T2);
        setTemplate3(by.get(3)?.content ?? DEFAULT_T3);
      } catch {
        // keep defaults on error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load existing training notepad from admin settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await apiRequest('/api/admin/settings');
        if (!Array.isArray(settings) || cancelled) return;
        const existing = settings.find((s: any) => s.settingKey === 'chatbot_training_notepad');
        if (existing?.settingValue) setTrainingData(existing.settingValue as string);
      } catch (_) {
        // ignore; keep empty default
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load Greeting template from admin templates (protected API)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const templates = await apiRequest('/api/admin/chatbot-templates');
        if (!Array.isArray(templates) || cancelled) return;
        const greet = templates.find((t: any) => t.templateType === 'greeting' && (t.displayOrder ?? 1) === 1);
        if (greet?.content) setGreeting(greet.content as string);
      } catch (_) {
        // ignore; keep default
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
            ...template, language: 'auto', isActive: true
          }),
          headers: { 'Content-Type': 'application/json' }
        })
      ));
    },
    onSuccess: () => toast({ title: "✅ Templates saved!" }),
    onError: () => toast({ title: "❌ Error saving", variant: "destructive" })
  });

  // Save Training Notes (admin setting)
  const saveTrainingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'chatbot_training_notepad',
          settingValue: trainingData,
          settingType: 'text',
          description: 'Bong Bot training notes (Title + bullet points). Used in AI prompt.',
          isPublic: false,
        }),
      });
    },
    onSuccess: () => toast({ title: '✅ Training notes saved!' }),
    onError: () => toast({ title: '❌ Error saving training notes', variant: 'destructive' }),
  });

  // Save Greeting Template (upsert by templateType+displayOrder)
  const saveGreetingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/chatbot-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Greeting',
          templateType: 'greeting',
          content: greeting,
          language: 'auto',
          isActive: true,
          displayOrder: 1,
        }),
      });
    },
    onSuccess: () => toast({ title: '✅ Greeting saved!' }),
    onError: () => toast({ title: '❌ Error saving greeting', variant: 'destructive' }),
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">BongBot Management</h1>
      </div>

      {/* Training Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Bong Bot Training Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>Format: Paste notepad-style blocks — a Title line followed by bullet points.</p>
            <ul className="list-disc ml-5">
              <li>Example:
                <div className="mt-1 rounded-md bg-gray-50 p-2 text-xs text-gray-700">
                  GREETING{`\n`}
                  - Friendly one-liners for first hello{`\n`}
                  - Keep it short and witty{`\n`}
                  {`\n`}
                  ABOUT REPLY{`\n`}
                  - Who we are and what we do{`\n`}
                  - Collab value for brands (family connect)
                </div>
              </li>
            </ul>
          </div>

          <Textarea
            value={trainingData}
            onChange={(e) => setTrainingData(e.target.value)}
            placeholder={"GREETING\n- ...\n- ...\n\nABOUT REPLY\n- ...\n- ..."}
            rows={12}
          />

          <Button onClick={() => saveTrainingMutation.mutate()} disabled={saveTrainingMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saveTrainingMutation.isPending ? 'Saving...' : 'Save Training Notes'}
          </Button>

          <div className="text-xs text-gray-500">
            These notes are injected into the AI prompt to guide replies. Keep them concise and bullet-y for best results.
          </div>
        </CardContent>
      </Card>

      {/* Greeting Template (same pattern as Quick Replies) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Greeting Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">This is used for first “hello”. Keep it short and welcoming.</p>
          <div>
            <label className="text-sm font-medium">Greeting</label>
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={() => saveGreetingMutation.mutate()} disabled={saveGreetingMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saveGreetingMutation.isPending ? 'Saving...' : 'Save Greeting'}
          </Button>
        </CardContent>
      </Card>

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
}