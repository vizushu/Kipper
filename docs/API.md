# Casa Pacifica Direct-Booking API

Base URL (dev): `http://localhost:3000`

Conventions:

- Money is **integer cents (USD)** everywhere. Never floats.
- Dates are `YYYY-MM-DD` in `America/Los_Angeles`.
- A stay is **[checkIn, checkOut)**: the checkout day is not charged and is
  available as a check-in day for the next guest (back-to-back stays allowed).
- Error bodies: `{ "error": "<message>", "code": "<CODE>" }`.
  - Domain errors use `BookingError` codes: `INVALID_DATES`, `UNAVAILABLE`
    (→ HTTP 409), `GUEST_LIMIT`, `MIN_STAY`, `MAX_STAY`, `QUOTE_EXPIRED`,
    `DUPLICATE`, `PAYMENT_FAILED`.
  - Malformed request bodies → HTTP 400, code `INVALID_REQUEST`.
  - Unknown ids/slugs → HTTP 404, code `NOT_FOUND`.
  - Admin routes without credentials → HTTP 401, code `UNAUTHORIZED`.
- All pricing is computed **server-side** (`src/lib/pricing.ts`). The frontend
  must call `POST /api/quote` and render the returned quote — never compute
  totals client-side.
- ⚠️ Pricing defaults flagged SAMPLE (cleaning fee $150, tax 10.5%) are
  **Renier-to-confirm** and admin-editable via `PUT /api/admin/settings`.
- Coordinates in property data are **approximate** — Renier to confirm.

---

## Public routes

### GET /api/properties

List all properties (summaries).

**Response 200**

```json
{
  "properties": [
    {
      "id": "casa-pacifica",
      "slug": "casa-pacifica",
      "name": "Casa Pacifica",
      "city": "San Diego",
      "neighborhood": "Mira Mesa",
      "maxGuests": 8,
      "bedrooms": 3,
      "bathrooms": 2,
      "coverPhoto": { "src": "/photos/casa-pacifica-02.jpg", "alt": "Casa Pacifica — bright open living room", "room": "Living room" },
      "startingNightlyCents": 34900,
      "amenityTags": ["Private heated pool", "Sleeps 8", "3 bedrooms", "Mira Mesa", "EV charger"]
    }
  ]
}
```

### GET /api/properties/[slug]

Full property detail (description, amenities, house rules, photos, FAQs,
pricing config). `404 { error, code: "NOT_FOUND" }` for unknown slugs.

**Response 200** — `{ "property": { …full Property… } }`

### GET /api/availability?propertyId&from&to

Day-by-day availability for a half-open window `[from, to)`.

- `propertyId` — id or slug (default `casa-pacifica`)
- `from`, `to` — `YYYY-MM-DD` (defaults: today → +60 days; capped at 365 days)

**Response 200**

```json
{
  "days": [
    {
      "date": "2026-11-10",
      "available": true,
      "nightlyRateCents": 34900,
      "minStayNights": 1
    },
    {
      "date": "2026-11-13",
      "available": false,
      "nightlyRateCents": 41880,
      "minStayNights": 1,
      "blockedReason": "booked"
    }
  ]
}
```

`blockedReason`: `"booked"` (a confirmed/pending_payment booking covers the
night), `"blocked"` (manual block), `"past"`.

### POST /api/quote

Price a stay. Validates dates, min/max stay, guest capacity, pet policy, and
availability, then returns an itemized quote valid for **15 minutes**.

**Request**

```json
{
  "propertyId": "casa-pacifica",
  "checkIn": "2026-12-18",
  "checkOut": "2026-12-21",
  "guests": { "adults": 2, "children": 1, "infants": 0 },
  "pets": 1,
  "promoCode": "DIRECT10"
}
```

- `guests`: at least 1 adult; adults + children ≤ 8 (infants don't count
  toward the overnight cap).
- `pets`: 0–1 (property max is 1 pet; $50/stay when > 0).
- `promoCode`: optional, case-insensitive. Unknown codes → 400
  `INVALID_DATES` with a clear message. `DIRECT10` = 10% off the nightly
  subtotal (honors Renier's promised 10%-off for direct rebookings).

**Response 200**

```json
{
  "quote": {
    "id": "q_m…",
    "propertyId": "casa-pacifica",
    "propertySlug": "casa-pacifica",
    "checkIn": "2026-12-18",
    "checkOut": "2026-12-21",
    "nights": 3,
    "guests": { "adults": 2, "children": 1, "infants": 0 },
    "pets": 1,
    "promoCode": "DIRECT10",
    "nightlyRates": [
      { "date": "2026-12-18", "rateCents": 41880 },
      { "date": "2026-12-19", "rateCents": 41880 },
      { "date": "2026-12-20", "rateCents": 34900 }
    ],
    "lineItems": [
      { "label": "3 nights × avg $395.53", "detail": "Nightly rates vary by date — see nightly breakdown.", "amountCents": 118660 },
      { "label": "Direct booking discount (DIRECT10)", "detail": "10% off nightly subtotal", "amountCents": -11866 },
      { "label": "Cleaning fee", "amountCents": 15000 },
      { "label": "Pet fee", "detail": "1 pet · per stay", "amountCents": 5000 },
      { "label": "Taxes (10.5%)", "detail": "Applied to nightly subtotal minus discounts, plus cleaning fee.", "amountCents": 12773 }
    ],
    "subtotalCents": 118660,
    "discountCents": 11866,
    "cleaningFeeCents": 15000,
    "petFeeCents": 5000,
    "taxesCents": 12773,
    "totalCents": 139567,
    "currency": "USD",
    "expiresAt": "2026-10-13T19:15:00.000Z"
  }
}
```

**Errors** — 400 `INVALID_DATES` (bad/past/inverted dates, unknown promo),
`GUEST_LIMIT`, `MIN_STAY`, `MAX_STAY`; 409 `UNAVAILABLE`.

### POST /api/bookings

Create a booking from a live quote and start test-mode payment.

Availability is **re-checked atomically** (overlap check + INSERT in one
transaction), so a quote that went stale between pricing and booking safely
fails with 409 `UNAVAILABLE` instead of double-booking.

**Request**

```json
{
  "quoteId": "q_m…",
  "guest": { "name": "Dakota Example", "email": "dakota@example.com", "phone": "555-0100" },
  "idempotencyKey": "6f8b2c4d-…"
}
```

- `idempotencyKey`: client-generated (UUID recommended). Retrying with the
  same key returns the original booking — never a duplicate.

**Response 201**

```json
{
  "booking": {
    "id": "bk_…",
    "reference": "CP-7K2Q9A",
    "propertyId": "casa-pacifica",
    "checkIn": "2026-12-18",
    "checkOut": "2026-12-21",
    "nights": 3,
    "guests": { "adults": 2, "children": 1, "infants": 0 },
    "pets": 1,
    "guest": { "name": "Dakota Example", "email": "dakota@example.com" },
    "lineItems": [ "…" ],
    "totalCents": 139567,
    "currency": "USD",
    "status": "pending_payment",
    "paymentStatus": "unpaid",
    "createdAt": "2026-10-13T19:00:00.000Z"
  },
  "clientSecret": "pi_…_secret_…"
}
```

The `booking` object is guest-safe (no Stripe ids beyond what's needed,
no idempotency key, no admin notes). Use `clientSecret` with Stripe.js to
collect payment, then call the confirm endpoint.

**Errors** — 400 `QUOTE_EXPIRED`, `INVALID_REQUEST`; 409 `UNAVAILABLE`;
500 `PAYMENT_FAILED` with `"Stripe not configured (test mode)"` when
`STRIPE_SECRET_KEY` is missing (the booking still exists as
`pending_payment`).

### POST /api/bookings/[id]/confirm

Verify the test payment and confirm the booking. Idempotent — confirming
twice returns the booking. Sends the guest confirmation + host notification
emails (email failures are logged, never fail the confirmation).

**Request**

```json
{ "paymentIntentId": "pi_…" }
```

**Response 200** — `{ "booking": { …, "status": "confirmed", "paymentStatus": "paid_test", "confirmedAt": "…" } }`

**Errors** — 404 `NOT_FOUND`; 400/502 `PAYMENT_FAILED` (not succeeded,
amount mismatch, or Stripe unreachable).

### GET /api/bookings/ref/[reference]

Guest-safe booking lookup by reference (for "manage my booking" flows).
`404 { error, code: "NOT_FOUND" }` when unknown.

**Response 200** — `{ "booking": { /* guest-safe fields */ } }`

### POST /api/webhooks/stripe

Stripe webhook receiver (**test mode**).

- With `STRIPE_WEBHOOK_SECRET` set: verifies the signature, rejects
  invalid ones (400).
- Without it: accepts the JSON payload with a warning log (dev only — set
  the secret before any real traffic).

Handled events:

- `payment_intent.succeeded` → marks the matching booking `confirmed` /
  `paid_test` and sends guest + host emails.
- `payment_intent.payment_failed` → marks the booking `paymentStatus: failed`.

**Response 200** — `{ "received": true }`

---

### POST /api/contact

Contact-form submission. Validates server-side; never throws.

**Request**

```json
{ "name": "Jane Doe", "email": "jane@example.com", "message": "Hello!" }
```

- `name`: required, ≤ 120 chars
- `email`: required, valid email format, ≤ 200 chars
- `message`: required, ≤ 5000 chars
- `company` (honeypot): if filled, the request is silently accepted and discarded

**Response 200** — `{ "ok": true }`. Without `RESEND_API_KEY` the message
is written as HTML to `./.dev-emails/` (same dev-logger pattern as booking
emails); with a key it is emailed to the host inbox (`HOST_NOTIFY_EMAIL`).

**Response 400** — `{ "error": "<message>", "code": "INVALID_REQUEST" }`
on validation failure.

## Admin routes

All require **either** the `x-admin-secret: <ADMIN_SECRET>` header **or** the
`cp_admin_session` httpOnly cookie from login. Missing/invalid → 401.

### POST /api/admin/login

**Request** `{ "secret": "<ADMIN_SECRET>" }` → **200** `{ "ok": true }`
(sets the `cp_admin_session` cookie, 7-day expiry). Wrong secret → 401.

### GET /api/admin/session

Check the current admin session (cookie or `x-admin-secret` header).
→ **200** `{ "ok": true }` when valid, **401** otherwise. Used by the admin
layout to decide whether to show the login screen.

### GET /api/admin/bookings?propertyId=&status=

List bookings, newest first. `status` ∈ `pending_payment|confirmed|cancelled`.
Full booking objects (including Stripe/payment/admin fields).

### POST /api/admin/blocks

Create a manual blocked range (owner stays, maintenance, iCal imports).

**Request** `{ "propertyId": "casa-pacifica", "from": "2026-12-24", "to": "2026-12-27", "reason": "Owner stay" }`
→ **201** `{ "block": { "id": "blk_…", … } }`

### DELETE /api/admin/blocks/[id]

Remove a blocked range → **200** `{ "ok": true, "id": "…" }`, or 404.

### POST /api/admin/rates

Upsert a per-date nightly rate override (replaces the computed rate for that
date; still clamped to the property's min/max).

**Request** `{ "propertyId": "casa-pacifica", "date": "2026-12-31", "rateCents": 75000 }`
→ **201** `{ "rateOverride": { "id": "rate_…", "propertyId": "casa-pacifica", "date": "2026-12-31", "rateCents": 75000 } }`

### GET /api/admin/settings

**Response 200**

```json
{
  "settings": {
    "cleaningFeeCents": 15000,
    "taxRatePct": 10.5,
    "minStayNights": 1,
    "maxStayNights": 28,
    "promos": [
      { "code": "DIRECT10", "type": "percent", "percent": 10, "description": "10% off the nightly subtotal — honors Renier's promised 10%-off for direct rebookings" }
    ]
  }
}
```

### PUT /api/admin/settings

Partial update. Any subset of:
`{ "cleaningFeeCents": 15000, "taxRatePct": 10.5, "minStayNights": 1, "maxStayNights": 28, "promos": […] }`.
→ **200** `{ "settings": { …updated… } }`

### POST /api/admin/emails/resend

Re-send emails for a booking (uses the dev logger when Resend isn't configured).

**Request** `{ "bookingId": "bk_…", "type": "guest" }` (`type`: `"guest"` or `"host"`)
→ **200** `{ "ok": true, "bookingId": "bk_…", "type": "guest" }`

---

## Pricing rules (server-side)

- Base **$349/night**; Friday & Saturday nights **×1.20**; June–August **×1.15**
  (factors stack); each night clamped to **$349–$1,030**; admin rate overrides
  replace the computed nightly rate (still clamped).
- Cleaning fee: **$150** ⚠️ SAMPLE — admin-editable, Renier to confirm.
- Tax: **10.5%** ⚠️ SAMPLE — admin-editable, Renier to confirm — applied to
  (nightly subtotal − discounts + cleaning fee).
- Pet fee **$50/stay** when pets > 0 (max 1 pet).
- `DIRECT10`: **10% off the nightly subtotal** (admin-editable promo list).
- Min stay 1 night, max 28 nights (admin-editable).
- Quotes expire after **15 minutes**.

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATA_ADAPTER` | no (`sqlite`) | `sqlite` or `supabase` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | for supabase | Supabase Postgres backend |
| `STRIPE_SECRET_KEY` | for payments | **Test key only** (`sk_test_…`); live keys are refused |
| `STRIPE_WEBHOOK_SECRET` | recommended | Verifies `/api/webhooks/stripe` signatures |
| `RESEND_API_KEY` | no | Real email sending; without it, emails are written as HTML to `./.dev-emails/` |
| `BOOKING_FROM_EMAIL` | no | From: address for emails |
| `HOST_NOTIFY_EMAIL` | no | Where host notifications go (defaults to From:) |
| `ADMIN_SECRET` | for admin | Enables `/api/admin/*` (header or login cookie) |
