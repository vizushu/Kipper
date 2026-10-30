/**
 * TrustStrip — the single trust badge card per the design system (§3).
 *
 * One badge max (never five). Used for verified property information and
 * similar single trust signals.
 */
import { cn } from "@/components/cn";

export default function TrustStrip({
  badge,
  body,
  className,
}: {
  badge: string;
  body: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white px-6 py-6 text-center shadow-card sm:flex-row sm:gap-5 sm:px-8 sm:text-left",
        className,
      )}
    >
      <span className="shrink-0 font-display text-2xl font-medium italic text-ink">
        {badge}
      </span>
      <span
        aria-hidden
        className="hidden h-10 w-px bg-stone-200 sm:block"
      />
      <p className="text-sm leading-relaxed text-stone-600 sm:text-[15px]">
        {body}
      </p>
    </div>
  );
}
