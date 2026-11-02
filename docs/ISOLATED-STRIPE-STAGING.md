# Isolated Stripe test service (code preparation only)

No service, credential, domain, provider configuration or message has been created by this change. Owner authorization is required before provisioning or making Stripe test-network calls. Never add real payment/card/guest data. Owner-test real email remains unimplemented.

## Required isolation

Use a **new, dedicated HTTPS origin and a single ephemeral instance**, never the production/preview hostname, disk, database, deployment or environment group. Set `STAGING_TEST_MODE=true` at **build and runtime**. Build again if the mode changes; server-rendered UI must match the perimeter. Keep the current public preview unchanged. `SITE_PREVIEW_MODE=true` continues blocking transaction endpoints even with staging enabled; the separate test service requires explicit `SITE_PREVIEW_MODE=false`.

Required perimeter configuration:
- `STAGING_ORIGIN`: exact dedicated HTTPS origin (no path, credentials, query or fragment).
- `STAGING_ACCESS_PASSWORD`: independently generated random base64url string, 32–128 characters (prefer at least32 random bytes).
- `STAGING_SESSION_SECRET`: independently generated random base64url string,43–128 characters (at least32 random bytes); not equal to password.

No secret values belong in source, logs, browser bundles or this document. Credentials above are server-only. Fail-closed503 if missing/invalid; health exposes only mode and liveness, not readiness/configuration.

Payment configuration, **only after authorization**: `BOOKING_PAYMENT_MODE=test`, `STRIPE_SECRET_KEY=sk_test_…` or restricted `rk_test_…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`, dedicated test `STRIPE_WEBHOOK_SECRET`. Existing booking/access/terms approvals are still required. Live keys/events are rejected even with contradictory live flags. Configure a restricted key only with the minimum PaymentIntent create/read permissions needed; actual credential permissions have not been tested.

## Perimeter

`/staging/login` is minimal server HTML with no public scripts/assets. Successful same-origin POST `/api/staging/login` issues a purpose-bound HMAC session for30minutes, host-only `__Host-kipper_staging`, Secure, HttpOnly, SameSite=Strict. No BasicAuth/Bearer substitution: guest booking Bearer capabilities retain their existing role. POST logout is same-origin and removes the browser cookie; already copied signed cookies remain valid until expiry (rotate session secret to revoke all immediately). Password rotation alone does not revoke existing cookies.

All pages, RSC/prefetch, API routes and static assets are protected. Only exact GET `/api/staging/health`, GET `/robots.txt`, minimal login, login/logout POST, and exact POST `/api/webhooks/stripe` bypass the session; webhook still requires existing Stripe signature and test-mode checks. Authenticated non-safe HTTP methods additionally require the exact configured Origin. No open redirect/forwarded-IP trust.

Login attempts use one persisted global bucket in `/tmp/kipper-staging/auth.db`:20 attempts per15minutes, success also consumes an attempt. The single-row SQLite limiter survives process restarts but **ephemeral instance replacement clears it**; this is not a distributed limiter. It deliberately permits an attacker to temporarily exhaust login access rather than evade per-IP limits. One-kibibyte body and5second body deadline. Dedicated single-instance deployment is required; do not scale replicas without a shared limiter. Random high-entropy password is essential.

## Storage and effects

Bookings use only `/tmp/kipper-staging/bookings.db`, ignoring production `SQLITE_PATH`, explicit constructor paths and configured Supabase adapter. Symlink file/directory paths are rejected. Do not mount/copy production files into `/tmp/kipper-staging`. Data disappear on service replacement; never treat it as an operational reservation system.

Calendar fetch/import/export, contact submission, Resend transport/webhook, outbox delivery and operator external delivery are blocked even with contradictory flags. Contact/SMS help pages are replaced with a synthetic-only notice. No production calendar feed/export token, Resend key, liveStripe key or real guest data should be installed at all. No new scheduler exists.

Every middleware response, including errors/redirects/assets, carries private no-store and noindex. Service worker and manifest are denied; staging UI never registers a worker, unregisters existing workers and clears origin caches. The dedicated fresh origin avoids an already controlling production service worker. Persistent banner labels synthetic reservations; test receipts are not actual reservations. Logout uses native same-origin POST.

## Verification and limits

Credential-free unit/integration tests cover token expiry/tamper/rotation, exact bypasses, CSRF, no-store/noindex, login rate/body bounds, test/live collisions, preview precedence, fixed SQLite and disabled effects. Test Stripe fetch/provider permissions, actual TLS browser cookies, webhook delivery and end-to-end test-card outcomes still require separately authorized staging operation; unit tests are not evidence those integrations work.

Official Next.js15 middleware uses Edge-compatible Web APIs: https://nextjs.org/docs/15/app/guides/self-hosting and https://nextjs.org/docs/15/pages/guides/authentication . This perimeter uses WebCrypto, not Node crypto, in middleware; Node SQLite/password helpers exist only in route handlers.

The anonymous staging Stripe callback body is bounded to64KiB and5seconds before signature verification; preview still rejects before reading. Both property entry points pass the server-only staging flag to suppress the map component entirely, so neither OSM tiles nor Mapbox are mounted or fetched. This does not change production map behavior.
