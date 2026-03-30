-- BongBari Extractor Intelligence — D1 SQLite Schema
-- Deploy with: npx wrangler d1 execute bongbari-extractor --file workers/schema.sql

-- Client extraction reports: one row per attempt from a visitor's browser
CREATE TABLE IF NOT EXISTS client_proxy_reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_hash    TEXT NOT NULL,
  client_country TEXT,
  mirror_url     TEXT NOT NULL,
  mirror_type    TEXT NOT NULL,   -- 'piped' | 'invidious' | 'cobalt'
  platform       TEXT NOT NULL,   -- 'youtube' | 'instagram' | 'facebook'
  success        INTEGER NOT NULL, -- 1 = true, 0 = false
  latency_ms     INTEGER,
  http_status    INTEGER,
  error_msg      TEXT,
  video_id       TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Mirror health aggregates: one row per mirror URL, updated on every report
CREATE TABLE IF NOT EXISTS mirror_health (
  mirror_url      TEXT PRIMARY KEY,
  mirror_type     TEXT NOT NULL,
  total_requests  INTEGER DEFAULT 0,
  success_count   INTEGER DEFAULT 0,
  avg_latency_ms  INTEGER,
  country_stats   TEXT DEFAULT '{}',  -- JSON: { "IN": { "ok": 5, "fail": 1 } }
  is_alive        INTEGER DEFAULT 1,  -- 1 = alive, 0 = dead
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- Seed with known-good mirrors so first visitors get a ranked list immediately
INSERT OR IGNORE INTO mirror_health (mirror_url, mirror_type, total_requests, success_count, is_alive)
VALUES
  ('https://pipedapi.kavin.rocks',            'piped',     0, 0, 1),
  ('https://pipedapi.adminforge.de',          'piped',     0, 0, 1),
  ('https://pipedapi.in.projectsegfau.lt',    'piped',     0, 0, 1),
  ('https://inv.nadeko.net',                  'invidious', 0, 0, 1),
  ('https://invidious.fdn.fr',                'invidious', 0, 0, 1),
  ('https://invidious.privacyredirect.com',   'invidious', 0, 0, 1);
