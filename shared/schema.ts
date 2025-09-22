import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lead status enum for collaboration requests
export const leadStatusEnum = pgEnum('lead_status', ['new', 'hot', 'warm', 'cold', 'dead']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collaborationRequests = pgTable("collaboration_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company").notNull(),
  message: text("message"),
  status: text("status").default("submitted"),
  opened: boolean("opened").default(false),
  openedAt: timestamp("opened_at"),
  leadStatus: leadStatusEnum("lead_status").default('new'),
  followUpNotes: text("follow_up_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community posts schema (Bong Kahini)
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  author: text("author"), // null for anonymous
  language: varchar("language", { length: 2 }).notNull().default("en"), // 'bn' or 'en'
  featured: boolean("featured").default(false),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Moderation fields
  moderationFlags: text("moderation_flags"), // JSON array of flags
  moderationReason: text("moderation_reason"),
  moderationUsedAI: boolean("moderation_used_ai").default(false),
  moderationSeverity: integer("moderation_severity").default(0),
  moderationDecision: varchar("moderation_decision", { length: 50 }).default("pending"),
});

// Community post reactions
export const communityReactions = pgTable("community_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  reactionType: varchar("reaction_type", { length: 20 }).notNull(), // 'heart', 'laugh', 'thumbs', etc
  count: integer("count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community pending posts (moderation queue)
export const communityPendingPosts = pgTable("community_pending_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().unique(), // Original post ID for tracking
  text: text("text").notNull(),
  author: text("author"), // null for anonymous
  language: varchar("language", { length: 2 }).notNull().default("en"),
  flaggedTerms: text("flagged_terms"), // JSON array
  
  // Moderation fields
  moderationFlags: text("moderation_flags"), // JSON array of flags
  moderationReason: text("moderation_reason"),
  moderationUsedAI: boolean("moderation_used_ai").default(false),
  moderationSeverity: integer("moderation_severity").default(0),
  moderationDecision: varchar("moderation_decision", { length: 50 }).default("pending"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Rate limiting for posts and reactions (using device + IP hash for deduplication)
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(), // 'post:ip:deviceHash' or 'reaction:postId:type:deviceHash'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityPendingPostSchema = createInsertSchema(communityPendingPosts).omit({
  id: true,
  createdAt: true,
});

export const insertCollaborationRequestSchema = createInsertSchema(collaborationRequests).omit({
  id: true,
  createdAt: true,
}).refine((data) => {
  // At least one contact method (email or phone) must be provided
  return data.email || data.phone;
}, {
  message: "Either email or phone number must be provided",
  path: ["email", "phone"]
});

// Export select and insert types for core tables
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type CollaborationRequest = typeof collaborationRequests.$inferSelect;
export type InsertCollaborationRequest = z.infer<typeof insertCollaborationRequestSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type CommunityReaction = typeof communityReactions.$inferSelect;
export type CommunityPendingPost = typeof communityPendingPosts.$inferSelect;

// Chatbot Training Data Table
export const chatbotTraining = pgTable("chatbot_training", {
  id: serial("id").primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response").notNull(),
  language: varchar("language", { length: 50 }).default("auto"), // auto, bengali, english, benglish
  category: varchar("category", { length: 100 }).default("general"), // general, comedy, collaboration, culture
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // 1-10, higher priority responses used first
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chatbot Templates Table
export const chatbotTemplates = pgTable("chatbot_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  templateType: varchar("template_type", { length: 100 }).notNull(), // greeting, quick_reply, offer, fallback
  content: text("content").notNull(),
  language: varchar("language", { length: 50 }).default("auto"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(1),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Homepage Content Table
export const homepageContent = pgTable("homepage_content", {
  id: serial("id").primaryKey(),
  sectionType: varchar("section_type", { length: 100 }).notNull(), // offer, greeting, announcement, banner
  title: varchar("title", { length: 255 }),
  content: text("content"),
  imageUrl: text("image_url"), // Changed to text to handle base64 image data
  linkUrl: varchar("link_url", { length: 500 }),
  buttonText: varchar("button_text", { length: 100 }),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(1),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin Settings Table
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 255 }).notNull().unique(),
  settingValue: text("setting_value"),
  settingType: varchar("setting_type", { length: 50 }).default("text"), // text, number, boolean, json
  description: text("description"),
  isPublic: boolean("is_public").default(false), // whether setting can be accessed by frontend
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemas for new tables
export const insertChatbotTrainingSchema = createInsertSchema(chatbotTraining).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotTemplateSchema = createInsertSchema(chatbotTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomepageContentSchema = createInsertSchema(homepageContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  id: true,
  updatedAt: true,
});

// Export types for all new tables
export type ChatbotTraining = typeof chatbotTraining.$inferSelect;
export type InsertChatbotTraining = z.infer<typeof insertChatbotTrainingSchema>;

export type ChatbotTemplate = typeof chatbotTemplates.$inferSelect;
export type InsertChatbotTemplate = z.infer<typeof insertChatbotTemplateSchema>;

export type HomepageContent = typeof homepageContent.$inferSelect;
export type InsertHomepageContent = z.infer<typeof insertHomepageContentSchema>;

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
