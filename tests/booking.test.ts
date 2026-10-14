/**
 * Booking persistence tests (SQLite adapter, temp DB per file):
 * - double-booking prevention (two overlapping creates → exactly one wins,
 *   including an interleaved "both checked first" race simulation)
 * - idempotency (same key → same booking, no duplicate)
 * - blocks make ranges unavailable
 * - cancelled bookings stop blocking availability
 * - quote store with 15-minute expiry
 * - settings seeding + partial updates
 * - rate overrides CRUD
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SqliteAdapter } from "../src/lib/db/sqlite";
import { createBookingForQuote } from "../src/lib/bookings";
import { computeQuote, DEFAULT_PRICING_SETTINGS } from "../src/lib/pricing";
import { getProperty } from "../src/lib/property";
import { BookingError, type Quote } from "../src/lib/types";
import { addDays, diffNights, todayInLA } from "../src/lib/dates";
import type { NewBookingInput } from "../src/lib/db/adapter";

const property = getProperty("casa-pacifica")!;
const settings = { ...DEFAULT_PRICING_SETTINGS };

let dir: string;
let adapter: SqliteAdapter;

const W0 = () => addDays(todayInLA(), 90);
const D = (n: number) => addDays(W0(), n);

function bookingInput(checkIn: string, checkOut: string, key: string): NewBookingInput {
  return {
    propertyId: property.id,
    checkIn,
    checkOut,
    nights: diffNights(checkIn, checkOut),
    guests: { adults: 2, children: 0, infants: 0 },
    pets: 0,
    guest: { name: "Test Guest", email: "guest@example.com" },
    lineItems: [{ label: "2 nights", amountCents: 69800 }],
    totalCents: 80000,
    currency: "USD",
    idempotencyKey: key,
  };
}

function makeQuote(checkIn: string, nights: number): Quote {
  return computeQuote({
    property,
    settings,
    rateOverrides: {},
    checkIn,
    checkOut: addDays(checkIn, nights),
    guests: { adults: 2, children: 0, infants: 0 },
  });
}

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cp-bookings-test-"));
  adapter = new SqliteAdapter(path.join(dir, "test.db"));
});

afterAll(() => {
  adapter.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("settings", () => {
  it("seeds defaults on first run", async () => {
    const s = await adapter.getSettings();
    expect(s.cleaningFeeCents).toBe(15000);
    expect(s.taxRatePct).toBe(10.5);
    expect(s.minStayNights).toBe(1);
    expect(s.maxStayNights).toBe(28);
    expect(s.promos).toHaveLength(1);
    expect(s.promos[0].code).toBe("DIRECT10");
  });

  it("applies partial updates", async () => {
    const s = await adapter.updateSettings({ cleaningFeeCents: 20000 });
    expect(s.cleaningFeeCents).toBe(20000);
    expect(s.taxRatePct).toBe(10.5); // untouched
    // restore for other tests
    await adapter.updateSettings({ cleaningFeeCents: 15000 });
  });
});

describe("createBookingIfAvailable", () => {
  it("creates a pending_payment booking with a CP- reference", async () => {
    const b = await adapter.createBookingIfAvailable(bookingInput(D(10), D(12), "key-create-1"));
    expect(b.status).toBe("pending_payment");
    expect(b.paymentStatus).toBe("unpaid");
    expect(b.reference).toMatch(/^CP-[A-Z2-9]{6}$/);
    expect(b.checkIn).toBe(D(10));
    expect(b.checkOut).toBe(D(12));
  });

  it("prevents double booking: overlapping create throws UNAVAILABLE, exactly one row exists", async () => {
    const before = (await adapter.listBookings()).length;
    await adapter.createBookingIfAvailable(bookingInput(D(20), D(23), "key-dbl-1"));
    await expect(
      adapter.createBookingIfAvailable(bookingInput(D(22), D(25), "key-dbl-2"))
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    // Exact-same range also conflicts.
    await expect(
      adapter.createBookingIfAvailable(bookingInput(D(20), D(23), "key-dbl-3"))
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    // Back-to-back is fine.
    const next = await adapter.createBookingIfAvailable(bookingInput(D(23), D(25), "key-dbl-4"));
    expect(next.status).toBe("pending_payment");
    const after = (await adapter.listBookings()).length;
    expect(after - before).toBe(2);
  });

  it("survives an interleaved race: both callers see free dates, exactly one wins", async () => {
    // Simulate two concurrent requests: both run their availability check
    // BEFORE either inserts (both see zero overlaps).
    const checkA = await adapter.findOverlappingBookings(property.id, D(30), D(33));
    const checkB = await adapter.findOverlappingBookings(property.id, D(30), D(33));
    expect(checkA).toHaveLength(0);
    expect(checkB).toHaveLength(0);

    // Now both attempt the atomic create. The transaction's internal
    // re-check must reject the loser even though the pre-check was clear.
    const results = await Promise.allSettled([
      adapter.createBookingIfAvailable(bookingInput(D(30), D(33), "key-race-a")),
      adapter.createBookingIfAvailable(bookingInput(D(31), D(34), "key-race-b")),
    ]);
    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    const reason = (lost[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(BookingError);
    expect(reason.code).toBe("UNAVAILABLE");
    const inWindow = await adapter.findOverlappingBookings(property.id, D(30), D(34));
    expect(inWindow).toHaveLength(1);
  });

  it("enforces idempotency: same key → DUPLICATE, original returned by key", async () => {
    const first = await adapter.createBookingIfAvailable(bookingInput(D(40), D(42), "key-idem-1"));
    await expect(
      adapter.createBookingIfAvailable(bookingInput(D(50), D(52), "key-idem-1"))
    ).rejects.toMatchObject({ code: "DUPLICATE" });
    const byKey = await adapter.getBookingByIdempotencyKey("key-idem-1");
    expect(byKey?.id).toBe(first.id);
    const all = await adapter.listBookings();
    expect(all.filter((b) => b.idempotencyKey === "key-idem-1")).toHaveLength(1);
  });

  it("treats manual blocks as unavailable", async () => {
    await adapter.createBlock({
      propertyId: property.id,
      from: D(60),
      to: D(63),
      reason: "Owner stay",
    });
    await expect(
      adapter.createBookingIfAvailable(bookingInput(D(61), D(62), "key-block-1"))
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    // Outside the block works.
    const ok = await adapter.createBookingIfAvailable(bookingInput(D(63), D(65), "key-block-2"));
    expect(ok.status).toBe("pending_payment");
  });

  it("ignores cancelled bookings for availability", async () => {
    const b = await adapter.createBookingIfAvailable(bookingInput(D(70), D(72), "key-cancel-1"));
    await adapter.cancelBooking(b.id);
    const again = await adapter.createBookingIfAvailable(bookingInput(D(70), D(72), "key-cancel-2"));
    expect(again.status).toBe("pending_payment");
    expect(again.id).not.toBe(b.id);
  });
});

describe("createBookingForQuote (service)", () => {
  it("rejects expired quotes", async () => {
    const q = makeQuote(D(80), 2);
    q.expiresAt = new Date(Date.now() - 1000).toISOString();
    await adapter.saveQuote(q);
    // getQuote treats it as missing…
    expect(await adapter.getQuote(q.id)).toBeNull();
    // …and the service maps a stale quote object to QUOTE_EXPIRED.
    const stale: Quote = { ...makeQuote(D(81), 2), expiresAt: new Date(Date.now() - 1000).toISOString() };
    await expect(
      createBookingForQuote(adapter, stale, { name: "G", email: "g@example.com" }, "key-exp-1")
    ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
  });

  it("is idempotent through the service layer: same key returns the same booking", async () => {
    const q = makeQuote(D(90), 2);
    await adapter.saveQuote(q);
    const guest = { name: "Idem Guest", email: "idem@example.com" };
    const first = await createBookingForQuote(adapter, q, guest, "key-svc-idem");
    const second = await createBookingForQuote(adapter, q, guest, "key-svc-idem");
    expect(second.duplicate).toBe(true);
    expect(second.booking.id).toBe(first.booking.id);
    expect(
      (await adapter.listBookings()).filter((b) => b.idempotencyKey === "key-svc-idem")
    ).toHaveLength(1);
  });
});

describe("quotes", () => {
  it("round-trips a saved quote", async () => {
    const q = makeQuote(D(100), 2);
    await adapter.saveQuote(q);
    const loaded = await adapter.getQuote(q.id);
    expect(loaded?.id).toBe(q.id);
    expect(loaded?.totalCents).toBe(q.totalCents);
  });

  it("deletes expired quotes", async () => {
    const q = makeQuote(D(101), 2);
    q.expiresAt = new Date(Date.now() - 60_000).toISOString();
    // Bypass getQuote's lazy delete by inserting directly via saveQuote then counting.
    await adapter.saveQuote(q);
    const n = await adapter.deleteExpiredQuotes();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(await adapter.getQuote(q.id)).toBeNull();
  });
});

describe("blocks and rate overrides", () => {
  it("creates, lists, and deletes blocks", async () => {
    const b = await adapter.createBlock({
      propertyId: property.id,
      from: D(110),
      to: D(112),
      reason: "Test block",
    });
    expect((await adapter.listBlocks(property.id)).some((x) => x.id === b.id)).toBe(true);
    expect(await adapter.deleteBlock(b.id)).toBe(true);
    expect((await adapter.listBlocks(property.id)).some((x) => x.id === b.id)).toBe(false);
    expect(await adapter.deleteBlock("nonexistent")).toBe(false);
  });

  it("upserts rate overrides", async () => {
    const o1 = await adapter.upsertRateOverride(property.id, D(120), 50000);
    expect(o1.rateCents).toBe(50000);
    const o2 = await adapter.upsertRateOverride(property.id, D(120), 55000);
    expect(o2.rateCents).toBe(55000);
    const list = await adapter.getRateOverrides(property.id, D(119), D(122));
    expect(list.filter((o) => o.date === D(120))).toHaveLength(1);
    expect(list.find((o) => o.date === D(120))?.rateCents).toBe(55000);
  });
});

describe("lookups", () => {
  it("finds bookings by reference (case-insensitive)", async () => {
    const b = await adapter.createBookingIfAvailable(bookingInput(D(130), D(132), "key-ref-1"));
    const found = await adapter.getBookingByReference(b.reference.toLowerCase());
    expect(found?.id).toBe(b.id);
    expect(await adapter.getBookingByReference("CP-NOPE01")).toBeNull();
  });
});
