import type { ClipSearchQuery, ClipType, SearchSortMode } from './types'

const TYPE_VALUES = new Set<ClipType | 'all'>(['text', 'image', 'file', 'all'])

const FTS_KEYWORDS = new Set(['AND', 'OR', 'NOT', 'NEAR'])

/** Characters that must not appear bare in an FTS5 token. */
const FTS_SPECIAL = /["*^():]/

export function parseSearchQuery(raw: string, limit = 200): ClipSearchQuery {
  const trimmed = raw.trim()
  if (!trimmed) return { limit }

  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    const end = trimmed.lastIndexOf('/')
    return { text: trimmed.slice(1, end), regex: true, limit }
  }

  const result: ClipSearchQuery = { limit }
  const textParts: string[] = []

  for (const token of trimmed.split(/\s+/).filter(Boolean)) {
    if (token.startsWith('type:')) {
      const type = token.slice(5) as ClipType | 'all'
      if (TYPE_VALUES.has(type)) result.type = type
      continue
    }
    if (token === 'pinned' || token === 'pinned:true') {
      result.pinned = true
      continue
    }
    if (token === 'snippet' || token === 'snippet:true') {
      result.snippet = true
      continue
    }
    if (token.startsWith('#')) {
      result.tag = token.slice(1)
      continue
    }
    if (token.startsWith('tag:')) {
      result.tag = token.slice(4)
      continue
    }
    textParts.push(token)
  }

  if (textParts.length) result.text = textParts.join(' ')
  return result
}

/**
 * Build an FTS5 MATCH query. Prefix wildcards stay outside quotes (`"term"*`),
 * which is valid FTS5 prefix-phrase syntax and matches token prefixes.
 */
export function buildFtsQuery(text: string): string | null {
  const terms = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => sanitizeFtsTerm(term))
    .filter((term): term is string => term !== null)

  if (!terms.length) return null
  return terms.join(' AND ')
}

function sanitizeFtsTerm(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Strip characters that break MATCH syntax; keep alphanumerics + common symbols.
  let cleaned = trimmed.replace(/"/g, '')
  if (!cleaned) return null

  const upper = cleaned.toUpperCase()
  if (FTS_KEYWORDS.has(upper)) {
    cleaned = `${cleaned}_`
  }

  // If still full of specials only, drop.
  if (!/[^\s"*^():]+/.test(cleaned.replace(FTS_SPECIAL, ''))) {
    const alnum = cleaned.replace(/[^a-zA-Z0-9_\u00C0-\u024F-]/g, '')
    if (!alnum) return null
    cleaned = alnum
  }

  const escaped = cleaned.replace(/"/g, '""')
  return `"${escaped}"*`
}

export function escapeLikePattern(value: string): string {
  return value.replace(/([%_\\])/g, '\\$1')
}

/** LIKE pattern for a JSON string-array tag value, with ESCAPE '\'. */
export function buildTagLikePattern(tag: string): string {
  const safe = escapeLikePattern(tag.replace(/"/g, ''))
  return `%"${safe}"%`
}

export function buildSearchOrderBy(
  sortMode: SearchSortMode,
  opts: { hasFtsRank: boolean }
): string {
  const pinned = 'c.is_pinned DESC'
  const recency = 'c.created_at DESC'
  const idTie = 'c.id ASC'

  if (!opts.hasFtsRank || sortMode === 'recency') {
    return `${pinned}, ${recency}, ${idTie}`
  }

  // bm25: lower is better
  const relevance = 'rank ASC'
  if (sortMode === 'relevance') {
    return `${pinned}, ${relevance}, ${recency}, ${idTie}`
  }
  // hybrid (default)
  return `${pinned}, ${relevance}, ${recency}, ${idTie}`
}

const REDOS_HINT =
  /(\(\?\<)|(\([^)]*[+*][^)]*\)[+*{])|([+*]{2,})|(\{\d+,)\s*(\}|[+*])/

export function isSafeRegexPattern(pattern: string): boolean {
  if (!pattern || pattern.length > 200) return false
  if (REDOS_HINT.test(pattern)) return false
  try {
    // eslint-disable-next-line no-new
    new RegExp(pattern, 'i')
    return true
  } catch {
    return false
  }
}

export function compileIgnorePatterns(patterns: string[]): Array<RegExp | string> {
  return patterns.map((pattern) => {
    try {
      return new RegExp(pattern, 'i')
    } catch {
      return pattern.toLowerCase()
    }
  })
}

export function matchesIgnorePatterns(
  text: string,
  compiled: Array<RegExp | string>
): boolean {
  const lower = text.toLowerCase()
  for (const pattern of compiled) {
    if (typeof pattern === 'string') {
      if (lower.includes(pattern)) return true
    } else if (pattern.test(text)) {
      return true
    }
  }
  return false
}

export function looksLikeNetworkPath(filePath: string): boolean {
  if (filePath.startsWith('\\\\')) return true
  if (filePath.startsWith('//')) return true
  if (filePath.startsWith('/Volumes/')) return true
  if (/^smb:\/\//i.test(filePath) || /^nfs:\/\//i.test(filePath)) return true
  return false
}
