import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema.sqlite';

// Initialize database and ensure required tables exist for development
const sqlite = new Database('bongbari.sqlite');

// Create tables if they do not exist (lightweight bootstrap for dev/local)
sqlite.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
	username TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
	id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
	title TEXT NOT NULL,
	content TEXT NOT NULL,
	excerpt TEXT,
	slug TEXT NOT NULL UNIQUE,
	created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS collaboration_requests (
	id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
	name TEXT NOT NULL,
	email TEXT,
	phone TEXT,
	company TEXT NOT NULL,
	message TEXT,
	status TEXT DEFAULT ('submitted'),
	opened INTEGER DEFAULT 0,
	opened_at TEXT,
	lead_status TEXT DEFAULT ('new'),
	follow_up_notes TEXT,
	created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS chatbot_training (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	keyword TEXT NOT NULL,
	user_message TEXT NOT NULL,
	bot_response TEXT NOT NULL,
	language TEXT DEFAULT ('auto'),
	category TEXT DEFAULT ('general'),
	is_active INTEGER DEFAULT 1,
	priority INTEGER DEFAULT 1,
	created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS chatbot_templates (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	template_type TEXT NOT NULL,
	content TEXT NOT NULL,
	language TEXT DEFAULT ('auto'),
	is_active INTEGER DEFAULT 1,
	display_order INTEGER DEFAULT 1,
	valid_from TEXT DEFAULT (CURRENT_TIMESTAMP),
	valid_to TEXT,
	created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS homepage_content (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	section_type TEXT NOT NULL,
	title TEXT,
	content TEXT,
	image_url TEXT,
	link_url TEXT,
	button_text TEXT,
	is_active INTEGER DEFAULT 1,
	display_order INTEGER DEFAULT 1,
	valid_from TEXT DEFAULT (CURRENT_TIMESTAMP),
	valid_to TEXT,
	created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
	updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS admin_settings (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	setting_key TEXT NOT NULL UNIQUE,
	setting_value TEXT,
	setting_type TEXT DEFAULT ('text'),
	description TEXT,
	is_public INTEGER DEFAULT 0,
	updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
);
`);

export const db = drizzle(sqlite, { schema });
