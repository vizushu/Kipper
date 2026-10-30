"use client";
/** Prototype-inspired photo browsing; property assets remain the source of truth. */
import Image from "next/image";
import ShareStay from "@/components/ShareStay";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/icons";
import type { Photo } from "@/lib/types";

type GalleryView = "albums" | "photo" | "video" | null;
export function nextPhotoIndex(current: number, direction: number, count: number) {
  return count > 0 ? ((current + direction) % count + count) % count : 0;
}

export default function PhotoGallery({ photos, propertyName }: { photos: Photo[]; propertyName: string }) {
  const [hero, setHero] = useState(0);
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<GalleryView>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const close = useCallback(() => setView(null), []);
  const isOpen = view !== null;
  const active = photos[hero] ?? photos[0];
  const photo = photos[selected] ?? photos[0];
  const step = useCallback((direction: number) => setSelected(current => nextPhotoIndex(current, direction, photos.length)), [photos.length]);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (viewRef.current === "photo" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1);
      }
      if (event.key === "Tab") {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, close, step]);
  useEffect(() => {
    if (view) dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [view]);

  if (!active || !photo) return null;
  const buttonStyle = "flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-paper px-4 text-sm hover:bg-cream";
  return <>
    <div className="relative isolate w-full overflow-hidden bg-cream md:rounded-b-2xl" aria-roledescription="carousel" aria-label={`Photos of ${propertyName}`}>
      <button type="button" onClick={() => setView("albums")} className="relative block h-[clamp(260px,66vw,540px)] w-full focus-visible:outline-offset-[-5px]" aria-label="Open all photo albums">
        <Image src={active.src} alt={active.alt} fill priority sizes="100vw" className="object-cover" />
      </button>
      <button type="button" onClick={() => setView("video")} className="absolute left-4 top-4 flex min-h-11 items-center gap-2 rounded-lg bg-paper/95 px-3 text-xs font-medium text-ink shadow-sm md:left-6 md:top-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true"><path d="m8 4 12 8-12 8Z" /></svg>Video tour
      </button>
      <ShareStay propertyName={propertyName} />
      {photos.length > 1 && <>
        <button type="button" aria-label="Previous home photo" onClick={() => setHero(current => nextPhotoIndex(current, -1, photos.length))} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink md:left-5"><IconChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Next home photo" onClick={() => setHero(current => nextPhotoIndex(current, 1, photos.length))} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink md:right-5"><IconChevronRight className="h-5 w-5" /></button>
      </>}
      <div aria-hidden="true" className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/15 px-2 py-1.5">{photos.map((item, index) => <span key={item.src} className={`h-1.5 w-1.5 rounded-full ${index === hero ? "bg-white" : "bg-white/50"}`} />)}</div>
      <span className="pointer-events-none absolute bottom-4 right-4 rounded-md bg-ink/85 px-2 py-1 text-xs text-paper" aria-live="polite">{hero + 1} / {photos.length}<span className="sr-only"> photos · {active.room ?? active.alt}</span></span>
    </div>
    <button type="button" onClick={() => setView("albums")} className="min-h-11 px-4 text-sm underline underline-offset-4">View all {photos.length} photos</button>

    {isOpen && <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${propertyName} ${view === "video" ? "video tour" : "photo gallery"}`} className={`fixed inset-0 z-[60] overflow-y-auto text-ink ${view === "video" ? "bg-ink/65 px-4 py-8" : "bg-paper"}`} style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
      <div className={`mx-auto px-5 py-5 sm:px-8 ${view === "video" ? "max-w-xl rounded-2xl bg-paper shadow-xl" : "max-w-6xl"}`}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <button type="button" className="flex min-h-11 items-center gap-2 text-sm" onClick={() => view === "photo" ? setView("albums") : close()}><IconChevronLeft className="h-5 w-5" />{view === "photo" ? "All photos" : "Back to the stay"}</button>
          <button type="button" onClick={close} aria-label="Close gallery" className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300"><IconX className="h-5 w-5" /></button>
        </div>
        {view === "albums" && <>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Photo albums</p>
          <h2 className="mt-3 font-display text-4xl font-normal tracking-tight sm:text-5xl">Picture your days here.</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">{photos.map((item, index) => <button type="button" key={item.src} onClick={() => { setSelected(index); setView("photo"); }} className="overflow-hidden rounded-xl border border-stone-300 bg-white/40 text-left" aria-label={`View photo: ${item.alt}`}><div className="relative aspect-[1.25]"><Image src={item.src} alt={item.alt} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" /></div><span className="block px-3 py-3 text-sm">{item.room ?? `Photo ${index + 1}`}</span></button>)}</div>
        </>}
        {view === "photo" && <>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500" aria-live="polite">{selected + 1} of {photos.length}</p>
          <h2 className="mt-3 font-display text-4xl font-normal tracking-tight">{photo.room ?? propertyName}</h2>
          <div className="relative mt-7 h-[min(65vh,700px)] overflow-hidden rounded-xl bg-cream"><Image src={photo.src} alt={photo.alt} fill sizes="100vw" className="object-contain" priority /></div>
          <div className="mt-4 flex justify-between gap-3"><button type="button" onClick={() => step(-1)} className={buttonStyle}><IconChevronLeft className="mr-2 h-4 w-4" />Previous photo</button><button type="button" onClick={() => step(1)} className={buttonStyle}>Next photo<IconChevronRight className="ml-2 h-4 w-4" /></button></div>
          <p className="mt-4 text-sm leading-relaxed text-stone-600">{photo.caption ?? photo.alt}</p>
        </>}
        {view === "video" && <div className="mx-auto max-w-xl">
          <h2 className="font-display text-4xl font-normal tracking-tight">Video tour</h2>
          <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-xl"><Image src={photos[0].src} alt={photos[0].alt} fill sizes="(max-width:640px) 100vw, 576px" className="object-cover" /></div>
          <div className="my-5 rounded-xl bg-cream p-5"><p className="font-medium">A closer look is on the way.</p><p className="mt-2 text-sm leading-relaxed text-stone-600">The home’s video tour is not available yet. Explore the photo albums in the meantime.</p></div>
          <button type="button" onClick={() => setView("albums")} className={`${buttonStyle} w-full`}>Explore the albums</button>
        </div>}
      </div>
    </div>}
  </>;
}
