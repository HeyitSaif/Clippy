import { describe, expect, it } from 'vitest'
import {
  formatIsoWeekKey,
  formatLocalDate,
  getIsoWeekKey,
  getIsoWeekParts,
  getLogicalDate,
  getLogicalDateKey,
  getLogicalIsoWeekKey,
  shouldRotateDaily,
  shouldRotateWeekly
} from '../src/shared/todo-rotate'

/** Build a local Date then return its ms (stable for local-TZ tests). */
function localMs(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  return new Date(year, monthIndex, day, hour, minute, second).getTime()
}

describe('formatLocalDate', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    expect(formatLocalDate(localMs(2026, 6, 14, 15, 30))).toBe('2026-07-14')
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('getLogicalDate / getLogicalDateKey', () => {
  it('uses calendar day when rotateHour is 0', () => {
    const midnight = localMs(2026, 6, 14, 0, 0)
    const evening = localMs(2026, 6, 14, 23, 59)
    expect(getLogicalDateKey(midnight, 0)).toBe('2026-07-14')
    expect(getLogicalDateKey(evening, 0)).toBe('2026-07-14')
  })

  it('keeps previous day before rotateHour', () => {
    // rotate at 4am: 3:59 still counts as July 13
    const before = localMs(2026, 6, 14, 3, 59)
    const atBoundary = localMs(2026, 6, 14, 4, 0)
    const after = localMs(2026, 6, 14, 4, 1)

    expect(getLogicalDateKey(before, 4)).toBe('2026-07-13')
    expect(getLogicalDateKey(atBoundary, 4)).toBe('2026-07-14')
    expect(getLogicalDateKey(after, 4)).toBe('2026-07-14')
  })

  it('returns a Date at local midnight of the logical day', () => {
    const before = localMs(2026, 6, 14, 2, 0)
    const d = getLogicalDate(before, 4)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6)
    expect(d.getDate()).toBe(13)
    expect(d.getHours()).toBe(0)
  })

  it('treats invalid rotateHour as midnight (0)', () => {
    const noon = localMs(2026, 6, 14, 12)
    expect(getLogicalDateKey(noon, -5)).toBe('2026-07-14')
    expect(getLogicalDateKey(noon, 99)).toBe('2026-07-14')
    expect(getLogicalDateKey(noon, Number.NaN)).toBe('2026-07-14')
  })
})

describe('ISO week helpers', () => {
  it('formats week keys as YYYY-Www', () => {
    expect(formatIsoWeekKey({ year: 2026, week: 1 })).toBe('2026-W01')
    expect(formatIsoWeekKey({ year: 2026, week: 28 })).toBe('2026-W28')
  })

  it('places 2026-01-01 in week 2026-W01 (Thursday)', () => {
    // Jan 1 2026 is Thursday → ISO week 1 of 2026
    const parts = getIsoWeekParts(new Date(2026, 0, 1, 12))
    expect(parts).toEqual({ year: 2026, week: 1 })
    expect(getIsoWeekKey(localMs(2026, 0, 1, 12))).toBe('2026-W01')
  })

  it('handles year boundary weeks (late December)', () => {
    // Dec 29 2025 is Monday of week that contains Jan 1 2026 (Thu) → 2026-W01
    expect(getIsoWeekKey(localMs(2025, 11, 29, 12))).toBe('2026-W01')
    // Dec 28 2025 is Sunday → previous week 2025-W52
    expect(getIsoWeekKey(localMs(2025, 11, 28, 12))).toBe('2025-W52')
  })

  it('uses logical day for week key with rotate hour', () => {
    // Monday 2026-07-13 is in some ISO week; before rotate on Tue still Mon
    // 2026-07-14 is Tuesday. rotateHour 4: at 02:00 logical day is still July 13
    const tueEarly = localMs(2026, 6, 14, 2, 0)
    const tueLate = localMs(2026, 6, 14, 10, 0)
    expect(getLogicalIsoWeekKey(tueEarly, 4)).toBe(getIsoWeekKey(localMs(2026, 6, 13, 12)))
    expect(getLogicalIsoWeekKey(tueLate, 4)).toBe(getIsoWeekKey(localMs(2026, 6, 14, 12)))
  })
})

describe('shouldRotateDaily', () => {
  it('returns false when never rotated (null marker — seed only)', () => {
    expect(shouldRotateDaily(null, localMs(2026, 6, 14, 10), 0)).toBe(false)
  })

  it('returns false on the same logical day', () => {
    const now = localMs(2026, 6, 14, 18)
    expect(shouldRotateDaily('2026-07-14', now, 0)).toBe(false)
  })

  it('returns true when logical day advances', () => {
    const nextDay = localMs(2026, 6, 15, 0, 1)
    expect(shouldRotateDaily('2026-07-14', nextDay, 0)).toBe(true)
  })

  it('respects rotateHour across midnight', () => {
    // Last rotate was July 13 logical; at July 14 03:00 with hour=4 still July 13
    const early = localMs(2026, 6, 14, 3, 0)
    expect(shouldRotateDaily('2026-07-13', early, 4)).toBe(false)
    // At 4am logical becomes July 14 → rotate
    const atFour = localMs(2026, 6, 14, 4, 0)
    expect(shouldRotateDaily('2026-07-13', atFour, 4)).toBe(true)
  })
})

describe('shouldRotateWeekly', () => {
  it('returns false when never rotated', () => {
    expect(shouldRotateWeekly(null, localMs(2026, 6, 14, 10), 0)).toBe(false)
  })

  it('returns false within the same ISO week', () => {
    // 2026-07-13 Mon and 2026-07-17 Fri same week
    const monKey = getLogicalIsoWeekKey(localMs(2026, 6, 13, 12), 0)
    const fri = localMs(2026, 6, 17, 12)
    expect(shouldRotateWeekly(monKey, fri, 0)).toBe(false)
  })

  it('returns true when ISO week advances', () => {
    // Week of July 13–19 2026; next Monday July 20
    const lastWeek = getLogicalIsoWeekKey(localMs(2026, 6, 13, 12), 0)
    const nextMon = localMs(2026, 6, 20, 0, 1)
    expect(shouldRotateWeekly(lastWeek, nextMon, 0)).toBe(true)
  })
})
