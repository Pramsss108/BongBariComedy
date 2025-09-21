import { eq, and, or, desc } from 'drizzle-orm';
import { pgDb } from './db.pg';
import { 
  users, blogPosts, collaborationRequests,
  type User, type InsertUser, type BlogPost, type InsertBlogPost,
  type CollaborationRequest, type InsertCollaborationRequest
} from '../shared/schema';

export class PostgresStorage {
  private db = pgDb;
  available() { return !!this.db; }

  async getUser(id: string): Promise<User | undefined> { if(!this.db) return undefined; const [u]= await this.db.select().from(users).where(eq(users.id,id)); return u; }
  async getUserByUsername(username: string): Promise<User | undefined> { if(!this.db) return undefined; const [u]= await this.db.select().from(users).where(eq(users.username,username)); return u; }
  async createUser(insert: InsertUser): Promise<User> { if(!this.db) throw new Error('db'); const [u]= await this.db.insert(users).values(insert).returning(); return u; }

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
}

export const postgresStorage = new PostgresStorage();