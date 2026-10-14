import type { NextRequest } from "next/server";
import { getAdapter } from "@/lib/db";
import { json, requireAdmin } from "../../_helpers";

/** GET /api/admin/bookings?propertyId=&status= — list bookings (admin). */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const bookings = await getAdapter().listBookings({
    propertyId: url.searchParams.get("propertyId") ?? undefined,
    status:
      status === "confirmed" || status === "pending_payment" || status === "cancelled"
        ? status
        : undefined,
  });
  return json({ bookings });
}
