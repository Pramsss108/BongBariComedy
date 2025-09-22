import { eq, and, or, like, desc } from "drizzle-orm";
import { db } from './db.sqlite';
import { 
  users, blogPosts, collaborationRequests, chatbotTraining, chatbotTemplates, homepageContent, adminSettings,
  type User, type InsertUser, type BlogPost, type InsertBlogPost, type CollaborationRequest, type InsertCollaborationRequest,
  type ChatbotTraining, type InsertChatbotTraining, type ChatbotTemplate, type InsertChatbotTemplate,
  type HomepageContent, type InsertHomepageContent, type AdminSetting, type InsertAdminSetting
} from "../shared/schema.sqlite";



// Database Storage Implementation with Admin Panel Features
export class DatabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Blog operations
  async getBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post || undefined;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post || undefined;
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(insertBlogPost).returning();
    return post;
  }

  async updateBlogPost(id: string, updates: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db.update(blogPosts)
  .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post || undefined;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const deleted = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning({ id: blogPosts.id });
    return deleted.length > 0;
  }

  // Collaboration request operations
  async getCollaborationRequests(filters?: any): Promise<CollaborationRequest[]> {
    let query = db.select().from(collaborationRequests);
    let conditions = [];
    
    if (filters) {
      if (filters.leadStatus) {
        conditions.push(eq(collaborationRequests.leadStatus, filters.leadStatus));
      }
      if (filters.opened !== undefined) {
        conditions.push(eq(collaborationRequests.opened, filters.opened === 'true'));
      }
      if (filters.ids && filters.ids.length > 0) {
        // Handle multiple IDs filtering
        const idConditions = filters.ids.map((id: string) => eq(collaborationRequests.id, id));
        if (idConditions.length === 1) {
          conditions.push(idConditions[0]);
        } else {
          // Combine with OR for multiple IDs
          conditions.push(idConditions.reduce((a: any, b: any) => or(a, b)));
        }
      }
    }
    
    if (conditions.length > 0) {
      return await db.select().from(collaborationRequests)
        .where(and(...conditions))
        .orderBy(desc(collaborationRequests.createdAt));
    }
    
    return await db.select().from(collaborationRequests).orderBy(desc(collaborationRequests.createdAt));
  }

  async getCollaborationRequestById(id: string): Promise<CollaborationRequest | undefined> {
    const [request] = await db.select().from(collaborationRequests).where(eq(collaborationRequests.id, id));
    return request || undefined;
  }

  async createCollaborationRequest(insertRequest: InsertCollaborationRequest): Promise<CollaborationRequest> {
    const requestData = {
      ...insertRequest,
      opened: false,
      leadStatus: 'new' as const,
    };
    const [request] = await db.insert(collaborationRequests).values(requestData).returning();
    return request;
  }

  async updateCollaborationRequestStatus(id: string, status: string): Promise<CollaborationRequest | undefined> {
    const [request] = await db.update(collaborationRequests)
      .set({ status })
      .where(eq(collaborationRequests.id, id))
      .returning();
    return request || undefined;
  }

  async deleteCollaborationRequest(id: string): Promise<boolean> {
    const deleted = await db.delete(collaborationRequests).where(eq(collaborationRequests.id, id)).returning({ id: collaborationRequests.id });
    return deleted.length > 0;
  }

  async markLeadAsOpened(id: string): Promise<CollaborationRequest | undefined> {
    const [request] = await db.update(collaborationRequests)
  .set({ opened: true, openedAt: new Date().toISOString() })
      .where(eq(collaborationRequests.id, id))
      .returning();
    return request || undefined;
  }

  async updateLeadStatus(id: string, leadStatus: string): Promise<CollaborationRequest | undefined> {
    const [request] = await db.update(collaborationRequests)
      .set({ leadStatus: leadStatus as any })
      .where(eq(collaborationRequests.id, id))
      .returning();
    return request || undefined;
  }

  async updateFollowUpNotes(id: string, notes: string): Promise<CollaborationRequest | undefined> {
    const [request] = await db.update(collaborationRequests)
      .set({ followUpNotes: notes })
      .where(eq(collaborationRequests.id, id))
      .returning();
    return request || undefined;
  }

  // 🤖 CHATBOT TRAINING OPERATIONS
  async getAllChatbotTraining(): Promise<ChatbotTraining[]> {
    return await db.select().from(chatbotTraining)
      .where(eq(chatbotTraining.isActive, true))
      .orderBy(desc(chatbotTraining.priority), desc(chatbotTraining.createdAt));
  }

  async getChatbotTraining(id: number): Promise<ChatbotTraining | undefined> {
    const [training] = await db.select().from(chatbotTraining).where(eq(chatbotTraining.id, id));
    return training || undefined;
  }

  async searchChatbotTraining(keyword: string, language?: string): Promise<ChatbotTraining[]> {
    let conditions = [
      eq(chatbotTraining.isActive, true),
      like(chatbotTraining.keyword, `%${keyword.toLowerCase()}%`)
    ];
    
    if (language && language !== 'auto') {
      conditions.push(eq(chatbotTraining.language, language));
    }

    return await db.select().from(chatbotTraining)
      .where(and(...conditions))
      .orderBy(desc(chatbotTraining.priority));
  }

  async createChatbotTraining(data: InsertChatbotTraining): Promise<ChatbotTraining> {
    const [training] = await db.insert(chatbotTraining).values({
      ...data,
      keyword: data.keyword.toLowerCase() // Store keywords in lowercase for better matching
    }).returning();
    return training;
  }

  async updateChatbotTraining(id: number, updates: Partial<InsertChatbotTraining>): Promise<ChatbotTraining | undefined> {
    const updateData = { ...updates };
    if (updateData.keyword) {
      updateData.keyword = updateData.keyword.toLowerCase();
    }
    
    const [training] = await db.update(chatbotTraining)
  .set({ ...updateData, updatedAt: new Date().toISOString() })
      .where(eq(chatbotTraining.id, id))
      .returning();
    return training || undefined;
  }

  async deleteChatbotTraining(id: number): Promise<boolean> {
    const deleted = await db.delete(chatbotTraining).where(eq(chatbotTraining.id, id)).returning({ id: chatbotTraining.id });
    return deleted.length > 0;
  }

  // 📝 CHATBOT TEMPLATE OPERATIONS
  async getAllChatbotTemplates(): Promise<ChatbotTemplate[]> {
    return await db.select().from(chatbotTemplates).orderBy(chatbotTemplates.displayOrder, desc(chatbotTemplates.createdAt));
  }

  async getChatbotTemplatesByType(templateType: string): Promise<ChatbotTemplate[]> {
    const now = new Date();
    return await db.select().from(chatbotTemplates)
      .where(and(
        eq(chatbotTemplates.templateType, templateType),
        eq(chatbotTemplates.isActive, true)
      ))
      .orderBy(chatbotTemplates.displayOrder);
  }

  async getActiveChatbotTemplates(): Promise<ChatbotTemplate[]> {
    return await db.select().from(chatbotTemplates)
      .where(eq(chatbotTemplates.isActive, true))
      .orderBy(chatbotTemplates.displayOrder);
  }

  async createChatbotTemplate(data: InsertChatbotTemplate): Promise<ChatbotTemplate> {
  const {
    name,
    templateType,
    content,
    language,
    isActive,
    displayOrder,
  validFrom,
  validTo
  } = data;
  const [template] = await db.insert(chatbotTemplates).values({
    name,
    templateType,
    content,
    language,
    isActive,
    displayOrder,
    validFrom,
  validTo
  }).returning();
    return template;
  }

  async updateChatbotTemplate(id: number, updates: Partial<InsertChatbotTemplate>): Promise<ChatbotTemplate | undefined> {
    const [template] = await db.update(chatbotTemplates)
  .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(chatbotTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteChatbotTemplate(id: number): Promise<boolean> {
    const deleted = await db.delete(chatbotTemplates).where(eq(chatbotTemplates.id, id)).returning({ id: chatbotTemplates.id });
    return deleted.length > 0;
  }

  // 🏠 HOMEPAGE CONTENT OPERATIONS
  async getAllHomepageContent(): Promise<HomepageContent[]> {
    return await db.select().from(homepageContent).orderBy(homepageContent.displayOrder, desc(homepageContent.createdAt));
  }

  async getHomepageContentByType(sectionType: string): Promise<HomepageContent[]> {
    return await db.select().from(homepageContent)
      .where(and(
        eq(homepageContent.sectionType, sectionType),
        eq(homepageContent.isActive, true)
      ))
      .orderBy(homepageContent.displayOrder);
  }

  async getActiveHomepageContent(): Promise<HomepageContent[]> {
    return await db.select().from(homepageContent)
      .where(eq(homepageContent.isActive, true))
      .orderBy(homepageContent.displayOrder);
  }

  async createHomepageContent(data: InsertHomepageContent): Promise<HomepageContent> {
    const [content] = await db.insert(homepageContent).values(data).returning();
    return content;
  }

  async updateHomepageContent(id: number, updates: Partial<InsertHomepageContent>): Promise<HomepageContent | undefined> {
    const [content] = await db.update(homepageContent)
  .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(homepageContent.id, id))
      .returning();
    return content || undefined;
  }

  async deleteHomepageContent(id: number): Promise<boolean> {
    const deleted = await db.delete(homepageContent).where(eq(homepageContent.id, id)).returning({ id: homepageContent.id });
    return deleted.length > 0;
  }

  // ⚙️ ADMIN SETTINGS OPERATIONS
  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return await db.select().from(adminSettings);
  }

  async getAdminSetting(key: string): Promise<AdminSetting | undefined> {
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, key));
    return setting || undefined;
  }

  async getPublicSettings(): Promise<AdminSetting[]> {
    return await db.select().from(adminSettings).where(eq(adminSettings.isPublic, true));
  }

  async setAdminSetting(data: InsertAdminSetting): Promise<AdminSetting> {
    const [setting] = await db.insert(adminSettings)
      .values(data)
      .onConflictDoUpdate({
        target: adminSettings.settingKey,
        set: {
          settingValue: data.settingValue,
          settingType: data.settingType,
          description: data.description,
          isPublic: data.isPublic,
          updatedAt: new Date().toISOString(),
        },
      })
      .returning();
    return setting;
  }

  async deleteAdminSetting(key: string): Promise<boolean> {
    const deleted = await db.delete(adminSettings).where(eq(adminSettings.settingKey, key)).returning({ key: adminSettings.settingKey });
    return deleted.length > 0;
  }

  // 🚀 INITIALIZE DEFAULT DATA
  async initializeDefaultData() {
    try {
      // Create default admin user if doesn't exist
      const existingAdmin = await this.getUserByUsername('admin');
      if (!existingAdmin) {
        await this.createUser({
          username: 'admin',
          password: 'bongbari2025'
        });
        console.log('✅ Default admin user created: username=admin, password=bongbari2025');
      }

      // Create default chatbot templates
      const existingTemplates = await this.getChatbotTemplatesByType('greeting');
      if (existingTemplates.length === 0) {
        await this.createChatbotTemplate({
          name: 'Default Greeting',
          templateType: 'greeting',
          content: '🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant! Bong Bari সম্পর্কে জানতে চান? Bengali comedy নিয়ে আড্ডা দিতে চান? Ask me anything!',
          language: 'auto',
          isActive: true,
          displayOrder: 1
        });

        await this.createChatbotTemplate({
          name: 'Quick Reply - Comedy',
          templateType: 'quick_reply',
          content: 'Kadate tow sobai pare Haste Chao?',
          language: 'benglish',
          isActive: true,
          displayOrder: 1
        });

        await this.createChatbotTemplate({
          name: 'Quick Reply - Collaboration',
          templateType: 'quick_reply',
          content: 'Collab korlei Hese Felbe, Try?',
          language: 'benglish',
          isActive: true,
          displayOrder: 2
        });

        console.log('✅ Default chatbot templates created');
      }

      // Create default admin settings
      await this.setAdminSetting({
        settingKey: 'chatbot_enabled',
        settingValue: 'true',
        settingType: 'boolean',
        description: 'Enable/disable the chatbot',
        isPublic: true
      });

      await this.setAdminSetting({
        settingKey: 'maintenance_mode',
        settingValue: 'false',
        settingType: 'boolean',
        description: 'Enable maintenance mode',
        isPublic: true
      });

      console.log('✅ Default admin settings created');

    } catch (error) {
      console.error('❌ Error initializing default data:', error);
    }
  }

}

export const databaseStorage = new DatabaseStorage();