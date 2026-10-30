import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertyExperience from "@/components/PropertyExperience";
import { getProperty } from "@/data/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const property = await getProperty((await params).slug);
  if (!property) return { title: "Stay not found" };
  const description = `Explore ${property.name} in ${property.neighborhood}, ${property.city}. Select your dates to see the accommodation and availability for your stay.`;
  return { title: property.name, description, openGraph: { title: property.name, description } };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const property = await getProperty((await params).slug);
  if (!property) notFound();
  // Public structured data stays neighborhood-level, without version-specific facts.
  const schema = { "@context": "https://schema.org", "@type": "LodgingBusiness", name: property.name, address: { "@type": "PostalAddress", addressLocality: property.city, addressRegion: property.state } };
  return <article className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-stone-500"><Link href="/" className="underline-offset-4 hover:underline">Home</Link><span aria-hidden>/</span><Link href="/properties" className="underline-offset-4 hover:underline">Stays</Link><span aria-hidden>/</span><span aria-current="page">{property.name}</span></nav>
    <PropertyExperience key={property.id} property={{ ...property, address: "", zip: "", latitude: 0, longitude: 0 }} />
  </article>;
}
