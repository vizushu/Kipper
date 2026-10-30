import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PropertyExperience from "@/components/PropertyExperience";
import { getProperty } from "@/data/api";
import { isPublicPreview } from "@/lib/booking-launch";
import { parseStaySelection, staySelectionKey } from "@/lib/stay-selection";
export const metadata: Metadata = {
  title: "Casa Pacifica — A San Diego getaway",
  description: "Explore Casa Pacifica in Mira Mesa, San Diego. Choose dates to review the accommodation for your stay. Reservations and payments are not open in this preview.",
};
/** Root and canonical property URL use the same real controller, never demo state. */
export default async function HomePage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const property = await getProperty("casa-pacifica");
  if (!property) notFound();
  const selection = parseStaySelection(await searchParams ?? {}, Math.min(property.maxGuests, property.maxTotalOccupancy), property.maxStayNights);
  return <article className="mx-auto max-w-[1164px] pb-6 sm:px-[22px]"><PropertyExperience key={staySelectionKey(property.id, selection)} initialSelection={selection} publicPreview={isPublicPreview()} property={{ ...property, address: "", zip: "", latitude: 0, longitude: 0 }} /></article>;
}
