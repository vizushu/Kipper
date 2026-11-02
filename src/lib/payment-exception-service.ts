import type {DataAdapter} from './db/adapter';
import type {Booking} from './types';
import type {PaymentEvidence} from './payment-verification';
import type {PaymentExceptionReason} from './db/payment-exceptions';
/** Only call after provider signature or authenticated read verification. No payment/refund action. */
export async function recordVerifiedPaymentException(adapter:DataAdapter,payment:PaymentEvidence,eventId:string,reason:PaymentExceptionReason,booking?:Booking){
 if(payment.status!=='succeeded'||payment.amountReceivedCents<=0)throw new Error('Successful payment evidence required for review.');
 return adapter.recordPaymentException({paymentIntentId:payment.id,providerEventId:eventId,bookingId:booking?.id,paymentMode:payment.livemode?'live':'test',amountCents:payment.amountCents,amountReceivedCents:payment.amountReceivedCents,currency:payment.currency,reason});
}
