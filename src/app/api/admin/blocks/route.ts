import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { getProperty } from "@/lib/property";
import { isValidDateStr } from "@/lib/dates";
import { apiError, dateStrSchema, json, notFound, parseBody, requireAdmin } from "../../_helpers";

const blockSchema = z.object({
  propertyId: z.string().min(1),
  from: dateStrSchema,
  to: dateStrSchema,
  reason: z.string().trim().max(200).default(""),
});

/** POST /api/admin/blocks — create a manual blocked range (admin). */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = await parseBody(req, blockSchema);
  if (!parsed.ok) return parsed.response;
  const { propertyId, from, to, reason } = parsed.data;

  if (!getProperty(propertyId)) return notFound("Property not found.");
  if (!isValidDateStr(from) || !isValidDateStr(to) || to <= from) {
    return apiError("INVALID_DATES", "Block range must be valid YYYY-MM-DD dates with to > from.", 400);
  }

  const block = await getAdapter().createBlock({ propertyId, from, to, reason });
  return json({ block }, 201);
}
