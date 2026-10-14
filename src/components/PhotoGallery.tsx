"use client";
/**
 * PhotoGallery — editorial mosaic + full lightbox.
 * First photo large, thumbnails beside; lightbox with keyboard nav + captions.
 */
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconExpand, IconX } from "@/components/icons";
import { cn } from "@/components/cn";
import type { Photo } from "@/lib/types";

export default function PhotoGallery({ photos, propertyName }: { photos: Photo[]; propertyName: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setLightbox((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, step]);

  const [first, ...rest] = photos;
  const thumbs = rest.slice(0, 4);

  return (
    <>
      <div className="grid gap-2 sm:gap-3 md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="img-frame group relative aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:h-full md:min-h-[420px]"
          aria-label={`View photo: ${first.alt}`}
        >
          <Image
            src={first.src}
            alt={first.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <IconExpand className="h-3.5 w-3.5" /> {photos.length} photos
          </span>
        </button>
        {thumbs.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setLightbox(i + 1)}
            className="img-frame group relative hidden aspect-[4/3] md:block"
            aria-label={`View photo: ${photo.alt}`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>
      {rest.length > 4 && (
        <button
          type="button"
          onClick={() => setLightbox(0)}
          className="mt-3 text-sm font-medium text-clay underline-offset-4 hover:underline"
        >
          View all {photos.length} photos
        </button>
      )}

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${propertyName} photo gallery`}
          onClick={close}
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-paper">
              {lightbox + 1} / {photos.length}
              {photos[lightbox].room && (
                <span className="ml-2 text-paper/60">{photos[lightbox].room}</span>
              )}
            </p>
            <button
              type="button"
              onClick={close}
              aria-label="Close gallery"
              className="rounded-full p-2 text-paper hover:bg-white/10"
            >
              <IconX className="h-6 w-6" />
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center px-12 sm:px-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 rounded-full bg-white/10 p-2.5 text-paper hover:bg-white/20 sm:left-6"
            >
              <IconChevronLeft className="h-6 w-6" />
            </button>
            <div className="relative h-full max-h-[70vh] w-full max-w-5xl">
              <Image
                key={photos[lightbox].src}
                src={photos[lightbox].src}
                alt={photos[lightbox].alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 rounded-full bg-white/10 p-2.5 text-paper hover:bg-white/20 sm:right-6"
            >
              <IconChevronRight className="h-6 w-6" />
            </button>
          </div>
          <div className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-paper">
              {photos[lightbox].caption ?? photos[lightbox].alt}
            </p>
            <div className="mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto pb-1">
              {photos.map((photo, i) => (
                <button
                  key={photo.src}
                  type="button"
                  onClick={() => setLightbox(i)}
                  aria-label={`Go to photo ${i + 1}: ${photo.alt}`}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg",
                    i === lightbox ? "ring-2 ring-clay" : "opacity-60 hover:opacity-100",
                  )}
                >
                  <Image src={photo.src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
