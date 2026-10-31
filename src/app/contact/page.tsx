import { BackLink } from "@/components/BackControl";
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
    <BackLink href="/properties/casa-pacifica" className="mb-7"/>
    <p className="casa-eyebrow mb-3">Ask Kipper · Casa Pacifica</p>
    <h1 className="casa-page-heading">Questions about your stay?</h1>
    <p className="mt-5 text-sm leading-7 text-moss">One place for stay questions and help from the team.</p>

    <section aria-label="Message the team" className="mt-7">
      <button type="button" disabled aria-describedby="message-status" className="flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper opacity-60 disabled:cursor-not-allowed">Message us</button>
      <p id="message-status" role="status" className="mt-3 text-sm leading-6 text-moss">{preview ? 'Messaging is unavailable in this preview.' : 'Guest messaging is not connected yet.'} No message can be sent here.</p>
      <p className="mt-5 text-sm text-moss"><span className="font-medium text-ink">Prefer email?</span> <a href="mailto:vizushu@gmail.com" className="underline underline-offset-4">vizushu@gmail.com</a>.</p>
    </section>

    <section aria-labelledby="sms-plan" className="mt-7 text-xs leading-6 text-moss">
      <h2 id="sms-plan" className="font-medium text-ink">SMS support · coming later</h2>
      <p className="mt-2">The planned Casa Pacifica / Ask Kipper service is operated by Renier De La Cruz. Once activated, you may start a conversation about your stay and receive replies relevant to your request—not marketing or recurring notifications. Message frequency varies. Message and data rates may apply. When active, reply STOP to stop SMS replies or HELP for assistance.</p>
      <p className="mt-2"><Link href="/policies/sms-privacy" className="underline underline-offset-4">SMS Privacy Policy</Link> · <Link href="/policies/sms-terms" className="underline underline-offset-4">SMS Terms &amp; Conditions</Link></p>
    </section>

    <section aria-labelledby="urgent-help" className="mt-9 border-t border-line pt-7">
      <h2 id="urgent-help" className="font-display text-2xl font-normal">Booked guests: urgent help</h2>
      <p className="mt-3 text-sm leading-7 text-moss">Use the verified host contact in your original booking confirmation for urgent stay issues. You don’t need to go through automated questions.</p>
      <p className="mt-2 text-xs leading-6 text-moss">Urgent contact is not connected on this website. For immediate danger, contact local emergency services.</p>
      <Link href="/booking-access" className="mt-4 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Find your booking</Link>
    </section>

    <p className="mt-8 border-t border-line pt-5 text-xs leading-6 text-moss">Kipper AI is not answering here yet. This website does not collect SMS messages. Renier De La Cruz is the human backup; no response time is promised.</p>
  </div>;
}
