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
  AvailabilityDay,
  Booking,
  Property,
  PropertySummary,
  Quote,
} from "@/lib/types";
import { FALLBACK_PROPERTIES, PROPERTY } from "./property";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
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
  return slug === PROPERTY.slug ? PROPERTY : null;
}

export async function getAvailability(
  propertyId: string,
  from: string,
  to: string,
): Promise<AvailabilityDay[] | null> {
  return get<{ days: AvailabilityDay[] }>(
    `/api/availability?propertyId=${encodeURIComponent(propertyId)}&from=${from}&to=${to}`,
  ).then((d) => (d ? d.days : null));
}

export async function getBookingByReference(
  reference: string,
): Promise<Booking | null> {
  const data = await get<{ booking: Booking }>(
    `/api/bookings/ref/${encodeURIComponent(reference)}`,
  );
  return data?.booking ?? null;
}

/** POST a quote request. Returns the quote or throws with the backend message. */
export async function requestQuote(input: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: { adults: number; children: number; infants: number };
  pets?: number;
  promoCode?: string;
}): Promise<Quote> {
  const res = await fetch("/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string }).error ?? "Could not price this stay.",
    );
    (err as { code?: string }).code = (data as { code?: string }).code;
    throw err;
  }
  return (data as { quote: Quote }).quote;
}

export async function createBooking(input: {
  quoteId: string;
  guest: { name: string; email: string; phone?: string };
  idempotencyKey: string;
}): Promise<{ booking: Booking; clientSecret: string }> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? "Could not start your booking.",
    );
  }
  return data as { booking: Booking; clientSecret: string };
}

export async function confirmBooking(
  bookingId: string,
  paymentIntentId: string,
): Promise<{ booking: Booking }> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? "Could not confirm your booking.",
    );
  }
  return data as { booking: Booking };
}
