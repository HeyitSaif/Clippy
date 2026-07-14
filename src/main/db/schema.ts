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

CREATE TABLE IF NOT EXISTS todo_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('inbox', 'daily', 'weekly', 'custom')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER,
  remind_at INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_todos_list_id ON todos(list_id);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_todos_due_at ON todos(due_at);
CREATE INDEX IF NOT EXISTS idx_todos_remind_at ON todos(remind_at);
`

export const FTS_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(
  preview,
  text_content,
  snippet_name,
  tags,
  content='clips',
  content_rowid='rowid',
  tokenize='unicode61'
);
`

/** Keep FTS in sync with clips via external-content triggers (insert / delete / update). */
export const FTS_TRIGGER_CREATE_SQL = `
CREATE TRIGGER IF NOT EXISTS clips_fts_ai AFTER INSERT ON clips BEGIN
  INSERT INTO clips_fts(rowid, preview, text_content, snippet_name, tags)
  VALUES (new.rowid, new.preview, new.text_content, new.snippet_name, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS clips_fts_ad AFTER DELETE ON clips BEGIN
  INSERT INTO clips_fts(clips_fts, rowid, preview, text_content, snippet_name, tags)
  VALUES ('delete', old.rowid, old.preview, old.text_content, old.snippet_name, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS clips_fts_au AFTER UPDATE ON clips
WHEN old.preview IS NOT new.preview
  OR old.text_content IS NOT new.text_content
  OR old.snippet_name IS NOT new.snippet_name
  OR old.tags IS NOT new.tags
BEGIN
  INSERT INTO clips_fts(clips_fts, rowid, preview, text_content, snippet_name, tags)
  VALUES ('delete', old.rowid, old.preview, old.text_content, old.snippet_name, old.tags);
  INSERT INTO clips_fts(rowid, preview, text_content, snippet_name, tags)
  VALUES (new.rowid, new.preview, new.text_content, new.snippet_name, new.tags);
END;
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
`

export const FTS_DROP_SQL = `
${FTS_TRIGGER_DROP_SQL}
DROP TABLE IF EXISTS clips_fts;
`
