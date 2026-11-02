import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingAccessToken, isBookingAccessConfigured, verifyBookingAccessToken } from "../src/lib/booking-access";
import { GET } from "../src/app/api/bookings/ref/[reference]/route";
const mock = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAdapter: () => ({ getBookingByReference: mock.lookup }) }));
vi.mock("@/lib/bookings", () => ({ guestSafeBooking: (b: unknown) => b }));
const secret = "test-only-secret-at-least-thirty-two-bytes";
const now = Date.UTC(2026, 9, 30);
beforeEach(() => { vi.stubEnv("BOOKING_ACCESS_SECRET", secret); mock.lookup.mockReset(); });
afterEach(() => vi.unstubAllEnvs());
describe("scoped booking capabilities", () => {
  it("accepts a token only for its own reference", () => {
    const token = createBookingAccessToken("CP-ABC", now);
    expect(verifyBookingAccessToken("CP-ABC", token, now)).toBe(true);
    expect(verifyBookingAccessToken("CP-OTHER", token, now)).toBe(false);
  });
  it("expires exactly after 24 hours", () => {
    const token = createBookingAccessToken("CP-ABC", now);
    expect(verifyBookingAccessToken("CP-ABC", token, now + 86400000 - 1)).toBe(true);
    expect(verifyBookingAccessToken("CP-ABC", token, now + 86400000)).toBe(false);
  });
  it("rejects payload and signature tampering", () => {
    const token = createBookingAccessToken("CP-ABC", now);
    const [payload, signature] = token.split(".");
    const altered = Buffer.from(JSON.stringify({ v: 1, reference: "CP-OTHER", exp: now / 1000 + 86400 })).toString("base64url");
    expect(verifyBookingAccessToken("CP-OTHER", `${altered}.${signature}`, now)).toBe(false);
    expect(verifyBookingAccessToken("CP-ABC", `${payload}.${signature.slice(0, -1)}!`, now)).toBe(false);
  });
  it.each([undefined, "", "a", "a.b", "a.b.c", "x".repeat(2050)])("rejects malformed token", (token) => {
    expect(verifyBookingAccessToken("CP-ABC", token, now)).toBe(false);
  });
  it.each(["", "too-short"])("fails closed without a strong configured secret", (key) => {
    const token = createBookingAccessToken("CP-ABC", now);
    vi.stubEnv("BOOKING_ACCESS_SECRET", key);
    expect(isBookingAccessConfigured()).toBe(false);
    expect(() => createBookingAccessToken("CP-ABC", now)).toThrow();
    expect(verifyBookingAccessToken("CP-ABC", token, now)).toBe(false);
  });
  it("invalidates tokens upon secret rotation", () => {
    const token = createBookingAccessToken("CP-ABC", now);
    vi.stubEnv("BOOKING_ACCESS_SECRET", secret + "rotated");
    expect(verifyBookingAccessToken("CP-ABC", token, now)).toBe(false);
  });
});
describe("private reference lookup route", () => {
  const request = (token?: string) => GET(new Request("https://example.test/api/bookings/ref/CP-ABC", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }), { params: Promise.resolve({ reference: "CP-ABC" }) });
  it("does not query storage without valid capability", async () => {
    expect((await request()).status).toBe(404);
    expect((await request(createBookingAccessToken("CP-OTHER"))).status).toBe(404);
    expect(mock.lookup).not.toHaveBeenCalled();
  });
  it("returns scoped details only with valid capability and prevents caching", async () => {
    mock.lookup.mockResolvedValue({ reference: "CP-ABC", guest: { email: "private@example.test" } });
    const response = await request(createBookingAccessToken("CP-ABC"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(mock.lookup).toHaveBeenCalledWith("CP-ABC");
  });
});
