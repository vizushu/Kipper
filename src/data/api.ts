/**
 * Data-access helpers for server components.
 *
 * These call the backend API routes (owned by the backend track) and fall
 * back to the verified static copy in src/data/property.ts when the API is
 * unreachable or returns an error — the UI always has something real to
 * render. Live pricing/availability comes from the API; there is no static
 * fallback for rates, so availability-dependent UI shows an honest error
 * state instead of fake numbers.
 */
import type {
  Booking,
  Property,
  PropertySummary,
} from "@/lib/types";
import { FALLBACK_PROPERTIES, PROPERTY } from "./property";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function get<T>(path: string, headers?: HeadersInit): Promise<T | null> {
  try {
    const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store", headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getProperties(): Promise<PropertySummary[]> {
  const data = await get<{ properties: PropertySummary[] }>("/api/properties");
  if (data && Array.isArray(data.properties) && data.properties.length > 0) {
    return data.properties;
  }
  return FALLBACK_PROPERTIES;
}

export async function getProperty(
  slug: string,
): Promise<Property | null> {
  const data = await get<{ property: Property }>(
    `/api/properties/${encodeURIComponent(slug)}`,
  );
  if (data?.property) return data.property;
  // Static fallback only for the known property; unknown slugs 404.
  return (slug === PROPERTY.slug || slug === "casa-pacifica-san-diego") ? PROPERTY : null;
}

export async function getBookingByReference(
  reference: string,
  accessToken: string,
): Promise<Booking | null> {
  const data = await get<{ booking: Booking }>(
    `/api/bookings/ref/${encodeURIComponent(reference)}`,
    { authorization: `Bearer ${accessToken}` },
  );
  return data?.booking ?? null;
}
