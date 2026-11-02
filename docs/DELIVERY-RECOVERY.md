# Delivery and access recovery — local implementation checkpoint

Not a live-email or booking launch approval. Public preview hard-blocks deliveries,
recovery, and guest mutations. No provider account, credentials, scheduled worker,
or real guest messages were created for verification.

## Durable receipts

SQLite's pending-to-confirmed transaction also inserts guest/host receipt jobs with
unique dedupe keys. Duplicate payment events cannot enqueue additional receipts.
Jobs survive process restart, use five-minute claim leases, immutable prepared
messages and provider idempotency keys. Retries are bounded to five attempts and a
23-hour window, below Resend's documented 24-hour idempotency retention:
https://resend.com/docs/dashboard/emails/idempotency-keys . Terminal jobs have
sensitive payload/envelope fields scrubbed. Failed jobs require operator review;
there is no unbounded retry or silent creation of a fresh dedupe key.

Cancelled bookings suppress queued receipts and subsequent retries. A message
already in flight or accepted by the provider cannot be recalled: receipts state
the historical confirmation timestamp and warn that later changes supersede it.
This is not an atomic transaction spanning the database and email provider.

Delivery defaults disabled. Explicit `EMAIL_DELIVERY_MODE=local` produces private
synthetic HTML artifacts only, with status `simulated`, not `sent`. Future external
delivery requires separate approval, verified sender/recipient configuration,
`EMAIL_DELIVERY_MODE=live`, `EMAIL_LIVE_APPROVED=true`, provider credentials and
non-test bookings; those settings have not been enabled. Preview overrides all.
Authenticated `/api/admin/outbox` exposes redacted status and a bounded drain of ten
jobs. The legacy `/api/admin/emails/resend` action retries only the selected booking/guest-or-host receipt when due; it never drains unrelated jobs. Backoff, claim leases and original dedupe budgets remain intact. Sent, simulated, suppressed and dead jobs return an explicit not-retried conflict, rather than resetting attempts or promising another email. An operator must separately review delivery history for terminal jobs; this endpoint cannot force a duplicate. Payment callbacks provide a best-effort trigger; a verified production owner
must arrange durable periodic draining/alerting. No scheduler is provisioned.

## Recovery

Disabled by default; explicitly requires `BOOKING_RECOVERY_MODE=true`, a configured
booking-access signing secret, and nonpreview mode. POST `/api/bookings/recovery`
returns the same generic 202 response for matching, missing, invalid, throttled,
and storage-failure cases. No identity, booking existence or email is returned.
Persistent limits are 100 requests globally/hour and three per normalized reference/
hour; exchange is bounded to 300/hour. No caller-controlled forwarded-IP trust.
These conservative single-property limits can deny legitimate access under abuse;
production ingress abuse controls and monitoring remain necessary.

Random 256-bit codes expire after 15 minutes, supersede prior codes and exchange
once through POST `/api/bookings/recovery/exchange` for a short-lived booking access
capability. Token hashes are stored separately; the private delivery outbox holds
the plaintext only until delivery/expiry/supersession, then scrubs it. Codes never
appear in URL query strings or logs. Recovery UI and verified live delivery remain
launch prerequisites; current tests use synthetic data and mocked/local delivery.

## Evidence and remaining gates

SQLite integration covers restart, concurrent claims, stale leases, acknowledgement
loss/retry with stable message/idempotency key, cancellation races, privacy limits,
superseding/expired/single-use codes. Backup/restore tests are synthetic; see
`BACKUP-RESTORE.md`. Supabase RPC/adapter code has mocked transport tests and schema
review only: no real PostgreSQL concurrency or migration execution was available.
Use neither these checks nor a public read-only preview as live-booking approval.
Final data-controller/contracting details and merchant setup still need finalization.
Kipper is a concierge-AI startup, not represented as property manager or merchant.
