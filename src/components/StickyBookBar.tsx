"use client";
import { Button } from "@/components/ui";
/** One persistent date-selection action, never a fabricated rate or reservation. */
export default function StickyBookBar({ label, detail, onOpen }: { label: string; detail: string; onOpen: () => void }) {
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel px-[22px] pt-3 shadow-[0_-5px_24px_#00000008]" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
    <div className="mx-auto grid max-w-[816px] grid-cols-[minmax(0,1fr)_minmax(125px,40%)] items-center gap-3 sm:grid-cols-[1fr_240px]">
      <div className="min-w-0"><p className="text-base font-semibold leading-tight tracking-tight sm:text-xl">{label}</p><p className="mt-1 text-[10px] text-moss sm:text-xs">{detail}</p></div>
      <Button data-booking-open onClick={onOpen} className="min-h-12 w-full shrink-0">Check dates</Button>
    </div>
  </div>;
}
