# Cancellation review — calculations only

The authenticated reservations table offers **Review cancellation (no action)**.
Its GET endpoint `/api/admin/bookings/[id]/cancellation-review` is read-only and
fails closed in public preview, even when a synthetic admin secret is supplied.
There is no cancellation POST, refund-provider request, payment-status mutation,
notification or automatic refund in this feature. Calculation is not evidence
that money was returned. Existing cancelled inventory is not reopened or modified.

## Accepted facts, not current listing settings

New quotes snapshot a structured price breakdown (gross accommodation, discount,
net accommodation, cleaning, pet fee, tax, total and currency), plus versioned
cancellation thresholds, timezone and accepted local check-in time. SQLite and
Supabase already persist the whole JSON snapshot; no legacy rows are rewritten.

The review requires the supported `firm-2026-10-30` version and exact accepted
policy text, valid terms and nonnegative safe integer cents. Component arithmetic,
booking total and saved line-item total must reconcile. Accommodation percentages
apply to the net amount after discounts, not the total including cleaning/tax/pets.
Missing legacy snapshots, changed/unknown policy text/version, invalid times or
inconsistent amounts require manual review. Do not infer monetary categories by
parsing human-readable line-item labels. Future policy changes need a new reviewed
version; never reinterpret old bookings using the current property's defaults.

An active booking is a hypothetical calculation at server time. An already-cancelled
booking uses its recorded cancellation timestamp; a missing, invalid or future
recorded timestamp does not silently become today's date. The client cannot supply
an earlier date through a query parameter. Thirty- and fifteen-day boundaries use
America/Los_Angeles wall time, including DST, at the accepted check-in cutoff.
The current 3 PM cutoff still needs owner confirmation before real launch.

Only `paid_test` bookings presently support this test calculation. Unpaid/failed
bookings do not imply refundable funds, and already-refunded records do not propose
a further refund. Provider ledger reconciliation is always required before any
future payment operation. Live payment state is intentionally not added here.

## Deliberately incomplete monetary total

The displayed accommodation-plus-cleaning number is a **reviewed subtotal, not a
final refund**. Tax adjustments and pet-fee refunds remain manual policy/ledger
review; original tax/pet amounts are displayed separately, never silently added.
No grace period, new fee or refund exception is invented. The response explicitly
states `previewOnly: true`, `refundExecuted: false`, `bookingChanged: false`.

Tests cover accepted snapshot generation, discounts, exact 30/15-day and arrival
boundaries, DST, cancelled-booking timestamps, mutated current defaults, legacy or
inconsistent snapshots, payment states, admin/preview guards, no provider calls,
no booking mutations and no guest PII in the review payload. Browser interaction
review remains part of the integrated candidate QA; static rendering is not a
physical-device accessibility test.
