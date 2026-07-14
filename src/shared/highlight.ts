import { isSafeRegexPattern } from './search'

export interface HighlightPart {
  text: string
  hit: boolean
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Same `/pattern/` detection as parseSearchQuery (content between first and last `/`). */
function extractRegexPattern(query: string): string | null {
  const trimmed = query.trim()
  if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
    return trimmed.slice(1, trimmed.lastIndexOf('/'))
  }
  return null
}

/** Strip filter tokens (type:, #tag, etc.) for literal multi-term highlight. */
function extractSearchTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t && !t.includes(':') && !t.startsWith('#'))
    .map(escapeRegExp)
}

/**
 * Split `text` by a global RegExp into alternating non-hit / hit segments.
 * Uses match ranges (not capturing-group split) so user patterns with groups stay correct.
 */
function partsFromRegex(text: string, re: RegExp): HighlightPart[] {
  const global = re.global ? re : new RegExp(re.source, `${re.flags}g`)
  const parts: HighlightPart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = global.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), hit: false })
    }
    parts.push({ text: match[0], hit: true })
    lastIndex = match.index + match[0].length
    // Avoid infinite loop on zero-length matches
    if (match[0].length === 0) {
      global.lastIndex++
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), hit: false })
  }

  return parts.length ? parts : [{ text, hit: false }]
}

function partsFromTerms(text: string, terms: string[]): HighlightPart[] {
  if (!terms.length) {
    return [{ text, hit: false }]
  }
  const re = new RegExp(`(${terms.join('|')})`, 'gi')
  const chunks = text.split(re)
  const lowerTerms = terms.map((t) => t.toLowerCase())
  return chunks.map((part) => ({
    text: part,
    hit: lowerTerms.some((t) => part.toLowerCase() === t)
  }))
}

/**
 * Pure highlight splitter for search UI.
 * - `/pattern/` → RegExp highlight when safe; otherwise fall back to token highlight
 * - otherwise → multi-term highlight with filter tokens stripped
 */
export function highlightParts(text: string, query: string): HighlightPart[] {
  const trimmed = query.trim()
  if (!trimmed) {
    return [{ text, hit: false }]
  }

  const regexPattern = extractRegexPattern(trimmed)
  if (regexPattern !== null && isSafeRegexPattern(regexPattern)) {
    return partsFromRegex(text, new RegExp(regexPattern, 'gi'))
  }

  // Non-regex queries, or unsafe/invalid `/pattern/` — token highlight (filter strip)
  const terms = extractSearchTerms(trimmed)
  return partsFromTerms(text, terms)
}
