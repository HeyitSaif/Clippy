/** Max rows scanned for regex search (newest-first order). */
export const REGEX_SEARCH_MAX_SCAN = 5000

/** Batch size when paging through clips for regex matching. */
export const REGEX_SEARCH_BATCH_SIZE = 500

/** Cap on text_content length tested per row (mirrors previous search behavior). */
export const REGEX_TEXT_BODY_LIMIT = 10_000

/**
 * Test whether a clip matches a regex against preview, snippet name, or text body.
 * Callers should pass already-prepared strings (e.g. body sliced to REGEX_TEXT_BODY_LIMIT).
 */
export function matchRegexClipFields(
  re: RegExp,
  preview: string,
  snippetName: string,
  textBody: string
): boolean {
  return re.test(preview) || re.test(snippetName) || re.test(textBody)
}

function fieldsFromRow(row: Record<string, unknown>): {
  preview: string
  snippetName: string
  textBody: string
} {
  return {
    preview: String(row.preview ?? ''),
    snippetName: String(row.snippet_name ?? ''),
    textBody: String(row._text ?? '').slice(0, REGEX_TEXT_BODY_LIMIT)
  }
}

export type RegexMatchCollector<T> = {
  offset: number
  limit: number
  maxScanned: number
  scanned: number
  skipped: number
  matches: T[]
}

export function createRegexMatchCollector<T>(
  offset: number,
  limit: number,
  maxScanned = REGEX_SEARCH_MAX_SCAN
): RegexMatchCollector<T> {
  return { offset, limit, maxScanned, scanned: 0, skipped: 0, matches: [] }
}

/**
 * Feed one SQL batch into a regex scan collector.
 * Returns `done` when enough matches are collected or the scan cap is hit.
 */
export function feedRegexBatch<T extends Record<string, unknown>>(
  collector: RegexMatchCollector<T>,
  rows: readonly T[],
  re: RegExp
): 'continue' | 'done' {
  for (const row of rows) {
    collector.scanned++
    const { preview, snippetName, textBody } = fieldsFromRow(row)
    if (matchRegexClipFields(re, preview, snippetName, textBody)) {
      if (collector.skipped < collector.offset) {
        collector.skipped++
      } else {
        collector.matches.push(row)
        if (collector.matches.length >= collector.limit) return 'done'
      }
    }
    if (collector.scanned >= collector.maxScanned) return 'done'
  }
  return 'continue'
}

/**
 * From an ordered row list, collect regex matches with pagination.
 * Scans at most `maxScan` rows; skips the first `offset` matches; returns up to `limit`.
 *
 * Expected row shape: `preview`, `snippet_name`, `_text` (optional; missing → empty string).
 */
export function collectRegexMatches<T extends Record<string, unknown>>(
  rows: T[],
  re: RegExp,
  offset: number,
  limit: number,
  maxScan: number = REGEX_SEARCH_MAX_SCAN
): T[] {
  const collector = createRegexMatchCollector<T>(offset, limit, maxScan)
  feedRegexBatch(collector, rows.slice(0, maxScan), re)
  return collector.matches
}
