import type Database from 'better-sqlite3'
import log from 'electron-log'
import { FTS_DROP_SQL, FTS_TABLE_SQL, FTS_TRIGGER_CREATE_SQL, FTS_TRIGGER_DROP_SQL } from './schema'

const FTS_VERSION = '6'

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
  } else {
    db.exec(FTS_TRIGGER_CREATE_SQL)
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
  db.exec(FTS_TRIGGER_CREATE_SQL)
}

export function rebuildFtsIndex(db: Database.Database): void {
  db.exec(`INSERT INTO clips_fts(clips_fts) VALUES('rebuild')`)
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
