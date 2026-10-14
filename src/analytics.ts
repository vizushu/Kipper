/**
 * Client-side analytics stub.
 *
 * `track` records a named event for the booking funnel. Right now it only
 * logs to the console; a real provider (PostHog/Plausible/etc.) can be wired
 * in later without changing call sites. The server-side stub is owned by the
 * backend track — this file is the client half.
 */
export type ClientAnalyticsEvent =
  | "search"
  | "property_view"
  | "checkout_initiated"
  | "payment_attempted"
  | "booking_completed";

export function track(
  event: ClientAnalyticsEvent,
  props?: Record<string, unknown>,
): void {
  // eslint-disable-next-line no-console
  console.log("[analytics]", event, props ?? {});
}
