"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/types";
import { IconBed } from "@/components/icons";
export default function RoomCards({ photos }: { photos: Photo[] }) {
  const rooms = [1,2,3].map(n => photos.find(p => p.room === `Bedroom ${n}`));
  const [selected,setSelected] = useState<number|null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if(selected === null) return;
    const opener=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow=overflow; if(opener?.isConnected) opener.focus(); };
  },[selected]);
  return <><div className="grid grid-cols-3 gap-2">{rooms.map((photo,index) => <button key={index} type="button" onClick={() => setSelected(index)} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-line bg-panel px-2 py-4"><IconBed className="h-6 w-6"/><span className="text-xs">Bedroom {String.fromCharCode(65+index)}</span><span className="text-[10px] text-moss">Explore room</span></button>)}</div><dialog ref={dialog} onClose={() => setSelected(null)} aria-labelledby="room-title" className="m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-lg overflow-y-auto rounded-xl bg-paper p-5 text-ink backdrop:bg-ink/60"><button type="button" onClick={() => dialog.current?.close()} className="mb-4 min-h-11 text-sm underline">Close room details</button>{selected!==null && <><h3 id="room-title" className="font-display text-3xl">Bedroom {String.fromCharCode(65+selected)}</h3>{rooms[selected] && <div className="relative mt-4 aspect-[4/3]"><Image src={rooms[selected]!.src} alt={rooms[selected]!.alt} fill sizes="500px" className="rounded-lg object-cover"/></div>}<p className="mt-4 text-sm leading-6">Bed count and sleeping arrangements are awaiting confirmation. Bathroom access and room-specific details should be confirmed before booking.</p></>}</dialog></>;
}
