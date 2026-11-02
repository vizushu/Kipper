import type {GuestCount} from './types';
import {diffNights,isPastDate,isValidDateStr} from './dates';
export interface StaySelection{range:{checkIn:string;checkOut:string}|null;guests:GuestCount}
type Query=Record<string,string|string[]|undefined>;
/** Only dates/headcounts are navigation state. Never transfer prices, tokens or guest identity. */
export function parseStaySelection(query:Query,maxGuests=8,maxNights=28,now=new Date()):StaySelection{
 const integer=(value:string|string[]|undefined,fallback:number)=>value===undefined?fallback:typeof value==='string'&&/^\d{1,2}$/.test(value)?Number(value):NaN;
 const guests={adults:integer(query.adults,2),children:integer(query.children,0),infants:integer(query.infants,0)};
 const validGuests=Number.isInteger(guests.adults)&&guests.adults>=1&&Number.isInteger(guests.children)&&guests.children>=0&&Number.isInteger(guests.infants)&&guests.infants>=0&&guests.adults+guests.children+guests.infants<=maxGuests;
 const {checkIn,checkOut}=query;
 const validRange=isValidDateStr(checkIn)&&isValidDateStr(checkOut)&&!isPastDate(checkIn,now)&&diffNights(checkIn,checkOut)>0&&diffNights(checkIn,checkOut)<=maxNights;
 return {range:validRange?{checkIn:checkIn as string,checkOut:checkOut as string}:null,guests:validGuests?guests:{adults:Math.min(2,maxGuests),children:0,infants:0}};
}
export function propertySelectionHref(slug:string,selection:{checkIn:string;checkOut:string;guests:GuestCount},maxGuests=8,maxNights=28,now=new Date()):string{
 const valid=parseStaySelection({checkIn:selection.checkIn,checkOut:selection.checkOut,adults:String(selection.guests.adults),children:String(selection.guests.children),infants:String(selection.guests.infants)},maxGuests,maxNights,now);
 const params=new URLSearchParams({...(valid.range??{}),adults:String(valid.guests.adults),children:String(valid.guests.children),infants:String(valid.guests.infants)});
 return `/properties/${encodeURIComponent(slug)}?${params}`;
}
export function staySelectionKey(propertyId:string,selection:StaySelection){return `${propertyId}:${JSON.stringify(selection)}`;}
