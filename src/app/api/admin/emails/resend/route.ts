import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdapter } from "@/lib/db";
import { processOutbox } from "@/lib/outbox";
import { getProperty } from "@/lib/property";
import { apiError, json, notFound, parseBody, requireAdmin } from "../../../_helpers";

const resendSchema = z.object({
  bookingId: z.string().min(1),
  type: z.enum(["guest", "host"]),
});

/** Compatibility endpoint: retry only the selected due receipt, never force a duplicate resend. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const parsed = await parseBody(req, resendSchema);
  if (!parsed.ok) return parsed.response;

  const adapter = getAdapter();
  const booking = await adapter.getBooking(parsed.data.bookingId);
  if (!booking) return notFound("Booking not found.");
  const property = getProperty(booking.propertyId);
  if (!property) return apiError("INVALID_REQUEST", "Property for this booking no longer exists.", 400);

  if (booking.status !== "confirmed") return apiError("INVALID_REQUEST", "Only confirmed bookings can have a receipt retried.", 409);
  await adapter.ensureReceiptOutbox(booking.id);
  const kind = parsed.data.type === "guest" ? "guest_confirmation" : "host_notification";
  const job = (await adapter.listOutbox()).find(j => j.bookingId === booking.id && j.kind === kind);
  if (!job) return notFound("Receipt job not found.");
  // Never reset attempts/window or create a fresh provider key after uncertain delivery.
  if (["sent", "simulated", "dead", "suppressed"].includes(job.status)) {
    return json({ ok: false, bookingId: booking.id, type: parsed.data.type, status: job.status,
      action: "not_retried", message: "Terminal receipt cannot be retried here. Review delivery history separately; no duplicate message was created." }, 409);
  }
  const delivery = await processOutbox(adapter, { jobId: job.id, limit: 1 });
  const current = (await adapter.listOutbox()).find(j => j.id === job.id);
  return json({ ok: true, bookingId: booking.id, type: parsed.data.type, status: current?.status,
    action: delivery.disabled ? "delivery_disabled" : delivery.claimed ? "attempted" : "not_due_or_claimed", delivery });
}
