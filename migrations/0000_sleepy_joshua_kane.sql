CREATE TYPE "public"."lead_status" AS ENUM('new', 'hot', 'warm', 'cold', 'dead');--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(255) NOT NULL,
	"setting_value" text,
	"setting_type" varchar(50) DEFAULT 'text',
	"description" text,
	"is_public" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chatbot_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"template_type" varchar(100) NOT NULL,
	"content" text NOT NULL,
	"language" varchar(50) DEFAULT 'auto',
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 1,
	"valid_from" timestamp DEFAULT now(),
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatbot_training" (
	"id" serial PRIMARY KEY NOT NULL,
	"keyword" varchar(255) NOT NULL,
	"user_message" text NOT NULL,
	"bot_response" text NOT NULL,
	"language" varchar(50) DEFAULT 'auto',
	"category" varchar(100) DEFAULT 'general',
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collaboration_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'submitted',
	"opened" boolean DEFAULT false,
	"opened_at" timestamp,
	"lead_status" "lead_status" DEFAULT 'new',
	"follow_up_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_pending_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"text" text NOT NULL,
	"author" text,
	"language" varchar(2) DEFAULT 'en' NOT NULL,
	"flagged_terms" text,
	"moderation_flags" text,
	"moderation_reason" text,
	"moderation_used_ai" boolean DEFAULT false,
	"moderation_severity" integer DEFAULT 0,
	"moderation_decision" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_pending_posts_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"author" text,
	"language" varchar(2) DEFAULT 'en' NOT NULL,
	"featured" boolean DEFAULT false,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"moderation_flags" text,
	"moderation_reason" text,
	"moderation_used_ai" boolean DEFAULT false,
	"moderation_severity" integer DEFAULT 0,
	"moderation_decision" varchar(50) DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"count" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homepage_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_type" varchar(100) NOT NULL,
	"title" varchar(255),
	"content" text,
	"image_url" text,
	"link_url" varchar(500),
	"button_text" varchar(100),
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 1,
	"valid_from" timestamp DEFAULT now(),
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;