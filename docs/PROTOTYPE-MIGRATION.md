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

## October 30 visual simplification

Applied the owner's four screenshot references: no menu icon, smaller translucent
video label and transparent white gallery/share controls (44px hit areas retained),
exact requested headline, compact highlights and six amenity icons, room cards,
policy summary/disclosure, neighborhood-only location and empty verified-review
panel. Full property/rules/FAQ information remains accessible in disclosures.
The intro's requested 15 guests / 5 bedrooms / 3 baths is explicitly labelled as
the March 1, 2027 expansion, not current inventory approval. Current 8-person cap,
three bedrooms/two baths and all future checkout gates remain unchanged. Pool table
is supported by existing property context and photography; unsupported Wi-Fi radio
specifications and staffed-hotel claims were not copied. Bedroom cards use existing
room-labelled photographs only; no bed sizes or layouts are asserted. The prototype's
exact-address map was not copied because the application withholds the precise
address until verified guest access. The public neighborhood link remains general.

## Consistent browsing revision (October 30, 23:54 request)

The latest eight screenshots supersede earlier hero chrome and expansion facts.
Back actions use a bare arrow + Back; Ask Kipper gets a diagonal arrow. The hero
supports pointer/touch swipe and keyboard navigation with a moving five-dot window;
its tap still opens albums and swipes suppress accidental taps. The share glyph is
an upload arrow inside a translucent circle, not the Ask Kipper diagonal arrow.

The current icon row is 8 guests / 3 bedrooms / 2 baths, with a quiet “5 bedrooms
available in 03/27” indicator. Repeated future/current browsing warnings and access
paragraphs are removed; actual selected-date errors and every server booking gate
remain. Public FAQ/draft terms presentation avoids the removed floor/shared-space
emphasis without claiming an entire property. Original property data and accepted
booking terms/snapshots are unchanged. Room and policy dialogs support outside
click, Back/Close, Escape and opener focus restoration. Policies use current limits.

The map is an OpenStreetMap neighborhood embed with broad Mira Mesa bounds
(-117.19,32.90,-117.10,32.96), not property coordinates or an address pin. The overlay
is labelled approximate area, not a property radius. It never reads property location
fields or guest data, sends no referrer, and preserves OSM attribution. The map opens
only broad neighborhood geography; exact address remains for confirmed guests.
Geographic context was checked against the City of San Diego Mira Mesa community
plan: https://www.sandiego.gov/planning/community-plans/mira-mesa . The OSM public
embed returned HTTP200 during implementation. It is not cached by the PWA.

This candidate includes the approved unified Ask Kipper page (no connected messaging)
which was published but intentionally not deployed separately.

### Browser compatibility repair

Live Chromium inspection found the OSM embed required WebGL. It is replaced by
ordinary raster image tiles for the same broad neighborhood center, loaded only
when the map enters the viewport. Only nine intersecting tiles at one fixed zoom
are requested, using browser caching and an origin-only Referer; no query, guest
information or property location is transmitted. No tile archive, prefetch,
offline download, proxy or service-worker map cache is added. Attribution stays
visible, and a failed image has an honest external-map fallback. SVG diagonal
arrows replace missing-font glyphs in header/footer/policy/map links.
Policy checked: https://operations.osmfoundation.org/policies/tiles/ ; tile math:
https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames . Browser/device rendering
still needs verification after this exact repair is deployed.

### Oct 31: full navigation/amenities consistency pass
- Shared full-shaft SVG Back control now covers albums, photo viewer, video, room, share, date panel, property breadcrumb, contact and booking return. Albums/photo retain the site masthead; Back returns photo → albums → property, with selected album focus restored. Duplicate X removed wherever Back already exists. Standalone policy/amenities popups retain their sole X.
- Gallery title scale is shared across all three layers. Section CSS no longer overrides nested dialog headings; form-control font inheritance no longer overrides explicit size/weight utilities. Calendar and photo navigation use the same thin arrow family; diagonal arrows use a common 16px SVG.
- Amenities use an ivory native dialog with two-column icon rows, full existing verified categories, Escape/outside dismissal and opener restoration. No prototype-only amenity or Wi-Fi specification imported.
- Expansion badge now says “5 bedrooms · 3 baths available in 03/27”; current 8-person/3-bedroom/2-bath capacity and future checkout approval remain unchanged.
- Existing Casa Pacifica sun/wave icon brands the broad neighborhood circle, not a property pin. Geography, attribution, raster loading policy and address privacy are unchanged.
- Acceptance includes deployed desktop/narrow checks of every gallery layer, date/room/share/policy/amenity dialogs, Back hierarchy, close/reopen/focus, map branding and contact. Automated checks do not imply physical touch-device or payment-provider testing.
