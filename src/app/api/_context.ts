/**
 * Shared route helper: load everything pricing/availability need for a
 * property + date window (property, settings, rate overrides, overlapping
 * bookings, overlapping blocks).
 */

import { getProperty } from "@/lib/property";
import { getAdapter, type DataAdapter } from "@/lib/db";
import type { PricingSettings } from "@/lib/pricing";
import type { BlockedRange, Booking, Property } from "@/lib/types";

export interface PricingContext {
  adapter: DataAdapter;
  property: Property;
  settings: PricingSettings;
  overrides: Record<string, number>;
  bookings: Booking[];
  blocks: BlockedRange[];
}

/** Returns null when the property id/slug is unknown. */
export async function loadPricingContext(
  propertyIdOrSlug: string,
  from: string,
  to: string
): Promise<PricingContext | null> {
  const property = getProperty(propertyIdOrSlug);
  if (!property) return null;
  const adapter = getAdapter();
  const [settings, overrideList, bookings, allBlocks] = await Promise.all([
    adapter.getSettings(),
    adapter.getRateOverrides(property.id, from, to),
    adapter.findOverlappingBookings(property.id, from, to),
    adapter.listBlocks(property.id),
  ]);
  return {
    adapter,
    property,
    settings,
    overrides: Object.fromEntries(overrideList.map((o) => [o.date, o.rateCents])),
    bookings,
    blocks: allBlocks.filter((b) => b.from < to && b.to > from),
  };
}
