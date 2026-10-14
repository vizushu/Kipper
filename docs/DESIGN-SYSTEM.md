# Kipper Design System — Phase 1 Spec

**Status:** Spec for review (no code changes yet). Applies to the portfolio site (Phase 2), property pages (Phase 3), and everything after.
**Design law:** Airbnb's listing-page simplicity. One decision per screen.

## 1. What the reference teaches

From the Airbnb listing reference (Invisible House), the anatomy is:

1. **Full-bleed photo** up top — floating back / share / save buttons, photo counter ("1 / 50"). The photo sells; chrome stays out of the way.
2. **Centered title block** — property name (large, tight), then one muted line for place ("Entire home in Joshua Tree, California"), then one fact row ("6 guests · 3 bedrooms · 3 beds · 5 baths"), then rating ("★ 4.92 · 86 reviews"). Four lines, decreasing emphasis. Nothing else competes.
3. **Badge card** — a single trust strip ("Luxe — extraordinary homes, vetted for quality"). One badge, not five.
4. **Host card** — avatar, "Hosted by X", one credibility line ("Superhost · 11 years hosting").
5. **Highlight cards** — icon + bold lead + one muted supporting line ("In the Joshua Tree desert landscape — set in the open desert…"). Scannable, max two lines of support copy.
6. **Sticky bottom CTA (mobile)** — left: price state ("Add dates for prices") + rating; right: one big button ("Check availability"). The thumb never hunts.

The principle underneath: **the page answers three questions in order — what is it, can I trust it, how do I book it.** Everything else is below the fold or behind a tap.

## 2. Brand tokens (existing system — keep)

Already in `tailwind.config.ts`. Phase 1 does not reinvent these; it documents them as the brand.

| Token | Value | Use |
|---|---|---|
| `paper` | `#FAF8F5` | Page background |
| `cream` | `#F3EFE8` | Section alt background |
| `ink` | `#1C1917` | Primary text |
| `espresso` | `#292524` | Deep surfaces |
| `clay` / `clay-dark` / `clay-soft` | `#A8552F` / `#8A4526` / `#F5E9DF` | Primary CTA / hover / tinted bg |
| `moss` | `#4D5B4A` | Secondary accents |
| Display font | Fraunces (via `font-display`) | Titles only |
| Body font | Inter (via `font-sans`) | Everything else |
| Radius | `xl` 1rem, `2xl` 1.25rem | Cards, buttons, inputs |
| Shadows | `card`, `lift` | Restrained; cards rest, CTA lifts on press |

Type scale (to enforce, not suggest): title 32–40px display / section 22–24px display / body 16–17px sans / muted 14–15px sans / micro-labels 12–13px uppercase tracked.

## 3. Pattern translations (Airbnb → Kipper)

| Airbnb pattern | Kipper implementation | Notes |
|---|---|---|
| Full-bleed photo + floating buttons | Keep `PhotoGallery`; add floating back/share/save on mobile | Counter "n / 13" already exists pattern |
| Centered title block | **New:** `TitleBlock` component — name, place line, fact row, rating | Replaces left-aligned property header on Casa Pacifica page (Phase 3) |
| Fact row | `guests · bedrooms · beds · baths` with middot separators, muted | Single source: property record |
| Rating line | `★ x.xx · n reviews` — **only when reviews exist**; otherwise omit entirely (never fake) | Casa Pacifica: omit until real reviews |
| Badge card | `TrustStrip` — one badge max ("Best rate — book direct") | Already have the copy; restyle to the reference card |
| Host card | `HostCard` — avatar/logo, "Hosted by Kipper", one credibility line | Credibility line must be true (e.g. "Independent host · San Diego") — no invented Superhost claims |
| Highlight cards | `HighlightCard` — icon + bold lead + ≤2 lines muted | Map to real differentiators (heated pool, sleeps 8, near La Jolla) |
| Sticky bottom CTA | `StickyBookBar` (mobile) — left: price state + rating; right: "Check availability" | Already have sticky bottom bar concept — restyle to match reference proportions |
| Listing cards (portfolio) | Photo, name, place, fact row, nightly price, rating-if-real | Phase 2 |

## 4. What exists vs. what changes

**Exists in the codebase today** (keep): warm-neutral tokens, Fraunces/Inter pairing, `PhotoGallery` + lightbox, `BookingWidget` (calendar + guests + quote), sticky booking card (desktop), itemized price breakdown, `FaqAccordion`, badge/ui primitives in `components/ui`.

**Evolves in Phase 2/3** (code changes, after this spec is approved):
1. New `TitleBlock`, `TrustStrip`, `HostCard`, `HighlightCard`, `StickyBookBar` components.
2. Property page header: left-aligned → centered title block per reference.
3. Mobile sticky bar restyled to reference proportions (price-state left, single CTA right).
4. Portfolio listing cards per the card anatomy above.
5. Calendar price labels: fix crowding/overlap noted in the Oct 13 walkthrough.

## 5. Don't list (non-negotiable)

No gradients, no glassmorphism, no oversized marketing headlines, no auto-playing video heroes, no parallax, no fake ratings/badges, no stock photography passed off as the property, no more than one primary CTA per viewport, no clutter above the title block.

## 6. Motion & accessibility

- Micro-interactions only: button press states, gallery transitions, calendar day selection. 150–200ms ease-out.
- `prefers-reduced-motion`: disable transitions.
- Contrast: ink on paper (15.9:1), clay on white for CTA (4.6:1 — large text/buttons only, never small muted copy).
- Touch targets ≥ 44px. No horizontal scroll at 360px.
