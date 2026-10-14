"use client";
/**
 * CheckoutForm — Stripe payment step.
 *
 * Built directly on @stripe/stripe-js (no react-stripe-js dependency):
 * - Payment Request Button (Apple Pay surfaces automatically where supported,
 *   labeled clearly) when the device can make payments.
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
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { IconAlert, IconCard, IconLock } from "@/components/icons";
import { formatCents, type Quote } from "@/lib/types";

interface Props {
  quote: Quote;
  clientSecret: string | null;
  creating: boolean;
  onCreateBooking: () => Promise<void>;
  onConfirmPayment: (paymentIntentId: string) => Promise<void>;
}

/**
 * Minimal Stripe.js typings so this file typechecks before @stripe/stripe-js
 * is installed (the coordinator adds it). Runtime loads it via dynamic
 * import; if the package is missing the import throws and we show an error.
 */
interface StripeLike {
  paymentRequest(options: {
    country: string;
    currency: string;
    total: { label: string; amount: number };
    requestPayerName?: boolean;
    requestPayerEmail?: boolean;
  }): PaymentRequestLike;
  elements(): { create(type: "card", options?: unknown): StripeCardElementLike };
  confirmCardPayment(
    clientSecret: string,
    data: { payment_method: unknown },
  ): Promise<{
    error?: { message?: string };
    paymentIntent: { id: string; status: string };
  }>;
}
interface PaymentRequestLike {
  canMakePayment(): Promise<null | { applePay?: boolean; googlePay?: boolean }>;
  on(event: "paymentmethod", handler: (ev: PaymentRequestEventLike) => void): void;
  mount(target: HTMLElement): void;
  unmount?(): void;
}
interface PaymentRequestEventLike {
  paymentMethod: { id: string };
  complete(status: "success" | "fail"): void;
}
interface StripeCardElementLike {
  mount(target: HTMLElement): void;
  unmount(): void;
}
type StripeNS = { Stripe: StripeLike };

export default function CheckoutForm({
  quote,
  clientSecret,
  creating,
  onCreateBooking,
  onConfirmPayment,
}: Props) {
  const [stripe, setStripe] = useState<StripeNS["Stripe"] | null>(null);
  const [canPayRequest, setCanPayRequest] = useState(false);
  const [payRequestLabel, setPayRequestLabel] = useState("Pay");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const cardMountRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElementLike | null>(null);
  const paymentRequestRef = useRef<PaymentRequestLike | null>(null);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Load Stripe.js once the booking (clientSecret) exists.
  useEffect(() => {
    if (!clientSecret) return;
    if (!publishableKey) {
      setKeyMissing(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Non-literal specifier: TypeScript leaves this as Promise<any>,
        // so this file typechecks whether or not @stripe/stripe-js is
        // installed. At runtime the coordinator's install provides it.
        const specifier = "@stripe/stripe-js";
        const mod = (await import(specifier)) as unknown as {
          loadStripe(key: string): Promise<StripeLike | null>;
        };
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
        const result = await pr.canMakePayment();
        if (!cancelled && result) {
          paymentRequestRef.current = pr;
          setCanPayRequest(true);
          if (result.applePay) setPayRequestLabel("Pay with Apple Pay");
          else if (result.googlePay) setPayRequestLabel("Pay with Google Pay");
          else setPayRequestLabel("Pay");
          pr.on("paymentmethod", async (ev) => {
            setPaying(true);
            setError("");
            try {
              const { error: confirmError, paymentIntent } =
                await s.confirmCardPayment(clientSecret, {
                  payment_method: ev.paymentMethod.id,
                });
              if (confirmError) {
                ev.complete("fail");
                setError(confirmError.message ?? "Payment failed. Please try again.");
              } else {
                ev.complete("success");
                await onConfirmPayment(paymentIntent.id);
              }
            } catch {
              ev.complete("fail");
              setError("Payment failed. Please try again.");
            } finally {
              setPaying(false);
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
      cardElementRef.current?.unmount();
      cardElementRef.current = null;
    };
  }, [clientSecret, publishableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function payWithCard() {
    if (!stripe || !cardElementRef.current || !clientSecret) return;
    setPaying(true);
    setError("");
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElementRef.current } },
      );
      if (confirmError) {
        setError(confirmError.message ?? "Card payment failed. Please try again.");
      } else {
        await onConfirmPayment(paymentIntent.id);
      }
    } catch {
      setError("Card payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (keyMissing) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-center">
        <p className="font-medium text-ink">Payments aren't switched on yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
          This site is in test mode and the payment key isn't configured. Your dates
          are held in the quote — please contact Kipper to complete your booking.
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
          You'll pay {formatCents(quote.totalCents)} now. Nothing is charged until you confirm.
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
            disabled={paying}
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
        disabled={paying || !stripeReady}
        size="lg"
        className="w-full"
      >
        <IconLock className="h-4 w-4" />
        {paying ? "Processing…" : `Pay ${formatCents(quote.totalCents)}`}
      </Button>
      <p className="text-center text-xs text-stone-500">
        Test mode — use a Stripe test card. Real charges are never made in test mode.
      </p>
    </div>
  );
}

/** Renders the native Payment Request button into a div. */
function PaymentRequestButton({
  paymentRequest,
  label,
  disabled,
}: {
  paymentRequest: PaymentRequestLike;
  label: string;
  disabled: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (ref.current && !mounted.current) {
      try {
        paymentRequest.mount(ref.current);
        mounted.current = true;
      } catch {
        /* Payment Request button unsupported here; card fallback covers it */
      }
    }
    return () => {
      try {
        paymentRequest.unmount?.();
      } catch {
        /* noop */
      }
      mounted.current = false;
    };
  }, [paymentRequest]);
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <div ref={ref} className={disabled ? "pointer-events-none opacity-60" : undefined} />
    </div>
  );
}
