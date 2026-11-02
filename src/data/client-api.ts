/** Browser-safe API helpers: no canonical property data or server-only fallback imports. */
import type { AvailabilityDay, Booking, Property, Quote } from "@/lib/types";
async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path, { cache: "no-store" });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}
export async function getProperty(slug: string): Promise<Property | null> {
  return (await get<{ property: Property }>(`/api/properties/${encodeURIComponent(slug)}`))?.property ?? null;
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
}): Promise<{ booking: Booking; clientSecret: string; accessToken: string }> {
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
  return data as { booking: Booking; clientSecret: string; accessToken: string };
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
