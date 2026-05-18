const MAX = 120

const cache = new Map<string, string>()

export function getCachedThumb(id: string): string | undefined {
  return cache.get(id)
}

export function setCachedThumbs(thumbs: Record<string, string>): void {
  for (const [id, url] of Object.entries(thumbs)) {
    if (cache.has(id)) cache.delete(id)
    cache.set(id, url)
  }
  while (cache.size > MAX) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
}

export function primeThumbCache(id: string, url: string): void {
  setCachedThumbs({ [id]: url })
}
