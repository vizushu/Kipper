# One-shot owner email delivery probe (not activated)

This is a separate, fixed-purpose email test, not a booking, guest receipt, marketing message or concierge response. It cannot enable bookings, normal email delivery, or the generic Resend webhook. No provider credentials or actual sending are included in this code change.

## Explicit runtime approval required

Before configuring or sending, obtain approval for exactly one logical test email from `Casa Pacifica <bookings@innkipper.com>` to the approved owner help mailbox `vizushu@gmail.com`, with replies to that same mailbox. Subject and body are fixed in code. The Resend domain and sender must be verified first. Configure only the existing production Casa Pacifica service; never copy these credentials into payment staging.

- `SITE_PREVIEW_MODE=true` (required; this probe is a narrow preview-only exception)
- `STAGING_TEST_MODE` must not be true; `DATA_ADAPTER=sqlite`
- `OWNER_EMAIL_PROBE_APPROVED=true`
- `OWNER_EMAIL_PROBE_ID`: new UUID representing this separately approved one-shot test
- `OWNER_EMAIL_PROBE_ISSUED_AT` and `OWNER_EMAIL_PROBE_EXPIRES_AT`: UTC timestamps, at most one hour apart; no future-issued authorization
- `OWNER_EMAIL_PROBE_SECRET`: independently generated 43–128 character base64url secret, never reused from admin, calendar, operations, staging or provider credentials
- `RESEND_API_KEY`: domain-scoped sending key; never print or commit it
- `OWNER_EMAIL_PROBE_WEBHOOK_APPROVED=true`
- `RESEND_OWNER_PROBE_WEBHOOK_SECRET`: signing secret for a dedicated Resend endpoint at `/api/webhooks/resend-owner-probe`, subscribed only to `email.delivered`, `email.bounced`, `email.complained`; do not reuse the normal email signing secret

Existing `SQLITE_PATH` must resolve to an already-existing regular database file. The probe creates only two purpose-specific tables; it does not read/write bookings, guests, payment records, calendar blocks or the delivery outbox. Supabase is explicitly unsupported and remains closed.

## Authorized execution

Use a server-side operator client with `Authorization: Bearer <probe secret>`; do not place the key in URLs or browser storage. POST `/api/owner-email-probe` with an empty body or `{}`. No recipient, message or arbitrary authorization ID is accepted from HTTP. GET on that route returns only authorization ID and state, not recipient, provider ID or secret. Responses are private/no-store. No public UI or automatic scheduler invokes the probe.

The persisted authorization freezes its ID, timing, credential fingerprint and fixed envelope before transport. One logical email uses one stable Resend idempotency key. A 30-second lease serializes attempts across authorizations. At most three transport attempts are allowed globally per rolling day; failures count. An uncertain attempt may be retried only under its unchanged original authorization and after the lease, while its one-hour window is still valid (well inside the provider idempotency window). Never change the ID to work around an uncertain send or failed budget. Once accepted, no further send occurs. If acceptance could not be persisted and retry authorization expires, stop and reconcile privately with the provider; do not create a new email automatically.

The dedicated signed webhook stores only known accepted probe message IDs and minimal event evidence. An event racing acceptance returns503 for provider retry; unknown IDs are never adopted. Replays are deduplicated and conflicting events rejected; bounced/complained evidence cannot be overwritten by a later delivered event. Readback and signed event processing remain permitted for seven days from original authorization issuance; after that, disable/remove the dedicated configuration and use reviewed manual reconciliation if needed. Rotating frozen configuration, including the Resend sending API key, during a probe intentionally blocks reconciliation rather than silently treating it as a new test.

`accepted` means provider acceptance only. `delivered` means provider delivery evidence, not that the owner read it. The owner must verify the actual inbox and Reply destination. This does not establish guest receipt delivery, operator-alert delivery, production backup readiness or booking-launch approval. Normal preview/staging message guards remain unchanged.
