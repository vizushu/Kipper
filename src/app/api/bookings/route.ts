import { getBookingPaymentMode, storedPaymentMode } from "@/lib/payment-mode";
import { bookingSessionCookie } from "@/lib/booking-session";
import { snapshotForStay } from "@/lib/accommodation";
import { createBookingAccessToken, isBookingAccessConfigured } from "@/lib/booking-access";
import { isBookingEnabled, BOOKING_LAUNCH_MESSAGE } from "@/lib/booking-launch";
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
  if (!isBookingEnabled()) return apiError("BOOKING_NOT_OPEN", BOOKING_LAUNCH_MESSAGE, 503);
  if (!isBookingAccessConfigured()) return apiError("BOOKING_NOT_OPEN", "Booking access is not configured.", 503);
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
  if (storedPaymentMode(quote.paymentMode) !== getBookingPaymentMode()) return apiError("QUOTE_EXPIRED", "Payment mode changed. Please request a new quote.", 409);
  const property = getProperty(quote.propertyId);
  if (!property) return notFound("Property not found.");

  try {
    // A quote cannot authorize a configuration that has since been disabled.
    const currentSnapshot = snapshotForStay(property, quote.checkIn, quote.checkOut);
    if (!quote.staySnapshot || quote.staySnapshot.configurationId !== currentSnapshot.configurationId) {
      return bookingErrorResponse(new BookingError("QUOTE_EXPIRED", "Accommodation details changed. Please request a fresh quote."));
    }
    const { booking } = await createBookingForQuote(adapter, quote, guest, idempotencyKey);

    let paymentIntentId: string | undefined;
    // Create only in the immutable quote/booking payment mode, after explicit runtime gates.
    try {
      const pi = await createPaymentIntent(quote, booking.idempotencyKey, booking.id);
      paymentIntentId = pi.id;
      const withPi = await adapter.attachPaymentIntent(booking.id, pi.id);
      if (!withPi) return apiError("PAYMENT_FAILED", "Your booking hold expired or is no longer available. Please request a fresh quote.", 409);
      const accessToken = createBookingAccessToken(withPi.reference);
      const response = json({ booking: guestSafeBooking(withPi), clientSecret: pi.clientSecret, accessToken }, 201);
      response.cookies.set(bookingSessionCookie(accessToken));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (stripeErr) {
      // Booking exists (pending_payment); payment setup failed.
      if (paymentIntentId) await adapter.failPendingBookingPayment(booking.id, paymentIntentId);
      const message =
        stripeErr instanceof Error ? stripeErr.message : "Payment setup failed.";
      return apiError("PAYMENT_FAILED", message, 500);
    }
  } catch (e) {
    if (e instanceof BookingError) return bookingErrorResponse(e);
    throw e;
  }
}
