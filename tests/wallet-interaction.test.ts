import React from "react";
import type { PaymentRequest, PaymentRequestPaymentMethodEvent, Stripe } from "@stripe/stripe-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaymentRequestButton, confirmWalletPayment } from "../src/components/CheckoutForm";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("invokes the real PaymentRequest.show API directly on user click", () => {
  const show = vi.fn(); const onError = vi.fn();
  const button = PaymentRequestButton({ paymentRequest: { show } as unknown as PaymentRequest, label: "Pay", disabled: false, onError });
  expect(show).not.toHaveBeenCalled();
  button.props.onClick();
  expect(show).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});
it("reports unsupported wallet invocation instead of silently rendering blank", () => {
  const onError = vi.fn();
  const button = PaymentRequestButton({ paymentRequest: { show: () => { throw new Error("unsupported"); } } as unknown as PaymentRequest, label: "Pay", disabled: false, onError });
  button.props.onClick(); expect(onError).toHaveBeenCalledTimes(1);
});
it("completes the wallet before authentication then calls server confirmation", async () => {
  const confirm = vi.fn().mockResolvedValueOnce({ paymentIntent: { id: "pi_test", status: "requires_action" } }).mockResolvedValueOnce({ paymentIntent: { id: "pi_test", status: "succeeded" } });
  const complete = vi.fn(); const serverConfirm = vi.fn();
  await confirmWalletPayment({ confirmCardPayment: confirm } as unknown as Stripe, "test_secret", { paymentMethod: { id: "pm_test" }, complete } as unknown as PaymentRequestPaymentMethodEvent, serverConfirm);
  expect(confirm).toHaveBeenNthCalledWith(1, "test_secret", { payment_method: "pm_test" }, { handleActions: false });
  expect(complete).toHaveBeenCalledExactlyOnceWith("success");
  expect(complete.mock.invocationCallOrder[0]).toBeLessThan(confirm.mock.invocationCallOrder[1]);
  expect(serverConfirm).toHaveBeenCalledExactlyOnceWith("pi_test");
});
it("completes wallet failure once without confirming the booking", async () => {
  const complete = vi.fn(); const serverConfirm = vi.fn();
  await expect(confirmWalletPayment({ confirmCardPayment: vi.fn().mockResolvedValue({ error: { message: "declined" } }) } as unknown as Stripe, "test_secret", { paymentMethod: { id: "pm_test" }, complete } as unknown as PaymentRequestPaymentMethodEvent, serverConfirm)).rejects.toThrow("declined");
  expect(complete).toHaveBeenCalledExactlyOnceWith("fail");
  expect(serverConfirm).not.toHaveBeenCalled();
});
