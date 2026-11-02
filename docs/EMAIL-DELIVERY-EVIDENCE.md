# Email delivery evidence — inactive implementation

This checkpoint adds no provider configuration, domain changes, messages, subscriptions, or scheduled work. Public preview always blocks real dispatch **and** the new webhook. No preview owner-test exception is implemented.

## States and persistence

- Existing outbox `sent` means the provider accepted the request, **not** inbox delivery.
- Live dispatch must return a bounded JSON response containing a valid Resend UUID `id`. Before marking the outbox sent, the active lease records that ID in `email_delivery_evidence` and links the current attempt in `email_acceptance_attempts`.
- A message ID cannot move to another job, and a job cannot silently change provider identity. If acceptance persistence fails, the queue does not claim success. Its existing stable provider idempotency key and bounded retry window permit recovery of the same accepted ID after an acknowledgment/database failure.
- Signed supported events update only known provider IDs. Projection priority is `accepted < delivered < bounced < complained`; late delivery events cannot erase a complaint/bounce. Original event metadata remains available for audit.
- No webhook changes bookings, inventory, payment status, cancellation, refunds, or queue retry state. It never sends email. A provider delivery event means acceptance by the recipient's mail server, not that the owner saw the message, nor that replies reached Gmail.
- Tables contain only opaque provider/job/event IDs, attempt number, timestamps, event type, and SHA-256 payload digest. Raw webhook bodies, addresses, subject, bounce text, and credentials are not retained or logged. These private records require an operational retention policy before broad launch; no independent cleanup scheduler was added.

## Endpoint/configuration contract

`POST /api/webhooks/resend`

Required independently from booking/payment/new-send availability:

- `SITE_PREVIEW_MODE` must not be `true`.
- `EMAIL_WEBHOOK_APPROVED=true` (new, defaults off).
- `RESEND_WEBHOOK_SECRET` is the dedicated Resend/Svix endpoint signing secret, **not** the sending API key or Stripe webhook secret.
- Apply matching private tables/RPCs before enabling. SQLite migrations run on adapter initialization. Supabase SQL is included but execution/concurrency has not been verified against a live PostgreSQL instance.

Subscribe to `email.delivered`, `email.bounced`, `email.complained`. Other authenticated event types are ignored. Svix headers `svix-id`, `svix-timestamp`, `svix-signature` authenticate the exact raw bytes. Acceptance is bounded to 64 KiB with a 10-second body-read deadline, timestamp within 300 seconds, eight signatures maximum, bounded opaque identifiers, valid event time and provider UUID. Signature verification follows Svix's documented manual HMAC-SHA256 procedure and is checked against its published independent test vector. No new package/network installation is required.

Repeated matching event IDs return success without repeat mutation. Conflicting replay IDs return 409. Unknown provider IDs return 503 (no arbitrary evidence adopted): this handles a webhook arriving before acceptance persistence and asks the provider to retry. Database failures are also 503. Malformed/signature failures return generic 400, oversized body 413, inactive/preview endpoint 404. Responses are no-store and do not reveal recipients or raw provider errors.

## Owner-test mechanism: design only, not implemented/approved

Do not create fake bookings, payment intents, calendar blocks, or guest receipts in production to test email.

Proposed next increment, requiring explicit approval of the exact recipient/send:

1. Dedicated `owner_email_test` dispatch/attempt records, separate from booking/outbox inventory records; fixed innocuous subject/body and exact configured owner recipient. No arbitrary address/body parameters.
2. Strong same-origin admin authentication plus a one-time short-lived authorization record binding owner recipient, frozen sender/reply-to, scope, expiry, and maximum one dispatch. A stable provider idempotency key belongs to this authorization, not a fabricated booking.
3. Existing explicit email live approval and sender readiness remain required; recipient and reply destination must be confirmed separately. Default preview remains blocked. Any future preview-only test exception must be separately reviewed, exact-scope approved, and must not enable guest transport or booking/webhook mutations generally.
4. Reuse evidence validation only for accepted IDs already bound to that dedicated test purpose. Unknown IDs cannot be adopted from a webhook. Owner manually confirms inbox appearance, reply destination, and successful reply receipt. Provider acceptance/delivery status alone cannot certify these outcomes.
5. Persist the acceptance ID and evidence, then mark the single authorization used. No scheduled sends or automatic retry beyond the same bounded idempotent attempt.

No code path for these owner sends exists in this checkpoint. Do not configure credentials/flags or send a test until that explicit mechanism and approval are in place.

## Sources

- [Resend signature verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Svix manual protocol and independent test vector](https://docs.svix.com/receiving/verifying-payloads/how-manual)
- [Resend event meanings](https://resend.com/docs/webhooks/event-types)
- [Delivered event payload](https://resend.com/docs/webhooks/emails/delivered)
- [Send response and idempotency](https://resend.com/docs/api-reference/emails/send-email)
