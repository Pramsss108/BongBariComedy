import { sqliteTable, text, integer, primaryKey, unique, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`lower(hex(randomblob(16)))`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const blogPosts = sqliteTable("blog_posts", {
  id: text("id").primaryKey().default(sql`lower(hex(randomblob(16)))`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const collaborationRequests = sqliteTable("collaboration_requests", {
  id: text("id").primaryKey().default(sql`lower(hex(randomblob(16)))`),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company").notNull(),
  message: text("message"),
  status: text("status").default("submitted"),
    opened: integer("opened", { mode: "boolean" }).default(false),
  openedAt: text("opened_at"),
  leadStatus: text("lead_status").default('new'),
  followUpNotes: text("follow_up_notes"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
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

export const insertCollaborationRequestSchema = createInsertSchema(collaborationRequests).omit({
  id: true,
  createdAt: true,
}).refine((data) => {
  return data.email || data.phone;
}, {
  message: "Please provide either an email address or phone number",
  path: ["email"]
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertCollaborationRequest = z.infer<typeof insertCollaborationRequestSchema>;
export type CollaborationRequest = typeof collaborationRequests.$inferSelect;

export const chatbotTraining = sqliteTable("chatbot_training", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response").notNull(),
  language: text("language").default("auto"),
  category: text("category").default("general"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  priority: integer("priority").default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const chatbotTemplates = sqliteTable("chatbot_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(),
  content: text("content").notNull(),
  language: text("language").default("auto"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  displayOrder: integer("display_order").default(1),
  validFrom: text("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validTo: text("valid_to"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const homepageContent = sqliteTable("homepage_content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sectionType: text("section_type").notNull(),
  title: text("title"),
  content: text("content"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  buttonText: text("button_text"),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
  displayOrder: integer("display_order").default(1),
  validFrom: text("valid_from").default(sql`CURRENT_TIMESTAMP`),
  validTo: text("valid_to"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const adminSettings = sqliteTable("admin_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  settingType: text("setting_type").default("text"),
  description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" }).default(false),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

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

export type ChatbotTraining = typeof chatbotTraining.$inferSelect;
export type InsertChatbotTraining = z.infer<typeof insertChatbotTrainingSchema>;

export type ChatbotTemplate = typeof chatbotTemplates.$inferSelect;
export type InsertChatbotTemplate = z.infer<typeof insertChatbotTemplateSchema>;

export type HomepageContent = typeof homepageContent.$inferSelect;
export type InsertHomepageContent = z.infer<typeof insertHomepageContentSchema>;

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = z.infer<typeof insertAdminSettingSchema>;
