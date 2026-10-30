import { resolveStayConfiguration } from "./accommodation";
/**
 * Availability computation.
 *
 * Source of truth: the app's own database (confirmed + pending_payment
 * bookings) plus manually-created blocked ranges. iCal imports (see
 * src/lib/ical.ts) are a DELAYED secondary sync only — they land as manual
 * blocks, never as live truth.
 *
 * Semantics:
 * - A stay is [checkIn, checkOut): the checkout day is NOT occupied, so
 *   back-to-back stays (checkout day == next check-in day) are allowed.
 * - Cancelled bookings never block availability.
 * - Past days are marked unavailable with blockedReason "past".
 * - blockedReason is "booked" for booking overlap, "blocked" for manual
 *   blocks. When both apply, "booked" wins.
 * - nightlyRateCents is computed for every day in the window (even
 *   unavailable ones) so calendars can show pricing.
 * - Min/max-stay and guest-capacity rules are enforced when validating a
 *   requested range (assertRangeAvailable / validateStayWindow), not by
 *   hiding days — the AvailabilityDay carries minStayNights so the UI can
 *   guide the guest.
 */

import {
  BookingError,
  type AvailabilityDay,
  type BlockedRange,
  type Property,
} from "./types";
import {
  addDays,
  eachDate,
  isPastDate,
  isValidDateStr,
  rangesOverlap,
  todayInLA,
} from "./dates";
import { nightlyRateCents, validateStayWindow, type PricingSettings } from "./pricing";

export interface OccupiedRange {
  checkIn: string;
  checkOut: string;
}

export interface AvailabilityInput {
  property: Property;
  settings: PricingSettings;
  rateOverrides: Record<string, number>;
  /** Half-open window [from, to) to report on. */
  from: string;
  to: string;
  /** Bookings with status confirmed or pending_payment (cancelled excluded). */
  bookings: OccupiedRange[];
  blocks: BlockedRange[];
  now?: Date;
}

/** Pure computation: days in [from, to) with availability flags. */
export function computeAvailabilityDays(input: AvailabilityInput): AvailabilityDay[] {
  const { property, settings, rateOverrides, from, to, bookings, blocks, now = new Date() } = input;

  if (!isValidDateStr(from) || !isValidDateStr(to) || to <= from) {
    throw new BookingError("INVALID_DATES", "Availability window must be valid YYYY-MM-DD dates with to > from.");
  }
  const today = todayInLA(now);

  return eachDate(from, to).map((date): AvailabilityDay => {
    let available = true;
    let blockedReason: AvailabilityDay["blockedReason"];
    if (isPastDate(date, now)) {
      available = false;
      blockedReason = "past";
    } else if (bookings.some((b) => rangesOverlap(b.checkIn, b.checkOut, date, addDays(date, 1)))) {
      available = false;
      blockedReason = "booked";
    } else if (blocks.some((b) => rangesOverlap(b.from, b.to, date, addDays(date, 1)))) {
      available = false;
      blockedReason = "blocked";
    }
    if (available && resolveStayConfiguration(property, date, addDays(date, 1)).status !== "available") { available = false; blockedReason = "blocked"; }
    return {
      date,
      available,
      nightlyRateCents: nightlyRateCents(property, date, rateOverrides),
      minStayNights: settings.minStayNights,
      ...(blockedReason ? { blockedReason } : {}),
    };
  });
}

export interface RangeCheckInput {
  settings: PricingSettings;
  checkIn: string;
  checkOut: string;
  bookings: OccupiedRange[];
  blocks: BlockedRange[];
  now?: Date;
}

/**
 * Validate a requested stay against availability. Throws:
 * - INVALID_DATES for bad/past/inverted dates,
 * - MIN_STAY / MAX_STAY (via validateStayWindow in pricing),
 * - UNAVAILABLE when any night in [checkIn, checkOut) is booked or blocked.
 */
export function assertRangeAvailable(input: RangeCheckInput): void {
  const { settings, checkIn, checkOut, bookings, blocks, now = new Date() } = input;

  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut)) {
    throw new BookingError("INVALID_DATES", "Dates must be valid YYYY-MM-DD calendar days.");
  }
  if (checkOut <= checkIn) {
    throw new BookingError("INVALID_DATES", "Checkout must be after check-in.");
  }
  if (isPastDate(checkIn, now)) {
    throw new BookingError("INVALID_DATES", "Check-in cannot be in the past.");
  }
  // Min/max-stay validation (throws MIN_STAY / MAX_STAY).
  validateStayWindow(checkIn, checkOut, settings, now);

  const conflictingBooking = bookings.find((b) => rangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut));
  if (conflictingBooking) {
    throw new BookingError(
      "UNAVAILABLE",
      "Those dates are no longer available — another booking overlaps this stay."
    );
  }
  const conflictingBlock = blocks.find((b) => rangesOverlap(b.from, b.to, checkIn, checkOut));
  if (conflictingBlock) {
    throw new BookingError(
      "UNAVAILABLE",
      `Those dates are blocked${conflictingBlock.reason ? `: ${conflictingBlock.reason}` : "."}`
    );
  }
}
