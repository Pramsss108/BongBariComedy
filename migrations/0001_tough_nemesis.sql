CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar,
	"message" text NOT NULL,
	"response" text NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"is_user_message" boolean NOT NULL,
	"message_type" text DEFAULT 'chat',
	"sentiment" text
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_start" timestamp DEFAULT now(),
	"last_active_at" timestamp DEFAULT now(),
	"device_fingerprint" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "community_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"interaction_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"picture_url" text,
	"joined_at" timestamp DEFAULT now(),
	"newsletter_opt_in" boolean DEFAULT true,
	"last_active_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "google_users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "google_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"unsubscribed_at" timestamp,
	"source" text DEFAULT 'google_login',
	"preferences" text,
	CONSTRAINT "newsletter_subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"comedy_style" text,
	"language" text DEFAULT 'bn',
	"notification_settings" text,
	"favorite_topics" text,
	"chat_personality" text DEFAULT 'friendly',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_google_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."google_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_google_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."google_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_interactions" ADD CONSTRAINT "community_interactions_user_id_google_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."google_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscriptions" ADD CONSTRAINT "newsletter_subscriptions_user_id_google_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."google_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_google_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."google_users"("id") ON DELETE no action ON UPDATE no action;