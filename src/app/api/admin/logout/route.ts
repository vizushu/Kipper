import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, isAdminConfigured, isSameOrigin, revokeAdminSession } from '@/lib/admin-auth';
import { apiError, json } from '../../_helpers';

/** Logout revokes server-side before clearing the cookie, including expired sessions. */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) return apiError('UNAUTHORIZED', 'Admin access is not available.', 401);
  if (!isSameOrigin(req)) return apiError('INVALID_ORIGIN', 'Same-origin logout required.', 403);
  try { await revokeAdminSession(req); } catch {
    return apiError('AUTH_UNAVAILABLE', 'Sign-out was not recorded. Please retry.', 503);
  }
  const response = json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0,
  });
  return response;
}
