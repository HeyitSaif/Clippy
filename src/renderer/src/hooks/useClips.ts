import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, ClipListItem } from '@shared/types'
import {
  appendUniqueById,
  PAGE_SIZE,
  pageHasMore
} from '@shared/clip-pagination'
import { parseSearchQuery } from '@shared/search'
import { useDebouncedValue } from './useDebouncedValue'

export type ClipFilter = 'all' | 'text' | 'image' | 'file' | 'pinned' | 'snippet'

function sortClips(items: ClipListItem[]): ClipListItem[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return b.createdAt - a.createdAt
  })
}

function mergeClip(items: ClipListItem[], incoming: ClipListItem): ClipListItem[] {
  const rest = items.filter((c) => c.id !== incoming.id)
  return sortClips([incoming, ...rest])
}

function applyPinToggle(
  items: ClipListItem[],
  id: string,
  filter: ClipFilter
): ClipListItem[] {
  const clip = items.find((c) => c.id === id)
  if (!clip) return items
  const isPinned = !clip.isPinned
  if (filter === 'pinned' && !isPinned) {
    return items.filter((c) => c.id !== id)
  }
  return sortClips(items.map((c) => (c.id === id ? { ...c, isPinned } : c)))
}

function applySnippetToggle(
  items: ClipListItem[],
  id: string,
  filter: ClipFilter,
  snippetName?: string | null
): ClipListItem[] {
  const clip = items.find((c) => c.id === id)
  if (!clip) return items
  // Rename only
  if (clip.isSnippet && snippetName != null) {
    return items.map((c) =>
      c.id === id ? { ...c, snippetName: snippetName || c.snippetName } : c
    )
  }
  const isSnippet = !clip.isSnippet
  if (filter === 'snippet' && !isSnippet) {
    return items.filter((c) => c.id !== id)
  }
  return items.map((c) =>
    c.id === id
      ? {
          ...c,
          isSnippet,
          snippetName: isSnippet ? snippetName ?? c.preview.slice(0, 40) : null
        }
      : c
  )
}

function applyDelete(items: ClipListItem[], id: string): ClipListItem[] {
  return items.filter((c) => c.id !== id)
}

function applyTags(items: ClipListItem[], id: string, tags: string[]): ClipListItem[] {
  return items.map((c) => (c.id === id ? { ...c, tags } : c))
}

export function useClips() {
  const [clips, setClips] = useState<ClipListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ClipFilter>('all')
  const debouncedQuery = useDebouncedValue(query, 150)
  const initialLoad = useRef(true)
  const requestSeq = useRef(0)
  const loadingMoreRef = useRef(false)
  const clipsRef = useRef<ClipListItem[]>([])
  clipsRef.current = clips

  const buildQuery = useCallback(() => {
    const parsed = parseSearchQuery(debouncedQuery, PAGE_SIZE)
    if (filter === 'text') parsed.type = 'text'
    else if (filter === 'image') parsed.type = 'image'
    else if (filter === 'file') parsed.type = 'file'
    else if (filter === 'pinned') parsed.pinned = true
    else if (filter === 'snippet') parsed.snippet = true
    return parsed
  }, [debouncedQuery, filter])

  const hasActiveQuery = useCallback(() => {
    return (
      debouncedQuery.trim().length > 0 ||
      filter === 'pinned' ||
      filter === 'snippet' ||
      filter === 'text' ||
      filter === 'image' ||
      filter === 'file'
    )
  }, [debouncedQuery, filter])

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      // Bump seq so in-flight loadMore results are ignored (query/filter/refresh race).
      const seq = ++requestSeq.current
      loadingMoreRef.current = false
      setLoadingMore(false)
      if (!opts?.silent) setLoading(true)
      try {
        const parsed = buildQuery()
        const result = hasActiveQuery()
          ? await window.clippy.searchClips({ ...parsed, limit: PAGE_SIZE, offset: 0 })
          : await window.clippy.listClips(PAGE_SIZE, 0)
        if (seq !== requestSeq.current) return
        // Replace list; offset effectively resets to 0.
        setClips(result)
        setHasMore(pageHasMore(result.length))
      } finally {
        if (seq === requestSeq.current) {
          if (!opts?.silent) setLoading(false)
          initialLoad.current = false
        }
      }
    },
    [buildQuery, hasActiveQuery]
  )

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMoreRef.current) return
    // Capture seq at start; if refresh/query/filter bumps requestSeq mid-flight, discard.
    const seqAtStart = requestSeq.current
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const parsed = buildQuery()
      const offset = clipsRef.current.length
      const result = hasActiveQuery()
        ? await window.clippy.searchClips({ ...parsed, limit: PAGE_SIZE, offset })
        : await window.clippy.listClips(PAGE_SIZE, offset)
      if (seqAtStart !== requestSeq.current) return
      setClips((prev) => appendUniqueById(prev, result))
      setHasMore(pageHasMore(result.length))
    } finally {
      // Only clear if still the active generation. Refresh bumps requestSeq and clears
      // loadingMore itself — an aborted finally must not clobber a newer loadMore.
      if (seqAtStart === requestSeq.current) {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    }
  }, [buildQuery, hasActiveQuery, hasMore, loading])

  useEffect(() => {
    void refresh({ silent: !initialLoad.current })
  }, [refresh])

  /** Apply local state immediately; IPC + onClipsUpdated reconcile. On failure, silent refresh rolls back. */
  const runOptimistic = useCallback(
    async <T>(
      apply: (prev: ClipListItem[]) => ClipListItem[],
      ipcCall: () => Promise<T>,
      isSuccess: (result: T) => boolean
    ): Promise<boolean> => {
      setClips(apply)
      try {
        const result = await ipcCall()
        if (!isSuccess(result)) {
          await refresh({ silent: true })
          return false
        }
        return true
      } catch {
        await refresh({ silent: true })
        return false
      }
    },
    [refresh]
  )

  const togglePin = useCallback(
    (id: string) =>
      runOptimistic(
        (prev) => applyPinToggle(prev, id, filter),
        () => window.clippy.togglePin(id),
        (r) => r !== null
      ),
    [filter, runOptimistic]
  )

  const toggleSnippet = useCallback(
    (id: string, name?: string) =>
      runOptimistic(
        (prev) => applySnippetToggle(prev, id, filter, name),
        () => window.clippy.toggleSnippet(id, name),
        (r) => r !== null
      ),
    [filter, runOptimistic]
  )

  /** Rename an existing snippet without toggling it off. */
  const renameSnippet = useCallback(
    (id: string, name: string) =>
      runOptimistic(
        (prev) => applySnippetToggle(prev, id, filter, name),
        () => window.clippy.toggleSnippet(id, name),
        (r) => r !== null
      ),
    [filter, runOptimistic]
  )

  const deleteClip = useCallback(
    (id: string) =>
      runOptimistic(
        (prev) => applyDelete(prev, id),
        () => window.clippy.deleteClip(id),
        (ok) => ok
      ),
    [runOptimistic]
  )

  const updateTags = useCallback(
    (id: string, tags: string[]) =>
      runOptimistic(
        (prev) => applyTags(prev, id, tags),
        () => window.clippy.updateTags(id, tags),
        (r) => r !== null
      ),
    [runOptimistic]
  )

  useEffect(() => {
    // Reconciliation after mutations (and external changes). Optimistic UI already
    // updated local state; this silent refresh may still run once — that's OK.
    const onUpdated = (): void => {
      void refresh({ silent: true })
    }
    const onAdded = (id: string): void => {
      if (!id) {
        void refresh({ silent: true })
        return
      }
      void window.clippy.getListItem(id).then((item) => {
        if (!item) {
          void refresh({ silent: true })
          return
        }
        if (hasActiveQuery()) {
          void refresh({ silent: true })
          return
        }
        setClips((prev) => mergeClip(prev, item))
      })
    }
    const unsub1 = window.clippy.onClipsUpdated(onUpdated)
    const unsub2 = window.clippy.onClipAdded(onAdded)
    return () => {
      unsub1()
      unsub2()
    }
  }, [refresh, hasActiveQuery])

  return {
    clips,
    loading,
    loadingMore,
    hasMore,
    query,
    setQuery,
    filter,
    setFilter,
    refresh,
    loadMore,
    togglePin,
    toggleSnippet,
    renameSnippet,
    deleteClip,
    updateTags
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [hotkeyError, setHotkeyError] = useState<string | null>(null)

  useEffect(() => {
    void window.clippy.getSettings().then(setSettings)
    const unsub = window.clippy.onSettingsChanged(setSettings)
    return unsub
  }, [])

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const result = await window.clippy.updateSettings(partial)
    setSettings(result.settings)
    setHotkeyError(result.hotkeyError ?? null)
    return result
  }, [])

  return { settings, update, hotkeyError, clearHotkeyError: () => setHotkeyError(null) }
}
