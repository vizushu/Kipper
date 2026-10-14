"use client";
/**
 * BookingWidget — the property page booking panel.
 *
 * Desktop: sticky card beside the content. Mobile: compact sticky bottom bar
 * with the full widget revealed on tap (single shared state).
 *
 * Flow: pick dates on the availability calendar → guests/pets → "Continue"
 * requests POST /api/quote → routes to /checkout with the quote inputs.
 * Checkout re-requests the quote (fresh pricing, handles expiry).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityCalendar, { type DateRange } from "@/components/AvailabilityCalendar";
import GuestSelector, { guestSummary } from "@/components/GuestSelector";
import { Button, Card } from "@/components/ui";
import { IconArrowRight, IconCalendar, IconPet, IconX } from "@/components/icons";
import { formatCents } from "@/lib/types";
import { requestQuote } from "@/data/api";
import { track } from "@/analytics";
import type { GuestCount, Property } from "@/lib/types";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookingWidget({ property }: { property: Property }) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | null>(null);
  const [guests, setGuests] = useState<GuestCount>({ adults: 2, children: 0, infants: 0 });
  const [pets, setPets] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const datesLabel =
    range?.checkIn && range?.checkOut
      ? `${fmtDate(range.checkIn)} → ${fmtDate(range.checkOut)}`
      : range?.checkIn
        ? `${fmtDate(range.checkIn)} → select check-out`
        : "Select dates";

  async function continueToCheckout() {
    if (!range?.checkIn || !range?.checkOut) {
      setError("Choose your check-in and check-out dates first.");
      setExpanded(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestQuote({
        propertyId: property.id,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        guests,
        pets,
        promoCode: promoCode.trim() || undefined,
      });
      track("checkout_initiated", {
        propertyId: property.id,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        guests,
      });
      const params = new URLSearchParams({
        propertyId: property.id,
        checkIn: range.checkIn,
        checkOut: range.checkOut,
        adults: String(guests.adults),
        children: String(guests.children),
        infants: String(guests.infants),
        pets: String(pets),
      });
      if (promoCode.trim()) params.set("promoCode", promoCode.trim());
      router.push(`/checkout?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not price this stay.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Desktop sticky card */}
      <Card className="hidden p-6 lg:sticky lg:top-24 lg:block">
        <WidgetBody
          property={property}
          range={range}
          setRange={setRange}
          guests={guests}
          setGuests={setGuests}
          pets={pets}
          setPets={setPets}
          promoCode={promoCode}
          setPromoCode={setPromoCode}
          loading={loading}
          error={error}
          onContinue={continueToCheckout}
        />
      </Card>

      {/* Mobile: full widget as an expandable sheet */}
      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Book your stay">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <p className="font-display text-lg font-medium">Book your stay</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close booking panel"
              className="rounded-full p-2 hover:bg-cream"
            >
              <IconX className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <WidgetBody
              property={property}
              range={range}
              setRange={setRange}
              guests={guests}
              setGuests={setGuests}
              pets={pets}
              setPets={setPets}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              loading={loading}
              error={error}
              onContinue={continueToCheckout}
            />
          </div>
        </div>
      )}

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              <span className="font-semibold">{formatCents(property.baseNightlyCents)}</span>
              <span className="text-stone-500">/night</span>
            </p>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 text-xs font-medium text-clay underline-offset-4 hover:underline"
            >
              <IconCalendar className="h-3.5 w-3.5" /> {datesLabel}
            </button>
          </div>
          <Button onClick={() => setExpanded(true)}>Check dates</Button>
        </div>
      </div>
    </>
  );
}

function WidgetBody({
  property,
  range,
  setRange,
  guests,
  setGuests,
  pets,
  setPets,
  promoCode,
  setPromoCode,
  loading,
  error,
  onContinue,
}: {
  property: Property;
  range: DateRange | null;
  setRange: (r: DateRange | null) => void;
  guests: GuestCount;
  setGuests: (g: GuestCount) => void;
  pets: number;
  setPets: (n: number) => void;
  promoCode: string;
  setPromoCode: (s: string) => void;
  loading: boolean;
  error: string;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="text-2xl font-semibold text-ink">
            {formatCents(property.baseNightlyCents)}
          </span>{" "}
          <span className="text-sm text-stone-500">/ night</span>
        </p>
        <p className="text-xs text-stone-500">Best rate — book direct</p>
      </div>

      <div>
        <AvailabilityCalendar
          propertyId={property.id}
          range={range}
          onRangeChange={setRange}
          monthsVisible={1}
        />
      </div>

      <GuestSelector value={guests} onChange={setGuests} maxGuests={property.maxGuests} compact />

      <div className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <IconPet className="h-4 w-4 text-stone-500" /> Pets
        </span>
        <div className="flex items-center gap-3">
          {[0, 1].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPets(n)}
              aria-pressed={pets === n}
              className={
                pets === n
                  ? "rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper"
                  : "rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 hover:border-stone-400"
              }
            >
              {n === 0 ? "No pet" : "1 pet"}
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-3 text-xs text-stone-500">
        1 pet max · {formatCents(property.petPolicy.feePerStayCents)} per stay
      </p>

      <div>
        <label htmlFor="promo" className="text-sm font-medium text-ink">
          Promo code <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          id="promo"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="e.g. DIRECT10"
          className="mt-1.5 block w-full rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm uppercase placeholder:normal-case placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-clay"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button onClick={onContinue} disabled={loading} className="w-full" size="lg">
        {loading ? (
          "Checking price…"
        ) : (
          <>
            Continue <IconArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-stone-500">
        {guestSummary(guests)} · No payment due until checkout
      </p>
    </div>
  );
}
