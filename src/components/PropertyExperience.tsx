"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { StaySelection } from "@/lib/stay-selection";
import type { Property } from "@/lib/types";
import { resolveStayConfiguration } from "@/lib/accommodation";
import type { DateRange } from "@/components/AvailabilityCalendar";
import PhotoGallery from "@/components/PhotoGallery";
import BookingWidget from "@/components/BookingWidget";
import AmenityHighlights from "@/components/AmenityHighlights";
import StayHighlights from "@/components/StayHighlights";
import RoomCards from "@/components/RoomCards";
import FaqAccordion from "@/components/FaqAccordion";
import { IconClock, IconShield, IconCheck } from "@/components/icons";
function Section({title,children}:{title:string;children:ReactNode}) {return <section className="casa-section"><h2 className="mb-6 font-display">{title}</h2>{children}</section>;}
export default function PropertyExperience({property,publicPreview=false,initialSelection}:{property:Property;publicPreview?:boolean;initialSelection?:StaySelection}) {
  const [range,setRange]=useState<DateRange|null>(initialSelection?.range??null);
  const resolution=resolveStayConfiguration(property,range?.checkIn,range?.checkOut);
  const config=resolution.configuration;
  const isCasa=property.name === "Casa Pacifica";
  const facts=`${config?.maxGuests??property.maxGuests} guests · ${config?.bedrooms??property.bedrooms} bedrooms · ${property.bathrooms} baths`;
  const blocked=config?.checkoutApproved===false||["pending_approval","manual_review","invalid_dates"].includes(resolution.status);
  const showDetails=!blocked&&config?.checkoutApproved!==false;
  return <>
    {showDetails&&property.photos.length>0?<PhotoGallery photos={property.photos} propertyName={property.name}/>:<div className="flex min-h-56 items-center justify-center bg-cream p-8 text-center"><div><p className="font-display text-3xl">Your dates. Your accommodation.</p><p className="mt-3 text-sm text-moss">{resolution.message??"Photos and accommodation details are awaiting approval."}</p></div></div>}
    <div className="casa-editorial">
      <section aria-label="Introduction"><p className="casa-eyebrow mb-3">{property.neighborhood} · {property.city}</p><h1 className="casa-title">{isCasa?"Experience authentic San Diego beach culture. the comfort of feeling at home.":property.name}</h1>
        <div className="mt-5 pb-5">{isCasa&&<><p className="text-xs text-moss">Expansion from March 1, 2027</p><p className="mt-1 text-sm font-medium">15 guests · 5 bedrooms · 3 baths</p><p className="mt-1 text-xs leading-5 text-moss">Future configuration — online booking remains unavailable.</p></>}{showDetails&&<p className="mt-2 text-xs leading-5 text-moss">Current accommodation: {facts}. Maximum {property.maxTotalOccupancy} total, including infants and visitors.</p>}</div>
        {config&&<p className="sr-only">{config.label}</p>}
        {property.hostName&&<p className="mb-3 text-xs text-moss">{property.hostName}</p>}
        {resolution.message&&<p role="status" className="mb-5 text-sm text-moss">{resolution.message}</p>}
      </section>
      {showDetails&&<>
        {isCasa&&<StayHighlights/>}
        <section className="border-t border-line pb-2 pt-7"><h2 className="mb-6 font-display">The good kind of staying in.</h2><AmenityHighlights groups={property.amenities}/></section>
        <Section title="A space for everyone."><RoomCards photos={property.photos}/><p className="mt-3 text-xs text-moss">Bed count and sleeping arrangements are awaiting confirmation.</p></Section>
        <Section title="Before you book">
          <div className="space-y-5 text-sm leading-6">
            <div className="flex gap-4"><IconClock className="mt-1 h-6 w-6 shrink-0"/><p><strong className="block font-medium">Arrive from {property.checkInTime}</strong><span className="text-moss">Checkout by {property.checkOutTime}</span></p></div>
            <div className="flex gap-4"><IconCheck className="mt-1 h-6 w-6 shrink-0"/><p><strong className="block font-medium">A little care goes a long way</strong><span className="text-moss">No parties or smoking · quiet after 10 pm</span></p></div>
            <div className="flex gap-4"><IconShield className="mt-1 h-6 w-6 shrink-0"/><p><strong className="block font-medium">Know your cancellation options</strong><span className="text-moss">Full accommodation refund 30+ days before arrival</span></p></div>
          </div>
          <p className="mt-5 text-xs leading-6 text-moss">{property.guestAccess} Maximum {property.maxTotalOccupancy} people on the property, including infants and daytime visitors.</p>
          <details className="mt-4"><summary className="w-fit cursor-pointer rounded-md border border-moss/60 px-4 py-3 text-sm">Read all policies</summary><div className="mt-5 space-y-4 text-sm leading-7 text-moss"><ul className="list-disc pl-5">{property.houseRules.map(rule=><li key={rule}>{rule}</li>)}</ul><Link href="/policies/cancellation" className="block underline">Full cancellation policy and local-time cutoffs</Link><Link href="/policies/terms" className="block underline">Terms of stay</Link><p>{property.safetyDevices.join(" · ")}</p></div></details>
        </Section>
      </>}
      <Section title="Your San Diego neighborhood."><p className="text-sm text-moss">{property.neighborhood}, {property.city}</p><div className="mt-4 rounded-xl border border-line bg-cream p-6"><p className="font-display text-2xl">Mira Mesa</p><p className="mt-2 text-sm text-moss">A neighborhood base in San Diego.</p><a href="https://www.google.com/maps/search/?api=1&query=Mira+Mesa+San+Diego" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm underline">Explore the neighborhood ↗</a></div><p className="mt-3 text-xs text-moss">The exact address is shared with confirmed guests.</p></Section>
      <Section title="Stories from our guests."><div className="rounded-xl border border-line p-6 text-center"><p aria-hidden="true" className="text-xl tracking-widest">☆☆☆☆☆</p><h3 className="mt-3 font-display text-2xl">The first chapter is yours.</h3><p className="mt-2 text-xs text-moss">Verified guest reviews will appear here.</p></div></Section>
      {showDetails&&<details className="mt-8 border-t border-line pt-5"><summary className="cursor-pointer py-2 text-sm">More about the home</summary><Section title="The space"><p className="text-sm leading-7 text-moss">{property.description}</p></Section><Section title="Frequently asked questions"><FaqAccordion faqs={property.faqs}/></Section></details>}
      <p className="mt-8 text-xs text-moss">Short-term rental license · {property.license}</p>
      <div aria-label="Booking"><BookingWidget initialSelection={initialSelection} publicPreview={publicPreview} property={property} onRangeChange={setRange} bookingBlockedReason={blocked?resolution.message??"Online booking is unavailable for these dates. Please choose another stay.":undefined}/></div>
    </div>
  </>;
}
