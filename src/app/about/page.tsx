import type { Metadata } from "next";
import Link from "next/link";
import TitleBlock from "@/components/TitleBlock";
import HostCard from "@/components/HostCard";
import HighlightCard from "@/components/HighlightCard";
import { Button } from "@/components/ui";
import {
  IconKey,
  IconMessage,
  IconShield,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "About",
  description:
    "Kipper Property Management — an independent San Diego host running vacation stays with AI-operated hospitality. Founded by Renier De La Cruz.",
};

const PILLARS = [
  {
    icon: IconShield,
    title: "Book direct, skip the markup",
    body: "Explore our accommodation and contact Kipper about your dates. Online booking is not open yet.",
  },
  {
    icon: IconKey,
    title: "Self check-in, fully managed",
    body: "Smart-lock entry, clear arrival details, and a host who actually answers — before, during, and after your stay.",
  },
  {
    icon: IconMessage,
    title: "AI-operated, human-backed",
    body: "We're building a Concierge AI that handles questions, check-in, and requests across every stay — with Kipper behind it for anything that needs judgment.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <TitleBlock
        name="Kipper Property Management"
        place="San Diego, California"
        facts={["Independent host", "AI-operated hospitality", "Book direct"]}
      />

      <div className="mt-10">
        <HostCard />
      </div>

      <div className="prose-like mt-10 space-y-4 text-base leading-relaxed text-stone-600">
        <p>
          Kipper Property Management is an independent San Diego hosting
          company founded by Renier De La Cruz. We run vacation stays the way
          we'd want to stay in them: thoughtfully kept homes, honest pricing,
          and a host you can actually reach.
        </p>
        <p>
          Our first home is Casa Pacifica — Mira Mesa, San Diego —
          a 3-bedroom, 2-bathroom retreat that sleeps 8, with a private heated
          pool in the heart of Mira Mesa, minutes from La Jolla.
        </p>
        <p>
          Behind the scenes, we're building a Concierge AI: instant answers
          for guests, self check-in that just works, and operations — pricing,
          supplies, turnovers — run with real ownership. It's in development
          now, and every stay we add makes it sharper.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">
          Host track record
        </p>
        <p className="mt-3 font-display text-2xl font-medium leading-snug text-ink">
          9 years hosting on Airbnb · 383 stays welcomed
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Our genuine hosting history on Airbnb. Guest reviews from direct
          stays will appear here as they come in.
        </p>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-2xl font-medium text-ink">
          How we operate
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-1">
          {PILLARS.map((p) => (
            <HighlightCard key={p.title} icon={p.icon} title={p.title} body={p.body} />
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-stone-500">
          Questions about a stay, or interested in having us host your property?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contact">
            <Button size="lg">Contact us</Button>
          </Link>
          <Link href="/properties">
            <Button size="lg" variant="secondary">Browse stays</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
