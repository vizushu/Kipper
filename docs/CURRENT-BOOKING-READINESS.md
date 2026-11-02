# Current direct-booking readiness — October 31, 2026

This inventory supersedes historical checkpoint prose that says live-mode plumbing
has not been implemented or that every live Stripe key is unconditionally rejected.
M2 added a deliberately default-closed mode contract; see PAYMENT-MODES.md and current
source. Configuration flags are not evidence of actual launch readiness.

## Implemented and synthetically tested (do not rebuild)
- Date/version resolution, shared physical inventory, total occupancy including infants,
  SQLite atomic holds/expiry/confirmation/cancellation, accepted quote/policy snapshots.
- Payment verification, stale/expired wallet UI guards, durable late-payment exception
  ledger, receipt outbox dedupe/retry and scoped manual retry.
- Scoped guest access/recovery with generic responses and bounded tokens; revocable
  admin sessions, login/booking limits and mutation-origin controls.
- Synthetic SQLite backup/restore, readiness reporting, maintenance code, safe PWA cache.
- Public preview overrides booking, payment, guest mutations and outbound delivery.
- Ask Kipper now offers optional curated answers and a blank mailto action. It is not
  a connected AI or SMS responder. Clicking email opens a composer, not proof of delivery.

## Credential-free verification that can be completed safely
1. Continue supported browser keyboard/focus/narrow-layout coverage of actual public
   flows; test physical iOS/Android install/offline/reconnect when devices are available.
   Browser zoom is not physical-device proof.
2. Re-run existing synthetic concurrency, webhook/hold-expiry, recovery, outbox and
   backup tests for each relevant change. These pass locally but do not replace
   real provider, production disk restart/restore or email-delivery tests.
3. Review final public policy/device disclosures and operator runbooks; obtain owner
   facts rather than inventing bed arrangements, rate recommendations or coverage.
4. After an inventory policy is chosen, implement any missing policy-specific adapter
   and mocked failure cases. Do not silently assert exclusive-direct inventory now.
5. For the separately approved SMS connection, signed inbound processing, monitored
   responder routing and consent/retention controls remain unimplemented; synthetic
   code can be prepared under a scoped approval, but campaign/number ownership alone
   does not make support operational. Keep it outside booking checkout activation.

## Actual launch gates, not solvable by cosmetic code or credentials alone
- Owner-paused Stripe setup plus real test-payment, Apple Pay/device, webhook and
  reconciliation validation. No actual charges/refunds authorized by this checklist.
- Approved production persistent hosting, domain, backup restore/restart drill and
  worker/maintenance monitoring. The free preview is ephemeral and is not production.
- Inventory policy: source currently permits live instant booking only for an approved
  exclusive-direct configuration. The owner has NOT chosen exclusivity or delisted
  Airbnb; Airbnb integration is deferred. A safe alternate policy needs a decision
  and implementation before cross-channel instant-booking assurance.
- Approved date-specific rates/floors/ceilings, final guest terms and required safety
  disclosures. Dynamic/AI market pricing is not implemented or active.
- Verified email delivery and accountable operators for receipt failures, payment
  exceptions, cancellation/refund review and urgent guest support.
- Future 5-bedroom details/capacity and operational approval remain distinct; current
  3-bedroom/8-person checkout rules must not be raised by a marketing badge.
- PostgreSQL migration/concurrency validation only if that optional adapter is selected;
  no new database provider or account is necessary just to continue local work.

No booking/payment/provider flags or external services were changed in this increment.
