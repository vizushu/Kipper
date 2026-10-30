import type { Metadata } from 'next';
import Link from 'next/link';
import TitleBlock from '@/components/TitleBlock';
import { IconMessage, IconSparkle, IconUsers } from '@/components/icons';
import { isPublicPreview } from '@/lib/booking-launch';
import { getGuestContactChannels } from '@/lib/guest-contact';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Contact options for Casa Pacifica: Slack, Discord, SMS and Ask dot. Guest connections are being prepared.',
};
const STATUS = { available: 'Available', preview: 'Unavailable in preview', not_connected: 'Not connected', in_development: 'In development' };

export default function ContactPage() {
  const preview = isPublicPreview();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <TitleBlock name="Let’s talk about your stay" place="Contact Casa Pacifica" />
      <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-stone-600">
        Choose the way you prefer to connect. We’re preparing dedicated guest channels — no private team spaces or personal contact details are shared here.
      </p>
      <div className="mt-8 rounded-2xl border border-stone-200 bg-cream px-5 py-4 text-sm leading-relaxed text-stone-600">
        {preview ? 'This is a preview: messages cannot be sent, contact links are disabled, and no guest details are collected on this page.' : 'Only connected options below can be used. Unavailable options do not accept messages.'}
        {' '}Ask dot is not answering questions yet. No response time is promised.
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Guest contact options">
        {getGuestContactChannels().map(channel => {
          const Icon = channel.id === 'dot' ? IconSparkle : channel.id === 'sms' ? IconMessage : IconUsers;
          return (
            <article key={channel.id} aria-labelledby={`contact-${channel.id}`} className={`flex min-w-0 flex-col rounded-2xl border p-6 sm:p-7 ${channel.id === 'dot' ? 'border-clay/25 bg-cream' : 'border-stone-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-clay-dark"><Icon className="h-5 w-5" /></span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-right text-xs font-medium text-stone-600">{STATUS[channel.status]}</span>
              </div>
              <h2 id={`contact-${channel.id}`} className="mt-5 font-display text-2xl font-medium text-ink">{channel.name}</h2>
              <p className="mb-6 mt-2 text-sm leading-relaxed text-stone-600">{channel.description}</p>
              {channel.href ? (
                <a href={channel.href} rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-medium text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay">
                  {channel.action}<span className="sr-only"> — opens {channel.id === 'sms' ? 'your messaging app' : 'an external service'}</span>
                </a>
              ) : <p className="mt-auto border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">{channel.id === 'dot' ? 'Guest integration and privacy safeguards are being reviewed. There is no chat submission or automatic answer here.' : 'No message will be sent from this option. A guest-facing connection must be approved before it becomes available.'}</p>}
            </article>
          );
        })}
      </section>

      <section className="mt-10 border-t border-stone-200 pt-8" aria-labelledby="contact-help">
        <h2 id="contact-help" className="font-display text-2xl font-medium text-ink">Helpful while you explore</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">Stay details and policies are available without sending a message.</p>
        <nav aria-label="Stay information" className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-clay-dark">
          <Link href="/properties/casa-pacifica" className="underline underline-offset-4">Explore the accommodation</Link>
          <Link href="/faq" className="underline underline-offset-4">Common questions</Link>
          <Link href="/policies/cancellation" className="underline underline-offset-4">Cancellation policy</Link>
        </nav>
        <p className="mt-6 text-xs leading-relaxed text-stone-500">Do not share payment details, passwords or entry codes in community channels. For an existing reservation, use the verified contact in your original confirmation. These contact options are not emergency services.</p>
      </section>
    </div>
  );
}
