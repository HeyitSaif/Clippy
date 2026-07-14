import { describe, expect, it } from 'vitest'
import {
  buildSystemClipboardPayload,
  defaultSnippetName
} from '../src/shared/clipboard-write'
import { applyTodoOrder, moveIdInOrder } from '../src/shared/todo-reorder'
import { todoFromClip } from '../src/shared/clip-to-todo'
import type { ClipRecord } from '../src/shared/types'

function clip(
  partial: Partial<ClipRecord> & Pick<ClipRecord, 'type'>
): ClipRecord {
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

describe('buildSystemClipboardPayload', () => {
  it('writes text only for plain clips', () => {
    expect(
      buildSystemClipboardPayload(
        clip({ type: 'text', textContent: 'hello', preview: 'hello' })
      )
    ).toEqual({ text: 'hello' })
  })

  it('includes html and rtf when present on text clips', () => {
    expect(
      buildSystemClipboardPayload(
        clip({
          type: 'text',
          textContent: 'Hi',
          preview: 'Hi',
          htmlContent: '<b>Hi</b>',
          rtfContent: '{\\rtf1 Hi}'
        })
      )
    ).toEqual({
      text: 'Hi',
      html: '<b>Hi</b>',
      rtf: '{\\rtf1 Hi}'
    })
  })

  it('omits rich formats for file clips', () => {
    expect(
      buildSystemClipboardPayload(
        clip({
          type: 'file',
          textContent: '/tmp/a.txt',
          preview: '/tmp/a.txt',
          htmlContent: '<p>x</p>',
          rtfContent: 'rtf'
        })
      )
    ).toEqual({ text: '/tmp/a.txt' })
  })

  it('returns null for images', () => {
    expect(buildSystemClipboardPayload(clip({ type: 'image', preview: 'x' }))).toBeNull()
  })
})

describe('defaultSnippetName', () => {
  it('prefers explicit name and truncates preview', () => {
    expect(defaultSnippetName('hello world', '  My snip  ')).toBe('My snip')
    expect(defaultSnippetName('a'.repeat(100))).toHaveLength(40)
    expect(defaultSnippetName('   ')).toBe('Snippet')
  })
})

describe('moveIdInOrder', () => {
  it('moves up and down and rejects edges', () => {
    expect(moveIdInOrder(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveIdInOrder(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
    expect(moveIdInOrder(['a', 'b', 'c'], 'a', -1)).toBeNull()
    expect(moveIdInOrder(['a', 'b', 'c'], 'c', 1)).toBeNull()
    expect(moveIdInOrder(['a', 'b'], 'z', 1)).toBeNull()
  })
})

describe('applyTodoOrder', () => {
  it('reassigns sortOrder from ordered ids', () => {
    const items = [
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 1 },
      { id: 'c', sortOrder: 2 }
    ]
    expect(applyTodoOrder(items, ['c', 'a', 'b']).map((t) => t.id)).toEqual([
      'c',
      'a',
      'b'
    ])
  })
})

describe('todoFromClip edge cases', () => {
  it('handles empty text and long titles', () => {
    expect(todoFromClip(clip({ type: 'text', preview: '   ' })).title).toBe(
      'Clipboard item'
    )
    const long = 'x'.repeat(300)
    expect(todoFromClip(clip({ type: 'text', textContent: long })).title).toHaveLength(
      200
    )
  })

  it('handles empty file path', () => {
    expect(
      todoFromClip(clip({ type: 'file', filePath: null, preview: '' })).title
    ).toBe('File from clipboard')
  })
})
