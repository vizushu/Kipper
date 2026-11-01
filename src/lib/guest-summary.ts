import type { GuestCount } from "./types";

/** Shared formatting only: safe in both React server and client components. */
export function guestSummary(g: GuestCount): string {
  const parts: string[] = [];
  const total = g.adults + g.children + g.infants;
  parts.push(`${total} guest${total === 1 ? "" : "s"}`);
  if (g.infants > 0) parts.push(`including ${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}
