'use client';
import { useEffect, useRef, useState } from 'react';
import { formatCents } from '@/lib/types';
import type { CancellationReview as Review } from '@/lib/cancellation-review';

/** Display-only admin calculator. There is deliberately no cancel/refund submission. */
export default function CancellationReview({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);
  async function load() {
    if (loading) return;
    const current = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    setOpen(true); setReview(null); setError(''); setLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/cancellation-review`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Review unavailable. Check your admin session and try again.');
      const data = await response.json() as { review: Review };
      if (current === generation.current) setReview(data.review);
    } catch {
      if (current === generation.current) setError('Review unavailable. Check your admin session and try again.');
    } finally { if (current === generation.current) setLoading(false); }
  }
  function close() { generation.current++; request.current?.abort(); setOpen(false); setReview(null); setLoading(false); setError(''); }
  return <div className="min-w-[220px]">
    <button type="button" onClick={open ? close : load} aria-expanded={open} className="min-h-11 text-left text-xs font-medium text-clay-dark underline underline-offset-4">{open ? 'Close review' : 'Review cancellation (no action)'}</button>
    {open && <section aria-label="Read-only cancellation review" className="mt-2 max-w-md rounded-xl border border-stone-200 bg-cream p-4 text-xs leading-relaxed">
      <p className="font-semibold text-ink">No cancellation or refund will be performed.</p>
      {loading && <p role="status" className="mt-2">Loading accepted terms…</p>}
      {error && <p role="alert" className="mt-2">{error}</p>}
      {review && <>
        <p className="mt-2">{review.reason}</p>
        <p className="mt-2 text-stone-500">Reviewed at {review.reviewedAt}. {review.timeBasis === 'recorded_cancellation' ? 'Using recorded cancellation time.' : 'Active bookings use the server time as a hypothetical cancellation.'}</p>
        {review.status === 'review_available' && <dl className="mt-3 space-y-2">
          <div><dt>Accepted policy</dt><dd className="font-medium">{review.policyVersion}</dd></div>
          <div><dt>Local check-in cutoff</dt><dd>{review.checkInCutoff?.date} {review.checkInCutoff?.localTime} {review.checkInCutoff?.timezone}</dd></div>
          <div><dt>Accommodation after discounts ({review.accommodationPercent}%)</dt><dd>{formatCents(review.accommodationRefundCents!)}</dd></div>
          <div><dt>Cleaning</dt><dd>{formatCents(review.cleaningRefundCents!)}</dd></div>
          <div><dt>Reviewed subtotal — not final refund</dt><dd className="font-semibold">{formatCents(review.reviewedSubtotalCents!)}</dd></div>
          <div><dt>Recorded taxes — manual adjustment review</dt><dd>{formatCents(review.recordedTaxCents!)}</dd></div>
          <div><dt>Recorded pet fee — manual adjustment review</dt><dd>{formatCents(review.recordedPetFeeCents!)}</dd></div>
        </dl>}
      </>}
    </section>}
  </div>;
}
