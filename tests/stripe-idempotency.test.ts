import { afterEach, expect, it, vi } from "vitest";
import { createPaymentIntent } from "../src/lib/stripe";
import type { Quote } from "../src/lib/types";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("stripe", () => ({ default: class { paymentIntents = { create: mock.create }; } }));
afterEach(() => vi.unstubAllEnvs());
it("uses stable booking metadata across refreshed quote IDs", async () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  mock.create.mockResolvedValue({ id: "pi_test", client_secret: "test_fixture", amount: 50000, status: "requires_payment_method" });
  const quote = { id: "quote_old", propertyId: "casa-pacifica", checkIn: "2027-02-20", checkOut: "2027-02-22", totalCents: 50000, currency: "USD" } as Quote;
  await createPaymentIntent(quote, "same-idempotency-key", "booking_stable");
  await createPaymentIntent({ ...quote, id: "quote_refreshed" }, "same-idempotency-key", "booking_stable");
  expect(mock.create.mock.calls[0]).toEqual(mock.create.mock.calls[1]);
  expect(mock.create.mock.calls[0][0].metadata).toEqual(expect.objectContaining({ booking_id: "booking_stable" }));
  expect(mock.create.mock.calls[0][0].metadata).not.toHaveProperty("booking_quote_id");
});
