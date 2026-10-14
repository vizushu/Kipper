/**
 * TitleBlock — centered title block per the design system (§3).
 *
 * Anatomy (Airbnb listing reference): name (large, tight), one muted place
 * line, one fact row with middot separators, rating line — four lines of
 * decreasing emphasis. Rating is rendered ONLY when real review data is
 * passed; it is omitted entirely otherwise (never faked).
 */
import { cn } from "@/components/cn";

export interface TitleBlockRating {
  value: number;
  count: number;
}

export default function TitleBlock({
  name,
  place,
  facts = [],
  rating = null,
  align = "center",
  className,
}: {
  name: string;
  place?: string;
  facts?: string[];
  rating?: TitleBlockRating | null;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-[40px]">
        {name}
      </h1>
      {place && (
        <p className="mt-3 text-base text-stone-600 sm:text-lg">{place}</p>
      )}
      {facts.length > 0 && (
        <p className="mt-2 text-sm text-stone-500 sm:text-[15px]">
          {facts.join(" · ")}
        </p>
      )}
      {rating && (
        <p className="mt-2 text-sm font-medium text-ink">
          <span aria-hidden>★</span> {rating.value.toFixed(2)}{" "}
          <span className="font-normal text-stone-500">
            · {rating.count} review{rating.count === 1 ? "" : "s"}
          </span>
        </p>
      )}
    </div>
  );
}
