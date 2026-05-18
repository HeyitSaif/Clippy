import { useEffect, useState } from 'react'
import { getCachedThumb, setCachedThumbs } from '../lib/thumbCache'

export function useThumbCache(ids: string[]): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    const cached: Record<string, string> = {}
    for (const id of ids) {
      const hit = getCachedThumb(id)
      if (hit) cached[id] = hit
    }
    if (Object.keys(cached).length) {
      setThumbs((prev) => ({ ...prev, ...cached }))
    }

    const missing = ids.filter((id) => !getCachedThumb(id))
    if (missing.length === 0) return

    let active = true
    void window.clippy.getClipThumbs(missing).then((batch) => {
      if (!active || Object.keys(batch).length === 0) return
      setCachedThumbs(batch)
      setThumbs((prev) => ({ ...prev, ...batch }))
    })
    return () => {
      active = false
    }
  }, [ids.join('|')])

  return thumbs
}
