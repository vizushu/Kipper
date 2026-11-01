/** Synthetic keys and SDK transport stubs only; never verify actual account/key permissions. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const sdk=vi.hoisted(()=>({constructed:vi.fn(),create:vi.fn(),retrieve:vi.fn()}));
vi.mock('stripe',async(importOriginal)=>{
 const original=await importOriginal<typeof import('stripe')>();
 return {default:class {paymentIntents={create:sdk.create,retrieve:sdk.retrieve};webhooks;constructor(key:string){sdk.constructed(key);this.webhooks=new original.default(key).webhooks;}}};
});
import Stripe from 'stripe';
import {LIVE_APPROVAL_FLAGS,getBookingPaymentMode,livePaymentBlockers,stripeKeyMode} from '../src/lib/payment-mode';
import {getLaunchReadiness} from '../src/lib/launch-readiness';
import {createPaymentIntent,isStripeConfigured,verifyPaymentIntent} from '../src/lib/stripe';
import {verifyStripeWebhook,assertPaymentBinding} from '../src/lib/payment-verification';
import type {Quote,Booking} from '../src/lib/types';
const quote={paymentMode:'live',totalCents:10000,currency:'USD',propertyId:'casa-pacifica',checkIn:'2027-01-10',checkOut:'2027-01-12'} as Quote;
function approved(key='rk_live_synthetic_not_real'){
 vi.stubEnv('SITE_PREVIEW_MODE','false');vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('BOOKING_PAYMENT_MODE','live');for(const flag of LIVE_APPROVAL_FLAGS)vi.stubEnv(flag,'true');
 vi.stubEnv('INVENTORY_POLICY','exclusive_direct');for(const flag of ['CALENDAR_SYNC_ENABLED','CALENDAR_SYNC_REQUIRED','CALENDAR_EXPORT_ENABLED'])vi.stubEnv(flag,'false');
 vi.stubEnv('STRIPE_SECRET_KEY',key);vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_live_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_synthetic');
}
beforeEach(()=>{approved();vi.clearAllMocks();sdk.create.mockResolvedValue({id:'pi_synthetic',client_secret:'synthetic_client',amount:10000,status:'requires_payment_method'});sdk.retrieve.mockResolvedValue({id:'pi_synthetic',status:'succeeded',amount:10000,amount_received:10000,currency:'usd',livemode:true,metadata:{mode:'live',booking_id:'booking',property_id:'casa-pacifica',check_in:quote.checkIn,check_out:quote.checkOut}});});
afterEach(()=>vi.unstubAllEnvs());
it.each(['sk_live_synthetic_not_real','rk_live_synthetic_not_real'])('recognizes %s with identical existing approval/configuration semantics',async(key)=>{
 approved(key);expect(stripeKeyMode(key)).toBe('live');expect(livePaymentBlockers()).toEqual([]);expect(getBookingPaymentMode()).toBe('live');expect(isStripeConfigured('live')).toBe(true);
 expect(getLaunchReadiness()).toMatchObject({configurationPermitsLiveBookings:true,canAcceptLiveBookings:false,configurationOnly:true});
 await createPaymentIntent(quote,'stable','booking');expect(sdk.constructed).toHaveBeenCalledWith(key);expect(sdk.create).toHaveBeenCalledWith(expect.objectContaining({metadata:expect.objectContaining({mode:'live',booking_id:'booking'})}),{idempotencyKey:'pi_stable'});
});
it.each([...LIVE_APPROVAL_FLAGS])('restricted key cannot bypass missing %s',async(flag)=>{
 vi.stubEnv(flag,'false');expect(getBookingPaymentMode()).toBeNull();expect(getLaunchReadiness().configurationPermitsLiveBookings).toBe(false);await expect(createPaymentIntent(quote,'stable','booking')).rejects.toThrow();expect(sdk.constructed).not.toHaveBeenCalled();
});
it.each(['STRIPE_WEBHOOK_SECRET','NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'])('still requires %s',async(name)=>{vi.stubEnv(name,'');expect(getBookingPaymentMode()).toBeNull();await expect(createPaymentIntent(quote,'stable','booking')).rejects.toThrow();expect(sdk.constructed).not.toHaveBeenCalled();});
it.each(['SITE_PREVIEW_MODE','STAGING_TEST_MODE'])('%s blocks live creation AND read-only retrieval',async(flag)=>{vi.stubEnv(flag,'true');expect(getBookingPaymentMode()).toBeNull();expect(isStripeConfigured('live')).toBe(false);await expect(createPaymentIntent(quote,'stable','booking')).rejects.toThrow();await expect(verifyPaymentIntent('pi_synthetic','live')).rejects.toThrow();expect(sdk.constructed).not.toHaveBeenCalled();});
it('closing new intake blocks creation but preserves existing read-only evidence semantics',async()=>{vi.stubEnv('BOOKING_PAYMENT_MODE','closed');await expect(createPaymentIntent(quote,'stable','booking')).rejects.toThrow();expect(sdk.constructed).not.toHaveBeenCalled();expect(await verifyPaymentIntent('pi_synthetic','live')).toMatchObject({livemode:true});expect(sdk.retrieve).toHaveBeenCalledOnce();});
it('never uses a live restricted key for a stored test payment',async()=>{await expect(verifyPaymentIntent('pi_synthetic','test')).rejects.toThrow('mode');expect(sdk.constructed).not.toHaveBeenCalled();});
it('requires actual local webhook signature and matching live evidence; staging rejects before SDK',()=>{
 const key='rk_live_synthetic',secret='whsec_synthetic',raw=JSON.stringify({id:'evt_synthetic',type:'payment_intent.succeeded',livemode:true,data:{object:{}}});const signature=new Stripe(key).webhooks.generateTestHeaderString({payload:raw,secret});
 expect(verifyStripeWebhook(raw,signature,key,secret).livemode).toBe(true);expect(()=>verifyStripeWebhook(raw,signature,key,'wrong')).toThrow('signature');
 const testRaw=JSON.stringify({livemode:false}),testSignature=new Stripe(key).webhooks.generateTestHeaderString({payload:testRaw,secret});expect(()=>verifyStripeWebhook(testRaw,testSignature,key,secret)).toThrow('mode');
 vi.stubEnv('STAGING_TEST_MODE','true');sdk.constructed.mockClear();expect(()=>verifyStripeWebhook(raw,signature,key,secret)).toThrow('staging');expect(sdk.constructed).not.toHaveBeenCalled();
});
it('restricted-key evidence still requires exact booking binding',async()=>{
 const payment=await verifyPaymentIntent('pi_synthetic','live');const booking={id:'booking',paymentMode:'live',stripePaymentIntentId:'pi_synthetic',totalCents:10000,currency:'USD',propertyId:'casa-pacifica',checkIn:quote.checkIn,checkOut:quote.checkOut} as Booking;
 expect(()=>assertPaymentBinding(booking,payment)).not.toThrow();expect(()=>assertPaymentBinding({...booking,id:'other'},payment)).toThrow('reservation');expect(()=>assertPaymentBinding({...booking,paymentMode:'test'},payment)).toThrow('mode');
});
