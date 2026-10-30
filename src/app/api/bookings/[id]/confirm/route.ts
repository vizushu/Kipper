import { isPublicPreview } from "@/lib/booking-launch";
import { z } from "zod";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/email";
import { getProperty } from "@/lib/property";
import { verifyPaymentIntent } from "@/lib/stripe";
import { assertSuccessfulPayment } from "@/lib/payment-verification";
import {
  apiError,
  json,
  notFound,
  parseBody,
} from "../../../_helpers";

const confirmSchema = z.object({
  paymentIntentId: z.string().trim().min(1).max(128),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (isPublicPreview()) return apiError("BOOKING_NOT_OPEN", "Payments are disabled in this preview.", 503);
  const { id } = await ctx.params;
  const parsed = await parseBody(req, confirmSchema);
  if (!parsed.ok) return parsed.response;

  const adapter = getAdapter();
  const booking = await adapter.getBooking(id);
  if (!booking) return notFound("Booking not found.");

  // Reject another reservation's payment before even returning an idempotent response.
  if (!booking.stripePaymentIntentId || parsed.data.paymentIntentId !== booking.stripePaymentIntentId) {
    return apiError("PAYMENT_FAILED", "Payment does not belong to this booking.", 400);
  }
  if (booking.status === "cancelled") {
    return apiError("PAYMENT_FAILED", "This booking was cancelled.", 400);
  }

  let verified;
  try {
    verified = await verifyPaymentIntent(parsed.data.paymentIntentId);
  } catch (e) {
    return apiError(
      "PAYMENT_FAILED",
      e instanceof Error ? e.message : "Could not verify the payment.",
      502
    );
  }

  try {
    assertSuccessfulPayment(booking, verified);
  } catch (error) {
    // Invalid or incomplete evidence must not poison a valid pending payment.
    return apiError("PAYMENT_FAILED", error instanceof Error ? error.message : "Payment verification failed.", 400);
  }
  const result = await adapter.confirmBookingPayment(booking.id, verified.id, new Date().toISOString());
  if (!result) return apiError("PAYMENT_FAILED", "This booking hold expired, was cancelled, or is no longer available. Contact Kipper with your payment receipt; do not pay again.", 409);
  const { booking: confirmed, transitioned } = result;

  // Emails never fail the booking — sendBookingConfirmation/Notification
  // log and continue internally.
  const property = getProperty(confirmed.propertyId);
  if (property && transitioned) {
    await sendBookingConfirmation(confirmed, property);
    await sendHostNotification(confirmed, property);
  }

  return json({ booking: guestSafeBooking(confirmed) });
}
