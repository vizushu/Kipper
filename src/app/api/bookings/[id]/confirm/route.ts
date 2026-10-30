import { recordVerifiedPaymentException } from "@/lib/payment-exception-service";
import { canFulfillPaymentMode, storedPaymentMode } from "@/lib/payment-mode";
import { isPublicPreview } from "@/lib/booking-launch";
import { z } from "zod";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { tryProcessOutbox } from "@/lib/outbox";
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

  let verified;
  try {
    verified = await verifyPaymentIntent(parsed.data.paymentIntentId, storedPaymentMode(booking.paymentMode));
  } catch (e) {
    return apiError(
      "PAYMENT_FAILED",
      e instanceof Error ? e.message : "Could not verify the payment.",
      502
    );
  }

  const recordReview = async (reason: Parameters<typeof recordVerifiedPaymentException>[3]) => {
    if (verified.status === 'succeeded' && verified.amountReceivedCents > 0) {
      try { await recordVerifiedPaymentException(adapter, verified, `confirm:${verified.id}`, reason, booking); }
      catch { return apiError('PAYMENT_REVIEW_UNAVAILABLE', 'Payment review could not be recorded. Do not pay again; contact the booking support contact.', 503); }
    }
    return apiError('PAYMENT_REVIEW_REQUIRED', 'This payment requires manual review and is not a confirmed booking. Do not pay again.', 409);
  };
  if (booking.status === 'cancelled') return recordReview('cancelled_booking');
  if (booking.status !== 'confirmed' && !canFulfillPaymentMode(booking.paymentMode)) return recordReview('launch_gate_closed');
  try {
    assertSuccessfulPayment(booking, verified);
  } catch (error) {
    // Invalid or incomplete evidence must not poison a valid pending payment.
    if (verified.status === "succeeded" && verified.amountReceivedCents > 0) return recordReview("binding_mismatch");
    return apiError("PAYMENT_FAILED", error instanceof Error ? error.message : "Payment verification failed.", 400);
  }
  const result = await adapter.confirmBookingPayment(booking.id, verified.id, new Date().toISOString());
  if (!result) return recordReview("expired_or_conflicting_hold");
  const { booking: confirmed } = result;

  // Emails never fail the booking — sendBookingConfirmation/Notification
  // log and continue internally.
  if (canFulfillPaymentMode(booking.paymentMode)) await tryProcessOutbox(adapter);

  return json({ booking: guestSafeBooking(confirmed) });
}
