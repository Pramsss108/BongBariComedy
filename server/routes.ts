import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema, insertCollaborationRequestSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { google } from "googleapis";
import { ObjectStorageService } from "./objectStorage";
import { sendVerificationEmail, generateVerificationToken, sendOTPEmail, generateOTPCode } from "./emailService";

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

  // Email verification routes
  app.get("/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send('<h1>Invalid verification link</h1><p>The verification link is invalid or missing.</p>');
      }

      const request = await storage.getCollaborationRequestByToken(token);
      
      if (!request) {
        return res.status(404).send('<h1>Verification link not found</h1><p>This verification link may have expired or is invalid.</p>');
      }

      // Check if already verified
      if (request.isEmailVerified === 'true') {
        return res.send('<h1>Email Already Verified ✅</h1><p>Your collaboration request has already been verified and processed.</p>');
      }

      // Check if expired
      if (request.verificationExpiresAt && new Date() > new Date(request.verificationExpiresAt)) {
        return res.status(410).send('<h1>Verification link expired</h1><p>This verification link has expired. Please submit a new collaboration request.</p>');
      }

      // Verify the email
      await storage.verifyCollaborationRequest(token);
      
      const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verified - Bong Bari</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #FCD34D, #F59E0B); margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 50px auto; background: white; border-radius: 15px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
            h1 { color: #1E40AF; margin-bottom: 20px; }
            .emoji { font-size: 48px; margin: 20px 0; }
            p { color: #374151; line-height: 1.6; margin-bottom: 15px; }
            .footer { margin-top: 30px; color: #6B7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">🎭✅</div>
            <h1>Email Verified Successfully!</h1>
            <p>Thank you for verifying your email address. Your collaboration request has been received and will be reviewed by our team.</p>
            <p>We'll get back to you soon with exciting collaboration opportunities!</p>
            <div class="footer">
              <p>© 2025 Bong Bari - Bringing laughter to Bengali families</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.send(successHtml);
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).send('<h1>Verification Error</h1><p>Something went wrong during verification. Please try again later.</p>');
    }
  });

  // OTP verification endpoint
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { requestId, otpCode } = req.body;
      
      if (!requestId || !otpCode) {
        return res.status(400).json({ message: "Request ID and OTP code are required" });
      }

      const isValid = await storage.verifyOTPCode(requestId, otpCode);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired OTP code" });
      }
      
      res.json({ message: "Email verified successfully! Your collaboration request has been submitted." });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ message: "Failed to verify OTP code" });
    }
  });

  app.post("/api/collaboration-requests", async (req, res) => {
    try {
      const validatedData = insertCollaborationRequestSchema.parse(req.body);
      
      // Check if email is provided (required for OTP verification)
      if (!validatedData.email) {
        return res.status(400).json({ message: "Email is required for collaboration requests" });
      }

      // Save request with pending OTP verification status
      const requestData = {
        ...validatedData,
        isEmailVerified: 'false',
        status: 'pending_otp_verification'
      };
      
      const request = await storage.createCollaborationRequest(requestData);
      
      // Generate OTP code (6 digits, expires in 10 minutes)
      const otpCode = generateOTPCode();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Save OTP to the request
      await storage.saveOTPCode(request.id, otpCode, otpExpiresAt);
      
      // Send OTP email
      const emailSent = await sendOTPEmail({
        to: validatedData.email,
        name: validatedData.name,
        otpCode
      });
      
      if (!emailSent) {
        return res.status(500).json({ 
          message: "Request saved but OTP email failed to send. Please contact us directly.",
          id: request.id 
        });
      }
      
      res.status(201).json({ 
        message: "OTP sent to your email! Please enter the 6-digit code to verify.",
        requestId: request.id,
        requiresOTP: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaboration request data", errors: error.errors });
      }
      console.error('Collaboration request error:', error);
      res.status(500).json({ message: "Failed to submit collaboration request" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
