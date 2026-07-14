import type { ClipType } from './types'

/** Payload for Electron `clipboard.write` when pasting a text/file clip. */
export function buildSystemClipboardPayload(clip: {
  type: ClipType
  textContent: string | null
  preview: string
  htmlContent: string | null
  rtfContent: string | null
}): { text: string; html?: string; rtf?: string } | null {
  if (clip.type !== 'text' && clip.type !== 'file') return null
  const text = clip.textContent ?? clip.preview
  if (!text) return { text: '' }
  const payload: { text: string; html?: string; rtf?: string } = { text }
  if (clip.type === 'text') {
    const html = clip.htmlContent?.trim()
    const rtf = clip.rtfContent?.trim()
    if (html) payload.html = html
    if (rtf) payload.rtf = rtf
  }
  return payload
}

/** Default snippet name from preview (max 40 chars). */
export function defaultSnippetName(preview: string, explicit?: string): string {
  const trimmed = explicit?.trim()
  if (trimmed) return trimmed.slice(0, 80)
  return preview.trim().slice(0, 40) || 'Snippet'
}
