import { describe, expect, it } from 'vitest'
import {
  collectRegexMatches,
  createRegexMatchCollector,
  feedRegexBatch,
  matchRegexClipFields,
  REGEX_SEARCH_MAX_SCAN,
  REGEX_TEXT_BODY_LIMIT
} from '../src/shared/regex-search'

function row(
  id: string,
  fields: { preview?: string; snippet_name?: string; _text?: string } = {}
): Record<string, unknown> {
  return {
    id,
    preview: fields.preview ?? '',
    snippet_name: fields.snippet_name ?? null,
    _text: fields._text ?? null
  }
}

describe('matchRegexClipFields', () => {
  const re = /foo/i

  it('matches preview', () => {
    expect(matchRegexClipFields(re, 'hello FOO bar', '', '')).toBe(true)
  })

  it('matches snippet name', () => {
    expect(matchRegexClipFields(re, 'nope', 'my-foo-snippet', '')).toBe(true)
  })

  it('matches text body', () => {
    expect(matchRegexClipFields(re, 'nope', '', 'body has foo in it')).toBe(true)
  })

  it('returns false when nothing matches', () => {
    expect(matchRegexClipFields(re, 'bar', 'baz', 'qux')).toBe(false)
  })
})

describe('collectRegexMatches', () => {
  const re = /hit/i

  it('returns only matching rows in order', () => {
    const rows = [
      row('1', { preview: 'hit one' }),
      row('2', { preview: 'miss' }),
      row('3', { _text: 'another HIT' }),
      row('4', { snippet_name: 'hit-snippet' })
    ]
    const matches = collectRegexMatches(rows, re, 0, 10)
    expect(matches.map((r) => r.id)).toEqual(['1', '3', '4'])
  })

  it('skips offset matches then applies limit', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row(String(i), { preview: `hit ${i}` })
    )
    const page = collectRegexMatches(rows, re, 3, 2)
    expect(page.map((r) => r.id)).toEqual(['3', '4'])
  })

  it('finds matches beyond the first 500 rows (pagination fix)', () => {
    const rows = Array.from({ length: 600 }, (_, i) =>
      row(String(i), { preview: i === 550 ? 'deep hit' : `noise ${i}` })
    )
    const matches = collectRegexMatches(rows, re, 0, 10)
    expect(matches).toHaveLength(1)
    expect(matches[0]!.id).toBe('550')
  })

  it('stops scanning after maxScan rows', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      row(String(i), { preview: i === 15 ? 'hit late' : `x${i}` })
    )
    // maxScan=10 never reaches row 15
    expect(collectRegexMatches(rows, re, 0, 5, 10)).toEqual([])
    // maxScan=16 includes row 15
    expect(collectRegexMatches(rows, re, 0, 5, 16).map((r) => r.id)).toEqual(['15'])
  })

  it('respects default maxScan constant', () => {
    expect(REGEX_SEARCH_MAX_SCAN).toBe(5000)
    const rows = Array.from({ length: 5001 }, (_, i) =>
      row(String(i), { preview: i === 5000 ? 'hit past cap' : `n${i}` })
    )
    expect(collectRegexMatches(rows, re, 0, 10)).toEqual([])
  })

  it('slices text body before matching (same as search)', () => {
    const bodyMatch = 'x'.repeat(REGEX_TEXT_BODY_LIMIT) + 'hit'
    const rows = [row('1', { _text: bodyMatch })]
    // hit is past the body limit → no match
    expect(collectRegexMatches(rows, re, 0, 1)).toEqual([])

    const bodyInRange = 'x'.repeat(REGEX_TEXT_BODY_LIMIT - 3) + 'hit'
    const rows2 = [row('2', { _text: bodyInRange })]
    expect(collectRegexMatches(rows2, re, 0, 1).map((r) => r.id)).toEqual(['2'])
  })

  it('handles empty input', () => {
    expect(collectRegexMatches([], re, 0, 10)).toEqual([])
  })

  it('returns empty when offset exceeds match count', () => {
    const rows = [row('1', { preview: 'hit' }), row('2', { preview: 'hit' })]
    expect(collectRegexMatches(rows, re, 5, 10)).toEqual([])
  })
})

describe('feedRegexBatch', () => {
  const re = /hit/i

  it('accumulates matches across multiple batches', () => {
    const rows = Array.from({ length: 600 }, (_, i) =>
      row(String(i), { preview: i === 550 ? 'deep hit' : `noise ${i}` })
    )
    const collector = createRegexMatchCollector<Record<string, unknown>>(0, 1)
    expect(feedRegexBatch(collector, rows.slice(0, 500), re)).toBe('continue')
    expect(collector.matches).toHaveLength(0)
    expect(feedRegexBatch(collector, rows.slice(500), re)).toBe('done')
    expect(collector.matches.map((r) => r.id)).toEqual(['550'])
  })

  it('stops early when limit is satisfied mid-scan', () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row(String(i), { preview: `hit ${i}` })
    )
    const collector = createRegexMatchCollector<Record<string, unknown>>(0, 2)
    expect(feedRegexBatch(collector, rows, re)).toBe('done')
    expect(collector.matches.map((r) => r.id)).toEqual(['0', '1'])
    expect(collector.scanned).toBe(2)
  })
})
