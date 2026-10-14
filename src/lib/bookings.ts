/**
 * Booking orchestration shared by the API routes.
 *
 * createBookingForQuote():
 *   1. Rejects expired/missing quotes (QUOTE_EXPIRED).
 *   2. Idempotency: if a booking already exists for the idempotency key,
 *      returns it instead of creating a duplicate.
 *   3. Delegates to adapter.createBookingIfAvailable(), which re-checks
 *      availability atomically (overlap check + INSERT in one transaction).
 *   4. Maps a DUPLICATE race (two requests, same key) to the existing
 *      booking instead of an error.
 */

import {
  BookingError,
  type Booking,
  type BookingGuest,
  type Quote,
} from "./types";
import { isQuoteExpired } from "./pricing";
import type { DataAdapter, NewBookingInput } from "./db/adapter";

/** Fields safe to expose to the guest (no Stripe ids, idempotency keys, admin notes). */
export function guestSafeBooking(booking: Booking) {
  const {
    stripePaymentIntentId: _pi,
    idempotencyKey: _key,
    adminNotes: _notes,
    ...safe
  } = booking;
  return safe;
}

export async function createBookingForQuote(
  adapter: DataAdapter,
  quote: Quote,
  guest: BookingGuest,
  idempotencyKey: string
): Promise<{ booking: Booking; duplicate: boolean }> {
  if (isQuoteExpired(quote)) {
    throw new BookingError(
      "QUOTE_EXPIRED",
      "This price quote expired (quotes last 15 minutes). Please request a fresh quote."
    );
  }

  const existing = await adapter.getBookingByIdempotencyKey(idempotencyKey);
  if (existing) return { booking: existing, duplicate: true };

  const input: NewBookingInput = {
    propertyId: quote.propertyId,
    checkIn: quote.checkIn,
    checkOut: quote.checkOut,
    nights: quote.nights,
    guests: quote.guests,
    pets: quote.pets,
    guest,
    lineItems: quote.lineItems,
    totalCents: quote.totalCents,
    currency: quote.currency,
    idempotencyKey,
  };

  try {
    const booking = await adapter.createBookingIfAvailable(input);
    return { booking, duplicate: false };
  } catch (err) {
    if (err instanceof BookingError && err.code === "DUPLICATE") {
      // Lost a race with an identical request — return the winner.
      const winner = await adapter.getBookingByIdempotencyKey(idempotencyKey);
      if (winner) return { booking: winner, duplicate: true };
    }
    throw err;
  }
}
