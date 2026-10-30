import {canFulfillPaymentMode} from '@/lib/payment-mode';
import {isPublicPreview} from '@/lib/booking-launch';
import Stripe from 'stripe';
import {guestSafeBooking} from '@/lib/bookings';
import {getAdapter} from '@/lib/db';
import {tryProcessOutbox} from '@/lib/outbox';
import {recordVerifiedPaymentException} from '@/lib/payment-exception-service';
import {assertPaymentBinding,assertSuccessfulPayment,paymentEvidence,PaymentVerificationError,verifyStripeWebhook} from '@/lib/payment-verification';
import {json} from '../../_helpers';

/** Signed callbacks can record exceptions after a fulfillment gate closes; preview always blocks. */
export async function POST(req:Request){
 if(isPublicPreview())return json({error:'Payments are disabled in this preview.'},503);
 let event:Stripe.Event;
 try{event=verifyStripeWebhook(await req.text(),req.headers.get('stripe-signature'),process.env.STRIPE_SECRET_KEY,process.env.STRIPE_WEBHOOK_SECRET);}
 catch(error){return json({error:error instanceof Error?error.message:'Invalid webhook.'},error instanceof PaymentVerificationError?error.httpStatus:400);}
 if(event.type!=='payment_intent.succeeded'&&event.type!=='payment_intent.payment_failed')return json({received:true,ignored:event.type});
 const pi=event.data.object as Stripe.PaymentIntent;
 if(pi.livemode!==event.livemode)return json({error:'Payment object mode differs from the signed event.'},400);
 const payment=paymentEvidence(pi),successful=event.type==='payment_intent.succeeded'&&payment.status==='succeeded'&&payment.amountReceivedCents>0;
 try{
  const adapter=getAdapter(),booking=await adapter.getBookingByPaymentIntentId(pi.id);
  const review=async(reason:Parameters<typeof recordVerifiedPaymentException>[3])=>{
   await recordVerifiedPaymentException(adapter,payment,event.id,reason,booking??undefined);
   return json({received:true,reviewRequired:true}); // Durable case, not a confirmed reservation.
  };
  if(!booking){
   // Ignore unrelated account payments; orphaned Casa Pacifica intents need reconciliation.
   if(successful&&payment.metadata?.property_id==='casa-pacifica')return await review('unmatched_payment');
   return json({received:true});
  }
  try{assertPaymentBinding(booking,payment);}catch(error){if(successful)return await review('binding_mismatch');return json({error:error instanceof Error?error.message:'Invalid payment evidence.'},400);}
  if(booking.status==='confirmed'){if(canFulfillPaymentMode(booking.paymentMode))await tryProcessOutbox(adapter);return json({received:true});}
  if(booking.status==='cancelled'){if(successful)return await review('cancelled_booking');return json({received:true});}
  if(event.type==='payment_intent.payment_failed'){await adapter.failPendingBookingPayment(booking.id,pi.id);return json({received:true});}
  if(!successful)return json({error:'Successful paid evidence is incomplete.'},400);
  if(!canFulfillPaymentMode(booking.paymentMode))return await review('launch_gate_closed');
  try{assertSuccessfulPayment(booking,payment);}catch{return await review('binding_mismatch');}
  const result=await adapter.confirmBookingPayment(booking.id,pi.id,new Date().toISOString());
  if(!result)return await review('expired_or_conflicting_hold');
  await tryProcessOutbox(adapter);return json({received:true,booking:guestSafeBooking(result.booking)});
 }catch{return json({error:'Payment event could not be durably recorded; retry is required.'},503);}
}
