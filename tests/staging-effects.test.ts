import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import Stripe from 'stripe';
import {getBookingPaymentMode,stripeKeyMode} from '../src/lib/payment-mode';
import {verifyPaymentIntent} from '../src/lib/stripe';
import {verifyStripeWebhook} from '../src/lib/payment-verification';
import {liveEmailDeliveryConfigured} from '../src/lib/email-delivery';
import {emailWebhookEnabled} from '../src/lib/email-webhook';
import {calendarOperationsApproved,calendarSyncEnabled} from '../src/lib/calendar-access';
import {calendarExportAuthorized} from '../src/lib/calendar-export';
import {fetchAirbnbCalendar} from '../src/lib/calendar-feed';
import {syncAirbnbCalendar} from '../src/lib/calendar-sync';
import {processOutbox,deliverOutboxMessage} from '../src/lib/outbox';
import {dispatchOperatorAlerts,operatorAlertsConfigured} from '../src/lib/operator-alerts';
import type {DataAdapter} from '../src/lib/db/adapter';
import type {OutboxJob,OutboxEnvelope} from '../src/lib/db/workflows';
import {POST as contact} from '../src/app/api/contact/route';
import {NextRequest} from 'next/server';

beforeEach(()=>{vi.stubEnv('STAGING_TEST_MODE','true');vi.stubEnv('SITE_PREVIEW_MODE','false');});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('staging external effect boundary',()=>{
 it('accepts restricted test keys but never opens live mode',()=>{
  vi.stubEnv('BOOKING_PAYMENT_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','rk_test_synthetic');vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_test_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_synthetic');
  expect(stripeKeyMode('rk_test_synthetic')).toBe('test');expect(getBookingPaymentMode()).toBe('test');
  vi.stubEnv('BOOKING_PAYMENT_MODE','live');expect(getBookingPaymentMode()).toBeNull();
  vi.stubEnv('BOOKING_PAYMENT_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','sk_live_synthetic');expect(getBookingPaymentMode()).toBeNull();
 });
 it('requires test publishable configuration and preview wins',()=>{
  vi.stubEnv('BOOKING_PAYMENT_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_synthetic');vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_live_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_synthetic');expect(getBookingPaymentMode()).toBeNull();
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_test_synthetic');vi.stubEnv('SITE_PREVIEW_MODE','true');expect(getBookingPaymentMode()).toBeNull();
 });
 it('blocks live read-only payment verification before transport',async()=>{await expect(verifyPaymentIntent('pi_synthetic','live')).rejects.toThrow('blocked in staging');});
 it('verifies signed test events using restricted test key and rejects live signed events',()=>{
  const stripe=new Stripe('sk_test_synthetic'),secret='whsec_synthetic';
  const raw=JSON.stringify({id:'evt_synthetic',type:'payment_intent.succeeded',livemode:false,data:{object:{}}});
  const signature=stripe.webhooks.generateTestHeaderString({payload:raw,secret});
  expect(verifyStripeWebhook(raw,signature,'rk_test_synthetic',secret).livemode).toBe(false);
  expect(()=>verifyStripeWebhook(raw,signature,'sk_live_synthetic',secret)).toThrow('blocked in staging');
  const live=JSON.stringify({livemode:true});const liveSig=stripe.webhooks.generateTestHeaderString({payload:live,secret});
  expect(()=>verifyStripeWebhook(live,liveSig,'rk_test_synthetic',secret)).toThrow('mode');
  expect(()=>verifyStripeWebhook(raw,null,'rk_test_synthetic',secret)).toThrow('signature');
 });
 it('blocks email, webhook, contact and workers despite contradictory live approvals',async()=>{
  for(const flag of ['EMAIL_LIVE_APPROVED','EMAIL_WEBHOOK_APPROVED','OPERATOR_ALERTS_APPROVED','OPERATOR_ALERT_DELIVERY_QA_APPROVED'])vi.stubEnv(flag,'true');
  vi.stubEnv('EMAIL_DELIVERY_MODE','live');vi.stubEnv('RESEND_API_KEY','synthetic');vi.stubEnv('BOOKING_FROM_EMAIL','booking@example.com');vi.stubEnv('HOST_NOTIFY_EMAIL','owner@example.com');
  expect(liveEmailDeliveryConfigured()).toBe(false);expect(emailWebhookEnabled()).toBe(false);expect(operatorAlertsConfigured()).toBe(false);
  const adapter=new Proxy({},{get(){throw Error('Database must not be touched');}}) as DataAdapter;
  const deliver=vi.fn();expect(await processOutbox(adapter,{deliver})).toMatchObject({disabled:true});expect(await dispatchOperatorAlerts(adapter,{deliver})).toMatchObject({disabled:true});expect(deliver).not.toHaveBeenCalled();
  await expect(deliverOutboxMessage({} as OutboxJob,{} as OutboxEnvelope)).rejects.toThrow('Staging');
  const req=new NextRequest('https://staging.example/api/contact',{method:'POST',body:'not-json'});expect((await contact(req)).status).toBe(503);
 });
 it('blocks calendars before database or transport',async()=>{
  for(const flag of ['CALENDAR_OPERATIONS_APPROVED','CALENDAR_SYNC_ENABLED','CALENDAR_EXPORT_ENABLED'])vi.stubEnv(flag,'true');vi.stubEnv('CALENDAR_EXPORT_TOKEN','a'.repeat(43));
  expect(calendarOperationsApproved()).toBe(false);expect(calendarSyncEnabled()).toBe(false);expect(calendarExportAuthorized('a'.repeat(43))).toBe(false);
  const fetcher=vi.fn();expect(await syncAirbnbCalendar({} as DataAdapter,{fetcher})).toEqual({status:'disabled'});expect(fetcher).not.toHaveBeenCalled();
  await expect(fetchAirbnbCalendar('https://www.airbnb.com/calendar/ical/synthetic.ics')).rejects.toThrow('blocked in staging');
 });
 it('preserves nonstaging mode behavior',()=>{vi.stubEnv('STAGING_TEST_MODE','false');vi.stubEnv('BOOKING_PAYMENT_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','');expect(getBookingPaymentMode()).toBe('test');vi.stubEnv('CALENDAR_OPERATIONS_APPROVED','true');expect(calendarOperationsApproved()).toBe(true);});
});

it.each([[false,false,'test'],[false,true,null],[true,false,'test'],[true,true,null]] as const)('preview/staging precedence staging=%s preview=%s', (staging,preview,expected)=>{
 vi.stubEnv('STAGING_TEST_MODE',String(staging));vi.stubEnv('SITE_PREVIEW_MODE',String(preview));vi.stubEnv('BOOKING_PAYMENT_MODE','test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_synthetic');vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY','pk_test_synthetic');vi.stubEnv('STRIPE_WEBHOOK_SECRET','whsec_synthetic');expect(getBookingPaymentMode()).toBe(expected);
});
