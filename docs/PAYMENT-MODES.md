# Payment modes — closed by default

This implementation does not authorize launch. No provider credentials, approval
flags or real messages/payments are configured by this change.

## Explicit contract

- Public preview overrides every payment, booking and delivery setting.
- BOOKING_PAYMENT_MODE accepts closed, test or live. Missing defaults to closed,
  except the existing explicit BOOKING_TEST_MODE=true selects test. Invalid values
  close booking. An explicit mode takes precedence over the legacy flag.
- Live requires LIVE_BOOKING_APPROVED, LIVE_PROVIDER_QA_APPROVED,
  LIVE_OPERATIONS_APPROVED, LIVE_GUEST_TERMS_APPROVED and
  INVENTORY_EXCLUSIVE_DIRECT_APPROVED, all explicitly true.
- INVENTORY_POLICY must be exclusive_direct. This requires an actual reviewed
  exclusive-inventory operating policy, not merely a setting. iCal imports are
  advisory and never sufficient. No authoritative channel-manager adapter exists.
- The configured secret/publishable keys must be live-mode and a signed webhook
  secret must exist. Their presence alone never enables live booking.
- Flags are attestations of completed owner/provider/operations review, not
  automated proof that those reviews occurred.

## Immutable provenance and separate evidence

Quotes and bookings persist test/live provenance. Historical missing values and
database migrations default to test; current environment changes cannot promote
old records. Idempotent booking retries bind to the same mode. Payment intent
metadata, signed event mode, retrieved evidence and stored reservation must agree.
Confirmation writes paid_test for test reservations and paid for live ones.

Payment creation requires the full runtime contract and explicitly requests only
card payment methods. There is no automatic addition of new payment methods or
Link/Adaptive Pricing configuration. Eligible Apple Pay uses the existing card
wallet path; actual account/domain/device verification remains pending. Read-only retrieval uses a
mode-matching key and still fails closed in public preview, but can retrieve
evidence after booking closes. This does not authorize fulfillment, cancellation,
capture, refund or guest messaging. Callback callers separately gate fulfillment
and can send verified unmatched/late success to the durable review ledger.
Webhook signature authentication likewise must remain possible after runtime
closure so a genuine received payment is not silently discarded.

External receipts require both approved live delivery configuration and a
live-provenance paid booking. Recovery payloads also retain provenance; historical
or test payloads never become live deliveries simply by changing environment
flags. Local synthetic transport remains separate. Cancellation review accepts
mode-consistent paid/paid_test records only, calculates from the accepted snapshot,
and neither reconciles the provider ledger nor performs any refund.

## Evidence and outstanding launch gates

Synthetic tests cover default closure, each approval, preview override, invalid
inventory policy, wrong key/event/intent modes, historical rows, persisted SQLite
mode, idempotency, test-delivery suppression and read-only retrieval after closure.
Provider SDK transports are mocked; local webhook signatures use synthetic keys.

Actual Stripe account setup, verified webhook endpoint, device/Apple Pay checks,
provider settlement/refund validation, persistent storage/backup operations,
guest-facing legal/payment terms, inventory exclusivity and owner approval remain
external launch prerequisites. PostgreSQL concurrency/migrations require runtime
verification in the eventual selected environment. No paid hosting, credentials,
provider accounts, live charges/refunds/emails or launch activation is authorized
by these tests.
