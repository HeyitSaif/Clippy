import { describe, expect, it } from 'vitest'
import { highlightParts } from '../src/shared/highlight'

function hits(parts: ReturnType<typeof highlightParts>): string[] {
  return parts.filter((p) => p.hit).map((p) => p.text)
}

describe('highlightParts', () => {
  it('returns plain text for empty query', () => {
    expect(highlightParts('hello world', '')).toEqual([{ text: 'hello world', hit: false }])
  })

  it('highlights literal terms case-insensitively', () => {
    expect(hits(highlightParts('Hello HELLO world', 'hello'))).toEqual(['Hello', 'HELLO'])
  })

  it('highlights multiple terms', () => {
    expect(hits(highlightParts('foo bar baz', 'foo baz'))).toEqual(['foo', 'baz'])
  })

  it('strips filter tokens from literal queries', () => {
    expect(hits(highlightParts('hello world', 'hello type:image #work'))).toEqual(['hello'])
  })

  it('returns plain text when only filter tokens remain', () => {
    expect(highlightParts('hello', 'type:image #work')).toEqual([{ text: 'hello', hit: false }])
  })

  it('highlights regex queries when pattern is safe', () => {
    expect(hits(highlightParts('foo123bar', '/foo.+bar/'))).toEqual(['foo123bar'])
  })

  it('highlights regex patterns case-insensitively', () => {
    expect(hits(highlightParts('FOObar', '/foo/'))).toEqual(['FOO'])
  })

  it('handles regex patterns with capturing groups', () => {
    expect(hits(highlightParts('abcx', '/a(b)c/'))).toEqual(['abc'])
  })

  it('does not treat bare slash as regex', () => {
    // Same as parseSearchQuery: `/foo` is literal text, not regex
    expect(hits(highlightParts('path /foo here', '/foo'))).toEqual(['/foo'])
  })

  it('falls back to token highlight when regex pattern is unsafe', () => {
    // Unsafe pattern is not applied as RegExp; no literal match → plain text
    expect(highlightParts('secret-token', '/(a+)+$/')).toEqual([
      { text: 'secret-token', hit: false }
    ])
  })

  it('falls back to token highlight when regex pattern is invalid', () => {
    expect(highlightParts('text', '/[/')).toEqual([{ text: 'text', hit: false }])
  })

  it('preserves non-hit segments around matches', () => {
    expect(highlightParts('aa X bb', 'x')).toEqual([
      { text: 'aa ', hit: false },
      { text: 'X', hit: true },
      { text: ' bb', hit: false }
    ])
  })
})
