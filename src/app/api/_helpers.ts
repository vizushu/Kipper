/**
 * Shared helpers for API routes: JSON responses, error mapping, zod schemas.
 *
 * Domain errors (BookingError) map to 400, except UNAVAILABLE → 409.
 * Malformed request bodies map to 400 with code "INVALID_REQUEST"
 * (documented in docs/API.md).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/types";
import { isAdminRequest } from "@/lib/admin-auth";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: {"Cache-Control": "private, no-store"} });
}

export function apiError(code: string, message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message, code }, { status, headers: {"Cache-Control": "private, no-store"} });
}

export function notFound(message = "Not found"): NextResponse {
  return apiError("NOT_FOUND", message, 404);
}

export function unauthorized(): NextResponse {
  return apiError("UNAUTHORIZED", "Unauthorized — provide the x-admin-secret header or log in.", 401);
}

/** Admin guard: returns a 401 response when the request is not admin, else null. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  return isAdminRequest(req) ? null : unauthorized();
}

export function bookingErrorResponse(e: BookingError): NextResponse {
  const status = e.code === "UNAVAILABLE" ? 409 : 400;
  return apiError(e.code, e.message, status);
}

export const dateStrSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a valid YYYY-MM-DD date");

export const guestsSchema = z.object({
  adults: z.number().int(),
  children: z.number().int(),
  infants: z.number().int(),
});

export function zodErrorResponse(e: z.ZodError): NextResponse {
  const message = e.errors
    .map((x) => `${x.path.join(".") || "body"}: ${x.message}`)
    .join("; ");
  return apiError("INVALID_REQUEST", message, 400);
}

/** Parse + validate a JSON body with a zod schema. */
export async function parseBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: apiError("INVALID_REQUEST", "Request body must be valid JSON.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: zodErrorResponse(parsed.error) };
  return { ok: true, data: parsed.data };
}
