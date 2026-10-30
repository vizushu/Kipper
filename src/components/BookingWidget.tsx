"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AvailabilityCalendar, { type DateRange } from "@/components/AvailabilityCalendar";
import GuestSelector from "@/components/GuestSelector";
import PriceBreakdown from "@/components/PriceBreakdown";
import StickyBookBar from "@/components/StickyBookBar";
import { Button, Card } from "@/components/ui";
import { IconX } from "@/components/icons";
import { formatCents, type GuestCount, type Property, type Quote } from "@/lib/types";
import { requestQuote } from "@/data/client-api";
import { bookingFlowNotice } from "@/lib/booking-flow-state";
import type { StaySelection } from "@/lib/stay-selection";
import { track } from "@/analytics";

export default function BookingWidget({ property, onRangeChange, bookingBlockedReason, publicPreview = false, initialSelection }: {
  property: Property;
  initialSelection?: StaySelection;
  publicPreview?: boolean;
  onRangeChange?: (range: DateRange | null) => void;
  bookingBlockedReason?: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | null>(initialSelection?.range ?? null);
  const [guests, setGuests] = useState<GuestCount>(initialSelection?.guests ?? { adults: 2, children: 0, infants: 0 });
  const [pets, setPets] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [offline, setOffline] = useState(false);
  const [connectionRevision, setConnectionRevision] = useState(0);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const revision = useRef(0);
  const sheet = useRef<HTMLDivElement>(null);
  const promoId = useId();

  // Increment synchronously on every input edit, before an older request can settle.
  function invalidate() { revision.current++; setQuote(null); setError(""); setLoading(false); }
  function changeRange(next: DateRange | null) { invalidate(); setRange(next); onRangeChange?.(next); }
  useEffect(() => () => { revision.current++; }, []);
  useEffect(() => {
    const connectionChanged = () => {
      revision.current++;
      setOffline(!navigator.onLine);
      setConnectionRevision(value => value + 1);
      setQuote(null);
      setLoading(false);
      setHandoff(false);
      setError(publicPreview ? "" : navigator.onLine ? "Connection restored. Check availability and price again before continuing." : "You’re offline. Reconnect to check availability or continue to checkout.");
    };
    if (!navigator.onLine) connectionChanged();
    window.addEventListener("offline", connectionChanged);
    window.addEventListener("online", connectionChanged);
    return () => { window.removeEventListener("offline", connectionChanged); window.removeEventListener("online", connectionChanged); };
  }, [publicPreview]);
  useEffect(() => {
    if (!quote) return;
    const timeout = setTimeout(() => { setQuote(null); setError("This price has expired. Check your dates again for a fresh quote."); }, Math.max(0, Date.parse(quote.expiresAt) - Date.now()));
    return () => clearTimeout(timeout);
  }, [quote]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.querySelector<HTMLElement>("button")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
      if (event.key !== "Tab") return;
      const elements = Array.from(sheet.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus(); else document.querySelector<HTMLElement>("[data-booking-open]")?.focus(); };
  }, [expanded]);

  async function checkPrice() {
    if (publicPreview) return;
    if (!navigator.onLine) { invalidate(); setOffline(true); setError("Reconnect to check availability and price."); return; }
    if (!range?.checkIn || !range?.checkOut) { setError("Choose check-in and check-out dates first."); return; }
    if (bookingBlockedReason) return;
    const current = ++revision.current;
    setQuote(null); setLoading(true); setError("");
    try {
      const next = await requestQuote({ propertyId: property.id, ...range, guests, pets, promoCode: promoCode.trim() || undefined });
      if (current === revision.current) setQuote(next);
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : "Could not check this stay. Please try again."); }
    finally { if (current === revision.current) setLoading(false); }
  }
  function checkout() {
    if (publicPreview) return;
    if (!navigator.onLine) { invalidate(); setOffline(true); setError("Reconnect and check your price again before checkout."); return; }
    if (!quote || !range || bookingBlockedReason || Date.parse(quote.expiresAt) <= Date.now()) { invalidate(); return; }
    setHandoff(true);
    track("checkout_initiated", { propertyId: property.id, ...range, guests });
    const params = new URLSearchParams({ propertyId: property.id, ...range, adults: String(guests.adults), children: String(guests.children), infants: String(guests.infants), pets: String(pets) });
    if (promoCode.trim()) params.set("promoCode", promoCode.trim());
    router.push(`/checkout?${params}`);
  }
  function body(id: string) {
    return <div className="space-y-5">
      <div><h2 className="font-display text-2xl">Plan your stay</h2><p className="mt-1 text-sm text-stone-500">{publicPreview ? "Explore accommodation by date" : quote ? "Your stay, item by item" : "Add dates to see the price"}</p></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs font-medium">Check-in<input aria-label="Check-in date" type="date" value={range?.checkIn ?? ""} onChange={event => changeRange({ checkIn: event.target.value, checkOut: range?.checkOut ?? "" })} className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-2 text-sm" /></label>
        <label className="min-w-0 text-xs font-medium">Checkout<input aria-label="Checkout date" type="date" value={range?.checkOut ?? ""} min={range?.checkIn || undefined} onChange={event => changeRange({ checkIn: range?.checkIn ?? "", checkOut: event.target.value })} className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-2 text-sm" /></label>
      </div>
      {publicPreview ? <p role="status" className="rounded-xl bg-cream p-4 text-sm leading-relaxed">Preview date selection only. Dates demonstrate which accommodation applies; availability and prices are not being checked, and no dates are held or reserved.</p> : <AvailabilityCalendar key={connectionRevision} propertyId={property.id} range={range} onRangeChange={changeRange} monthsVisible={1} />}
      {bookingBlockedReason ? <p role="status" className="rounded-xl bg-cream p-4 text-sm leading-relaxed">{bookingBlockedReason}</p> : <>
        <GuestSelector value={guests} onChange={next => { invalidate(); setGuests(next); }} maxGuests={property.maxGuests} compact />
        {!publicPreview && property.petPolicy.allowed && <label className="flex items-center justify-between gap-3 text-sm font-medium">Pets<select aria-label="Number of pets" className="min-h-11 rounded-xl border border-stone-300 bg-white px-3" value={pets} onChange={event => { invalidate(); setPets(Number(event.target.value)); }}>{Array.from({ length: property.petPolicy.maxPets + 1 }, (_, count) => <option key={count} value={count}>{count}</option>)}</select></label>}
        {!publicPreview && <div><label htmlFor={id} className="text-sm font-medium">Promo code <span className="font-normal text-stone-500">(optional)</span></label><input id={id} value={promoCode} onChange={event => { invalidate(); setPromoCode(event.target.value); }} className="mt-1 block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" /></div>}
      </>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div aria-live="polite">{quote && !bookingBlockedReason && <PriceBreakdown quote={quote} />}</div>
      {!publicPreview && <Button className="min-h-11 w-full" size="lg" disabled={offline || loading || handoff || !!bookingBlockedReason} onClick={quote ? checkout : checkPrice}>{offline ? "Reconnect to continue" : handoff ? "Opening checkout…" : loading ? "Checking availability and price…" : quote ? "Continue to checkout" : "Check availability & price"}</Button>}
      <p className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-stone-600">{publicPreview ? "Reservations and payments are disabled in this preview." : bookingFlowNotice(quote)}</p>
    </div>;
  }
  return <>
    <Card className="hidden p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">{body(`${promoId}-desktop`)}</Card>
    {expanded && <div ref={sheet} className="fixed inset-0 z-50 flex flex-col bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Plan your stay"><div className="flex items-center justify-between border-b border-stone-200 px-4 py-3"><p className="font-display text-lg">Plan your stay</p><button type="button" onClick={() => setExpanded(false)} aria-label="Close booking panel" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream"><IconX className="h-6 w-6" /></button></div><div className="flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>{body(`${promoId}-mobile`)}</div></div>}
    {!expanded && <StickyBookBar label={publicPreview ? "Explore accommodation dates" : quote ? `${formatCents(quote.totalCents)} total` : "Add dates to see price"} detail={range?.checkOut ? `${range.checkIn} → ${range.checkOut}` : "Choose your stay dates"} onOpen={() => setExpanded(true)} />}
  </>;
}
