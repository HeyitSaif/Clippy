/**
 * Swap `id` one step in `direction` within `ids`.
 * Returns null if the move is impossible.
 */
export function moveIdInOrder(
  ids: string[],
  id: string,
  direction: -1 | 1
): string[] | null {
  const i = ids.indexOf(id)
  if (i < 0) return null
  const j = i + direction
  if (j < 0 || j >= ids.length) return null
  const next = [...ids]
  const a = next[i]
  const b = next[j]
  if (a === undefined || b === undefined) return null
  next[i] = b
  next[j] = a
  return next
}

/** Apply new sort_order index to items by ordered ids (missing ids dropped). */
export function applyTodoOrder<T extends { id: string; sortOrder: number }>(
  items: T[],
  orderedIds: string[]
): T[] {
  const order = new Map(orderedIds.map((id, index) => [id, index]))
  return [...items]
    .map((item) => {
      const sortOrder = order.get(item.id)
      return sortOrder === undefined ? item : { ...item, sortOrder }
    })
    .sort((a, b) => {
      const ao = order.has(a.id) ? (order.get(a.id) as number) : a.sortOrder
      const bo = order.has(b.id) ? (order.get(b.id) as number) : b.sortOrder
      if (ao !== bo) return ao - bo
      return 0
    })
}
