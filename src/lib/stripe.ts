/**
 * Stripe payments — TEST MODE ONLY.
 *
 * - createPaymentIntent(quote, idempotencyKey, bookingId): creates a test-mode
 *   PaymentIntent for the quote total and returns { id, clientSecret }.
 * - verifyPaymentIntent(id): retrieves the PaymentIntent and returns its
 *   identity, amount, currency, metadata and test-mode evidence.
 *
 * Requires STRIPE_SECRET_KEY. If it is missing (or is a LIVE key), we throw
 * a clear error and refuse to proceed — this module must never touch live
 * keys. Go-live with real payments is a deliberate future step, not an
 * accident.
 */

import Stripe from "stripe";
import type { Quote } from "./types";
import { paymentEvidence, type PaymentEvidence } from "./payment-verification";

export interface CreatedPaymentIntent {
  id: string;
  clientSecret: string;
  amountCents: number;
  status: string;
}

export type VerifiedPaymentIntent = PaymentEvidence;

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe not configured (test mode): set STRIPE_SECRET_KEY to a test secret key (sk_test_…)."
    );
  }
  if (!key.startsWith("sk_test_")) {
    throw new Error(
      "Refusing a non-test Stripe key: this module requires sk_test_ credentials."
    );
  }
  return new Stripe(key);
}

/**
 * Create a test-mode PaymentIntent for a quote. The idempotencyKey is the
 * booking's idempotency key, so Stripe-level retries are safe too.
 */
export async function createPaymentIntent(
  quote: Quote,
  idempotencyKey: string,
  bookingId: string
): Promise<CreatedPaymentIntent> {
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.create(
    {
      amount: quote.totalCents,
      currency: quote.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        booking_id: bookingId,
        property_id: quote.propertyId,
        check_in: quote.checkIn,
        check_out: quote.checkOut,
        mode: "test",
      },
      description: `Casa Pacifica direct booking ${quote.checkIn} → ${quote.checkOut}`,
    },
    { idempotencyKey: `pi_${idempotencyKey}` }
  );
  if (!pi.client_secret) {
    throw new Error("Stripe did not return a client secret for the PaymentIntent.");
  }
  return {
    id: pi.id,
    clientSecret: pi.client_secret,
    amountCents: pi.amount,
    status: pi.status,
  };
}

/** Retrieve a PaymentIntent and report its current status. Never charges. */
export async function verifyPaymentIntent(
  paymentIntentId: string
): Promise<VerifiedPaymentIntent> {
  const stripe = stripeClient();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentEvidence(pi);
}

/** True when Stripe test mode is configured (safe to call at startup). */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return !!key?.startsWith("sk_test_");
}
