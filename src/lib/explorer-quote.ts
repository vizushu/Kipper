import type {GuestCount,Quote} from './types';
export interface ExplorerQuoteInput {propertyId:string;checkIn:string;checkOut:string;guests:GuestCount;pets:0}
/** Use the full server quote; never reconstruct a stay total from calendar nightly rates. */
export async function fetchExplorerQuote(input:ExplorerQuoteInput,request:(input:ExplorerQuoteInput)=>Promise<Quote>,now=()=>Date.now()):Promise<Quote>{
 const quote=await request(input);
 if(quote.propertyId!==input.propertyId||quote.checkIn!==input.checkIn||quote.checkOut!==input.checkOut||quote.guests.adults!==input.guests.adults||quote.guests.children!==input.guests.children||quote.guests.infants!==input.guests.infants||quote.pets!==0||quote.currency!=='USD'||!Number.isSafeInteger(quote.totalCents)||quote.totalCents<0||!(Date.parse(quote.expiresAt)>now()))throw new Error('A fresh stay quote is required.');
 return quote;
}
export function createExplorerRequestGuard(){let generation=0;return {invalidate:()=>{generation++;},begin:()=>++generation,isCurrent:(value:number)=>value===generation};}
