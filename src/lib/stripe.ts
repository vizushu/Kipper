/** Mode-bound Stripe transport. Credential presence alone never authorizes live operation. */
import Stripe from 'stripe';
import type { PaymentMode, Quote } from './types';
import { paymentEvidence, type PaymentEvidence } from './payment-verification';
import { canFulfillPaymentMode, storedPaymentMode, stripeKeyMode } from './payment-mode';
export interface CreatedPaymentIntent { id: string; clientSecret: string; amountCents: number; status: string }
export type VerifiedPaymentIntent = PaymentEvidence;
function stripeClient(mode: PaymentMode, requireFulfillment = true): Stripe {
  if (process.env.SITE_PREVIEW_MODE === 'true') throw new Error('Payments are unavailable in public preview.');
  if (requireFulfillment && !canFulfillPaymentMode(mode)) throw new Error('Payment mode is not approved or enabled.');
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || stripeKeyMode(key) !== mode) throw new Error('Stripe credential mode does not match the booking.');
  return new Stripe(key);
}
export async function createPaymentIntent(quote: Quote, idempotencyKey: string, bookingId: string): Promise<CreatedPaymentIntent> {
  const mode = storedPaymentMode(quote.paymentMode);
  const stripe = stripeClient(mode);
  const pi = await stripe.paymentIntents.create({
    amount: quote.totalCents, currency: quote.currency.toLowerCase(),
    payment_method_types: ['card'],
    metadata: { booking_id: bookingId, property_id: quote.propertyId, check_in: quote.checkIn, check_out: quote.checkOut, mode },
    description: `Casa Pacifica direct booking ${quote.checkIn} → ${quote.checkOut}`,
  }, { idempotencyKey: `pi_${idempotencyKey}` });
  if (!pi.client_secret) throw new Error('Stripe did not return a client secret for the PaymentIntent.');
  return { id: pi.id, clientSecret: pi.client_secret, amountCents: pi.amount, status: pi.status };
}
export async function verifyPaymentIntent(paymentIntentId: string, mode: PaymentMode = 'test'): Promise<VerifiedPaymentIntent> {
  // Read-only evidence remains available after closure; callers must separately gate fulfillment.
  const pi = await stripeClient(mode, false).paymentIntents.retrieve(paymentIntentId);
  return paymentEvidence(pi);
}
export function isStripeConfigured(mode: PaymentMode = 'test'): boolean {
  return canFulfillPaymentMode(mode) && stripeKeyMode(process.env.STRIPE_SECRET_KEY) === mode;
}
