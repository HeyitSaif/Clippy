/** Page size for list + search fetch. */
export const PAGE_SIZE = 200

/** Near-end threshold: fire load-more when last visible index >= count - threshold. */
export const NEAR_END_THRESHOLD = 5

/** Append page items not already present (by id). */
export function appendUniqueById<T extends { id: string }>(
  prev: T[],
  page: T[]
): T[] {
  if (page.length === 0) return prev
  const ids = new Set(prev.map((c) => c.id))
  const next = page.filter((c) => !ids.has(c.id))
  return next.length ? [...prev, ...next] : prev
}

/** True when a full page was returned (more may exist). */
export function pageHasMore(pageLength: number, pageSize = PAGE_SIZE): boolean {
  return pageLength === pageSize
}

/** True when the last visible virtual row is within `threshold` of the end. */
export function isNearEnd(
  lastVisibleIndex: number,
  count: number,
  threshold = NEAR_END_THRESHOLD
): boolean {
  if (count <= 0 || lastVisibleIndex < 0) return false
  return lastVisibleIndex >= count - threshold
}
