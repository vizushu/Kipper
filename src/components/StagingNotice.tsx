'use client';
import {useEffect} from 'react';
/** Separate staging origin is required. Never install a worker on this origin. */
export default function StagingNotice(){
 useEffect(()=>{
  if('serviceWorker' in navigator)void navigator.serviceWorker.getRegistrations().then(items=>Promise.all(items.map(item=>item.unregister())));
  if('caches' in window)void caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key))));
 },[]);
 return <aside role="status" className="sticky top-0 z-[100] bg-amber-100 p-3 text-center text-sm text-black"><strong>PRIVATE TEST SITE — synthetic reservations only. Use Stripe test cards; no real stay is booked.</strong> <form action="/api/staging/logout" method="post" className="inline"><button className="underline">Sign out</button></form></aside>;
}
