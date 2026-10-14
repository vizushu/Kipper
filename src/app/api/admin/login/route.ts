import { z } from "zod";
import {
  adminSessionCookie,
  isAdminConfigured,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { apiError, json, parseBody } from "../../_helpers";

const loginSchema = z.object({ secret: z.string().min(1) });

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return apiError("UNAUTHORIZED", "Admin access is not configured (ADMIN_SECRET missing).", 500);
  }
  const parsed = await parseBody(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  if (!verifyAdminSecret(parsed.data.secret)) {
    return apiError("UNAUTHORIZED", "Invalid admin secret.", 401);
  }

  const cookie = adminSessionCookie();
  if (!cookie) return apiError("UNAUTHORIZED", "Admin access is not configured.", 500);

  const res = json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
