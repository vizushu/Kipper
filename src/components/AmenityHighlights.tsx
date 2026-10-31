"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { AmenityGroup } from "@/lib/types";
import { IconCheck, IconWifi, IconPool, IconX, IconArrowUpRight } from "@/components/icons";
function AmenityIcon({ item }: { item: string }) {
  if (item === "Wifi") return <IconWifi className="h-6 w-6 shrink-0"/>;
  if (item === "Private pool") return <IconPool className="h-6 w-6 shrink-0"/>;
  const paths: Record<string,string> = {
    "Full kitchen": "M5 3v7m-3-7v5a3 3 0 0 0 6 0V3M5 11v11M17 3c-4 4-4 8 0 9h3V3Zm3 9v10",
    "EV charger (Level 2)": "M4 21V4h10v17M2 21h14M7 7h4m3 4h3v6a2 2 0 0 0 4 0V8l-3-3M8 11l-2 4h4l-2 4",
    "Pool table": "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M10 10h4v4h-4Z",
    "Free on-premises parking + free street parking": "M4 3h16v18H4ZM9 18V7h4a3 3 0 0 1 0 6H9"
  };
  return paths[item] ? <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={paths[item]}/></svg> : <IconCheck className="h-6 w-6 shrink-0"/>;
}
const labels: Record<string,string> = { Wifi: "Wi-Fi", "EV charger (Level 2)": "EV charging", "Private pool": "Swimming pool", "Free on-premises parking + free street parking": "Free parking" };

// Select only exact matches from the property's verified content, never new claims.
const preferred = ["Full kitchen", "Wifi", "EV charger (Level 2)", "Private pool", "Pool table", "Free on-premises parking + free street parking"];
export function selectAmenityHighlights(groups: AmenityGroup[]): string[] {
  const all = [...new Set(groups.flatMap(group => group.items))];
  return [...preferred.filter(item => all.includes(item)), ...all.filter(item => !preferred.includes(item))].slice(0, 6);
}

export default function AmenityHighlights({ groups }: { groups: AmenityGroup[] }) {
  const highlights = selectAmenityHighlights(groups);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  function outside(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
  }
  if (!highlights.length) return <p className="text-sm text-stone-600">Amenities are awaiting confirmation.</p>;
  return <>
    <ul className="grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-3">
      {highlights.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-stone-600"><AmenityIcon item={item}/><span>{labels[item] ?? item}</span></li>)}
    </ul>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="mt-6 min-h-11 rounded-md border border-moss/60 px-4 py-3 text-sm font-medium text-ink hover:bg-cream">Show all amenities</button>
    <dialog ref={dialog} onClose={() => setOpen(false)} onClick={outside} aria-labelledby={titleId} className="m-auto max-h-[90dvh] w-[calc(100%_-_24px)] max-w-xl overflow-y-auto rounded-xl border border-line bg-panel p-5 text-ink backdrop:bg-ink/60 sm:p-7">
      <button type="button" onClick={() => dialog.current?.close()} aria-label="Close amenities" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-line"><IconX className="h-4 w-4"/></span></button>
      <h2 id={titleId} className="max-w-[19ch] pr-5 font-display text-2xl font-normal leading-tight">The good kind of staying in.</h2>
      <div className="mt-6 space-y-6">
        {groups.filter(group => group.items.length > 0).map(group => <section key={group.category}>
          <h3 className="mb-3 text-xs font-medium text-moss">{group.category}</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-4">
            {[...new Set(group.items)].map(item => <li key={item} className="flex min-w-0 items-start gap-2 text-xs leading-5 text-moss"><AmenityIcon item={item}/><span>{labels[item] ?? item}</span></li>)}
          </ul>
        </section>)}
      </div>
      <p className="mt-7 text-xs leading-6 text-moss"><Link href="/contact" className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4">Ask Kipper <IconArrowUpRight className="h-4 w-4"/></Link> about charging, pool heating and accessibility.</p>
    </dialog>
  </>;
}
