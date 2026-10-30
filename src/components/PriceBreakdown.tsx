/**
 * PriceBreakdown — itemized quote display.
 * Positive amounts are charges; negative amounts are discounts.
 */
import { formatCents, type LineItem, type Quote } from "@/lib/types";
import { cn } from "@/components/cn";
import { SampleBadge } from "@/components/ui";

export default function PriceBreakdown({
  quote,
  showSampleBadge = false,
}: {
  quote: Quote;
  showSampleBadge?: boolean;
}) {
  return (
    <div>
      <dl className="mb-3 flex items-center justify-between border-b border-stone-200 pb-4">
        <dt className="text-base font-semibold text-ink">Stay total <span className="font-normal text-stone-500">(USD)</span></dt>
        <dd className="text-xl font-semibold text-ink">{formatCents(quote.totalCents)}</dd>
      </dl>
      <p className="mb-3 text-xs leading-relaxed text-stone-500">Includes accommodation, mandatory cleaning, selected extras and applicable taxes. No payment-processing surcharge is added.</p>
      <dl>
        {quote.lineItems.map((item, i) => <PriceRow key={`${item.label}-${i}`} item={item} />)}
      </dl>
      {showSampleBadge && (
        <p className="mt-3 text-xs text-stone-500">
          <SampleBadge /> Test quote only. Cleaning and tax inputs are confirmed; nightly rates and final checkout approval remain pending.
        </p>
      )}
      <p className="mt-2 text-xs text-stone-500">
        Quote expires at{" "}
        {new Date(quote.expiresAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
        .
      </p>
    </div>
  );
}

function PriceRow({ item }: { item: LineItem }) {
  const isDiscount = item.amountCents < 0;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-stone-600">
        {item.label}
        {item.detail && <span className="block text-xs text-stone-400">{item.detail}</span>}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium tabular-nums",
          isDiscount ? "text-moss" : "text-ink",
        )}
      >
        {isDiscount ? "−" : ""}
        {formatCents(Math.abs(item.amountCents))}
      </dd>
    </div>
  );
}
