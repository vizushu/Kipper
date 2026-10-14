import { z } from "zod";
import { assertRangeAvailable } from "@/lib/availability";
import { computeQuote } from "@/lib/pricing";
import { BookingError } from "@/lib/types";
import { loadPricingContext } from "../_context";
import {
  bookingErrorResponse,
  dateStrSchema,
  guestsSchema,
  json,
  notFound,
  parseBody,
} from "../_helpers";

const quoteSchema = z.object({
  propertyId: z.string().min(1),
  checkIn: dateStrSchema,
  checkOut: dateStrSchema,
  guests: guestsSchema,
  pets: z.number().int().min(0).optional().default(0),
  promoCode: z.string().trim().min(1).max(32).optional(),
});

export async function POST(req: Request) {
  const parsed = await parseBody(req, quoteSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const ctx = await loadPricingContext(body.propertyId, body.checkIn, body.checkOut);
  if (!ctx) return notFound("Property not found.");

  try {
    // Availability + min/max-stay validation before pricing.
    assertRangeAvailable({
      settings: ctx.settings,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      bookings: ctx.bookings,
      blocks: ctx.blocks,
    });

    const quote = computeQuote({
      property: ctx.property,
      settings: ctx.settings,
      rateOverrides: ctx.overrides,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      pets: body.pets,
      promoCode: body.promoCode,
    });

    await ctx.adapter.saveQuote(quote);
    return json({ quote });
  } catch (e) {
    if (e instanceof BookingError) return bookingErrorResponse(e);
    throw e;
  }
}
