import type { NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { json, unauthorized } from "../../_helpers";

/**
 * GET /api/admin/session — check whether the current request holds a valid
 * admin session (cp_admin_session cookie) or the x-admin-secret header.
 * 200 { ok: true } when admin, 401 otherwise. Used by the admin layout to
 * decide whether to show the login screen.
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorized();
  return json({ ok: true });
}
