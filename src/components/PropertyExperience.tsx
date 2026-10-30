"use client";
import { useState, type ReactNode } from "react";
import type { StaySelection } from "@/lib/stay-selection";
import type { Property } from "@/lib/types";
import { resolveStayConfiguration } from "@/lib/accommodation";
import type { DateRange } from "@/components/AvailabilityCalendar";
import PhotoGallery from "@/components/PhotoGallery";
import BookingWidget from "@/components/BookingWidget";
import Link from "next/link";
import AmenityHighlights from "@/components/AmenityHighlights";
import HostCard from "@/components/HostCard";
import HighlightCard from "@/components/HighlightCard";
import FaqAccordion from "@/components/FaqAccordion";
import { IconCheck } from "@/components/icons";

function dateLabel(iso: string) { return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }); }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="casa-section"><h2 className="mb-5 font-display text-2xl font-normal text-ink">{title}</h2>{children}</section>; }

export default function PropertyExperience({ property, publicPreview = false, initialSelection }: { property: Property; publicPreview?: boolean; initialSelection?: StaySelection }) {
  const [range, setRange] = useState<DateRange | null>(initialSelection?.range ?? null);
  const resolution = resolveStayConfiguration(property, range?.checkIn, range?.checkOut);
  const config = resolution.configuration;
  const blocked = config?.checkoutApproved === false || ["pending_approval", "manual_review", "invalid_dates"].includes(resolution.status);
  const showDetails = !blocked && config?.checkoutApproved !== false;
  const future = property.configurations?.filter(item => item.effectiveFrom > (property.configurations?.[0]?.effectiveFrom ?? ""));
  const facts = showDetails ? [ `${config?.maxGuests ?? property.maxGuests} guests`, `${config?.bedrooms ?? property.bedrooms} bedrooms`, ...(property.beds ? [`${property.beds} beds`] : []), `${property.bathrooms} baths` ] : config ? [`${config.bedrooms} bedrooms`, "Details awaiting approval"] : [];
  return <>
    {showDetails && property.photos.length > 0 ? <PhotoGallery photos={property.photos} propertyName={property.name} /> : <div className="flex min-h-56 items-center justify-center rounded-3xl bg-cream p-8 text-center"><div><p className="font-display text-3xl">Your dates. Your accommodation.</p><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600">{resolution.message ?? "Photos and accommodation details for this configuration are awaiting approval."}</p></div></div>}
    <div className="casa-editorial">
      <section className="mb-6" aria-label="Introduction"><p className="casa-eyebrow mb-3">{property.neighborhood} · {property.city}</p><h1 className="casa-title">The ease of a San Diego getaway. The comfort of feeling at home.</h1><p className="mt-5 text-xs text-moss">{property.name} · No verified reviews yet.</p><div className="casa-facts">{facts.map(fact => <span key={fact}>{fact}</span>)}</div></section>
      <div className="min-w-0">
        {property.license && <p className="mb-6 text-xs tracking-wide text-stone-500">Short-term rental license · {property.license}</p>}
        {property.hostName && <HostCard hostName={property.hostName} credibility={property.city} className="mb-8" />}
        <section aria-labelledby="before-book-heading" className="mb-8 rounded-xl border border-line bg-panel px-5 py-5">
          <h2 id="before-book-heading" className="mb-4 font-display text-xl font-normal">Before you book</h2>
          {showDetails && <div className="mb-5 space-y-3 text-sm leading-7 text-stone-600"><p>{property.guestAccess}</p><p>Maximum {config?.maxTotalOccupancy ?? property.maxTotalOccupancy} people on the property, including infants and daytime visitors.</p></div>}
          <div className="text-sm leading-relaxed" aria-live="polite">
            <p className="font-semibold">{config ? config.label : "Accommodation depends on your stay dates"}</p>
            {resolution.status === "no_dates" && <p className="mt-1 text-stone-600">Select dates to confirm the accommodation for your entire stay.</p>}
            {resolution.message && <p className="mt-1 text-stone-600">{resolution.message}</p>}
            {!range?.checkIn && future?.map(item => <p key={item.id} className="mt-2 text-stone-600">{item.label} from {dateLabel(item.effectiveFrom)}.{!item.checkoutApproved && " Details are being finalized; online booking is not yet available for this configuration."}</p>)}
          </div>
        </section>
        {showDetails ? <>
          {property.highlights.length > 0 && <div className="mb-8 grid gap-6 sm:grid-cols-2">{property.highlights.slice(0, 3).map(item => <HighlightCard key={item.title} icon={IconCheck} title={item.title} body={item.body} />)}</div>}
          <Section title="The space"><p className="whitespace-pre-line text-sm leading-7 text-stone-600">{property.description}</p></Section>
          {property.bedLayout.length > 0 ? <Section title="Sleeping arrangements"><div className="grid gap-3 sm:grid-cols-2">{property.bedLayout.map(room => <div key={room.room} className="rounded-2xl border border-stone-200 p-4"><h3 className="text-sm font-semibold">{room.room}</h3><p className="mt-1 text-sm text-stone-500">{room.bed}</p></div>)}</div></Section> : <Section title="Sleeping arrangements"><p className="text-sm text-stone-600">Bed count and sleeping arrangements are awaiting confirmation.</p></Section>}
          <Section title="The good kind of staying in."><AmenityHighlights groups={property.amenities} /></Section>
          <Section title="House rules"><ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-stone-600">{property.houseRules.map(rule => <li key={rule}>{rule}</li>)}</ul></Section>
        </> : null}
        <Section title="Location"><p className="text-sm text-stone-600">{property.neighborhood}, {property.city}, {property.state}</p><p className="mt-3 text-sm leading-relaxed text-stone-500">The exact address is shared with confirmed guests.</p></Section>
        {showDetails && property.faqs.length > 0 && <Section title="Frequently asked questions"><FaqAccordion faqs={property.faqs} /></Section>}
        <Section title="Here when you need a little guidance"><p className="text-sm leading-7 text-moss">Kipper concierge AI is in development. Questions and guest messages are not sent through this preview.</p><Link href="/contact" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm">Ask Kipper · connection pending</Link></Section>
        {showDetails && <Section title="Good to know"><dl className="grid gap-5 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Check-in</dt><dd className="mt-1 text-stone-600">{property.checkInTime} · {property.checkInMethod}</dd></div><div><dt className="font-semibold">Checkout</dt><dd className="mt-1 text-stone-600">{property.checkOutTime}</dd></div></dl>{property.safetyDevices.length > 0 && <ul className="mt-5 space-y-2 text-sm text-stone-600">{property.safetyDevices.map(item => <li key={item}>{item}</li>)}</ul>}</Section>}
      </div>
      <div aria-label="Booking"><BookingWidget initialSelection={initialSelection} publicPreview={publicPreview} property={property} onRangeChange={setRange} bookingBlockedReason={blocked ? resolution.message ?? "Online booking is unavailable for these dates. Please choose another stay." : undefined} /></div>
    </div>
  </>;
}
