# Deployment guide — Casa Pacifica direct-booking site

## 1. Local development (works today, zero credentials)

```bash
cd ~/workspace/your_files/direct-booking-site
npm install
cp .env.example .env
# Generate an admin secret, e.g.:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# put it in .env as ADMIN_SECRET=...
npm run dev   # → http://localhost:3000
```

- Data: local SQLite file at `./data/bookings.db` (created automatically).
- Payments: Stripe TEST mode only. Without keys, checkout shows an honest
  "payments aren't switched on yet" state.
- Email: without `RESEND_API_KEY`, confirmations are written as HTML files
  under `./.dev-emails/` — open them in a browser to review.
- Admin: http://localhost:3000/admin/login (uses ADMIN_SECRET).

## 2. Production prerequisites (Renier — see docs/CREDENTIALS-CHECKLIST.md)

1. Create a **Supabase** project. In its SQL editor, run `supabase/schema.sql`.
   Copy the project URL + service-role key + anon key into env.
2. Create a **Stripe** account. When ready for real money, replace test keys
   with live keys and add a webhook endpoint → `/api/webhooks/stripe`
   (events: `payment_intent.succeeded`, `payment_intent.payment_failed`).
3. **Apple Pay**: in Apple Developer, create a Merchant ID, add it as
   `APPLE_PAY_MERCHANT_ID`, and serve the domain-association file at
   `/.well-known/apple-developer-merchantid-domain-association`
   (place the file Apple gives you in `public/.well-known/`).
   Without this the Apple Pay button will not render; card checkout still works.
4. **Resend**: verify your sending domain, set `RESEND_API_KEY`, `EMAIL_FROM`,
   `HOST_NOTIFICATION_EMAIL`.
5. Set `DATA_ADAPTER=supabase`, `NEXT_PUBLIC_SITE_URL` to the final domain.

## 3. Deploy the app

Recommended: Vercel (or any Node host).

```bash
npm run build
npm start   # serves on $PORT
```

- Set every variable from `.env.example` in the host's env dashboard.
- `ADMIN_SECRET` must be a long random string, different from dev.
- SQLite is dev-only: never use `DATA_ADAPTER=sqlite` in production
  (the file would not persist / scale on hosted platforms).

## 4. Go-live verification (do these in order)

1. `npm run typecheck`, `npm test`, `npm run build` — all green.
2. In Stripe TEST mode, complete a full booking: search → quote →
   pay with test card 4242 4242 4242 4242 → confirmation page + reference.
3. Confirm the guest email + host notification arrived (or check `.dev-emails/`).
4. In admin, verify the reservation appears and the dates are blocked for
   a second overlapping attempt (must be rejected).
5. Switch Stripe to live keys ONLY after Renier approves; re-run one real
   $1 test booking and refund it.

## 5. What this deploy does NOT do (be honest)

- No Airbnb/Guesty reservation sync. The app's own database is the source
  of truth. iCal import exists as a delayed secondary sync only.
- No native mobile app. The site is mobile-first web.
- Analytics events are stubbed (console) until wired to a provider.
