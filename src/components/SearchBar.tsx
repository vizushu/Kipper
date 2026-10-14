"use client";
/**
 * SearchBar — hero search: check-in / check-out dates + guests + Search.
 * Routes to /properties with query params; also usable on /properties.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import GuestSelector, { guestSummary } from "@/components/GuestSelector";
import { IconCalendar, IconSearch, IconUsers } from "@/components/icons";
import { track } from "@/analytics";
import type { GuestCount } from "@/lib/types";
import { cn } from "@/components/cn";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestCount>({ adults: 2, children: 0, infants: 0 });
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [error, setError] = useState("");

  function submit() {
    if (checkIn && checkOut && checkOut <= checkIn) {
      setError("Check-out must be after check-in.");
      return;
    }
    setError("");
    track("search", { checkIn, checkOut, guests });
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    params.set("infants", String(guests.infants));
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-stone-200 bg-white p-2 shadow-lift",
        compact ? "max-w-3xl" : "max-w-4xl",
      )}
      role="search"
      aria-label="Search availability"
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1.2fr_auto]">
        <label className="block rounded-xl px-3 py-2 hover:bg-cream focus-within:bg-cream">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <IconCalendar className="h-3.5 w-3.5" /> Check-in
          </span>
          <input
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && e.target.value && checkOut <= e.target.value) setCheckOut("");
            }}
            className="mt-1 w-full bg-transparent text-sm font-medium text-ink focus:outline-none"
            aria-label="Check-in date"
          />
        </label>
        <label className="block rounded-xl px-3 py-2 hover:bg-cream focus-within:bg-cream">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <IconCalendar className="h-3.5 w-3.5" /> Check-out
          </span>
          <input
            type="date"
            value={checkOut}
            min={checkIn || todayISO()}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full bg-transparent text-sm font-medium text-ink focus:outline-none"
            aria-label="Check-out date"
          />
        </label>
        <div className="relative col-span-2 md:col-span-1">
          <button
            type="button"
            onClick={() => setGuestsOpen((v) => !v)}
            aria-expanded={guestsOpen}
            className="block w-full rounded-xl px-3 py-2 text-left hover:bg-cream"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <IconUsers className="h-3.5 w-3.5" /> Guests
            </span>
            <span className="mt-1 block text-sm font-medium text-ink">{guestSummary(guests)}</span>
          </button>
          {guestsOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 md:right-auto md:w-80">
              <GuestSelector value={guests} onChange={setGuests} maxGuests={8} />
              <Button
                variant="dark"
                size="sm"
                className="mt-2 w-full md:hidden"
                onClick={() => setGuestsOpen(false)}
              >
                Done
              </Button>
            </div>
          )}
        </div>
        <div className="col-span-2 flex md:col-span-1 md:items-stretch">
          <Button onClick={submit} className="w-full md:w-auto" size="lg">
            <IconSearch className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>
      {error && <p className="px-3 pt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
