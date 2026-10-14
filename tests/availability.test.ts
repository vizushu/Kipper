/**
 * Availability tests: overlap semantics (back-to-back stays allowed),
 * blocked ranges, past days, min-stay enforcement.
 */
import { describe, expect, it } from "vitest";
import {
  assertRangeAvailable,
  computeAvailabilityDays,
} from "../src/lib/availability";
import { getProperty } from "../src/lib/property";
import { DEFAULT_PRICING_SETTINGS } from "../src/lib/pricing";
import { BookingError } from "../src/lib/types";
import { addDays, rangesOverlap, todayInLA } from "../src/lib/dates";

const property = getProperty("casa-pacifica")!;
const settings = { ...DEFAULT_PRICING_SETTINGS };

// A fixed future window so tests are deterministic.
const W0 = addDays(todayInLA(), 60);
const D = (n: number) => addDays(W0, n);

function daysInput(bookings: { checkIn: string; checkOut: string }[] = [], blocks: { id: string; propertyId: string; from: string; to: string; reason: string }[] = []) {
  return {
    property,
    settings,
    rateOverrides: {},
    from: D(0),
    to: D(6),
    bookings,
    blocks,
  };
}

describe("rangesOverlap", () => {
  it("treats back-to-back ranges as non-overlapping", () => {
    expect(rangesOverlap("2026-12-01", "2026-12-03", "2026-12-03", "2026-12-05")).toBe(false);
  });
  it("detects real overlaps", () => {
    expect(rangesOverlap("2026-12-01", "2026-12-04", "2026-12-03", "2026-12-05")).toBe(true);
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-12-02", "2026-12-03")).toBe(true);
    expect(rangesOverlap("2026-12-02", "2026-12-03", "2026-12-01", "2026-12-05")).toBe(true);
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-12-01", "2026-12-05")).toBe(true);
  });
});

describe("computeAvailabilityDays", () => {
  it("marks booked nights and leaves the checkout day available (back-to-back)", () => {
    const days = computeAvailabilityDays(
      daysInput([{ checkIn: D(1), checkOut: D(3) }])
    );
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate[D(0)].available).toBe(true);
    expect(byDate[D(1)].available).toBe(false);
    expect(byDate[D(1)].blockedReason).toBe("booked");
    expect(byDate[D(2)].available).toBe(false);
    expect(byDate[D(2)].blockedReason).toBe("booked");
    // Checkout day D(3) is free for the next guest.
    expect(byDate[D(3)].available).toBe(true);
    expect(byDate[D(3)].blockedReason).toBeUndefined();
    expect(byDate[D(4)].available).toBe(true);
  });

  it("marks manual blocks with reason 'blocked'", () => {
    const days = computeAvailabilityDays(
      daysInput([], [{ id: "b1", propertyId: "casa-pacifica", from: D(2), to: D(4), reason: "Owner stay" }])
    );
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    expect(byDate[D(2)].available).toBe(false);
    expect(byDate[D(2)].blockedReason).toBe("blocked");
    expect(byDate[D(3)].blockedReason).toBe("blocked");
    expect(byDate[D(4)].available).toBe(true); // block end is exclusive
  });

  it("marks past days unavailable", () => {
    const days = computeAvailabilityDays({
      ...daysInput(),
      from: addDays(todayInLA(), -2),
      to: addDays(todayInLA(), 1),
    });
    expect(days[0].available).toBe(false);
    expect(days[0].blockedReason).toBe("past");
    expect(days[1].blockedReason).toBe("past");
    expect(days[2].available).toBe(true); // today
  });

  it("prices every day, even unavailable ones", () => {
    const days = computeAvailabilityDays(daysInput([{ checkIn: D(1), checkOut: D(2) }]));
    for (const d of days) {
      expect(d.nightlyRateCents).toBeGreaterThan(0);
      expect(d.minStayNights).toBe(settings.minStayNights);
    }
  });

  it("rejects an inverted window", () => {
    expect(() =>
      computeAvailabilityDays({ ...daysInput(), from: D(3), to: D(1) })
    ).toThrowError(expect.objectContaining({ code: "INVALID_DATES" }));
  });
});

describe("assertRangeAvailable", () => {
  const base = {
    settings,
    bookings: [] as { checkIn: string; checkOut: string }[],
    blocks: [] as { id: string; propertyId: string; from: string; to: string; reason: string }[],
  };

  it("allows back-to-back stays", () => {
    expect(() =>
      assertRangeAvailable({
        ...base,
        checkIn: D(3),
        checkOut: D(5),
        bookings: [{ checkIn: D(1), checkOut: D(3) }],
      })
    ).not.toThrow();
  });

  it("rejects overlapping bookings with UNAVAILABLE", () => {
    expect(() =>
      assertRangeAvailable({
        ...base,
        checkIn: D(2),
        checkOut: D(4),
        bookings: [{ checkIn: D(1), checkOut: D(3) }],
      })
    ).toThrowError(expect.objectContaining({ code: "UNAVAILABLE" }));
  });

  it("rejects overlapping blocks with UNAVAILABLE", () => {
    expect(() =>
      assertRangeAvailable({
        ...base,
        checkIn: D(2),
        checkOut: D(4),
        blocks: [{ id: "b1", propertyId: "casa-pacifica", from: D(3), to: D(6), reason: "Owner stay" }],
      })
    ).toThrowError(expect.objectContaining({ code: "UNAVAILABLE" }));
  });

  it("enforces min-stay", () => {
    expect(() =>
      assertRangeAvailable({
        ...base,
        settings: { ...settings, minStayNights: 2 },
        checkIn: D(1),
        checkOut: D(2),
      })
    ).toThrowError(expect.objectContaining({ code: "MIN_STAY" }));
  });

  it("rejects past check-in", () => {
    expect(() =>
      assertRangeAvailable({
        ...base,
        checkIn: addDays(todayInLA(), -5),
        checkOut: addDays(todayInLA(), -3),
      })
    ).toThrowError(expect.objectContaining({ code: "INVALID_DATES" }));
  });

  it("throws BookingError instances", () => {
    try {
      assertRangeAvailable({ ...base, checkIn: D(2), checkOut: D(4), bookings: [{ checkIn: D(1), checkOut: D(5) }] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(BookingError);
    }
  });
});
