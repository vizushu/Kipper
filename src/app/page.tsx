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
  title: "Kipper Property Management — Book direct in San Diego",
  description:
    "Kipper Property Management — an independent San Diego host. Browse our vacation stays, including Casa Pacifica (3BR, sleeps 8, private pool), and explore direct-booking options.",
};

const WHY_DIRECT = [
  {
    icon: IconShield,
    title: "Best-rate promise",
    body: "The rate you see here is the rate we set — no platform markup, no surprises at checkout.",
  },
  {
    icon: IconCheck,
    title: "Direct host support",
    body: "Ask Kipper about your stay, dates, and accommodation.",
  },
  {
    icon: IconMessage,
    title: "Direct line to Kipper",
    body: "Questions before or during your stay go straight to your host — no ticket queues.",
  },
  {
    icon: IconPool,
    title: "Flexible communication",
    body: "Early check-in, late checkout, local tips — just ask. We'd rather say yes.",
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
                Kipper Property Management
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                A portfolio of San Diego vacation homes you can book direct —
                one host to help plan your stay.
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
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Our stays">
        <SectionHeading
          eyebrow="Our stays"
          title="One portfolio, every stay bookable here"
          lede="Every home below is hosted directly by Kipper — same stay as the marketplaces, without their fees."
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
            title="The same stay, without the middleman"
            lede="When you book here instead of a marketplace, more of what you pay goes to the home — and you get a direct line to the people who run it."
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
                Concierge AI
              </h2>
              <p className="mt-3 max-w-md text-base leading-relaxed text-stone-600">
                We&apos;re building an AI concierge for every Kipper stay —
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
                  <span><strong className="font-medium text-ink">Human backup</strong> — anything involving judgment goes straight to Kipper.</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {/* Trust strip — genuine Airbnb track record */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6" aria-label="Host track record">
        <div className="rounded-2xl border border-stone-200 bg-white px-6 py-10 text-center shadow-card sm:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
            Host track record
          </p>
          <p className="mx-auto mt-3 max-w-2xl font-display text-2xl font-medium leading-snug text-ink sm:text-3xl">
            9 years hosting on Airbnb · 383 stays welcomed
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
            This is our genuine hosting history on Airbnb — 383 guest stays over 9
            years. Guest reviews from direct stays will appear here as they come in.
          </p>
          <Link
            href="/about"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-espresso"
          >
            About Kipper
          </Link>
        </div>
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
              Kipper will get back to you.
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
