import type { Metadata } from "next";
import Link from "next/link";
import TitleBlock from "@/components/TitleBlock";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Kipper",
  description: "Kipper is a concierge-AI startup developing tools for guests and homeowners. Explore the Kipper Stays preview.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <TitleBlock name="Kipper" place="Concierge AI in development" facts={["Guest experience", "Homeowner stays", "Preview"]} />
      <div className="mt-10 space-y-4 text-base leading-relaxed text-stone-600">
        <p>Kipper is a concierge-AI startup building tools to help guests explore homeowner listings and communicate about their stays.</p>
        <p>Kipper Stays is our accommodation website preview, beginning with Casa Pacifica in Mira Mesa, San Diego. The current accommodation has 3 bedrooms and a maximum of 8 people total, including infants and visitors.</p>
        <p>Kipper is not presented here as the property manager, legal host, or payment recipient. Final contracting and merchant account details will be disclosed before reservations open.</p>
        <p>This preview accepts no reservations or payments. Concierge AI features are in development, not a promise of currently available automated service.</p>
      </div>
      <div className="mt-12 flex justify-center">
        <Link href="/properties"><Button size="lg" variant="secondary">Explore stays</Button></Link>
      </div>
    </div>
  );
}
