# Payment exception operations — local M2 capability

This is engineering capability, not permission to activate real payments. Public preview overrides every payment/admin/maintenance switch. No provider credentials, messages, charges or refunds were used to test this work.

## Verified payment, unconfirmed stay

A signed successful Stripe event or authenticated PaymentIntent retrieval may establish receipt of money without establishing a valid reservation: cancellation, expired/conflicting hold, amount/metadata mismatch, unmatched property payment or a closed fulfillment gate. Such evidence is persisted in a private review ledger before the webhook returns HTTP 200. Storage failure returns 503 so Stripe can retry. No reservation is revived, inventory reopened or confirmation receipt queued by this path.

One case exists per payment mode and PaymentIntent. Provider event IDs deduplicate deliveries; new events increment evidence count without creating repeated attention cases. A previously reviewed case remains reviewed on duplicate delivery. Provider identifiers, amounts, currency, reason and timestamps are retained; raw payloads, guest names/email/phone and secrets are not copied. Amounts are provider minor units, not universally cents; operators must verify currency denomination.

The private admin Payment review page surfaces cases. Maintenance exposes only counts and an attention flag. This is a durable **in-app attention queue**, not an external email/SMS alert: no external alert transport has been provisioned. Operations must choose a monitored review/maintenance cadence before launch. Persisted data and backups are required; the ephemeral free preview is not suitable.

## Review is not refund

An authenticated operator records an explanatory reconciliation note with an idempotency key. Matching retries return the same result; conflicting reuse and duplicate terminal review actions are rejected. The ledger marks only `reviewed`, never `refunded`. This action does not cancel, confirm, refund or mutate a booking/payment. Any financial resolution requires separate authorized provider action and reconciliation; do not write guest personal information or credentials into notes.

## Inventory decision remains open

The current live-mode engineering gate can recognize only an explicitly approved exclusive-direct inventory policy. This is **not** a user decision to delist Airbnb or a claim that iCal is authoritative. A continued OTA/manual-approval strategy requires an agreed workflow and further implementation; no cross-platform atomic locking exists. Missing approvals keep checkout closed.

## Verification boundaries

Synthetic SQLite tests cover ledger persistence, event dedupe, concurrent connections, review idempotency, late/cancelled/conflicting payments, storage failure/retry and closed-gate reconciliation. Supabase REST mapping/schema are reviewed and mocked, not executed against a real PostgreSQL deployment. Real Stripe/Apple Pay/device tests, persistent production storage, monitored operations and hardened admin authentication remain separate launch gates.
