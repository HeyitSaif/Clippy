import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import log from 'electron-log'
import { SCHEMA_SQL } from './schema'
import type { AppSettings, ClipListItem, ClipRecord, ClipSearchQuery, ClipType } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { buildFtsQuery } from '@shared/search'
import { isFtsHealthy, rebuildFtsIndex, runWithFtsRecovery, setupFts, syncFtsRow, deleteFtsRow, getClipRowid, ftsFieldsFromRecord } from './fts'

function rowToRecord(row: Record<string, unknown>): ClipRecord {
  return {
    id: row.id as string,
    type: row.type as ClipType,
    hash: row.hash as string,
    preview: row.preview as string,
    textContent: (row.text_content as string | null) ?? null,
    htmlContent: (row.html_content as string | null) ?? null,
    rtfContent: (row.rtf_content as string | null) ?? null,
    imagePath: (row.image_path as string | null) ?? null,
    thumbPath: (row.thumb_path as string | null) ?? null,
    filePath: (row.file_path as string | null) ?? null,
    isPinned: Boolean(row.is_pinned),
    isSnippet: Boolean(row.is_snippet),
    snippetName: (row.snippet_name as string | null) ?? null,
    tags: JSON.parse((row.tags as string) || '[]') as string[],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number
  }
}

const LIST_COLUMNS = `id, type, hash, preview, thumb_path, is_pinned, is_snippet, snippet_name, tags, created_at`

function listRowToItem(row: Record<string, unknown>): ClipListItem {
  return {
    id: row.id as string,
    type: row.type as ClipType,
    hash: row.hash as string,
    preview: row.preview as string,
    hasThumb: Boolean(row.thumb_path),
    isPinned: Boolean(row.is_pinned),
    isSnippet: Boolean(row.is_snippet),
    snippetName: (row.snippet_name as string | null) ?? null,
    tags: JSON.parse((row.tags as string) || '[]') as string[],
    createdAt: row.created_at as number
  }
}

export class ClipRepository {
  readonly db: Database.Database
  readonly imagesDir: string
  readonly thumbsDir: string

  constructor(dbPath: string, userDataPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    this.imagesDir = path.join(userDataPath, 'images')
    this.thumbsDir = path.join(userDataPath, 'thumbs')
    fs.mkdirSync(this.imagesDir, { recursive: true })
    fs.mkdirSync(this.thumbsDir, { recursive: true })

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA_SQL)
    setupFts(this.db, (key) => this.getMeta(key), (key, value) => this.setMeta(key, value))
  }

  close(): void {
    this.db.close()
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value ?? null
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value)
  }

  insertClip(input: Omit<ClipRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ClipRecord {
    const now = Date.now()
    const id = input.id ?? crypto.randomUUID()
    const tagsJson = JSON.stringify(input.tags)
    this.db
      .prepare(
        `INSERT INTO clips (
          id, type, hash, preview, text_content, html_content, rtf_content,
          image_path, thumb_path, file_path, is_pinned, is_snippet, snippet_name,
          tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.type,
        input.hash,
        input.preview,
        input.textContent,
        input.htmlContent,
        input.rtfContent,
        input.imagePath,
        input.thumbPath,
        input.filePath,
        input.isPinned ? 1 : 0,
        input.isSnippet ? 1 : 0,
        input.snippetName,
        tagsJson,
        now,
        now
      )
    const record = this.getById(id)!
    const rowid = getClipRowid(this.db, id)
    if (rowid !== null) {
      runWithFtsRecovery(this.db, () => {
        syncFtsRow(this.db, rowid, ftsFieldsFromRecord(record))
      })
    }
    return record
  }

  getById(id: string): ClipRecord | null {
    const row = this.db.prepare('SELECT * FROM clips WHERE id = ?').get(id)
    return row ? rowToRecord(row as Record<string, unknown>) : null
  }

  getByHash(hash: string): ClipRecord | null {
    const row = this.db.prepare('SELECT * FROM clips WHERE hash = ?').get(hash)
    return row ? rowToRecord(row as Record<string, unknown>) : null
  }

  touchByHash(hash: string): ClipRecord | null {
    const clip = this.getByHash(hash)
    if (!clip) return null
    const now = Date.now()
    this.db.prepare('UPDATE clips SET created_at = ?, updated_at = ? WHERE id = ?').run(now, now, clip.id)
    return this.getById(clip.id)
  }

  getThumbDataUrl(id: string): string | null {
    const row = this.db.prepare('SELECT thumb_path FROM clips WHERE id = ?').get(id) as
      | { thumb_path: string | null }
      | undefined
    if (!row?.thumb_path || !fs.existsSync(row.thumb_path)) return null
    const buf = fs.readFileSync(row.thumb_path)
    return `data:image/png;base64,${buf.toString('base64')}`
  }

  getListItem(id: string): ClipListItem | null {
    const row = this.db.prepare(`SELECT ${LIST_COLUMNS} FROM clips WHERE id = ?`).get(id)
    return row ? listRowToItem(row as Record<string, unknown>) : null
  }

  getThumbsBatch(ids: string[]): Record<string, string> {
    if (ids.length === 0) return {}
    const placeholders = ids.map(() => '?').join(',')
    const rows = this.db
      .prepare(`SELECT id, thumb_path FROM clips WHERE id IN (${placeholders}) AND thumb_path IS NOT NULL`)
      .all(...ids) as { id: string; thumb_path: string }[]
    const out: Record<string, string> = {}
    for (const row of rows) {
      if (!fs.existsSync(row.thumb_path)) continue
      const buf = fs.readFileSync(row.thumb_path)
      out[row.id] = `data:image/png;base64,${buf.toString('base64')}`
    }
    return out
  }

  list(limit = 50, offset = 0): ClipListItem[] {
    const rows = this.db
      .prepare(`SELECT ${LIST_COLUMNS} FROM clips ORDER BY is_pinned DESC, created_at DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as Record<string, unknown>[]
    return rows.map((row) => listRowToItem(row))
  }

  search(query: ClipSearchQuery): ClipListItem[] {
    const limit = query.limit ?? 100
    const offset = query.offset ?? 0
    const filters: string[] = []
    const params: unknown[] = []

    if (query.type && query.type !== 'all') {
      filters.push('c.type = ?')
      params.push(query.type)
    }
    if (query.pinned === true) {
      filters.push('c.is_pinned = 1')
    }
    if (query.snippet === true) {
      filters.push('c.is_snippet = 1')
    }
    if (query.tag) {
      filters.push('c.tags LIKE ?')
      params.push(`%"${query.tag.replace(/"/g, '')}"%`)
    }

    const text = query.text?.trim()
    const whereBase = filters.length ? filters.join(' AND ') : '1=1'

    if (text && query.regex) {
      try {
        const re = new RegExp(text, 'i')
        const sql = `SELECT ${LIST_COLUMNS.split(', ').map((c) => `c.${c}`).join(', ')} FROM clips c WHERE ${whereBase} ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT 500`
        const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[]
        return rows
          .map((row) => listRowToItem(row))
          .filter((item) => re.test(item.preview) || re.test(item.snippetName ?? ''))
          .slice(offset, offset + limit)
      } catch {
        /* fall through to FTS */
      }
    }

    if (text) {
      const ftsQuery = buildFtsQuery(text)
      try {
        const cols = LIST_COLUMNS.split(', ').map((c) => `c.${c}`).join(', ')
        const sql = `SELECT ${cols} FROM clips c
          INNER JOIN clips_fts ON c.rowid = clips_fts.rowid
          WHERE ${whereBase} AND clips_fts MATCH ?
          ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT ? OFFSET ?`
        const rows = this.db.prepare(sql).all(...params, ftsQuery, limit, offset) as Record<string, unknown>[]
        return rows.map((row) => listRowToItem(row))
      } catch (err) {
        log.warn('FTS search failed, falling back to LIKE', err)
        if (isFtsHealthy(this.db) === false) {
          rebuildFtsIndex(this.db)
        }
        const like = `%${text}%`
        const cols = LIST_COLUMNS.split(', ').map((c) => `c.${c}`).join(', ')
        const sql = `SELECT ${cols} FROM clips c WHERE ${whereBase}
          AND (c.preview LIKE ? OR c.text_content LIKE ? OR c.snippet_name LIKE ? OR c.tags LIKE ?)
          ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT ? OFFSET ?`
        const rows = this.db.prepare(sql).all(...params, like, like, like, like, limit, offset) as Record<
          string,
          unknown
        >[]
        return rows.map((row) => listRowToItem(row))
      }
    }

    const cols = LIST_COLUMNS.split(', ').map((c) => `c.${c}`).join(', ')
    const sql = `SELECT ${cols} FROM clips c WHERE ${whereBase} ORDER BY c.is_pinned DESC, c.created_at DESC LIMIT ? OFFSET ?`
    const rows = this.db.prepare(sql).all(...params, limit, offset) as Record<string, unknown>[]
    return rows.map((row) => listRowToItem(row))
  }

  private toListItemFromRow(row: Record<string, unknown>): ClipListItem {
    if ('text_content' in row) {
      const record = rowToRecord(row)
      return listRowToItem({
        id: record.id,
        type: record.type,
        hash: record.hash,
        preview: record.preview,
        thumb_path: record.thumbPath,
        is_pinned: record.isPinned ? 1 : 0,
        is_snippet: record.isSnippet ? 1 : 0,
        snippet_name: record.snippetName,
        tags: JSON.stringify(record.tags),
        created_at: record.createdAt
      })
    }
    return listRowToItem(row)
  }

  delete(id: string): void {
    const row = this.db.prepare('SELECT rowid, image_path, thumb_path FROM clips WHERE id = ?').get(id) as
      | { rowid: number; image_path: string | null; thumb_path: string | null }
      | undefined
    if (!row) return
    this.db.prepare('DELETE FROM clips WHERE id = ?').run(id)
    runWithFtsRecovery(this.db, () => {
      deleteFtsRow(this.db, row.rowid)
    })
    if (row.image_path && fs.existsSync(row.image_path)) fs.unlinkSync(row.image_path)
    if (row.thumb_path && fs.existsSync(row.thumb_path)) fs.unlinkSync(row.thumb_path)
  }

  togglePin(id: string): ClipRecord | null {
    const clip = this.getById(id)
    if (!clip) return null
    const isPinned = !clip.isPinned
    this.db
      .prepare('UPDATE clips SET is_pinned = ?, updated_at = ? WHERE id = ?')
      .run(isPinned ? 1 : 0, Date.now(), id)
    return this.getById(id)
  }

  toggleSnippet(id: string, snippetName?: string): ClipRecord | null {
    const clip = this.getById(id)
    if (!clip) return null
    const isSnippet = !clip.isSnippet
    this.db
      .prepare('UPDATE clips SET is_snippet = ?, snippet_name = ?, updated_at = ? WHERE id = ?')
      .run(isSnippet ? 1 : 0, isSnippet ? snippetName ?? clip.preview.slice(0, 40) : null, Date.now(), id)
    const updated = this.getById(id)!
    const rowid = getClipRowid(this.db, id)
    if (rowid !== null) {
      runWithFtsRecovery(this.db, () => {
        syncFtsRow(this.db, rowid, ftsFieldsFromRecord(updated))
      })
    }
    return updated
  }

  updateTags(id: string, tags: string[]): ClipRecord | null {
    this.db
      .prepare('UPDATE clips SET tags = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(tags), Date.now(), id)
    const updated = this.getById(id)
    if (!updated) return null
    const rowid = getClipRowid(this.db, id)
    if (rowid !== null) {
      runWithFtsRecovery(this.db, () => {
        syncFtsRow(this.db, rowid, ftsFieldsFromRecord(updated))
      })
    }
    return updated
  }

  clearUnpinned(): number {
    const rows = this.db
      .prepare('SELECT id, image_path, thumb_path FROM clips WHERE is_pinned = 0 AND is_snippet = 0')
      .all() as { id: string; image_path: string | null; thumb_path: string | null }[]
    for (const row of rows) {
      if (row.image_path && fs.existsSync(row.image_path)) fs.unlinkSync(row.image_path)
      if (row.thumb_path && fs.existsSync(row.thumb_path)) fs.unlinkSync(row.thumb_path)
    }
    const count = this.db.prepare('DELETE FROM clips WHERE is_pinned = 0 AND is_snippet = 0').run().changes
    runWithFtsRecovery(this.db, () => {
      rebuildFtsIndex(this.db)
    })
    return count
  }

  trimHistory(maxHistory: number): void {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM clips WHERE is_pinned = 0 AND is_snippet = 0').get() as {
      c: number
    }
    if (count.c <= maxHistory) return
    const excess = count.c - maxHistory
    const oldRows = this.db
      .prepare(
        `SELECT id, image_path, thumb_path FROM clips
         WHERE is_pinned = 0 AND is_snippet = 0
         ORDER BY created_at ASC LIMIT ?`
      )
      .all(excess) as { id: string; image_path: string | null; thumb_path: string | null }[]
    for (const row of oldRows) {
      if (row.image_path && fs.existsSync(row.image_path)) fs.unlinkSync(row.image_path)
      if (row.thumb_path && fs.existsSync(row.thumb_path)) fs.unlinkSync(row.thumb_path)
      this.db.prepare('DELETE FROM clips WHERE id = ?').run(row.id)
    }
    runWithFtsRecovery(this.db, () => {
      rebuildFtsIndex(this.db)
    })
  }

  getRecent(limit: number): ClipRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM clips ORDER BY created_at DESC LIMIT ?')
      .all(limit) as Record<string, unknown>[]
    return rows.map((row) => rowToRecord(row))
  }

  getAllRecords(): ClipRecord[] {
    const rows = this.db.prepare('SELECT * FROM clips ORDER BY created_at DESC').all() as Record<string, unknown>[]
    return rows.map((row) => rowToRecord(row))
  }

  saveImageFiles(hash: string, imageBuffer: Buffer, thumbBuffer: Buffer): { imagePath: string; thumbPath: string } {
    const imagePath = path.join(this.imagesDir, `${hash}.png`)
    const thumbPath = path.join(this.thumbsDir, `${hash}.png`)
    fs.writeFileSync(imagePath, imageBuffer)
    fs.writeFileSync(thumbPath, thumbBuffer)
    return { imagePath, thumbPath }
  }

  readImageAsDataUrl(imagePath: string): string {
    const buf = fs.readFileSync(imagePath)
    return `data:image/png;base64,${buf.toString('base64')}`
  }
}

export class SettingsRepository {
  constructor(private db: Database.Database) {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      if (!existing) {
        this.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
      }
    }
  }

  getAll(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const settings = { ...DEFAULT_SETTINGS }
    for (const row of rows) {
      const key = row.key as keyof AppSettings
      if (key in settings) {
        ; (settings as Record<string, unknown>)[key] = JSON.parse(row.value)
      }
    }
    return settings
  }

  update(partial: Partial<AppSettings>): AppSettings {
    const current = this.getAll()
    const next = { ...current, ...partial }
    const stmt = this.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    for (const [key, value] of Object.entries(next)) {
      stmt.run(key, JSON.stringify(value))
    }
    return next
  }
}

export function createDatabase(): { clipRepo: ClipRepository; settingsRepo: SettingsRepository } {
  const userData = app.getPath('userData')
  const dbPath = path.join(userData, 'clippy.db')
  const clipRepo = new ClipRepository(dbPath, userData)
  const settingsRepo = new SettingsRepository(clipRepo.db)
  return { clipRepo, settingsRepo }
}

export function importLegacyV1(clipRepo: ClipRepository): number {
  if (clipRepo.getMeta('v1_migrated') === 'true') return 0

  const legacyPath = path.join(app.getPath('home'), 'Library/Application Support/electron-clippy/config.json')
  if (!fs.existsSync(legacyPath)) {
    clipRepo.setMeta('v1_migrated', 'true')
    return 0
  }

  try {
    const raw = JSON.parse(fs.readFileSync(legacyPath, 'utf8')) as Record<string, unknown>
    const items = (raw['Items Main'] ?? []) as Array<Record<string, unknown>>
    let imported = 0

    for (const item of items) {
      const hash = String(item.hash ?? '')
      if (!hash || clipRepo.getByHash(hash)) continue

      if (item.type === 'text') {
        const text = String(item.text ?? '')
        clipRepo.insertClip({
          type: 'text',
          hash,
          preview: text.length > 255 ? `${text.slice(0, 255)}…` : text,
          textContent: text,
          htmlContent: (item.html as string) ?? null,
          rtfContent: (item.rtf as string) ?? null,
          imagePath: null,
          thumbPath: null,
          filePath: null,
          isPinned: false,
          isSnippet: false,
          snippetName: null,
          tags: []
        })
        imported++
      } else if (item.type === 'image') {
        const dataUrl = String(item.buffer ?? '')
        const thumbUrl = String(item.thumbBuffer ?? '')
        if (!dataUrl.startsWith('data:')) continue
        const imageBuffer = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
        const thumbBuffer = Buffer.from(thumbUrl.split(',')[1] ?? '', 'base64')
        const { imagePath, thumbPath } = clipRepo.saveImageFiles(hash, imageBuffer, thumbBuffer)
        clipRepo.insertClip({
          type: 'image',
          hash,
          preview: 'Image',
          textContent: null,
          htmlContent: null,
          rtfContent: null,
          imagePath,
          thumbPath,
          filePath: null,
          isPinned: false,
          isSnippet: false,
          snippetName: null,
          tags: []
        })
        imported++
      }
    }

    clipRepo.setMeta('v1_migrated', 'true')
    log.info(`Imported ${imported} clips from v1`)
    return imported
  } catch (err) {
    log.error('Failed to import v1 data', err)
    clipRepo.setMeta('v1_migrated', 'true')
    return 0
  }
}
