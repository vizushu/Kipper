import Link from 'next/link';
import { getProperty } from '@/lib/property';
import { CANCELLATION_POLICY } from '@/lib/cancellation';
import { IconChevronDown } from '@/components/icons';

/** Curated public facts only. Not an AI responder, availability lookup or private stay guide. */
export default function StayHelpGuide() {
  const property = getProperty('casa-pacifica');
  if (!property) return null;
  const current = property.configurations?.find(config => config.id === 'casa-pacifica-3br');
  const approvedAmenities = ['Full kitchen', 'Wifi', 'Private pool', 'Pool table', 'EV charger (Level 2)'];
  const available = new Set(property.amenities.flatMap(group => group.items));
  const labels: Record<string,string> = { Wifi: 'Wi-Fi', 'Private pool': 'swimming pool', 'EV charger (Level 2)': 'EV charging' };
  const answers = [
    { question: 'How many people can stay?', answer: <><p>The 3-bedroom accommodation is for up to {current?.maxTotalOccupancy ?? property.maxTotalOccupancy} people total, including children, infants and visitors. The 5-bedroom, 3-bath expansion is planned for March 1, 2027; its booking details are not yet approved.</p><p className="mt-2">A stay checking out March 1 can use the 3-bedroom configuration. A stay crossing the expansion date needs review; the accommodation does not change automatically mid-stay.</p><Link href="/properties/casa-pacifica">Explore accommodation dates</Link></> },
    { question: 'Can I book or check a price now?', answer: <><p>Online reservations and payments are not open yet. Select dates on the property page to explore the accommodation, not to hold dates or confirm availability. A date-specific stay total must be verified before any future payment; no fixed nightly price or live AI pricing is offered here.</p><p className="mt-2">For questions about your dates, email the team. An email inquiry does not reserve the property.</p></> },
    { question: 'What is the cancellation policy?', answer: <><p>{CANCELLATION_POLICY.text}</p><p className="mt-2">Cutoffs use the property’s local check-in time in America/Los_Angeles. Your accepted booking terms determine your exact cutoffs.</p><Link href="/policies/cancellation">Read the cancellation policy</Link></> },
    { question: 'What amenities are listed?', answer: <><p>Current verified amenities include {approvedAmenities.filter(item => available.has(item)).map(item => labels[item] ?? item.toLowerCase()).join(', ')}. Confirm charging arrangements, pool heating and accessibility needs before booking; no extra service or availability is promised.</p><Link href="/properties/casa-pacifica">View photos and all amenities</Link></> },
    { question: 'Where is the home, and when is arrival?', answer: <><p>Casa Pacifica is in {property.neighborhood}, {property.city}. The map shows the neighborhood only; the exact address is shared with confirmed guests. Listed check-in is {property.checkInTime} and checkout is {property.checkOutTime}, in the property’s local time.</p><p className="mt-2">Early arrival or late checkout needs approval. Access codes and private arrival instructions are not published in this guide.</p></> },
    { question: 'I already booked. How do I get help?', answer: <><p>Use the verified host contact in your original booking confirmation for urgent stay issues. Email vizushu@gmail.com for human assistance from Renier De La Cruz; no response time is promised. For immediate danger, contact local emergency services.</p><Link href="/booking-access">Find your booking</Link></> },
  ];
  return <section aria-labelledby="stay-guide-title" className="mt-8">
    <h2 id="stay-guide-title" className="font-display text-2xl font-normal">Quick stay answers</h2>
    <p className="mt-2 text-xs leading-6 text-moss">Verified stay guide—not live AI or chat. Choose a question, or email us directly; no question sequence is required.</p>
    <div className="mt-4 divide-y divide-line border-y border-line">{answers.map(item => <details key={item.question} className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden"><span>{item.question}</span><IconChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"/></summary>
      <div className="space-y-3 pb-5 text-sm leading-7 text-moss [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:underline [&_a]:underline-offset-4">{item.answer}</div>
    </details>)}</div>
  </section>;
}
