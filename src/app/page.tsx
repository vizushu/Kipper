import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import PropertyCard from "@/components/PropertyCard";
import TrustStrip from "@/components/TrustStrip";
import { Badge, Button, Card, SampleBadge, SectionHeading } from "@/components/ui";
import {
  IconCheck,
  IconMessage,
  IconPool,
  IconShield,
  IconSparkle,
  IconArrowRight,
} from "@/components/icons";
import { getProperties } from "@/data/api";

export const metadata: Metadata = {
  title: "Casa Pacifica — Book direct in San Diego",
  description:
    "Explore Casa Pacifica in San Diego. Reservations and payments are not open.",
};

const WHY_DIRECT = [
  {
    icon: IconShield,
    title: "Clear accommodation details",
    body: "Explore the accommodation before booking opens. Live pricing is not available in this preview.",
  },
  {
    icon: IconCheck,
    title: "Concierge AI in development",
    body: "Kipper concierge AI is in development; it is not active in this preview.",
  },
  {
    icon: IconMessage,
    title: "Stay communication",
    body: "Guest communication tools are in development. No operational response time is promised in this preview.",
  },
  {
    icon: IconPool,
    title: "Flexible communication",
    body: "Stay requests and any exceptions require approval from the verified homeowner or host.",
  },
];

export default async function HomePage() {
  const properties = await getProperties();

  return (
    <>
      {/* Brand hero — one photo, company name, one-line positioning */}
      <section className="relative" aria-label="Introduction">
        <div className="relative h-[72vh] min-h-[520px] w-full overflow-hidden">
          <Image
            src="/photos/casa-pacifica-02.jpg"
            alt="Bright open living room at Casa Pacifica with modern furnishings and backyard access"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ink/35" aria-hidden />
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 sm:pb-14">
              <Badge tone="stone" className="border-white/20 bg-white/10 text-white">
                San Diego, California
              </Badge>
              <h1 className="mt-4 max-w-2xl font-display text-4xl font-medium leading-tight text-white">
                Casa Pacifica
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                Explore homeowner accommodation in San Diego, with concierge AI tools in development. Reservations are not open.
              </p>
            </div>
          </div>
        </div>
        <div className="mx-auto -mt-2 w-full max-w-6xl px-4 pb-4 sm:px-6">
          <div className="relative z-10 -mt-16">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Listings index */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Explore stays">
        <SectionHeading
          eyebrow="Explore stays"
          title="Explore Casa Pacifica"
          lede="Explore Casa Pacifica in Mira Mesa, San Diego. Final booking and payment setup is not yet complete."
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </section>

      {/* Trust strip — the single badge */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6" aria-label="Booking promise">
        <TrustStrip
          badge="Book direct"
          body="Explore the accommodation for your dates and review itemized pricing before any future checkout. Online booking is not open yet."
        />
      </section>

      {/* Why book direct */}
      <section className="border-y border-stone-200 bg-cream" aria-label="Why book direct">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Why book direct"
            title="A clearer way to explore a stay"
            lede="Our goal is to help guests explore homeowner listings directly. This preview is not an active booking or payment service."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_DIRECT.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-soft text-clay-dark">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Concierge AI teaser — honest: in development, no fake functionality */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Concierge AI">
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <p className="flex items-center gap-2">
                <SampleBadge />
                <span className="text-xs font-medium text-stone-500">In development</span>
              </p>
              <h2 className="mt-3 flex items-center gap-2 font-display text-2xl font-medium text-ink">
                <IconSparkle className="h-6 w-6 text-clay" aria-hidden />
                Kipper concierge AI
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-stone-600">
                We&apos;re building Kipper, an AI concierge for Casa Pacifica —
                instant answers to your questions, self check-in help, and
                local recommendations, backed by a human host for anything
                that needs judgment. It&apos;s not live yet; this page will
                show it working when it is.
              </p>
            </div>
            <div className="flex items-center bg-cream p-8 sm:p-10">
              <ul className="space-y-4 text-sm leading-relaxed text-stone-600">
                <li className="flex gap-3">
                  <IconMessage className="mt-0.5 h-5 w-5 shrink-0 text-clay-dark" aria-hidden />
                  <span><strong className="font-medium text-ink">Guest answers</strong> — check-in, amenities, house rules, straight from the property brief.</span>
                </li>
                <li className="flex gap-3">
                  <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-clay-dark" aria-hidden />
                  <span><strong className="font-medium text-ink">Booking help</strong> — dates, availability, and quotes without the back-and-forth.</span>
                </li>
                <li className="flex gap-3">
                  <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-clay-dark" aria-hidden />
                  <span><strong className="font-medium text-ink">Human backup</strong> — planned escalation for requests that need human review; not active in this preview.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-label="Contact">
        <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-espresso px-6 py-10 text-center shadow-card sm:px-12 md:flex-row md:text-left">
          <div>
            <h2 className="font-display text-2xl font-medium text-paper">
              Questions? Say hello.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-300">
              Trip planning, dates, or anything else — send a message and
              Contact submissions are disabled in this preview.
            </p>
          </div>
          <Link href="/contact" className="shrink-0">
            <Button size="lg">
              Contact us <IconArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
