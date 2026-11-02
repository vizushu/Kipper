# Direct-booking launch safety increment

This increment is code and synthetic verification, not live activation. Contact/chat
work is not on the launch critical path. No Apple Cash, new processing fee, unverified
5BR amenity/capacity or new provider has been added.

## Implemented
- Public availability conflict errors omit private admin block reasons. Calendar
  descriptions, summaries and UIDs never appear in parsed block reasons.
- Offline iCalendar preview supports bounded all-day events only, with stable IDs,
  exclusive checkout dates and whole-feed rejection of malformed/unsupported data.
  Recurrence, exceptions, timed zones, transparent/cancelled events and nested
  components require manual review. Remote fetching is explicitly disabled rather
  than accepting arbitrary server-side URLs. Empty exports never delete blocks;
  this helper neither persists nor reconciles a feed. RFC source:
  https://www.rfc-editor.org/rfc/rfc5545.html (date-only event/DTEND semantics).
- Confirmation uses a scoped HttpOnly browser cookie instead of a URL capability.
  Checkout no longer places bearer tokens in history, referrers or query logs.
  Missing/expired browser access links to recovery; old query tokens are not accepted.
- Recovery UI uses existing generic, rate-limited, single-use APIs and memory-only
  Bearer lookup. No storage or URL credentials, no guest PII in the summary, and
  no fake email-delivery success. Preview/disabled recovery shows no input forms.
- New accepted structured price/cancellation snapshot powers read-only admin review.
  Missing/unknown/inconsistent legacy snapshots require manual review. No cancellation
  mutation, refund execution, tax/pet-fee guess or automatic guest message occurs.
- Maintenance API provides authenticated, bounded hold-expiry/outbox work and
  aggregate operational counts. It is blocked in preview and provisions no scheduler.
- Selected-stay total is displayed before its breakdown, includes mandatory cleaning
  and applicable taxes, and adds no new payment-processing surcharge.

## Explicit inventory and launch gates

`getLaunchReadiness()` and admin `/api/admin/launch-readiness` are read-only, report
`canAcceptLiveBookings:false`, and identify inventory policy as manual-review-only.
There is no environment-variable shortcut that certifies OTA atomicity. A reviewed
strategy must establish exclusive direct inventory or an authoritative cross-channel
reservation workflow before instant booking. iCal freshness cannot satisfy this.

Current payment/confirmation paths remain deliberately test-only, including `paid_test`
receipt handling. Real mode must be coherently implemented and independently tested
across creation, evidence/webhooks, persistence and messaging before any approved live
configuration. Supplying an account/key alone is not enough. Persistent hosting,
provider/device QA, operational backup/restore and owner-approved terms/rates are
still separate launch prerequisites. Actual Apple Pay depends on eligible Stripe
account/domain/device support, with card fallback; Apple Cash is not implemented.

## Operations

`GET /api/admin/maintenance` exposes only status counts and whether dead jobs need
review, not recipients, payloads, tokens or provider messages. Authenticated POST
expires stale holds then processes at most ten outbox jobs, honoring existing leases,
backoff, dedupe budgets and delivery gates. Repeated calls are safe under existing
transaction rules. An approved production operator must schedule and monitor it;
no timer, provider account or paid infrastructure is provisioned by this code.

Tests use synthetic guests, local SQLite and fake provider boundaries. The harness
must reject unexpected network calls. Real Stripe/Apple Pay/email, OTA concurrency,
PostgreSQL execution and production persistence remain unverified until separately
configured and tested. No unqualified production-ready claim is made.
