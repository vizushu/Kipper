import { storedPaymentMode } from "./payment-mode";
/** Read-only cancellation review. Never imports payment providers or mutates a booking. */
import { previewCancellation } from './cancellation';
import type { AcceptedCancellationTerms, AcceptedPriceBreakdown, Booking, StaySnapshot } from './types';

// Version-specific interpretation, not the mutable current listing or current pricing settings.
const SUPPORTED_VERSION = 'firm-2026-10-30';
const ACCEPTED_POLICY_TEXT = 'Accommodation: 100% refund at least 30 days before check-in; 50% from 15 to fewer than 30 days; no accommodation refund under 15 days. The $180 cleaning fee is fully refundable when cancelled before arrival. Tax adjustments are calculated separately after verification.';
function localCheckIn(time: string): string | undefined {
  const match = /^(1[0-2]|[1-9]):([0-5]\d) (AM|PM)$/.exec(time);
  if (!match) return;
  const hour = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${match[2]}:00`;
}
export function acceptedCancellationTerms(snapshot: StaySnapshot): AcceptedCancellationTerms | undefined {
  const checkInLocalTime = localCheckIn(snapshot.checkInTime);
  if (snapshot.cancellationPolicyVersion !== SUPPORTED_VERSION || snapshot.cancellationPolicy !== ACCEPTED_POLICY_TEXT || snapshot.timezone !== 'America/Los_Angeles' || !checkInLocalTime) return;
  return { version: SUPPORTED_VERSION, timezone: snapshot.timezone, checkInLocalTime,
    fullRefundDays: 30, partialRefundDays: 15, partialRefundPercent: 50, cleaningRefundBeforeArrival: true };
}
function validTerms(snapshot: StaySnapshot, terms: AcceptedCancellationTerms): boolean {
  return snapshot.cancellationPolicyVersion === SUPPORTED_VERSION && snapshot.cancellationPolicy === ACCEPTED_POLICY_TEXT && terms.version === SUPPORTED_VERSION &&
    snapshot.timezone === 'America/Los_Angeles' && terms.timezone === snapshot.timezone &&
    terms.checkInLocalTime === localCheckIn(snapshot.checkInTime) &&
    terms.fullRefundDays === 30 && terms.partialRefundDays === 15 && terms.partialRefundPercent === 50 && terms.cleaningRefundBeforeArrival === true;
}
function validPrices(booking: Booking, price: AcceptedPriceBreakdown): boolean {
  const amounts = [price.accommodationSubtotalCents, price.accommodationDiscountCents, price.accommodationNetCents,
    price.cleaningFeeCents, price.petFeeCents, price.taxesCents, price.totalCents, booking.totalCents];
  return amounts.every(n => Number.isSafeInteger(n) && n >= 0) && price.currency === 'USD' && booking.currency === price.currency &&
    price.accommodationSubtotalCents - price.accommodationDiscountCents === price.accommodationNetCents &&
    price.accommodationNetCents + price.cleaningFeeCents + price.petFeeCents + price.taxesCents === price.totalCents &&
    price.totalCents === booking.totalCents && price.cleaningFeeCents === booking.staySnapshot?.cleaningFeeCents &&
    Array.isArray(booking.lineItems) && booking.lineItems.every(item => !!item && Number.isSafeInteger(item.amountCents)) &&
    booking.lineItems.reduce((sum, item) => sum + item.amountCents, 0) === price.totalCents;
}
export type CancellationReview = {
  previewOnly: true; refundExecuted: false; bookingChanged: false;
  status: 'review_available' | 'manual_review' | 'not_applicable';
  reason: string;
  bookingStatus: Booking['status']; paymentStatus: Booking['paymentStatus'];
  reviewedAt: string;
  effectiveCancellationAt?: string;
  timeBasis?: 'hypothetical_now' | 'recorded_cancellation';
  policyVersion?: string;
  checkInCutoff?: { date: string; localTime: string; timezone: string };
  accommodationPercent?: number; accommodationRefundCents?: number; cleaningRefundCents?: number;
  reviewedSubtotalCents?: number;
  recordedTaxCents?: number; recordedPetFeeCents?: number;
  taxAdjustment: 'manual_review'; petFeeAdjustment: 'manual_review';
  currency: 'USD';
};

export function reviewBookingCancellation(booking: Booking, now = new Date()): CancellationReview {
  const result: CancellationReview = {
    previewOnly: true, refundExecuted: false, bookingChanged: false, status: 'manual_review',
    reason: 'Original accepted terms and amounts need manual verification.', bookingStatus: booking.status, paymentStatus: booking.paymentStatus,
    reviewedAt: Number.isFinite(now.getTime()) ? now.toISOString() : '', taxAdjustment: 'manual_review', petFeeAdjustment: 'manual_review', currency: 'USD',
  };
  if (!Number.isFinite(now.getTime())) return result;
  if (booking.paymentStatus !== 'paid_test' && booking.paymentStatus !== 'paid') return { ...result, status: 'not_applicable', reason: booking.paymentStatus === 'refunded'
    ? 'Payment is already marked refunded. Verify the provider ledger; no further refund is suggested.'
    : 'No settled payment is recorded. Verify payment status before considering any refund.' };
  if ((booking.paymentStatus === 'paid' && storedPaymentMode(booking.paymentMode) !== 'live') || (booking.paymentStatus === 'paid_test' && storedPaymentMode(booking.paymentMode) !== 'test')) return { ...result, reason: 'Payment status and stored mode require manual reconciliation.' };
  if (booking.status !== 'confirmed' && booking.status !== 'cancelled') return { ...result, reason: 'Booking/payment state requires manual reconciliation.' };
  const snapshot = booking.staySnapshot;
  if (!snapshot?.cancellationTerms || !snapshot.priceBreakdown || !validTerms(snapshot, snapshot.cancellationTerms) || !validPrices(booking, snapshot.priceBreakdown)) return result;
  const cancelled = booking.status === 'cancelled';
  const effective = cancelled ? new Date(booking.cancelledAt ?? '') : now;
  const createdAt = new Date(booking.createdAt);
  if (!Number.isFinite(effective.getTime()) || !Number.isFinite(createdAt.getTime()) || effective < createdAt || effective > now) return { ...result, reason: 'Cancellation/review timestamp is missing, invalid, before booking creation or in the future. Do not substitute today for the original cancellation.' };
  try {
    const terms = snapshot.cancellationTerms;
    const price = snapshot.priceBreakdown;
    const preview = previewCancellation(booking.checkIn, effective, price.accommodationNetCents, price.cleaningFeeCents, { ...terms, text: snapshot.cancellationPolicy });
    return { ...result, status: 'review_available', reason: 'Calculation only, not a provider-ledger reconciliation. This review neither cancels the stay nor issues a refund. Tax and pet-fee adjustments require separate review.',
      effectiveCancellationAt: effective.toISOString(), timeBasis: cancelled ? 'recorded_cancellation' : 'hypothetical_now',
      policyVersion: terms.version, checkInCutoff: { date: booking.checkIn, localTime: terms.checkInLocalTime, timezone: terms.timezone },
      accommodationPercent: preview.accommodationPercent, accommodationRefundCents: preview.accommodationRefundCents,
      cleaningRefundCents: preview.cleaningRefundCents, reviewedSubtotalCents: preview.accommodationRefundCents + preview.cleaningRefundCents,
      recordedTaxCents: price.taxesCents, recordedPetFeeCents: price.petFeeCents };
  } catch { return result; }
}
