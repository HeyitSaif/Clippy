import type Database from 'better-sqlite3'
import log from 'electron-log'
import { FTS_DROP_SQL, FTS_TABLE_SQL, FTS_TRIGGER_DROP_SQL } from './schema'

const FTS_VERSION = '5'

export interface FtsClipFields {
  preview: string
  textContent: string | null
  snippetName: string | null
  tagsJson: string
}

function isFtsError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const code = (err as { code?: string }).code
  const message = String((err as { message?: string }).message ?? '')
  return (
    code === 'SQLITE_CORRUPT_VTAB' ||
    code === 'SQLITE_CORRUPT' ||
    (code === 'SQLITE_ERROR' && message.toLowerCase().includes('logic error'))
  )
}

export function setupFts(
  db: Database.Database,
  getMeta: (key: string) => string | null,
  setMeta: (key: string, value: string) => void
): void {
  db.exec(FTS_TRIGGER_DROP_SQL)
  db.exec(FTS_TABLE_SQL)

  const version = getMeta('fts_version')
  if (version !== FTS_VERSION || !isFtsHealthy(db)) {
    log.warn('Rebuilding clip search index (FTS)')
    recreateFts(db)
    setMeta('fts_version', FTS_VERSION)
  }
}

export function isFtsHealthy(db: Database.Database): boolean {
  try {
    db.prepare('SELECT COUNT(*) AS c FROM clips_fts').get()
    const clipCount = (db.prepare('SELECT COUNT(*) AS c FROM clips').get() as { c: number }).c
    const ftsCount = (db.prepare('SELECT COUNT(*) AS c FROM clips_fts').get() as { c: number }).c
    return clipCount === ftsCount
  } catch {
    return false
  }
}

export function recreateFts(db: Database.Database): void {
  db.exec(FTS_DROP_SQL)
  db.exec(FTS_TABLE_SQL)
  rebuildFtsIndex(db)
}

export function rebuildFtsIndex(db: Database.Database): void {
  db.exec('DELETE FROM clips_fts')
  const clipCount = (db.prepare('SELECT COUNT(*) AS c FROM clips').get() as { c: number }).c
  if (clipCount === 0) return
  db.exec(`
    INSERT INTO clips_fts(rowid, preview, text_content, snippet_name, tags)
    SELECT rowid, preview, COALESCE(text_content, ''), COALESCE(snippet_name, ''), tags FROM clips
  `)
}

export function getClipRowid(db: Database.Database, id: string): number | null {
  const row = db.prepare('SELECT rowid FROM clips WHERE id = ?').get(id) as { rowid: number } | undefined
  return row?.rowid ?? null
}

export function syncFtsRow(db: Database.Database, rowid: number, fields: FtsClipFields): void {
  db.prepare('DELETE FROM clips_fts WHERE rowid = ?').run(rowid)
  db.prepare(
    `INSERT INTO clips_fts(rowid, preview, text_content, snippet_name, tags)
     VALUES (?, ?, ?, ?, ?)`
  ).run(rowid, fields.preview, fields.textContent ?? '', fields.snippetName ?? '', fields.tagsJson)
}

export function deleteFtsRow(db: Database.Database, rowid: number): void {
  db.prepare('DELETE FROM clips_fts WHERE rowid = ?').run(rowid)
}

export function runWithFtsRecovery<T>(db: Database.Database, fn: () => T): T {
  try {
    return fn()
  } catch (err) {
    if (!isFtsError(err)) throw err
    log.warn('FTS error during write — rebuilding index', err)
    recreateFts(db)
    return fn()
  }
}

export function ftsFieldsFromRecord(record: {
  preview: string
  textContent: string | null
  snippetName: string | null
  tags: string[]
}): FtsClipFields {
  return {
    preview: record.preview,
    textContent: record.textContent,
    snippetName: record.snippetName,
    tagsJson: JSON.stringify(record.tags)
  }
}
