/** Random, hashed, server-expiring admin sessions. Preview never authenticates. */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { isPublicPreview } from './booking-launch';
import { getAdapter } from './db';

export const ADMIN_COOKIE_NAME = 'cp_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 3600;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function adminSecret(): string | undefined {
  return isPublicPreview() ? undefined : process.env.ADMIN_SECRET || undefined;
}
function safeEqual(a: string, b: string): boolean {
  // Compare fixed-sized digests rather than leaking candidate length through a short circuit.
  return timingSafeEqual(Buffer.from(hash(a), 'hex'), Buffer.from(hash(b), 'hex'));
}
function version(secret: string): string { return hash('cp-admin-secret-version:v2:' + secret); }
export function isAdminConfigured(): boolean { return !!adminSecret(); }
export function verifyAdminSecret(candidate: string): boolean {
  const secret = adminSecret();
  return !!secret && !!candidate && safeEqual(candidate, secret);
}
export function hasAdminMachineCredential(req: Request): boolean {
  return verifyAdminSecret(req.headers.get('x-admin-secret') ?? '');
}
/** Never trust forwarded-host headers for origin authorization. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    const expected = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? req.url;
    return new URL(origin).origin === new URL(expected).origin && origin === new URL(origin).origin;
  } catch { return false; }
}
export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  if (hasAdminMachineCredential(req)) return true;
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const session = await getAdapter().getAdminSession(hash(token));
    return !!session && session.revokedAt === null &&
      Number.isFinite(Date.parse(session.expiresAt)) &&
      Date.parse(session.expiresAt) > Date.now() &&
      Date.parse(session.createdAt) <= Date.now() &&
      safeEqual(session.secretVersion, version(secret));
  } catch { return false; }
}
/** Returned raw token is delivered only in an HttpOnly cookie; only its hash is stored. */
export async function adminSessionCookie(): Promise<{ name: string; value: string } | null> {
  const secret = adminSecret();
  if (!secret) return null;
  const value = randomBytes(32).toString('hex');
  const now = Date.now();
  await getAdapter().createAdminSession({
    tokenHash: hash(value), secretVersion: version(secret), createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString(), revokedAt: null,
  });
  return { name: ADMIN_COOKIE_NAME, value };
}
export async function revokeAdminSession(req: NextRequest): Promise<void> {
  if (isPublicPreview()) throw new Error('Preview admin access disabled');
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await getAdapter().revokeAdminSession(hash(token), new Date().toISOString());
  }
}
