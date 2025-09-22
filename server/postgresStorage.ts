import { eq, and, or, desc, sql } from 'drizzle-orm';
import { pgDb } from './db.pg';
import { 
  users, blogPosts, collaborationRequests, communityPosts, communityReactions, communityPendingPosts, rateLimits,
  chatbotTraining, chatbotTemplates, homepageContent, adminSettings,
  type User, type BlogPost,
  type CollaborationRequest,
  type CommunityPost, type CommunityReaction, type CommunityPendingPost,
  type ChatbotTraining, type InsertChatbotTraining,
  type ChatbotTemplate, type InsertChatbotTemplate,
  type HomepageContent, type InsertHomepageContent,
  type AdminSetting, type InsertAdminSetting
} from '../shared/schema';

type InsertBlogPost = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;
type InsertCollaborationRequest = Omit<CollaborationRequest, 'id' | 'createdAt' | 'updatedAt'>;

export class PostgresStorage {
  private db = pgDb;
  available() { return !!this.db; }

  async getUser(id: string): Promise<User | undefined> { if(!this.db) return undefined; const [u]= await this.db.select().from(users).where(eq(users.id,id)); return u; }
  async getUserByUsername(username: string): Promise<User | undefined> { if(!this.db) return undefined; const [u]= await this.db.select().from(users).where(eq(users.username,username)); return u; }
  async createUser(insert: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> { if(!this.db) throw new Error('db'); const [u]= await this.db.insert(users).values(insert).returning(); return u; }

  async getBlogPosts(): Promise<BlogPost[]> { if(!this.db) return []; return await this.db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt)); }
  async getBlogPost(id: string): Promise<BlogPost | undefined> { if(!this.db) return undefined; const [p]= await this.db.select().from(blogPosts).where(eq(blogPosts.id,id)); return p; }
  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> { if(!this.db) return undefined; const [p]= await this.db.select().from(blogPosts).where(eq(blogPosts.slug,slug)); return p; }
  async createBlogPost(insert: InsertBlogPost): Promise<BlogPost> { if(!this.db) throw new Error('db'); const [p]= await this.db.insert(blogPosts).values(insert).returning(); return p; }
  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> { if(!this.db) return undefined; const [p]= await this.db.update(blogPosts).set({ ...updates, updatedAt: new Date() }).where(eq(blogPosts.id,id)).returning(); return p; }
  async deleteBlogPost(id: string): Promise<boolean> { if(!this.db) return false; const r= await this.db.delete(blogPosts).where(eq(blogPosts.id,id)); return r.rowCount>0; }

  async getCollaborationRequests(filters?: any): Promise<CollaborationRequest[]> {
    if(!this.db) return [];
    const cond:any[]=[];
    if(filters?.leadStatus) cond.push(eq(collaborationRequests.leadStatus, filters.leadStatus));
    if(filters?.opened!==undefined) cond.push(eq(collaborationRequests.opened, filters.opened==='true'));
    if(filters?.ids && filters.ids.length){
      const idConds = filters.ids.map((id:string)=>eq(collaborationRequests.id,id));
      cond.push(idConds.reduce((a: any, b: any)=>or(a,b)));
    }
    if(cond.length){
      return await this.db.select().from(collaborationRequests).where(and(...cond)).orderBy(desc(collaborationRequests.createdAt));
    }
    return await this.db.select().from(collaborationRequests).orderBy(desc(collaborationRequests.createdAt));
  }
  async getCollaborationRequestById(id:string){ if(!this.db) return undefined; const [r]= await this.db.select().from(collaborationRequests).where(eq(collaborationRequests.id,id)); return r; }
  async createCollaborationRequest(insert: InsertCollaborationRequest): Promise<CollaborationRequest>{ if(!this.db) throw new Error('db'); const base={...insert, opened:false, leadStatus:'new' as const}; const [r]= await this.db.insert(collaborationRequests).values(base).returning(); return r; }
  async markLeadAsOpened(id:string){ if(!this.db) return undefined; const [r]= await this.db.update(collaborationRequests).set({ opened:true, openedAt: new Date() }).where(eq(collaborationRequests.id,id)).returning(); return r; }
  async updateLeadStatus(id:string, leadStatus:string){ if(!this.db) return undefined; const [r]= await this.db.update(collaborationRequests).set({ leadStatus }).where(eq(collaborationRequests.id,id)).returning(); return r; }
  async updateFollowUpNotes(id:string, followUpNotes:string){ if(!this.db) return undefined; const [r]= await this.db.update(collaborationRequests).set({ followUpNotes }).where(eq(collaborationRequests.id,id)).returning(); return r; }

  // Community Posts (Bong Kahini) methods
  async getCommunityFeed(): Promise<(CommunityPost & { reactions?: Record<string, number> })[]> {
    if(!this.db) return [];
    
    // Get posts with reactions in single query
    const posts = await this.db
      .select({
        id: communityPosts.id,
        text: communityPosts.text,
        author: communityPosts.author,
        language: communityPosts.language,
        featured: communityPosts.featured,
        likes: communityPosts.likes,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        moderationFlags: communityPosts.moderationFlags,
        moderationReason: communityPosts.moderationReason,
        moderationUsedAI: communityPosts.moderationUsedAI,
        moderationSeverity: communityPosts.moderationSeverity,
        moderationDecision: communityPosts.moderationDecision,
      })
      .from(communityPosts)
      .orderBy(desc(communityPosts.createdAt));

    // Get reactions for all posts
    const reactions = await this.db
      .select({
        postId: communityReactions.postId,
        reactionType: communityReactions.reactionType,
        count: communityReactions.count
      })
      .from(communityReactions);

    // Group reactions by postId
    const reactionsMap = new Map<string, Record<string, number>>();
    reactions.forEach((r: any) => {
      if (!reactionsMap.has(r.postId)) {
        reactionsMap.set(r.postId, {});
      }
      reactionsMap.get(r.postId)![r.reactionType] = r.count;
    });

    // Merge posts with reactions
    return posts.map((post: any) => ({
      ...post,
      reactions: reactionsMap.get(post.id) || {}
    }));
  }

  async createCommunityPost(data: {
    text: string;
    author: string | null;
    language: 'bn' | 'en';
    featured?: boolean;
    moderationFlags?: string[];
    moderationReason?: string;
    moderationUsedAI?: boolean;
    moderationSeverity?: number;
    moderationDecision?: string;
  }): Promise<CommunityPost> {
    if(!this.db) throw new Error('db');
    
    const insert = {
      text: data.text,
      author: data.author,
      language: data.language,
      featured: data.featured || false,
      moderationFlags: data.moderationFlags ? JSON.stringify(data.moderationFlags) : null,
      moderationReason: data.moderationReason,
      moderationUsedAI: data.moderationUsedAI || false,
      moderationSeverity: data.moderationSeverity || 0,
      moderationDecision: data.moderationDecision || 'pending'
    };

    const [post] = await this.db.insert(communityPosts).values(insert).returning();
    return post;
  }

  async featureCommunityPost(postId: string): Promise<boolean> {
    if(!this.db) return false;
    
    // First, unfeature all posts
    await this.db.update(communityPosts).set({ featured: false });
    
    // Then feature the specified post
    const result = await this.db
      .update(communityPosts)
      .set({ featured: true })
      .where(eq(communityPosts.id, postId));
    
    return result.rowCount > 0;
  }

  async addReactionToCommunityPost(postId: string, reactionType: string): Promise<boolean> {
    if(!this.db) return false;
    
    // Check if reaction already exists for this post
    const [existingReaction] = await this.db
      .select()
      .from(communityReactions)
      .where(and(
        eq(communityReactions.postId, postId),
        eq(communityReactions.reactionType, reactionType)
      ));

    if (existingReaction) {
      // Increment existing reaction
      await this.db
        .update(communityReactions)
        .set({ 
          count: sql`${communityReactions.count} + 1`,
          updatedAt: new Date()
        })
        .where(eq(communityReactions.id, existingReaction.id));
    } else {
      // Create new reaction
      await this.db.insert(communityReactions).values({
        postId,
        reactionType,
        count: 1
      });
    }
    
    return true;
  }

  // Pending community posts (moderation queue)
  async getPendingCommunityPosts(): Promise<CommunityPendingPost[]> {
    if(!this.db) return [];
    return await this.db
      .select()
      .from(communityPendingPosts)
      .orderBy(desc(communityPendingPosts.createdAt));
  }

  async createPendingCommunityPost(data: {
    postId: string;
    text: string;
    author: string | null;
    language: 'bn' | 'en';
    flaggedTerms?: string[];
    moderationFlags?: string[];
    moderationReason?: string;
    moderationUsedAI?: boolean;
    moderationSeverity?: number;
    moderationDecision?: string;
  }): Promise<CommunityPendingPost> {
    if(!this.db) throw new Error('db');
    
    const insert = {
      postId: data.postId,
      text: data.text,
      author: data.author,
      language: data.language,
      flaggedTerms: data.flaggedTerms ? JSON.stringify(data.flaggedTerms) : null,
      moderationFlags: data.moderationFlags ? JSON.stringify(data.moderationFlags) : null,
      moderationReason: data.moderationReason,
      moderationUsedAI: data.moderationUsedAI || false,
      moderationSeverity: data.moderationSeverity || 0,
      moderationDecision: data.moderationDecision || 'pending'
    };

    const [post] = await this.db.insert(communityPendingPosts).values(insert).returning();
    return post;
  }

  async approvePendingCommunityPost(postId: string, editedText?: string): Promise<CommunityPost | null> {
    if(!this.db) return null;
    
    // Get pending post
    const [pending] = await this.db
      .select()
      .from(communityPendingPosts)
      .where(eq(communityPendingPosts.postId, postId));

    if (!pending) return null;

    // Create approved post
    const approvedPost = await this.createCommunityPost({
      text: editedText || pending.text,
      author: pending.author,
      language: pending.language as 'bn' | 'en',
      featured: false,
      moderationFlags: pending.moderationFlags ? JSON.parse(pending.moderationFlags) : undefined,
      moderationReason: pending.moderationReason || undefined,
      moderationUsedAI: pending.moderationUsedAI,
      moderationSeverity: pending.moderationSeverity,
      moderationDecision: 'approve'
    });

    // Remove from pending
    await this.db
      .delete(communityPendingPosts)
      .where(eq(communityPendingPosts.postId, postId));

    return approvedPost;
  }

  async rejectPendingCommunityPost(postId: string): Promise<boolean> {
    if(!this.db) return false;
    
    const result = await this.db
      .delete(communityPendingPosts)
      .where(eq(communityPendingPosts.postId, postId));
      
    return result.rowCount > 0;
  }

  async deletePendingCommunityPost(postId: string): Promise<boolean> {
    return this.rejectPendingCommunityPost(postId); // Same operation
  }

  // Rate limiting methods
  async checkRateLimit(key: string): Promise<boolean> {
    if(!this.db) return false;
    
    // Clean up expired rate limits first
    await this.db
      .delete(rateLimits)
      .where(sql`${rateLimits.expiresAt} < NOW()`);
    
    // Check if key exists and is still valid
    const [existing] = await this.db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key));
      
    return !!existing;
  }

  async setRateLimit(key: string, expiresInMs: number): Promise<boolean> {
    if(!this.db) return false;
    
    const expiresAt = new Date(Date.now() + expiresInMs);
    
    try {
      await this.db.insert(rateLimits).values({
        key,
        expiresAt
      });
      return true;
    } catch (error) {
      // Key might already exist - that's OK for rate limiting
      return false;
    }
  }
  
  // Chatbot training methods
  async getAllChatbotTraining(): Promise<ChatbotTraining[]> {
    if (!this.db) return [];
    return await this.db.select().from(chatbotTraining).orderBy(desc(chatbotTraining.createdAt));
  }
  
  async createChatbotTraining(data: InsertChatbotTraining): Promise<ChatbotTraining> {
    if (!this.db) throw new Error('db');
    const [training] = await this.db.insert(chatbotTraining).values(data).returning();
    return training;
  }
  
  async updateChatbotTraining(id: number, data: Partial<InsertChatbotTraining>): Promise<ChatbotTraining | undefined> {
    if (!this.db) return undefined;
    const [training] = await this.db.update(chatbotTraining)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatbotTraining.id, id))
      .returning();
    return training;
  }
  
  async deleteChatbotTraining(id: number): Promise<boolean> {
    if (!this.db) return false;
    const result = await this.db.delete(chatbotTraining).where(eq(chatbotTraining.id, id));
    return result.rowCount > 0;
  }
  
  // Chatbot template methods
  async getAllChatbotTemplates(): Promise<ChatbotTemplate[]> {
    if (!this.db) return [];
    return await this.db.select().from(chatbotTemplates).orderBy(desc(chatbotTemplates.createdAt));
  }
  
  async createChatbotTemplate(data: InsertChatbotTemplate): Promise<ChatbotTemplate> {
    if (!this.db) throw new Error('db');
    const [template] = await this.db.insert(chatbotTemplates).values(data).returning();
    return template;
  }
  
  async updateChatbotTemplate(id: number, data: Partial<InsertChatbotTemplate>): Promise<ChatbotTemplate | undefined> {
    if (!this.db) return undefined;
    const [template] = await this.db.update(chatbotTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(chatbotTemplates.id, id))
      .returning();
    return template;
  }
  
  async deleteChatbotTemplate(id: number): Promise<boolean> {
    if (!this.db) return false;
    const result = await this.db.delete(chatbotTemplates).where(eq(chatbotTemplates.id, id));
    return result.rowCount > 0;
  }
  
  // Homepage content methods
  async getAllHomepageContent(): Promise<HomepageContent[]> {
    if (!this.db) return [];
    return await this.db.select().from(homepageContent).orderBy(desc(homepageContent.createdAt));
  }
  
  async getActiveHomepageContent(): Promise<HomepageContent[]> {
    if (!this.db) return [];
    return await this.db.select().from(homepageContent)
      .where(eq(homepageContent.isActive, true))
      .orderBy(desc(homepageContent.createdAt));
  }
  
  async getHomepageContentByType(type: string): Promise<HomepageContent[]> {
    if (!this.db) return [];
    return await this.db.select().from(homepageContent)
      .where(eq(homepageContent.sectionType, type))
      .orderBy(desc(homepageContent.createdAt));
  }
  
  async createHomepageContent(data: InsertHomepageContent): Promise<HomepageContent> {
    if (!this.db) throw new Error('db');
    const [content] = await this.db.insert(homepageContent).values(data).returning();
    return content;
  }
  
  async updateHomepageContent(id: number, data: Partial<InsertHomepageContent>): Promise<HomepageContent | undefined> {
    if (!this.db) return undefined;
    const [content] = await this.db.update(homepageContent)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(homepageContent.id, id))
      .returning();
    return content;
  }
  
  async deleteHomepageContent(id: number): Promise<boolean> {
    if (!this.db) return false;
    const result = await this.db.delete(homepageContent).where(eq(homepageContent.id, id));
    return result.rowCount > 0;
  }
  
  // Admin settings methods
  async getAllAdminSettings(): Promise<AdminSetting[]> {
    if (!this.db) return [];
    return await this.db.select().from(adminSettings).orderBy(desc(adminSettings.updatedAt));
  }
  
  async getPublicSettings(): Promise<AdminSetting[]> {
    if (!this.db) return [];
    return await this.db.select().from(adminSettings)
      .where(eq(adminSettings.isPublic, true))
      .orderBy(desc(adminSettings.updatedAt));
  }
  
  async setAdminSetting(data: InsertAdminSetting): Promise<AdminSetting> {
    if (!this.db) throw new Error('db');
    // Try to update existing setting first
    const existing = await this.db.select().from(adminSettings)
      .where(eq(adminSettings.settingKey, data.settingKey));
    
    if (existing.length > 0) {
      const [setting] = await this.db.update(adminSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(adminSettings.settingKey, data.settingKey))
        .returning();
      return setting;
    } else {
      const [setting] = await this.db.insert(adminSettings).values(data).returning();
      return setting;
    }
  }
  
  async deleteAdminSetting(key: string): Promise<boolean> {
    if (!this.db) return false;
    const result = await this.db.delete(adminSettings).where(eq(adminSettings.settingKey, key));
    return result.rowCount > 0;
  }
}

// Skip-test: server-only change to validate workflow skip logic
export const postgresStorage = new PostgresStorage();