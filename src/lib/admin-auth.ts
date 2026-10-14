/**
 * Admin authentication for /api/admin/* routes.
 *
 * Two accepted credentials on every admin request (checked by isAdminRequest):
 *   1. `x-admin-secret` header equal to ADMIN_SECRET, or
 *   2. `cp_admin_session` httpOnly cookie, issued by POST /api/admin/login
 *      when the posted secret matches ADMIN_SECRET.
 *
 * The cookie value is a SHA-256 of a namespaced ADMIN_SECRET — stateless,
 * no server-side session store needed. ADMIN_SECRET must be set in the
 * environment; admin routes return 401 when it is missing.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "cp_admin_session";
const COOKIE_NAMESPACE = "cp-admin-session:v1:";

function adminSecret(): string | undefined {
  return process.env.ADMIN_SECRET || undefined;
}

function expectedCookieValue(): string | null {
  const secret = adminSecret();
  if (!secret) return null;
  return createHash("sha256").update(COOKIE_NAMESPACE + secret).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** True when the request carries the admin secret header or a valid admin cookie. */
export function isAdminRequest(req: NextRequest): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  const header = req.headers.get("x-admin-secret");
  if (header && safeEqual(header, secret)) return true;
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const expected = expectedCookieValue();
  if (cookie && expected && safeEqual(cookie, expected)) return true;
  return false;
}

/** Set-Cookie parts for the admin session (used by POST /api/admin/login). */
export function adminSessionCookie(): { name: string; value: string } | null {
  const value = expectedCookieValue();
  if (!value) return null;
  return { name: ADMIN_COOKIE_NAME, value };
}

/** True when ADMIN_SECRET is configured at all. */
export function isAdminConfigured(): boolean {
  return !!adminSecret();
}

/** Constant-time comparison of a candidate secret against ADMIN_SECRET. */
export function verifyAdminSecret(candidate: string): boolean {
  const secret = adminSecret();
  if (!secret || !candidate) return false;
  return safeEqual(candidate, secret);
}
