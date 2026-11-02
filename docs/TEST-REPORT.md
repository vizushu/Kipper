> Current brand is Casa Pacifica; Kipper refers only to concierge AI in development. Earlier branding names below are historical, not current instructions.

> Historical test reports below predate the October 30 positioning correction. Kipper is a concierge-AI startup; earlier host/operator branding is superseded and must not be used as current positioning.

# Test report — Casa Pacifica direct-booking site

Date: 2026-10-13. Verified by the build coordinator (independent re-run).

## Automated verification — ALL GREEN

| Check | Result |
|---|---|
| `npm run typecheck` (tsc --noEmit) | 0 errors |
| `npm test` (vitest) | 40/40 passed — pricing 12, availability 13, booking 15 |
| `npm run build` (next build) | 27/27 routes compiled, incl. all 16 API routes |
| Smoke test (`next start`) | `/`, `/properties`, `/properties/casa-pacifica`, `/faq`, `/policies/*`, `/admin/login`, `/checkout` → 200; `/admin` → 307 → `/admin/login`; bad booking ref → friendly 404; `/api/admin/session` → 401 without cookie; `/api/properties`, `/api/availability` → 200 with correct data |

### What the 40 tests actually prove
- **Pricing**: weekend (Fri/Sat ×1.2) and summer (×1.15) multipliers, $349–$1,030 clamp,
  DIRECT10 10%-off promo, tax on (subtotal − discount + cleaning), $50 pet fee,
  full itemized breakdown, all server-side in integer cents.
- **Availability**: overlapping ranges rejected; back-to-back stays allowed
  (checkout day = next check-in day); min-stay and 8-guest capacity enforced.
- **Booking integrity**: simulated concurrent double-booking → exactly one
  succeeds (atomic re-check inside a SQLite transaction immediately before
  booking creation); same idempotency key → same booking, no duplicates;
  expired quotes rejected.

## Genuinely working (no credentials needed)
- Guest journey: home → search → property detail → interactive calendar →
  itemized quote → checkout → confirmation with booking reference.
- Admin dashboard (behind ADMIN_SECRET session): reservations table, calendar
  with manual date blocks, rate overrides, settings (cleaning fee / tax /
  min stay), resend confirmation emails.
- Email: renders confirmations + host notifications; dev writes them to
  `./.dev-emails/*.html` for review.
- iCal import module: implemented as a SECONDARY delayed sync only, with the
  caveat documented in code and `docs/API.md`. App DB is the source of truth.
- SEO metadata + JSON-LD LodgingBusiness; analytics event stubs (console).

## Placeholder / sample (all visibly labeled in the UI)
- Cleaning fee **$150 SAMPLE** and tax **10.5% SAMPLE** — Renier has not
  confirmed; editable in admin; badged "Sample" in checkout, admin, footer.
- Map: dashed "Map — coming soon" box. No fake map.
- Reviews: honest empty state ("Guest reviews from direct stays will appear
  here."). Zero invented testimonials — verified by text search.
- Policy pages (privacy/terms/cancellation): real drafts, marked
  "Draft — under Renier's review."
- Coordinates (32.912, -117.139): approximate for map use; flagged for Renier.
- Photo 01 (shows the retired projector screen): gallery only, neutral
  caption, never the hero, never mentioned in copy.

## Incomplete — blocked on Renier's credentials/setup (nothing fabricated)
- **Stripe**: no keys configured → checkout shows an honest
  "payments aren't switched on yet" state. No test or live charge has been
  (or can be) processed. Needs: test keys for sandbox, live keys + webhook
  secret + Apple Developer Merchant ID + domain-verification file for prod.
- **Resend**: no key → file logger. Needs API key + verified domain.
- **Supabase**: no project → SQLite dev adapter only. Schema + RLS SQL
  ships in `supabase/schema.sql`; adapter switches via `DATA_ADAPTER`.
- Runtime secrets: `ADMIN_SECRET`, `EMAIL_FROM`, `HOST_NOTIFICATION_EMAIL`,
  `NEXT_PUBLIC_SITE_URL` (see `docs/CREDENTIALS-CHECKLIST.md`).

## Known environment caveat
better-sqlite3 ships no prebuilt binary for Node 24 (ABI v137) and
`prebuild-install` hangs through the egress proxy; the native binding was
compiled manually with node-gyp. **If `node_modules` is ever wiped, the
binding must be rebuilt** (see backend handoff notes) — or run on Node 22.

## Honesty statement
No availability, reservation, payment, review, or rating was invented or
faked at any point. No real payment was processed. Availability starts fully
open with no seeded bookings or blocks. Every number a guest sees is computed
server-side from the seeded rate rules + admin settings.

## Phase 2 — portfolio site (Kipper Stays)

Date: 2026-10-14. All checks re-run after the Phase 2 changes.

### What changed
- Home (`/`) restructured into the company portfolio home: brand hero
  (Kipper Stays + one-line positioning), listings index
  (portfolio cards from the `getProperties()` listings array — multi-property
  ready), TrustStrip ("Book direct" badge), why-book-direct strip, Concierge
  AI teaser (honest "In development" badge, no fake functionality), contact
  CTA. Booking search still routes to `/properties`.
- New pages: `/about` (Kipper Stays — verified facts only:
  founder Renier De La Cruz, San Diego, Casa Pacifica 3BR/2BA sleeps 8,
  9yr/383-stay genuine Airbnb track record; everything else omitted or TBD),
  `/contact` (validated contact form; no business email/phone/address published).
- New API: `POST /api/contact` — server-side validation (name/email/message),
  honeypot spam discard, delivers via Resend or the dev email file logger.
  Never throws.
- Nav: Home / Stays / About / Contact / FAQ (mobile menu works). Brand mark
  and layout metadata updated to Kipper Stays.
- New design-system components per `docs/DESIGN-SYSTEM.md`: `TitleBlock`,
  `TrustStrip`, `HostCard`, `HighlightCard` (used on About/Contact/Home).
- Untouched: Casa Pacifica booking flow (`/properties/casa-pacifica` →
  calendar → quote → checkout → confirmation), admin dashboard, all pricing/
  availability/booking logic.

### Verification
- `npm run typecheck`: 0 errors.
- `npm test`: 40/40 passed (pricing 12, availability 13, booking 15).
- `npm run build`: all routes compile, incl. new `/about`, `/contact`,
  `/api/contact` (29 routes total).
- Smoke test (dev server): `/about` → 200, `/contact` → 200,
  `POST /api/contact` with bad email → 400 `{code: INVALID_REQUEST}`,
  honeypot submission → 200 with no email written, valid submission → 200
  with email correctly rendered to `./.dev-emails/`.
- No invented content: About page contains only verified facts; Concierge AI
  teaser is badged "In development" with explicit "not live yet" copy; no
  ratings/reviews shown anywhere (none exist).
