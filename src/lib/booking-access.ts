/** Scoped bearer access for one booking reference. Never log tokens or the signing key. */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 24 * 60 * 60;
function secret(): string {
  const key = process.env.BOOKING_ACCESS_SECRET;
  if (!key || Buffer.byteLength(key) < 32) throw new Error("Booking access is not configured.");
  return key;
}
export function isBookingAccessConfigured(): boolean {
  try { secret(); return true; } catch { return false; }
}
export function createBookingAccessToken(reference: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, reference, exp: Math.floor(now / 1000) + TTL_SECONDS })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function verifyBookingAccessToken(reference: string, token: string | null | undefined, now = Date.now()): boolean {
  try {
    const key = secret();
    if (!token || token.length > 2048) return false;
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p))) return false;
    const [payload, signature] = parts;
    const expected = createHmac("sha256", key).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.v === 1 && data.reference === reference && Number.isSafeInteger(data.exp) &&
      data.exp > Math.floor(now / 1000) && data.exp <= Math.floor(now / 1000) + TTL_SECONDS;
  } catch { return false; }
}
