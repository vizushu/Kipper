import type { Metadata } from "next";
import FaqAccordion from "@/components/FaqAccordion";
import { SectionHeading } from "@/components/ui";
import { PROPERTY } from "@/data/property";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about booking and staying at Casa Pacifica — check-in, pool, pets, parking, cancellation.",
};

const SITE_FAQS = [
  {
    q: "Why should I book direct instead of Airbnb?",
    a: "The same stay, without the markup. Marketplaces add 14%+ in guest service fees on top of the nightly rate. Booking here, that money stays out of your bill — and you get a direct line to Kipper, your host, instead of a support queue.",
  },
  {
    q: "How do payments work?",
    a: "The full stay total is charged securely at booking through Stripe — the same payment processor used by millions of businesses. We never see or store your card details. In test mode, only Stripe test cards are accepted and no real charges are made.",
  },
  {
    q: "How do I get my entry code?",
    a: "Check-in is fully self-service with a smart lock. Your personal entry code is sent to your booking email before arrival — no key handoff, no waiting around.",
  },
  {
    q: "Can I get an early check-in or late checkout?",
    a: "Often, yes — it depends on the cleaning schedule around your dates. Just ask Kipper after booking and we'll do our best.",
  },
  ...PROPERTY.faqs,
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions, answered"
        lede="Everything about booking direct and staying at Casa Pacifica. Still curious? Message Kipper after booking."
      />
      <div className="mt-8">
        <FaqAccordion faqs={SITE_FAQS} />
      </div>
    </div>
  );
}
