import {createHmac} from 'node:crypto';
import type {DataAdapter} from './db/adapter';
import {isPublicPreview} from './booking-launch';
/** Single-property request budgets, not bot identity proof or an OTA inventory lock. */
export const BOOKING_REQUEST_LIMITS={windowSeconds:900,global:60,guest:5} as const;
export async function consumeBookingRequest(adapter:DataAdapter,email?:string){
 if(isPublicPreview())throw new Error('Preview cannot consume booking request budgets.');
 const secret=process.env.BOOKING_ACCESS_SECRET;
 if(!secret||Buffer.byteLength(secret)<32)throw new Error('Booking access unavailable.');
 // Never trust forwarded IP headers, and never persist raw guest identity.
 const identity=email===undefined?'global':`guest:${email.trim().toLowerCase()}`;
 const key=createHmac('sha256',secret).update(`booking-request:v1:${identity}`).digest('hex');
 return adapter.consumeRateLimit(key,email===undefined?BOOKING_REQUEST_LIMITS.global:BOOKING_REQUEST_LIMITS.guest,BOOKING_REQUEST_LIMITS.windowSeconds);
}
