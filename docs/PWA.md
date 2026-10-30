# Mobile-first PWA: installation and offline boundary

This increment adds a web app manifest, 192/512px standalone/maskable brand icons, an Apple touch icon, safe-area viewport metadata, and a production-only service-worker registration. Icons are locally drawn geometric K marks, not property photography. This is an installable web app, not a native app or offline booking engine.

## Offline policy
- The sole cache (`kipper-public-shell-v1`) contains a generic, self-contained `/offline.html` and three brand icons.
- Never caches property HTML, guest details, admin pages, access links, booking/confirmation pages, quote/availability responses, payment resources, or RSC payloads.
- Only exact public navigation paths (`/`, `/properties`, the two known public property slugs) get the generic fallback after a network error. Their successful responses are never written to Cache Storage.
- Any query-string URL, mutation, external-origin resource or API/private route is untouched by the worker: network-only, no queued retry or background synchronization.
- Updates do not call `skipWaiting`, avoiding forced worker replacement during checkout. Activation removes only older Kipper public-shell caches.
- The in-app offline notice and booking widget disable checkout, invalidate visible quotes and pending quote responses, and require a fresh price after reconnecting. Calendar data reloads on connection changes. Browser connection hints are not a guarantee of backend reachability; network errors remain handled normally.
- An interrupted payment is never replayed. Guests are told to verify confirmation before trying again.

## Verification
`npm test -- tests/pwa.test.ts tests/property-template.test.tsx` tests manifest/icon presence and executes the actual worker script in a controlled lifecycle/fetch harness. It checks exact precache paths, private/token/API bypasses, network-only mutations, safe public offline fallback, and no caching of fresh navigation HTML.

Before deployment: run a production build and serve it on HTTPS (or localhost), verify install in Android Chrome and Add to Home Screen in iOS Safari, check 360/393/1440px layouts, then use browser Offline mode on a public property page and checkout. Verify the offline shell has no booking data, reconnect forces requoting, and Cache Storage contains only the four allowlisted public files. No service worker is registered in `next dev`; test installation against the production server. Existing transaction HTTP cache headers remain a separate server-side responsibility.

No push notifications, offline payments, background booking submission, deployment or live payment enablement is included.

## Reproducible typography
The root layout deliberately uses Georgia for display text and the local system sans-serif for body text through the existing design tokens. Remote `next/font/google` loading was removed because a clean build failed when the font CDN was unavailable. Layout hierarchy and hospitality palette are unchanged; this is an honest fallback, not a claim to ship Fraunces/Inter. A future approved, licensed local font bundle can replace these variables without a runtime or build-time network dependency.

## Public preview isolation
Set `SITE_PREVIEW_MODE=true` before building and starting any public preview. Root metadata becomes `noindex,nofollow,noarchive`, `robots.txt` disallows all crawling, and a persistent preview banner states that bookings/payments are disabled. Contact and checkout pages render informational notices instead of guest-data or payment forms. Server-side API guards independently enforce disabled transactions; `BOOKING_TEST_MODE` must never override the public-preview guard. Crawling directives are not access control: the preview contains only public listing content, and should not contain secrets or guest data. A new build/restart is required when changing deployment mode so prerendered pages cannot retain the previous environment's presentation.
