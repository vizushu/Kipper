import { createHash } from "node:crypto";
import { getAdapter } from "@/lib/db";
import { z } from "zod";
import {
  adminSessionCookie,
  ADMIN_SESSION_TTL_SECONDS,
  isSameOrigin,
  isAdminConfigured,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { apiError, json, parseBody } from "../../_helpers";

const loginSchema = z.object({ secret: z.string().min(1).max(1024) });

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return apiError("UNAUTHORIZED", "Admin access is not available.", 401);
  }
  if (!isSameOrigin(req)) return apiError("INVALID_ORIGIN", "Same-origin login required.", 403);
  try {
    const limit = await getAdapter().consumeRateLimit(createHash("sha256").update("admin-login:global:v1").digest("hex"), 20, 900);
    if (!limit.allowed) {
      const response = apiError("RATE_LIMITED", "Too many sign-in attempts. Please try again later.", 429);
      response.headers.set("Retry-After", String(limit.retryAfterSeconds));
      return response;
    }
  } catch { return apiError("AUTH_UNAVAILABLE", "Admin sign-in temporarily unavailable.", 503); }
  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  if (!verifyAdminSecret(parsed.data.secret)) {
    return apiError("UNAUTHORIZED", "Invalid admin secret.", 401);
  }

  let cookie;
  try { cookie = await adminSessionCookie(); } catch { return apiError("AUTH_UNAVAILABLE", "Admin sign-in temporarily unavailable.", 503); }
  if (!cookie) return apiError("UNAUTHORIZED", "Admin access is not configured.", 500);

  const res = json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  return res;
}
