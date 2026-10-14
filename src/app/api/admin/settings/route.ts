import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { json, parseBody, requireAdmin } from "../../_helpers";

const promoSchema = z.object({
  code: z.string().trim().min(1).max(32),
  type: z.literal("percent"),
  percent: z.number().min(1).max(100),
  description: z.string().max(200).optional(),
});

const settingsSchema = z.object({
  cleaningFeeCents: z.number().int().min(0).max(100_000),
  taxRatePct: z.number().min(0).max(100),
  minStayNights: z.number().int().min(1).max(365),
  maxStayNights: z.number().int().min(1).max(365),
  promos: z.array(promoSchema).max(50),
}).partial().refine(
  (s) =>
    s.minStayNights === undefined ||
    s.maxStayNights === undefined ||
    s.minStayNights <= s.maxStayNights,
  { message: "minStayNights cannot exceed maxStayNights." }
);

/** GET /api/admin/settings — current pricing settings (admin). */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const settings = await getAdapter().getSettings();
  return json({ settings });
}

/** PUT /api/admin/settings — update pricing settings (admin, partial). */
export async function PUT(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const parsed = await parseBody(req, settingsSchema);
  if (!parsed.ok) return parsed.response;
  const settings = await getAdapter().updateSettings(parsed.data);
  return json({ settings });
}
