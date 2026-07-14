import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, TodoItem, TodoList } from '@shared/types'
import { TODO_SYSTEM_LIST_IDS } from '@shared/types'
import {
  effectiveTodoFilter,
  filterTodosByStatus,
  nextTodoPriority,
  sortTodoLists,
  sortTodos,
  type TodoStatusFilter
} from '@shared/todo-logic'
import { applyTodoOrder, moveIdInOrder } from '@shared/todo-reorder'
import { useDebouncedValue } from './useDebouncedValue'

export type TodoFilter = TodoStatusFilter

export function listLabel(list: TodoList): string {
  switch (list.kind) {
    case 'inbox':
      return 'Inbox'
    case 'daily':
      return 'Daily'
    case 'weekly':
      return 'Weekly'
    case 'custom':
      return list.name
    default: {
      const _exhaustive: never = list.kind
      return _exhaustive
    }
  }
}

export function useTodos() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const showCompleted = settings?.todoShowCompleted ?? true
  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListId, setSelectedListId] = useState<string>(TODO_SYSTEM_LIST_IDS.inbox)
  const [filter, setFilter] = useState<TodoFilter>('active')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 150)
  const requestSeq = useRef(0)
  const initialLoad = useRef(true)
  const appliedDefaultList = useRef(false)

  useEffect(() => {
    void window.clippy.getSettings().then(setSettings)
    const unsub = window.clippy.onSettingsChanged(setSettings)
    return unsub
  }, [])

  useEffect(() => {
    if (!settings || appliedDefaultList.current) return
    appliedDefaultList.current = true
    const id = settings.todoDefaultListId
    if (id) setSelectedListId(id)
  }, [settings])

  const effectiveFilter: TodoFilter = effectiveTodoFilter(filter, showCompleted)

  const refreshLists = useCallback(async () => {
    const result = await window.clippy.listTodoLists()
    setLists(result)
    setSelectedListId((prev) => {
      if (result.some((l) => l.id === prev)) return prev
      return result[0]?.id ?? TODO_SYSTEM_LIST_IDS.inbox
    })
  }, [])

  const refreshTodos = useCallback(
    async (opts?: { silent?: boolean }) => {
      const seq = ++requestSeq.current
      if (!opts?.silent) setLoading(true)
      try {
        const completed =
          effectiveFilter === 'active' || effectiveFilter === 'overdue'
            ? false
            : effectiveFilter === 'done'
              ? true
              : undefined
        const q = debouncedQuery.trim() || undefined
        const result = await window.clippy.listTodos({
          listId: selectedListId,
          completed,
          q
        })
        if (seq !== requestSeq.current) return
        const sorted = sortTodos(result)
        setTodos(
          effectiveFilter === 'overdue'
            ? filterTodosByStatus(sorted, 'overdue', Date.now())
            : sorted
        )
      } finally {
        if (seq === requestSeq.current) {
          if (!opts?.silent) setLoading(false)
          initialLoad.current = false
        }
      }
    },
    [selectedListId, effectiveFilter, debouncedQuery]
  )

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      await Promise.all([refreshLists(), refreshTodos(opts)])
    },
    [refreshLists, refreshTodos]
  )

  useEffect(() => {
    void refreshLists()
  }, [refreshLists])

  useEffect(() => {
    void refreshTodos({ silent: !initialLoad.current })
  }, [refreshTodos])

  useEffect(() => {
    if (!showCompleted && filter === 'done') {
      setFilter('active')
    }
  }, [showCompleted, filter])

  useEffect(() => {
    const unsub = window.clippy.onTodosUpdated(() => {
      void refresh({ silent: true })
    })
    return unsub
  }, [refresh])

  const runOptimistic = useCallback(
    async <T>(
      apply: (prev: TodoItem[]) => TodoItem[],
      ipcCall: () => Promise<T>,
      isSuccess: (result: T) => boolean
    ): Promise<boolean> => {
      setTodos((prev) => sortTodos(apply(prev)))
      try {
        const result = await ipcCall()
        if (!isSuccess(result)) {
          await refreshTodos({ silent: true })
          return false
        }
        return true
      } catch {
        await refreshTodos({ silent: true })
        return false
      }
    },
    [refreshTodos]
  )

  const createTodo = useCallback(
    async (title: string): Promise<TodoItem | null> => {
      const trimmed = title.trim()
      if (!trimmed) return null
      try {
        const item = await window.clippy.createTodo({
          title: trimmed,
          listId: selectedListId
        })
        // Only inject into local list when the active filter would include it
        if (effectiveFilter !== 'done') {
          setTodos((prev) =>
            sortTodos([item, ...prev.filter((t) => t.id !== item.id)])
          )
        }
        return item
      } catch {
        await refreshTodos({ silent: true })
        return null
      }
    },
    [selectedListId, effectiveFilter, refreshTodos]
  )

  const toggleComplete = useCallback(
    (id: string) =>
      runOptimistic(
        (prev) => {
          const todo = prev.find((t) => t.id === id)
          if (!todo) return prev
          const isCompleted = !todo.isCompleted
          // Drop from list when filter no longer matches
          if (
            (effectiveFilter === 'active' || effectiveFilter === 'overdue') &&
            isCompleted
          ) {
            return prev.filter((t) => t.id !== id)
          }
          if (effectiveFilter === 'done' && !isCompleted) {
            return prev.filter((t) => t.id !== id)
          }
          return prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  isCompleted,
                  completedAt: isCompleted ? Date.now() : null
                }
              : t
          )
        },
        () => window.clippy.toggleTodoComplete(id),
        (r) => r !== null
      ),
    [effectiveFilter, runOptimistic]
  )

  const updateTodo = useCallback(
    async (
      id: string,
      partial: Parameters<typeof window.clippy.updateTodo>[1]
    ): Promise<boolean> => {
      // Optimistic local patch for snappy UI
      setTodos((prev) => {
        if (
          partial.listId !== undefined &&
          partial.listId !== selectedListId
        ) {
          return prev.filter((t) => t.id !== id)
        }
        return sortTodos(
          prev.map((t) => {
            if (t.id !== id) return t
            return {
              ...t,
              ...partial,
              title: partial.title !== undefined ? partial.title : t.title,
              listId: partial.listId !== undefined ? partial.listId : t.listId,
              priority:
                partial.priority !== undefined ? partial.priority : t.priority,
              dueAt: partial.dueAt !== undefined ? partial.dueAt : t.dueAt,
              remindAt:
                partial.remindAt !== undefined ? partial.remindAt : t.remindAt,
              notes: partial.notes !== undefined ? partial.notes : t.notes,
              isCompleted:
                partial.isCompleted !== undefined
                  ? partial.isCompleted
                  : t.isCompleted
            }
          })
        )
      })
      try {
        const result = await window.clippy.updateTodo(id, partial)
        if (!result) {
          await refreshTodos({ silent: true })
          return false
        }
        return true
      } catch {
        await refreshTodos({ silent: true })
        return false
      }
    },
    [refreshTodos, selectedListId]
  )

  const cyclePriority = useCallback(
    (id: string) => {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return Promise.resolve(false)
      return updateTodo(id, { priority: nextTodoPriority(todo.priority) })
    },
    [todos, updateTodo]
  )

  const deleteTodo = useCallback(
    (id: string) =>
      runOptimistic(
        (prev) => prev.filter((t) => t.id !== id),
        () => window.clippy.deleteTodo(id),
        (ok) => ok
      ),
    [runOptimistic]
  )

  const moveTodo = useCallback(
    async (id: string, direction: -1 | 1): Promise<boolean> => {
      const ordered = moveIdInOrder(
        todos.map((t) => t.id),
        id,
        direction
      )
      if (!ordered) return false
      setTodos((prev) => sortTodos(applyTodoOrder(prev, ordered)))
      try {
        await window.clippy.reorderTodos(selectedListId, ordered)
        return true
      } catch {
        await refreshTodos({ silent: true })
        return false
      }
    },
    [todos, selectedListId, refreshTodos]
  )

  const createList = useCallback(
    async (name: string): Promise<TodoList | null> => {
      const trimmed = name.trim()
      if (!trimmed) return null
      try {
        const list = await window.clippy.createTodoList(trimmed)
        await refreshLists()
        setSelectedListId(list.id)
        return list
      } catch {
        await refreshLists()
        return null
      }
    },
    [refreshLists]
  )

  const renameList = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      try {
        const result = await window.clippy.renameTodoList(id, name)
        if (!result) return false
        await refreshLists()
        return true
      } catch {
        return false
      }
    },
    [refreshLists]
  )

  const deleteList = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const ok = await window.clippy.deleteTodoList(id)
        if (ok) {
          await refreshLists()
          if (selectedListId === id) {
            setSelectedListId(TODO_SYSTEM_LIST_IDS.inbox)
          }
        }
        return ok
      } catch {
        return false
      }
    },
    [refreshLists, selectedListId]
  )

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedListId) ?? null,
    [lists, selectedListId]
  )

  const sortedLists = useMemo(() => sortTodoLists(lists), [lists])

  return {
    lists: sortedLists,
    listLabel,
    todos,
    loading,
    selectedListId,
    setSelectedListId,
    selectedList,
    filter: effectiveFilter,
    setFilter,
    query,
    setQuery,
    showCompleted,
    settings,
    refresh,
    createTodo,
    toggleComplete,
    updateTodo,
    cyclePriority,
    deleteTodo,
    moveTodo,
    createList,
    renameList,
    deleteList
  }
}
