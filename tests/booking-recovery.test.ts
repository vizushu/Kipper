import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as requestRecovery } from "../src/app/api/bookings/recovery/route";
import { POST as exchangeRecovery } from "../src/app/api/bookings/recovery/exchange/route";
import { recoveryToken, recoveryTokenHash, recoveryEmailMatches, recoveryBucket, recoveryWindow, RECOVERY_GENERIC_RESPONSE } from "../src/lib/booking-recovery";
import { verifyBookingAccessToken } from "../src/lib/booking-access";
const mock = vi.hoisted(() => ({ getAdapter: vi.fn(), consumeRecoveryRateLimit: vi.fn(), getBookingByReference: vi.fn(), createBookingRecovery: vi.fn(), consumeBookingRecovery: vi.fn() }));
vi.mock("@/lib/db", () => ({ getAdapter: mock.getAdapter }));
const body = { reference: "CP-ABC", email: "guest@example.test" };
function req(value: unknown) { return new Request("https://example.test/api/bookings/recovery", { method: "POST", body: JSON.stringify(value) }); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SITE_PREVIEW_MODE", "false"); vi.stubEnv("BOOKING_RECOVERY_MODE", "true");
  vi.stubEnv("BOOKING_ACCESS_SECRET", "recovery-test-key-at-least-thirty-two-bytes");
  mock.getAdapter.mockReturnValue(mock);
  mock.consumeRecoveryRateLimit.mockResolvedValue(true);
  mock.getBookingByReference.mockResolvedValue({ id: "b_1", reference: "CP-ABC", guest: { email: "guest@example.test" } });
  mock.createBookingRecovery.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("recovery privacy and preview gates", () => {
  it.each([requestRecovery, exchangeRecovery])("blocks public preview before body parsing or DB access", async (route) => {
    vi.stubEnv("SITE_PREVIEW_MODE", "true");
    const request = req(body); const parse = vi.spyOn(request, "json");
    expect((await route(request)).status).toBe(503);
    expect(parse).not.toHaveBeenCalled(); expect(mock.getAdapter).not.toHaveBeenCalled();
  });
  it.each(["", "false"])("requires explicit recovery enablement", async (setting) => {
    vi.stubEnv("BOOKING_RECOVERY_MODE", setting);
    expect((await requestRecovery(req(body))).status).toBe(503);
    expect(mock.getAdapter).not.toHaveBeenCalled();
  });
  it("fails closed if signing secret is unavailable", async () => {
    vi.stubEnv("BOOKING_ACCESS_SECRET", "");
    expect((await requestRecovery(req(body))).status).toBe(503);
    expect(mock.getAdapter).not.toHaveBeenCalled();
  });
  it("does not enumerate reference existence or email match", async () => {
    const matched = await requestRecovery(req(body));
    mock.getBookingByReference.mockResolvedValue(null);
    const missing = await requestRecovery(req(body));
    mock.getBookingByReference.mockResolvedValue({ guest: { email: "different@example.test" } });
    const mismatch = await requestRecovery(req(body));
    const malformed = await requestRecovery(req({}));
    for (const response of [matched, missing, mismatch, malformed]) {
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual(RECOVERY_GENERIC_RESPONSE);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
    expect(mock.createBookingRecovery).toHaveBeenCalledTimes(1);
  });
  it("keeps persistence/delivery failure private", async () => {
    mock.createBookingRecovery.mockRejectedValue(new Error("private database details"));
    const response = await requestRecovery(req(body));
    expect(response.status).toBe(202); expect(await response.json()).toEqual(RECOVERY_GENERIC_RESPONSE);
  });
});
describe("bounded recovery preparation", () => {
  it("stores only a token hash in recovery record and limits expiry to 15 minutes", async () => {
    await requestRecovery(req({ reference: " cp-abc ", email: " GUEST@example.test " }));
    const [record, notification] = mock.createBookingRecovery.mock.calls[0];
    expect(record.tokenHash).toBe(recoveryTokenHash(notification.token));
    expect(record).not.toHaveProperty("token"); expect(record).not.toHaveProperty("email");
    expect(Date.parse(record.expiresAt) - Date.parse(record.createdAt)).toBe(900000);
    expect(notification.recipient).toBe("guest@example.test");
    expect(notification.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("rate limits globally before parsing or lookup", async () => {
    mock.consumeRecoveryRateLimit.mockResolvedValue(false);
    const request = req(body); const parse = vi.spyOn(request, "json");
    expect((await requestRecovery(request)).status).toBe(202);
    expect(parse).not.toHaveBeenCalled(); expect(mock.getBookingByReference).not.toHaveBeenCalled();
    expect(mock.consumeRecoveryRateLimit).toHaveBeenCalledWith(expect.any(String), expect.any(String), 100);
  });
  it("rate limits normalized reference before lookup, independent of guessed email", async () => {
    mock.consumeRecoveryRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await requestRecovery(req(body));
    expect(mock.consumeRecoveryRateLimit).toHaveBeenNthCalledWith(2, recoveryBucket("reference", "CP-ABC"), expect.any(String), 3);
    expect(mock.getBookingByReference).not.toHaveBeenCalled(); expect(mock.createBookingRecovery).not.toHaveBeenCalled();
  });
});
describe("one-time credential exchange", () => {
  it("exchanges a consumed token for a scoped capability, never booking details", async () => {
    const token = recoveryToken(); mock.consumeBookingRecovery.mockResolvedValue({ reference: "CP-ABC" });
    const response = await exchangeRecovery(req({ token })); const result = await response.json();
    expect(response.status).toBe(200); expect(result).not.toHaveProperty("booking");
    expect(verifyBookingAccessToken("CP-ABC", result.accessToken)).toBe(true);
    expect(verifyBookingAccessToken("CP-OTHER", result.accessToken)).toBe(false);
    expect(mock.consumeBookingRecovery).toHaveBeenCalledWith(recoveryTokenHash(token), expect.any(String));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("gives identical failure for used/expired/unknown tokens", async () => {
    mock.consumeBookingRecovery.mockResolvedValue(null);
    const response = await exchangeRecovery(req({ token: recoveryToken() }));
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "Recovery link is invalid or expired." });
  });
  it("does not query token storage for malformed tokens or exhausted global limit", async () => {
    expect((await exchangeRecovery(req({ token: "short" }))).status).toBe(400);
    mock.consumeRecoveryRateLimit.mockResolvedValue(false);
    expect((await exchangeRecovery(req({ token: recoveryToken() }))).status).toBe(400);
    expect(mock.consumeBookingRecovery).not.toHaveBeenCalled();
  });
});
it("uses opaque keyed rate buckets and normalized email comparisons", () => {
  expect(recoveryBucket("reference", "CP-ABC")).toMatch(/^[a-f0-9]{64}$/);
  expect(recoveryEmailMatches(" GUEST@EXAMPLE.test ", "guest@example.test")).toBe(true);
  expect(recoveryEmailMatches("other@example.test", "guest@example.test")).toBe(false);
  expect(recoveryWindow(Date.UTC(2026, 9, 30, 5, 27))).toBe("2026-10-30T05:00:00.000Z");
  expect(recoveryToken()).not.toBe(recoveryToken());
});
