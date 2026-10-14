/**
 * HighlightCard — icon + bold lead + ≤2 lines of muted support copy,
 * per the design system (§3). Scannable differentiators only.
 */
import type { ComponentType } from "react";
import { cn } from "@/components/cn";

export default function HighlightCard({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4", className)}>
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream text-clay-dark"
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold leading-snug text-ink">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">{body}</p>
      </div>
    </div>
  );
}
