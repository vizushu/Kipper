import { getAdapter } from "@/lib/db";
import { createBookingAccessToken } from "@/lib/booking-access";
import { isRecoveryEnabled, isRecoveryToken, recoveryTokenHash, recoveryBucket, recoveryWindow } from "@/lib/booking-recovery";
import { json } from "../../../_helpers";
function invalid() { return json({ error: "Recovery link is invalid or expired." }, 400); }
export async function POST(req: Request) {
  if (!isRecoveryEnabled()) return json({ error: "Booking recovery is not enabled." }, 503);
  try {
    const adapter = getAdapter();
    const now = Date.now();
    if (!await adapter.consumeRecoveryRateLimit(recoveryBucket("exchange-global", "all"), recoveryWindow(now), 300)) return invalid();
    const body = await req.json();
    if (!isRecoveryToken(body?.token)) return invalid();
    const recovered = await adapter.consumeBookingRecovery(recoveryTokenHash(body.token), new Date(now).toISOString());
    if (!recovered) return invalid();
    const response = json({ reference: recovered.reference, accessToken: createBookingAccessToken(recovered.reference) });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return invalid(); }
}
