import Stripe from "stripe";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/email";
import { getProperty } from "@/lib/property";
import { json } from "../../_helpers";

/**
 * Stripe webhook (TEST MODE).
 *
 * - If STRIPE_WEBHOOK_SECRET is set, the signature is verified.
 * - Otherwise the payload is accepted in dev with a warning log
 *   (documented; set the secret before any real traffic).
 *
 * Handles payment_intent.succeeded → confirm booking + emails,
 *         payment_intent.payment_failed → mark payment failed.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return json({ error: "Missing stripe-signature." }, 400);
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith("sk_live")) {
      return json({ error: "Stripe not configured (test mode)." }, 500);
    }
    const stripe = new Stripe(key);
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Invalid webhook signature." },
        400
      );
    }
  } else {
    console.warn(
      "[webhook] STRIPE_WEBHOOK_SECRET not set — accepting unverified payload (dev only)."
    );
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return json({ error: "Invalid JSON payload." }, 400);
    }
  }

  const adapter = getAdapter();

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const booking = await adapter.getBookingByPaymentIntentId(pi.id);
    if (booking && booking.status !== "confirmed") {
      const confirmed =
        (await adapter.updateBooking(booking.id, {
          status: "confirmed",
          paymentStatus: "paid_test",
          stripePaymentIntentId: pi.id,
          confirmedAt: new Date().toISOString(),
        })) ?? booking;
      const property = getProperty(confirmed.propertyId);
      if (property) {
        await sendBookingConfirmation(confirmed, property);
        await sendHostNotification(confirmed, property);
      }
      return json({ received: true, booking: guestSafeBooking(confirmed) });
    }
    return json({ received: true });
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const booking = await adapter.getBookingByPaymentIntentId(pi.id);
    if (booking && booking.status !== "confirmed") {
      await adapter.updateBooking(booking.id, { paymentStatus: "failed" });
    }
    return json({ received: true });
  }

  return json({ received: true, ignored: event.type });
}
