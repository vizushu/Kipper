import {describe, expect, it} from "vitest";
import {computeQuote, DEFAULT_PRICING_SETTINGS, nightlyRateCents} from "../src/lib/pricing";
import {getProperty} from "../src/lib/property";
import type {Property} from "../src/lib/types";

const current: Property = {...getProperty("casa-pacifica")!, inclusiveNightlyAllowanceBps: undefined};
const proposed: Property = {...current, inclusiveNightlyAllowanceBps: 300};
const input = {
  settings: DEFAULT_PRICING_SETTINGS, rateOverrides: {},
  checkIn: "2027-02-20", checkOut: "2027-02-22",
  guests: {adults: 2, children: 0, infants: 0}, now: new Date("2026-11-02T00:00:00Z"),
};

describe("approved inclusive nightly allowance", () => {
  it("defaults to disabled when absent while production explicitly opts in", () => {
    expect(current.inclusiveNightlyAllowanceBps).toBeUndefined();
    expect(getProperty("casa-pacifica")!.inclusiveNightlyAllowanceBps).toBe(300);
    expect(nightlyRateCents(current, "2027-02-20", {})).toBe(44900);
    expect(nightlyRateCents({...current, inclusiveNightlyAllowanceBps: 0}, "2027-02-20", {})).toBe(44900);
  });
  it("includes 3% once in flat weekday, weekend and summer prices without stale overrides", () => {
    for (const date of ["2027-02-17", "2027-02-20", "2027-07-03"]) {
      expect(nightlyRateCents(proposed, date, {[date]: 99900})).toBe(46247);
      expect(nightlyRateCents(proposed, date, {})).toBe(46247);
    }
    expect(proposed.baseNightlyCents).toBe(44900);
  });
  it("rounds each resolved base to cents and preserves existing override selection", () => {
    const legacy: Property = {...proposed, pricingMode: "legacy_sample", minNightlyCents: 1, maxNightlyCents: 100000};
    expect(nightlyRateCents(legacy, "2027-02-20", {"2027-02-20": 44901})).toBe(46248);
    expect(nightlyRateCents(legacy, "2027-02-20", {"2027-02-20": 50})).toBe(52);
    const q = computeQuote({...input, property: {...proposed, baseNightlyCents: 50}});
    expect(q.subtotalCents).toBe(104); // Not round(100 * 1.03) = 103.
  });
  it("taxes the inclusive accommodation, keeps cleaning zero and no extra surcharge", () => {
    const q = computeQuote({...input, property: proposed});
    expect(q.nightlyRates.map(n => n.rateCents)).toEqual([46247, 46247]);
    expect(q.subtotalCents).toBe(92494);
    expect(q.cleaningFeeCents).toBe(0);
    expect(q.taxesCents).toBe(11793);
    expect(q.totalCents).toBe(104287);
    expect(q.lineItems.reduce((sum, item) => sum + item.amountCents, 0)).toBe(q.totalCents);
    expect(q.lineItems.some(item => /processing|surcharge|allowance/i.test(item.label))).toBe(false);
    expect(q.staySnapshot?.priceBreakdown?.totalCents).toBe(q.totalCents);
    expect(q.staySnapshot?.priceBreakdown?.accommodationSubtotalCents).toBe(92494);
  });
  it("never mutates a previously accepted quote/snapshot when the policy changes", () => {
    const previous = computeQuote({...input, property: current});
    const frozen = JSON.stringify(previous);
    computeQuote({...input, property: proposed});
    expect(JSON.stringify(previous)).toBe(frozen);
    expect(previous.totalCents).toBe(101250);
  });
  it("does not revive sample promotions or pet checkout", () => {
    expect(() => computeQuote({...input, property: proposed, promoCode: "DIRECT10"})).toThrow();
    expect(() => computeQuote({...input, property: proposed, pets: 1})).toThrow();
  });
  it("fails closed for unsupported policy or unsafe inclusive arithmetic", () => {
    expect(() => nightlyRateCents({...proposed, inclusiveNightlyAllowanceBps: 301} as unknown as Property, "2027-02-20", {})).toThrow();
    expect(() => nightlyRateCents({...proposed, baseNightlyCents: Number.MAX_SAFE_INTEGER}, "2027-02-20", {})).toThrow();
  });
});
