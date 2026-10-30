/**
 * Shared domain contract for the Casa Pacifica direct-booking site.
 *
 * This file is the single source of truth for shapes exchanged between
 * the data/pricing layer (src/lib) and the Next.js UI (src/app, src/components).
 * Do NOT change these shapes without updating docs/API.md and all consumers.
 *
 * Conventions:
 * - Money is ALWAYS integer cents (USD). Never floats.
 * - Dates are ISO `YYYY-MM-DD` strings in America/Los_Angeles.
 * - A stay is [checkIn, checkOut): the checkout day is not charged.
 */

export type Currency = "USD";

export interface Photo {
  src: string; // e.g. /photos/casa-pacifica-01.jpg
  alt: string;
  caption?: string;
  room?: string;
}

export interface AmenityGroup {
  category: string;
  items: string[];
}

export interface Faq {
  q: string;
  a: string;
}

export interface BedLayout {
  room: string;
  bed: string;
}

export interface PetPolicy {
  allowed: boolean;
  feePerStayCents: number;
  maxPets: number;
}

export interface AccommodationConfiguration {
  id: string;
  label: string;
  effectiveFrom: string;
  effectiveTo?: string;
  bedrooms: number;
  maxGuests?: number;
  maxTotalOccupancy?: number;
  checkoutApproved: boolean;
}

export interface AcceptedCancellationTerms {
  version: string;
  timezone: 'America/Los_Angeles';
  checkInLocalTime: string;
  fullRefundDays: number;
  partialRefundDays: number;
  partialRefundPercent: number;
  cleaningRefundBeforeArrival: boolean;
}
export interface AcceptedPriceBreakdown {
  accommodationSubtotalCents: number;
  accommodationDiscountCents: number;
  accommodationNetCents: number;
  cleaningFeeCents: number;
  petFeeCents: number;
  taxesCents: number;
  totalCents: number;
  currency: Currency;
}
export interface StaySnapshot {
  /** Immutable accepted calculation inputs; absent on legacy bookings. */
  cancellationTerms?: AcceptedCancellationTerms;
  priceBreakdown?: AcceptedPriceBreakdown;
  cleaningFeeCents?: number;
  taxRatePct?: number;
  taxPolicyVersion?: string;
  configurationId: string;
  label: string;
  bedrooms: number;
  maxGuests: number;
  maxTotalOccupancy: number;
  propertyName: string;
  timezone: 'America/Los_Angeles';
  checkInTime: string;
  checkOutTime: string;
  houseRules: string[];
  cancellationPolicy: string;
  cancellationPolicyVersion?: string;
}

export interface Property {
  configurations?: AccommodationConfiguration[];
  taxPolicyVersion?: string;
  license?: string;
  hostName?: string;
  id: string;
  slug: string;
  name: string;
  brandLine: string; // "Casa Pacifica · San Diego"
  tagline: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  maxGuests: number; // overnight
  maxTotalOccupancy: number; // incl. daytime visitors
  bedrooms: number;
  beds?: number; // Omitted until sleeping arrangements are confirmed.
  bathrooms: number;
  bedLayout: BedLayout[];
  description: string;
  guestAccess: string;
  highlights: { title: string; body: string }[];
  amenities: AmenityGroup[];
  houseRules: string[];
  checkInTime: string; // "3:00 PM"
  checkOutTime: string; // "11:00 AM"
  checkInMethod: string;
  quietHours: string;
  cancellationPolicy: string;
  cancellationPolicyVersion?: string;
  petPolicy: PetPolicy;
  photos: Photo[];
  faqs: Faq[];
  safetyDevices: string[];
  // Pricing configuration (defaults; admin-editable)
  baseNightlyCents: number;
  minNightlyCents: number;
  maxNightlyCents: number;
  cleaningFeeCents: number; // SAMPLE default until Renier confirms
  taxRatePct: number; // SAMPLE default until Renier confirms
  minStayNights: number;
  maxStayNights: number;
}

export interface PropertySummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  coverPhoto: Photo;
  amenityTags: string[];
}

export interface GuestCount {
  adults: number;
  children: number;
  infants: number;
}

export interface AvailabilityDay {
  date: string; // YYYY-MM-DD
  available: boolean;
  nightlyRateCents: number;
  minStayNights: number;
  blockedReason?: "booked" | "blocked" | "past";
}

export interface NightlyRate {
  date: string;
  rateCents: number;
}

export interface LineItem {
  label: string;
  detail?: string;
  amountCents: number; // negative for discounts
}

export interface Quote {
  paymentMode?: PaymentMode; // Missing only on historical test quotes.
  staySnapshot?: StaySnapshot;
  id: string;
  propertyId: string;
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: GuestCount;
  pets: number;
  promoCode?: string;
  nightlyRates: NightlyRate[];
  lineItems: LineItem[];
  subtotalCents: number;
  discountCents: number;
  cleaningFeeCents: number;
  petFeeCents: number;
  taxesCents: number;
  totalCents: number;
  currency: Currency;
  expiresAt: string; // ISO timestamp
}

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled";
export type PaymentMode = "test" | "live";
export type PaymentStatus = "unpaid" | "paid_test" | "paid" | "failed" | "refunded";

export interface BookingGuest {
  name: string;
  email: string;
  phone?: string;
}

export interface Booking {
  paymentMode?: PaymentMode; // Persisted provenance; historical records default to test.
  holdExpiresAt?: string;
  staySnapshot?: StaySnapshot;
  id: string;
  reference: string; // guest-facing, e.g. "CP-7K2Q9A"
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: GuestCount;
  pets: number;
  guest: BookingGuest;
  lineItems: LineItem[];
  totalCents: number;
  currency: Currency;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string;
  idempotencyKey: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  adminNotes?: string;
}

export interface BlockedRange {
  id: string;
  propertyId: string;
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD exclusive
  reason: string;
}

export interface RateOverride {
  id: string;
  propertyId: string;
  date: string; // YYYY-MM-DD
  rateCents: number;
}

/** Error thrown for guest-facing booking problems (invalid dates, unavailable, etc.) */
export class BookingError extends Error {
  code:
    | "INVALID_DATES"
    | "UNAVAILABLE"
    | "GUEST_LIMIT"
    | "MIN_STAY"
    | "MAX_STAY"
    | "QUOTE_EXPIRED"
    | "DUPLICATE"
    | "PAYMENT_FAILED";
  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Analytics events (stubbed — wire to a provider later). */
export type AnalyticsEvent =
  | "search"
  | "property_view"
  | "checkout_initiated"
  | "payment_attempted"
  | "booking_completed";

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
