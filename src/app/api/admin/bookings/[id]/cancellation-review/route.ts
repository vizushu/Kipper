import type { NextRequest } from 'next/server';
import { getAdapter } from '@/lib/db';
import { reviewBookingCancellation } from '@/lib/cancellation-review';
import { json, notFound, requireAdmin } from '../../../../_helpers';

/** Read-only review at server time. No arbitrary backdating, cancellation or refund action. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await context.params;
  const booking = await getAdapter().getBooking(id);
  if (!booking) return notFound('Booking not found.');
  return json({ review: reviewBookingCancellation(booking) });
}
