import { isPublicPreview } from "@/lib/booking-launch";
import Stripe from "stripe";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { tryProcessOutbox } from "@/lib/outbox";
import {
  assertPaymentBinding,
  assertSuccessfulPayment,
  paymentEvidence,
  PaymentVerificationError,
  verifyTestWebhook,
} from "@/lib/payment-verification";
import { json } from "../../_helpers";

/** Signed TEST MODE events only, including local development. Never revive cancelled bookings. */
export async function POST(req: Request) {
  if (isPublicPreview()) return json({error:"Payments are disabled in this preview."},503);
  let event: Stripe.Event;
  try {
    event = verifyTestWebhook(
      await req.text(),
      req.headers.get("stripe-signature"),
      process.env.STRIPE_SECRET_KEY,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid webhook." },
      error instanceof PaymentVerificationError ? error.httpStatus : 400);
  }

  if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") {
    return json({ received: true, ignored: event.type });
  }

  const adapter = getAdapter();
  const pi = event.data.object as Stripe.PaymentIntent;
  const booking = await adapter.getBookingByPaymentIntentId(pi.id);
  if (!booking) return json({ received: true });
  try {
    assertPaymentBinding(booking, paymentEvidence(pi));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid payment evidence." }, 400);
  }

  // Late events must never reopen cancelled inventory or downgrade a confirmed booking.
  if (booking.status === "cancelled" || booking.status === "confirmed") {
    if (booking.status === "confirmed") await tryProcessOutbox(adapter);
    return json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    await adapter.failPendingBookingPayment(booking.id, pi.id);
    return json({ received: true });
  }

  try {
    assertSuccessfulPayment(booking, paymentEvidence(pi));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid payment evidence." }, 400);
  }
  const result = await adapter.confirmBookingPayment(booking.id, pi.id, new Date().toISOString());
  if (!result) return json({ error: "Booking hold expired, was cancelled, or conflicts with inventory. Manual payment review required." }, 409);
  const { booking: confirmed } = result;
  await tryProcessOutbox(adapter);
  return json({ received: true, booking: guestSafeBooking(confirmed) });
}
