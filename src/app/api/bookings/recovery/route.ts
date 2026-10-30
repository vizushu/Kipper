import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { isRecoveryEnabled, RECOVERY_GENERIC_RESPONSE, RECOVERY_TTL_MS, recoveryBucket, recoveryEmailMatches, recoveryToken, recoveryTokenHash, recoveryWindow } from "@/lib/booking-recovery";
import { json } from "../../_helpers";
const schema = z.object({ reference: z.string().trim().min(1).max(64), email: z.string().trim().email().max(254) });
function generic() {
  const response = json(RECOVERY_GENERIC_RESPONSE, 202);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export async function POST(req: Request) {
  // Must precede parsing, adapter access, or notification preparation.
  if (!isRecoveryEnabled()) return json({ error: "Booking recovery is not enabled." }, 503);
  try {
    const adapter = getAdapter();
    const now = Date.now();
    const window = recoveryWindow(now);
    if (!await adapter.consumeRecoveryRateLimit(recoveryBucket("request-global", "all"), window, 100)) return generic();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return generic();
    const reference = parsed.data.reference.toUpperCase();
    if (!await adapter.consumeRecoveryRateLimit(recoveryBucket("reference", reference), window, 3)) return generic();
    const booking = await adapter.getBookingByReference(reference);
    if (!booking || !recoveryEmailMatches(parsed.data.email, booking.guest.email)) return generic();
    const token = recoveryToken();
    await adapter.createBookingRecovery({
      tokenHash: recoveryTokenHash(token), bookingId: booking.id, reference: booking.reference,
      expiresAt: new Date(now + RECOVERY_TTL_MS).toISOString(), createdAt: new Date(now).toISOString(),
    }, { recipient: booking.guest.email, token });
  } catch {
    // Identical outward response for malformed input, missing matches, rate limits and delivery/storage failure.
    // Never log request bodies, guest email, or recovery credentials.
  }
  return generic();
}
