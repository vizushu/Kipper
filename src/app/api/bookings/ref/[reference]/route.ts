import { isPublicPreview } from "@/lib/booking-launch";
import { verifyBookingAccessToken } from "@/lib/booking-access";
import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { json, notFound } from "../../../_helpers";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ reference: string }> }
) {
  if (isPublicPreview()) return notFound("Booking not found.");
  const { reference } = await ctx.params;
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!verifyBookingAccessToken(reference, token)) return notFound("Booking not found.");
  const booking = await getAdapter().getBookingByReference(reference);
  if (!booking) return notFound("Booking not found.");
  const response = json({ booking: guestSafeBooking(booking) });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
