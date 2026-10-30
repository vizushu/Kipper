import type { Metadata } from "next";
import { Suspense } from "react";
import PropertiesExplorer from "./PropertiesExplorer";
import { getProperties } from "@/data/api";

export const metadata: Metadata = {
  title: "Stays",
  description:
    "Browse Casa Pacifica — a private pool retreat in Mira Mesa, San Diego. Filter by dates, guests, price, and amenities. Best rate when you book direct.",
};

export default async function PropertiesPage() {
  const properties = await getProperties();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">Stays</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-600">
        Explore homeowner accommodation on Kipper Stays. This preview does not accept reservations or payments.
      </p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl bg-cream" />}>
          <PropertiesExplorer properties={properties} />
        </Suspense>
      </div>
    </div>
  );
}
