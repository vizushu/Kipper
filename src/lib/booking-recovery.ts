/** Recovery secrets are bearer credentials: store only token hashes outside the private delivery outbox. */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isBookingAccessConfigured } from "./booking-access";
import { isPublicPreview } from "./booking-launch";
export const RECOVERY_TTL_MS = 15 * 60 * 1000;
export const RECOVERY_GENERIC_RESPONSE = {
  message: "If these details match a booking, recovery instructions will be prepared. Delivery is not enabled in this test environment.",
};
export function isRecoveryEnabled(): boolean {
  return !isPublicPreview() && process.env.BOOKING_RECOVERY_MODE === "true" && isBookingAccessConfigured();
}
export function recoveryToken(): string { return randomBytes(32).toString("base64url"); }
export function recoveryTokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function isRecoveryToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function normalizedRecoveryEmail(email: string): string { return email.trim().toLowerCase(); }
export function recoveryEmailMatches(provided: string, stored: string): boolean {
  return timingSafeEqual(createHash("sha256").update(normalizedRecoveryEmail(provided)).digest(), createHash("sha256").update(normalizedRecoveryEmail(stored)).digest());
}
export function recoveryBucket(kind: string, value: string): string {
  if (!isBookingAccessConfigured()) throw new Error("Recovery is not configured.");
  return createHmac("sha256", process.env.BOOKING_ACCESS_SECRET!).update(`recovery:${kind}:${value}`).digest("hex");
}
export function recoveryWindow(now: number): string {
  return new Date(Math.floor(now / 3600000) * 3600000).toISOString();
}
