"use client";
/**
 * PropertiesExplorer — client-side filters for /properties:
 * dates, guests, max nightly price, amenities.
 *
 * When dates are selected, real availability is fetched per property and
 * cards are clearly marked available/unavailable for the chosen range.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PropertyCard from "@/components/PropertyCard";
import { Badge, Button, EmptyState, SampleBadge } from "@/components/ui";
import GuestSelector, { guestSummary } from "@/components/GuestSelector";
import { IconCheck, IconX } from "@/components/icons";
import { formatCents, type AvailabilityDay, type GuestCount, type PropertySummary } from "@/lib/types";
import { track } from "@/analytics";
import { cn } from "@/components/cn";

interface Filters {
  checkIn: string;
  checkOut: string;
  guests: GuestCount;
  maxPrice: number | null;
  amenity: string;
}

export default function PropertiesExplorer({
  properties,
}: {
  properties: PropertySummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>({
    checkIn: searchParams.get("checkIn") ?? "",
    checkOut: searchParams.get("checkOut") ?? "",
    guests: {
      adults: Number(searchParams.get("adults") ?? 2) || 2,
      children: Number(searchParams.get("children") ?? 0) || 0,
      infants: Number(searchParams.get("infants") ?? 0) || 0,
    },
    maxPrice: null,
    amenity: "",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [availability, setAvailability] = useState<
    Record<string, { state: "loading" | "ok" | "error"; available: boolean; totalCents: number | null }>
  >({});

  const allAmenities = useMemo(
    () => Array.from(new Set(properties.flatMap((p) => p.amenityTags))).sort(),
    [properties],
  );

  const datesChosen = Boolean(filters.checkIn && filters.checkOut);
  const datesValid = datesChosen && filters.checkOut > filters.checkIn;

  // Fetch real availability for the chosen range whenever dates change.
  useEffect(() => {
    if (!datesValid) {
      setAvailability({});
      return;
    }
    let cancelled = false;
    const next: typeof availability = {};
    for (const p of properties) next[p.id] = { state: "loading", available: false, totalCents: null };
    setAvailability(next);
    track("search", {
      checkIn: filters.checkIn,
      checkOut: filters.checkOut,
      guests: filters.guests,
    });

    (async () => {
      await Promise.all(
        properties.map(async (p) => {
          try {
            const res = await fetch(
              `/api/availability?propertyId=${encodeURIComponent(p.id)}&from=${filters.checkIn}&to=${filters.checkOut}`,
            );
            if (!res.ok) throw new Error("availability");
            const data = (await res.json()) as { days: AvailabilityDay[] };
            const nights = data.days.filter(
              (d) => d.date >= filters.checkIn && d.date < filters.checkOut,
            );
            const available =
              nights.length > 0 &&
              nights.every((d) => d.available) &&
              filters.guests.adults + filters.guests.children <= p.maxGuests;
            const totalCents = available
              ? nights.reduce((s, d) => s + d.nightlyRateCents, 0)
              : null;
            if (!cancelled)
              setAvailability((prev) => ({
                ...prev,
                [p.id]: { state: "ok", available, totalCents },
              }));
          } catch {
            if (!cancelled)
              setAvailability((prev) => ({
                ...prev,
                [p.id]: { state: "error", available: false, totalCents: null },
              }));
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.checkIn, filters.checkOut, filters.guests.adults, filters.guests.children]);

  const filtered = properties.filter((p) => {
    if (filters.maxPrice !== null && p.startingNightlyCents > filters.maxPrice * 100)
      return false;
    if (filters.amenity && !p.amenityTags.includes(filters.amenity)) return false;
    if (datesValid) {
      const a = availability[p.id];
      if (a?.state === "ok" && !a.available) return false;
    }
    return true;
  });

  function clearFilters() {
    setFilters((f) => ({ ...f, checkIn: "", checkOut: "", maxPrice: null, amenity: "" }));
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Check-in — check-out
            </span>
            <span className="mt-1 flex items-center gap-2">
              <input
                type="date"
                aria-label="Check-in"
                value={filters.checkIn}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    checkIn: e.target.value,
                    checkOut:
                      f.checkOut && e.target.value && f.checkOut <= e.target.value
                        ? ""
                        : f.checkOut,
                  }))
                }
                className="w-full rounded-xl border border-stone-200 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
              />
              <input
                type="date"
                aria-label="Check-out"
                value={filters.checkOut}
                min={filters.checkIn}
                onChange={(e) => setFilters((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
              />
            </span>
          </label>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Guests
            </span>
            <details className="group relative mt-1">
              <summary className="cursor-pointer list-none rounded-xl border border-stone-200 bg-paper px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {guestSummary(filters.guests)}
              </summary>
              <div className="absolute left-0 right-0 top-full z-30 mt-2 sm:right-auto sm:w-80">
                <GuestSelector
                  value={filters.guests}
                  onChange={(g) => setFilters((f) => ({ ...f, guests: g }))}
                  maxGuests={8}
                />
              </div>
            </details>
          </div>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Max $ / night
            </span>
            <input
              type="number"
              min={0}
              step={25}
              placeholder="Any"
              value={filters.maxPrice ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  maxPrice: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="mt-1 w-full rounded-xl border border-stone-200 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay lg:w-32"
            />
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
              {filtersOpen ? "Hide" : "More"} filters
            </Button>
          </div>
        </div>
        {filtersOpen && (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Amenities
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <FilterChip
                active={!filters.amenity}
                onClick={() => setFilters((f) => ({ ...f, amenity: "" }))}
                label="All"
              />
              {allAmenities.map((a) => (
                <FilterChip
                  key={a}
                  active={filters.amenity === a}
                  onClick={() => setFilters((f) => ({ ...f, amenity: a }))}
                  label={a}
                />
              ))}
            </div>
            {(filters.checkIn || filters.checkOut || filters.maxPrice !== null || filters.amenity) && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-medium text-clay underline-offset-4 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-8">
        {datesChosen && !datesValid && (
          <p role="alert" className="mb-4 rounded-xl bg-clay-soft px-4 py-3 text-sm text-clay-dark">
            Check-out must be after check-in.
          </p>
        )}
        {filtered.length === 0 ? (
          <EmptyState
            title="No stays match those filters"
            body="Try widening your dates, raising the max price, or removing an amenity filter."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((p) => {
              const a = availability[p.id];
              return (
                <div key={p.id} className="relative">
                  <PropertyCard property={p} />
                  {datesValid && a?.state === "loading" && (
                    <div className="absolute left-4 top-4">
                      <Badge tone="stone">Checking dates…</Badge>
                    </div>
                  )}
                  {datesValid && a?.state === "ok" && a.available && a.totalCents !== null && (
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <Badge tone="moss">
                        <IconCheck className="h-3 w-3" /> Available · {formatCents(a.totalCents)} total
                      </Badge>
                    </div>
                  )}
                  {datesValid && a?.state === "ok" && !a.available && (
                    <div className="absolute left-4 top-4">
                      <Badge tone="clay">
                        <IconX className="h-3 w-3" /> Unavailable for these dates
                      </Badge>
                    </div>
                  )}
                  {datesValid && a?.state === "error" && (
                    <div className="absolute left-4 top-4">
                      <Badge tone="stone">
                        Availability unknown — <SampleBadge className="ml-1" />
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-stone-300 bg-white text-stone-600 hover:border-stone-400",
      )}
    >
      {label}
    </button>
  );
}
