# Dependency and preview review — October 30, 2026

This is not a declaration that the application is vulnerability-free or production-ready.

## Dependency remediation
- Next.js pinned to15.5.28, the upstream patch for GHSA-2464-fhr4-w9xw and GHSA-p3m5-59mp-jv5r. Existing sharp0.35.5 already met the image-advisory workaround; the patch removes reliance on that workaround alone. No Server Actions are used by this application.
- Zod updated to4.6.6; shared error handling migrated from `.errors` to `.issues`. Full application validation tests must pass after the major-version update.
- Root and nested PostCSS overridden to8.5.32, above patched8.5.23 for the incomplete source-map file-read fix. The application does not accept user-supplied CSS, but we avoid retaining the vulnerable transitive version.
- qs overridden to6.17.1 to remove the installed6.16.0 stringify advisory through Stripe. No live Stripe provider integration has been exercised.
- Dependencies/lockfile are committed; deploy with `npm ci`, not an unlocked install. Refresh audit and monitor upstream advisories before real booking launch.

Primary advisory references:
- https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw
- https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp
- https://github.com/advisories/GHSA-6pq8-jhm2-2vcw

## Public-preview boundary
SITE_PREVIEW_MODE=true must be present during build and runtime. It disables all booking/payment/contact/admin/guest-lookup operations even if local test mode is accidentally enabled. No guest data or existing database is loaded into preview; no Stripe/admin/booking-access/email/Supabase secrets are required or authorized. Contact and checkout forms are absent; banners and robots/noindex identify preview. Service worker caches only a generic offline document and three brand icons, never HTML containing stay data, tokens, API responses or mutations.

The draft PR is not approval to merge or enable real bookings. Real-browser/mobile/PWA/Stripe/OTA validation, secure guest recovery, receipt delivery reliability, backups/restore and production hosting remain separate gates documented in LAUNCH-CHECKLIST and DEPLOYMENT-CHECKLIST.

## Verified patched checkpoint
After the above updates:160 tests passed; TypeScript passed; SITE_PREVIEW_MODE=true production build passed. Fresh `npm audit --omit=dev` reported0 known production dependency vulnerabilities on October30,2026. Runtime HTTP smoke returned public pages/manifest200, robots denyall, booking/contact/payment APIs503, guest lookup404 and admin401—even with BOOKING_TEST_MODE=true. A fresh configured SQLite path remained absent, proving preview smoke did not initialize a guest database. These checks do not replace browser/device or production-integration testing.
