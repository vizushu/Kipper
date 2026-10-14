/**
 * Date helpers for the booking engine.
 *
 * Conventions (match src/lib/types.ts):
 * - Booking dates are ISO `YYYY-MM-DD` calendar days in America/Los_Angeles.
 * - A stay is [checkIn, checkOut): the checkout day is not charged and is
 *   available as a check-in day for a back-to-back stay.
 *
 * All comparisons are done on the YYYY-MM-DD strings (they sort
 * lexicographically) or on UTC-midnight timestamps derived from them, so
 * results never depend on the server's local timezone.
 */

export const LA_TZ = "America/Los_Angeles";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function split(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

/** Strict YYYY-MM-DD validation (rejects 2026-02-30 etc.). */
export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = split(s);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function toDateStr(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function utcMidnight(dateStr: string): Date {
  const [y, m, d] = split(dateStr);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Add (or subtract) calendar days. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = split(dateStr);
  return toDateStr(new Date(Date.UTC(y, m - 1, d + n)));
}

/** Number of nights in [checkIn, checkOut). Assumes valid, ordered inputs. */
export function diffNights(checkIn: string, checkOut: string): number {
  return Math.round(
    (utcMidnight(checkOut).getTime() - utcMidnight(checkIn).getTime()) / 86_400_000
  );
}

/** Every date in [from, to). Empty when from >= to. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * A UTC instant that is guaranteed to fall on the same calendar day in
 * America/Los_Angeles (LA noon == 19:00/20:00 UTC). Used to derive the
 * LA weekday/month of a YYYY-MM-DD date regardless of server timezone.
 */
function laNoonInstant(dateStr: string): Date {
  const [y, m, d] = split(dateStr);
  return new Date(Date.UTC(y, m - 1, d, 19, 0, 0));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: LA_TZ,
  weekday: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: LA_TZ,
  month: "numeric",
});

/** 0=Sunday … 6=Saturday, in America/Los_Angeles. */
export function weekdayInLA(dateStr: string): number {
  const name = weekdayFmt.format(laNoonInstant(dateStr));
  const idx = (WEEKDAYS as readonly string[]).indexOf(name);
  if (idx < 0) throw new Error(`Unexpected weekday for ${dateStr}: ${name}`);
  return idx;
}

/** 1=January … 12=December, in America/Los_Angeles. */
export function monthInLA(dateStr: string): number {
  return Number(monthFmt.format(laNoonInstant(dateStr)));
}

/** Today's date (YYYY-MM-DD) in America/Los_Angeles. */
export function todayInLA(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** True when dateStr is before today in America/Los_Angeles. */
export function isPastDate(dateStr: string, now: Date = new Date()): boolean {
  return dateStr < todayInLA(now);
}

/**
 * Half-open range overlap: [aStart, aEnd) overlaps [bStart, bEnd).
 * Back-to-back stays (aEnd === bStart) do NOT overlap.
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
