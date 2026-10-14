import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PhotoGallery from "@/components/PhotoGallery";
import BookingWidget from "@/components/BookingWidget";
import FaqAccordion from "@/components/FaqAccordion";
import { Badge, SectionHeading } from "@/components/ui";
import {
  IconBath,
  IconBed,
  IconCheck,
  IconClock,
  IconMoon,
  IconPet,
  IconPin,
  IconUsers,
} from "@/components/icons";
import { getProperty } from "@/data/api";
import type { Property } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) return { title: "Stay not found" };
  return {
    title: `${property.name} — ${property.neighborhood}, ${property.city}`,
    description: `${property.name}: ${property.tagline}. ${property.bedrooms}BR/${property.bathrooms}BA, sleeps ${property.maxGuests}, private heated pool. Book direct for the best rate.`,
    openGraph: {
      title: `${property.name} — book direct in ${property.city}`,
      description: property.tagline,
      images: property.photos.slice(0, 3).map((p) => ({ url: p.src, alt: p.alt })),
    },
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.zip,
      addressCountry: "US",
    },
    geo: { "@type": "GeoCoordinates", latitude: property.latitude, longitude: property.longitude },
    numberOfRooms: property.bedrooms,
    maximumAttendeeCapacity: property.maxGuests,
    checkinTime: "15:00",
    checkoutTime: "11:00",
    amenityFeature: property.amenities.flatMap((g) =>
      g.items.map((item) => ({ "@type": "LocationFeatureSpecification", name: item })),
    ),
    image: property.photos.map((p) => p.src),
    priceRange: "$$$",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink hover:underline underline-offset-4">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/properties" className="hover:text-ink hover:underline underline-offset-4">
                Stays
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{property.name}</li>
          </ol>
        </nav>

        <PhotoGallery photos={property.photos} propertyName={property.name} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* Main content */}
          <div className="min-w-0 pb-24 lg:pb-0">
            <header>
              <Badge tone="clay">{property.neighborhood}, {property.city}</Badge>
              <h1 className="mt-3 font-display text-3xl font-medium text-ink sm:text-4xl">
                {property.name}
              </h1>
              <p className="mt-2 text-lg text-stone-600">{property.tagline}</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                <IconPin className="h-4 w-4" />
                {property.address}, {property.city}, {property.state} {property.zip}
              </p>
              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Stat icon={IconUsers} label={`Sleeps ${property.maxGuests}`} />
                <Stat icon={IconBed} label={`${property.bedrooms} bedrooms · ${property.beds} beds`} />
                <Stat icon={IconBath} label={`${property.bathrooms} bathrooms`} />
                <Stat icon={IconClock} label={`Check-in ${property.checkInTime} · Check-out ${property.checkOutTime}`} />
              </dl>
            </header>

            <SectionBlock title="About this stay">
              <p className="max-w-2xl text-base leading-relaxed text-stone-600">
                {property.description}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {property.highlights.map((h) => (
                  <div key={h.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-card">
                    <h3 className="font-display text-base font-medium text-ink">{h.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{h.body}</p>
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Sleeping arrangements">
              <ul className="grid gap-3 sm:grid-cols-2">
                {property.bedLayout.map((b) => (
                  <li
                    key={b.room}
                    className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
                  >
                    <IconBed className="h-5 w-5 shrink-0 text-clay" />
                    <span className="text-sm">
                      <strong className="font-medium text-ink">{b.room}:</strong>{" "}
                      <span className="text-stone-600">{b.bed}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </SectionBlock>

            <SectionBlock title="Amenities">
              <div className="grid gap-6 sm:grid-cols-2">
                {property.amenities.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                      {group.category}
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
                          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Guest access">
              <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
                {property.guestAccess}
              </p>
            </SectionBlock>

            <SectionBlock title="House rules">
              <ul className="max-w-2xl space-y-2.5">
                {property.houseRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" aria-hidden />
                    {rule}
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
                <IconPet className="h-4 w-4 text-stone-500" />
                Pets: {property.petPolicy.maxPets} pet max · ${property.petPolicy.feePerStayCents / 100} per stay
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-600">
                <IconMoon className="h-4 w-4 text-stone-500" />
                Quiet hours {property.quietHours}
              </p>
            </SectionBlock>

            <SectionBlock title="Check-in & cancellation">
              <dl className="max-w-2xl space-y-3 text-sm">
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <dt className="font-medium text-ink">Check-in</dt>
                  <dd className="mt-1 text-stone-600">
                    From {property.checkInTime} · {property.checkInMethod}. Your smart-lock
                    entry code is sent before arrival.
                  </dd>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <dt className="font-medium text-ink">Check-out</dt>
                  <dd className="mt-1 text-stone-600">By {property.checkOutTime}.</dd>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <dt className="font-medium text-ink">Cancellation</dt>
                  <dd className="mt-1 text-stone-600">{property.cancellationPolicy}</dd>
                </div>
              </dl>
            </SectionBlock>

            <SectionBlock title="Location">
              <address className="text-sm not-italic leading-relaxed text-stone-600">
                {property.address}
                <br />
                {property.city}, {property.state} {property.zip} · {property.neighborhood}
              </address>
              <div
                className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-cream"
                role="img"
                aria-label="Map placeholder — interactive map coming soon"
              >
                <p className="text-sm font-medium text-stone-500">Map — coming soon</p>
              </div>
            </SectionBlock>

            <SectionBlock title="Frequently asked questions">
              <FaqAccordion faqs={property.faqs} />
            </SectionBlock>

            <SectionBlock title="Guest reviews">
              <div className="rounded-2xl border border-dashed border-stone-300 bg-cream/60 px-6 py-10 text-center">
                <p className="font-display text-xl font-medium text-ink">No direct reviews yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
                  Guest reviews from direct stays will appear here. In the meantime,
                  our hosting track record speaks for itself: 9 years on Airbnb with
                  383 stays welcomed.
                </p>
              </div>
            </SectionBlock>

            <SectionBlock title="Good to know">
              <ul className="max-w-2xl space-y-2 text-sm leading-relaxed text-stone-600">
                <li>· Exterior security camera on the property</li>
                <li>· Smoke & carbon monoxide alarms, fire extinguisher, first aid kit</li>
                <li>· San Diego STRO Tier-2 License STR-13982L</li>
              </ul>
            </SectionBlock>
          </div>

          {/* Booking sidebar */}
          <aside aria-label="Book this stay" className="min-w-0">
            <BookingWidget property={property} />
          </aside>
        </div>
      </article>
    </>
  );
}

function Stat({ icon: Icon, label }: { icon: (p: { className?: string }) => React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-stone-600">
      <Icon className="h-4 w-4 text-stone-400" />
      <dt className="sr-only">{label}</dt>
      <dd>{label}</dd>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-stone-200 pt-8" aria-label={title}>
      <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
