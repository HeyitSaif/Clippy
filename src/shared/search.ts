import type { ClipSearchQuery, ClipType } from './types'

const TYPE_VALUES = new Set<ClipType | 'all'>(['text', 'image', 'file', 'all'])

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

export function buildFtsQuery(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"*`)
    .join(' AND ')
}
