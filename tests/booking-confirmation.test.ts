import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Page from "../src/app/booking/[reference]/page";
// Model the Next.js server boundary: importing a callable helper from this client module must fail.
vi.mock("@/components/GuestSelector", () => { throw new Error("Client-only module imported by server confirmation"); });
const mock = vi.hoisted(() => ({ lookup: vi.fn(), token: "scoped-token" as string | undefined }));
vi.mock("@/data/api", () => ({ getBookingByReference: mock.lookup }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mock.token ? { value: mock.token } : undefined }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
const booking = {
  reference: "CP-ABC", status: "pending_payment", paymentStatus: "unpaid",
  guest: { name: "Test", email: "guest@example.test" }, guests: { adults: 2, children: 0, infants: 0 },
  pets: 0, nights: 2, checkIn: "2027-02-20", checkOut: "2027-02-22", lineItems: [], totalCents: 50000,
};
const args = { params: Promise.resolve({ reference: "CP-ABC" }) };
beforeEach(() => { vi.stubGlobal("React", React); mock.lookup.mockReset(); mock.token="scoped-token"; });
afterEach(() => vi.unstubAllGlobals());
it("uses original snapshotted terms and passes capability to private lookup", async () => {
  mock.lookup.mockResolvedValue({ ...booking, staySnapshot: {
    propertyName: "Original property name", checkInTime: "4:15 PM", checkOutTime: "10:30 AM",
    cancellationPolicy: "Original agreed cancellation terms", houseRules: ["Original agreed rule"],
  } });
  const html = renderToStaticMarkup(await Page(args));
  expect(mock.lookup).toHaveBeenCalledWith("CP-ABC", "scoped-token");
  for (const expected of ["Original property name", "4:15 PM", "10:30 AM", "Original agreed cancellation terms", "Original agreed rule"]) expect(html).toContain(expected);
  expect(html).not.toMatch(/password|network credentials/i);
  expect(html).not.toContain("Your booking is confirmed");
});
it("does not backfill mutable policies for legacy bookings", async () => {
  mock.lookup.mockResolvedValue(booking);
  const html = renderToStaticMarkup(await Page(args));
  expect(html).toContain("Consult your original confirmation for the agreed terms.");
  expect(html).not.toContain("3:00 PM");
  expect(html).not.toContain("Firm:");
});
it("requires capability before lookup", async () => {
  mock.token=undefined;
  await expect(Page(args)).rejects.toThrow("NOT_FOUND");
  expect(mock.lookup).not.toHaveBeenCalled();
});
it("distinguishes synthetic confirmation from a real paid reservation", async () => {
 mock.lookup.mockResolvedValue({...booking,status:'confirmed',paymentStatus:'paid_test',paymentMode:'test'});
 expect(renderToStaticMarkup(await Page(args))).toContain('Test booking confirmed — no real reservation');
 mock.lookup.mockResolvedValue({...booking,status:'confirmed',paymentStatus:'paid',paymentMode:'live'});
 expect(renderToStaticMarkup(await Page(args))).toContain('Your booking is confirmed');
});

it("renders infant headcount from the server-safe shared formatter", async () => {
 mock.lookup.mockResolvedValue({...booking,guests:{adults:2,children:1,infants:1}});
 expect(renderToStaticMarkup(await Page(args))).toContain("4 guests, including 1 infant");
});
