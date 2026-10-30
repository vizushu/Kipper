# Direct-booking MVP launch checklist — October 30, 2026

Target: reviewable site before end of Sunday November 1, Pacific time. This branch is a test-only implementation, not authorization to deploy, charge, issue refunds, or migrate existing reservations.

## Confirmed inputs
- Current accommodation: 3 bedrooms; maximum 8 people total including visitors.
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
- Stripe merchant account, Apple Pay eligibility/domain validation, secure webhook config. No fake Apple Pay button; Venmo is not implemented.
- Hosting workspace/domain/production secrets. Do not reuse unrelated music service. No deployment authorized.
- OTA/PMS integration: map ALL listing resources to same physical inventory. Current manual/iCal blocks are delayed, not verified live channel sync. No instant book until authoritative synchronization strategy tested.
- Implemented15-minute hold expiry/release and atomic confirmation/cancellation/intent-attachment guards. SQLite lifecycle tests and actual two-process reservation race pass. PostgreSQL RPC parity is code-reviewed only, unexecuted. Receipt sends occur only for the winning confirmation; reliable delivery retry/outbox still requires operational design. A late successful payment never revives cancelled/expired inventory and requires manual payment review.
- Postgres migration execution and real concurrent-connection tests (not yet run); advisory locks now cover reservation/confirmation/cancellation RPCs and block-write trigger; runtime execution still unverified.
- Real test-Stripe integration and browser interactive end-to-end verification, accessibility/mobile review. Mobile-first PWA manifest/icons/offline shell and strict cache tests implemented; installation/device testing remains outstanding.
- Capability link renewal/secure guest access workflow after24hours; no email renewal implemented.
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
- Browser/visual QA did NOT pass: local Chromium socket operations denied; supported cloud browser could not reach isolated listener. HTTP200 tests and service-worker VM tests are partial coverage only.
- No PostgreSQL executable/service available: SQL migration and concurrent RPC runtime tests NOT run. No Stripe account/domain/wallet test available: live/test network payments NOT run. No backups/restores or hosting persistence drill run.
- Public-preview release must use SITE_PREVIEW_MODE=true before build and at runtime; it overrides test checkout and disables contact/guest/admin data. No deploy/push without parent approval.
