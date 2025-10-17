import { type User, type InsertUser, type BlogPost, type InsertBlogPost, type CollaborationRequest, type InsertCollaborationRequest, type CommunityPost, type CommunityPendingPost, type ChatbotTraining, type InsertChatbotTraining, type ChatbotTemplate, type InsertChatbotTemplate, type HomepageContent, type InsertHomepageContent, type AdminSetting, type InsertAdminSetting, type GoogleUser, type InsertGoogleUser, type ChatSession, type InsertChatSession, type ChatMessage, type InsertChatMessage, type UserPreferences, type InsertUserPreferences } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Google Users methods
  createGoogleUser(user: InsertGoogleUser): Promise<GoogleUser>;
  getGoogleUserByEmail(email: string): Promise<GoogleUser | null>;
  createChatSession(sessionData: InsertChatSession): Promise<ChatSession>;
  saveChatMessage(messageData: InsertChatMessage): Promise<ChatMessage>;
  getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]>;
  updateUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  getBlogPosts(): Promise<BlogPost[]>;
  getBlogPost(id: string): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  getCollaborationRequests(filters?: any): Promise<CollaborationRequest[]>;
  createCollaborationRequest(request: InsertCollaborationRequest): Promise<CollaborationRequest>;
  getCollaborationRequestById(id: string): Promise<CollaborationRequest | undefined>;
  markLeadAsOpened(id: string): Promise<CollaborationRequest | undefined>;
  updateLeadStatus(id: string, leadStatus: string): Promise<CollaborationRequest | undefined>;
  updateFollowUpNotes(id: string, notes: string): Promise<CollaborationRequest | undefined>;
  
  // Community methods
  getCommunityFeed(): Promise<(CommunityPost & { reactions?: Record<string, number> })[]>;
  createCommunityPost(data: { text: string; author: string | null; language: 'bn' | 'en'; featured?: boolean; moderationFlags?: string[]; moderationReason?: string; moderationUsedAI?: boolean; moderationSeverity?: number; moderationDecision?: string; }): Promise<CommunityPost>;
  featureCommunityPost(postId: string): Promise<boolean>;
  addReactionToCommunityPost(postId: string, reactionType: string): Promise<boolean>;
  getPendingCommunityPosts(): Promise<CommunityPendingPost[]>;
  createPendingCommunityPost(data: { postId: string; text: string; author: string | null; language: 'bn' | 'en'; flaggedTerms?: string[]; moderationFlags?: string[]; moderationReason?: string; moderationUsedAI?: boolean; moderationSeverity?: number; moderationDecision?: string; }): Promise<CommunityPendingPost>;
  approvePendingCommunityPost(postId: string, editedText?: string): Promise<CommunityPost | null>;
  rejectPendingCommunityPost(postId: string): Promise<boolean>;
  deletePendingCommunityPost(postId: string): Promise<boolean>;
  checkRateLimit(key: string): Promise<boolean>;
  setRateLimit(key: string, expiresInMs: number): Promise<boolean>;
  
  // Chatbot methods
  getAllChatbotTraining(): Promise<ChatbotTraining[]>;
  // Optional search; if not implemented caller will fallback
  searchChatbotTraining?(keyword: string): Promise<ChatbotTraining[]>;
  createChatbotTraining(data: InsertChatbotTraining): Promise<ChatbotTraining>;
  updateChatbotTraining(id: number, data: Partial<InsertChatbotTraining>): Promise<ChatbotTraining | undefined>;
  deleteChatbotTraining(id: number): Promise<boolean>;
  
  // Template methods
  getAllChatbotTemplates(): Promise<ChatbotTemplate[]>;
  getChatbotTemplatesByType?(type: string): Promise<ChatbotTemplate[]>;
  createChatbotTemplate(data: InsertChatbotTemplate): Promise<ChatbotTemplate>;
  updateChatbotTemplate(id: number, data: Partial<InsertChatbotTemplate>): Promise<ChatbotTemplate | undefined>;
  deleteChatbotTemplate(id: number): Promise<boolean>;
  
  // Homepage content methods
  getAllHomepageContent(): Promise<HomepageContent[]>;
  getActiveHomepageContent(): Promise<HomepageContent[]>;
  getHomepageContentByType(type: string): Promise<HomepageContent[]>;
  createHomepageContent(data: InsertHomepageContent): Promise<HomepageContent>;
  updateHomepageContent(id: number, data: Partial<InsertHomepageContent>): Promise<HomepageContent | undefined>;
  deleteHomepageContent(id: number): Promise<boolean>;
  
  // Admin settings methods
  getAllAdminSettings(): Promise<AdminSetting[]>;
  getPublicSettings(): Promise<AdminSetting[]>;
  setAdminSetting(data: InsertAdminSetting): Promise<AdminSetting>;
  deleteAdminSetting(key: string): Promise<boolean>;
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
    // Initialize default admin user
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    // Create default admin user if it doesn't exist
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      await this.createUser({
        username: 'admin',
        password: 'bongbari2025'
      });
      console.log('Default admin user created: username=admin, password=bongbari2025');
    }
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

  // Google Users methods (in-memory stubs)
  async createGoogleUser(user: InsertGoogleUser): Promise<GoogleUser> {
    // In-memory storage - just return the user with an ID
    return { id: randomUUID(), ...user, joinedAt: new Date(), lastActiveAt: new Date(), isActive: true } as GoogleUser;
  }

  async getGoogleUserByEmail(email: string): Promise<GoogleUser | null> {
    // In-memory storage - stub implementation
    return null;
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    // In-memory storage - stub implementation
    return { id: randomUUID(), ...sessionData, sessionStart: new Date(), lastActiveAt: new Date(), isActive: true } as ChatSession;
  }

  async saveChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    // In-memory storage - stub implementation
    return { id: randomUUID(), ...messageData, timestamp: new Date() } as ChatMessage;
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    // In-memory storage - stub implementation
    return [];
  }

  async updateUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    // In-memory storage - stub implementation
    return { id: randomUUID(), userId, ...preferences, updatedAt: new Date() } as UserPreferences;
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

  async getCollaborationRequests(filters?: any): Promise<CollaborationRequest[]> {
    let requests = Array.from(this.collaborationRequests.values());
    
    if (filters) {
      if (filters.leadStatus) {
        requests = requests.filter(r => r.leadStatus === filters.leadStatus);
      }
      if (filters.opened !== undefined) {
        requests = requests.filter(r => r.opened === (filters.opened === 'true'));
      }
      if (filters.ids) {
        const idSet = new Set(filters.ids);
        requests = requests.filter(r => idSet.has(r.id));
      }
    }
    
    return requests.sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createCollaborationRequest(insertRequest: InsertCollaborationRequest): Promise<CollaborationRequest> {
    const id = randomUUID();
    const now = new Date();
    const request: CollaborationRequest = {
      id,
      name: insertRequest.name,
      company: insertRequest.company,
      message: insertRequest.message ?? null,
      email: insertRequest.email ?? null,
      phone: insertRequest.phone ?? null,
      createdAt: now,
      status: (insertRequest as any).status || 'submitted',
      opened: false,
      openedAt: null,
      leadStatus: 'new',
      followUpNotes: null,
    } as any;
    this.collaborationRequests.set(id, request);
    return request;
  }

  async getCollaborationRequestById(id: string): Promise<CollaborationRequest | undefined> {
    return this.collaborationRequests.get(id);
  }

  async markLeadAsOpened(id: string): Promise<CollaborationRequest | undefined> {
    const request = this.collaborationRequests.get(id);
    if (!request) return undefined;
    
    const updated = {
      ...request,
      opened: true,
      openedAt: request.openedAt || new Date(),
    };
    this.collaborationRequests.set(id, updated);
    return updated;
  }

  async updateLeadStatus(id: string, leadStatus: string): Promise<CollaborationRequest | undefined> {
    const request = this.collaborationRequests.get(id);
    if (!request) return undefined;
    
    const updated = {
      ...request,
      leadStatus: leadStatus as any,
    };
    this.collaborationRequests.set(id, updated);
    return updated;
  }

  async updateFollowUpNotes(id: string, notes: string): Promise<CollaborationRequest | undefined> {
    const request = this.collaborationRequests.get(id);
    if (!request) return undefined;
    
    const updated = {
      ...request,
      followUpNotes: notes,
    };
    this.collaborationRequests.set(id, updated);
    return updated;
  }

  // Community methods (stubs - not implemented for memory storage)
  async getCommunityFeed(): Promise<(CommunityPost & { reactions?: Record<string, number> })[]> {
    console.warn('Community features not implemented in MemStorage');
    return [];
  }
  async createCommunityPost(): Promise<CommunityPost> {
    throw new Error('Community features not implemented in MemStorage');
  }
  async featureCommunityPost(): Promise<boolean> {
    return false;
  }
  async addReactionToCommunityPost(): Promise<boolean> {
    return false;
  }
  async getPendingCommunityPosts(): Promise<CommunityPendingPost[]> {
    return [];
  }
  async createPendingCommunityPost(): Promise<CommunityPendingPost> {
    throw new Error('Community features not implemented in MemStorage');
  }
  async approvePendingCommunityPost(): Promise<CommunityPost | null> {
    return null;
  }
  async rejectPendingCommunityPost(): Promise<boolean> {
    return false;
  }
  async deletePendingCommunityPost(): Promise<boolean> {
    return false;
  }
  async checkRateLimit(): Promise<boolean> {
    return false; // No rate limiting in memory storage
  }
  async setRateLimit(): Promise<boolean> {
    return false;
  }
  
  // Chatbot methods (not implemented in MemStorage)
  async getAllChatbotTraining(): Promise<ChatbotTraining[]> {
    return [];
  }
  async createChatbotTraining(): Promise<ChatbotTraining> {
    throw new Error('Chatbot features not implemented in MemStorage');
  }
  async updateChatbotTraining(): Promise<ChatbotTraining | undefined> {
    return undefined;
  }
  async deleteChatbotTraining(): Promise<boolean> {
    return false;
  }
  
  // Template methods (not implemented in MemStorage)
  async getAllChatbotTemplates(): Promise<ChatbotTemplate[]> {
    return [];
  }
  async createChatbotTemplate(): Promise<ChatbotTemplate> {
    throw new Error('Template features not implemented in MemStorage');
  }
  async updateChatbotTemplate(): Promise<ChatbotTemplate | undefined> {
    return undefined;
  }
  async deleteChatbotTemplate(): Promise<boolean> {
    return false;
  }
  
  // Homepage content methods (not implemented in MemStorage)
  async getAllHomepageContent(): Promise<HomepageContent[]> {
    return [];
  }
  async getActiveHomepageContent(): Promise<HomepageContent[]> {
    return [];
  }
  async getHomepageContentByType(): Promise<HomepageContent[]> {
    return [];
  }
  async createHomepageContent(): Promise<HomepageContent> {
    throw new Error('Homepage content features not implemented in MemStorage');
  }
  async updateHomepageContent(): Promise<HomepageContent | undefined> {
    return undefined;
  }
  async deleteHomepageContent(): Promise<boolean> {
    return false;
  }
  
  // Admin settings methods (not implemented in MemStorage)
  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return [];
  }
  async getPublicSettings(): Promise<AdminSetting[]> {
    return [];
  }
  async setAdminSetting(): Promise<AdminSetting> {
    throw new Error('Admin settings not implemented in MemStorage');
  }
  async deleteAdminSetting(): Promise<boolean> {
    return false;
  }
}

// Dynamic storage selection. In production we avoid loading better-sqlite3 native module.
import { postgresStorage } from './postgresStorage';
let storageImpl: IStorage;
if (process.env.DATABASE_URL) {
  storageImpl = postgresStorage as unknown as IStorage;
  console.log('[storage] Using Postgres (Neon) storage.');
} else {
  storageImpl = new MemStorage();
  console.log('[storage] Using in-memory storage (no DATABASE_URL set).');
}
export const storage = storageImpl;
