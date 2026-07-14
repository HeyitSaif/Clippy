/**
 * Pure helpers for clipboard change detection (tier-1 formats fingerprint).
 * Kept free of Electron APIs so Vitest can cover them in Node.
 */

/** Stable fingerprint of clipboard format list (order-independent). */
export function formatsKey(formats: readonly string[]): string {
  if (formats.length === 0) return ''
  return [...formats].sort().join('|')
}

/** True when any format is an image MIME (e.g. image/png). */
export function formatsIncludeImage(formats: readonly string[]): boolean {
  return formats.some((f) => f.startsWith('image/'))
}

/** True when any format is a text MIME (e.g. text/plain). */
export function formatsIncludeText(formats: readonly string[]): boolean {
  return formats.some((f) => f.startsWith('text/'))
}
