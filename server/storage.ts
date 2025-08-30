import { type User, type InsertUser, type BlogPost, type InsertBlogPost, type CollaborationRequest, type InsertCollaborationRequest } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  getCollaborationRequests(): Promise<CollaborationRequest[]>;
  createCollaborationRequest(request: InsertCollaborationRequest): Promise<CollaborationRequest>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private blogPosts: Map<string, BlogPost>;
  private collaborationRequests: Map<string, CollaborationRequest>;

  constructor() {
    this.users = new Map();
    this.blogPosts = new Map();
    this.collaborationRequests = new Map();
    
    // Initialize with some sample blog posts
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    const samplePosts: InsertBlogPost[] = [
      {
        title: "Top 10 Bengali Mom Phrases That Never Get Old",
        content: "Every Bengali household has these iconic mom dialogues that we've all heard a million times. From 'Ei je chele ta!' to 'Aar khabi na?', these phrases are the soundtrack of our childhood...",
        excerpt: "Every Bengali household has these iconic mom dialogues that we've all heard a million times...",
        slug: "top-10-bengali-mom-phrases"
      },
      {
        title: "When Your Bengali Mom Discovers YouTube",
        content: "The hilarious journey of introducing technology to Bengali mothers and the chaos that follows. From accidentally going live while cooking to commenting on every single video with 'Nice beta'...",
        excerpt: "The hilarious journey of introducing technology to Bengali mothers and the chaos that follows...",
        slug: "bengali-mom-discovers-youtube"
      },
      {
        title: "Behind the Scenes: Creating Authentic Bengali Comedy",
        content: "Our process of turning everyday Bengali household moments into comedy gold. We dive deep into the nuances of Bengali family dynamics and how we capture those universal moments...",
        excerpt: "Our process of turning everyday Bengali household moments into comedy gold...",
        slug: "creating-authentic-bengali-comedy"
      }
    ];

    for (const post of samplePosts) {
      await this.createBlogPost(post);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    return this.blogPosts.get(id);
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    return Array.from(this.blogPosts.values()).find(post => post.slug === slug);
  }

  async createBlogPost(insertPost: InsertBlogPost): Promise<BlogPost> {
    const id = randomUUID();
    const now = new Date();
    const post: BlogPost = {
      ...insertPost,
      id,
      createdAt: now,
      updatedAt: now,
      excerpt: insertPost.excerpt || null,
    };
    this.blogPosts.set(id, post);
    return post;
  }

  async updateBlogPost(id: string, updateData: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const existingPost = this.blogPosts.get(id);
    if (!existingPost) return undefined;

    const updatedPost: BlogPost = {
      ...existingPost,
      ...updateData,
      updatedAt: new Date(),
    };
    this.blogPosts.set(id, updatedPost);
    return updatedPost;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    return this.blogPosts.delete(id);
  }

  async getCollaborationRequests(): Promise<CollaborationRequest[]> {
    return Array.from(this.collaborationRequests.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createCollaborationRequest(insertRequest: InsertCollaborationRequest): Promise<CollaborationRequest> {
    const id = randomUUID();
    const now = new Date();
    const request: CollaborationRequest = {
      ...insertRequest,
      id,
      createdAt: now,
    };
    this.collaborationRequests.set(id, request);
    return request;
  }
}

export const storage = new MemStorage();
