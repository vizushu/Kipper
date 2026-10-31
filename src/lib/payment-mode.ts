import type { PaymentMode } from './types';

/** Configuration is an explicit launch approval contract, not proof that operations were verified. */
export const LIVE_APPROVAL_FLAGS = [
  'LIVE_BOOKING_APPROVED', 'LIVE_PROVIDER_QA_APPROVED', 'LIVE_OPERATIONS_APPROVED', 'LIVE_GUEST_TERMS_APPROVED',
  'INVENTORY_EXCLUSIVE_DIRECT_APPROVED',
] as const;
export function requestedPaymentMode(): PaymentMode | 'closed' {
  const requested = process.env.BOOKING_PAYMENT_MODE;
  if (requested === undefined) return process.env.BOOKING_TEST_MODE === 'true' ? 'test' : 'closed';
  return requested === 'test' || requested === 'live' ? requested : 'closed';
}
export function livePaymentBlockers(): string[] {
  const missing: string[] = LIVE_APPROVAL_FLAGS.filter(flag => process.env[flag] !== 'true');
  // iCal and an unimplemented channel-manager adapter can never certify live inventory.
  if (process.env.CALENDAR_SYNC_ENABLED === 'true' || process.env.CALENDAR_SYNC_REQUIRED === 'true' || process.env.CALENDAR_EXPORT_ENABLED === 'true') missing.push('SHARED_CALENDAR_REVIEW_WORKFLOW_REQUIRED');
  if (process.env.INVENTORY_POLICY !== 'exclusive_direct') missing.push('EXCLUSIVE_DIRECT_INVENTORY_REQUIRED');
  if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) missing.push('LIVE_STRIPE_SECRET_REQUIRED');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_')) missing.push('LIVE_STRIPE_PUBLISHABLE_REQUIRED');
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push('SIGNED_WEBHOOK_CONFIGURATION_REQUIRED');
  return missing;
}
export function getBookingPaymentMode(): PaymentMode | null {
  if (process.env.SITE_PREVIEW_MODE === 'true') return null;
  const mode = requestedPaymentMode();
  if (mode === 'closed' || (mode === 'live' && livePaymentBlockers().length)) return null;
  return mode;
}
/** Missing provenance is historical test data, never upgraded to live by current configuration. */
export function storedPaymentMode(mode?: PaymentMode): PaymentMode {
  if (mode === undefined || mode === 'test') return 'test';
  if (mode === 'live') return 'live';
  throw new Error('Invalid stored payment mode.');
}
export function canFulfillPaymentMode(mode?: PaymentMode): boolean {
  try { return getBookingPaymentMode() === storedPaymentMode(mode); } catch { return false; }
}
export function stripeKeyMode(key: string | undefined): PaymentMode | null {
  return key?.startsWith('sk_test_') ? 'test' : key?.startsWith('sk_live_') ? 'live' : null;
}
