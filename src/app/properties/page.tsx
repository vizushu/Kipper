import type { Metadata } from "next";
import { Suspense } from "react";
import PropertiesExplorer from "./PropertiesExplorer";
import { isPublicPreview } from "@/lib/booking-launch";
import { getProperties } from "@/data/api";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "Browse Casa Pacifica — a private pool retreat in Mira Mesa, San Diego. Choose dates, guests, and amenities to explore your stay.",
};

export default async function PropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="casa-page-heading">Stays</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">
        {isPublicPreview() ? "Explore Casa Pacifica. This preview does not accept reservations or payments." : "Explore Casa Pacifica and select dates for a complete stay quote."}
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-cream" />}>
          <PropertiesExplorer properties={properties} publicPreview={isPublicPreview()} />
        </Suspense>
      </div>
    </div>
  );
}
