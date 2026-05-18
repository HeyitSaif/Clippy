export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('text', 'image', 'file')),
  hash TEXT NOT NULL UNIQUE,
  preview TEXT NOT NULL DEFAULT '',
  text_content TEXT,
  html_content TEXT,
  rtf_content TEXT,
  image_path TEXT,
  thumb_path TEXT,
  file_path TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_snippet INTEGER NOT NULL DEFAULT 0,
  snippet_name TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_pinned ON clips(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_type ON clips(type);
CREATE INDEX IF NOT EXISTS idx_clips_snippet ON clips(is_snippet);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export const FTS_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(
  preview,
  text_content,
  snippet_name,
  tags,
  tokenize='unicode61'
);
`

export const FTS_TRIGGER_DROP_SQL = `
DROP TRIGGER IF EXISTS clips_fts_insert;
DROP TRIGGER IF EXISTS clips_fts_update;
DROP TRIGGER IF EXISTS clips_fts_delete;
DROP TRIGGER IF EXISTS clips_fts_ai;
DROP TRIGGER IF EXISTS clips_fts_ad;
DROP TRIGGER IF EXISTS clips_fts_au;
DROP TRIGGER IF EXISTS clips_fts_bd;
DROP TRIGGER IF EXISTS clips_fts_bu;
DROP TRIGGER IF EXISTS clips_fts_biu;
DROP TRIGGER IF EXISTS clips_fts_bu;
`

export const FTS_DROP_SQL = `
${FTS_TRIGGER_DROP_SQL}
DROP TABLE IF EXISTS clips_fts;
`
