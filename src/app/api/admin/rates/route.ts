import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { isValidDateStr } from "@/lib/dates";
import { apiError, dateStrSchema, json, notFound, parseBody, requireAdmin } from "../../_helpers";

const rateSchema = z.object({
  propertyId: z.string().min(1),
  date: dateStrSchema,
  rateCents: z.number().int().min(0).max(10_000_00),
});

/** POST /api/admin/rates — set a per-date nightly rate override (admin). */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const parsed = await parseBody(req, rateSchema);
  if (!parsed.ok) return parsed.response;
  const { propertyId, date, rateCents } = parsed.data;

  const property = getProperty(propertyId);
  if (!property) return notFound("Property not found.");
  if (!isValidDateStr(date)) {
    return apiError("INVALID_DATES", "date must be a valid YYYY-MM-DD date.", 400);
  }

  const override = await getAdapter().upsertRateOverride(property.id, date, rateCents);
  return json({ rateOverride: override }, 201);
}
