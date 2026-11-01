import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { computeQuote, DEFAULT_PRICING_SETTINGS } from '../src/lib/pricing';
import { getProperty } from '../src/lib/property';
import { acceptedCancellationTerms, reviewBookingCancellation } from '../src/lib/cancellation-review';
import { CANCELLATION_POLICY, ACCEPTED_CANCELLATION_TEXTS } from '../src/lib/cancellation';
import type { Booking } from '../src/lib/types';
import CancellationReview from '../src/app/admin/(guarded)/CancellationReview';
import { GET } from '../src/app/api/admin/bookings/[id]/cancellation-review/route';
const db = vi.hoisted(() => ({ getBooking: vi.fn(), cancelBooking: vi.fn(), updateBooking: vi.fn() }));
vi.mock('../src/lib/db', () => ({ getAdapter: () => db }));
function fixture(legacy = true): Booking {
  const q = computeQuote({ property: {...getProperty('casa-pacifica')!,cancellationPolicyVersion: legacy ? 'firm-2026-10-30' : CANCELLATION_POLICY.version,cancellationPolicy: legacy ? ACCEPTED_CANCELLATION_TEXTS['firm-2026-10-30'] : CANCELLATION_POLICY.text,pricingMode:'legacy_sample',baseNightlyCents:34900,minNightlyCents:34900,maxNightlyCents:103000,petPolicy:{allowed:true,feePerStayCents:5000,maxPets:1}}, settings: {...DEFAULT_PRICING_SETTINGS,cleaningFeeCents:legacy ? 18000 : 0,promos:[{code:'DIRECT10',type:'percent',percent:10}]}, rateOverrides: {},
    checkIn: '2027-02-20', checkOut: '2027-02-22', guests: { adults: 2, children: 0, infants: 0 }, pets: 1, promoCode: 'DIRECT10', now: new Date('2026-10-30T12:00:00Z') });
  return { id: 'synthetic-review', reference: 'CP-SYNTHETIC', propertyId: q.propertyId, checkIn: q.checkIn, checkOut: q.checkOut, nights: q.nights,
    guests: q.guests, pets: q.pets, guest: { name: 'Synthetic', email: 'synthetic@example.test' }, lineItems: q.lineItems, totalCents: q.totalCents,
    currency: q.currency, staySnapshot: q.staySnapshot, status: 'confirmed', paymentStatus: 'paid_test', idempotencyKey: 'synthetic', createdAt: '2026-10-30T12:00:00Z' };
}
const at = (date: string) => new Date(date);
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('SITE_PREVIEW_MODE', 'false'); vi.stubEnv('ADMIN_SECRET', 'synthetic-admin'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('accepted cancellation review', () => {
  it('snapshots structured accepted prices including discounts and a versioned local cutoff', () => {
    const b = fixture(), s = b.staySnapshot!, p = s.priceBreakdown!;
    expect(s.cancellationTerms).toMatchObject({ version: 'firm-2026-10-30', timezone: 'America/Los_Angeles', checkInLocalTime: '15:00:00', fullRefundDays: 30, partialRefundDays: 15 });
    expect(p.accommodationNetCents).toBe(p.accommodationSubtotalCents - p.accommodationDiscountCents);
    expect(p.accommodationDiscountCents).toBeGreaterThan(0); expect(p.cleaningFeeCents).toBe(18000); expect(p.totalCents).toBe(b.totalCents);
  });
  it.each([
    ['2027-01-21T23:00:00.000Z',100], ['2027-01-21T23:00:00.001Z',50],
    ['2027-02-05T23:00:00.000Z',50], ['2027-02-05T23:00:00.001Z',0],
  ])('uses exact local boundary %s at %s percent', (time, percentage) => {
    const b = fixture(), review = reviewBookingCancellation(b, at(time));
    expect(review.status).toBe('review_available'); expect(review.accommodationPercent).toBe(percentage);
    expect(review.accommodationRefundCents).toBe(Math.round(b.staySnapshot!.priceBreakdown!.accommodationNetCents * percentage / 100));
    expect(review).toMatchObject({ cleaningRefundCents: 18000, previewOnly: true, refundExecuted: false, bookingChanged: false, taxAdjustment: 'manual_review', petFeeAdjustment: 'manual_review' });
    expect(review.reviewedSubtotalCents).toBe(review.accommodationRefundCents! + 18000);
  });
  it('uses recorded cancellation time rather than review time for an already-cancelled booking', () => {
    const b = fixture(); b.status = 'cancelled'; b.cancelledAt = '2027-01-21T23:00:00Z';
    expect(reviewBookingCancellation(b, at('2027-02-20T23:00:00Z'))).toMatchObject({ accommodationPercent: 100, cleaningRefundCents: 18000, timeBasis: 'recorded_cancellation', effectiveCancellationAt: '2027-01-21T23:00:00.000Z' });
  });
  it('does not substitute review time for missing or invalid cancellation records', () => {
    for (const timestamp of [undefined, 'invalid', '2026-01-01T00:00:00Z', '2028-01-01T00:00:00Z']) {
      const b = fixture(); b.status = 'cancelled'; b.cancelledAt = timestamp;
      const review = reviewBookingCancellation(b, at('2027-02-01T12:00:00Z')); expect(review.status).toBe('manual_review'); expect(review.reviewedSubtotalCents).toBeUndefined();
    }
  });
  it('returns cleaning before arrival, not at arrival; retains tax and pet amounts for separate review', () => {
    const b = fixture(); expect(reviewBookingCancellation(b, at('2027-02-20T22:59:59Z')).cleaningRefundCents).toBe(18000);
    const review = reviewBookingCancellation(b, at('2027-02-20T23:00:00Z'));
    expect(review.cleaningRefundCents).toBe(0); expect(review.recordedPetFeeCents).toBe(5000); expect(review.recordedTaxCents).toBe(b.staySnapshot!.priceBreakdown!.taxesCents);
  });
  it('retains local-day policy through DST and honors the accepted check-in time', () => {
    const b = fixture(); b.checkIn = '2027-03-20'; b.staySnapshot!.checkInTime = '4:00 PM'; b.staySnapshot!.cancellationTerms!.checkInLocalTime = '16:00:00';
    expect(reviewBookingCancellation(b, at('2027-02-19T00:00:00Z')).accommodationPercent).toBe(100);
    expect(reviewBookingCancellation(b, at('2027-02-19T00:00:00.001Z')).accommodationPercent).toBe(50);
  });
  it('fails closed for legacy rows, unknown versions and inconsistent accepted money', () => {
    const cases: ((b: Booking) => void)[] = [
      b => { delete b.staySnapshot; }, b => { delete b.staySnapshot!.priceBreakdown; }, b => { delete b.staySnapshot!.cancellationTerms; },
      b => { b.staySnapshot!.cancellationPolicy = 'Different accepted terms'; }, b => { b.staySnapshot!.cancellationTerms!.version = 'unknown'; }, b => { b.staySnapshot!.cancellationPolicyVersion = 'unknown'; },
      b => { b.staySnapshot!.cancellationTerms!.partialRefundPercent = 75; }, b => { b.staySnapshot!.checkInTime = 'unknown'; },
      b => { b.staySnapshot!.priceBreakdown!.accommodationDiscountCents++; }, b => { b.staySnapshot!.priceBreakdown!.taxesCents++; },
      b => { b.staySnapshot!.priceBreakdown!.totalCents++; }, b => { b.staySnapshot!.cleaningFeeCents = 0; },
      b => { b.staySnapshot!.priceBreakdown!.cleaningFeeCents = 0.5; }, b => { b.lineItems[0].amountCents++; },
    ];
    for (const mutate of cases) { const b = fixture(); mutate(b); const review = reviewBookingCancellation(b, at('2027-01-01T00:00:00Z')); expect(review.status).toBe('manual_review'); expect(review.reviewedSubtotalCents).toBeUndefined(); }
  });
  it.each(['unpaid','failed','refunded'] as const)('does not suggest a further refund for %s payment state', paymentStatus => {
    const b = fixture(); b.paymentStatus = paymentStatus; const review = reviewBookingCancellation(b, at('2027-01-01T00:00:00Z'));
    expect(review.status).toBe('not_applicable'); expect(review.reviewedSubtotalCents).toBeUndefined(); expect(review.refundExecuted).toBe(false);
  });
  it('does not mutate booking data or consult the current global cancellation defaults', () => {
    const b = fixture(), before = JSON.stringify(b); const old = CANCELLATION_POLICY.partialRefundPercent;
    try { CANCELLATION_POLICY.partialRefundPercent = 80; expect(reviewBookingCancellation(b, at('2027-02-01T00:00:00Z')).accommodationPercent).toBe(50); }
    finally { CANCELLATION_POLICY.partialRefundPercent = old; }
    expect(JSON.stringify(b)).toBe(before);
  });
  it('will not manufacture terms for an unknown accepted version or unknown check-in time', () => {
    const s = fixture().staySnapshot!; s.cancellationPolicyVersion = 'other'; expect(acceptedCancellationTerms(s)).toBeUndefined();
    s.cancellationPolicyVersion = 'firm-2026-10-30'; s.checkInTime = 'TBD'; expect(acceptedCancellationTerms(s)).toBeUndefined();
  });
});
describe('read-only admin review boundary', () => {
  const request = () => new NextRequest('https://example.test/api/admin/bookings/synthetic-review/cancellation-review?at=2020-01-01', { headers: { 'x-admin-secret': 'synthetic-admin' } });
  it('requires admin and denies public preview even with an admin secret', async () => {
    vi.stubEnv('SITE_PREVIEW_MODE','true'); expect((await GET(request(), { params: Promise.resolve({ id:'synthetic-review' }) })).status).toBe(401); expect(db.getBooking).not.toHaveBeenCalled();
    vi.stubEnv('SITE_PREVIEW_MODE','false'); vi.stubEnv('ADMIN_SECRET','different'); expect((await GET(request(), { params: Promise.resolve({ id:'synthetic-review' }) })).status).toBe(401);
  });
  it('returns a private nonmutating review at server time, no provider requests or guest data', async () => {
    db.getBooking.mockResolvedValue(fixture()); const network = vi.spyOn(globalThis,'fetch');
    const response = await GET(request(), { params: Promise.resolve({ id:'synthetic-review' }) }); const data = await response.json();
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(data.review).toMatchObject({ previewOnly:true, refundExecuted:false, bookingChanged:false, timeBasis:'hypothetical_now' });
    expect(data.review.effectiveCancellationAt).not.toContain('2020'); expect(JSON.stringify(data)).not.toContain('synthetic@example.test');
    expect(db.cancelBooking).not.toHaveBeenCalled(); expect(db.updateBooking).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  });
  it('returns not found without inventing a booking or amount', async()=>{db.getBooking.mockResolvedValue(null);expect((await GET(request(),{params:Promise.resolve({id:'missing'})})).status).toBe(404);});
  it('renders a clearly read-only review action, no cancel/refund form',()=>{
    const html=renderToStaticMarkup(<CancellationReview bookingId="synthetic-review"/>);expect(html).toContain('Review cancellation (no action)');expect(html).not.toContain('<form');expect(html).not.toContain('Issue refund');
  });
});

describe('new waived cleaning contracts retain historical refund interpretation', () => {
  it.each([
    ['2027-01-21T23:00:00.000Z',100], ['2027-01-21T23:00:00.001Z',50],
    ['2027-02-05T23:00:00.000Z',50], ['2027-02-05T23:00:00.001Z',0],
    ['2027-02-20T22:59:59Z',0], ['2027-02-20T23:00:00Z',0],
  ])('new $0 contract at %s preserves accommodation %s without fictional cleaning refund',(timestamp,percentage)=>{
    const booking=fixture(false), before=JSON.stringify(booking);
    const review=reviewBookingCancellation(booking,at(timestamp));
    expect(booking.staySnapshot!.cancellationTerms!.version).toBe('firm-cleaning-waived-2026-11-01');
    expect(booking.staySnapshot!.priceBreakdown!.cleaningFeeCents).toBe(0);
    expect(review).toMatchObject({status:'review_available',accommodationPercent:percentage,cleaningRefundCents:0,taxAdjustment:'manual_review',refundExecuted:false,bookingChanged:false});
    expect(review.reviewedSubtotalCents).toBe(review.accommodationRefundCents);
    expect(JSON.stringify(booking)).toBe(before);
  });
  it('does not reinterpret historical $180 contracts under the new current policy',()=>{
    expect(CANCELLATION_POLICY.text).toContain('$0 charged');
    const old=fixture(), current=fixture(false);
    expect(reviewBookingCancellation(old,at('2027-02-01T12:00:00Z'))).toMatchObject({policyVersion:'firm-2026-10-30',cleaningRefundCents:18000});
    expect(reviewBookingCancellation(current,at('2027-02-01T12:00:00Z'))).toMatchObject({policyVersion:'firm-cleaning-waived-2026-11-01',cleaningRefundCents:0});
  });
  it('requires manual review for charged cleaning paired with waived policy text',()=>{
    const b=fixture();
    b.staySnapshot!.cancellationPolicyVersion=CANCELLATION_POLICY.version;
    b.staySnapshot!.cancellationPolicy=CANCELLATION_POLICY.text;
    b.staySnapshot!.cancellationTerms!.version=CANCELLATION_POLICY.version;
    expect(reviewBookingCancellation(b,at('2027-02-01T12:00:00Z')).status).toBe('manual_review');
  });
});
