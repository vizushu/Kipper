import { guestSafeBooking } from "@/lib/bookings";
import { getAdapter } from "@/lib/db";
import { json, notFound } from "../../../_helpers";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ reference: string }> }
) {
  const { reference } = await ctx.params;
  const booking = await getAdapter().getBookingByReference(reference);
  if (!booking) return notFound("Booking not found.");
  return json({ booking: guestSafeBooking(booking) });
}
