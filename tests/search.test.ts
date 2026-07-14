import { describe, expect, it } from 'vitest'
import {
  buildFtsQuery,
  buildSearchOrderBy,
  buildTagLikePattern,
  compileIgnorePatterns,
  escapeLikePattern,
  isSafeRegexPattern,
  looksLikeNetworkPath,
  matchesIgnorePatterns,
  parseSearchQuery
} from '../src/shared/search'

describe('parseSearchQuery', () => {
  it('parses filters and text', () => {
    expect(parseSearchQuery('hello type:image pinned #work')).toEqual({
      limit: 200,
      text: 'hello',
      type: 'image',
      pinned: true,
      tag: 'work'
    })
  })

  it('parses regex form', () => {
    expect(parseSearchQuery('/foo.+bar/')).toEqual({
      limit: 200,
      text: 'foo.+bar',
      regex: true
    })
  })

  it('returns limit-only for empty input', () => {
    expect(parseSearchQuery('')).toEqual({ limit: 200 })
    expect(parseSearchQuery('   ')).toEqual({ limit: 200 })
  })

  it('honors custom limit', () => {
    expect(parseSearchQuery('hello', 50)).toEqual({ limit: 50, text: 'hello' })
  })

  it('parses snippet and tag: aliases', () => {
    expect(parseSearchQuery('snippet type:text tag:api')).toEqual({
      limit: 200,
      snippet: true,
      type: 'text',
      tag: 'api'
    })
  })

  it('ignores invalid type: tokens', () => {
    expect(parseSearchQuery('type:video hello')).toEqual({ limit: 200, text: 'hello' })
  })

  it('accepts type:all', () => {
    expect(parseSearchQuery('type:all docs')).toEqual({ limit: 200, type: 'all', text: 'docs' })
  })

  it('does not treat bare slash as regex', () => {
    expect(parseSearchQuery('/foo')).toEqual({ limit: 200, text: '/foo' })
  })
})

describe('buildFtsQuery', () => {
  it('builds prefix-phrase terms with * outside quotes', () => {
    expect(buildFtsQuery('hel world')).toBe('"hel"* AND "world"*')
  })

  it('returns null for empty input', () => {
    expect(buildFtsQuery('   ')).toBeNull()
  })

  it('neutralizes FTS keywords', () => {
    expect(buildFtsQuery('AND OR')).toBe('"AND_"* AND "OR_"*')
  })

  it('strips embedded quotes', () => {
    expect(buildFtsQuery('say "hi"')).toBe('"say"* AND "hi"*')
  })

  it('drops terms that are only FTS syntax characters', () => {
    expect(buildFtsQuery('valid ^*()')).toBe('"valid"*')
    expect(buildFtsQuery('^*()')).toBeNull()
  })
})

describe('buildSearchOrderBy', () => {
  it('uses recency when no FTS rank', () => {
    expect(buildSearchOrderBy('hybrid', { hasFtsRank: false })).toBe(
      'c.is_pinned DESC, c.created_at DESC, c.id ASC'
    )
  })

  it('hybrid and relevance include bm25 rank', () => {
    expect(buildSearchOrderBy('hybrid', { hasFtsRank: true })).toContain('rank ASC')
    expect(buildSearchOrderBy('relevance', { hasFtsRank: true })).toContain('rank ASC')
  })

  it('recency ignores bm25 even when available', () => {
    expect(buildSearchOrderBy('recency', { hasFtsRank: true })).toBe(
      'c.is_pinned DESC, c.created_at DESC, c.id ASC'
    )
  })
})

describe('tag / like escaping', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLikePattern('100%_off')).toBe('100\\%\\_off')
  })

  it('escapes backslashes', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
  })

  it('builds tag like pattern', () => {
    expect(buildTagLikePattern('a%b')).toBe('%"a\\%b"%')
  })

  it('strips quotes from tag before building pattern', () => {
    expect(buildTagLikePattern('"work"')).toBe('%"work"%')
  })
})

describe('isSafeRegexPattern', () => {
  it('accepts simple patterns', () => {
    expect(isSafeRegexPattern('foo.+bar')).toBe(true)
  })

  it('rejects long or nested-looking patterns', () => {
    expect(isSafeRegexPattern('a'.repeat(201))).toBe(false)
    expect(isSafeRegexPattern('(a+)+$')).toBe(false)
  })

  it('rejects invalid regex', () => {
    expect(isSafeRegexPattern('[')).toBe(false)
  })
})

describe('ignore patterns', () => {
  it('matches regex and literal fallbacks', () => {
    const compiled = compileIgnorePatterns(['^secret', '(unclosed'])
    expect(matchesIgnorePatterns('secret-token', compiled)).toBe(true)
    expect(matchesIgnorePatterns('has (unclosed inside', compiled)).toBe(true)
    expect(matchesIgnorePatterns('ok', compiled)).toBe(false)
  })

  it('matches valid regex patterns case-insensitively', () => {
    const compiled = compileIgnorePatterns(['password'])
    expect(matchesIgnorePatterns('My PASSWORD field', compiled)).toBe(true)
  })
})

describe('looksLikeNetworkPath', () => {
  it('detects UNC and Volumes', () => {
    expect(looksLikeNetworkPath('\\\\server\\share')).toBe(true)
    expect(looksLikeNetworkPath('/Volumes/NAS/file')).toBe(true)
    expect(looksLikeNetworkPath('/Users/mac/file.txt')).toBe(false)
  })

  it('detects double-slash and network URL schemes', () => {
    expect(looksLikeNetworkPath('//server/share')).toBe(true)
    expect(looksLikeNetworkPath('smb://nas/docs')).toBe(true)
    expect(looksLikeNetworkPath('NFS://host/export')).toBe(true)
    expect(looksLikeNetworkPath('file:///local/path')).toBe(false)
  })
})
