"use client";
import { Button } from "@/components/ui";

/** The only booking CTA outside the mobile booking sheet. No speculative rates. */
export default function StickyBookBar({ label, detail, onOpen }: { label: string; detail: string; onOpen: () => void }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-paper/95 px-4 pt-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-sm font-semibold text-ink">{label}</p><p className="truncate text-xs text-stone-500">{detail}</p></div>
      <Button data-booking-open onClick={onOpen} className="min-h-11 shrink-0">Check dates</Button>
    </div>
  </div>;
}
