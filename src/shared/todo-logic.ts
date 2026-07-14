import type { TodoItem, TodoList, TodoPriority } from './types'
import { TODO_SYSTEM_LIST_IDS } from './types'

export type TodoStatusFilter = 'active' | 'done' | 'overdue' | 'all'

/** Clamp any number into TodoPriority 0–3. */
export function clampTodoPriority(p: number | undefined | null): TodoPriority {
  if (p === undefined || p === null || !Number.isFinite(p)) return 0
  const n = Math.floor(p)
  if (n <= 0) return 0
  if (n === 1) return 1
  if (n === 2) return 2
  return 3
}

/** Cycle priority: 0 → 1 → 2 → 3 → 0. */
export function nextTodoPriority(p: TodoPriority): TodoPriority {
  return ((p + 1) % 4) as TodoPriority
}

/** Incomplete first, then higher priority, then earlier due, then sortOrder, then newest. */
export function sortTodos(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1
    if (a.priority !== b.priority) return b.priority - a.priority
    if (a.dueAt == null && b.dueAt != null) return 1
    if (a.dueAt != null && b.dueAt == null) return -1
    if (a.dueAt != null && b.dueAt != null && a.dueAt !== b.dueAt) {
      return a.dueAt - b.dueAt
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return b.createdAt - a.createdAt
  })
}

/** System lists first (Inbox, Daily, Weekly), then custom by sortOrder. */
export function sortTodoLists(lists: TodoList[]): TodoList[] {
  const order: Record<string, number> = {
    [TODO_SYSTEM_LIST_IDS.inbox]: 0,
    [TODO_SYSTEM_LIST_IDS.daily]: 1,
    [TODO_SYSTEM_LIST_IDS.weekly]: 2
  }
  return [...lists].sort((a, b) => {
    const ao = order[a.id] ?? 100 + a.sortOrder
    const bo = order[b.id] ?? 100 + b.sortOrder
    return ao - bo
  })
}

/**
 * Client-side status filter after DB query.
 * `overdue` = incomplete with dueAt < now.
 */
export function filterTodosByStatus(
  items: TodoItem[],
  filter: TodoStatusFilter,
  nowMs: number
): TodoItem[] {
  switch (filter) {
    case 'active':
      return items.filter((t) => !t.isCompleted)
    case 'done':
      return items.filter((t) => t.isCompleted)
    case 'overdue':
      return items.filter(
        (t) => !t.isCompleted && t.dueAt != null && t.dueAt < nowMs
      )
    case 'all':
      return items
    default: {
      const _exhaustive: never = filter
      return _exhaustive
    }
  }
}

/** When showCompleted is false, collapse `all`/`done` to `active`. */
export function effectiveTodoFilter(
  filter: TodoStatusFilter,
  showCompleted: boolean
): TodoStatusFilter {
  if (!showCompleted && (filter === 'all' || filter === 'done')) return 'active'
  return filter
}
