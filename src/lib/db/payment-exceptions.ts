/** Private operational review cases. No guest PII, raw provider payloads or automatic refunds. */
export type PaymentExceptionReason='cancelled_booking'|'expired_or_conflicting_hold'|'unmatched_payment'|'binding_mismatch'|'launch_gate_closed';
export interface PaymentExceptionInput {
 paymentIntentId:string; providerEventId:string; bookingId?:string; paymentMode:'test'|'live';
 amountCents:number; amountReceivedCents:number; currency:string; reason:PaymentExceptionReason;
}
export interface PaymentException extends Omit<PaymentExceptionInput,'providerEventId'> {
 id:string; status:'open'|'reviewed'; firstSeenAt:string; lastSeenAt:string; eventCount:number;
 attentionRequired:boolean; reviewedAt?:string; reviewNote?:string;
}
export interface PaymentExceptionStore {
 recordPaymentException(input:PaymentExceptionInput):Promise<{exception:PaymentException;created:boolean}>;
 listPaymentExceptions():Promise<PaymentException[]>;
 reviewPaymentException(id:string,note:string,idempotencyKey:string):Promise<PaymentException|null>;
}
export function validatePaymentException(input:PaymentExceptionInput):void {
 if(!/^pi_[A-Za-z0-9_]{1,180}$/.test(input.paymentIntentId)||!input.providerEventId||input.providerEventId.length>250||!['test','live'].includes(input.paymentMode)||![input.amountCents,input.amountReceivedCents].every(n=>Number.isSafeInteger(n)&&n>=0)||input.amountReceivedCents<=0||!/^[a-z]{3}$/i.test(input.currency)||!['cancelled_booking','expired_or_conflicting_hold','unmatched_payment','binding_mismatch','launch_gate_closed'].includes(input.reason))throw new Error('Invalid verified payment exception evidence.');
}
