# Date-specific guest pricing

Guest property summaries do not expose a static starting-nightly price, and the stays explorer has no fixed nightly-budget filter. The guest selects dates and total guest counts, then explicitly requests the existing server quote. Its complete stay total includes mandatory cleaning and applicable tax; no pets are selected in this preliminary explorer quote. Optional extras are reviewed on the property page. A quote is not a reservation or a promise that dates remain available. Checkout rechecks the stay and existing inventory/payment rules remain authoritative.

Input changes, connectivity changes and expiry invalidate displayed quotes. Old async responses cannot overwrite a newer selection. Public preview makes no pricing or availability requests and continues to accept no reservations/payments. Unsupported best-rate marketing was removed.

Internal date-specific nightly pricing, admin overrides, fifteen-minute quote persistence and accepted booking snapshots are unchanged. Current deterministic sample rules are not market recommendations and are not AI pricing. No nightly values, bounds, fees, provider accounts, external monitoring or publication schedule were configured. A future data-backed pricing system requires approved data access, guardrails, owner rate bounds and update/approval policy; this patch does not implement it.

## Selection handoff

Explorer cards carry only validated check-in, checkout and adult/child/infant counts to the property route. The server parses the same allowlist, rejects duplicate/malformed values and out-of-range dates/counts to visible defaults, and initializes both accommodation resolution and booking controls consistently. A changed selection uses a new component key, discarding prior local quote/payment-panel state. No personal information, prices, quote IDs, access credentials or hold/payment tokens are added to links. These inputs remain untrusted for booking: server quote validation and inventory checks still apply, including the March accommodation boundary and unapproved five-bedroom configuration.
