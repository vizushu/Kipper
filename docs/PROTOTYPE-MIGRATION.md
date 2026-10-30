# Casa Pacifica prototype-to-application migration

Reference: the owner's public v4 Casa Pacifica Unified PWA Design Prototype,
`https://casa-pacifica-booking-review.vizushu.chatgpt.site` (2026-10-30).
Read-only public HTML and explicitly linked CSS/JS were inspected. The unavailable
Sites archive was not accessed. The prototype itself was not changed.

## Migration matrix

| Prototype screen / interaction | Application mapping and boundary |
| --- | --- |
| Home, editorial content, masthead | Root and property detail share one real date-aware property experience; light ivory/forest palette, local serif headings, no internal section navbar. |
| Hero carousel, albums, photo detail | Existing verified property photographs; arrows, albums, captions, keyboard navigation, modal focus restoration. No invented room photography. |
| Video tour | Explicit coming-soon panel, not a fake playable video. |
| Rooms and amenities | Existing verified facts and full amenity disclosure; bed mapping remains pending. No prototype sauna, Wi-Fi standard, 15-person capacity or three-bathroom claims adopted. |
| Dates / guest selection | Existing real booking controller in centered panel and persistent dock at all widths; existing inclusive headcount validation, quote invalidation and date handoff retained. No illustrative blackout calendar. |
| Review / price details | Existing server quote and itemized all-in total only. Prototype sample prices and fixed nightly advertising not adopted. |
| Payment / wallet | Existing provider integration and verified-payment lifecycle retained, including expiry/stale callback protection. No simulated Apple Pay, Google Pay, Venmo, 4242 wallet or local confirmation. Stripe remains paused. |
| Confirmation / pending / failed / expired | Existing authenticated booking state and durable exception/recovery behavior; redesigned shell, never local demo success. |
| Recovery / resume | Existing bounded, non-enumerating recovery and protected cookie flow; no demo guest identity or unlocked reference. Public preview forms remain disabled. |
| Your stay / arrival / house guide | Existing authenticated booking confirmation plus public verified house rules, amenities, check-in/out information and FAQ. No sensitive access code or private Wi-Fi disclosure. A personalized arrival-guide dashboard is not connected. |
| Manage stay / cancellation | Approved policy visible; existing admin snapshot-based refund review remains read-only. No guest-side cancellation or refund execution is implied. |
| Departure checklist | Existing checkout information retained; interactive personalized checklist not connected. |
| Smart home / climate / lights | Not connected and not represented as operational; no device-control buttons copied. |
| Ask Kipper / support / host handoff | Header links to honest existing contact foundation; concierge and guest-message channels remain pending. No canned demo answer presented as an AI response. |
| Share | Explicit native share / copy dialog shares only the public canonical pathname, stripping query and hash; no sample booking data, guest selections or access tokens. |
| Settings / installation / offline | Existing installable PWA manifest and safe public offline shell retained. Light theme is default. No prototype scenario controls, fake offline mode, private cache or offline transaction replay. |

## Preserved authorities

Current 3 bedrooms, 2 bathrooms, 8 people including infants and visitors. Future
5-bedroom configuration starts March 1, 2027, America/Los_Angeles, but facts and
checkout approval remain pending. Boundary-crossing stays require manual review.
All versions share one physical inventory. $180 cleaning, verified 12.75% TOT and
accepted cancellation snapshots remain unchanged. No pricing engine or rate was
changed; dynamic/AI pricing is not active.

All APIs, databases, outbox/recovery/security mechanisms, admin authorization,
payment reconciliation and public-preview gates remain authoritative. Public
preview accepts no real reservations, payments, messages or guest recovery data.
No provider, hosting, credential, or paid-service configuration was performed.

## Verification boundary

Run full tests, TypeScript, restricted-preview production build, dependency audit
and independent review against the final integrated tree. Browser visual and
interruption checks should cover gallery open/next/back/close, date panel edits and
close/reopen, explorer handoff, narrow viewport and exact March transition.
Synthetic/local checks do not establish real Stripe/Apple Pay device behavior,
email delivery, production persistence, cross-platform inventory or concierge
integration. Those existing launch gates are unchanged.
