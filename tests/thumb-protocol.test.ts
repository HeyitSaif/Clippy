import { describe, expect, it } from 'vitest'
import {
  IMAGE_SCHEME,
  THUMB_SCHEME,
  imageUrl,
  isClipId,
  thumbUrl
} from '../src/shared/thumb-protocol'

const SAMPLE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

describe('isClipId', () => {
  it('accepts lowercase UUIDs', () => {
    expect(isClipId(SAMPLE_ID)).toBe(true)
  })

  it('accepts uppercase UUIDs', () => {
    expect(isClipId(SAMPLE_ID.toUpperCase())).toBe(true)
  })

  it('rejects malformed ids', () => {
    expect(isClipId('')).toBe(false)
    expect(isClipId('not-a-uuid')).toBe(false)
    expect(isClipId('a1b2c3d4-e5f6-4789-a012')).toBe(false)
  })
})

describe('thumbUrl / imageUrl', () => {
  it('builds custom protocol URLs with id as hostname', () => {
    expect(thumbUrl(SAMPLE_ID)).toBe(`${THUMB_SCHEME}://${SAMPLE_ID}`)
    expect(imageUrl(SAMPLE_ID)).toBe(`${IMAGE_SCHEME}://${SAMPLE_ID}`)
  })
})
