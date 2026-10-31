import type { Metadata } from 'next';
import Link from 'next/link';
import { isRecoveryEnabled } from '@/lib/booking-recovery';
import BookingAccessClient from './BookingAccessClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Booking access', description: 'Securely recover access to your Casa Pacifica booking.', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function BookingAccessPage() {
  return <div className="mx-auto max-w-[590px] px-5 py-10 pb-20 sm:px-8 sm:py-12">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">Casa Pacifica</p>
    <h1 className="casa-page-heading">Access your booking</h1>
    {isRecoveryEnabled() ? <BookingAccessClient /> : <div className="mt-6 rounded-xl border border-stone-300 bg-[#fffcf6] p-6 text-sm leading-relaxed text-stone-600">
      Booking access recovery is not available in this preview. No booking details or recovery codes are collected here. For an existing reservation, use the verified contact in your original confirmation.
    </div>}
    <Link href="/contact" className="mt-8 inline-block text-sm text-clay-dark underline underline-offset-4">Contact options</Link>
  </div>;
}
