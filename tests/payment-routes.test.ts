import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import type { Booking } from "../src/lib/types";
import { POST as confirm } from "../src/app/api/bookings/[id]/confirm/route";
import { POST as webhook } from "../src/app/api/webhooks/stripe/route";

const mocks = vi.hoisted(() => ({
  tryProcessOutbox: vi.fn(), getBooking: vi.fn(), getBookingByPaymentIntentId: vi.fn(), updateBooking: vi.fn(),
  confirmBookingPayment: vi.fn(), failPendingBookingPayment: vi.fn(), recordPaymentException: vi.fn(),
  verifyPaymentIntent: vi.fn(), sendBookingConfirmation: vi.fn(), sendHostNotification: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ getAdapter: () => mocks }));
vi.mock("@/lib/stripe", () => ({ verifyPaymentIntent: mocks.verifyPaymentIntent }));
vi.mock("@/lib/bookings", () => ({ guestSafeBooking: (b: Booking) => b }));
vi.mock("@/lib/property", () => ({ getProperty: () => ({ id: "casa-pacifica" }) }));
vi.mock("@/lib/outbox", () => ({tryProcessOutbox: mocks.tryProcessOutbox}));
vi.mock("@/lib/email", () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation, sendHostNotification: mocks.sendHostNotification,
}));
const booking: Booking = {
  id: "b_1", reference: "CP-TEST", propertyId: "casa-pacifica",
  checkIn: "2027-02-20", checkOut: "2027-02-22", nights: 2,
  guests: { adults: 2, children: 0, infants: 0 }, pets: 0,
  guest: { name: "Test Guest", email: "guest@example.test" },
  lineItems: [], totalCents: 50000, currency: "USD", status: "pending_payment",
  paymentStatus: "unpaid", stripePaymentIntentId: "pi_booking_1",
  idempotencyKey: "test-key-1", createdAt: "2027-01-01T00:00:00Z",
};
const pi = {
  id: "pi_booking_1", status: "succeeded", amount: 50000, amount_received: 50000,
  currency: "usd", livemode: false,
  metadata: { mode: "test", booking_id: "b_1", property_id: booking.propertyId, check_in: booking.checkIn, check_out: booking.checkOut },
};
function confirmation(id = pi.id) {
  return confirm(new Request("https://example.test/api/bookings/b_1/confirm", {
    method: "POST", body: JSON.stringify({ paymentIntentId: id }),
  }), { params: Promise.resolve({ id: "b_1" }) });
}
function eventRequest(object = pi, type = "payment_intent.succeeded", signed = true) {
  const payload = JSON.stringify({ id: "evt_test", type, livemode: false, data: { object } });
  const signature = new Stripe("sk_test_fixture").webhooks.generateTestHeaderString({ payload, secret: "whsec_fixture" });
  return new Request("https://example.test/api/webhooks/stripe", {
    method: "POST", body: payload, headers: signed ? { "stripe-signature": signature } : {},
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BOOKING_TEST_MODE", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
  mocks.recordPaymentException.mockResolvedValue({created:true});
  mocks.getBooking.mockResolvedValue({ ...booking });
  mocks.getBookingByPaymentIntentId.mockResolvedValue({ ...booking });
  mocks.confirmBookingPayment.mockResolvedValue({ booking: { ...booking, status: "confirmed", paymentStatus: "paid_test" }, transitioned: true });
  mocks.verifyPaymentIntent.mockResolvedValue({ ...pi, amountCents: pi.amount, amountReceivedCents: pi.amount_received });
});
afterEach(() => vi.unstubAllEnvs());

describe("confirmation route", () => {
  it("rejects another intent before retrieval or mutation", async () => {
    expect((await confirmation("pi_other")).status).toBe(400);
    expect(mocks.verifyPaymentIntent).not.toHaveBeenCalled();
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("rejects another intent even for an already confirmed booking", async () => {
    mocks.getBooking.mockResolvedValue({ ...booking, status: "confirmed" });
    expect((await confirmation("pi_other")).status).toBe(400);
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("rejects cancelled reservations without mutation", async () => {
    mocks.getBooking.mockResolvedValue({ ...booking, status: "cancelled" });
    expect((await confirmation()).status).toBe(409);
    expect(mocks.recordPaymentException).toHaveBeenCalled();
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("does not poison the booking on incomplete payment", async () => {
    mocks.verifyPaymentIntent.mockResolvedValue({ ...pi, status: "processing", amountCents: 50000, amountReceivedCents: 0 });
    expect((await confirmation()).status).toBe(400);
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("confirms valid payment and sends receipts", async () => {
    expect((await confirmation()).status).toBe(200);
    expect(mocks.confirmBookingPayment).toHaveBeenCalledWith(booking.id, pi.id, expect.any(String));
    expect(mocks.tryProcessOutbox).toHaveBeenCalledTimes(1);
  });
  it("does not send receipts if persistence fails", async () => {
    mocks.confirmBookingPayment.mockResolvedValue(null);
    expect((await confirmation()).status).toBe(409);
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled();
  });
});
describe("webhook route", () => {
  it("fails closed when secret is absent, even with a signed event", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await webhook(eventRequest())).status).toBe(503);
    expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
  });
  it("rejects unsigned events before reading bookings", async () => {
    expect((await webhook(eventRequest(pi, "payment_intent.succeeded", false))).status).toBe(400);
    expect(mocks.getBookingByPaymentIntentId).not.toHaveBeenCalled();
  });
  it("rejects signed but mismatched amounts without mutation", async () => {
    expect((await webhook(eventRequest({ ...pi, amount: 100 }))).status).toBe(200);
    expect(mocks.recordPaymentException).toHaveBeenCalled();
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("does not revive a cancelled booking", async () => {
    mocks.getBookingByPaymentIntentId.mockResolvedValue({ ...booking, status: "cancelled" });
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("does not downgrade a confirmed booking on late failure", async () => {
    mocks.getBookingByPaymentIntentId.mockResolvedValue({ ...booking, status: "confirmed" });
    expect((await webhook(eventRequest({ ...pi, status: "requires_payment_method" }, "payment_intent.payment_failed"))).status).toBe(200);
    expect(mocks.updateBooking).not.toHaveBeenCalled();
    expect(mocks.confirmBookingPayment).not.toHaveBeenCalled();
  });
  it("confirms a valid signed test success", async () => {
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(mocks.confirmBookingPayment).toHaveBeenCalledWith(booking.id, pi.id, expect.any(String));
    expect(mocks.tryProcessOutbox).toHaveBeenCalledTimes(1);
  });
});

describe("atomic payment lifecycle races", () => {
  it("does not send a second receipt when another confirmation wins", async () => {
    mocks.confirmBookingPayment.mockResolvedValue({ booking: { ...booking, status: "confirmed" }, transitioned: false });
    expect((await confirmation()).status).toBe(200);
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendHostNotification).not.toHaveBeenCalled();
  });
  it("does not send a duplicate webhook receipt after a competing confirmation", async () => {
    mocks.confirmBookingPayment.mockResolvedValue({ booking: { ...booking, status: "confirmed" }, transitioned: false });
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled();
  });
  it("rejects a webhook if cancellation or hold expiry wins after the initial read", async () => {
    mocks.confirmBookingPayment.mockResolvedValue(null);
    expect((await webhook(eventRequest())).status).toBe(200);
    expect(mocks.recordPaymentException).toHaveBeenCalled();
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled();
    expect(mocks.updateBooking).not.toHaveBeenCalled();
  });
  it("uses a conditional pending-only failure transition", async () => {
    mocks.failPendingBookingPayment.mockResolvedValue(false);
    expect((await webhook(eventRequest({ ...pi, status: "requires_payment_method" }, "payment_intent.payment_failed"))).status).toBe(200);
    expect(mocks.failPendingBookingPayment).toHaveBeenCalledWith(booking.id, pi.id);
    expect(mocks.updateBooking).not.toHaveBeenCalled();
  });
});
