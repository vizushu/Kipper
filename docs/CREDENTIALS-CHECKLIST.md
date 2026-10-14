# Go-live credentials & decisions checklist — Casa Pacifica direct booking

Everything the site needs from Renier before it can take REAL bookings.
Nothing here is optional for production; dev runs without all of it.

## Accounts Renier must create (only he can — identity/KYC/bank)

- [ ] **Supabase project** → supply `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
      (server only), `SUPABASE_ANON_KEY`. Then run `supabase/schema.sql`.
- [ ] **Stripe account** (switch from test to live when ready) → live
      `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
      `STRIPE_WEBHOOK_SECRET` (webhook pointed at `/api/webhooks/stripe`).
- [ ] **Apple Pay**: Apple Developer Merchant ID (`APPLE_PAY_MERCHANT_ID`)
      + domain-verification file served at
      `/.well-known/apple-developer-merchantid-domain-association`.
      Without this, Apple Pay button will not appear; card fallback works.
- [ ] **Email**: Resend API key (`RESEND_API_KEY`), sending domain, and the
      address booking confirmations come from (`EMAIL_FROM`) + host inbox
      (`HOST_NOTIFICATION_EMAIL`). Dev uses a file logger — no real emails.
- [ ] **Custom domain** (optional but recommended, e.g. casapacificastay.com)
      → set `NEXT_PUBLIC_SITE_URL` to the final domain.

## Numbers Renier must confirm

- [ ] **Cleaning fee** (dev default is a SAMPLE $150)
- [ ] **Tax rate** (dev default is a SAMPLE 10.5%)
- [ ] **Nightly rate rules**: confirm $349 floor / $1,030 ceiling and whether
      weekend/seasonal multipliers are wanted, or flat pricing instead
- [ ] **Minimum stay** (dev default 1 night)
- [ ] **Cancellation policy** wording for direct bookings (assumed Firm)
- [ ] **Promo/discount codes**: guests were promised 10% off direct —
      confirm code name (dev default `DIRECT10`) and expiry

## Content Renier should supply

- [ ] Projector-free hero photo (current cover shows the retired projector
      screen — do not advertise it)
- [ ] Any updated photos if rooms have changed since the Oct 5 export
- [ ] Privacy policy / terms of service final text (drafts ship with the site)
- [ ] Support contact email/phone for the footer

## What stays in test mode until Renier acts

Stripe is TEST-MODE ONLY in this build. No real charges are possible until
Renier supplies live Stripe keys AND completes Apple Pay merchant setup.
