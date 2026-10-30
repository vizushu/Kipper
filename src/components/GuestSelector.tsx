"use client";
/**
 * GuestSelector — steppers for adults / children / infants.
 * Total headcount (adults + children + infants) is capped at maxGuests.
 */
import { IconMinus, IconPlus } from "@/components/icons";
import { cn } from "@/components/cn";
import type { GuestCount } from "@/lib/types";

interface Props {
  value: GuestCount;
  onChange: (next: GuestCount) => void;
  maxGuests: number;
  compact?: boolean;
}

const ROWS: Array<{ key: keyof GuestCount; title: string; hint: string }> = [
  { key: "adults", title: "Adults", hint: "Ages 13+" },
  { key: "children", title: "Children", hint: "Ages 2–12" },
  { key: "infants", title: "Infants", hint: "Under 2" },
];

export default function GuestSelector({ value, onChange, maxGuests, compact }: Props) {
  const overnight = value.adults + value.children + value.infants;

  function set(key: keyof GuestCount, next: number) {
    const clamped = Math.max(key === "adults" ? 1 : 0, Math.min(16, next));
    const trial = { ...value, [key]: clamped };
    if (trial.adults + trial.children + trial.infants > maxGuests) return;
    onChange(trial);
  }

  return (
    <div className={cn(!compact && "rounded-2xl border border-stone-200 bg-white p-4")}>
      <p className="text-sm font-medium text-ink">Guests</p>
      <p className="text-xs text-stone-500">
        Max {maxGuests} people total, including infants and daytime visitors
      </p>
      <div className="mt-2 divide-y divide-stone-100">
        {ROWS.map((row) => {
          const count = value[row.key];
          return (
            <div key={row.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-ink">{row.title}</p>
                <p className="text-xs text-stone-500">{row.hint}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Fewer ${row.title.toLowerCase()}`}
                  onClick={() => set(row.key, count - 1)}
                  disabled={count <= (row.key === "adults" ? 1 : 0)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-ink transition-colors hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconMinus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-medium tabular-nums" aria-live="polite">
                  {count}
                </span>
                <button
                  type="button"
                  aria-label={`More ${row.title.toLowerCase()}`}
                  onClick={() => set(row.key, count + 1)}
                  disabled={overnight >= maxGuests}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-ink transition-colors hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconPlus className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {overnight >= maxGuests && (
        <p className="mt-1 text-xs text-clay-dark">
          Total headcount limit reached ({maxGuests}).
        </p>
      )}
    </div>
  );
}

export function guestSummary(g: GuestCount): string {
  const parts: string[] = [];
  const total = g.adults + g.children + g.infants;
  parts.push(`${total} guest${total === 1 ? "" : "s"}`);
  if (g.infants > 0) parts.push(`including ${g.infants} infant${g.infants === 1 ? "" : "s"}`);
  return parts.join(", ");
}
