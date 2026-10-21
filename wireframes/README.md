# Property Page Wireframes — Founder Review

Three low-fidelity concepts for the Casa Pacifica property page (the template every future listing will reuse). All are grayscale wireframes — layout and information architecture only, not visual design. Open each file in a browser at desktop (1440px) and mobile (393px) widths; every section carries margin-note annotations explaining the decision and its data source.

**Shared ground rules across all three:** one sticky "Check availability" CTA, no ratings/reviews rendered (none exist — marked "omitted, never faked"), only verified Casa Pacifica facts, placeholders clearly labeled.

---

## REVISED — A+C Hybrid (approved direction)

[revised-ac-hybrid.html](revised-ac-hybrid.html) — the single revised wireframe implementing Astra's review (A+C hybrid: A's structure + C's booking transparency + restrained B copy), **approved unchanged by Renier 2026-10-21**. Contains the desktop (1440px) and mobile (393px) renderings plus the 4-state booking interaction (no dates → validating → quote → checkout), with Astra's P0/P1 compliance map up front. No prices are rendered anywhere — amounts exist only as a live server quote. Concepts A/B/C below are retained as review history. **Status: awaiting Renier's gate approval → Muse writes the Phase 3 spec → Claude builds.**

| File | Concept |
|---|---|
| [concept-a-airbnb-native.html](concept-a-airbnb-native.html) | Airbnb-native |
| [concept-b-editorial.html](concept-b-editorial.html) | Editorial |
| [concept-c-conversion.html](concept-c-conversion.html) | Conversion-first |

---

## Concept A — Airbnb-Native

**Thesis:** Strict translation of the Airbnb listing pattern you referenced: full-bleed photo, centered title block, fact row, single trust badge, host card, highlight cards, sticky booking card (desktop) / sticky bottom bar (mobile). Guests already know this layout — trust transfers instantly, nothing needs learning.

**Strengths**
- Zero learning curve; the layout is pre-validated by billions of Airbnb sessions.
- The centered title block + fact row is exactly your stated design law.
- Safest choice for the guests you're migrating off Airbnb (Mia, Alejandra, Dakota) — it will feel familiar.

**Risks**
- Deliberately unoriginal: "Airbnb but direct" is forgettable and doesn't build a Kipper brand.
- Inherits Airbnb's long scroll; price and cost-clarity sit far down the page.
- Competes on confidence, not on the direct-booking value proposition.

**Questions for Renier**
1. Is "feels like Airbnb" a feature (familiarity for migrating guests) or a bug (no brand differentiation)?
2. Host card credibility line: "Independent host · San Diego" — or cite the 9-year / 383-stay hosting history from the prior listing?
3. Bed count shows "5 beds" (king, queen, bunk ×2, sleeper sofa) — confirm the bunk display convention.

---

## Concept B — Editorial

**Thesis:** Typography leads, photography follows in a photo-essay rhythm ("The house," "The pool," "The details"). Facts are woven into the story as quiet ledger lines. The page seduces; the single sticky CTA converts. Premium, distinctive, magazine-like.

**Strengths**
- Most differentiated — this is the only concept that builds a Kipper brand rather than borrowing Airbnb's.
- Story-first structure answers the emotional question ("what will it feel like?") that drives direct-booking decisions.
- The privacy narrative ("Downstairs is yours. All of it.") directly answers the #1 pre-stay question from the Airbnb inbox.

**Risks**
- Abandons the familiar scan pattern — guests hunting for bed count or price must read more.
- Lives or dies on photography: needs the 13 real photos art-directed; weak photos collapse the concept.
- Slowest conversion path; risks "beautiful but where do I book?" friction.

**Questions for Renier**
1. Photo-first (A) vs. type-first (B) hero — which feels more like the brand you want?
2. Are you willing to art-direct the photo set (pick hero, sequence the essay), or should the page work with photos in any order?
3. Should the STRO license number (STR-13982L) appear publicly on the page, or stay in the footer/fine print only?

---

## Concept C — Conversion-First

**Thesis:** Booking-first and price-transparent: "from $349/night" above the fold, CTA reachable with minimal scroll, desktop sticky rail with an itemized price module, trust compressed into one band, FAQ collapsed. Shortest path from landing to booking decision.

**Strengths**
- Fastest conversion — price clarity up front removes the #1 hesitation for direct booking ("what will this actually cost?").
- The itemized sample breakdown (nightly × N, cleaning, taxes, total) is the transparency play Airbnb can't match.
- Shortest page; least scrolling on mobile.

**Risks**
- Feels transactional — closer to a hotel booking engine than a home listing; may cheapen premium positioning.
- Leading with the $349 floor anchors on the minimum; weekend/holiday reality will read higher and can feel like bait-and-switch if not handled carefully.
- Sacrifices story and atmosphere — weakest on "why this home."

**Questions for Renier**
1. Is showing the $349 floor publicly the right move, or should price appear only after date selection (A/B behavior)?
2. "Best-rate promise" badge — will you honor it? (It constrains future channel pricing.)
3. Cleaning fee ($150) and tax rate (10.5%) are currently SAMPLE values in the build — what are the final numbers?

---

## Cross-concept decisions (apply to whichever wins)

- **Room-to-bed mapping:** wireframes assume Bedroom 1 = king, Bedroom 2 = queen, Bedroom 3 = bunk — confirm.
- **Amenity list:** only verified items shown (pool, cabana, game room, Wi-Fi, washer/dryer). Pull the full set from the Airbnb amenities and verify each; never advertise the removed projector or the planned-not-built sauna.
- **Cancellation wording:** "Firm" policy final text still TBD — needed before any concept ships.
- **Contact:** property pages currently assume the sticky CTA routes to the existing booking flow (`/properties/casa-pacifica`) — confirmed working.
- **Recommendation:** A and C can merge cleanly (A's structure + C's price transparency near the top). B is the outlier — pick it only if brand distinctiveness outweighs familiarity.
