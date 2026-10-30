import type { Metadata } from "next";
import Link from "next/link";
import TitleBlock from "@/components/TitleBlock";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "About Casa Pacifica",
  description: "Explore Casa Pacifica in Mira Mesa, San Diego. Kipper concierge AI is in development.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <TitleBlock name="Casa Pacifica" place="Mira Mesa · San Diego" facts={["3 bedrooms", "Maximum 8 people", "Preview"]} />
      <div className="mt-10 space-y-4 text-base leading-relaxed text-stone-600">
        <p>Casa Pacifica is the accommodation and booking website. Kipper is the concierge AI in development, not the property brand.</p>
        <p>Explore Casa Pacifica in Mira Mesa, San Diego. The current accommodation has 3 bedrooms and a maximum of 8 people total, including infants and visitors.</p>
        <p>Kipper is not presented here as the property manager, legal host, or payment recipient. Final contracting and merchant account details will be disclosed before reservations open.</p>
        <p>This preview accepts no reservations or payments. Concierge AI features are in development, not a promise of currently available automated service.</p>
      </div>
      <div className="mt-12 flex justify-center">
        <Link href="/properties"><Button size="lg" variant="secondary">Explore stays</Button></Link>
      </div>
    </div>
  );
}
