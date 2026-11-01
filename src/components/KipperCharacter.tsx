"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** Decorative, local-only 3D enhancement. Help never depends on WebGL or motion. */
export default function KipperCharacter({ animate = true }: { animate?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const target = host.current;
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The original image remains the reduced-motion and failure experience.
    if (reduced.matches || document.hidden) return;
    let disposed = false;
    let cancelled = false;
    let cleanup = () => {};
    import("@/lib/kipper-renderer").then(({ mountKipper }) => {
      if (disposed) return;
      const release = mountKipper(target, animate, () => !disposed && !cancelled && setReady(true), () => !disposed && setReady(false));
      if (disposed || cancelled) release(); else cleanup = release;
    }).catch(() => { if (!disposed) setReady(false); });
    const stop = () => { if (reduced.matches) { cancelled = true; cleanup(); setReady(false); } };
    reduced.addEventListener("change", stop);
    return () => { disposed = true; cleanup(); reduced.removeEventListener("change", stop); };
  }, [animate]);
  return <div aria-hidden="true" className="relative mx-auto h-44 w-44 sm:h-48 sm:w-48">
    {/* Original approved direction, not the generated sprite atlas or a different mascot. */}
    <Image src="/kipper/original-mascot.png" alt="" width={192} height={192} sizes="192px" className="absolute inset-0 h-full w-full object-contain" style={{ visibility: ready ? "hidden" : "visible" }}/>
    <div ref={host} className="absolute inset-0" style={{ visibility: ready ? "visible" : "hidden" }}/>
  </div>;
}
