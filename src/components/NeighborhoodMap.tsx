"use client";
import { useEffect, useRef, useState } from 'react';
import MapboxNeighborhood, { approvedPublicMapToken } from '@/components/MapboxNeighborhood';
import { IconArrowUpRight } from '@/components/icons';
/** Fixed neighborhood center, not property data. Raster images do not require WebGL. */
export const MIRA_MESA_MAP_LINK = 'https://www.openstreetmap.org/#map=13/32.93/-117.145';
export function neighborhoodRasterTiles() {
  const zoom=13, size=256, width=512, height=340;
  const x=(-117.145+180)/360*2**zoom*size;
  const y=(1-Math.asinh(Math.tan(32.93*Math.PI/180))/Math.PI)/2*2**zoom*size;
  const left=x-width/2, top=y-height/2;
  const tiles=[];
  for(let row=Math.floor(top/size);row<=Math.floor((top+height-1)/size);row++) {
    for(let col=Math.floor(left/size);col<=Math.floor((left+width-1)/size);col++) {
      tiles.push({src:`https://tile.openstreetmap.org/${zoom}/${col}/${row}.png`,left:(col*size-left)/width*100,top:(row*size-top)/height*100,width:size/width*100,height:size/height*100});
    }
  }
  return tiles;
}
export default function NeighborhoodMap() {
  const mapToken=approvedPublicMapToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  const container=useRef<HTMLDivElement>(null);
  const [visible,setVisible]=useState(false);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!container.current)return;
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'0px'});
    observer.observe(container.current);return()=>observer.disconnect();
  },[]);
  return <figure className="mt-4"><div ref={container} role="group" aria-label="Map of the approximate Mira Mesa neighborhood, not the property location" className="relative isolate aspect-[512/340] overflow-hidden rounded-xl border border-line bg-cream">
    {visible&&!failed&&neighborhoodRasterTiles().map(tile=><img key={tile.src} src={tile.src} alt="" aria-hidden="true" width="256" height="256" loading="lazy" decoding="async" referrerPolicy="origin" onError={()=>setFailed(true)} className="pointer-events-none absolute max-w-none" style={{left:`${tile.left}%`,top:`${tile.top}%`,width:`${tile.width}%`,height:`${tile.height}%`}}/>)}
    {failed?<p role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-moss">The map could not load. Open the neighborhood map using the link.</p>:<div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 flex aspect-square w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/50 bg-ink/10"><img src="/icons/casa-pacifica.svg" alt="" aria-hidden="true" width="48" height="48" className="h-12 w-12 rounded-full border-2 border-panel shadow-sm"/></div>}
    {visible&&mapToken&&<MapboxNeighborhood token={mapToken}/>}
    <a href={MIRA_MESA_MAP_LINK} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label="Open neighborhood map" className="absolute z-20 right-1 top-1 flex h-11 w-11 items-center justify-center text-ink"><span className="flex h-7 w-7 items-center justify-center rounded bg-white"><IconArrowUpRight className="h-4 w-4"/></span></a>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="absolute bottom-0 right-0 bg-panel/95 px-2 py-1 text-[10px] underline">© OpenStreetMap contributors</a>
  </div><figcaption className="mt-2 text-xs leading-5 text-moss">Approximate Mira Mesa area — not the property location.{mapToken&&<span className="mt-1 block">Interactive maps connect to Mapbox, which processes browser and network information. <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline">Mapbox privacy policy</a>.</span>}</figcaption></figure>;
}
