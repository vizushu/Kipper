"use client";
/**
 * CheckoutClient — the checkout flow.
 *
 * 1. Reads booking inputs from the URL (set by BookingWidget).
 * 2. Re-requests POST /api/quote for fresh pricing (handles expiry).
 * 3. Guest details form (name, email, phone optional — minimal typing).
 * 4. Stripe payment: "Continue to payment" creates the booking server-side
 *    (POST /api/bookings with an idempotency key kept in sessionStorage),
 *    then confirms the PaymentIntent via Payment Request or card,
 *    then POST /api/bookings/[id]/confirm → redirect to /booking/[reference].
 *
 * States: loading quote, quote error (with code-aware messaging),
 * guest form, payment, processing, success redirect, failure + retry.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CheckoutForm from "@/components/CheckoutForm";
import PriceBreakdown from "@/components/PriceBreakdown";
import { Button, Card, Field, SampleBadge } from "@/components/ui";
import { IconAlert, IconArrowRight, IconCheck, IconLock } from "@/components/icons";
import { confirmBooking, createBooking, getProperty, requestQuote } from "@/data/client-api";
import { track } from "@/analytics";
import type { Booking, GuestCount, Property, Quote } from "@/lib/types";
import { guestSummary } from "@/components/GuestSelector";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CODE_MESSAGES: Record<string, string> = {
  INVALID_DATES: "Those dates don't work — please pick new dates.",
  UNAVAILABLE: "Some of those nights just got booked. Please pick different dates.",
  GUEST_LIMIT: "That guest count exceeds this home's overnight limit.",
  MIN_STAY: "This stay doesn't meet the minimum-night requirement.",
  MAX_STAY: "This stay exceeds the maximum-night limit.",
  QUOTE_EXPIRED: "Your price hold expired — we've refreshed it below.",
};

export default function CheckoutClient() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutFlow />
    </Suspense>
  );
}

export function createCheckoutRequestGuard() {
  let generation = 0;
  return {
    invalidate: () => { generation += 1; },
    begin: () => ++generation,
    isCurrent: (request: number) => request === generation,
  };
}

function CheckoutFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const inputs = useMemo(() => {
    const guests: GuestCount = {
      adults: Number(params.get("adults") ?? 2) || 2,
      children: Number(params.get("children") ?? 0) || 0,
      infants: Number(params.get("infants") ?? 0) || 0,
    };
    return {
      propertyId: params.get("propertyId") ?? "",
      checkIn: params.get("checkIn") ?? "",
      checkOut: params.get("checkOut") ?? "",
      guests,
      pets: Number(params.get("pets") ?? 0) || 0,
      promoCode: params.get("promoCode") ?? undefined,
    };
  }, [params]);

  const [property, setProperty] = useState<Property | null>(null);
  const [quoteInputKey, setQuoteInputKey] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<{ message: string; code?: string } | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const requestGuard = useRef(createCheckoutRequestGuard());
  const paymentRisk = useRef(false);
  const [online, setOnline] = useState(true);
  const [needsRecheck, setNeedsRecheck] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState("");
  const attemptKey = `cp-idempotency-${inputs.propertyId}-${inputs.checkIn}-${inputs.checkOut}`;
  const unresolvedKey = "cp-unresolved-payment";
  const inputKey = JSON.stringify(inputs);
  const validInputs = Boolean(inputs.propertyId && inputs.checkIn && inputs.checkOut);

  const loadQuote = useCallback(async () => {
    const generation = requestGuard.current.begin();
    setQuote(null); setProperty(null);
    if (!navigator.onLine || paymentRisk.current) {
      setLoadingQuote(false);
      setNeedsRecheck(true);
      return;
    }
    setBooking(null); setClientSecret(null); setAccessToken(null);
    setNeedsRecheck(false);
    if (!validInputs) {
      setLoadingQuote(false);
      setQuoteError({ message: "Missing booking details — please start from the property page." });
      return;
    }
    setLoadingQuote(true);
    setQuoteError(null);
    try {
      const [q, p] = await Promise.all([
        requestQuote({
          propertyId: inputs.propertyId,
          checkIn: inputs.checkIn,
          checkOut: inputs.checkOut,
          guests: inputs.guests,
          pets: inputs.pets,
          promoCode: inputs.promoCode,
        }),
        getProperty(inputs.propertyId),
      ]);
      if (!requestGuard.current.isCurrent(generation) || !navigator.onLine) return;
      setQuoteInputKey(inputKey);
      setQuote(q);
      setProperty(p);
    } catch (e) {
      if (!requestGuard.current.isCurrent(generation)) return;
      const code = (e as { code?: string }).code;
      setQuoteError({
        message:
          (code && CODE_MESSAGES[code]) ||
          (e instanceof Error ? e.message : "Could not price this stay."),
        code,
      });
    } finally {
      if (requestGuard.current.isCurrent(generation)) setLoadingQuote(false);
    }
  }, [inputKey, validInputs]);

  useEffect(() => {
    const invalidate = () => {
      requestGuard.current.invalidate();
      setQuote(null); setBooking(null); setClientSecret(null); setAccessToken(null);
      setLoadingQuote(false); setNeedsRecheck(true);
      if (paymentRisk.current) setPaymentWarning("Payment setup was already opened. Do not pay again. Contact Kipper with your booking reference or payment receipt to verify the result.");
    };
    const offline = () => { setOnline(false); invalidate(); };
    const reconnect = () => { setOnline(true); invalidate(); };
    setOnline(navigator.onLine);
    window.addEventListener("offline", offline);
    window.addEventListener("online", reconnect);
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", reconnect); };
  }, []);

  useEffect(() => {
    requestGuard.current.invalidate();
    setQuote(null); setBooking(null); setClientSecret(null); setAccessToken(null);
    const unresolved = sessionStorage.getItem(unresolvedKey);
    if (unresolved) {
      paymentRisk.current = true;
      setPaymentWarning(`An earlier payment attempt needs verification (${unresolved}). Do not pay again. Contact Kipper with your receipt.`);
      setLoadingQuote(false);
    } else if (!paymentRisk.current) {
      void loadQuote();
    } else {
      setPaymentWarning("Your stay details changed after payment setup. Do not pay again. Verify the earlier attempt with Kipper first.");
      setLoadingQuote(false);
    }
    return () => requestGuard.current.invalidate();
  }, [loadQuote]);

  function idempotencyKey(): string {
    // One key per checkout attempt, kept across reloads of this page.
    const storageKey = attemptKey;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
    }
    return key;
  }

  function validateDetails(): boolean {
    const errors: { name?: string; email?: string } = {};
    if (name.trim().length < 2) errors.name = "Please enter the guest name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Please enter a valid email — your confirmation goes here.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateBooking() {
    if (!quote || quoteInputKey !== inputKey || !navigator.onLine || needsRecheck || paymentRisk.current || !validateDetails()) return;
    const generation = requestGuard.current.begin();
    setCreating(true);
    setConfirmError("");
    track("payment_attempted", { quoteId: quote.id, totalCents: quote.totalCents });
    try {
      const { booking: b, clientSecret: cs, accessToken: token } = await createBooking({
        quoteId: quote.id,
        guest: { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined },
        idempotencyKey: idempotencyKey(),
      });
      // Persist an unresolved marker before exposing payment UI. Never silently replay after reconnect/reload.
      paymentRisk.current = true;
      sessionStorage.setItem(unresolvedKey, b.reference);
      if (!requestGuard.current.isCurrent(generation) || !navigator.onLine) {
        setPaymentWarning(`Booking ${b.reference} was prepared while the connection or dates changed. Do not pay again; verify this attempt with Kipper.`);
        return;
      }
      setBooking(b);
      setAccessToken(token);
      setClientSecret(cs);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start your booking.";
      if (!paymentRisk.current && /hold expired|booking was cancelled/i.test(message)) {
        sessionStorage.removeItem(attemptKey);
        setNeedsRecheck(true); setQuote(null);
      }
      if (requestGuard.current.isCurrent(generation)) setConfirmError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmPayment(paymentIntentId: string) {
    if (!booking || !accessToken) return;
    if (!navigator.onLine) {
      setPaymentWarning(`Payment may have completed for ${booking.reference}. Do not pay again. Reconnect and contact Kipper with your receipt.`);
      return;
    }
    setConfirmError("");
    try {
      const { booking: confirmedBooking } = await confirmBooking(booking.id, paymentIntentId);
      track("booking_completed", {
        bookingId: confirmedBooking.id,
        totalCents: confirmedBooking.totalCents,
      });
      setConfirmed(true);
      paymentRisk.current = false;
      sessionStorage.removeItem(unresolvedKey);
      // New idempotency key for any future attempt.
      sessionStorage.removeItem(
        `cp-idempotency-${inputs.propertyId}-${inputs.checkIn}-${inputs.checkOut}`,
      );
      router.push(`/booking/${encodeURIComponent(confirmedBooking.reference)}?token=${encodeURIComponent(accessToken)}`);
    } catch (e) {
      setPaymentWarning(`Payment may have completed for ${booking.reference}. Contact Kipper with your receipt — do not pay again. ${e instanceof Error ? e.message : "Confirmation could not be verified."}`);
    }
  }

  if (paymentWarning) return <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="font-display text-2xl">Verify your payment attempt</h1>
    <p className="mt-4">{paymentWarning}</p>
    <p className="mt-3 text-sm">Nothing will be queued or retried automatically.</p>
  </div>;
  if (!online || needsRecheck) return <div role="status" className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="font-display text-2xl">{online ? "Recheck your stay before continuing" : "You’re offline"}</h1>
    <p className="mt-4">Booking and payment are paused. Nothing is queued or replayed. Recheck current availability and pricing after reconnecting.</p>
    <Button className="mt-5" disabled={!online} onClick={loadQuote}>Recheck availability and price</Button>
  </div>;
  if (loadingQuote || (quote && quoteInputKey !== inputKey)) return <CheckoutSkeleton />;

  if (quoteError || !quote) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <p className="font-display text-2xl font-medium text-ink">We couldn't price that stay</p>
        <p className="mt-3 text-stone-600">{quoteError?.message ?? "Something went wrong."}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={loadQuote}>
            Try again
          </Button>
          <Link href="/properties">
            <Button>Pick new dates</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-medium text-ink">Review & book</h1>
      <p className="mt-2 text-stone-600">
        {property?.name ?? "Casa Pacifica"} · {fmtDate(quote.checkIn)} → {fmtDate(quote.checkOut)} ·{" "}
        {guestSummary(quote.guests)}
        {quote.pets > 0 && ` · ${quote.pets} pet`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Guest details */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-medium text-ink">Guest details</h2>
              {detailsConfirmed && (
                <span className="flex items-center gap-1 text-sm font-medium text-moss">
                  <IconCheck className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
                error={formErrors.name}
                disabled={detailsConfirmed}
              />
              <Field
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="email"
                error={formErrors.email}
                hint="Your confirmation and smart-lock code go here."
                disabled={detailsConfirmed}
              />
              <Field
                label="Phone (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                className="sm:col-span-2"
                hint="Only used if we need to reach you about your stay."
                disabled={detailsConfirmed}
              />
            </div>
            {!detailsConfirmed ? (
              <Button
                className="mt-4"
                onClick={() => {
                  if (validateDetails()) setDetailsConfirmed(true);
                }}
              >
                Save details <IconArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <button
                type="button"
                onClick={() => setDetailsConfirmed(false)}
                className="mt-4 text-sm font-medium text-clay underline-offset-4 hover:underline"
              >
                Edit details
              </button>
            )}
          </Card>

          {/* Payment */}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-medium text-ink">
              <IconLock className="h-5 w-5 text-stone-400" /> Payment
            </h2>
            {!detailsConfirmed ? (
              <p className="mt-3 text-sm text-stone-500">
                Save your guest details above to unlock secure payment.
              </p>
            ) : (
              <div className="mt-4">
                {confirmError && (
                  <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {confirmError}{" "}
                    <button
                      type="button"
                      onClick={() => setConfirmError("")}
                      className="font-medium underline underline-offset-4"
                    >
                      Dismiss and retry
                    </button>
                  </p>
                )}
                <CheckoutForm
                  quote={quote}
                  clientSecret={clientSecret}
                  creating={creating}
                  onCreateBooking={handleCreateBooking}
                  onConfirmPayment={handleConfirmPayment}
                />
              </div>
            )}
          </Card>

          <p className="text-xs leading-relaxed text-stone-500">
            By booking you agree to the house rules and the{" "}
            <Link href="/policies/terms" className="underline underline-offset-4 hover:text-ink">
              terms of stay
            </Link>{" "}
            and{" "}
            <Link href="/policies/cancellation" className="underline underline-offset-4 hover:text-ink">
              cancellation policy
            </Link>{" "}
            <SampleBadge className="ml-1" /> (drafts — under Renier's review).
          </p>
        </div>

        {/* Price summary */}
        <aside aria-label="Price summary">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-medium text-ink">Price breakdown</h2>
            <div className="mt-2">
              <PriceBreakdown quote={quote} showSampleBadge />
            </div>
            <div className="mt-4 rounded-xl bg-cream px-4 py-3 text-xs leading-relaxed text-stone-500">
              {quote.nights} night{quote.nights === 1 ? "" : "s"} · {fmtDate(quote.checkIn)} →{" "}
              {fmtDate(quote.checkOut)}
              <br />
              Check-in from 3:00 PM · check-out by 11:00 AM
            </div>
          </Card>
        </aside>
      </div>
      {confirmed && <p className="sr-only">Booking confirmed — redirecting to your confirmation.</p>}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" aria-label="Loading checkout">
      <div className="h-9 w-64 animate-pulse rounded-xl bg-cream" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-2xl bg-cream" />
          <div className="h-64 animate-pulse rounded-2xl bg-cream" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-cream" />
      </div>
    </div>
  );
}
