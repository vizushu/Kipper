"use client";
/**
 * CheckoutForm — Stripe payment step.
 *
 * Built directly on @stripe/stripe-js (no react-stripe-js dependency):
 * - User-activated PaymentRequest.show() where wallet capability is reported.
 *   Merchant/domain/browser eligibility still requires real-device verification.
 * - Standard card Element fallback, mounted manually.
 *
 * NEVER collects raw card numbers — all card input lives in Stripe Elements.
 *
 * Flow (driven by the parent):
 *   1. Parent calls onCreateBooking() → POST /api/bookings → { booking, clientSecret }
 *   2. Parent passes clientSecret + bookingId into <CheckoutForm ... />
 *   3. This component confirms the PaymentIntent (PaymentRequest or card),
 *      then calls onConfirmPayment(paymentIntentId).
 */
import type { Stripe, PaymentRequest, PaymentRequestPaymentMethodEvent, StripeCardElement } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { IconAlert, IconCard, IconLock } from "@/components/icons";
import { formatCents, type Quote } from "@/lib/types";

import { PAYMENT_UNCERTAIN_NOTICE } from "@/lib/booking-flow-state";

interface Props {
  quote: Quote;
  clientSecret: string | null;
  creating: boolean;
  paymentExpiresAt?: string;
  onCreateBooking: () => Promise<void>;
  onConfirmPayment: (paymentIntentId: string) => Promise<void>;
  onPaymentUncertain?: (message:string) => void;
}

export default function CheckoutForm({
  quote,
  clientSecret,
  creating,
  paymentExpiresAt,
  onCreateBooking,
  onConfirmPayment,
  onPaymentUncertain,
}: Props) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [canPayRequest, setCanPayRequest] = useState(false);
  const [payRequestLabel, setPayRequestLabel] = useState("Pay");
  const [paying, setPaying] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const cardMountRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Load Stripe.js once the booking (clientSecret) exists.
  useEffect(() => {
    if (!clientSecret) return;
    if (!publishableKey?.startsWith((quote.paymentMode ?? "test") === "live" ? "pk_live_" : "pk_test_")) {
      setKeyMissing(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@stripe/stripe-js");
        const s = await mod.loadStripe(publishableKey);
        if (cancelled || !s) {
          if (!cancelled) setError("Payment service failed to load. Please try again.");
          return;
        }
        setStripe(s);

        // Payment Request (Apple Pay / Google Pay / etc.)
        const pr = s.paymentRequest({
          country: "US",
          currency: "usd",
          total: { label: "Casa Pacifica stay", amount: quote.totalCents },
          requestPayerName: true,
          requestPayerEmail: true,
        });
        // Wallet capability failure must not prevent the card fallback.
        const result = await pr.canMakePayment().catch(() => null);
        if (cancelled) return;
        if (!cancelled && result) {
          paymentRequestRef.current = pr;
          setCanPayRequest(true);
          if (result.applePay) setPayRequestLabel("Pay with Apple Pay");
          else if (result.googlePay) setPayRequestLabel("Pay with Google Pay");
          else setPayRequestLabel("Pay");
          pr.on("paymentmethod", async (ev) => {
            if (cancelled) { ev.complete("fail"); return; }
            setPaying(true);
            setError("");
            try {
              await confirmWalletPayment(s, clientSecret, ev, onConfirmPayment, () => !cancelled && (!paymentExpiresAt || Date.parse(paymentExpiresAt) > Date.now()));

            } catch {
              if (!cancelled) { setUncertain(true); setError(PAYMENT_UNCERTAIN_NOTICE); onPaymentUncertain?.(PAYMENT_UNCERTAIN_NOTICE); }
            } finally {
              if (!cancelled) setPaying(false);
            }
          });
        }

        // Card Element fallback
        const elements = s.elements();
        const card = elements.create("card", {
          style: {
            base: {
              fontSize: "16px",
              color: "#1C1917",
              fontFamily: "Inter, system-ui, sans-serif",
              "::placeholder": { color: "#A8A29E" },
            },
          },
        });
        cardElementRef.current = card;
        if (cardMountRef.current) {
          card.mount(cardMountRef.current);
          setStripeReady(true);
        }
      } catch {
        if (!cancelled) setError("Payment service failed to load. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
      paymentRequestRef.current = null;
      cardElementRef.current?.destroy();
      cardElementRef.current = null;
    };
  }, [clientSecret, quote.paymentMode, publishableKey, paymentExpiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  async function payWithCard() {
    if (uncertain || !stripe || !cardElementRef.current || !clientSecret) return;
    if (paymentExpiresAt && !(Date.parse(paymentExpiresAt) > Date.now())) { setUncertain(true); setError(PAYMENT_UNCERTAIN_NOTICE); onPaymentUncertain?.(PAYMENT_UNCERTAIN_NOTICE); return; }
    setPaying(true);
    setError("");
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElementRef.current } },
      );
      if (confirmError) {
        if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') setError(confirmError.message ?? "Payment was not accepted. Check the payment details.");
        else { setUncertain(true); setError(PAYMENT_UNCERTAIN_NOTICE); onPaymentUncertain?.(PAYMENT_UNCERTAIN_NOTICE); }
      } else {
        await onConfirmPayment(paymentIntent.id);
      }
    } catch {
      setUncertain(true); setError(PAYMENT_UNCERTAIN_NOTICE);
      onPaymentUncertain?.(PAYMENT_UNCERTAIN_NOTICE);
    } finally {
      setPaying(false);
    }
  }

  if (keyMissing) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center">
        <p className="font-medium text-ink">Payments aren't switched on yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
          The payment key does not match this quote's payment mode. Your dates
          are not guaranteed by a quote — please contact Casa Pacifica for assistance.
        </p>
      </div>
    );
  }

  // Step 1: booking not yet created on the server.
  if (!clientSecret) {
    return (
      <div>
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button onClick={onCreateBooking} disabled={creating} size="lg" className="w-full">
          <IconLock className="h-4 w-4" />
          {creating ? "Preparing secure payment…" : `Continue to payment · ${formatCents(quote.totalCents)}`}
        </Button>
        <p className="mt-3 text-center text-xs text-stone-500">
          Continue to prepare a temporary hold and payment step for {formatCents(quote.totalCents)}. This does not confirm a reservation.
        </p>
      </div>
    );
  }

  // Step 2: confirm the PaymentIntent.
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {canPayRequest && paymentRequestRef.current && (
        <div>
          <PaymentRequestButton
            paymentRequest={paymentRequestRef.current}
            label={payRequestLabel}
            disabled={paying || uncertain}
            onError={() => setError("Wallet could not open. Please use the card option.")}
          />
          <div className="my-4 flex items-center gap-3 text-xs text-stone-400">
            <span className="h-px flex-1 bg-stone-200" /> or pay with card{" "}
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
          <IconCard className="h-4 w-4 text-stone-500" /> Card details
        </label>
        <div
          ref={cardMountRef}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3.5"
        />
        <p className="mt-1.5 text-xs text-stone-500">
          Card details are handled securely by Stripe — we never see or store them.
        </p>
      </div>

      <Button
        onClick={payWithCard}
        disabled={paying || uncertain || !stripeReady}
        size="lg"
        className="w-full"
      >
        <IconLock className="h-4 w-4" />
        {paying ? "Processing…" : `Pay ${formatCents(quote.totalCents)}`}
      </Button>
      <p className="text-center text-xs text-stone-500">
        {(quote.paymentMode ?? "test") === "test" ? "Test mode — use a Stripe test card. Real charges are never made in test mode." : "Live payment — confirm the stay details and total before paying."}
      </p>
    </div>
  );
}

/** User activation must invoke show() directly; PaymentRequest itself has no mount(). */
export function PaymentRequestButton({ paymentRequest, label, disabled, onError }: {
  paymentRequest: PaymentRequest; label: string; disabled: boolean; onError: () => void;
}) {
  return <button type="button" disabled={disabled}
    className="w-full rounded-xl bg-ink px-5 py-3 font-medium text-white disabled:opacity-50"
    onClick={() => { try { paymentRequest.show(); } catch { onError(); } }}>
    {label}
  </button>;
}

/** Close the wallet sheet before any required authentication, then verify server-side. */
export async function confirmWalletPayment(
  stripe: Stripe, clientSecret: string, event: PaymentRequestPaymentMethodEvent,
  onConfirm: (id: string) => Promise<void>,
  isActive: () => boolean = () => true,
): Promise<void> {
  if (!isActive()) { event.complete("fail"); throw new Error("Payment step expired or was closed before wallet authorization."); }
  let initial;
  try {
    initial = await stripe.confirmCardPayment(clientSecret,
      { payment_method: event.paymentMethod.id }, { handleActions: false });
  } catch (error) { event.complete("fail"); throw error; }
  if (initial.error) {
    event.complete("fail");
    throw new Error(initial.error.message ?? "Wallet payment failed.");
  }
  event.complete("success");
  let intent = initial.paymentIntent;
  if (intent.status === "requires_action") {
    if (!isActive()) throw new Error("Payment step closed before authentication; verify this attempt before paying again.");
    const result = await stripe.confirmCardPayment(clientSecret);
    if (result.error) throw new Error(result.error.message ?? "Payment authentication failed.");
    intent = result.paymentIntent;
  }
  if (intent.status !== "succeeded") throw new Error("Payment is not yet complete.");
  await onConfirm(intent.id);
}
