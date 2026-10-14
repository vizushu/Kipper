import { z } from "zod";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/email";
import { getProperty } from "@/lib/property";
import { verifyPaymentIntent } from "@/lib/stripe";
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
  const { id } = await ctx.params;
  const parsed = await parseBody(req, confirmSchema);
  if (!parsed.ok) return parsed.response;

  const adapter = getAdapter();
  const booking = await adapter.getBooking(id);
  if (!booking) return notFound("Booking not found.");

  // Idempotent: confirming an already-confirmed booking just returns it.
  if (booking.status === "confirmed") {
    return json({ booking: guestSafeBooking(booking) });
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

  if (verified.status !== "succeeded") {
    await adapter.updateBooking(booking.id, { paymentStatus: "failed" });
    return apiError(
      "PAYMENT_FAILED",
      `Payment is not complete (Stripe status: ${verified.status}).`,
      400
    );
  }
  if (verified.amountCents !== booking.totalCents) {
    await adapter.updateBooking(booking.id, { paymentStatus: "failed" });
    return apiError(
      "PAYMENT_FAILED",
      "Paid amount does not match the booking total.",
      400
    );
  }

  const confirmed =
    (await adapter.updateBooking(booking.id, {
      status: "confirmed",
      paymentStatus: "paid_test",
      stripePaymentIntentId: verified.id,
      confirmedAt: new Date().toISOString(),
    })) ?? booking;

  // Emails never fail the booking — sendBookingConfirmation/Notification
  // log and continue internally.
  const property = getProperty(confirmed.propertyId);
  if (property) {
    await sendBookingConfirmation(confirmed, property);
    await sendHostNotification(confirmed, property);
  }

  return json({ booking: guestSafeBooking(confirmed) });
}
