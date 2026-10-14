/**
 * Server-side admin API helpers — forward the session cookie to the
 * backend /api/admin/* routes (backend-owned). All calls are defensive:
 * failures resolve to null / [] so pages render honest empty states.
 */
import { headers } from "next/headers";
import type { BlockedRange, Booking, RateOverride } from "@/lib/types";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function adminGet<T>(path: string): Promise<T | null> {
  try {
    const h = await headers();
    const res = await fetch(`${baseUrl()}${path}`, {
      headers: { cookie: h.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getAdminBookings(): Promise<Booking[]> {
  const data = await adminGet<{ bookings: Booking[] }>("/api/admin/bookings");
  return data?.bookings ?? [];
}

export async function getAdminBlocks(propertyId: string): Promise<BlockedRange[]> {
  const data = await adminGet<{ blocks: BlockedRange[] }>(
    `/api/admin/blocks?propertyId=${encodeURIComponent(propertyId)}`,
  );
  return data?.blocks ?? [];
}

export interface AdminSettings {
  cleaningFeeCents: number;
  taxRatePct: number;
  minStayNights: number;
  maxStayNights: number;
  sampleFlags?: { cleaningFeeCents: boolean; taxRatePct: boolean };
}

export async function getAdminSettings(): Promise<AdminSettings | null> {
  return adminGet<{ settings: AdminSettings }>("/api/admin/settings").then(
    (d) => d?.settings ?? null,
  );
}

export async function getRateOverrides(
  propertyId: string,
  from: string,
  to: string,
): Promise<RateOverride[]> {
  const data = await adminGet<{ overrides: RateOverride[] }>(
    `/api/admin/rates?propertyId=${encodeURIComponent(propertyId)}&from=${from}&to=${to}`,
  );
  return data?.overrides ?? [];
}
