import { describe, expect, it } from 'vitest'
import {
  clampTodoPriority,
  effectiveTodoFilter,
  filterTodosByStatus,
  nextTodoPriority,
  sortTodoLists,
  sortTodos
} from '../src/shared/todo-logic'
import { DEFAULT_SETTINGS, TODO_SYSTEM_LIST_IDS, type TodoItem, type TodoList } from '../src/shared/types'

function todo(partial: Partial<TodoItem> & Pick<TodoItem, 'id' | 'title'>): TodoItem {
  return {
    listId: TODO_SYSTEM_LIST_IDS.inbox,
    notes: null,
    isCompleted: false,
    priority: 0,
    dueAt: null,
    remindAt: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
    ...partial
  }
}

function list(partial: Partial<TodoList> & Pick<TodoList, 'id' | 'name' | 'kind'>): TodoList {
  return {
    sortOrder: 0,
    createdAt: 1,
    updatedAt: 1,
    ...partial
  }
}

describe('clampTodoPriority', () => {
  it('clamps to 0–3', () => {
    expect(clampTodoPriority(undefined)).toBe(0)
    expect(clampTodoPriority(null)).toBe(0)
    expect(clampTodoPriority(-1)).toBe(0)
    expect(clampTodoPriority(1.9)).toBe(1)
    expect(clampTodoPriority(2)).toBe(2)
    expect(clampTodoPriority(99)).toBe(3)
  })
})

describe('nextTodoPriority', () => {
  it('cycles 0→1→2→3→0', () => {
    expect(nextTodoPriority(0)).toBe(1)
    expect(nextTodoPriority(1)).toBe(2)
    expect(nextTodoPriority(2)).toBe(3)
    expect(nextTodoPriority(3)).toBe(0)
  })
})

describe('sortTodos', () => {
  it('puts incomplete before completed', () => {
    const sorted = sortTodos([
      todo({ id: 'a', title: 'done', isCompleted: true, priority: 3 }),
      todo({ id: 'b', title: 'open', isCompleted: false, priority: 0 })
    ])
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('orders by priority then due date', () => {
    const sorted = sortTodos([
      todo({ id: 'low', title: 'l', priority: 1, dueAt: 10 }),
      todo({ id: 'high-late', title: 'h', priority: 3, dueAt: 100 }),
      todo({ id: 'high-soon', title: 'h', priority: 3, dueAt: 20 }),
      todo({ id: 'none', title: 'n', priority: 0, dueAt: null })
    ])
    expect(sorted.map((t) => t.id)).toEqual(['high-soon', 'high-late', 'low', 'none'])
  })
})

describe('sortTodoLists', () => {
  it('orders system lists then custom', () => {
    const sorted = sortTodoLists([
      list({ id: 'c1', name: 'Custom', kind: 'custom', sortOrder: 1 }),
      list({ id: TODO_SYSTEM_LIST_IDS.weekly, name: 'Weekly', kind: 'weekly' }),
      list({ id: TODO_SYSTEM_LIST_IDS.inbox, name: 'Inbox', kind: 'inbox' }),
      list({ id: TODO_SYSTEM_LIST_IDS.daily, name: 'Daily', kind: 'daily' })
    ])
    expect(sorted.map((l) => l.kind)).toEqual(['inbox', 'daily', 'weekly', 'custom'])
  })
})

describe('filterTodosByStatus', () => {
  const now = 1_000_000
  const items = [
    todo({ id: 'open', title: 'o', isCompleted: false }),
    todo({ id: 'done', title: 'd', isCompleted: true }),
    todo({ id: 'late', title: 'l', isCompleted: false, dueAt: now - 1 }),
    todo({ id: 'soon', title: 's', isCompleted: false, dueAt: now + 1 })
  ]

  it('filters active / done / overdue / all', () => {
    expect(filterTodosByStatus(items, 'active', now).map((t) => t.id)).toEqual([
      'open',
      'late',
      'soon'
    ])
    expect(filterTodosByStatus(items, 'done', now).map((t) => t.id)).toEqual(['done'])
    expect(filterTodosByStatus(items, 'overdue', now).map((t) => t.id)).toEqual(['late'])
    expect(filterTodosByStatus(items, 'all', now)).toHaveLength(4)
  })
})

describe('effectiveTodoFilter', () => {
  it('forces active when completed are hidden', () => {
    expect(effectiveTodoFilter('all', false)).toBe('active')
    expect(effectiveTodoFilter('done', false)).toBe('active')
    expect(effectiveTodoFilter('overdue', false)).toBe('overdue')
    expect(effectiveTodoFilter('all', true)).toBe('all')
  })
})

describe('todo defaults', () => {
  it('seeds system list ids and todo settings', () => {
    expect(TODO_SYSTEM_LIST_IDS.inbox).toBe('todo-list-inbox')
    expect(TODO_SYSTEM_LIST_IDS.daily).toBe('todo-list-daily')
    expect(TODO_SYSTEM_LIST_IDS.weekly).toBe('todo-list-weekly')
    expect(DEFAULT_SETTINGS.todoShowCompleted).toBe(true)
    expect(DEFAULT_SETTINGS.todoRemindersEnabled).toBe(true)
    expect(DEFAULT_SETTINGS.todoRotateEnabled).toBe(true)
    expect(DEFAULT_SETTINGS.todoRotateHour).toBe(0)
  })
})
