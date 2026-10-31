import { assertCalendarReady } from "@/lib/calendar-sync";
import { isBookingEnabled, BOOKING_LAUNCH_MESSAGE } from "@/lib/booking-launch";
import { computeAvailabilityDays } from "@/lib/availability";
import { addDays, isValidDateStr, todayInLA } from "@/lib/dates";
import { BookingError } from "@/lib/types";
import { loadPricingContext } from "../_context";
import { apiError, bookingErrorResponse, json, notFound } from "../_helpers";

const DEFAULT_WINDOW_DAYS = 60;
const MAX_WINDOW_DAYS = 365;

export async function GET(req: Request) {
  if (!isBookingEnabled()) return apiError("BOOKING_NOT_OPEN", BOOKING_LAUNCH_MESSAGE, 503);
  const url = new URL(req.url);
  const propertyId = url.searchParams.get("propertyId") ?? "casa-pacifica";
  let from = url.searchParams.get("from") ?? todayInLA();
  let to = url.searchParams.get("to") ?? addDays(from, DEFAULT_WINDOW_DAYS);

  if (!isValidDateStr(from) || !isValidDateStr(to)) {
    return apiError("INVALID_DATES", "from/to must be valid YYYY-MM-DD dates.", 400);
  }
  if (to <= from) {
    return apiError("INVALID_DATES", "to must be after from.", 400);
  }
  // Cap the window so a stray request can't ask for a decade of days.
  const cappedTo = addDays(from, MAX_WINDOW_DAYS);
  if (to > cappedTo) to = cappedTo;

  const ctx = await loadPricingContext(propertyId, from, to);
  if (!ctx) return notFound("Property not found.");

  try {
    await assertCalendarReady(ctx.adapter, ctx.property.id);
    const days = computeAvailabilityDays({
      property: ctx.property,
      settings: ctx.settings,
      rateOverrides: ctx.overrides,
      from,
      to,
      bookings: ctx.bookings,
      blocks: ctx.blocks,
    });
    return json({ days });
  } catch (e) {
    if (e instanceof BookingError) return bookingErrorResponse(e);
    throw e;
  }
}
