import { diffNights, isValidDateStr } from './dates';
export const CANCELLATION_POLICY = {
  version: 'firm-2026-10-30',
  timezone: 'America/Los_Angeles' as const,
  checkInLocalTime: '15:00:00',
  fullRefundDays: 30,
  partialRefundDays: 15,
  partialRefundPercent: 50,
  cleaningRefundBeforeArrival: true,
  text: 'Accommodation: 100% refund at least 30 days before check-in; 50% from 15 to fewer than 30 days; no accommodation refund under 15 days. The $180 cleaning fee is fully refundable when cancelled before arrival. Tax adjustments are calculated separately after verification.'
};
/** Preview only. Never calls a payment provider or issues a refund. Cutoffs use LA wall time. */
export function previewCancellation(checkIn: string, cancelledAt: Date, accommodationCents: number, cleaningFeeCents: number, policy = CANCELLATION_POLICY) {
  if (!isValidDateStr(checkIn) || !Number.isFinite(cancelledAt.getTime()) || !Number.isInteger(accommodationCents) || accommodationCents < 0 || !Number.isInteger(cleaningFeeCents) || cleaningFeeCents < 0) throw new Error('Invalid cancellation preview input.');
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:policy.timezone, year:'numeric', month:'2-digit', day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(cancelledAt);
  const get = (type:string) => parts.find(p => p.type === type)!.value;
  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  const localTime = `${get('hour')}:${get('minute')}:${get('second')}`;
  const calendarDays = diffNights(localDate, checkIn);
  const daysBefore = calendarDays - (localTime > policy.checkInLocalTime || (localTime === policy.checkInLocalTime && cancelledAt.getUTCMilliseconds() > 0) ? 1 : 0);
  const beforeArrival = localDate < checkIn || (localDate === checkIn && localTime < policy.checkInLocalTime);
  const accommodationPercent = daysBefore >= policy.fullRefundDays ? 100 : daysBefore >= policy.partialRefundDays ? policy.partialRefundPercent : 0;
  return {policyVersion:policy.version, accommodationPercent, accommodationRefundCents: Math.round(accommodationCents * accommodationPercent / 100), cleaningRefundCents: beforeArrival && policy.cleaningRefundBeforeArrival ? cleaningFeeCents : 0, taxAdjustment: 'manual_review' as const, previewOnly: true as const};
}
