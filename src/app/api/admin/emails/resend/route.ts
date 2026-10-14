import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { sendBookingConfirmation, sendHostNotification } from "@/lib/email";
import { getProperty } from "@/lib/property";
import { apiError, json, notFound, parseBody, requireAdmin } from "../../../_helpers";

const resendSchema = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["guest", "host"]),
});

/** POST /api/admin/emails/resend — re-send guest or host email for a booking (admin). */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = await parseBody(req, resendSchema);
  if (!parsed.ok) return parsed.response;

  const adapter = getAdapter();
  const booking = await adapter.getBooking(parsed.data.bookingId);
  if (!booking) return notFound("Booking not found.");
  const property = getProperty(booking.propertyId);
  if (!property) return apiError("INVALID_REQUEST", "Property for this booking no longer exists.", 400);

  if (parsed.data.type === "guest") {
    await sendBookingConfirmation(booking, property);
  } else {
    await sendHostNotification(booking, property);
  }
  return json({ ok: true, bookingId: booking.id, type: parsed.data.type });
}
