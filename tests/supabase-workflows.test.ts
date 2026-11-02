import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SupabaseAdapter } from "../src/lib/db/supabase";
const fetchMock = vi.fn();
let adapter: SupabaseAdapter;
const now = "2026-10-30T05:30:00.000Z";
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://supabase.example.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
  adapter = new SupabaseAdapter();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function reply(value: unknown) { fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(value), { status: 200 })); }
function call() { const [url, options] = fetchMock.mock.calls.at(-1)!; return { url, options, body: options.body ? JSON.parse(options.body) : undefined }; }
it("maps frozen SQL booking payload and outbox lease fields to application types", async () => {
  reply([{ id: "mail1", booking_id: "b1", kind: "guest_confirmation", dedupe_key: "guest_confirmation/b1/v1", status: "processing",
    payload_json: { booking: { id: "b1", reference: "CP-ABC", property_id: "casa-pacifica", check_in: "2027-02-20", check_out: "2027-02-22", nights: 2, guests: { adults: 2 }, pets: 0, guest: { email: "fixture@example.test" }, line_items: [], total_cents: 50000, currency: "USD", status: "confirmed", payment_status: "paid_test", idempotency_key: "fixture", created_at: now, stay_snapshot: { propertyName: "Original" } } },
    envelope_json: null, attempts: 1, created_at: now, next_attempt_at: now, first_attempt_at: now, lease_token: "lease1", lease_until: now, last_error: null }]);
  const [job] = await adapter.claimOutbox(now, 10);
  expect(call().url).toContain("/rpc/claim_delivery_outbox"); expect(call().body).toEqual({ p_now: now, p_limit: 10, p_job_id: null });
  expect(job.payload.booking).toEqual(expect.objectContaining({ propertyId: "casa-pacifica", checkIn: "2027-02-20", totalCents: 50000, paymentStatus: "paid_test", staySnapshot: { propertyName: "Original" } }));
  expect(job.payload.booking).not.toHaveProperty("property_id"); expect(job.leaseToken).toBe("lease1");
});
it("passes immutable prepared envelope and exact lease token through RPC", async () => {
  const envelope = { from: "host@example.test", to: "guest@example.test", subject: "Fixture", html: "Fixture" };
  reply(envelope); expect(await adapter.prepareOutboxMessage("mail1", "lease1", envelope, now)).toEqual(envelope);
  expect(call().body).toEqual({ p_id: "mail1", p_lease_token: "lease1", p_envelope: envelope, p_now: now });
  reply(false); expect(await adapter.finishOutbox("mail1", "expired-lease", "sent", now)).toBe(false);
  expect(call().body.p_lease_token).toBe("expired-lease");
});
it("uses atomic recovery RPCs without querying raw recovery tables", async () => {
  reply(true); expect(await adapter.consumeRecoveryRateLimit("opaquehash", now, 3)).toBe(true);
  expect(call().body).toEqual({ p_bucket_hash: "opaquehash", p_window_start: now, p_limit: 3 });
  const input = { tokenHash: "hash", bookingId: "b1", reference: "CP-ABC", expiresAt: "2026-10-30T05:45:00.000Z", createdAt: now };
  const notification = { recipient: "guest@example.test", token: "sensitive-fixture" };
  reply(null); await adapter.createBookingRecovery(input, notification);
  expect(call().url).toContain("/rpc/create_booking_recovery"); expect(call().body).toEqual({ p_input: input, p_notification: notification });
  reply({ reference: "CP-ABC" }); expect(await adapter.consumeBookingRecovery("hash", now)).toEqual({ reference: "CP-ABC" });
  expect(call().url).toContain("/rpc/consume_booking_recovery");
});
it("surfaces missing migration/RPC instead of claiming successful delivery", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: "RPC not installed" }), { status: 404 }));
  await expect(adapter.ensureReceiptOutbox("b1")).rejects.toThrow("RPC not installed");
});

it("scopes manual receipt claims to the exact selected job",async()=>{reply([]);expect(await adapter.claimOutbox(now,1,'selected-job')).toEqual([]);expect(call().body).toEqual({p_now:now,p_limit:1,p_job_id:'selected-job'});});
