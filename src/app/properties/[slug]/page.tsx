import { parseStaySelection, staySelectionKey } from "@/lib/stay-selection";
import { isPublicPreview } from "@/lib/booking-launch";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyExperience from "@/components/PropertyExperience";
import { getProperty } from "@/data/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const property = await getProperty((await params).slug);
  if (!property) return { title: "Stay not found" };
  const description = `Explore ${property.name} in ${property.neighborhood}, ${property.city}. Select your dates to see the accommodation for your stay.`;
  return { title: property.name, description, openGraph: { title: property.name, description } };
}

export default async function PropertyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const property = await getProperty((await params).slug);
  if (!property) notFound();
  const selection = parseStaySelection(await searchParams ?? {}, Math.min(property.maxGuests, property.maxTotalOccupancy), property.maxStayNights);
  // Public structured data stays neighborhood-level, without version-specific facts.
  const schema = { "@context": "https://schema.org", "@type": "LodgingBusiness", name: property.name, address: { "@type": "PostalAddress", addressLocality: property.city, addressRegion: property.state } };
  return <article className="mx-auto max-w-[1164px] pb-6 sm:px-[22px]">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Breadcrumb" className="px-5 py-3 text-xs text-moss"><Link href="/properties" className="inline-flex min-h-8 items-center underline-offset-4 hover:underline">← Back to stays</Link></nav>
    <PropertyExperience publicPreview={isPublicPreview()} key={staySelectionKey(property.id, selection)} initialSelection={selection} property={{ ...property, address: "", zip: "", latitude: 0, longitude: 0 }} />
  </article>;
}
