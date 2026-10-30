import { snapshotForStay } from "./accommodation";
/**
 * Server-side pricing engine.
 *
 * ALL prices are computed here, in integer cents (USD), never on the client.
 * The frontend must always call POST /api/quote and render the returned
 * quote — it must never compute totals itself.
 *
 * Pricing rules (Renier's Smart Pricing band; admin-editable via settings):
 * - Base $349/night (34900¢)
 * - Friday & Saturday nights ×1.20
 * - June–August nights ×1.15
 * - Each night clamped to [minNightlyCents, maxNightlyCents] (default $349–$1,030)
 * - Admin rate overrides replace the computed nightly rate for a date
 * - Cleaning fee (current 3BR 18000¢, admin-editable)
 * - Tax (Zone 2 12.75%, admin-editable), applied to
 *   (nightly subtotal − discounts + cleaning)
 * - Pet fee 5000¢/stay when pets > 0
 * - Promo code DIRECT10 = 10% off the nightly subtotal (honors Renier's
 *   promised 10%-off for direct rebookings; promo list is admin-editable)
 * - Min stay 1 night, max 28 nights (admin-editable)
 *
 * All inputs are validated and violations throw BookingError with a code
 * from src/lib/types.ts.
 */

import {
  BookingError,
  type GuestCount,
  type LineItem,
  type NightlyRate,
  type Property,
  type Quote,
} from "./types";
import {
  addDays,
  diffNights,
  eachDate,
  isPastDate,
  isValidDateStr,
  monthInLA,
  weekdayInLA,
} from "./dates";

export interface PromoCode {
  code: string;
  type: "percent";
  /** Whole percent, e.g. 10 = 10% off the nightly subtotal. */
  percent: number;
  description?: string;
}

export interface PricingSettings {
  cleaningFeeCents: number;
  taxRatePct: number;
  minStayNights: number;
  maxStayNights: number;
  promos: PromoCode[];
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  cleaningFeeCents: 18000, // Approved current 3BR cleaning fee
  taxRatePct: 12.75, // Verified Zone 2 TOT; collection-time policy, effective 2025-05-01
  minStayNights: 1,
  maxStayNights: 28,
  promos: [
    {
      code: "DIRECT10",
      type: "percent",
      percent: 10,
      description:
        "10% off the nightly subtotal — honors Renier's promised 10%-off for direct rebookings",
    },
  ],
};

/** Quote validity window. */
export const QUOTE_TTL_MINUTES = 15;

export interface ComputeQuoteInput {
  property: Property;
  settings: PricingSettings;
  /** date (YYYY-MM-DD) -> rate cents, e.g. from adapter.getRateOverrides(). */
  rateOverrides: Record<string, number>;
  checkIn: string;
  checkOut: string;
  guests: GuestCount;
  pets?: number;
  promoCode?: string;
  /** Override for tests. */
  now?: Date;
}

function isWhole(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/** Validate guests against property capacity. Throws GUEST_LIMIT. */
export function validateGuests(guests: GuestCount, property: Property): void {
  const { adults, children, infants } = guests;
  if (!isWhole(adults) || !isWhole(children) || !isWhole(infants)) {
    throw new BookingError("GUEST_LIMIT", "Guest counts must be whole numbers.");
  }
  if (adults < 1) {
    throw new BookingError("GUEST_LIMIT", "At least one adult is required.");
  }
  if (children < 0 || infants < 0) {
    throw new BookingError("GUEST_LIMIT", "Guest counts cannot be negative.");
  }
  // Occupancy includes every person; no infant exemption has been approved.
  const overnight = adults + children + infants;
  if (overnight > property.maxGuests || overnight > property.maxTotalOccupancy) {
    throw new BookingError(
      "GUEST_LIMIT",
      `This home permits at most ${Math.min(property.maxGuests, property.maxTotalOccupancy)} people total, including infants and daytime visitors; you entered ${overnight} staying guests.`
    );
  }
}

/** Validate the stay window. Throws INVALID_DATES / MIN_STAY / MAX_STAY. */
export function validateStayWindow(
  checkIn: string,
  checkOut: string,
  settings: PricingSettings,
  now?: Date
): number {
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut)) {
    throw new BookingError(
      "INVALID_DATES",
      "Dates must be valid YYYY-MM-DD calendar days."
    );
  }
  if (checkOut <= checkIn) {
    throw new BookingError(
      "INVALID_DATES",
      "Checkout must be after check-in."
    );
  }
  if (isPastDate(checkIn, now)) {
    throw new BookingError("INVALID_DATES", "Check-in cannot be in the past.");
  }
  const nights = diffNights(checkIn, checkOut);
  if (nights < settings.minStayNights) {
    throw new BookingError(
      "MIN_STAY",
      `Minimum stay is ${settings.minStayNights} night${settings.minStayNights === 1 ? "" : "s"}.`
    );
  }
  if (nights > settings.maxStayNights) {
    throw new BookingError(
      "MAX_STAY",
      `Maximum stay is ${settings.maxStayNights} nights per reservation.`
    );
  }
  return nights;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Nightly rate for one date: base × weekend factor × seasonal factor,
 * rounded to the cent, then clamped to [min, max]. An admin rate override
 * replaces the computed value (still clamped).
 */
export function nightlyRateCents(
  property: Property,
  date: string,
  rateOverrides: Record<string, number>
): number {
  const override = rateOverrides[date];
  let rate: number;
  if (override != null) {
    rate = override;
  } else {
    const wd = weekdayInLA(date);
    const weekendFactor = wd === 5 || wd === 6 ? 1.2 : 1;
    const seasonalFactor = monthInLA(date) >= 6 && monthInLA(date) <= 8 ? 1.15 : 1;
    rate = Math.round(property.baseNightlyCents * weekendFactor * seasonalFactor);
  }
  return clamp(Math.round(rate), property.minNightlyCents, property.maxNightlyCents);
}

export function findPromo(
  settings: PricingSettings,
  code: string | undefined
): PromoCode | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return settings.promos.find((p) => p.code.toUpperCase() === normalized);
}

export function computeQuote(input: ComputeQuoteInput): Quote {
  const {
    property,
    settings,
    rateOverrides,
    checkIn,
    checkOut,
    guests,
    pets = 0,
    promoCode,
    now = new Date(),
  } = input;

  const nights = validateStayWindow(checkIn, checkOut, settings, now);
  const staySnapshot = snapshotForStay(property, checkIn, checkOut);
  validateGuests(guests, {...property, maxGuests: staySnapshot.maxGuests, maxTotalOccupancy: staySnapshot.maxTotalOccupancy});

  if (!isWhole(pets) || pets < 0) {
    throw new BookingError("GUEST_LIMIT", "Pet count must be a whole number ≥ 0.");
  }
  if (pets > property.petPolicy.maxPets) {
    throw new BookingError(
      "GUEST_LIMIT",
      `Sorry — this home allows at most ${property.petPolicy.maxPets} pet per stay.`
    );
  }

  let promo: PromoCode | undefined;
  if (promoCode) {
    promo = findPromo(settings, promoCode);
    if (!promo) {
      // No dedicated code exists in the fixed BookingError union; INVALID_DATES
      // is the closest "bad input" bucket. Message names the problem clearly.
      throw new BookingError(
        "INVALID_DATES",
        `Promo code "${promoCode.trim()}" is not valid.`
      );
    }
  }

  const nightlyRates: NightlyRate[] = eachDate(checkIn, checkOut).map((date) => ({
    date,
    rateCents: nightlyRateCents(property, date, rateOverrides),
  }));
  const subtotalCents = nightlyRates.reduce((s, n) => s + n.rateCents, 0);

  const discountCents = promo
    ? Math.round((subtotalCents * promo.percent) / 100)
    : 0;

  const cleaningFeeCents = Math.max(0, Math.round(settings.cleaningFeeCents));
  const petFeeCents = pets > 0 ? property.petPolicy.feePerStayCents : 0;

  // Tax base: nightly subtotal − discounts + cleaning (pet fee excluded).
  const taxBaseCents = subtotalCents - discountCents + cleaningFeeCents;
  const taxesCents = Math.max(0, Math.round((taxBaseCents * settings.taxRatePct) / 100));

  const totalCents = subtotalCents - discountCents + cleaningFeeCents + petFeeCents + taxesCents;

  const avgNightly = Math.round(subtotalCents / nights);
  const lineItems: LineItem[] = [
    {
      label: `${nights} night${nights === 1 ? "" : "s"} × avg $${(avgNightly / 100).toFixed(2)}`,
      detail: "Nightly rates vary by date — see nightly breakdown.",
      amountCents: subtotalCents,
    },
  ];
  if (discountCents > 0 && promo) {
    lineItems.push({
      label: `Direct booking discount (${promo.code})`,
      detail: `${promo.percent}% off nightly subtotal`,
      amountCents: -discountCents,
    });
  }
  lineItems.push({ label: "Cleaning fee", amountCents: cleaningFeeCents });
  if (petFeeCents > 0) {
    lineItems.push({
      label: "Pet fee",
      detail: `${pets} pet${pets === 1 ? "" : "s"} · per stay`,
      amountCents: petFeeCents,
    });
  }
  lineItems.push({
    label: `Taxes (${settings.taxRatePct}%)`,
    detail: "Applied to nightly subtotal minus discounts, plus cleaning fee.",
    amountCents: taxesCents,
  });

  const createdAt = now;
  return {
    id: `q_${createdAt.getTime().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    staySnapshot: {...staySnapshot, cleaningFeeCents, taxRatePct: settings.taxRatePct, taxPolicyVersion: property.taxPolicyVersion},
    propertyId: property.id,
    propertySlug: property.slug,
    checkIn,
    checkOut,
    nights,
    guests: { ...guests },
    pets,
    promoCode: promo?.code,
    nightlyRates,
    lineItems,
    subtotalCents,
    discountCents,
    cleaningFeeCents,
    petFeeCents,
    taxesCents,
    totalCents,
    currency: "USD",
    expiresAt: new Date(createdAt.getTime() + QUOTE_TTL_MINUTES * 60_000).toISOString(),
  };
}

/** True when the quote is expired as of `now`. */
export function isQuoteExpired(quote: Quote, now: Date = new Date()): boolean {
  return new Date(quote.expiresAt).getTime() <= now.getTime();
}
