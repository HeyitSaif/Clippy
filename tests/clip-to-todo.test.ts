import { describe, expect, it } from 'vitest'
import { todoFromClip } from '../src/shared/clip-to-todo'
import type { ClipRecord } from '../src/shared/types'

function clip(partial: Partial<ClipRecord> & Pick<ClipRecord, 'type'>): ClipRecord {
  return {
    id: '1',
    hash: 'h',
    preview: '',
    textContent: null,
    htmlContent: null,
    rtfContent: null,
    imagePath: null,
    thumbPath: null,
    filePath: null,
    isPinned: false,
    isSnippet: false,
    snippetName: null,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial
  }
}

describe('todoFromClip', () => {
  it('uses first line of text as title and full body as notes', () => {
    const result = todoFromClip(
      clip({
        type: 'text',
        textContent: 'Buy milk\nAlso bread',
        preview: 'Buy milk'
      })
    )
    expect(result.title).toBe('Buy milk')
    expect(result.notes).toBe('Buy milk\nAlso bread')
  })

  it('uses file basename as title', () => {
    const result = todoFromClip(
      clip({
        type: 'file',
        filePath: '/Users/me/Docs/report.pdf',
        preview: '/Users/me/Docs/report.pdf'
      })
    )
    expect(result.title).toBe('report.pdf')
    expect(result.notes).toBe('/Users/me/Docs/report.pdf')
  })

  it('labels images', () => {
    expect(todoFromClip(clip({ type: 'image', preview: 'img' })).title).toBe(
      'Image from clipboard'
    )
  })
})
