import { getBookingPaymentMode } from "@/lib/payment-mode";
import type { Metadata } from "next";
import Link from "next/link";
import TitleBlock from "@/components/TitleBlock";
import { Button } from "@/components/ui";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "About Casa Pacifica",
  description: "Explore Casa Pacifica in Mira Mesa, San Diego. Kipper concierge AI is in development.",
};

export default function AboutPage() {
  const live = getBookingPaymentMode() === "live";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <TitleBlock name="Casa Pacifica" place="Mira Mesa · San Diego" facts={["3 bedrooms", "8 overnight guests", live ? "Direct booking" : "Bookings closed"]} />
      <div className="mt-10 space-y-4 text-base leading-relaxed text-stone-600">
        <p>Casa Pacifica is the accommodation and booking website. Kipper is the concierge AI in development, not the property brand.</p>
        <p>Explore Casa Pacifica in Mira Mesa, San Diego. The current accommodation has 3 bedrooms and a maximum of 8 overnight guests, including children and infants. Up to 10 people may be on the property including approved daytime visitors.</p>
        <p>Casa Pacifica is operated by Renier De La Cruz. Contact vizushu@gmail.com for stay questions. Stripe processes direct-booking payments.</p>
        <p>{live ? "Select dates to check availability and review the complete stay total before payment." : "New reservations and payments are not open here."} Concierge AI features are in development, not a promise of currently available automated service.</p>
      </div>
      <div className="mt-12 flex justify-center">
        <Link href="/properties"><Button size="lg" variant="secondary">Explore stays</Button></Link>
      </div>
    </div>
  );
}
