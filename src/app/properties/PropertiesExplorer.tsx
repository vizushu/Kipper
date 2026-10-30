'use client';
/** Date-specific server totals only. Preview never requests quotes or availability. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import PropertyCard from '@/components/PropertyCard';
import {Button,EmptyState} from '@/components/ui';
import GuestSelector,{guestSummary} from '@/components/GuestSelector';
import {formatCents,type GuestCount,type PropertySummary,type Quote} from '@/lib/types';
import {requestQuote} from '@/data/client-api';
import {createExplorerRequestGuard,fetchExplorerQuote} from '@/lib/explorer-quote';
interface Filters{checkIn:string;checkOut:string;guests:GuestCount;amenity:string}
type Result={status:'loading'|'quoted'|'error';quote?:Quote;message?:string};
export default function PropertiesExplorer({properties,publicPreview=false}:{properties:PropertySummary[];publicPreview?:boolean}){
 const search=useSearchParams();
 const [filters,setFilters]=useState<Filters>({checkIn:search.get('checkIn')??'',checkOut:search.get('checkOut')??'',guests:{adults:Number(search.get('adults')??2)||2,children:Number(search.get('children')??0)||0,infants:Number(search.get('infants')??0)||0},amenity:''});
 const [results,setResults]=useState<Record<string,Result>>({});const [offline,setOffline]=useState(false);
 const guard=useRef(createExplorerRequestGuard());
 const amenities=useMemo(()=>Array.from(new Set(properties.flatMap(p=>p.amenityTags))).sort(),[properties]);
 const validDates=!!filters.checkIn&&!!filters.checkOut&&filters.checkOut>filters.checkIn;
 const visible=properties.filter(p=>!filters.amenity||p.amenityTags.includes(filters.amenity));
 function change(patch:Partial<Filters>){guard.current.invalidate();setResults({});setFilters(current=>({...current,...patch}));}
 useEffect(()=>{const changed=()=>{guard.current.invalidate();setResults({});setOffline(!navigator.onLine);};setOffline(!navigator.onLine);window.addEventListener('offline',changed);window.addEventListener('online',changed);return()=>{guard.current.invalidate();window.removeEventListener('offline',changed);window.removeEventListener('online',changed);};},[]);
 useEffect(()=>{const expiries=Object.values(results).flatMap(result=>result.quote?[Date.parse(result.quote.expiresAt)]:[]);if(!expiries.length)return;const timer=setTimeout(()=>{guard.current.invalidate();setResults(previous=>Object.fromEntries(Object.entries(previous).map(([id,result])=>[id,result.quote&&Date.parse(result.quote.expiresAt)<=Date.now()?{status:'error',message:'This quote expired. Check the stay total again.'}:result])));},Math.max(0,Math.min(...expiries)-Date.now()));return()=>clearTimeout(timer);},[results]);
 async function checkTotals(){
  if(publicPreview||!validDates||!navigator.onLine)return;
  const generation=guard.current.begin();setResults(Object.fromEntries(visible.map(p=>[p.id,{status:'loading'}])));
  await Promise.all(visible.map(async property=>{try{
   const quote=await fetchExplorerQuote({propertyId:property.id,checkIn:filters.checkIn,checkOut:filters.checkOut,guests:filters.guests,pets:0},requestQuote);
   if(guard.current.isCurrent(generation)&&navigator.onLine)setResults(current=>({...current,[property.id]:{status:'quoted',quote}}));
  }catch{
   if(guard.current.isCurrent(generation))setResults(current=>({...current,[property.id]:{status:'error',message:'A stay quote is unavailable for these details. Review the property and choose dates there.'}}));
  }}));
 }
 const loading=Object.values(results).some(result=>result.status==='loading');
 return <div><div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-card">
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <label className="text-sm font-medium">Check-in<input aria-label="Check-in" type="date" value={filters.checkIn} onChange={event=>change({checkIn:event.target.value})} className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border px-3"/></label>
   <label className="text-sm font-medium">Checkout<input aria-label="Check-out" type="date" min={filters.checkIn} value={filters.checkOut} onChange={event=>change({checkOut:event.target.value})} className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border px-3"/></label>
   <div><p className="text-sm font-medium">Guests</p><details className="relative mt-1"><summary className="min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-sm">{guestSummary(filters.guests)}</summary><div className="absolute left-0 right-0 top-full z-30 mt-2 sm:right-auto sm:w-80"><GuestSelector value={filters.guests} onChange={guests=>change({guests})} maxGuests={8}/></div></details></div>
   <label className="text-sm font-medium">Amenities<select value={filters.amenity} onChange={event=>change({amenity:event.target.value})} className="mt-1 block min-h-11 w-full rounded-xl border px-3"><option value="">All amenities</option>{amenities.map(amenity=><option key={amenity} value={amenity}>{amenity}</option>)}</select></label>
  </div>
  {filters.checkIn&&filters.checkOut&&!validDates&&<p role="alert" className="mt-3 text-sm text-red-700">Checkout must be after check-in.</p>}
  {publicPreview?<p role="status" className="mt-4 rounded-xl bg-cream p-3 text-sm">Preview date selection only. Availability and prices are not being checked; no dates are held or reserved.</p>:<><p className="mt-4 text-sm text-stone-600">Select dates and guests to request the complete stay total, including mandatory cleaning and applicable tax. A quote does not hold dates.</p><Button className="mt-3" disabled={!validDates||offline||loading||!visible.length} onClick={checkTotals}>{offline?'Reconnect to check your stay':loading?'Requesting stay totals…':'Check stay total'}</Button></>}
 </div><div className="mt-8">{!visible.length?<EmptyState title="No stays match that amenity" body="Choose another amenity or clear the filter." action={<Button onClick={()=>change({amenity:''})}>Clear filter</Button>}/>:<div className="grid gap-6 md:grid-cols-2">{visible.map(property=>{const result=results[property.id];return <div key={property.id}><PropertyCard property={property}/><div aria-live="polite" className="mt-3 text-sm text-stone-600">{!publicPreview&&result?.status==='loading'&&<p>Requesting a stay quote…</p>}{!publicPreview&&result?.quote&&<><p className="font-semibold text-ink">{result.quote.paymentMode==='live'?'Quoted stay total':'Test quote — not a booking offer'}: {formatCents(result.quote.totalCents)} USD</p><p>Includes mandatory cleaning and applicable tax. No pets selected; review any extras on the property page.</p><p>Quote expires {new Date(result.quote.expiresAt).toLocaleString('en-US')}. Dates are not reserved; checkout rechecks the stay.</p></>}{!publicPreview&&result?.status==='error'&&<p>{result.message}</p>}{!result&&!publicPreview&&<p>Select dates, then check the complete stay total.</p>}</div></div>;})}</div>}</div></div>;
}
