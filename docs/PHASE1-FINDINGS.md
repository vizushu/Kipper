# Phase 1 findings — Casa Pacifica direct-booking site

Date: 2026-10-13. Environment: node v24.20.0, npm 10.9.4, 98G disk free.

## Photos / assets — FOUND (real, no placeholders needed)

13 genuine Casa Pacifica listing photos recovered from
`~/workspace/airbnb-listing-migration/photos/` (1200×900, from the Oct 5
listing migration). Copied to `public/photos/casa-pacifica-01..13.jpg`.

Photo-tour order (from the verified export): 01 pool (cover), 02 living
room, 03 kitchen, 04 dining, 05 additional, 06 bedroom 1, 07 living room,
08 additional, 09 bedroom 2, 10–11 kitchen, 12 bedroom 3, 13 dining.

⚠️ Content note: photo 01 shows the backyard projector screen. The
projector has been REMOVED from guest use and must not be advertised.
The photo itself is real and may stay in the gallery, but no copy may
mention a projector, and it should not be the hero. Hero = pool sunset
is risky for the same reason; prefer a daytime pool/exterior or living
room shot for the hero until Renier supplies a projector-free hero.

Verified property copy (description, guest access, house rules, 69
amenities, highlights, host bio) taken from
`~/workspace/airbnb-listing-migration/old-listing-export.md`.

## Reviews

No genuine direct-booking reviews exist yet. Per honesty rules: NO
invented testimonials. The site will show a factual host track record
("9 years hosting on Airbnb · 383 stays") and an honest empty state on
the property page until genuine direct reviews exist.

## Pricing defaults (dev)

- Base nightly $349, clamp [$349, $1,030] (per Renier's Smart Pricing band).
- Weekend (Fri/Sat) ×1.20, June–August ×1.15 — dev logic, admin-editable.
- Cleaning fee: **SAMPLE $150** — Renier has not confirmed; admin-configurable.
- Tax rate: **SAMPLE 10.5%** (San Diego TOT placeholder) — Renier has not
  confirmed; admin-configurable. Flagged in the go-live checklist.
- Pet fee $50/stay, max 1 pet (confirmed). Cancellation: Firm (confirmed
  for the new listing). Min stay 1 night, max 28 (dev defaults, editable).

## Source of truth

The app's own database. iCal import will be built as a SECONDARY,
clearly-documented delayed sync only (Airbnb/Guesty iCal is not
real-time). No Airbnb reservation API is assumed to exist.
