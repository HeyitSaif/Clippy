import { describe, expect, it } from 'vitest'
import {
  FTS_DROP_SQL,
  FTS_TABLE_SQL,
  FTS_TRIGGER_CREATE_SQL,
  FTS_TRIGGER_DROP_SQL
} from '../src/main/db/schema'

describe('FTS external-content SQL exports', () => {
  it('defines clips_fts as external content over clips.rowid', () => {
    expect(FTS_TABLE_SQL).toMatch(/content\s*=\s*'clips'/)
    expect(FTS_TABLE_SQL).toMatch(/content_rowid\s*=\s*'rowid'/)
    expect(FTS_TABLE_SQL).toContain('preview')
    expect(FTS_TABLE_SQL).toContain('text_content')
    expect(FTS_TABLE_SQL).toContain('snippet_name')
    expect(FTS_TABLE_SQL).toContain('tags')
  })

  it('creates insert, delete, and update triggers', () => {
    expect(FTS_TRIGGER_CREATE_SQL).toContain('clips_fts_ai')
    expect(FTS_TRIGGER_CREATE_SQL).toContain('clips_fts_ad')
    expect(FTS_TRIGGER_CREATE_SQL).toContain('clips_fts_au')
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/AFTER INSERT ON clips/i)
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/AFTER DELETE ON clips/i)
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/AFTER UPDATE ON clips/i)
  })

  it('limits update trigger to FTS columns only', () => {
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/WHEN[\s\S]*old\.preview IS NOT new\.preview/)
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/old\.text_content IS NOT new\.text_content/)
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/old\.snippet_name IS NOT new\.snippet_name/)
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/old\.tags IS NOT new\.tags/)
    // Non-FTS columns must not gate the trigger
    expect(FTS_TRIGGER_CREATE_SQL).not.toMatch(/WHEN[\s\S]*is_pinned/)
    expect(FTS_TRIGGER_CREATE_SQL).not.toMatch(/WHEN[\s\S]*created_at/)
  })

  it('uses FTS5 delete command on delete/update triggers', () => {
    expect(FTS_TRIGGER_CREATE_SQL).toMatch(/VALUES\s*\(\s*'delete'/)
  })

  it('drops legacy and current FTS triggers', () => {
    for (const name of [
      'clips_fts_ai',
      'clips_fts_ad',
      'clips_fts_au',
      'clips_fts_insert',
      'clips_fts_update',
      'clips_fts_delete'
    ]) {
      expect(FTS_TRIGGER_DROP_SQL).toContain(`DROP TRIGGER IF EXISTS ${name}`)
    }
  })

  it('FTS_DROP_SQL drops triggers then the virtual table', () => {
    expect(FTS_DROP_SQL).toContain(FTS_TRIGGER_DROP_SQL.trim())
    expect(FTS_DROP_SQL).toContain('DROP TABLE IF EXISTS clips_fts')
  })
})
