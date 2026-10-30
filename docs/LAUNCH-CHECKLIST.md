# Direct-booking MVP launch checklist — October 30, 2026

Target: reviewable site before end of Sunday November 1, Pacific time. This candidate is not a live-booking approval. A separate, restricted free preview is already live; the integrated candidate still requires publication and deployment approval. No charges, refunds or migration of real reservations are authorized.

## Confirmed inputs
- Current accommodation: 3 bedrooms; maximum 8 people total including infants and visitors.
- Current cleaning: $180 per stay. Do not assume that price for the future 5BR configuration.
- Five-bedroom accommodation begins March 1, 2027, America/Los_Angeles. Same physical inventory. A stay checking out March1 remains3BR. A stay crossing that boundary requires manual review.
- Custom cancellation: accommodation100% at least30days before check-in;50% at15–29days;none below15days. Cleaning fully refunded for cancellation before arrival. No automatic48hour grace. Calculator uses existing3PMlocalcheckin cutoff as explicit assumption; confirm this time before live launch. No actual refunds are executed.
- San Diego Zone2 TOT:12.75%, effectiveMay1,2025, on rent plus mandatory cleaning; $180cleaning contributes$22.95TOT. NoTMD2% and no inventedAirbnbservicefee. Collection-time tax policy, not a future stay-date rate switch.
- Tax sources: https://www.sandiego.gov/treasurer/taxesfees/tot and official zone point query for repository address (verified by parent). Store rate/version with accepted quote. Future rule changes need review.

## Implemented in this milestone
- Approved A+C property-page structure, responsive booking rail/mobile control, actual property photos (projector image withheld).
- Configuration resolver, safe future-details withholding, quote invalidation and stale-response protection.
- Default-closed booking endpoints; explicit test-preview opt-in only. Test Stripe keys only, signed webhooks, amount/currency/metadata binding.
- Persisted accommodation and policy snapshot on SQLite and Supabase adapters. Existing rows not retroactively rewritten.
- Idempotency rejects changed payload. SQLite immediate transaction; Postgres reservation RPC serializes same physical property with advisory lock.
- Scoped expiring booking lookup capability; no public guest-contact lookup by short reference; no static Wi-Fi disclosure.

## Production blockers / not claimed complete
- 5BR guest capacity, bed map, amenities, photos and price approvals. Five-bedroom checkout remains closed.
- Current bed-map / property facts and check-in cutoff final verification; no pool-heating promise.
- Final nightly pricing strategy and promo eligibility. Existing test fixture rates are not a public advertised floor.
- Stripe merchant account, Apple Pay eligibility/domain validation, secure webhook config. The current test-only payment-state model also needs coherent production-mode implementation and review before real keys can ever be used. No fake Apple Pay button; Venmo is not implemented.
- Free Kipper preview workspace/service exists. Production persistent hosting, domain, secrets and any paid service need separate approval; never reuse unrelated services.
- OTA/PMS integration: map ALL listing resources to same physical inventory. Current manual/iCal blocks are delayed, not verified live channel sync. No instant book until authoritative synchronization strategy tested.
- Implemented15-minute hold expiry/release and atomic confirmation/cancellation/intent-attachment guards. SQLite lifecycle tests and actual two-process reservation race pass. PostgreSQL RPC parity is code-reviewed only, unexecuted. Transactional durable receipt jobs and bounded, idempotent retry are implemented and tested with synthetic local delivery. Production scheduling/alerting and provider validation remain pending. A late successful payment never revives cancelled/expired inventory and requires manual payment review.
- Postgres migration execution and real concurrent-connection tests (not yet run); advisory locks now cover reservation/confirmation/cancellation RPCs and block-write trigger; runtime execution still unverified.
- Real test-Stripe integration and browser interactive end-to-end verification, accessibility/mobile review. Mobile-first PWA manifest/icons/offline shell and strict cache tests implemented; installation/device testing remains outstanding.
- Secure recovery APIs and expiring single-use code exchange implemented; recovery UI now implemented with memory-only credentials; verified delivery configuration and production abuse controls remain outstanding.
- Tax refund adjustments and long-stay exemption handling; current maximum28nights and manual review for longer stays.

## Preview / configuration
- `BOOKING_TEST_MODE=true` explicitly enables test endpoints only; omit/false keeps them closed.
- `BOOKING_ACCESS_SECRET` at least32bytes, secret manager only. Rotate to invalidate capability links. Never commit secrets.
- `STRIPE_SECRET_KEY=sk_test_...`, test webhook signing secret, appropriate test publishable key. Never use live keys.
- Canonical property/configuration data: `src/lib/property.ts`; duplicate fallback removed. Fee/tax/min/max stay settings remain admin-editable. Persisted DB settings are not silently overwritten: existing150/10.5 seed values must be audited and explicitly updated to180/12.75 in staging before testing; never rewrite old booking snapshots.
- Cancellation module `src/lib/cancellation.ts`; pure preview only. DB migration: idempotent snapshot-column addition in SQLite and `supabase/schema.sql`. Back up and review before applying to a nonlocal database.

## Second increment validation
- Full unit/integration suite and TypeScript rerun after atomic lifecycle, wallet, offline and public-preview changes; exact final count/clean build result recorded in delivery.
- Real two-process SQLite race test verifies exactly one overlapping reservation succeeds. Expiry boundary, cancellation-before-confirmation, duplicate confirmation, imported block, wrong intent, generic update bypass and failed-payment downgrade tests pass.
- Initial local browser QA was blocked by environment/socket isolation. The deployed restricted preview was subsequently inspected in the supported browser: date transitions, menu/sheet and a narrow388CSSpx layout passed. This was browser zoom, not physical-device or PWA-install testing. The integrated UI candidate still needs deployed visual review.
- No PostgreSQL executable/service available: SQL migration and concurrent RPC runtime tests NOT run. No Stripe account/domain/wallet test available: live/test network payments NOT run. Synthetic local SQLite backup/restore tests now pass; no real hosting persistence/restore drill has run.
- Public-preview release must use SITE_PREVIEW_MODE=true before build and at runtime; it overrides test checkout and disables contact/guest/admin data. No deploy/push without parent approval.

## Positioning correction — October 30, 2026

Kipper is a concierge-AI startup, not identified as property manager, legal host,
or payment recipient. Casa Pacifica is the property booking-site brand. Kipper is only the concierge AI in development; a separate startup site is outside this MVP task. Final contracting details, regulatory review, and merchant/payment
configuration must be completed before booking opens. Casa Pacifica's STRO/TOT records
are property-specific, not evidence of a Kipper brokerage/property-management license.
No live reservations or payments are enabled by this branding correction.


## Integrated candidate — implemented, not yet deployed
- Durable receipt outbox: atomic enqueue with payment confirmation, dedupe keys,
  bounded retry/leases, immutable delivery envelopes, cancellation suppression,
  redacted admin status. Selected-receipt retry never drains unrelated messages or
  resets terminal delivery budgets. No external delivery in preview.
- Recovery: generic non-enumerating responses, persistent rate limits, 15-minute
  single-use hashed codes and bounded exchange; preview blocks all access mutations.
- SQLite backup CLI: online snapshot, integrity verification, restricted permissions,
  restore-to-new-file and no overwrite; verified only against synthetic local data.
- UI refinement: actual photo hierarchy, parking moved out of the opening grid,
  concise visible accommodation restrictions and grouped amenities disclosure.
- Test evidence is attached to the candidate handoff: full suite, TypeScript,
  preview build, production dependency audit and independent review. No account,
  provider, live guest, real payment or production-database testing is implied.

## Live restricted preview versus launch
- Live preview source: branding-only `83fa8ad`; public viewing only. Reservations,
  payments, contact submission, guest lookup/recovery and admin APIs are disabled.
  No external mail or background scheduler is provisioned. Robots disallow indexing.
- This combined backend/UI candidate is local until separately approved. Preserve
  `SITE_PREVIEW_MODE=true` at build and runtime on any approved preview update.
- Outstanding device/provider tests: actual iOS/Android PWA install/offline/reconnect,
  keyboard/screen-reader review, supported-browser checkout with test Stripe and
  Apple Pay, webhook delivery/replay, verified email provider idempotency/retry,
  production backup restore and persistent-disk restart drill. PostgreSQL migration
  and concurrent RPC tests are required only if that optional adapter is selected.
- Owner inputs/approvals: production hosting cost/storage/domain, merchant account
  and payment method setup, final contracting/privacy details, nightly prices and
  promotions, verified bed facts/check-in cutoff, cross-channel inventory strategy.
  Future 5BR capacity/facts/pricing remain separate approvals and checkout stays shut.
- No automatic refunds, long-stay tax exemption, Venmo flow or live money routing
  is approved or represented as implemented. See DELIVERY-RECOVERY.md,
  BACKUP-RESTORE.md and DEPLOYMENT-CHECKLIST.md for operational limits.

## Launch safety checkpoint
See `LAUNCH-SAFETY-MILESTONE.md` and `CANCELLATION-REVIEW.md` for the recovery UI, cookie-scoped confirmation, public block-reason privacy fix, conservative offline calendar preview, accepted refund-review snapshots, read-only readiness report and bounded maintenance step. These do not enable real bookings or refunds.

### M2 payment mode and exception capability (not activation)
- Explicit closed/test/live mode, historical test provenance and preview override are implemented. No approval flags or credentials were configured.
- Verified payments that cannot fulfill a booking enter the durable private review queue; persistence failure asks the provider to retry. Admin review records reconciliation only, not refunds or cancellations. See `PAYMENT-EXCEPTION-OPERATIONS.md`.
- Current live capability recognizes only a separately approved exclusive-direct inventory policy. The user has not chosen that policy; do not infer Airbnb delisting. OTA/manual-approval design remains an owner/engineering decision.
- Stronger server-expiring/revocable admin sessions, persisted abuse controls, actual provider/device QA, production persistence/monitoring and final guest terms/rates remain required before live activation.
