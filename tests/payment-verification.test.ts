import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import type { Booking } from "../src/lib/types";
import {
  assertPaymentBinding,
  assertSuccessfulPayment,
  PaymentVerificationError,
  verifyTestWebhook,
  type PaymentEvidence,
} from "../src/lib/payment-verification";

const booking: Booking = {
  id: "b_1", reference: "CP-TEST", propertyId: "casa-pacifica",
  checkIn: "2027-02-20", checkOut: "2027-02-22", nights: 2,
  guests: { adults: 2, children: 0, infants: 0 }, pets: 0,
  guest: { name: "Test Guest", email: "guest@example.test" },
  lineItems: [], totalCents: 50000, currency: "USD",
  status: "pending_payment", paymentStatus: "unpaid",
  stripePaymentIntentId: "pi_booking_1", idempotencyKey: "test-key-1",
  createdAt: "2027-01-01T00:00:00Z",
};
const evidence: PaymentEvidence = {
  id: "pi_booking_1", status: "succeeded", amountCents: 50000,
  amountReceivedCents: 50000, currency: "usd", livemode: false,
  metadata: { mode: "test", booking_id: "b_1", property_id: "casa-pacifica", check_in: "2027-02-20", check_out: "2027-02-22" },
};

describe("payment evidence is bound to the reservation", () => {
  it("accepts a successful fully paid test intent for the matching reservation", () => {
    expect(() => assertSuccessfulPayment(booking, evidence)).not.toThrow();
  });
  it("rejects a same-amount payment from another booking", () => {
    expect(() => assertSuccessfulPayment(booking, { ...evidence, id: "pi_other" })).toThrow("does not belong");
  });
  it("rejects a reservation without a stored payment intent", () => {
    expect(() => assertPaymentBinding({ ...booking, stripePaymentIntentId: undefined }, evidence)).toThrow("does not belong");
  });
  it.each([
    ["currency", { currency: "eur" }],
    ["amount", { amountCents: 49999 }],
    ["live payment", { livemode: true }],
    ["incomplete collection", { amountReceivedCents: 49999 }],
    ["processing payment", { status: "processing" }],
  ] as const)("rejects %s", (_name, change) => {
    expect(() => assertSuccessfulPayment(booking, { ...evidence, ...change })).toThrow(PaymentVerificationError);
  });
  it.each(["mode", "booking_id", "property_id", "check_in", "check_out"])("rejects mismatched %s metadata", (key) => {
    expect(() => assertPaymentBinding(booking, {
      ...evidence, metadata: { ...evidence.metadata, [key]: "wrong" },
    })).toThrow(PaymentVerificationError);
  });
  it("does not confirm a cancelled reservation even with valid payment evidence", () => {
    expect(() => assertSuccessfulPayment({ ...booking, status: "cancelled" }, evidence)).toThrow("cancelled");
  });
  it("can validate failure-event binding without claiming success", () => {
    expect(() => assertPaymentBinding(booking, { ...evidence, status: "requires_payment_method", amountReceivedCents: 0 })).not.toThrow();
    expect(() => assertSuccessfulPayment(booking, { ...evidence, status: "requires_payment_method", amountReceivedCents: 0 })).toThrow("not complete");
  });
});

describe("signed test webhooks", () => {
  const key = "sk_test_local_fixture";
  const secret = "whsec_local_fixture";
  const stripe = new Stripe(key);
  const payload = JSON.stringify({ id: "evt_test", type: "payment_intent.succeeded", livemode: false, data: { object: { id: "pi_booking_1" } } });
  const sign = (body: string, signingSecret = secret) => stripe.webhooks.generateTestHeaderString({ payload: body, secret: signingSecret });

  it("accepts an authenticated test event", () => {
    expect(verifyTestWebhook(payload, sign(payload), key, secret).id).toBe("evt_test");
  });
  it("fails closed when webhook secret is missing", () => {
    try {
      verifyTestWebhook(payload, sign(payload), key, undefined);
      throw new Error("Should reject missing configuration");
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentVerificationError);
      expect((error as PaymentVerificationError).httpStatus).toBe(503);
    }
  });
  it.each([undefined, "sk_live_never_allowed", "unrecognized_key"])("rejects unsupported API key %s", (invalidKey) => {
    expect(() => verifyTestWebhook(payload, sign(payload), invalidKey, secret)).toThrow("not configured");
  });
  it("rejects missing signature", () => {
    expect(() => verifyTestWebhook(payload, null, key, secret)).toThrow("Missing stripe-signature");
  });
  it("rejects modified content", () => {
    expect(() => verifyTestWebhook(payload + " ", sign(payload), key, secret)).toThrow("Invalid webhook signature");
  });
  it("rejects a signature from a different secret", () => {
    expect(() => verifyTestWebhook(payload, sign(payload, "whsec_wrong"), key, secret)).toThrow("Invalid webhook signature");
  });
  it("rejects signed live-mode events", () => {
    const livePayload = JSON.stringify({ ...JSON.parse(payload), livemode: true });
    expect(() => verifyTestWebhook(livePayload, sign(livePayload), key, secret)).toThrow("Live payment events");
  });
});
