/** Synthetic provenance/gate checks only. No provider credentials, network or live activation. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { LIVE_APPROVAL_FLAGS, getBookingPaymentMode, canFulfillPaymentMode, storedPaymentMode } from '../src/lib/payment-mode';
import { getLaunchReadiness } from '../src/lib/launch-readiness';
import { assertPaymentBinding, assertSuccessfulPayment, verifyStripeWebhook, type PaymentEvidence } from '../src/lib/payment-verification';
import { SqliteAdapter } from '../src/lib/db/sqlite';
import { createBookingForQuote } from '../src/lib/bookings';
import { deliverOutboxMessage } from '../src/lib/outbox';
import { reviewBookingCancellation } from '../src/lib/cancellation-review';
import type { Booking, Quote } from '../src/lib/types';
import type { OutboxJob } from '../src/lib/db/workflows';
function enableSyntheticLive() {
  vi.stubEnv('BOOKING_PAYMENT_MODE','live'); for(const flag of LIVE_APPROVAL_FLAGS)vi.stubEnv(flag,'true');
  vi.stubEnv('INVENTORY_POLICY','exclusive_direct'); vi.stubEnv('STRIPE_SECRET_KEY','sk_live_synthetic_not_real');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_live_synthetic_not_real');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_synthetic');
}
beforeEach(()=>{vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('BOOKING_PAYMENT_MODE','closed');vi.stubEnv('BOOKING_TEST_MODE','false');for(const flag of LIVE_APPROVAL_FLAGS)vi.stubEnv(flag,'false');});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
const booking:Booking={id:'mode-booking',reference:'CP-MODE',propertyId:'casa-pacifica',checkIn:'2027-02-20',checkOut:'2027-02-22',nights:2,guests:{adults:2,children:0,infants:0},pets:0,guest:{name:'Synthetic',email:'synthetic@example.test'},lineItems:[],totalCents:50000,currency:'USD',status:'pending_payment',paymentStatus:'unpaid',stripePaymentIntentId:'pi_mode',idempotencyKey:'synthetic-mode',createdAt:'2026-10-30T12:00:00Z'};
function evidence(live:boolean):PaymentEvidence{return{id:'pi_mode',status:'succeeded',amountCents:50000,amountReceivedCents:50000,currency:'usd',livemode:live,metadata:{mode:live?'live':'test',booking_id:booking.id,property_id:booking.propertyId,check_in:booking.checkIn,check_out:booking.checkOut}};}
describe('default-closed payment approval contract',()=>{
 it('keys alone, unknown values and conflicting legacy flags never open live mode',()=>{vi.stubEnv('STRIPE_SECRET_KEY','sk_live_synthetic');vi.stubEnv('BOOKING_TEST_MODE','true');expect(getBookingPaymentMode()).toBeNull();vi.stubEnv('BOOKING_PAYMENT_MODE','typo');expect(getBookingPaymentMode()).toBeNull();vi.stubEnv('BOOKING_PAYMENT_MODE','live');expect(getBookingPaymentMode()).toBeNull();});
 it.each(LIVE_APPROVAL_FLAGS)('requires explicit %s even if every other prerequisite is set',flag=>{enableSyntheticLive();vi.stubEnv(flag,'false');expect(getBookingPaymentMode()).toBeNull();expect(canFulfillPaymentMode('live')).toBe(false);});
 it.each(['ical','authoritative_channel_manager','manual',''])('does not mistake %s for implemented exclusive inventory',policy=>{enableSyntheticLive();vi.stubEnv('INVENTORY_POLICY',policy);expect(getBookingPaymentMode()).toBeNull();});
 it('allows coherent synthetic live configuration only with all approvals, and preview overrides everything',()=>{enableSyntheticLive();expect(getBookingPaymentMode()).toBe('live');expect(getLaunchReadiness()).toMatchObject({configurationOnly:true,canAcceptLiveBookings:true});expect(canFulfillPaymentMode('test')).toBe(false);vi.stubEnv('SITE_PREVIEW_MODE','true');expect(getBookingPaymentMode()).toBeNull();expect(getLaunchReadiness().canAcceptLiveBookings).toBe(false);});
 it.each(['STRIPE_SECRET_KEY','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'])('requires matching live provider configuration %s',name=>{enableSyntheticLive();vi.stubEnv(name,'');expect(getBookingPaymentMode()).toBeNull();});
 it('never upgrades historical test data with current live settings',()=>{enableSyntheticLive();expect(storedPaymentMode()).toBe('test');expect(canFulfillPaymentMode()).toBe(false);expect(()=>storedPaymentMode('invalid' as 'test')).toThrow();});
});
describe('payment evidence has immutable mode provenance',()=>{
 it('accepts matching evidence and rejects either cross-mode direction',()=>{
  expect(()=>assertSuccessfulPayment({...booking,paymentMode:'live'},evidence(true))).not.toThrow();
  expect(()=>assertSuccessfulPayment({...booking,paymentMode:'test'},evidence(false))).not.toThrow();
  expect(()=>assertPaymentBinding({...booking,paymentMode:'test'},evidence(true))).toThrow('mode');
  expect(()=>assertPaymentBinding({...booking,paymentMode:'live'},evidence(false))).toThrow('mode');
  expect(()=>assertPaymentBinding(booking,evidence(true))).toThrow('mode');
  expect(()=>assertPaymentBinding({...booking,paymentMode:'live'},{...evidence(true),metadata:{...evidence(true).metadata,mode:'test'}})).toThrow('mode');
 });
 it('authenticates a genuine signed event while fulfillment is closed so a durable exception can be recorded',()=>{
  const key='sk_live_synthetic', secret='whsec_synthetic';const raw=JSON.stringify({id:'evt_synthetic',type:'payment_intent.succeeded',livemode:true,data:{object:{id:'pi_mode'}}});
  const signature=new Stripe(key).webhooks.generateTestHeaderString({payload:raw,secret});
  expect(getBookingPaymentMode()).toBeNull();expect(verifyStripeWebhook(raw,signature,key,secret).livemode).toBe(true);
  expect(()=>verifyStripeWebhook(raw,signature,'sk_test_synthetic',secret)).toThrow('mode');
  expect(()=>verifyStripeWebhook(raw,signature,key,'wrong')).toThrow('signature');
 });
 it('test receipts and recovery codes can never use external delivery after an installation switches to live',async()=>{
  enableSyntheticLive();vi.stubEnv('EMAIL_DELIVERY_MODE','live');vi.stubEnv('EMAIL_LIVE_APPROVED','true');vi.stubEnv('RESEND_API_KEY','synthetic-not-a-key');
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Network forbidden'));
  const envelope={from:'sender@example.test',to:'recipient@example.test',subject:'synthetic',html:'synthetic'};
  const job={id:'mail',bookingId:'mode-booking',kind:'guest_confirmation',dedupeKey:'synthetic',status:'processing',payload:{booking:{...booking,paymentMode:'test',paymentStatus:'paid_test'}},attempts:1,createdAt:'2026-10-30T12:00:00Z',nextAttemptAt:'2026-10-30T12:00:00Z'} as OutboxJob;
  await expect(deliverOutboxMessage(job,envelope)).rejects.toThrow('not enabled');
  await expect(deliverOutboxMessage({...job,kind:'access_recovery',payload:{recovery:{recipient:'synthetic@example.test',token:'synthetic',reference:'CP-MODE',expiresAt:'2026-10-30T12:15:00Z'}}},envelope)).rejects.toThrow('not enabled');expect(fetch).not.toHaveBeenCalled();
 });
 it('does not turn a mode-inconsistent paid record into a refund recommendation',()=>{expect(reviewBookingCancellation({...booking,status:'confirmed',paymentStatus:'paid',paymentMode:'test'}).status).toBe('manual_review');});
});
describe('durable booking provenance',()=>{
 it('persists mode, gives matching paid status, and rejects cross-mode idempotent retry',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'casa-mode-'));const file=path.join(directory,'db');let adapter=new SqliteAdapter(file);
  try{
   for(const mode of ['test','live'] as const){
    const input={...booking,paymentMode:mode,checkIn:mode==='test'?'2027-02-20':'2027-02-23',checkOut:mode==='test'?'2027-02-22':'2027-02-25',idempotencyKey:`synthetic-${mode}`};
    const b=await adapter.createBookingIfAvailable(input);expect(b.paymentMode).toBe(mode);await adapter.attachPaymentIntent(b.id,`pi_${mode}`);
    const result=await adapter.confirmBookingPayment(b.id,`pi_${mode}`,new Date().toISOString());expect(result?.booking.paymentStatus).toBe(mode==='test'?'paid_test':'paid');
    const q={...input,id:'synthetic-quote',propertySlug:'casa-pacifica',paymentMode:mode==='test'?'live':'test',expiresAt:new Date(Date.now()+60000).toISOString()} as unknown as Quote;
    await expect(createBookingForQuote(adapter,q,input.guest,input.idempotencyKey)).rejects.toThrow('different booking');
   }
   adapter.close();adapter=new SqliteAdapter(file);expect((await adapter.listBookings()).map(b=>b.paymentMode).sort()).toEqual(['live','test']);
  }finally{adapter.close();fs.rmSync(directory,{recursive:true,force:true});}
 });
});
