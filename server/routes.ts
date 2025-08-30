import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema, insertCollaborationRequestSchema } from "@shared/schema";
import { z } from "zod";
import { google } from "googleapis";

export async function registerRoutes(app: Express): Promise<Server> {
  // YouTube API route
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

      // Get latest 6 videos from uploads playlist
      const playlistResponse = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 6
      });

      const videos = playlistResponse.data.items?.map(item => ({
        videoId: item.contentDetails?.videoId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
        publishedAt: item.snippet?.publishedAt
      })) || [];

      res.json(videos);
    } catch (error) {
      console.error('YouTube API Error:', error);
      res.status(500).json({ message: "Failed to fetch YouTube videos" });
    }
  });

  // Blog routes
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

  app.delete("/api/blog/:id", async (req, res) => {
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

  // Collaboration request routes
  app.get("/api/collaboration-requests", async (_req, res) => {
    try {
      const requests = await storage.getCollaborationRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaboration requests" });
    }
  });

  app.post("/api/collaboration-requests", async (req, res) => {
    try {
      const validatedData = insertCollaborationRequestSchema.parse(req.body);
      const request = await storage.createCollaborationRequest(validatedData);
      res.status(201).json({ message: "Collaboration request submitted successfully", id: request.id });
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
