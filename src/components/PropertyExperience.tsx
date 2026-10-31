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
import PoliciesDialog from "@/components/PoliciesDialog";
import NeighborhoodMap from "@/components/NeighborhoodMap";
import RoomCards from "@/components/RoomCards";
import FaqAccordion from "@/components/FaqAccordion";
import { IconClock, IconShield, IconCheck, IconUsers, IconBed, IconBath } from "@/components/icons";
function Section({title,children}:{title:string;children:ReactNode}) {return <section className="casa-section"><h2 className="mb-6 font-display">{title}</h2>{children}</section>;}
export default function PropertyExperience({property,publicPreview=false,initialSelection}:{property:Property;publicPreview?:boolean;initialSelection?:StaySelection}) {
  const [range,setRange]=useState<DateRange|null>(initialSelection?.range??null);
  const resolution=resolveStayConfiguration(property,range?.checkIn,range?.checkOut);
  const config=resolution.configuration;
  const isCasa=property.name === "Casa Pacifica";
  const blocked=config?.checkoutApproved===false||["pending_approval","manual_review","invalid_dates"].includes(resolution.status);
  const showDetails=!blocked&&config?.checkoutApproved!==false;
  return <>
    {showDetails&&property.photos.length>0?<PhotoGallery photos={property.photos} propertyName={property.name}/>:<div className="flex min-h-56 items-center justify-center bg-cream p-8 text-center"><div><p className="font-display text-3xl">Your dates. Your accommodation.</p><p className="mt-3 text-sm text-moss">{resolution.message??"Photos and accommodation details are awaiting approval."}</p></div></div>}
    <div className="casa-editorial">
      <section aria-label="Introduction"><p className="casa-eyebrow mb-3">{property.neighborhood} · {property.city}</p><h1 className="casa-title">{isCasa?"Experience authentic San Diego beach culture. the comfort of feeling at home.":property.name}</h1>
        <div className="mt-5 pb-5">{showDetails&&<div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm"><span className="flex items-center gap-2"><IconUsers className="h-5 w-5"/>{property.maxGuests} guests</span><span className="flex items-center gap-2"><IconBed className="h-5 w-5"/>{property.bedrooms} bedrooms</span><span className="flex items-center gap-2"><IconBath className="h-5 w-5"/>{property.bathrooms} baths</span></div>}{isCasa&&<p className="mt-3 text-xs text-moss">5 bedrooms available in 03/27</p>}</div>
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
          <PoliciesDialog property={property}/>
        </Section>
      </>}
      <Section title="Your San Diego neighborhood."><p className="text-sm text-moss">{property.neighborhood}, {property.city}</p><NeighborhoodMap/><p className="mt-3 text-xs text-moss">The exact address is shared with confirmed guests.</p></Section>
      <Section title="Stories from our guests."><div className="rounded-xl border border-line p-6 text-center"><p aria-hidden="true" className="text-xl tracking-widest">☆☆☆☆☆</p><h3 className="mt-3 font-display text-2xl">The first chapter is yours.</h3><p className="mt-2 text-xs text-moss">Verified guest reviews will appear here.</p></div></Section>
      {showDetails&&<details className="mt-8 border-t border-line pt-5"><summary className="cursor-pointer py-2 text-sm">More about the home</summary><Section title="The space"><p className="text-sm leading-7 text-moss">Explore the photos, amenities and accommodation details for your selected dates.</p></Section><Section title="Frequently asked questions"><FaqAccordion faqs={property.faqs.filter(item=>!/upstairs|downstairs|shared indoor|shared space/i.test(`${item.q} ${item.a}`))}/></Section></details>}
      <p className="mt-8 text-xs text-moss">Short-term rental license · {property.license}</p>
      <div aria-label="Booking"><BookingWidget initialSelection={initialSelection} publicPreview={publicPreview} property={property} onRangeChange={setRange} bookingBlockedReason={blocked?resolution.message??"Online booking is unavailable for these dates. Please choose another stay.":undefined}/></div>
    </div>
  </>;
}
