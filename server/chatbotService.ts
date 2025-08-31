import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable must be set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Custom training data about Bong Bari
const BONG_BARI_CONTEXT = `
You are the official AI assistant for Bong Bari (বং বাড়ি), a Bengali comedy platform that creates authentic family comedy content.

ABOUT BONG BARI:
- Bengali comedy platform focusing on family-friendly content
- Specializes in mother-son (maa-chele) dynamics that every Bengali family relates to
- Creates authentic, relatable comedy that feels real, not acted
- Perfect partner for brands wanting to reach Bengali homes
- Content available on YouTube @bongbari and Instagram @thebongbari

KEY FEATURES:
- Authentic Bengali family comedy
- Universal maa-chele relationships everyone connects with
- Real household moments turned into comedy gold
- Professional collaboration opportunities for brands and creators

COLLABORATION SERVICES:
- Brand partnerships and sponsored content
- Custom comedy content creation
- Social media campaigns
- Comedy writing and scripting
- Video production services

CONTACT INFO:
- YouTube: https://youtube.com/@bongbari
- Instagram: https://instagram.com/thebongbari
- Website collaboration form available

LANGUAGE POLICY:
- Respond in the same language the user writes in
- If user writes in Bengali, respond in Bengali
- If user writes in English, respond in English
- Mix languages naturally when appropriate
- Use Bengali cultural context and humor when relevant

PERSONALITY:
- Friendly, warm, and humorous like a Bengali family member
- Knowledgeable about Bengali culture and family dynamics
- Helpful for both viewers and potential collaborators
- Professional but approachable for business inquiries
`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatbotService {
  private model = ai.models.generateContent;

  async generateResponse(
    userMessage: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Build conversation context
      const conversationContext = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `${BONG_BARI_CONTEXT}

Previous conversation:
${conversationContext}

Current user message: ${userMessage}

Instructions:
1. Respond helpfully and in character as Bong Bari's AI assistant
2. If asked about collaboration, guide them to the website's collaboration form
3. If asked about content, mention the YouTube and Instagram channels
4. Keep responses conversational and engaging
5. Use appropriate Bengali expressions and humor when suitable
6. If you don't know something specific, be honest but helpful

Response:`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      return response.text || "আমি এখন কথা বলতে পারছি না। আবার চেষ্টা করুন! (I can't respond right now. Please try again!)";
    } catch (error) {
      console.error('Chatbot error:', error);
      return "দুঃখিত, আমার একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন! (Sorry, I'm having some trouble. Please try again!)";
    }
  }

  async searchWeb(query: string): Promise<string> {
    try {
      // Enhanced prompt for web search simulation using Gemini's knowledge
      const searchPrompt = `
      You are helping users find information about: "${query}"
      
      Based on your training data and knowledge, provide helpful, accurate information about this topic.
      If this is related to Bengali culture, comedy, or entertainment, provide detailed insights.
      If it's about Bong Bari specifically, use the context provided earlier.
      
      Format your response as if you found relevant information online, but make it clear this is based on your knowledge, not real-time web search.
      
      Query: ${query}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: searchPrompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 400,
        }
      });

      return response.text || "কোনো তথ্য পাওয়া যায়নি। (No information found.)";
    } catch (error) {
      console.error('Web search error:', error);
      return "অনুসন্ধানে সমস্যা হয়েছে। (Search encountered an error.)";
    }
  }

  async getBengaliComedyTips(): Promise<string> {
    try {
      const prompt = `
      As Bong Bari's AI assistant, provide 3-4 quick tips about creating authentic Bengali comedy content.
      Make it practical and actionable for content creators.
      Respond in a mix of Bengali and English that feels natural.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.6,
          maxOutputTokens: 300,
        }
      });

      return response.text || "বাংলা কমেডি তৈরির টিপস দিতে পারছি না। (Cannot provide Bengali comedy tips right now.)";
    } catch (error) {
      console.error('Tips generation error:', error);
      return "টিপস দিতে সমস্যা হচ্ছে। (Having trouble providing tips.)";
    }
  }
}

export const chatbotService = new ChatbotService();