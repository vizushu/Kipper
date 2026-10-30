import { afterEach, describe, expect, it, vi } from "vitest";
import { isStripeConfigured, verifyPaymentIntent } from "../src/lib/stripe";

afterEach(() => vi.unstubAllEnvs());

describe("test-only Stripe credentials", () => {
  it.each(["", "sk_live_example", "rk_live_example", "rk_test_example", "unknown"])(
    "rejects %s before making a network request",
    async (key) => {
      vi.stubEnv("STRIPE_SECRET_KEY", key);
      expect(isStripeConfigured()).toBe(false);
      await expect(verifyPaymentIntent("pi_unused")).rejects.toThrow();
    }
  );
  it("advertises configured only for explicit test secret keys", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    expect(isStripeConfigured()).toBe(true);
  });
});
