PRAGMA busy_timeout = 10000;
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  duration_seconds REAL NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  is_vertical INTEGER NOT NULL,
  thumbnail_filename TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS platform_posts (
  id TEXT PRIMARY KEY,
  upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube','tiktok','instagram')),
  enabled INTEGER NOT NULL DEFAULT 1,
  caption TEXT NOT NULL,
  hashtags_json TEXT NOT NULL,
  privacy TEXT NOT NULL,
  scheduled_at TEXT,
  use_thumbnail INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  export_filename TEXT,
  posted_url TEXT,
  error TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(upload_id, platform)
);

CREATE TABLE IF NOT EXISTS hashtag_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hashtags_json TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  platform TEXT PRIMARY KEY,
  encrypted_payload TEXT NOT NULL,
  account_label TEXT,
  updated_at TEXT NOT NULL
);
