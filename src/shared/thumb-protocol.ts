/** Custom protocol scheme for clip thumbnail images. */
export const THUMB_SCHEME = 'clippy-thumb'

/** Custom protocol scheme for full clip images. */
export const IMAGE_SCHEME = 'clippy-image'

/** UUID v4 (and general UUID) shape used for clip ids. */
const CLIP_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isClipId(id: string): boolean {
  return CLIP_ID_RE.test(id)
}

/** Build a `clippy-thumb://` URL for a clip id (hostname = id). */
export function thumbUrl(id: string): string {
  return `${THUMB_SCHEME}://${id}`
}

/** Build a `clippy-image://` URL for a clip id (hostname = id). */
export function imageUrl(id: string): string {
  return `${IMAGE_SCHEME}://${id}`
}
