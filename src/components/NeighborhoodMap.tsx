/** Neighborhood-only view: constants describe broad Mira Mesa, never the property. */
export const MIRA_MESA_MAP = 'https://www.openstreetmap.org/export/embed.html?bbox=-117.19%2C32.90%2C-117.10%2C32.96&layer=mapnik';
export const MIRA_MESA_MAP_LINK = 'https://www.openstreetmap.org/#map=13/32.93/-117.145';
export default function NeighborhoodMap() {
  return <figure className="mt-4"><div className="relative isolate aspect-[1.5] overflow-hidden rounded-xl border border-line bg-cream">
    <iframe src={MIRA_MESA_MAP} title="Map of the broad Mira Mesa neighborhood area" loading="lazy" referrerPolicy="no-referrer" tabIndex={-1} sandbox="allow-scripts allow-same-origin" className="pointer-events-none absolute inset-0 h-full w-full border-0"/>
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 flex aspect-square w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/50 bg-ink/10"><span className="rounded-full bg-ink px-4 py-3 text-center text-xs text-paper">Mira Mesa<br/>area</span></div>
    <a href={MIRA_MESA_MAP_LINK} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Open neighborhood map" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg bg-panel/90 text-ink">↗</a>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="absolute bottom-0 right-0 bg-panel/95 px-2 py-1 text-[9px] underline">© OpenStreetMap contributors</a>
  </div><figcaption className="mt-2 text-xs leading-5 text-moss">Approximate Mira Mesa area — not the property location.</figcaption></figure>;
}
