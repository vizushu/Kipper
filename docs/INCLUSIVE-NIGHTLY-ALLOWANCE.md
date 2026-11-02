# Approved inclusive nightly allowance

Owner approved applying 3% on November 2, 2026 UTC. Casa Pacifica explicitly
configures 300 basis points over the existing flat $449 base, for a $462.47
inclusive room price. Publication remains separately reviewed; paid intake stays
closed. No database migration or environment switch changes this source policy.

The optional property setting accepts only 0 or 300 basis points. The configured
300 resolves the existing nightly base first, then rounds base × 1.03 once
per night to integer cents. $449 becomes $462.47. The current flat mode still
ignores stale date overrides and legacy seasonal/weekend rules. This does not
introduce dynamic pricing or approve any new rate source. Legacy/test override
resolution is preserved; overrides are pre-allowance base cents, not inclusive
prices. Existing min/max bounds apply to the base before the allowance.

All guests/payment methods see the same inclusive accommodation price from the
first quote. No separate processing fee or credit/debit surcharge is added and
3% is not a promise of recovering Stripe's actual fees. Cleaning stays $0 with
the usual $180 reference displayed; existing 12.75% tax is calculated on the
inclusive accommodation subtotal. Sample promotions and pet checkout remain
blocked by the current property policy.

Quote nightly rows, line items and immutable price-breakdown snapshots contain
the final inclusive values. Receipts consume stored amounts, not this setting;
previously accepted quotes/bookings must never be migrated or repriced. The
policy does not change availability, capacity, March configuration or payment
activation gates. Public rate copy/readiness expose the inclusive price. LIVE_PRICING_APPROVED
and payment activation remain separate runtime decisions. Future market-driven
pricing research is not an implemented algorithm, data feed or approved set of
seasonal/weekend weights.
