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
it("rejects an expired or unmounted wallet callback before contacting the provider", async () => {
 const provider=vi.fn();const complete=vi.fn();const server=vi.fn();
 await expect(confirmWalletPayment({confirmCardPayment:provider} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete} as unknown as PaymentRequestPaymentMethodEvent,server,()=>false)).rejects.toThrow('expired or was closed');
 expect(complete).toHaveBeenCalledExactlyOnceWith('fail');expect(provider).not.toHaveBeenCalled();expect(server).not.toHaveBeenCalled();
});
it("still reconciles a payment already submitted before the UI closes", async () => {
 let active=true;const complete=vi.fn();const server=vi.fn();
 const provider=vi.fn().mockImplementation(async()=>{active=false;return {paymentIntent:{id:'pi_synthetic',status:'succeeded'}};});
 await confirmWalletPayment({confirmCardPayment:provider} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete} as unknown as PaymentRequestPaymentMethodEvent,server,()=>active);
 expect(server).toHaveBeenCalledExactlyOnceWith('pi_synthetic');
});
it("does not begin a new authentication action after the hold becomes inactive", async () => {
 let active=true;const complete=vi.fn();const server=vi.fn();
 const provider=vi.fn().mockImplementation(async()=>{active=false;return {paymentIntent:{id:'pi_synthetic',status:'requires_action'}};});
 await expect(confirmWalletPayment({confirmCardPayment:provider} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete} as unknown as PaymentRequestPaymentMethodEvent,server,()=>active)).rejects.toThrow('closed before authentication');
 expect(provider).toHaveBeenCalledTimes(1);expect(server).not.toHaveBeenCalled();
});
it("reconciles old in-flight success without mutating a newer flow or its unresolved marker", async () => {
 const {createCheckoutRequestGuard}=await import('../src/app/checkout/CheckoutClient');
 const guard=createCheckoutRequestGuard();guard.begin();const capturedGeneration=guard.snapshot();
 let resolve!: (value:unknown)=>void;
 const pending=new Promise(resolvePromise=>{resolve=resolvePromise;});
 const server=vi.fn().mockResolvedValue(undefined);const updateUI=vi.fn();const clearMarker=vi.fn();
 const onConfirm=async(id:string)=>{await server(id);if(!guard.isCurrent(capturedGeneration))return;updateUI();clearMarker();};
 const work=confirmWalletPayment({confirmCardPayment:vi.fn().mockReturnValue(pending)} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete:vi.fn()} as unknown as PaymentRequestPaymentMethodEvent,onConfirm);
 guard.invalidate();guard.begin();resolve({paymentIntent:{id:'pi_old_synthetic',status:'succeeded'}});await work;
 expect(server).toHaveBeenCalledExactlyOnceWith('pi_old_synthetic');expect(updateUI).not.toHaveBeenCalled();expect(clearMarker).not.toHaveBeenCalled();
});
it('checks server inventory before wallet authorization and rejects stale availability',async()=>{const provider=vi.fn(),complete=vi.fn(),server=vi.fn(),preflight=vi.fn().mockRejectedValue(new Error('availability changed'));await expect(confirmWalletPayment({confirmCardPayment:provider} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete} as unknown as PaymentRequestPaymentMethodEvent,server,()=>true,preflight)).rejects.toThrow('availability changed');expect(preflight).toHaveBeenCalledTimes(1);expect(provider).not.toHaveBeenCalled();expect(complete).toHaveBeenCalledExactlyOnceWith('fail');});
it('rechecks active generation after asynchronous inventory verification',async()=>{let active=true;const provider=vi.fn(),complete=vi.fn();await expect(confirmWalletPayment({confirmCardPayment:provider} as unknown as Stripe,'synthetic_secret',{paymentMethod:{id:'pm_synthetic'},complete} as unknown as PaymentRequestPaymentMethodEvent,vi.fn(),()=>active,async()=>{active=false;})).rejects.toThrow('expired during verification');expect(provider).not.toHaveBeenCalled();});
