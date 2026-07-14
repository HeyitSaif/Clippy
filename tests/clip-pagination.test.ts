import { describe, expect, it } from 'vitest'
import {
  appendUniqueById,
  isNearEnd,
  NEAR_END_THRESHOLD,
  PAGE_SIZE,
  pageHasMore
} from '../src/shared/clip-pagination'

describe('appendUniqueById', () => {
  it('appends new ids only', () => {
    const prev = [{ id: 'a' }, { id: 'b' }]
    const page = [{ id: 'b' }, { id: 'c' }, { id: 'd' }]
    expect(appendUniqueById(prev, page)).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' }
    ])
  })

  it('returns prev when page is empty or all duplicates', () => {
    const prev = [{ id: 'a' }]
    expect(appendUniqueById(prev, [])).toBe(prev)
    expect(appendUniqueById(prev, [{ id: 'a' }])).toBe(prev)
  })
})

describe('pageHasMore', () => {
  it('is true only for a full page', () => {
    expect(pageHasMore(PAGE_SIZE)).toBe(true)
    expect(pageHasMore(PAGE_SIZE - 1)).toBe(false)
    expect(pageHasMore(0)).toBe(false)
    expect(pageHasMore(10, 10)).toBe(true)
  })
})

describe('isNearEnd', () => {
  it('fires within threshold of the end', () => {
    expect(isNearEnd(95, 100)).toBe(true)
    expect(isNearEnd(94, 100)).toBe(false)
    expect(isNearEnd(99, 100)).toBe(true)
    expect(isNearEnd(0, 3)).toBe(true)
  })

  it('handles empty / invalid', () => {
    expect(isNearEnd(0, 0)).toBe(false)
    expect(isNearEnd(-1, 10)).toBe(false)
  })

  it('uses NEAR_END_THRESHOLD default of 5', () => {
    expect(NEAR_END_THRESHOLD).toBe(5)
    expect(isNearEnd(5, 10, NEAR_END_THRESHOLD)).toBe(true)
    expect(isNearEnd(4, 10, NEAR_END_THRESHOLD)).toBe(false)
  })
})
