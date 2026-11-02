# Admin session security

Public preview denies login, logout, session authentication and protected APIs
before session storage or mutation. No admin secret or provider account is
configured by this implementation.

## Session lifecycle

A successful same-origin login consumes the persistent login budget, verifies the
configured ADMIN_SECRET, generates a fresh 256-bit random cookie and stores only
its SHA-256 hash. The server enforces an absolute eight-hour expiry and revocation.
The HttpOnly cookie is SameSite=Lax, path=/, Secure in production, with matching
maximum lifetime. Client cookie retention never overrides server expiry.
A namespaced secret-version hash also invalidates sessions after ADMIN_SECRET
rotation. Historical deterministic cookies no longer authenticate.

Sign out revokes the current session server-side before clearing its cookie.
Failure to persist revocation returns an error, not false sign-out success.
Repeated sign-out is safe. Authentication lookup failure denies access. Sessions
are not silently refreshed on activity; signing in creates a new independent
session. The interface does not provide a device/session-management dashboard;
rotating the configured admin secret invalidates every old browser session.

## Origin and automation boundaries

Every existing protected mutation uses the shared asynchronous guard. A
cookie-authenticated write needs an exact same-origin Origin header. Missing,
null, malformed and foreign origins are rejected; forwarded host headers are not
trusted. The expected origin comes from the configured canonical site URL,
Render external URL, or request URL fallback. Login/logout also require this
origin check. Deployment must use the actual canonical origin.

Explicit machine authentication using x-admin-secret remains available only while
ADMIN_SECRET is configured and preview is off. It uses fixed-length digest
constant-time comparison. An incorrect header cannot bypass the origin check when
a valid cookie is also present. Never expose the machine secret in browser
storage, URLs or public configuration.

## Persistent login budget

Before body parsing or secret verification, login consumes one global
20-attempt/15-minute persistent bucket. Only a hash of a fixed namespace is stored;
no submitted secret or untrusted forwarded IP becomes a limiter key. Exhaustion
returns 429 with Retry-After; limiter-storage failure returns 503. This deliberately
coarse single-property MVP budget can temporarily deny legitimate login during
abuse. Production ingress protections are still required; this is not a substitute
for perimeter rate limiting or managed identity/MFA.

## Verification scope

Synthetic tests cover random/hash-only tokens, precise expiry, revoke/replay,
secret rotation, preview override, storage failures, login throttling, login and
logout cookie behavior, bogus-header origin bypass, and every existing admin
mutation route. Database-specific persistence/concurrency tests are separate.
No real credentials, external messages or live actions are part of this work.

## Booking request abuse budgets

Hold creation uses persistent global (60 requests / 15 minutes) and normalized-email (5 requests / 15 minutes) budgets before creating inventory holds or payment intents. Global budgeting happens before parsing; retries also count. Per-guest identity is HMAC-hashed with the existing booking-access secret, not stored as raw email. No caller-controlled forwarded-IP headers are trusted. A storage failure closes new booking requests; exhausted budgets return 429 with Retry-After. These conservative single-property limits are not a CAPTCHA, identity verification, distributed-edge defense or an OTA inventory lock. Monitor false positives before launch; ingress defense and operational response remain production prerequisites.
