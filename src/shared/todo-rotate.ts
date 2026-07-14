/**
 * Pure date helpers for Daily / Weekly todo list rotation.
 *
 * Rotation is driven by a local "logical day" that flips at `rotateHour`
 * (0 = midnight). Hours before that boundary still belong to the previous day.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Pad a number to two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format local calendar date as YYYY-MM-DD. */
export function formatLocalDate(msOrDate: number | Date): string {
  const d = typeof msOrDate === "number" ? new Date(msOrDate) : msOrDate;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Calendar date adjusted so that hours before `rotateHour` still count as
 * the previous day. Uses local timezone.
 *
 * @param rotateHour Local hour 0–23 when the day rolls over.
 */
export function getLogicalDate(nowMs: number, rotateHour: number): Date {
  const hour = clampRotateHour(rotateHour);
  const d = new Date(nowMs);
  if (d.getHours() < hour) {
    d.setDate(d.getDate() - 1);
  }
  // Normalize to local midnight of the logical day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Logical day key (YYYY-MM-DD) for rotation bookkeeping. */
export function getLogicalDateKey(nowMs: number, rotateHour: number): string {
  return formatLocalDate(getLogicalDate(nowMs, rotateHour));
}

/**
 * ISO-8601 week parts (year + week number). Week 1 is the week with the
 * year's first Thursday; weeks start on Monday.
 */
export function getIsoWeekParts(date: Date): { year: number; week: number } {
  // Work in local calendar days at noon to avoid DST edge cases
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  // Monday-based day index: Mon=0 … Sun=6
  const day = (d.getDay() + 6) % 7;
  // Move to Thursday of this week (decides ISO year)
  d.setDate(d.getDate() - day + 3);
  const isoYear = d.getFullYear();

  // Thursday of week 1: week containing Jan 4
  const week1 = new Date(isoYear, 0, 4, 12);
  const week1Day = (week1.getDay() + 6) % 7;
  week1.setDate(week1.getDate() - week1Day + 3);

  const week =
    1 + Math.round((d.getTime() - week1.getTime()) / (7 * MS_PER_DAY));
  return { year: isoYear, week };
}

/** ISO week key: `YYYY-Www` (e.g. `2026-W28`). */
export function formatIsoWeekKey(parts: {
  year: number;
  week: number;
}): string {
  return `${parts.year}-W${pad2(parts.week)}`;
}

export function getIsoWeekKey(msOrDate: number | Date): string {
  const d = typeof msOrDate === "number" ? new Date(msOrDate) : msOrDate;
  return formatIsoWeekKey(getIsoWeekParts(d));
}

/** Logical ISO week key using the same rotate-hour day boundary. */
export function getLogicalIsoWeekKey(
  nowMs: number,
  rotateHour: number,
): string {
  return getIsoWeekKey(getLogicalDate(nowMs, rotateHour));
}

/**
 * Whether a daily rotation should run.
 * @param lastRotateDate Previous marker (YYYY-MM-DD), or null if never set.
 */
export function shouldRotateDaily(
  lastRotateDate: string | null,
  nowMs: number,
  rotateHour: number,
): boolean {
  const current = getLogicalDateKey(nowMs, rotateHour);
  if (lastRotateDate === null) return false;
  return lastRotateDate !== current;
}

/**
 * Whether a weekly rotation should run (ISO week boundary).
 * @param lastRotateWeek Previous marker (`YYYY-Www`), or null if never set.
 */
export function shouldRotateWeekly(
  lastRotateWeek: string | null,
  nowMs: number,
  rotateHour: number,
): boolean {
  const current = getLogicalIsoWeekKey(nowMs, rotateHour);
  if (lastRotateWeek === null) return false;
  return lastRotateWeek !== current;
}

function clampRotateHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  const h = Math.floor(hour);
  if (h < 0 || h > 23) return 0;
  return h;
}
