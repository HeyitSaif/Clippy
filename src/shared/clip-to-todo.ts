import type { ClipRecord } from './types'

/** Build a todo title/notes pair from a clipboard clip. */
export function todoFromClip(clip: ClipRecord): {
  title: string
  notes: string | null
} {
  switch (clip.type) {
    case 'image':
      return { title: 'Image from clipboard', notes: null }
    case 'file': {
      const path = (clip.filePath ?? clip.preview).trim()
      if (!path) return { title: 'File from clipboard', notes: null }
      const base = path.split(/[/\\]/).pop() || path
      return {
        title: base.slice(0, 200),
        notes: path !== base ? path.slice(0, 4000) : null
      }
    }
    case 'text': {
      const text = (clip.textContent ?? clip.preview ?? '').trim()
      if (!text) return { title: 'Clipboard item', notes: null }
      const firstLine =
        text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .find((l) => l.length > 0) ?? text
      const title = firstLine.slice(0, 200)
      const notes =
        text.length > title.length || text.includes('\n')
          ? text.slice(0, 4000)
          : null
      return { title, notes }
    }
    default: {
      const _exhaustive: never = clip.type
      return _exhaustive
    }
  }
}
