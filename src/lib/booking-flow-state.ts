import type {Booking,Quote} from './types';
/** Presentation derives from accepted server state; a quote/payment request is never confirmation. */
export function quoteIsCurrent(quote:Pick<Quote,'expiresAt'>,now=Date.now()):boolean {const expiry=Date.parse(quote.expiresAt);return Number.isFinite(expiry)&&expiry>now;}
export function bookingFlowNotice(quote?:Pick<Quote,'paymentMode'>|null):string {
 return !quote?'Choose dates to request availability and price. A quote does not reserve dates.':quote.paymentMode==='live'?'A temporary hold is not a confirmed reservation. Confirmation follows verified payment and a final inventory check.':'Test booking flow only — no real reservation or charge. Sample totals are not a booking offer.';
}
export function bookingStatusHeading(booking:Pick<Booking,'status'|'paymentStatus'|'paymentMode'>):string {
 if(booking.status==='cancelled')return 'This booking is cancelled';
 if(booking.status!=='confirmed')return 'Payment pending — booking not confirmed';
 if(booking.paymentStatus==='paid_test'||booking.paymentMode!=='live')return 'Test booking confirmed — no real reservation';
 return booking.paymentStatus==='paid'?'Your booking is confirmed':'Your booking details — payment review needed';
}
export const PAYMENT_UNCERTAIN_NOTICE='Payment may have completed, but its result could not be verified. Do not pay again. Use booking access recovery or contact the booking support contact with your receipt.';
