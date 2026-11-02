/**
 * Pricing engine tests: nightly rates (weekend / seasonal / clamp /
 * overrides), discounts, tax base, pet fee, itemization, and every
 * BookingError code the engine can throw.
 */
import { describe, expect, it } from "vitest";
import {
  computeQuote,
  DEFAULT_PRICING_SETTINGS,
  nightlyRateCents,
  type PricingSettings,
} from "../src/lib/pricing";
import { getProperty } from "../src/lib/property";
import { BookingError } from "../src/lib/types";
import {
  addDays,
  monthInLA,
  todayInLA,
  weekdayInLA,
} from "../src/lib/dates";

const property = {...getProperty("casa-pacifica")!,pricingMode:"legacy_sample" as const,inclusiveNightlyAllowanceBps:0 as const,baseNightlyCents:34900,minNightlyCents:34900,maxNightlyCents:103000,petPolicy:{allowed:true,feePerStayCents:5000,maxPets:1}};
const settings: PricingSettings = {
  ...DEFAULT_PRICING_SETTINGS,
  cleaningFeeCents:18000,
  promos: [{code:"DIRECT10",type:"percent",percent:10}],
};

const isSummer = (d: string) => {
  const m = monthInLA(d);
  return m >= 6 && m <= 8;
};
const isWeekendNight = (d: string) => {
  const w = weekdayInLA(d);
  return w === 5 || w === 6;
};

/** First date ≥30 days out matching a predicate (deterministic, always future). */
function futureDate(predicate: (d: string) => boolean): string {
  let d = addDays(todayInLA(), 30);
  for (let i = 0; i < 500 && !predicate(d); i++) d = addDays(d, 1);
  if (!predicate(d)) throw new Error("test setup: no matching date found");
  return d;
}

function baseInput(checkIn: string, nights: number) {
  return {
    property,
    settings,
    rateOverrides: {} as Record<string, number>,
    checkIn,
    checkOut: addDays(checkIn, nights),
    guests: { adults: 2, children: 0, infants: 0 },
  };
}

describe("nightlyRateCents", () => {
  it("charges base $349 on an off-season weekday", () => {
    const d = futureDate((x) => !isWeekendNight(x) && !isSummer(x));
    expect(nightlyRateCents(property, d, {})).toBe(34900);
  });

  it("applies ×1.20 on Friday and Saturday nights (off-season)", () => {
    const fri = futureDate((x) => weekdayInLA(x) === 5 && !isSummer(x));
    const sat = futureDate((x) => weekdayInLA(x) === 6 && !isSummer(x));
    expect(nightlyRateCents(property, fri, {})).toBe(41880); // 34900 × 1.20
    expect(nightlyRateCents(property, sat, {})).toBe(41880);
  });

  it("applies ×1.15 in June–August and stacks with the weekend factor", () => {
    const summerWeekday = futureDate((x) => !isWeekendNight(x) && isSummer(x));
    const summerFriday = futureDate((x) => weekdayInLA(x) === 5 && isSummer(x));
    expect(nightlyRateCents(property, summerWeekday, {})).toBe(40135); // 34900 × 1.15
    expect(nightlyRateCents(property, summerFriday, {})).toBe(48162); // 34900 × 1.20 × 1.15
  });

  it("clamps to [$349, $1030] after factors", () => {
    const d = futureDate(() => true);
    expect(nightlyRateCents(property, d, { [d]: 200_000 })).toBe(103000);
    expect(nightlyRateCents(property, d, { [d]: 100 })).toBe(34900);
  });

  it("honors admin rate overrides (clamped)", () => {
    const d = futureDate(() => true);
    expect(nightlyRateCents(property, d, { [d]: 50000 })).toBe(50000);
  });
});

describe("computeQuote", () => {
  it("computes a fully itemized quote with DIRECT10, cleaning, pet fee, and tax", () => {
    const checkIn = futureDate((x) => !isWeekendNight(x) && !isSummer(x));
    const d1 = checkIn;
    const d2 = addDays(checkIn, 1);
    const d3 = addDays(checkIn, 2);
    const quote = computeQuote({
      ...baseInput(checkIn, 3),
      rateOverrides: { [d1]: 40000, [d2]: 40000, [d3]: 40000 },
      pets: 1,
      promoCode: "direct10", // case-insensitive
      now: new Date("2026-10-13T12:00:00.000Z"),
    });

    expect(quote.nights).toBe(3);
    expect(quote.nightlyRates).toHaveLength(3);
    expect(quote.nightlyRates.map((n) => n.rateCents)).toEqual([40000, 40000, 40000]);
    expect(quote.subtotalCents).toBe(120000);
    expect(quote.promoCode).toBe("DIRECT10");
    expect(quote.discountCents).toBe(12000); // 10% of nightly subtotal
    expect(quote.cleaningFeeCents).toBe(18000);
    expect(quote.petFeeCents).toBe(5000);
    // Tax base: subtotal − discount + cleaning = 120000 − 12000 + 18000 = 126000
    expect(quote.taxesCents).toBe(16065); // 126000 × 12.75%
    expect(quote.totalCents).toBe(120000 - 12000 + 18000 + 5000 + 16065);
    expect(quote.totalCents).toBe(147065);
    expect(quote.currency).toBe("USD");
    expect(quote.expiresAt).toBe("2026-10-13T12:15:00.000Z"); // 15-min TTL

    // Line items fully itemize the total.
    const itemSum = quote.lineItems.reduce((s, li) => s + li.amountCents, 0);
    expect(itemSum).toBe(quote.totalCents);
    expect(quote.lineItems.some((li) => li.amountCents === -12000)).toBe(true);
    expect(quote.lineItems.some((li) => li.label === "Cleaning fee")).toBe(true);
    expect(quote.lineItems.some((li) => li.label === "Pet fee")).toBe(true);
  });

  it("has no discount or pet fee without promo/pets", () => {
    const checkIn = futureDate(() => true);
    const quote = computeQuote(baseInput(checkIn, 1));
    expect(quote.discountCents).toBe(0);
    expect(quote.petFeeCents).toBe(0);
    expect(quote.promoCode).toBeUndefined();
    expect(quote.lineItems.some((li) => li.amountCents < 0)).toBe(false);
  });

  it("rejects an unknown promo code", () => {
    const checkIn = futureDate(() => true);
    expect(() => computeQuote({ ...baseInput(checkIn, 1), promoCode: "NOPE" })).toThrowError(
      BookingError
    );
  });

  it("rejects bad date windows", () => {
    const checkIn = futureDate(() => true);
    expect(() => computeQuote({ ...baseInput(checkIn, 1), checkOut: checkIn })).toThrowError(
      expect.objectContaining({ code: "INVALID_DATES" })
    );
    expect(
      () =>
        computeQuote({
          ...baseInput(checkIn, 1),
          checkIn: "2026-13-99",
          checkOut: addDays(checkIn, 1),
        })
    ).toThrowError(expect.objectContaining({ code: "INVALID_DATES" }));
    expect(
      () =>
        computeQuote({
          ...baseInput(checkIn, 1),
          checkIn: "2020-01-01",
          checkOut: "2020-01-03",
        })
    ).toThrowError(expect.objectContaining({ code: "INVALID_DATES" }));
  });

  it("enforces min/max stay", () => {
    const checkIn = futureDate(() => true);
    const min2: PricingSettings = { ...settings, minStayNights: 2 };
    expect(() =>
      computeQuote({ ...baseInput(checkIn, 1), settings: min2 })
    ).toThrowError(expect.objectContaining({ code: "MIN_STAY" }));
    const max2: PricingSettings = { ...settings, maxStayNights: 2 };
    expect(() =>
      computeQuote({ ...baseInput(checkIn, 3), settings: max2 })
    ).toThrowError(expect.objectContaining({ code: "MAX_STAY" }));
  });

  it("enforces guest capacity", () => {
    const checkIn = futureDate(() => true);
    const over = { ...baseInput(checkIn, 1), guests: { adults: 6, children: 3, infants: 0 } };
    expect(() => computeQuote(over)).toThrowError(
      expect.objectContaining({ code: "GUEST_LIMIT" })
    );
    const noAdults = { ...baseInput(checkIn, 1), guests: { adults: 0, children: 2, infants: 0 } };
    expect(() => computeQuote(noAdults)).toThrowError(
      expect.objectContaining({ code: "GUEST_LIMIT" })
    );
    // Infants don't count toward the 8-overnight cap.
    const withInfants = {
      ...baseInput(checkIn, 1),
      guests: { adults: 8, children: 0, infants: 2 },
    };
    expect(() => computeQuote(withInfants)).toThrow(); // Maximum 8 total, including infants.
  });

  it("enforces the pet policy", () => {
    const checkIn = futureDate(() => true);
    expect(() => computeQuote({ ...baseInput(checkIn, 1), pets: 2 })).toThrowError(
      expect.objectContaining({ code: "GUEST_LIMIT" })
    );
  });
});
