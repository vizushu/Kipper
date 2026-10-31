"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl/esm';

// Neighborhood center only. Never accept property, visitor or query coordinates.
export const NEIGHBORHOOD_CENTER: [number, number] = [-117.145, 32.93];
export function approvedPublicMapToken(value: string | undefined) {
  return value && /^pk\.[A-Za-z0-9._-]+$/.test(value) ? value : null;
}
export function neighborhoodArea() {
  const coordinates = Array.from({length:65}, (_,i) => {
    const angle=i/64*Math.PI*2;
    return [NEIGHBORHOOD_CENTER[0]+Math.cos(angle)*0.014, NEIGHBORHOOD_CENTER[1]+Math.sin(angle)*0.012];
  });
  return {type:'Feature' as const, properties:{}, geometry:{type:'Polygon' as const,coordinates:[coordinates]}};
}

/** Optional enhancement. No token means no SDK import or Mapbox requests. */
export default function MapboxNeighborhood({ token }: { token: string }) {
  const container=useRef<HTMLDivElement>(null);
  const [ready,setReady]=useState(false);
  const [failure,setFailure]=useState<string|null>(null);
  const [status,setStatus]=useState('loading');
  useEffect(()=>{
    let disposed=false, map:MapboxMap|undefined;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const fail=(reason:string)=>{if(disposed)return;setReady(false);setFailure(reason);setStatus(reason);clearTimeout(timer);map?.remove();map=undefined;};
    void import('mapbox-gl/esm').then(sdk=>{
      if(disposed||!container.current)return;
      if(!sdk.supported()){fail('unsupported-webgl');return;}
      map=new sdk.Map({container:container.current,accessToken:token,
        style:'mapbox://styles/mapbox/standard',center:NEIGHBORHOOD_CENTER,zoom:12.3,
        minZoom:11,maxZoom:14,pitch:0,bearing:0,cooperativeGestures:true,
        attributionControl:true,respectPrefersReducedMotion:true,
        config:{basemap:{lightPreset:'day',showPointOfInterestLabels:false,showTransitLabels:false,
          show3dObjects:false,colorLand:'#f6f3eb',colorWater:'#b7ccc4',colorGreenspace:'#dce4d5',
          colorRoads:'#fffcf6',colorPlaceLabels:'#344d3c',colorRoadLabels:'#586451'}}});
      map.dragRotate.disable();map.touchZoomRotate.disableRotation();
      map.addControl(new sdk.NavigationControl({showCompass:false}),'top-left');
      timer=setTimeout(()=>fail('timeout'),12000);
      map.on('error',()=>fail('style-load-error'));
      map.on('webglcontextlost',()=>fail('webgl-context-lost'));
      map.on('load',()=>{
        if(disposed||!map)return;
        try {
          map.addSource('approximate-neighborhood',{type:'geojson',data:neighborhoodArea()});
          map.addLayer({id:'approximate-area',type:'fill',source:'approximate-neighborhood',paint:{'fill-color':'#344d3c','fill-opacity':0.12}});
          map.addLayer({id:'approximate-outline',type:'line',source:'approximate-neighborhood',paint:{'line-color':'#344d3c','line-width':1.5,'line-opacity':0.55}});
          const logo=document.createElement('img');logo.src='/icons/casa-pacifica.svg';logo.alt='Casa Pacifica — approximate neighborhood, not the property location';logo.width=48;logo.height=48;logo.className='rounded-full border-2 border-white shadow-sm';
          new sdk.Marker({element:logo}).setLngLat(NEIGHBORHOOD_CENTER).addTo(map);
          clearTimeout(timer);setStatus('ready');setReady(true);
        } catch {fail('style-load-error');}
      });
    }).catch(()=>fail('sdk-load-error'));
    return()=>{disposed=true;clearTimeout(timer);map?.remove();};
  },[token]);
  if(failure)return <span hidden data-mapbox-state={failure}/>;
  return <div ref={container} data-mapbox-state={status} aria-label="Interactive approximate Mira Mesa neighborhood map" aria-hidden={!ready} inert={!ready} className={`absolute inset-0 bg-cream ${ready?'z-10':'pointer-events-none opacity-0'}`}/>;
}
