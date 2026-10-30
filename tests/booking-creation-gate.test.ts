import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/bookings/route";
import { getProperty } from "../src/lib/property";
import { snapshotForStay } from "../src/lib/accommodation";
const mocks = vi.hoisted(() => ({ consumeRateLimit: vi.fn(), getQuote: vi.fn(), create: vi.fn(), attach: vi.fn(), fail: vi.fn(), payment: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAdapter: () => ({ consumeRateLimit: mocks.consumeRateLimit, getQuote: mocks.getQuote, attachPaymentIntent: mocks.attach, failPendingBookingPayment: mocks.fail }) }));
vi.mock("@/lib/booking-launch", () => ({ isPublicPreview: () => false, isBookingEnabled: () => true, BOOKING_LAUNCH_MESSAGE: "disabled" }));
vi.mock("@/lib/bookings", () => ({ createBookingForQuote: mocks.create, guestSafeBooking: (b: unknown) => b }));
vi.mock("@/lib/stripe", () => ({ createPaymentIntent: mocks.payment }));
const quote = { id: "quote", propertyId: "casa-pacifica", checkIn: "2027-02-20", checkOut: "2027-02-22" };
const request = () => POST(new Request("https://example.test/api/bookings", {
  method: "POST", body: JSON.stringify({ quoteId: "quote", guest: { name: "Test Guest", email: "test@example.test" }, idempotencyKey: "test-key-123" }),
}));
beforeEach(() => { vi.stubEnv("BOOKING_TEST_MODE", "true"); vi.stubEnv("BOOKING_ACCESS_SECRET", "test-secret-at-least-thirty-two-bytes-long"); vi.clearAllMocks(); mocks.consumeRateLimit.mockResolvedValue({allowed:true,retryAfterSeconds:0}); });
afterEach(() => vi.unstubAllEnvs());
it("rejects legacy quotes with no stay snapshot before booking creation", async () => {
  mocks.getQuote.mockResolvedValue(quote);
  expect((await request()).status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects mismatched configuration versions before booking creation", async () => {
  mocks.getQuote.mockResolvedValue({ ...quote, staySnapshot: { ...snapshotForStay(getProperty("casa-pacifica")!, quote.checkIn, quote.checkOut), configurationId: "retired" } });
  expect((await request()).status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects a now-unapproved configuration even with a stored snapshot", async () => {
  mocks.getQuote.mockResolvedValue({ ...quote, checkIn: "2027-03-20", checkOut: "2027-03-22", staySnapshot: { configurationId: "future" } });
  expect((await request()).status).toBe(409);
  expect(mocks.create).not.toHaveBeenCalled();
});

function validCreation() {
  mocks.getQuote.mockResolvedValue({ ...quote, staySnapshot: snapshotForStay(getProperty("casa-pacifica")!, quote.checkIn, quote.checkOut) });
  mocks.create.mockResolvedValue({ booking: { id: "b_stable", reference: "CP-ABC", idempotencyKey: "stable-key" } });
  mocks.payment.mockResolvedValue({ id: "pi_stable", clientSecret: "test_secret" });
}
it("does not return payment credentials after hold expiry wins attachment", async () => {
  validCreation(); mocks.attach.mockResolvedValue(null);
  const response = await request();
  expect(response.status).toBe(409);
  expect(await response.json()).not.toHaveProperty("clientSecret");
  expect(mocks.attach).toHaveBeenCalledWith("b_stable", "pi_stable");
});
it("attaches conditionally and returns a scoped access token", async () => {
  validCreation(); mocks.attach.mockResolvedValue({ id: "b_stable", reference: "CP-ABC" });
  const response = await request();
  expect(response.status).toBe(201);
  expect(await response.json()).toHaveProperty("accessToken");
  expect(mocks.payment).toHaveBeenCalledWith(expect.any(Object), "stable-key", "b_stable");
});
it("does not arbitrarily mark an existing booking failed when intent creation fails", async () => {
  validCreation(); mocks.payment.mockRejectedValue(new Error("Stripe unavailable"));
  expect((await request()).status).toBe(500);
  expect(mocks.fail).not.toHaveBeenCalled();
});

it("rejects exhausted request budgets before quote, hold or payment creation", async () => {
 mocks.consumeRateLimit.mockResolvedValueOnce({allowed:false,retryAfterSeconds:75});
 const response=await request();expect(response.status).toBe(429);expect(response.headers.get('retry-after')).toBe('75');expect(mocks.getQuote).not.toHaveBeenCalled();expect(mocks.create).not.toHaveBeenCalled();expect(mocks.payment).not.toHaveBeenCalled();
});
it("fails closed when durable abuse storage is unavailable",async()=>{
 mocks.consumeRateLimit.mockRejectedValueOnce(new Error('synthetic storage failure'));
 expect((await request()).status).toBe(503);expect(mocks.create).not.toHaveBeenCalled();
});
it("enforces a hashed guest budget without storing the submitted email",async()=>{
 mocks.consumeRateLimit.mockResolvedValueOnce({allowed:true,retryAfterSeconds:0}).mockResolvedValueOnce({allowed:false,retryAfterSeconds:45});
 expect((await request()).status).toBe(429);expect(mocks.getQuote).not.toHaveBeenCalled();
 expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(1,expect.stringMatching(/^[a-f0-9]{64}$/),60,900);
 expect(mocks.consumeRateLimit).toHaveBeenNthCalledWith(2,expect.stringMatching(/^[a-f0-9]{64}$/),5,900);
 expect(JSON.stringify(mocks.consumeRateLimit.mock.calls)).not.toContain('test@example.test');
});
