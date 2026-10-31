import type { Metadata } from 'next';
import Link from 'next/link';
import { isPublicPreview } from '@/lib/booking-launch';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Ask Kipper',
  description: 'Questions about your Casa Pacifica stay? Guest messaging is being connected. No messages are received through this preview.',
};

/** One contact entry. Legacy community invites are deliberately not guest support. */
export default function ContactPage() {
  const preview = isPublicPreview();
  return <div className="mx-auto max-w-[590px] px-5 pb-20 pt-8 sm:px-8 sm:py-12">
    <Link href="/properties/casa-pacifica" className="mb-7 inline-flex min-h-11 items-center text-sm text-ink">← Back</Link>
    <p className="casa-eyebrow mb-3">Ask Kipper · Casa Pacifica</p>
    <h1 className="font-display text-4xl font-normal leading-[1.1] tracking-tight text-ink sm:text-5xl">Questions about your stay?</h1>
    <p className="mt-5 text-sm leading-7 text-moss">One place for stay questions and help from the team.</p>

    <section aria-label="Message the team" className="mt-7">
      <button type="button" disabled aria-describedby="message-status" className="flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper opacity-60 disabled:cursor-not-allowed">Message us</button>
      <p id="message-status" role="status" className="mt-3 text-sm leading-6 text-moss">{preview ? 'Messaging is unavailable in this preview.' : 'Guest messaging is not connected yet.'} No message can be sent here.</p>
      <p className="mt-5 text-sm text-moss"><span className="font-medium text-ink">Prefer email?</span> Guest email is not connected yet.</p>
    </section>

    <section aria-labelledby="urgent-help" className="mt-9 border-t border-line pt-7">
      <h2 id="urgent-help" className="font-display text-2xl font-normal">Booked guests: urgent help</h2>
      <p className="mt-3 text-sm leading-7 text-moss">Use the verified host contact in your original booking confirmation for urgent stay issues. You don’t need to go through automated questions.</p>
      <p className="mt-2 text-xs leading-6 text-moss">Urgent contact is not connected on this website. For immediate danger, contact local emergency services.</p>
      <Link href="/booking-access" className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Find your booking</Link>
    </section>

    <p className="mt-8 border-t border-line pt-5 text-xs leading-6 text-moss">Kipper AI is not answering here yet. No guest details are collected and no response time is promised.</p>
  </div>;
}
