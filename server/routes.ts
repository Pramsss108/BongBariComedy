import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatbotService } from "./chatbotService";
import { insertBlogPostSchema, insertCollaborationRequestSchema, insertUserSchema, insertHomepageElementSchema, type HomepageElement } from "@shared/schema";
import { z } from "zod";
import { google } from "googleapis";
import { ObjectStorageService } from "./objectStorage";

// Simple session middleware
const sessions = new Map<string, { username: string; createdAt: Date }>();

const isAuthenticated = (req: any, res: any, next: any) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  const session = sessionId ? sessions.get(sessionId) : null;
  
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if session is older than 24 hours
  const isExpired = Date.now() - session.createdAt.getTime() > 24 * 60 * 60 * 1000;
  if (isExpired) {
    sessions.delete(sessionId);
    return res.status(401).json({ message: "Session expired" });
  }
  
  req.user = session;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Object Storage routes - serve public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Create session
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessions.set(sessionId, {
        username: user.username,
        createdAt: new Date()
      });
      
      res.json({ sessionId, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", isAuthenticated, (req: any, res) => {
    res.json({ username: req.user.username });
  });

  // Create initial admin user if none exists
  app.post("/api/auth/create-admin", async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername('admin');
      if (existingUser) {
        return res.status(400).json({ message: "Admin user already exists" });
      }
      
      const adminUser = await storage.createUser({
        username: 'admin',
        password: 'bongbari2025'
      });
      
      res.json({ message: "Admin user created", username: adminUser.username });
    } catch (error) {
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Create new admin user (protected)
  app.post("/api/auth/create-user", isAuthenticated, async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser({ username, password });
      
      res.json({ message: "User created successfully", username: newUser.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // YouTube API route - Latest videos (chronological order)
  app.get("/api/youtube/latest", async (_req, res) => {
    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY
      });

      const channelId = process.env.YOUTUBE_CHANNEL_ID;
      if (!channelId) {
        return res.status(500).json({ message: "YouTube Channel ID not configured" });
      }

      // Get channel's uploads playlist
      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        id: [channelId]
      });

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        return res.status(404).json({ message: "Channel not found" });
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        return res.status(500).json({ message: "Uploads playlist not found" });
      }

      // Get latest 3 videos from uploads playlist (most recent first)
      const playlistResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 3
      });

      const videos = playlistResponse.data.items?.map(item => ({
        videoId: item.contentDetails?.videoId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        publishedAt: item.snippet?.publishedAt
      })) || [];

      res.json(videos);
    } catch (error) {
      console.error('YouTube API Error (Latest):', error);
      res.status(500).json({ message: "Failed to fetch latest YouTube videos" });
    }
  });

  // YouTube API route - Popular videos (by view count)
  app.get("/api/youtube/popular", async (_req, res) => {
    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY
      });

      const channelId = process.env.YOUTUBE_CHANNEL_ID;
      if (!channelId) {
        return res.status(500).json({ message: "YouTube Channel ID not configured" });
      }

      // Search for videos from this channel, ordered by popularity (view count)
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        maxResults: 10,
        order: 'viewCount',
        type: 'video'
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        return res.status(404).json({ message: "No popular videos found" });
      }

      // Get detailed stats for these videos to ensure they're actually popular
      const videoIds = searchResponse.data.items?.map((item: any) => item.id?.videoId).filter(Boolean) || [];
      
      const statsResponse = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: videoIds
      });

      // Sort by view count and take top 3
      const popularVideos = statsResponse.data.items?.map((item: any) => ({
        videoId: item.id,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        publishedAt: item.snippet?.publishedAt,
        viewCount: parseInt(item.statistics?.viewCount || '0')
      }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 3) || [];

      res.json(popularVideos);
    } catch (error) {
      console.error('YouTube API Error (Popular):', error);
      res.status(500).json({ message: "Failed to fetch popular YouTube videos" });
    }
  });

  // Blog routes
  app.post("/api/blog", isAuthenticated, async (req, res) => {
    try {
      const blogData = insertBlogPostSchema.parse(req.body);
      const newPost = await storage.createBlogPost(blogData);
      res.json(newPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.get("/api/blog", async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getBlogPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.get("/api/blog/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.post("/api/blog", async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.put("/api/blog/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(id, validatedData);
      
      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blog post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteBlogPost(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      
      res.json({ message: "Blog post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // Collaboration request routes (protected)
  app.get("/api/collaboration-requests", isAuthenticated, async (_req, res) => {
    try {
      const requests = await storage.getCollaborationRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaboration requests" });
    }
  });


  // Chatbot API routes
  app.post("/api/chatbot/message", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await chatbotService.generateResponse(message, conversationHistory);
      
      res.json({ 
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot API error:', error);
      res.status(500).json({ 
        error: "চ্যাটবট এখন কাজ করছে না। আবার চেষ্টা করুন! (Chatbot is not working right now. Please try again!)"
      });
    }
  });

  app.post("/api/chatbot/search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const results = await chatbotService.searchWeb(query);
      
      res.json({ 
        results,
        query,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot search error:', error);
      res.status(500).json({ 
        error: "অনুসন্ধান করতে সমস্যা হচ্ছে। (Having trouble with search.)"
      });
    }
  });

  app.get("/api/chatbot/tips", async (req, res) => {
    try {
      const tips = await chatbotService.getBengaliComedyTips();
      
      res.json({ 
        tips,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chatbot tips error:', error);
      res.status(500).json({ 
        error: "টিপস দিতে সমস্যা হচ্ছে। (Having trouble providing tips.)"
      });
    }
  });

  app.post("/api/collaboration-requests", async (req, res) => {
    try {
      const validatedData = insertCollaborationRequestSchema.parse(req.body);
      
      // Save request directly without verification
      const requestData = {
        ...validatedData,
        status: 'submitted'
      };
      
      const request = await storage.createCollaborationRequest(requestData);
      
      res.status(201).json({ 
        message: "Collaboration request submitted successfully! We'll get back to you soon.",
        id: request.id
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaboration request data", errors: error.errors });
      }
      console.error('Collaboration request error:', error);
      res.status(500).json({ message: "Failed to submit collaboration request" });
    }
  });

  // 🤖 ADMIN PANEL - CHATBOT TRAINING MANAGEMENT
  app.get("/api/admin/chatbot-training", isAuthenticated, async (req, res) => {
    try {
      const training = await storage.getAllChatbotTraining();
      res.json(training);
    } catch (error) {
      console.error("Error fetching chatbot training:", error);
      res.status(500).json({ message: "Failed to fetch chatbot training data" });
    }
  });

  app.post("/api/admin/chatbot-training", isAuthenticated, async (req, res) => {
    try {
      const trainingData = req.body;
      const newTraining = await storage.createChatbotTraining(trainingData);
      res.json(newTraining);
    } catch (error) {
      console.error("Error creating chatbot training:", error);
      res.status(500).json({ message: "Failed to create chatbot training" });
    }
  });

  app.put("/api/admin/chatbot-training/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateChatbotTraining(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Training data not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating chatbot training:", error);
      res.status(500).json({ message: "Failed to update chatbot training" });
    }
  });

  app.delete("/api/admin/chatbot-training/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChatbotTraining(id);
      if (!deleted) {
        return res.status(404).json({ message: "Training data not found" });
      }
      res.json({ message: "Training data deleted successfully" });
    } catch (error) {
      console.error("Error deleting chatbot training:", error);
      res.status(500).json({ message: "Failed to delete chatbot training" });
    }
  });

  // 📝 ADMIN PANEL - CHATBOT TEMPLATES MANAGEMENT
  app.get("/api/admin/chatbot-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllChatbotTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching chatbot templates:", error);
      res.status(500).json({ message: "Failed to fetch chatbot templates" });
    }
  });

  app.post("/api/admin/chatbot-templates", isAuthenticated, async (req, res) => {
    try {
      const templateData = req.body;
      const newTemplate = await storage.createChatbotTemplate(templateData);
      res.json(newTemplate);
    } catch (error) {
      console.error("Error creating chatbot template:", error);
      res.status(500).json({ message: "Failed to create chatbot template" });
    }
  });

  app.put("/api/admin/chatbot-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateChatbotTemplate(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating chatbot template:", error);
      res.status(500).json({ message: "Failed to update chatbot template" });
    }
  });

  app.delete("/api/admin/chatbot-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChatbotTemplate(id);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting chatbot template:", error);
      res.status(500).json({ message: "Failed to delete chatbot template" });
    }
  });

  // 🏠 ADMIN PANEL - HOMEPAGE CONTENT MANAGEMENT
  app.get("/api/admin/homepage-content", isAuthenticated, async (req, res) => {
    try {
      const content = await storage.getAllHomepageContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching homepage content:", error);
      res.status(500).json({ message: "Failed to fetch homepage content" });
    }
  });

  app.get("/api/homepage-content/active", async (req, res) => {
    try {
      const content = await storage.getActiveHomepageContent();
      res.json(content);
    } catch (error) {
      console.error("Error fetching active homepage content:", error);
      res.status(500).json({ message: "Failed to fetch homepage content" });
    }
  });

  app.post("/api/admin/homepage-content", isAuthenticated, async (req, res) => {
    try {
      const contentData = req.body;
      const newContent = await storage.createHomepageContent(contentData);
      res.json(newContent);
    } catch (error) {
      console.error("Error creating homepage content:", error);
      res.status(500).json({ message: "Failed to create homepage content" });
    }
  });

  app.put("/api/admin/homepage-content/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const updated = await storage.updateHomepageContent(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating homepage content:", error);
      res.status(500).json({ message: "Failed to update homepage content" });
    }
  });

  app.delete("/api/admin/homepage-content/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHomepageContent(id);
      if (!deleted) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting homepage content:", error);
      res.status(500).json({ message: "Failed to delete homepage content" });
    }
  });

  // ⚙️ ADMIN PANEL - SETTINGS MANAGEMENT
  app.get("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getAllAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  app.get("/api/public-settings", async (req, res) => {
    try {
      const settings = await storage.getPublicSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Failed to fetch public settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const settingData = req.body;
      const newSetting = await storage.setAdminSetting(settingData);
      res.json(newSetting);
    } catch (error) {
      console.error("Error setting admin setting:", error);
      res.status(500).json({ message: "Failed to set admin setting" });
    }
  });

  app.delete("/api/admin/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      const deleted = await storage.deleteAdminSetting(key);
      if (!deleted) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ message: "Setting deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin setting:", error);
      res.status(500).json({ message: "Failed to delete admin setting" });
    }
  });

  // 🎨 Homepage Elements Management
  app.get("/api/homepage-elements", async (req, res) => {
    try {
      const elements = await storage.getAllHomepageElements();
      res.json(elements);
    } catch (error) {
      console.error("Error fetching homepage elements:", error);
      res.status(500).json({ message: "Failed to fetch homepage elements" });
    }
  });

  app.post("/api/homepage-elements", isAuthenticated, async (req, res) => {
    try {
      const { elements } = req.body;
      // Clear existing elements and save new ones
      await storage.clearHomepageElements();
      const savedElements = await storage.saveHomepageElements(elements);
      res.json(savedElements);
    } catch (error) {
      console.error("Error saving homepage elements:", error);
      res.status(500).json({ message: "Failed to save homepage elements" });
    }
  });

  // 🎨 BANNER API - Get banner data from database
  app.get("/api/homepage-banner", async (req, res) => {
    try {
      // Get banner from homepage content table
      const bannerContent = await storage.getHomepageContentByType("banner");
      const banner = bannerContent.find(c => c.isActive);
      
      if (banner) {
        res.json({
          title: banner.title || "বং বাড়ি",
          subtitle: banner.content || "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প",
          bannerImage: banner.imageUrl || ""
        });
      } else {
        // Return default if no banner found
        res.json({
          title: "বং বাড়ি",
          subtitle: "কলকাতার ঘরোয়া কমেডি - আমাদের গল্প",
          bannerImage: ""
        });
      }
    } catch (error) {
      console.error("Error fetching banner:", error);
      res.status(500).json({ message: "Failed to fetch banner data" });
    }
  });

  app.post("/api/homepage-banner", async (req, res) => {
    try {
      const { title, subtitle, bannerImage } = req.body;
      
      // Get existing banner or create new one
      const existingBanners = await storage.getHomepageContentByType("banner");
      const existingBanner = existingBanners.find(b => b.isActive);
      
      if (existingBanner) {
        // Update existing banner
        await storage.updateHomepageContent(existingBanner.id, {
          title,
          content: subtitle,
          imageUrl: bannerImage
        });
      } else {
        // Create new banner
        await storage.createHomepageContent({
          sectionType: "banner",
          title,
          content: subtitle,
          imageUrl: bannerImage,
          isActive: true,
          displayOrder: 1
        });
      }
      
      console.log("✅ Banner saved to database:", { title, subtitle, bannerImage });
      res.json({ 
        message: "Banner updated successfully",
        data: { title, subtitle, bannerImage }
      });
    } catch (error) {
      console.error("❌ Error saving banner:", error);
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
