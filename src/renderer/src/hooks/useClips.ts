import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, ClipListItem } from '@shared/types'
import { parseSearchQuery } from '@shared/search'
import { useDebouncedValue } from './useDebouncedValue'

export type ClipFilter = 'all' | 'text' | 'image' | 'pinned' | 'snippet'

function sortClips(items: ClipListItem[]): ClipListItem[] {
  return [...items].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return b.createdAt - a.createdAt
  })
}

function mergeClip(items: ClipListItem[], incoming: ClipListItem): ClipListItem[] {
  const rest = items.filter((c) => c.id !== incoming.id)
  return sortClips([incoming, ...rest]).slice(0, 200)
}

export function useClips() {
  const [clips, setClips] = useState<ClipListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ClipFilter>('all')
  const debouncedQuery = useDebouncedValue(query, 150)
  const initialLoad = useRef(true)

  const buildQuery = useCallback(() => {
    const parsed = parseSearchQuery(debouncedQuery, 200)
    if (filter === 'text') parsed.type = 'text'
    else if (filter === 'image') parsed.type = 'image'
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
      filter === 'image'
    )
  }, [debouncedQuery, filter])

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      try {
        const parsed = buildQuery()
        const result = hasActiveQuery()
          ? await window.clippy.searchClips(parsed)
          : await window.clippy.listClips(200, 0)
        setClips(result)
      } finally {
        if (!opts?.silent) setLoading(false)
        initialLoad.current = false
      }
    },
    [buildQuery, hasActiveQuery],
  )

  useEffect(() => {
    void refresh({ silent: !initialLoad.current })
  }, [refresh])

  useEffect(() => {
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

  return { clips, loading, query, setQuery, filter, setFilter, refresh }
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
