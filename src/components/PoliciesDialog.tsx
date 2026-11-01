"use client";
import Link from "next/link";
import { IconArrowUpRight } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/lib/types";
import { IconX } from "@/components/icons";
/** Browsing summary only. Accepted booking terms and refund snapshots are unchanged. */
export default function PoliciesDialog({ property }: { property: Property }) {
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!open) return;
    const opener=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    dialog.current?.showModal();
    return ()=>{document.body.style.overflow=overflow;if(opener?.isConnected)opener.focus();};
  },[open]);
  function outside(event:React.MouseEvent<HTMLDialogElement>) {
    if(event.target!==event.currentTarget)return;
    const r=event.currentTarget.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.current?.close();
  }
  return <><button type="button" onClick={()=>setOpen(true)} className="mt-5 min-h-11 rounded-md border border-moss/60 px-4 py-3 text-sm">Read all policies</button>
    <dialog ref={dialog} onClose={()=>setOpen(false)} onClick={outside} aria-labelledby="policies-title" className="m-auto max-h-[92dvh] w-[calc(100%_-_24px)] max-w-xl overflow-y-auto rounded-xl bg-panel p-5 text-ink backdrop:bg-ink/60 sm:p-7">
      <button type="button" onClick={()=>dialog.current?.close()} aria-label="Close policies" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full"><IconX className="h-4 w-4"/></button>
      <h2 id="policies-title" className="pr-8 font-display text-3xl font-normal">Before you book</h2>
      <section className="mt-5 border-t border-line pt-5"><h3 className="font-display text-2xl">House rules</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-moss"><li>Maximum {property.maxGuests} overnight guests, including children and infants; {property.maxTotalOccupancy} people total including approved daytime visitors.</li><li>Check-in {property.checkInTime}. Checkout {property.checkOutTime}.</li><li>Quiet hours: {property.quietHours}.</li><li>No parties, smoking or vaping.</li></ul></section>
      <section className="mt-5 border-t border-line pt-5"><h3 className="font-display text-2xl">Pool &amp; safety</h3><p className="mt-3 text-sm leading-6 text-moss">Supervise children around the pool. No glass near the pool. No lifeguard is on duty.</p><p className="mt-3 text-sm leading-6 text-moss">Smoke and carbon monoxide alarms, fire extinguishers and a first aid kit are present; the owner has confirmed they are working.</p></section>
      <section className="mt-5 border-t border-line pt-5"><h3 className="font-display text-2xl">Cancellation</h3><p className="mt-3 text-sm leading-6 text-moss">Accommodation is 100% refundable at least 30 days before arrival, 50% refundable 15–29 days before arrival, and nonrefundable less than 15 days before arrival. Cleaning is fully refundable before arrival.</p><Link href="/policies/cancellation" className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Full cancellation policy</Link></section>
      <section className="mt-5 border-t border-line pt-5"><h3 className="font-display text-2xl">Questions before booking?</h3><p className="mt-3 text-sm leading-6 text-moss">Check pets, accessibility, pool heating and EV charging details before booking.</p><Link href="/contact" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">Ask Kipper <IconArrowUpRight className="ml-1 inline h-4 w-4 align-middle"/></Link></section>
      <Link href="/policies/terms" className="mt-4 inline-flex min-h-11 items-center text-xs underline underline-offset-4">Full terms of stay</Link>
      <p className="mt-3 text-xs leading-6 text-moss">Accepted booking terms specify the exact local-time cancellation cutoffs. Tax refund adjustments require separate review.</p>
    </dialog></>;
}
