"use client";
import { useState, type ReactNode } from "react";
import type { Property } from "@/lib/types";
import { resolveStayConfiguration } from "@/lib/accommodation";
import type { DateRange } from "@/components/AvailabilityCalendar";
import PhotoGallery from "@/components/PhotoGallery";
import BookingWidget from "@/components/BookingWidget";
import TitleBlock from "@/components/TitleBlock";
import TrustStrip from "@/components/TrustStrip";
import HostCard from "@/components/HostCard";
import HighlightCard from "@/components/HighlightCard";
import FaqAccordion from "@/components/FaqAccordion";
import { IconCheck } from "@/components/icons";

function dateLabel(iso: string) { return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }); }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="border-t border-stone-200 py-8"><h2 className="mb-5 font-display text-2xl font-medium text-ink">{title}</h2>{children}</section>; }

export default function PropertyExperience({ property, publicPreview = false }: { property: Property; publicPreview?: boolean }) {
  const [range, setRange] = useState<DateRange | null>(null);
  const resolution = resolveStayConfiguration(property, range?.checkIn, range?.checkOut);
  const config = resolution.configuration;
  const blocked = config?.checkoutApproved === false || ["pending_approval", "manual_review", "invalid_dates"].includes(resolution.status);
  const showDetails = !blocked && config?.checkoutApproved !== false;
  const future = property.configurations?.filter(item => item.effectiveFrom > (property.configurations?.[0]?.effectiveFrom ?? ""));
  const facts = showDetails ? [ `${config?.maxGuests ?? property.maxGuests} guests`, `${config?.bedrooms ?? property.bedrooms} bedrooms`, ...(property.beds ? [`${property.beds} beds`] : []), `${property.bathrooms} baths` ] : config ? [`${config.bedrooms} bedrooms`, "Details awaiting approval"] : [];
  return <>
    {showDetails && property.photos.length > 0 ? <PhotoGallery photos={property.photos} propertyName={property.name} /> : <div className="flex min-h-56 items-center justify-center rounded-3xl bg-cream p-8 text-center"><div><p className="font-display text-3xl">Your dates. Your accommodation.</p><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone-600">{resolution.message ?? "Photos and accommodation details for this configuration are awaiting approval."}</p></div></div>}
    <TitleBlock className="mx-auto max-w-3xl py-9" name={property.name} place={`${property.neighborhood}, ${property.city}, ${property.state}`} facts={facts} />
    <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-5 text-sm leading-relaxed" aria-live="polite">
      <p className="font-semibold">{config ? config.label : "Accommodation depends on your stay dates"}</p>
      {resolution.status === "no_dates" && <p className="mt-1 text-stone-600">Select dates to confirm the accommodation for your entire stay.</p>}
      {resolution.message && <p className="mt-1 text-stone-600">{resolution.message}</p>}
      {!range?.checkIn && future?.map(item => <p key={item.id} className="mt-2 text-stone-600">{item.label} from {dateLabel(item.effectiveFrom)}.{!item.checkoutApproved && " Details are being finalized; online booking is not yet available for this configuration."}</p>)}
    </div>
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        {property.license && <TrustStrip badge="Licensed stay" body={`Short-term rental license · ${property.license}`} className="mb-5" />}
        {property.hostName && <HostCard hostName={property.hostName} credibility={`Independent host · ${property.city}`} className="mb-8" />}
        {showDetails ? <>
          {property.highlights.length > 0 && <div className="mb-8 grid gap-6">{property.highlights.slice(0, 3).map(item => <HighlightCard key={item.title} icon={IconCheck} title={item.title} body={item.body} />)}</div>}
          <Section title="The space"><p className="whitespace-pre-line text-sm leading-7 text-stone-600">{property.description}</p><p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-600">{property.guestAccess}</p></Section>
          {property.bedLayout.length > 0 ? <Section title="Sleeping arrangements"><div className="grid gap-3 sm:grid-cols-2">{property.bedLayout.map(room => <div key={room.room} className="rounded-2xl border border-stone-200 p-4"><h3 className="text-sm font-semibold">{room.room}</h3><p className="mt-1 text-sm text-stone-500">{room.bed}</p></div>)}</div></Section> : <Section title="Sleeping arrangements"><p className="text-sm text-stone-600">Bed count and sleeping arrangements are awaiting confirmation.</p></Section>}
          <Section title="Amenities"><div className="grid gap-6 sm:grid-cols-2">{property.amenities.map(group => <div key={group.category}><h3 className="mb-2 text-sm font-semibold">{group.category}</h3><ul className="space-y-2 text-sm text-stone-600">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></Section>
          <Section title="House rules"><ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-stone-600">{property.houseRules.map(rule => <li key={rule}>{rule}</li>)}</ul></Section>
        </> : <Section title="Before you book"><p className="text-sm leading-7 text-stone-600">{resolution.message ?? "We are finalizing this accommodation’s capacity, sleeping arrangements, amenities and photos. Online booking will open after these details are approved."}</p></Section>}
        <Section title="Location"><p className="text-sm text-stone-600">{property.neighborhood}, {property.city}, {property.state}</p><p className="mt-3 text-sm leading-relaxed text-stone-500">The exact address is shared with confirmed guests.</p></Section>
        {showDetails && property.faqs.length > 0 && <Section title="Frequently asked questions"><FaqAccordion faqs={property.faqs} /></Section>}
        {showDetails && <Section title="Good to know"><dl className="grid gap-5 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Check-in</dt><dd className="mt-1 text-stone-600">{property.checkInTime} · {property.checkInMethod}</dd></div><div><dt className="font-semibold">Checkout</dt><dd className="mt-1 text-stone-600">{property.checkOutTime}</dd></div></dl>{property.safetyDevices.length > 0 && <ul className="mt-5 space-y-2 text-sm text-stone-600">{property.safetyDevices.map(item => <li key={item}>{item}</li>)}</ul>}</Section>}
      </div>
      <aside className="min-w-0 self-stretch" aria-label="Booking"><BookingWidget publicPreview={publicPreview} property={property} onRangeChange={setRange} bookingBlockedReason={blocked ? resolution.message ?? "Online booking is unavailable for these dates. Please choose another stay." : undefined} /></aside>
    </div>
  </>;
}
