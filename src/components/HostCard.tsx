/**
 * HostCard — host identity card per the design system (§3).
 *
 * Avatar/logo, "Hosted by X", one credibility line. The credibility line
 * must be true — no invented Superhost claims or credentials.
 */
import Link from "next/link";
import { cn } from "@/components/cn";

export default function HostCard({
  hostName,
  credibility,
  href,
  className,
}: {
  hostName: string;
  credibility?: string;
  href?: string;
  className?: string;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xl font-medium text-paper"
      >
        {hostName.charAt(0)}
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">
          Hosted by {hostName}
        </span>
        <span className="mt-0.5 block text-sm text-stone-500">
          {credibility}
        </span>
      </span>
    </>
  );

  const classes = cn(
    "flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-card",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(classes, "transition-shadow hover:shadow-lift")}>
        {inner}
      </Link>
    );
  }
  return <div className={classes}>{inner}</div>;
}
