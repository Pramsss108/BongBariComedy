import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertCollaborationRequestSchema = createInsertSchema(collaborationRequests).omit({
  id: true,
  createdAt: true,
}).refine((data) => {
  // At least one contact method (email or phone) must be provided
  return data.email || data.phone;
}, {
  message: "Please provide either an email address or phone number",
  path: ["email"] // This will show the error on the email field
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertCollaborationRequest = z.infer<typeof insertCollaborationRequestSchema>;
export type CollaborationRequest = typeof collaborationRequests.$inferSelect;

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
