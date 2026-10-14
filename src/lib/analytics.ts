/**
 * Analytics stub.
 *
 * track() currently logs to the console in non-production environments and
 * is a no-op in production. WIRE-UP POINT: when Renier picks an analytics
 * provider (PostHog, Plausible, etc.), implement the client here — every
 * call site keeps working unchanged.
 */

import type { AnalyticsEvent } from "./types";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return; // wire up a provider here
  console.log(`[analytics] ${event}`, props ?? {});
}
