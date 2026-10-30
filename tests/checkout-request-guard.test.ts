import { expect, it } from "vitest";
import { createCheckoutRequestGuard } from "../src/app/checkout/CheckoutClient";
it("rejects an old quote when a newer request starts", () => {
  const guard = createCheckoutRequestGuard();
  const first = guard.begin(); const second = guard.begin();
  expect(guard.isCurrent(first)).toBe(false);
  expect(guard.isCurrent(second)).toBe(true);
});
it("invalidates in-flight responses on disconnect, reconnect or input changes", () => {
  const guard = createCheckoutRequestGuard();
  const request = guard.begin(); guard.invalidate();
  expect(guard.isCurrent(request)).toBe(false);
  guard.invalidate();
  expect(guard.isCurrent(request)).toBe(false);
  const explicitlyRechecked = guard.begin();
  expect(guard.isCurrent(explicitlyRechecked)).toBe(true);
});
it("late resolution cannot overwrite a newly rechecked result", async () => {
  const guard = createCheckoutRequestGuard();
  let resolveOld!: (value: string) => void;
  const old = new Promise<string>((resolve) => { resolveOld = resolve; });
  const first = guard.begin();
  let visible = "";
  const pending = old.then((value) => { if (guard.isCurrent(first)) visible = value; });
  guard.invalidate();
  const second = guard.begin();
  if (guard.isCurrent(second)) visible = "fresh-price";
  resolveOld("stale-price"); await pending;
  expect(visible).toBe("fresh-price");
});
