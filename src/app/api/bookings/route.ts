import { z } from "zod";
import { createBookingForQuote, guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { createPaymentIntent } from "@/lib/stripe";
import { BookingError } from "@/lib/types";
import {
  apiError,
  bookingErrorResponse,
  json,
  notFound,
  parseBody,
} from "../_helpers";

const bookingSchema = z.object({
  quoteId: z.string().min(1),
  guest: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
  }),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, bookingSchema);
  if (!parsed.ok) return parsed.response;
  const { quoteId, guest, idempotencyKey } = parsed.data;

  const adapter = getAdapter();
  const quote = await adapter.getQuote(quoteId);
  if (!quote) {
    return bookingErrorResponse(
      new BookingError(
        "QUOTE_EXPIRED",
        "This price quote expired or was not found (quotes last 15 minutes). Please request a fresh quote."
      )
    );
  }
  const property = getProperty(quote.propertyId);
  if (!property) return notFound("Property not found.");

  try {
    const { booking } = await createBookingForQuote(adapter, quote, guest, idempotencyKey);

    // Create the test-mode PaymentIntent for the booking total.
    try {
      const pi = await createPaymentIntent(quote, booking.idempotencyKey);
      await adapter.updateBooking(booking.id, { stripePaymentIntentId: pi.id });
      const withPi = (await adapter.getBooking(booking.id)) ?? booking;
      return json({ booking: guestSafeBooking(withPi), clientSecret: pi.clientSecret }, 201);
    } catch (stripeErr) {
      // Booking exists (pending_payment); payment setup failed.
      await adapter.updateBooking(booking.id, { paymentStatus: "failed" });
      const message =
        stripeErr instanceof Error ? stripeErr.message : "Payment setup failed.";
      return apiError("PAYMENT_FAILED", message, 500);
    }
  } catch (e) {
    if (e instanceof BookingError) return bookingErrorResponse(e);
    throw e;
  }
}
