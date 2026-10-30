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
    a: "Booking directly lets you coordinate your stay with the Casa Pacifica booking contact. Compare accommodation details and dates; no best-rate guarantee is made.",
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
    a: "Early check-in and late checkout are not guaranteed. Any request needs approval from the verified booking contact.",
  },
  ...PROPERTY.faqs,
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions, answered"
        lede="Everything about booking direct and staying at Casa Pacifica. Still curious? Consult your verified booking contact."
      />
      <div className="mt-8">
        <FaqAccordion faqs={SITE_FAQS} />
      </div>
    </div>
  );
}
