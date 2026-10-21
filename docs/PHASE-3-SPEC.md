# Phase 3 Spec — Repeatable Property Page Template

**Status:** Ready for builder review (review-duty gate applies — see §12)
**Owner:** Muse (spec) · **Builder:** Claude · **Design:** Astra (direction approved 2026-10-21)
**Tickets:** #11 (this spec) · #12 (build) · #13 (content facts — Renier)
**Gate:** Astra's wireframe review (2026-10-16) → Renier approved direction + revised wireframes (2026-10-21, PR #9)

## 1. Objective

Turn the existing Casa Pacifica property page into a **repeatable, config-driven template** implementing the approved A+C hybrid: A's structure (photo-first, centered title, fact row, host card, sticky booking) + C's booking transparency and mechanics + restrained editorial sequencing. Casa Pacifica is instance #1; property #2 must be addable as data + photos only — no template code changes.

Guiding principle (Astra): *"Photography earns attention. Clear information builds confidence. Transparent pricing earns the booking."*

## 2. References (source of truth, in order)

1. `wireframes/revised-ac-hybrid.html` — approved layout: desktop 1440px, mobile 393px, 4 booking states, P0/P1 compliance map, annotations keyed to decisions D1–D8.
2. `docs/DESIGN-SYSTEM.md` — tokens, type scale, component patterns, don't-list. **Where it conflicts with Astra's P0 list, P0 wins** (see §4).
3. `docs/API.md` — `GET /api/properties/[slug]`, `GET /api/availability`, `POST /api/quote`. The page never computes prices; it renders quote output.
4. Notion Decision log 2026-10-21 — direction approved; gate approved; Phase 3 unlocked.

## 3. Current state (verified 2026-10-21)

- `src/app/properties/[slug]/page.tsx` (285 lines): server component, loads the `Property` record via `getProperty(slug)` (`@/data/api`). Sections today: PhotoGallery → stat row → About this stay → Sleeping arrangements → Amenities → Guest access → House rules → Check-in & cancellation → Location → FAQ → Guest reviews → Good to know → BookingWidget.
- **Keep as-is:** `PhotoGallery` + lightbox (accurate counter, 13 real photos), `BookingWidget` (calendar + guests + quote), `FaqAccordion`, `components/ui` primitives, brand tokens (paper/cream/ink/clay/moss, Fraunces display + Inter body).
- **The delta is:** centered `TitleBlock` replacing the left-aligned header, new `TrustStrip` / `HostCard` / `HighlightCard` / `StickyBookBar`, section order per the wireframe, content-compliance fixes (§4), and the 4-state booking behavior made explicit (§7).

## 4. Conflicts this spec resolves

1. **Best-rate claim — REMOVE.** The current page metadata says "Book direct for the best rate" and DESIGN-SYSTEM §3 suggests a "Best rate — book direct" badge. Astra's P0 (approved) bans unverified best-rate guarantees. **P0 wins:** no best-rate language anywhere (page, metadata, badges) until Renier approves a rate policy. `TrustStrip` carries the license instead — see §5.
2. **Reviews — GATED.** The current page renders a "Guest reviews" section. Render ratings/reviews **only** when real review data exists for that property on this platform. Casa Pacifica has none at launch → omit the section and the rating line entirely. Never import Airbnb ratings/review counts.
3. **Cancellation copy — SETTINGS ONLY.** No cancellation claim renders until the wording is approved (ticket #13) and stored in admin settings. No "free cancellation" placeholder text anywhere, including the booking widget.

## 5. Page anatomy (top → bottom)

| # | Section | Component | Status | Content source |
|---|---|---|---|---|
| 1 | Hero gallery | `PhotoGallery` | keep | `property.photos` (13, captioned, counter "n / 13") |
| 2 | Title block (centered) | `TitleBlock` | **new** | name → place line ("Entire downstairs home in Mira Mesa, San Diego") → fact row (`8 guests · 3 bedrooms · 4 beds · 2 baths`) → rating line **only if §4.2 passes** |
| 3 | Trust strip (one badge max) | `TrustStrip` | **new** | "Licensed San Diego short-term rental · STR-13982L" (verified fact, not a claim) |
| 4 | Host card | `HostCard` | **new** | "Hosted by Kipper" + truthful credibility line ("Independent host · San Diego"). No Superhost or years-hosting claims |
| 5 | Highlights (3 max) | `HighlightCard` | **new** | icon + bold lead + ≤2 lines muted; Casa Pacifica: private pool (heating included), game & billiards room, near La Jolla & beaches |
| 6 | The space | section | restyle | Exactly what guests book: the entire downstairs; upstairs is a separate ADU with its own entrance — no shared indoor spaces. Material limitations stated, not hidden |
| 7 | Sleeping arrangements | section | keep/restyle | Per-room beds from `property.sleeping` (values in §6) |
| 8 | Amenities | section | keep/restyle | `property.amenities` — the 8 verified items in §6 |
| 9 | House rules | section | keep/restyle | `property.rules` — incl. capacity, quiet hours, pet policy with the $50 fee |
| 10 | Location | section | keep | Neighborhood-level; no street address pre-booking |
| 11 | FAQ | `FaqAccordion` | keep | `property.faqs` |
| 12 | Good to know | section | keep | Check-in/out times, license, TOT — facts only |
| 13 | Booking rail (desktop, sticky) / booking bar (mobile, sticky) | `BookingWidget` + `StickyBookBar` | restyle + **new bar** | §7 — exactly one dominant CTA per viewport: rail on desktop, bar on mobile, never both visible |

## 6. Data contract

The template consumes only the `Property` record + admin pricing settings. **No property facts hardcoded in components.** Casa Pacifica values:

**Verified (ship as-is):** name Casa Pacifica · Mira Mesa, San Diego, CA · sleeps 8 · 3 BR · 2 BA · check-in 3 PM / checkout 11 AM · max 8 overnight, 10 total incl. visitors · quiet hours 10 PM–8 AM · no parties/events, smoking/vaping, drugs · pets: max 1, $50/pet/stay · do not block neighbor's driveway · license STR-13982L · host "Kipper"

**Amenities (8):** private pool (pool heating included — never claim the heater is on/ready) · cabana · game/billiards room · full kitchen · washer/dryer in garage · surfboards (guests haul them, bring own leashes) · AC · Wi-Fi

**Sleeping (as drawn in the wireframe; Renier confirms on #13):** Bedroom 1 king · Bedroom 2 queen · Bedroom 3 twin-over-full bunk · living room queen sleeper sofa

**Pending ticket #13 (do NOT invent):** final cleaning fee + tax rate (engine settings — they appear only inside live quotes), cancellation wording (suggested default unapproved), amenity sign-off, bed-mapping confirmation.

**Hard bans (never render, any property):** backyard projector (removed), cedar sauna (not built), best-rate guarantees, transferred review history, AC known-issue framing (internal only).

## 7. Booking interaction — the 4 states

Implemented in `BookingWidget`; `StickyBookBar` mirrors the same state on mobile.

1. **No dates:** price area reads **"Add dates to see price"**. CTA: "Check availability" → focuses/scrolls to the calendar. No nightly price shown anywhere in this state.
2. **Dates selected → validating:** call `GET /api/availability`. Rule failures (min stay, blocked dates, guests > max) show inline, specific messages; no quote is requested or shown.
3. **Quote:** `POST /api/quote` returns the itemized breakdown (nightly × nights, cleaning fee, taxes, total) — rendered verbatim from the response. **Any change to dates/guests invalidates the displayed quote immediately** (back to state 2/3 loading; never a stale total). CTA becomes the booking action into the existing checkout flow.
4. **Checkout handoff:** the quote/booking reference passes to the existing `/checkout` flow. The property page collects no payment details.

## 8. Responsive & accessibility (from P1 + DESIGN-SYSTEM §6)

- Layouts verified at **1440px, 393px, and 360px** — no horizontal scroll at 360px.
- `StickyBookBar`: safe-area insets respected; price-state text left, single CTA right (reference proportions).
- Touch targets ≥ 44px everywhere, incl. calendar days and gallery controls.
- Micro-interactions only (150–200ms ease-out); `prefers-reduced-motion` disables transitions.
- Contrast per design system (ink on paper 15.9:1; clay reserved for large text/buttons).
- All photos carry real alt text from the property record; gallery counter is accurate.

## 9. SEO / metadata

- Title/description from the property record (existing `generateMetadata` pattern).
- **No best-rate or superlative claims in metadata** (§4.1 applies here too — the current "best rate" description string is removed).
- OG images: first 3 property photos.

## 10. Acceptance criteria

- [ ] Page renders Casa Pacifica entirely from the property record + settings; zero property facts hardcoded in components
- [ ] Sections in §5 order; `TitleBlock` centered; one dominant CTA per viewport at every width
- [ ] All 4 booking states behave per §7; quote invalidation on any input change is demonstrable
- [ ] No banned content (§6) anywhere in rendered output or metadata — grep-able
- [ ] Reviews section absent for Casa Pacifica; renders only with real data present
- [ ] No cancellation claim renders while ticket #13's wording is unapproved
- [ ] Second-property proof: a stub property record renders the full template without code changes (test fixture is fine)
- [ ] Typecheck, unit tests, production build, and smoke tests pass (repo `verify` CI green)

## 11. Evidence required in the build PR (#12)

CI green + screenshots at 1440 / 393 / 360 of: hero + title block, booking states 1 and 3, sticky bar (mobile). List any spec deviations in the PR body — deviations without a flag are a process failure.

## 12. Process (non-negotiable)

1. **Review duty first:** Claude reviews this spec + the wireframe and posts flags (as `type: flag` tickets or #kipper-build FLAG posts) **before** writing code. "Reviewed — no flags" stated explicitly counts.
2. Build on a feature branch; one PR referencing #11 and #12.
3. Muse runs the verification gate (spec compliance, factual-content check, CI) before merge.
4. Content values from #13 drop into settings/data when Renier supplies them — they never block the template build.

## 13. Out of scope

Booking-engine internals and checkout (existing, Phase 4 extends), portfolio/listing index (Phase 2, done), concierge AI (Phase 5a), multi-property dashboard (Phase 6), production deployment inputs (Supabase/Stripe/Resend — tracked separately).
