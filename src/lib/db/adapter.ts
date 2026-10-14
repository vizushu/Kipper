/**
 * DataAdapter — persistence interface for bookings, blocks, rate overrides,
 * settings, idempotency keys, and quotes.
 *
 * Two implementations:
 * - src/lib/db/sqlite.ts   — better-sqlite3, local file ./data/bookings.db (default)
 * - src/lib/db/supabase.ts — Postgres via Supabase REST (DATA_ADAPTER=supabase)
 *
 * Picked with getAdapter() in src/lib/db/index.ts via the DATA_ADAPTER env var.
 * All methods are async so both implementations share one interface.
 *
 * DOUBLE-BOOKING SAFETY: booking creation MUST re-check availability
 * atomically. The interface exposes createBookingIfAvailable(), whose
 * implementations run "SELECT overlapping confirmed/pending_payment bookings
 * and blocks → INSERT" inside a single transaction, so two concurrent
 * requests for the same dates cannot both succeed.
 */

import type {
  BlockedRange,
  Booking,
  BookingGuest,
  BookingStatus,
  GuestCount,
  LineItem,
  PaymentStatus,
  Quote,
  RateOverride,
} from "../types";
import type { PricingSettings } from "../pricing";

/** Partial settings update (admin). */
export interface SettingsPatch {
  cleaningFeeCents?: number;
  taxRatePct?: number;
  minStayNights?: number;
  maxStayNights?: number;
  promos?: PricingSettings["promos"];
}

/** Everything needed to create a booking; id/createdAt are assigned by the adapter. */
export interface NewBookingInput {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: GuestCount;
  pets: number;
  guest: BookingGuest;
  lineItems: LineItem[];
  totalCents: number;
  currency: "USD";
  idempotencyKey: string;
}

export interface ListBookingsFilter {
  propertyId?: string;
  status?: BookingStatus;
}

export interface UpdateBookingPatch {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  stripePaymentIntentId?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  adminNotes?: string;
}

export interface DataAdapter {
  // ---- bookings ---------------------------------------------------------
  /**
   * Atomically: re-check that [checkIn, checkOut) has no overlapping
   * confirmed/pending_payment booking and no overlapping block, then insert
   * as pending_payment. Throws BookingError UNAVAILABLE on conflict,
   * DUPLICATE on idempotency-key collision. The check and insert happen in
   * ONE transaction — callers must not pre-check outside of it.
   */
  createBookingIfAvailable(input: NewBookingInput): Promise<Booking>;
  getBooking(id: string): Promise<Booking | null>;
  getBookingByReference(reference: string): Promise<Booking | null>;
  getBookingByIdempotencyKey(key: string): Promise<Booking | null>;
  getBookingByPaymentIntentId(paymentIntentId: string): Promise<Booking | null>;
  updateBooking(id: string, patch: UpdateBookingPatch): Promise<Booking | null>;
  cancelBooking(id: string): Promise<Booking | null>;
  listBookings(filter?: ListBookingsFilter): Promise<Booking[]>;

  /** Confirmed + pending_payment bookings overlapping [checkIn, checkOut). */
  findOverlappingBookings(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<Booking[]>;

  // ---- blocks -----------------------------------------------------------
  listBlocks(propertyId: string): Promise<BlockedRange[]>;
  createBlock(input: {
    propertyId: string;
    from: string;
    to: string;
    reason: string;
  }): Promise<BlockedRange>;
  deleteBlock(id: string): Promise<boolean>;

  // ---- rate overrides ----------------------------------------------------
  getRateOverrides(
    propertyId: string,
    from: string,
    to: string
  ): Promise<RateOverride[]>;
  upsertRateOverride(
    propertyId: string,
    date: string,
    rateCents: number
  ): Promise<RateOverride>;

  // ---- settings ----------------------------------------------------------
  getSettings(): Promise<PricingSettings>;
  updateSettings(patch: SettingsPatch): Promise<PricingSettings>;

  // ---- quotes (15-minute expiry) ------------------------------------------
  saveQuote(quote: Quote): Promise<void>;
  /** Returns null when missing OR expired (expired rows are cleaned up). */
  getQuote(id: string): Promise<Quote | null>;
  deleteExpiredQuotes(): Promise<number>;

  /** Release resources (no-op for REST adapters). */
  close?(): void;
}
