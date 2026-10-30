/** Payment evidence must belong to the exact reservation; amounts alone are not identity. */
import Stripe from "stripe";
import type { Booking } from "./types";

export interface PaymentEvidence {
  id: string;
  status: Stripe.PaymentIntent.Status;
  amountCents: number;
  amountReceivedCents: number;
  currency: string;
  livemode: boolean;
  metadata: Record<string, string>;
}

export class PaymentVerificationError extends Error {
  constructor(message: string, public readonly httpStatus: number = 400) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export function paymentEvidence(pi: Stripe.PaymentIntent): PaymentEvidence {
  return {
    id: pi.id,
    status: pi.status,
    amountCents: pi.amount,
    amountReceivedCents: pi.amount_received,
    currency: pi.currency,
    livemode: pi.livemode,
    metadata: pi.metadata,
  };
}

/** Also applied to failure events so unrelated payments cannot change a reservation. */
export function assertPaymentBinding(booking: Booking, payment: PaymentEvidence): void {
  if (!booking.stripePaymentIntentId || payment.id !== booking.stripePaymentIntentId) {
    throw new PaymentVerificationError("Payment does not belong to this booking.");
  }
  if (payment.livemode || payment.metadata.mode !== "test") {
    throw new PaymentVerificationError("Only test-mode payments are supported.");
  }
  if (payment.amountCents !== booking.totalCents || payment.currency !== booking.currency.toLowerCase()) {
    throw new PaymentVerificationError("Payment amount or currency does not match the booking.");
  }
  if (payment.metadata.booking_id !== booking.id ||
      payment.metadata.property_id !== booking.propertyId ||
      payment.metadata.check_in !== booking.checkIn ||
      payment.metadata.check_out !== booking.checkOut) {
    throw new PaymentVerificationError("Payment reservation details do not match the booking.");
  }
}

export function assertSuccessfulPayment(booking: Booking, payment: PaymentEvidence): void {
  assertPaymentBinding(booking, payment);
  if (booking.status === "cancelled") {
    throw new PaymentVerificationError("This booking was cancelled.");
  }
  if (payment.status !== "succeeded" || payment.amountReceivedCents !== booking.totalCents) {
    throw new PaymentVerificationError("Payment is not complete for the booking total.");
  }
}

/** Fail closed in every environment. Local development must use signed Stripe CLI events. */
export function verifyTestWebhook(
  rawBody: string,
  signature: string | null,
  key: string | undefined,
  webhookSecret: string | undefined
): Stripe.Event {
  if (!webhookSecret || !key?.startsWith("sk_test_")) {
    throw new PaymentVerificationError("Stripe test webhook is not configured.", 503);
  }
  if (!signature) throw new PaymentVerificationError("Missing stripe-signature.");
  const stripe = new Stripe(key);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new PaymentVerificationError("Invalid webhook signature.");
  }
  if (event.livemode) throw new PaymentVerificationError("Live payment events are not supported.");
  return event;
}
